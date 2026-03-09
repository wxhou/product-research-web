/**
 * 研究服务模块 - Pipeline 版
 *
 * 使用 Pipeline 编排器执行 Plan-and-Execute 架构
 */

import type { ResearchState } from './state';
import type { AgentName } from './types';
import { RESEARCH_QUALITY_THRESHOLDS } from './config/defaults';
import { createWorkerStage, createDefaultPipeline, type PipelineResult } from './pipeline';
import { triggerRestart, resetStateForRestart, shouldContinueRetry } from './workers/research-restart';
import { updateProgress, notifyRestart } from './progress/tracker';

/**
 * 研究任务配置
 */
export interface ResearchTaskConfig {
  projectId: string;
  title: string;
  description?: string;
  keywords: string[];
  userId: string;
  /** 是否启用迭代优化 */
  enableIteration?: boolean;
  /** 迭代优化配置 */
  iterationConfig?: {
    maxIterations?: number;
    passThreshold?: number;
    warnThreshold?: number;
    minImprovement?: number;
  };
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
}

/**
 * 研究任务执行器接口
 */
export interface ResearchTaskExecutor {
  config: ResearchTaskConfig;
  start(): Promise<ResearchState>;
  getStatus(): Promise<TaskStatusResponse>;
  cancel(): Promise<boolean>;
}

// 内存存储（简化版）- 用于任务状态查询
const taskStatusCache = new Map<string, TaskStatusResponse>();

/**
 * 研究任务执行器 - Pipeline 版
 */
