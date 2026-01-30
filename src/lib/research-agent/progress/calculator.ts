/**
 * 进度计算器
 *
 * 计算研究任务的进度百分比
 */

import type { AgentName, ProgressDetail } from '../types';
import type { ResearchState } from '../state';

/**
 * 阶段进度配置
 */
export interface StageProgressConfig {
  /** 阶段名称 */
  stage: AgentName;
  /** 基础进度百分比 */
  baseProgress: number;
  /** 最大进度百分比 */
  maxProgress: number;
  /** 权重 */
  weight: number;
}

/**
 * 阶段配置表
 */
export const STAGE_PROGRESS_CONFIG: StageProgressConfig[] = [
  { stage: 'planner', baseProgress: 0, maxProgress: 20, weight: 0.1 },
  { stage: 'searcher', baseProgress: 20, maxProgress: 40, weight: 0.25 },
  { stage: 'extractor', baseProgress: 40, maxProgress: 60, weight: 0.25 },
  { stage: 'analyzer', baseProgress: 60, maxProgress: 80, weight: 0.25 },
  { stage: 'reporter', baseProgress: 80, maxProgress: 100, weight: 0.15 },
];

/**
 * 进度计算质量阈值配置
 */
export interface ProgressQualityThresholds {
  minSearchResults: number;
  minExtractions: number;
  minFeatures: number;
  minCompetitors: number;
  minConfidenceScore: number;
}

/**
 * 默认质量阈值
 */
export const DEFAULT_QUALITY_THRESHOLDS: ProgressQualityThresholds = {
  minSearchResults: 15,
  minExtractions: 5,
  minFeatures: 3,
  minCompetitors: 2,
  minConfidenceScore: 0.5,
};

/**
 * 计算整体进度
 *
 * @param state 当前研究状态
 * @param thresholds 质量阈值配置
 * @returns 进度百分比 (0-100)
 */
export function calculateOverallProgress(
  state: ResearchState,
  thresholds: ProgressQualityThresholds = DEFAULT_QUALITY_THRESHOLDS
): number {
  // 如果已完成，直接返回 100%
  if (state.status === 'completed') {
    return 100;
  }

  // 如果已失败或取消，返回当前进度
  if (state.status === 'failed' || state.status === 'cancelled') {
    return state.progress;
  }

  // 根据当前阶段计算进度
  const stageConfig = STAGE_PROGRESS_CONFIG.find(c => c.stage === state.currentStep);
  if (!stageConfig) {
    return state.progress;
  }

  // 计算各阶段完成度
  const plannerProgress = calculatePlannerProgress(state);
  const searcherProgress = calculateSearcherProgress(state, thresholds);
  const extractorProgress = calculateExtractorProgress(state, thresholds);
  const analyzerProgress = calculateAnalyzerProgress(state, thresholds);
  const reporterProgress = calculateReporterProgress(state);

  // 加权平均计算总体进度
  const totalProgress =
    plannerProgress * 0.1 +
    searcherProgress * 0.25 +
    extractorProgress * 0.25 +
    analyzerProgress * 0.25 +
    reporterProgress * 0.15;

  return Math.min(Math.round(totalProgress), 100);
}

/**
 * 计算规划阶段进度
 */
export function calculatePlannerProgress(state: ResearchState): number {
  // 如果有 pendingQueries，说明规划已完成
  if (state.pendingQueries.length > 0) {
    return 100;
  }
  // 如果状态是 planning，说明正在进行
  if (state.status === 'planning') {
    return 50;
  }
  // 如果已经开始后续阶段，规划一定已完成
  if (['searching', 'extracting', 'analyzing', 'reporting', 'completed'].includes(state.status)) {
    return 100;
  }
  return 0;
}

/**
 * 计算搜索阶段进度
 */
export function calculateSearcherProgress(
  state: ResearchState,
  thresholds: ProgressQualityThresholds
): number {
  if (state.status === 'pending' || state.status === 'planning') {
    return 0;
  }

  const targetResults = thresholds.minSearchResults;
  const currentResults = state.searchResults.length;

  if (currentResults >= targetResults) {
    return 100;
  }

  return Math.min((currentResults / targetResults) * 100, 99);
}

/**
 * 计算提取阶段进度
 */
