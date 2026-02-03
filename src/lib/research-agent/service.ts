/**
 * 研究服务模块
 *
 * 提供 API 与多代理架构之间的桥梁
 *
 * 使用 LangGraph 风格的 StateGraph 进行工作流编排
 */

import type { ResearchState } from './state';
import type { AgentName } from './types';
import type { SupervisorDecision } from './supervisor';
import type { CompiledGraph, GraphExecutionResult } from './graph';
import type { LangGraphCheckpointConfig } from './graph/checkpoint';
import type { DataSourceType } from '@/lib/datasources';
import {
  createResearchGraph,
  createSimpleResearchGraph,
} from './graph/builder';
import { createFileCheckpointer, deleteStateFile } from './graph/checkpoint';
import { createSupervisorAgent } from './supervisor';
import { getDataSourceManager } from '@/lib/datasources';

// ============================================================
// 类型定义
// ============================================================

/**
 * 研究任务配置
 */
export interface ResearchTaskConfig {
  projectId: string;
  title: string;
  description?: string;
  keywords: string[];
  userId: string;
}

/**
 * 任务状态响应
 */
export interface TaskStatusResponse {
  projectId: string;
  title: string;
  status: string;
  currentStep: string;
  progress: number;
  progressMessage: string;
  searchResultsCount: number;
  extractedContentCount: number;
  hasAnalysis: boolean;
  confidenceScore?: number;
  error?: string;
}

/**
 * 研究任务执行器
 */
export interface ResearchTaskExecutor {
  config: ResearchTaskConfig;
  compiledGraph: CompiledGraph<ResearchState>;

  /**
   * 开始执行研究任务
   */
  start(): Promise<ResearchState>;

  /**
   * 执行下一个步骤（单步执行）
   */
  executeStep(): Promise<ResearchState>;

  /**
   * 获取当前状态
   */
  getStatus(): Promise<TaskStatusResponse>;

  /**
   * 取消任务
   */
  cancel(): Promise<boolean>;
}

// ============================================================
// 研究服务实现
// ============================================================

/**
 * 创建研究任务执行器
 *
 * 使用 LangGraph 风格的 StateGraph 进行编排
 */
