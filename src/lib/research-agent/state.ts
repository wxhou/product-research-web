/**
 * Research Agent 图状态定义
 *
 * 使用 LangGraph State 模式，定义工作流中流转的共享状态
 */

import type {
  ResearchStatus,
  AgentName,
  SearchQuery,
  SearchResult,
  ExtractionResult,
  AnalysisResult,
  DataQualityCheck,
  Citation,
  ProgressDetail,
  SearchPlan,
} from './types';

// ============================================================
// 核心状态接口
// ============================================================

/**
 * 研究状态 - LangGraph 工作流的共享状态
 *
 * 所有 Agent 通过读写此状态进行协作
 */
export interface ResearchState {
  // 基础信息
  projectId: string;
  title: string;
  description?: string;
  keywords: string[];

  // 状态管理
  status: ResearchStatus;
  currentStep: AgentName;
  errorMessage?: string;

  // 进度信息
  progress: number; // 0-100
  progressMessage: string;
  progressDetail?: ProgressDetail;

  // 统计信息
  iterationsUsed: number;
  totalSearches: number;
  totalResults: number;

  // 规划阶段产物
  searchPlan?: SearchPlan;

  // 搜索阶段产物
  searchResults: SearchResult[];
  pendingQueries: SearchQuery[];

  // 提取阶段产物
  extractedContent: ExtractionResult[];

  // 分析阶段产物
  analysis?: AnalysisResult;
  dataQuality?: DataQualityCheck;

  // 报告阶段产物
  citations: Citation[];

  // 时间戳
  startedAt: string;
  updatedAt: string;
  completedAt?: string;

  // 重试计数
  retryCount: number;
  maxRetries: number;
}

// ============================================================
// 状态辅助函数
// ============================================================

/**
 * 创建初始状态
 */
export function createInitialState(
  projectId: string,
  title: string,
  description?: string,
  keywords: string[] = []
): ResearchState {
  const now = new Date().toISOString();

  return {
    projectId,
    title,
    description,
    keywords,
    status: 'pending',
    currentStep: 'planner',
    progress: 0,
    progressMessage: '等待开始',
    searchResults: [],
    pendingQueries: [],
    extractedContent: [],
    citations: [],
    iterationsUsed: 0,
    totalSearches: 0,
    totalResults: 0,
    retryCount: 0,
    maxRetries: 3,
    startedAt: now,
    updatedAt: now,
  };
}

/**
 * 计算阶段进度
 */
export function calculateStageProgress(
  currentStep: AgentName,
  completedSteps: AgentName[]
): number {
  const stepOrder: AgentName[] = ['planner', 'searcher', 'extractor', 'analyzer', 'reporter'];
  const currentIndex = stepOrder.indexOf(currentStep);
  const completedCount = completedSteps.filter(s => stepOrder.indexOf(s) < currentIndex).length;

  // 每个阶段分配 20% 进度
  const baseProgress = completedCount * 20;
  const stageProgress = currentStep !== 'planner' ? 10 : 0; // 当前阶段进行中增加 10%

  return Math.min(baseProgress + stageProgress, 95); // 最大 95%，完成时设为 100
}

/**
 * 状态转换映射
 */
export const statusTransitions: Record<ResearchStatus, ResearchStatus[]> = {
  pending: ['planning'],
  planning: ['searching'],
  searching: ['extracting', 'searching'], // 可能回到搜索（多轮）
  extracting: ['analyzing'],
  analyzing: ['reporting', 'analyzing'], // 可能回到分析（质量检查）
  reporting: ['completed'],
  completed: [],
  failed: [],
  cancelled: [],
};

/**
 * 检查状态转换是否有效
 */
export function isValidTransition(
  from: ResearchStatus,
  to: ResearchStatus
): boolean {
  return statusTransitions[from]?.includes(to) ?? false;
}

// ============================================================
// 状态更新函数（用于 LangGraph 节点）
// ============================================================

/**
 * 更新规划阶段
 */
export function updatePlanningState(
  state: ResearchState,
  updates: {
    searchPlan: ResearchState['searchPlan'];
    progressMessage: string;
  }
): Partial<ResearchState> {
  return {
    ...updates,
    status: 'searching',
    currentStep: 'searcher',
    progress: 10,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 更新搜索阶段
 */
export function updateSearchingState(
  state: ResearchState,
  updates: {
    searchResults?: SearchResult[];
    pendingQueries?: SearchQuery[];
    progressMessage: string;
    totalSearches?: number;
  }
): Partial<ResearchState> {
  const newResults = updates.searchResults ?? state.searchResults;
  const newPending = updates.pendingQueries ?? state.pendingQueries;

  return {
    ...updates,
    searchResults: newResults,
    pendingQueries: newPending,
    totalResults: newResults.length,
    totalSearches: updates.totalSearches ?? state.totalSearches,
    progress: 10 + (newResults.length / 50) * 20, // 10-30%
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 更新提取阶段
 */
export function updateExtractingState(
  state: ResearchState,
  updates: {
    extractedContent?: ExtractionResult[];
    progressMessage: string;
  }
): Partial<ResearchState> {
  const extracted = updates.extractedContent ?? state.extractedContent;

  return {
    ...updates,
    extractedContent: extracted,
    progress: 30 + (extracted.length / state.searchResults.length) * 20, // 30-50%
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 更新分析阶段
 */
export function updateAnalyzingState(
  state: ResearchState,
  updates: {
    analysis?: AnalysisResult;
    dataQuality?: DataQualityCheck;
    progressMessage: string;
  }
): Partial<ResearchState> {
  return {
    ...updates,
    status: updates.dataQuality?.isComplete ? 'reporting' : 'analyzing',
    currentStep: updates.dataQuality?.isComplete ? 'reporter' : 'analyzer',
    progress: 50 + (updates.analysis ? 20 : 0), // 50-70%
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 更新报告阶段
 */
export function updateReportingState(
  state: ResearchState,
  updates: {
    citations?: Citation[];
    progressMessage: string;
  }
): Partial<ResearchState> {
  return {
    ...updates,
    status: 'completed',
    currentStep: 'reporter',
    progress: 100,
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 更新错误状态
 */
export function updateErrorState(
  state: ResearchState,
  errorMessage: string
): Partial<ResearchState> {
  return {
    status: 'failed',
    errorMessage,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 更新取消状态
 */
export function updateCancellationState(
  state: ResearchState
): Partial<ResearchState> {
  return {
    status: 'cancelled',
    updatedAt: new Date().toISOString(),
  };
}