export function calculateExtractorProgress(
  state: ResearchState,
  thresholds: ProgressQualityThresholds
): number {
  if (state.status === 'pending' || state.status === 'planning' || state.status === 'searching') {
    return 0;
  }

  // 只计算有搜索结果的情况
  if (state.searchResults.length === 0) {
    return 0;
  }

  const targetExtractions = Math.min(thresholds.minExtractions, state.searchResults.length);
  const currentExtractions = state.extractedContent.length;

  if (currentExtractions >= targetExtractions) {
    return 100;
  }

  return Math.min((currentExtractions / targetExtractions) * 100, 99);
}

/**
 * 计算分析阶段进度
 */
export function calculateAnalyzerProgress(
  state: ResearchState,
  thresholds: ProgressQualityThresholds
): number {
  if (state.status === 'pending' || state.status === 'planning' || state.status === 'searching' || state.status === 'extracting') {
    return 0;
  }

  if (!state.analysis) {
    return 50; // 分析中
  }

  // 检查分析质量
  const featuresComplete = state.analysis.features.length >= thresholds.minFeatures;
  const competitorsComplete = state.analysis.competitors.length >= thresholds.minCompetitors;
  const confidenceComplete = state.analysis.confidenceScore >= thresholds.minConfidenceScore;

  if (featuresComplete && competitorsComplete && confidenceComplete) {
    return 100;
  }

  // 计算完成度
  const featureRatio = Math.min(state.analysis.features.length / thresholds.minFeatures, 1);
  const competitorRatio = Math.min(state.analysis.competitors.length / thresholds.minCompetitors, 1);
  const confidenceRatio = state.analysis.confidenceScore;

  return (featureRatio * 0.4 + competitorRatio * 0.3 + confidenceRatio * 0.3) * 100;
}

/**
 * 计算报告阶段进度
 */
export function calculateReporterProgress(state: ResearchState): number {
  if (state.status === 'completed') {
    return 100;
  }

  if (state.status === 'reporting') {
    return 50; // 报告中
  }

  if (state.status === 'analyzing' && state.analysis) {
    return 25; // 分析完成，准备报告
  }

  return 0;
}

/**
 * 生成进度详情
 */
export function generateProgressDetail(state: ResearchState): ProgressDetail {
  const stage = state.currentStep;
  let step = '';
  let totalItems = 0;
  let completedItems = 0;
  let currentItem = '';

  switch (stage) {
    case 'planner':
      step = '生成研究计划';
      totalItems = 3;
      completedItems = state.pendingQueries.length > 0 ? 3 : 1;
      currentItem = state.title;
      break;

    case 'searcher':
      step = '执行搜索';
      totalItems = Math.max(10, state.pendingQueries.length);
      completedItems = state.totalSearches;
      currentItem = `已完成 ${state.searchResults.length} 条结果`;
      break;

    case 'extractor':
      step = '提取内容';
      totalItems = Math.max(5, state.searchResults.length);
      completedItems = state.extractedContent.length;
      currentItem = `已提取 ${state.extractedContent.length} 个页面`;
      break;

    case 'analyzer':
      step = '分析内容';
      totalItems = 5;
      completedItems = state.analysis ? 5 : 2;
      currentItem = state.analysis ? `置信度: ${(state.analysis.confidenceScore * 100).toFixed(0)}%` : '分析中...';
      break;

    case 'reporter':
      step = '生成报告';
      totalItems = 10;
      completedItems = state.status === 'completed' ? 10 : 5;
      currentItem = state.status === 'completed' ? '报告完成' : '撰写中...';
      break;

    default:
      step = state.status;
      totalItems = 1;
      completedItems = 1;
      currentItem = state.progressMessage;
  }

  return {
    stage,
    step,
    totalItems,
    completedItems,
    currentItem,
    percentage: state.progress,
  };
}

/**
 * 估算剩余时间（秒）
 */
export function estimateRemainingTime(state: ResearchState): number {
  const remainingProgress = 100 - state.progress;
  const elapsedSeconds = (Date.now() - new Date(state.startedAt).getTime()) / 1000;

  // 基于已完成进度的速度估算
  if (state.progress > 0) {
    const speed = elapsedSeconds / state.progress; // 每 1% 进度需要的秒数
    return speed * remainingProgress;
  }

  // 还未开始，根据阶段估算
  const stageTimeEstimates: Partial<Record<AgentName, number>> = {
    planner: 30,
    searcher: 60,
    extractor: 90,
    analyzer: 60,
    reporter: 45,
  };

  return stageTimeEstimates[state.currentStep] || 60;
}
