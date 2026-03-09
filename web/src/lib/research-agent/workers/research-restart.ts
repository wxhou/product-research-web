/**
 * 研究重启模块
 *
 * 质量不达标时触发完整流程重启，支持检查点回滚和重试计数
 */

import type { ResearchState } from '../state';
import type { QualityMetrics, CostWarning, FailurePattern } from '../types';
import { saveCheckpoint, recordFailurePattern, detectConsecutiveFailures } from '../state';

/**
 * 重启输入
 */
export interface RestartInput {
  reason: string;
  qualityMetrics: QualityMetrics;
  maxDuration?: number; // 最大运行时长（毫秒）
}

/**
 * 重启输出
 */
export interface RestartOutput {
  success: boolean;
  retryCount: number;
  shouldRestart: boolean;
  shouldWarn: boolean;
  warning?: string;
}

/**
 * 触发重启
 */
export function triggerRestart(
  state: ResearchState,
  input: RestartInput
): RestartOutput {
  const { reason, qualityMetrics, maxDuration = 30 * 60 * 1000 } = input; // 默认 30 分钟

  // 更新重试计数
  state.retryCount += 1;
  const retryCount = state.retryCount;

  // 记录失败模式
  recordFailurePattern(state, reason);

  // 检测连续失败
  const consecutiveFailures = detectConsecutiveFailures(state, 3);
  const hasConsecutiveFailures = consecutiveFailures.length > 0;

  // 生成警告信息
  let warning: string | undefined;
  let shouldWarn = false;

  if (hasConsecutiveFailures) {
    shouldWarn = true;
    warning = `连续 3 次以上相同原因失败: ${consecutiveFailures.map(f => f.reason).join(', ')}`;
    console.warn(`[ResearchRestart] ${warning}`);
  }

  // 检查重试成本（超过 3 次）
  if (retryCount >= 3) {
    shouldWarn = true;
    const costWarning = calculateCostWarning(retryCount);
    warning = warning
      ? `${warning}; ${costWarning.warningMessage}`
      : costWarning.warningMessage;
    console.warn(`[ResearchRestart] ${costWarning.warningMessage}`);
  }

  // 保存检查点
  saveCheckpoint(state, reason);

  // 更新质量指标
  state.qualityMetrics = qualityMetrics;

  console.log(`[ResearchRestart] 触发第 ${retryCount} 次重启 - ${reason}`);

  return {
    success: true,
    retryCount,
    shouldRestart: true,
    shouldWarn,
    warning,
  };
}

/**
 * 计算重试成本预警
 */
export function calculateCostWarning(retryCount: number): CostWarning {
  // 估算每次重试的 Token 消耗（基于典型搜索+提取+分析流程）
  const baseTokens = 50000; // 基础 Token
  const perRoundTokens = 30000; // 每轮增加
  const estimatedTokens = baseTokens + (retryCount - 1) * perRoundTokens;

  // 假设 $1 / 100K tokens
  const estimatedCost = estimatedTokens / 100000;

  let warningMessage: string;
  if (retryCount === 3) {
    warningMessage = `已重试 3 次，预计消耗约 ${estimatedTokens.toLocaleString()} tokens ($${estimatedCost.toFixed(2)})`;
  } else {
    warningMessage = `已重试 ${retryCount} 次，预计累计消耗约 ${estimatedTokens.toLocaleString()} tokens ($${estimatedCost.toFixed(2)})`;
  }

  return {
    retryCount,
    estimatedTokens,
    estimatedCost,
    warningMessage,
  };
}

/**
 * 重置状态准备重启
 */
export function resetStateForRestart(state: ResearchState): Partial<ResearchState> {
  // 保留基础信息
  const {
    projectId,
    title,
    description,
    keywords,
    retryCount,
    maxRetries,
    checkpointHistory,
    failurePatterns,
  } = state;

  // 重置所有阶段产物
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
    searchIteration: {
      currentRound: 1,
      maxRounds: 3,
      coveredDimensions: [],
      missingDimensions: [],
      roundResults: [],
      totalQueries: 0,
      totalResults: 0,
    },
    extractedContent: [],
    citations: [],
    analysis: undefined,
    dataQuality: undefined,
    searchPlan: undefined,
    report: undefined,
    reportPath: undefined,
    // 保留重试相关状态
    retryCount,
    maxRetries,
    checkpointHistory,
    failurePatterns,
    // 清除质量指标（将在重启后重新计算）
    qualityMetrics: undefined,
  };
}

/**
 * 检查是否应该继续重试
 */
export function shouldContinueRetry(
  state: ResearchState,
  maxDuration: number = 30 * 60 * 1000
): { shouldContinue: boolean; reason?: string } {
  // 检查连续失败
  const consecutiveFailures = detectConsecutiveFailures(state, 5);
  if (consecutiveFailures.length >= 3) {
    return {
      shouldContinue: false,
      reason: '连续 5 次以上相同原因失败，建议人工介入',
    };
  }

  // 检查最大重试次数（可选的软限制）
  const softLimit = 10;
  if (state.retryCount >= softLimit) {
    console.warn(`[ResearchRestart] 已超过软限制 ${softLimit} 次重试`);
  }

  return { shouldContinue: true };
}

/**
 * 获取重试状态信息
 */
export function getRetryStatus(state: ResearchState): {
  retryCount: number;
  consecutiveFailures: FailurePattern[];
  costWarning?: CostWarning;
} {
  const consecutiveFailures = detectConsecutiveFailures(state, 3);
  const costWarning = state.retryCount >= 3 ? calculateCostWarning(state.retryCount) : undefined;

  return {
    retryCount: state.retryCount,
    consecutiveFailures,
    costWarning,
  };
}