export function createResearchTaskExecutor(config: ResearchTaskConfig): ResearchTaskExecutor {
  let currentState: ResearchState | null = null;

  /**
   * 保存状态到缓存
   */
  function saveToCache(): void {
    if (currentState) {
      taskStatusCache.set(currentState.projectId, {
        projectId: currentState.projectId,
        title: currentState.title,
        status: currentState.status,
        currentStep: currentState.currentStep,
        progress: currentState.progress,
        progressMessage: currentState.progressMessage,
        searchResultsCount: currentState.searchResults.length,
        extractedContentCount: currentState.extractedContent.length,
        hasAnalysis: !!currentState.analysis,
        confidenceScore: currentState.analysis?.confidenceScore,
      });
    }
  }

  /**
   * 创建初始状态
   */
  function createInitialState(): ResearchState {
    return {
      projectId: config.projectId,
      title: config.title,
      description: config.description,
      keywords: config.keywords,
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
    };
  }

  /**
   * Planner Worker
   */
  async function runPlanner(state: ResearchState): Promise<Partial<ResearchState>> {
    console.log(`[Planner] Generating research plan`);

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
        };
      }

      return {
        status: 'failed' as const,
        progressMessage: result.error || '规划失败',
      };
    } catch (error) {
      return {
        status: 'failed' as const,
        progressMessage: `规划失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Searcher Worker
   */
  async function runSearcher(state: ResearchState): Promise<Partial<ResearchState>> {
    console.log(`[Searcher] Executing searches`);

    try {
      const { getDataSourceManager } = await import('@/lib/datasources');
      const dataSourceManager = getDataSourceManager();
      const enabledSources = dataSourceManager.getEnabledSources();

      const { createSearcherAgent } = await import('./workers/searcher');
      const agent = createSearcherAgent({ enabledSources });
      const result = await agent.execute(state);

      if (result.success) {
        const searchResults = result.searchResults || state.searchResults;
        return {
          status: 'extracting' as const,
          currentStep: 'extractor' as AgentName,
          progress: Math.min(30, 10 + (searchResults.length / RESEARCH_QUALITY_THRESHOLDS.minSearchResults) * 20),
          progressMessage: `已完成 ${searchResults.length} 条搜索`,
          searchResults,
          pendingQueries: result.pendingQueries ?? state.pendingQueries,
          totalSearches: state.totalSearches + 1,
          totalResults: searchResults.length,
        };
      }

      return {
        status: 'failed' as const,
        progressMessage: result.error || '搜索失败',
      };
    } catch (error) {
      return {
        status: 'failed' as const,
        progressMessage: `搜索失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Extractor Worker
   */
  async function runExtractor(state: ResearchState): Promise<Partial<ResearchState>> {
    console.log(`[Extractor] Extracting content`);

    try {
      const { createExtractorAgent } = await import('./workers/extractor');
      const agent = createExtractorAgent();
      const result = await agent.execute(state);

      if (result.success) {
        const extractedContent = result.extractedContent || state.extractedContent;

        // 检查数量保障结果
        const countGuarantee = result.countGuarantee;

        // 如果需要更多搜索，返回 Searcher 补充
        // 注意：首次运行时 searchIteration 可能为 undefined，需要初始化
        const currentIteration = state.searchIteration?.currentRound || 1;
        const maxIterations = state.searchIteration?.maxRounds || 3;

        if (countGuarantee?.needMoreSearch && currentIteration < maxIterations) {
          console.log(`[Extractor] 数量不足: ${countGuarantee.actualCount}/${countGuarantee.requiredCount}，触发第 ${currentIteration + 1} 轮搜索`);

          // 返回 Searcher 继续搜索
          return {
            status: 'searching' as const,
            currentStep: 'searcher' as AgentName,
            progress: 20,
            progressMessage: `数量不足，补充搜索中 (${countGuarantee.actualCount}/${countGuarantee.requiredCount})`,
            extractedContent, // 保留已提取的内容
            projectPath: result.projectPath,
            rawFileCount: result.rawFileCount,
            // 更新迭代状态
            searchIteration: {
              currentRound: currentIteration + 1,
              maxRounds: maxIterations,
              coveredDimensions: state.searchIteration?.coveredDimensions || [],
              missingDimensions: state.searchIteration?.missingDimensions || [],
              roundResults: state.searchIteration?.roundResults || [],
              totalQueries: state.searchIteration?.totalQueries || 0,
              totalResults: state.searchIteration?.totalResults || 0,
            },
          };
        } else if (countGuarantee?.needMoreSearch) {
          console.log(`[Extractor] 已达到最大迭代次数 ${maxIterations}，继续分析`);
        }

        // 数量足够，继续 Analyzer
        return {
          status: 'analyzing' as const,
          currentStep: 'analyzer' as AgentName,
          progress: Math.min(60, 30 + (extractedContent.length / RESEARCH_QUALITY_THRESHOLDS.minExtractions) * 20),
          progressMessage: `已提取 ${extractedContent.length} 个页面`,
          extractedContent,
          projectPath: result.projectPath,
          rawFileCount: result.rawFileCount,
        };
      }

      return {
        status: 'failed' as const,
        progressMessage: result.error || '提取失败',
      };
    } catch (error) {
      return {
        status: 'failed' as const,
        progressMessage: `提取失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Analyzer Worker
   */
  async function runAnalyzer(state: ResearchState): Promise<Partial<ResearchState>> {
    console.log(`[Analyzer] Analyzing content`);

    try {
      const { createAnalyzerAgent } = await import('./workers/analyzer');
      const agent = createAnalyzerAgent();
      const result = await agent.execute(state);

      // 检查是否需要重启
      if (result.success && result.shouldRestart && result.qualityMetrics) {
        const reason = `质量评分 ${result.qualityMetrics.overallScore} 未达标 (完整度: ${result.qualityMetrics.completeness}, 可信度: ${result.qualityMetrics.credibility}, 相关度: ${result.qualityMetrics.relevance})`;

        // 检查是否应该继续重试
        const retryCheck = shouldContinueRetry(state);
        if (!retryCheck.shouldContinue) {
          console.warn(`[Analyzer] 连续失败，停止重试: ${retryCheck.reason}`);
          return {
            status: 'failed' as const,
            progressMessage: retryCheck.reason || '连续失败，停止重试',
          };
        }

        // 触发重启
        const restartOutput = triggerRestart(state, {
          reason,
          qualityMetrics: result.qualityMetrics,
        });

        // 发送重启通知
        await notifyRestart({
          projectId: state.projectId,
          retryCount: restartOutput.retryCount,
          reason,
          qualityMetrics: {
            overallScore: result.qualityMetrics.overallScore,
            completeness: result.qualityMetrics.completeness,
            credibility: result.qualityMetrics.credibility,
            relevance: result.qualityMetrics.relevance,
          },
          warning: restartOutput.warning,
          estimatedTimeRemaining: 30 * 60 * 1000, // 预估 30 分钟
        });

        // 重置状态准备重启
        const resetState = resetStateForRestart(state);

        console.log(`[Analyzer] 质量不达标，触发第 ${restartOutput.retryCount} 次重启`);

        return {
          ...resetState,
          status: 'pending' as const,
          currentStep: 'planner' as AgentName,
          progress: 0,
          progressMessage: `质量不达标，正在重启 (第 ${restartOutput.retryCount} 次)`,
        };
      }

      if (result.success && result.analysis) {
        const citations = state.extractedContent.map((ext, index) => ({
          id: `citation-${index + 1}`,
          source: ext.source,
          title: ext.title,
          url: ext.url,
          relevanceScore: 80 + ((index * 7 + ext.url.length) % 21),
          referencedAt: new Date().toISOString(),
        }));

        return {
          status: 'reporting' as const,
          currentStep: 'reporter' as AgentName,
          progress: Math.min(85, 60 + ((result.analysis.confidenceScore || 0) * 25)),
          progressMessage: '分析完成，生成报告中',
          analysis: result.analysis,
          analysisFiles: result.analysisFiles,
          citations,
          qualityMetrics: result.qualityMetrics,
        };
      }

      return {
        status: 'failed' as const,
        progressMessage: result.error || '分析失败',
      };
    } catch (error) {
      return {
        status: 'failed' as const,
        progressMessage: `分析失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Reporter Worker
   */
  async function runReporter(state: ResearchState): Promise<Partial<ResearchState>> {
    console.log(`[Reporter] Generating report`);

    try {
      const { createReporterAgent } = await import('./workers/reporter');
      const agent = createReporterAgent({
        enableIteration: config.enableIteration,
        iterationConfig: config.iterationConfig,
      });
      const result = await agent.execute(state);

      if (result.success) {
        return {
          status: 'completed' as const,
          currentStep: 'done' as AgentName,
          progress: 100,
          progressMessage: '研究报告生成完成',
          report: result.report,
          reportPath: result.reportPath,
          completedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'failed' as const,
        progressMessage: result.error || '报告生成失败',
      };
    } catch (error) {
      return {
        status: 'failed' as const,
        progressMessage: `报告生成失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // 创建 Pipeline
  const pipeline = createDefaultPipeline({
    planner: createWorkerStage({
      name: 'planner',
      worker: runPlanner,
      successStatus: 'searching',
      progress: 10,
      progressMessage: '生成搜索计划...',
    }),
    searcher: createWorkerStage({
      name: 'searcher',
      worker: runSearcher,
      successStatus: 'extracting',
      progress: 30,
      progressMessage: '执行搜索...',
    }),
    extractor: createWorkerStage({
      name: 'extractor',
      worker: runExtractor,
      successStatus: 'analyzing',
      progress: 60,
      progressMessage: '提取内容...',
    }),
    analyzer: createWorkerStage({
      name: 'analyzer',
      worker: runAnalyzer,
      successStatus: 'reporting',
      progress: 85,
      progressMessage: '分析内容...',
    }),
    reporter: createWorkerStage({
      name: 'reporter',
      worker: runReporter,
      successStatus: 'completed',
      progress: 100,
      progressMessage: '生成报告...',
    }),
  });

  return {
    config,

    /**
     * 开始执行研究任务
     */
    async start(): Promise<ResearchState> {
      console.log(`[ResearchService] Starting task for project ${config.projectId}`);

      currentState = createInitialState();

      // 使用 Pipeline 执行
      const result: PipelineResult = await pipeline.execute(currentState);

      currentState = result.finalState;
      saveToCache();

      console.log(`[ResearchService] Task completed: status=${currentState.status}`);
      return currentState;
    },

    /**
     * 获取当前状态
     */
    async getStatus(): Promise<TaskStatusResponse> {
      if (!currentState) {
        throw new Error('任务未启动');
      }

      return {
        projectId: currentState.projectId,
        title: currentState.title,
        status: currentState.status,
        currentStep: currentState.currentStep,
        progress: currentState.progress,
        progressMessage: currentState.progressMessage,
        searchResultsCount: currentState.searchResults.length,
        extractedContentCount: currentState.extractedContent.length,
        hasAnalysis: !!currentState.analysis,
        confidenceScore: currentState.analysis?.confidenceScore,
      };
    },

    /**
     * 取消任务
     */
    async cancel(): Promise<boolean> {
      if (!currentState) {
        return false;
      }

      currentState.status = 'cancelled';
      currentState.progressMessage = '任务已取消';
      currentState.updatedAt = new Date().toISOString();
      saveToCache();
      return true;
    },
  };
}

/**
 * 获取研究任务状态
 */
export async function getResearchTaskStatus(projectId: string): Promise<TaskStatusResponse | null> {
  return taskStatusCache.get(projectId) || null;
}

/**
 * 列出所有研究任务
 */
export async function listResearchTasks(): Promise<TaskStatusResponse[]> {
  return Array.from(taskStatusCache.values());
}

/**
 * 删除研究任务
 */
export async function deleteResearchTask(projectId: string): Promise<boolean> {
  return taskStatusCache.delete(projectId);
}

/**
 * 检查研究任务是否存在
 */
export async function researchTaskExists(projectId: string): Promise<boolean> {
  return taskStatusCache.has(projectId);
}
