/**
 * 研究服务模块
 *
 * 提供 API 与多代理架构之间的桥梁
 */

import type { ResearchState } from './state';
import type { AgentName } from './types';
import { createSupervisorAgent, SupervisorDecision } from './supervisor';
import { createCheckpointManager } from './graph/checkpoint';
import { MarkdownStateManager } from './graph/markdown-state';
import { createDefaultResearchGraph } from './graph/builder';

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
  stateManager: MarkdownStateManager;
  checkpointManager: ReturnType<typeof createCheckpointManager>;
  supervisor: ReturnType<typeof createSupervisorAgent>;

  /**
   * 开始执行研究任务
   */
  start(): Promise<ResearchState>;

  /**
   * 执行下一个步骤
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
 */
export function createResearchTaskExecutor(config: ResearchTaskConfig): ResearchTaskExecutor {
  const stateManager = new MarkdownStateManager({
    stateDir: 'task-data',
    enableCompression: true,
    maxFileSize: 10 * 1024 * 1024,
  });

  const checkpointManager = createCheckpointManager({
    storage: 'memory',
    maxCheckpoints: 10,
    maxAge: 24 * 60 * 60 * 1000,
  });

  const supervisor = createSupervisorAgent({
    useLLMRouting: true,
    maxRetries: 3,
    qualityThresholds: {
      minSearchResults: 15,
      minExtractions: 5,
      minFeatures: 3,
      minCompetitors: 2,
      completionScore: 60,
    },
  });

  return {
    config,
    stateManager,
    checkpointManager,
    supervisor,

    async start(): Promise<ResearchState> {
      // 检查是否已有状态（断点续传）
      const existingState = await stateManager.readState(config.projectId);
      if (existingState) {
        console.log(`[ResearchService] Resuming task for project ${config.projectId}`);
        return this.executeStep();
      }

      // 创建初始状态
      const initialState: ResearchState = {
        projectId: config.projectId,
        title: config.title,
        status: 'pending',
        currentStep: 'planner',
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
        keywords: config.keywords,
      };

      // 保存初始状态
      await stateManager.writeState(initialState);

      return this.executeStep();
    },

    async executeStep(): Promise<ResearchState> {
      // 读取当前状态
      let state = await stateManager.readState(config.projectId);
      if (!state) {
        throw new Error('Task not found');
      }

      // 如果已完成，直接返回
      if (state.status === 'completed' || state.status === 'failed') {
        return state;
      }

      // 获取 Supervisor 决策
      const decision = await supervisor.makeDecision(state);

      if (!decision.shouldContinue) {
        // 任务完成
        state = {
          ...state,
          status: 'completed',
          progress: 100,
          progressMessage: '研究任务已完成',
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await stateManager.writeState(state);
        return state;
      }

      // 根据决策执行相应 Agent
      const nextAgent = decision.nextAgent as AgentName;
      state = await executeAgent(state, nextAgent);

      return state;
    },

    async getStatus(): Promise<TaskStatusResponse> {
      const state = await stateManager.readState(config.projectId);
      if (!state) {
        throw new Error('Task not found');
      }

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
      // 标记任务为已取消
      const state = await stateManager.readState(config.projectId);
      if (!state) {
        return false;
      }

      const updatedState: ResearchState = {
        ...state,
        status: 'failed',
        progress: state.progress,
        progressMessage: '任务已取消',
        updatedAt: new Date().toISOString(),
      };

      return stateManager.writeState(updatedState);
    },
  };
}

/**
 * 执行指定 Agent
 */
async function executeAgent(state: ResearchState, agentName: AgentName): Promise<ResearchState> {
  // 根据当前状态更新为对应的执行状态
  const statusMap: Record<AgentName, ResearchState['status']> = {
    planner: 'planning',
    searcher: 'searching',
    extractor: 'extracting',
    analyzer: 'analyzing',
    reporter: 'reporting',
  };

  const newStatus = statusMap[agentName];

  // 动态导入对应的 Agent 并执行
  switch (agentName) {
    case 'planner': {
      const { createPlannerAgent } = await import('./workers/planner');
      const agent = createPlannerAgent();
      const result = await agent.execute(state);
      if (result.success && result.searchPlan) {
        return {
          ...state,
          status: newStatus,
          currentStep: 'planner',
          progress: 10,
          progressMessage: `计划生成完成，共 ${result.searchPlan.queries.length} 个搜索查询`,
          pendingQueries: result.searchPlan.queries,
          keywords: state.keywords,
          updatedAt: new Date().toISOString(),
        };
      }
      return { ...state, status: 'failed', progressMessage: result.error || '规划失败' };
    }
    case 'searcher': {
      const { createSearcherAgent } = await import('./workers/searcher');
      const agent = createSearcherAgent();
      const result = await agent.execute(state);
      if (result.success) {
        return {
          ...state,
          status: newStatus,
          currentStep: 'searcher',
          progress: Math.min(30, 10 + (state.searchResults.length / 15) * 20),
          progressMessage: `已完成 ${state.searchResults.length} 条搜索结果`,
          searchResults: result.searchResults || state.searchResults,
          totalSearches: state.totalSearches + 1,
          totalResults: state.searchResults.length,
          updatedAt: new Date().toISOString(),
        };
      }
      return { ...state, status: 'failed', progressMessage: result.error || '搜索失败' };
    }
    case 'extractor': {
      const { createExtractorAgent } = await import('./workers/extractor');
      const agent = createExtractorAgent();
      const result = await agent.execute(state);
      if (result.success) {
        return {
          ...state,
          status: newStatus,
          currentStep: 'extractor',
          progress: Math.min(60, 30 + (state.extractedContent.length / 5) * 30),
          progressMessage: `已提取 ${state.extractedContent.length} 个页面内容`,
          extractedContent: result.extractedContent || state.extractedContent,
          updatedAt: new Date().toISOString(),
        };
      }
      return { ...state, status: 'failed', progressMessage: result.error || '提取失败' };
    }
    case 'analyzer': {
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
          ...state,
          status: newStatus,
          currentStep: 'analyzer',
          progress: Math.min(85, 60 + (result.analysis.confidenceScore * 25)),
          progressMessage: '分析完成',
          analysis: result.analysis,
          citations,
          updatedAt: new Date().toISOString(),
        };
      }
      return { ...state, status: 'failed', progressMessage: result.error || '分析失败' };
    }
    case 'reporter': {
      const { createReporterAgent } = await import('./workers/reporter');
      const agent = createReporterAgent();
      const result = await agent.execute(state);
      if (result.success && result.report) {
        return {
          ...state,
          status: 'completed',
          currentStep: 'reporter',
          progress: 100,
          progressMessage: '研究报告生成完成',
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return { ...state, status: 'failed', progressMessage: result.error || '报告生成失败' };
    }
    default:
      return state;
  }
}

// ============================================================
// 便捷函数
// ============================================================

/**
 * 获取任务状态
 */
export async function getResearchTaskStatus(projectId: string): Promise<TaskStatusResponse | null> {
  const stateManager = new MarkdownStateManager({
    stateDir: 'task-data',
  });

  const state = await stateManager.readState(projectId);
  if (!state) {
    return null;
  }

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
  const stateManager = new MarkdownStateManager({
    stateDir: 'task-data',
  });
  return stateManager.listStates();
}

/**
 * 删除研究任务
 */
export async function deleteResearchTask(projectId: string): Promise<boolean> {
  const stateManager = new MarkdownStateManager({
    stateDir: 'task-data',
  });
  return stateManager.deleteState(projectId);
}

/**
 * 检查任务是否存在
 */
export function researchTaskExists(projectId: string): boolean {
  const stateManager = new MarkdownStateManager({
    stateDir: 'task-data',
  });
  return stateManager.exists(projectId);
}