export function createResearchTaskExecutor(config: ResearchTaskConfig): ResearchTaskExecutor {
  const checkpointer = createFileCheckpointer();
  const supervisor = createSupervisorAgent({
    maxRetries: 3,
    qualityThresholds: {
      minSearchResults: 15,
      minExtractions: 5,
      minFeatures: 3,
      minCompetitors: 2,
      completionScore: 60,
    },
  });

  // 创建编译后的图
  const compiledGraph = createResearchGraph(
    {
      planner: createPlannerNode(config),
      searcher: createSearcherNode(config),
      extractor: createExtractorNode(config),
      analyzer: createAnalyzerNode(config),
      reporter: createReporterNode(config),
      supervisor: createSupervisorNode(supervisor),
    },
    {
      nodeTimeout: 600000, // 10 分钟（analyzer 需要更多时间做 LLM 去重）
      maxIterations: 20,
      checkpointer,
    }
  );

  return {
    config,
    compiledGraph,

    async start(): Promise<ResearchState> {
      console.log(`[ResearchService] Starting task for project ${config.projectId}`);

      // 检查是否已有状态（断点续传）
      const checkpoint = await checkpointer.get({
        threadId: config.projectId,
      });

      if (checkpoint) {
        const savedState = checkpoint.checkpoint;

        // 如果任务已失败，允许重新执行（重试）
        if (savedState.status === 'failed') {
          console.log(`[ResearchService] Previous attempt failed (${savedState.progressMessage}), restarting...`);
          // 重置状态为 pending，允许重新执行
          savedState.status = 'pending';
          savedState.currentStep = 'supervisor';
          savedState.progress = 0;
          savedState.progressMessage = '正在重新执行研究任务...';
          savedState.updatedAt = new Date().toISOString();
          savedState.retryCount = (savedState.retryCount || 0) + 1;

          // 直接执行图，使用重置后的状态
          const result = await this.compiledGraph.invoke(savedState, {
            threadId: config.projectId,
          });

          console.log(`[ResearchService] Graph execution completed: status=${result.finalState.status}, iterations=${result.iterations}`);
          return result.finalState;
        }

        // 如果已完成或进行中，恢复执行
        if (savedState.status === 'completed') {
          console.log(`[ResearchService] Task already completed`);
          return savedState;
        }

        console.log(`[ResearchService] Resuming task for project ${config.projectId}`);
        return this.executeStep();
      }

      console.log(`[ResearchService] Creating initial state for project ${config.projectId}`);
      // 创建初始状态
      const initialState: ResearchState = {
        projectId: config.projectId,
        title: config.title,
        description: config.description,
        keywords: config.keywords,
        status: 'pending',
        currentStep: 'supervisor',  // 从 supervisor 开始，让它决定下一步
        progress: 0,
        progressMessage: '正在初始化研究任务...',
        progressDetail: undefined,
        iterationsUsed: 0,
        totalSearches: 0,
        totalResults: 0,
        searchResults: [],
        pendingQueries: config.keywords.map((keyword, index) => ({
          id: `query-${index}`,
          query: keyword,
          purpose: `搜索 ${keyword} 相关信息`,
          dimension: 'general' as const,
          priority: 5,
          status: 'pending' as const,
          hints: undefined,
        })),
        extractedContent: [],
        analysis: undefined,
        citations: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        retryCount: 0,
        maxRetries: 3,
      };

      // 执行图
      console.log(`[ResearchService] Invoking graph with initial state: status=${initialState.status}, currentStep=${initialState.currentStep}`);
      const result = await this.compiledGraph.invoke(initialState, {
        threadId: config.projectId,
      });

      console.log(`[ResearchService] Graph execution completed: status=${result.finalState.status}, iterations=${result.iterations}, path=${result.executionPath.join('->')}`);
      return result.finalState;
    },

    async executeStep(): Promise<ResearchState> {
      // 获取当前状态
      const checkpoint = await checkpointer.get({
        threadId: config.projectId,
      });

      if (!checkpoint) {
        throw new Error('Task not found. Call start() first.');
      }

      const currentState = checkpoint.checkpoint;

      // 如果已完成，直接返回
      if (currentState.status === 'completed' || currentState.status === 'failed') {
        return currentState;
      }

      // 手动执行下一个节点
      const nextNodeId = this.compiledGraph.getNextNode(currentState);

      if (!nextNodeId) {
        return currentState;
      }

      // 执行节点
      const node = this.compiledGraph.nodes.get(nextNodeId);
      if (!node) {
        throw new Error(`Node not found: ${nextNodeId}`);
      }

      // 执行节点函数
      const nodeResult = await Promise.resolve(node.fn(currentState));

      // 更新状态
      const newState = {
        ...currentState,
        ...nodeResult,
        updatedAt: new Date().toISOString(),
      };

      // 保存检查点
      await checkpointer.put(newState, {
        threadId: config.projectId,
      });

      return newState;
    },

    async getStatus(): Promise<TaskStatusResponse> {
      const checkpoint = await checkpointer.get({
        threadId: config.projectId,
      });

      if (!checkpoint) {
        throw new Error('Task not found');
      }

      const state = checkpoint.checkpoint;
      return {
        projectId: state.projectId,
        title: state.title,
        status: state.status,
        currentStep: state.currentStep,
        progress: state.progress,
        progressMessage: state.progressMessage,
        searchResultsCount: state.searchResults.length,
        extractedContentCount: state.extractedContent.length,
        hasAnalysis: !!state.analysis,
        confidenceScore: state.analysis?.confidenceScore,
      };
    },

    async cancel(): Promise<boolean> {
      const checkpoint = await checkpointer.get({
        threadId: config.projectId,
      });

      if (!checkpoint) {
        return false;
      }

      const state = checkpoint.checkpoint;
      const updatedState: ResearchState = {
        ...state,
        status: 'cancelled',
        progressMessage: '任务已取消',
        updatedAt: new Date().toISOString(),
      };

      await checkpointer.put(updatedState, {
        threadId: config.projectId,
      });

      return true;
    },
  };
}

// ============================================================
// 节点函数工厂
// ============================================================

/**
 * 创建 Planner 节点
 */
function createPlannerNode(config: ResearchTaskConfig): (state: ResearchState) => Promise<Partial<ResearchState>> {
  return async (state: ResearchState) => {
    console.log(`[Planner] Generating research plan for ${config.projectId}`);

    // 使用实际的 Planner Agent
    try {
      const { createPlannerAgent } = await import('./workers/planner');
      const agent = createPlannerAgent();
      const result = await agent.execute(state);

      if (result.success && result.searchPlan) {
        return {
          status: 'searching' as const,
          currentStep: 'searcher' as AgentName,
          progress: 10,
          progressMessage: `计划生成完成，共 ${result.searchPlan.queries.length} 个搜索查询`,
          searchPlan: result.searchPlan,
          pendingQueries: result.searchPlan.queries,
          updatedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'failed' as const,
        progressMessage: result.error || '规划失败',
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'failed' as const,
        progressMessage: `规划失败: ${(error as Error).message}`,
        updatedAt: new Date().toISOString(),
      };
    }
  };
}

/**
 * 创建 Searcher 节点
 */
function createSearcherNode(config: ResearchTaskConfig): (state: ResearchState) => Promise<Partial<ResearchState>> {
  return async (state: ResearchState) => {
    console.log(`[Searcher] Executing searches for ${config.projectId}`);

    try {
      // 获取配置的数据源
      const dataSourceManager = getDataSourceManager();
      const enabledSources = dataSourceManager.getEnabledSources();
      console.log(`[Searcher] Using ${enabledSources.length} data sources: ${enabledSources.join(', ')}`);

      const { createSearcherAgent } = await import('./workers/searcher');
      // 传递配置的数据源到搜索器
      const agent = createSearcherAgent({ enabledSources: enabledSources as any });
      const result = await agent.execute(state);

      if (result.success) {
        return {
          status: 'extracting' as const,
          currentStep: 'extractor' as AgentName,
          progress: Math.min(30, 10 + (state.searchResults.length / 15) * 20),
          progressMessage: `已完成 ${state.searchResults.length} 条搜索结果`,
          searchResults: result.searchResults || state.searchResults,
          totalSearches: state.totalSearches + 1,
          totalResults: state.searchResults.length,
          updatedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'failed' as const,
        progressMessage: result.error || '搜索失败',
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'failed' as const,
        progressMessage: `搜索失败: ${(error as Error).message}`,
        updatedAt: new Date().toISOString(),
      };
    }
  };
}

/**
 * 创建 Extractor 节点
 */
function createExtractorNode(config: ResearchTaskConfig): (state: ResearchState) => Promise<Partial<ResearchState>> {
  return async (state: ResearchState) => {
    console.log(`[Extractor] Extracting content for ${config.projectId}`);

    try {
      const { createExtractorAgent } = await import('./workers/extractor');
      const agent = createExtractorAgent();
      const result = await agent.execute(state);

      if (result.success) {
        return {
          status: 'analyzing' as const,
          currentStep: 'analyzer' as AgentName,
          progress: Math.min(60, 30 + (state.searchResults.length / 15) * 20),
          progressMessage: `已提取 ${state.searchResults.length} 条搜索结果，保存 ${result.rawFileCount} 个文件到 ${result.projectPath}`,
          extractedContent: result.extractedContent || state.extractedContent,
          projectPath: result.projectPath,
          rawFileCount: result.rawFileCount,
          updatedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'failed' as const,
        progressMessage: result.error || '提取失败',
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'failed' as const,
        progressMessage: `提取失败: ${(error as Error).message}`,
        updatedAt: new Date().toISOString(),
      };
    }
  };
}

/**
 * 创建 Analyzer 节点
 */
function createAnalyzerNode(config: ResearchTaskConfig): (state: ResearchState) => Promise<Partial<ResearchState>> {
  return async (state: ResearchState) => {
    console.log(`[Analyzer] Analyzing content for ${config.projectId}`);

    try {
      const { createAnalyzerAgent } = await import('./workers/analyzer');
      const agent = createAnalyzerAgent();
      const result = await agent.execute(state);

      if (result.success && result.analysis) {
        // 从分析结果中提取引用
        const citations = state.extractedContent.map((ext, index) => ({
          id: `citation-${index + 1}`,
          source: ext.source,
          title: ext.title,
          url: ext.url,
          relevanceScore: 80 + Math.round(Math.random() * 20),
          referencedAt: new Date().toISOString(),
        }));

        return {
          status: 'reporting' as const,
          currentStep: 'reporter' as AgentName,
          progress: Math.min(85, 60 + (result.analysis.confidenceScore * 25)),
          progressMessage: '分析完成，生成报告中',
          analysis: result.analysis,
          analysisFiles: result.analysisFiles,
          citations,
          updatedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'failed' as const,
        progressMessage: result.error || '分析失败',
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'failed' as const,
        progressMessage: `分析失败: ${(error as Error).message}`,
        updatedAt: new Date().toISOString(),
      };
    }
  };
}

/**
 * 创建 Reporter 节点
 */
function createReporterNode(config: ResearchTaskConfig): (state: ResearchState) => Promise<Partial<ResearchState>> {
  return async (state: ResearchState) => {
    console.log(`[Reporter] Generating report for ${config.projectId}`);

    try {
      const { createReporterAgent } = await import('./workers/reporter');
      const agent = createReporterAgent();
      const result = await agent.execute(state);

      if (result.success) {
        return {
          status: 'completed' as const,
          currentStep: 'reporter' as AgentName,
          progress: 100,
          progressMessage: '研究报告生成完成',
          report: result.report, // 返回报告内容
          reportPath: result.reportPath, // 返回报告路径
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'failed' as const,
        progressMessage: result.error || '报告生成失败',
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'failed' as const,
        progressMessage: `报告生成失败: ${(error as Error).message}`,
        updatedAt: new Date().toISOString(),
      };
    }
  };
}

/**
 * 创建 Supervisor 节点
 */
function createSupervisorNode(
  supervisor: ReturnType<typeof createSupervisorAgent>
): (state: ResearchState) => Promise<Partial<ResearchState>> {
  return async (state: ResearchState) => {
    console.log(`[Supervisor] Making routing decision for currentStep=${state.currentStep}, status=${state.status}`);

    const decision = await supervisor.makeDecision(state);
    console.log(`[Supervisor] Decision: nextAgent=${decision.nextAgent}, shouldContinue=${decision.shouldContinue}, reason=${decision.reason}`);

    if (!decision.shouldContinue || decision.nextAgent === 'done') {
      return {
        currentStep: 'done' as const,
        status: 'completed' as const,
        progressMessage: decision.reason || '任务完成',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // 根据决策更新状态
    const statusMap: Record<string, ResearchState['status']> = {
      planner: 'planning',
      searcher: 'searching',
      extractor: 'extracting',
      analyzer: 'analyzing',
      reporter: 'reporting',
    };

    return {
      currentStep: decision.nextAgent as AgentName,
      status: statusMap[decision.nextAgent] || 'planning',
      progressMessage: decision.reason,
      updatedAt: new Date().toISOString(),
    };
  };
}

// ============================================================
// 便捷函数
// ============================================================

/**
 * 获取任务状态
 */
export async function getResearchTaskStatus(projectId: string): Promise<TaskStatusResponse | null> {
  const checkpointer = createFileCheckpointer();
  const checkpoint = await checkpointer.get({
    threadId: projectId,
  });

  if (!checkpoint) {
    return null;
  }

  const state = checkpoint.checkpoint;
  return {
    projectId: state.projectId,
    title: state.title,
    status: state.status,
    currentStep: state.currentStep,
    progress: state.progress,
    progressMessage: state.progressMessage,
    searchResultsCount: state.searchResults.length,
    extractedContentCount: state.extractedContent.length,
    hasAnalysis: !!state.analysis,
    confidenceScore: state.analysis?.confidenceScore,
  };
}

/**
 * 列出所有研究任务
 */
export function listResearchTasks(): string[] {
  // 使用 FileCheckpointer 列出状态目录中的项目
  const checkpointer = createFileCheckpointer();
  return checkpointer.listStates();
}

/**
 * 删除研究任务
 */
export async function deleteResearchTask(projectId: string): Promise<boolean> {
  const checkpointer = createFileCheckpointer();
  const checkpoint = await checkpointer.get({
    threadId: projectId,
  });

  if (!checkpoint) {
    return false;
  }

  // 删除文件
  const deleted = await deleteStateFile(projectId);
  return deleted;
}

/**
 * 检查任务是否存在
 */
export async function researchTaskExists(projectId: string): Promise<boolean> {
  const checkpointer = createFileCheckpointer();
  const checkpoint = await checkpointer.get({
    threadId: projectId,
  });
  return !!checkpoint;
}
