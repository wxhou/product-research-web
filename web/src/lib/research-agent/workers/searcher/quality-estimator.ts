/**
 * 搜索质量预估模块
 *
 * 在搜索阶段预估 extractor 过滤后的内容产出数量
 * 用于决策是否需要继续补充搜索
 */

import type { SearchResult } from '../../types';

/**
 * 质量预估输入
 */
export interface QualityEstimatorInput {
  searchResults: SearchResult[];
  /** 预估过滤通过率，默认 0.4 */
  filterPassRate?: number;
  /** 最低要求数量，默认 10 */
  minCount?: number;
}

/**
 * 质量预估输出
 */
export interface QualityEstimateResult {
  /** 预估产出数量 */
  estimatedOutputCount: number;
  /** 是否满足最低要求 */
  isSufficient: boolean;
  /** 质量评分 (0-100) */
  qualityScore: number;
  /** 建议行动 */
  recommendation: 'continue' | 'stop' | 'need_more_queries';
  /** 缺失维度 */
  missingDimensions?: string[];
}

/**
 * 质量预估配置
 */
export interface QualityEstimatorConfig {
  /** 过滤通过率 */
  filterPassRate: number;
  /** 最低数量要求 */
  minCount: number;
  /** 质量评分阈值 */
  qualityThreshold: number;
}

const DEFAULT_CONFIG: QualityEstimatorConfig = {
  filterPassRate: 0.4,
  minCount: 10,
  qualityThreshold: 60,
};

/**
 * 预估过滤后的产出数量
 *
 * 公式: estimatedOutput = searchResults.length * filterPassRate * qualityRatio
 */
export function estimateOutputCount(
  searchResults: SearchResult[],
  filterPassRate: number = DEFAULT_CONFIG.filterPassRate
): number {
  if (searchResults.length === 0) return 0;

  // 计算高质量结果占比
  const highQualityCount = searchResults.filter((r) => r.quality >= 7).length;
  const qualityRatio = highQualityCount / searchResults.length;

  // 预估产出 = 搜索结果数 * 过滤通过率 * 质量比率
  const estimatedOutput = searchResults.length * filterPassRate * (0.5 + qualityRatio * 0.5);

  return Math.round(estimatedOutput);
}

/**
 * 计算质量评分
 *
 * 权重:
 * - 高质量结果占比: 40%
 * - 维度覆盖率: 30%
 * - 去重率: 20%
 * - 来源可信度: 10%
 */
export function calculateQualityScore(
  searchResults: SearchResult[],
  researchDimensions: string[] = []
): number {
  if (searchResults.length === 0) return 0;

  let score = 0;

  // 1. 高质量结果占比 (40%)
  const highQualityCount = searchResults.filter((r) => r.quality >= 7).length;
  const highQualityRatio = highQualityCount / searchResults.length;
  const highQualityScore = highQualityRatio * 40;

  // 2. 维度覆盖率 (30%)
  const coveredDimensions = new Set(searchResults.map((r) => r.dimension).filter(Boolean));
  const dimensionCoverage = researchDimensions.length > 0
    ? coveredDimensions.size / researchDimensions.length
    : Math.min(coveredDimensions.size / 8, 1);
  const dimensionScore = dimensionCoverage * 30;

  // 3. 去重率 (20%)
  const titles = searchResults.map((r) => r.title.toLowerCase());
  const uniqueTitles = new Set(titles);
  const deduplicationRate = uniqueTitles.size / searchResults.length;
  const deduplicationScore = deduplicationRate * 20;

  // 4. 来源可信度 (10%)
  // 基于搜索结果的质量分数估算可信度
  const avgQuality = searchResults.reduce((sum, r) => sum + r.quality, 0) / searchResults.length;
  const credibilityScore = (avgQuality / 10) * 10;

  score = highQualityScore + dimensionScore + deduplicationScore + credibilityScore;

  return Math.round(Math.min(score, 100));
}

/**
 * 决策逻辑
 *
 * | 预估产出 | 质量评分 | 决策 |
 * |----------|----------|------|
 * | ≥ 10 | ≥ 60 | stop |
 * | < 10 | ≥ 60 | need_more_queries |
 * | < 10 | < 60 | continue |
 */
export function makeSearchDecision(
  estimatedOutputCount: number,
  qualityScore: number,
  minCount: number = DEFAULT_CONFIG.minCount,
  qualityThreshold: number = DEFAULT_CONFIG.qualityThreshold
): QualityEstimateResult {
  const isSufficient = estimatedOutputCount >= minCount;
  const isQualityGood = qualityScore >= qualityThreshold;

  let recommendation: QualityEstimateResult['recommendation'];

  if (isSufficient && isQualityGood) {
    recommendation = 'stop';
  } else if (!isSufficient && isQualityGood) {
    recommendation = 'need_more_queries';
  } else {
    recommendation = 'continue';
  }

  return {
    estimatedOutputCount,
    isSufficient,
    qualityScore,
    recommendation,
  };
}

/**
 * 主函数：执行质量预估
 */
export function estimateQuality(
  input: QualityEstimatorInput,
  researchDimensions: string[] = []
): QualityEstimateResult {
  const { searchResults, filterPassRate, minCount } = input;
  const config = { ...DEFAULT_CONFIG, filterPassRate, minCount };

  // 1. 预估产出数量
  const estimatedOutputCount = estimateOutputCount(searchResults, config.filterPassRate);

  // 2. 计算质量评分
  const qualityScore = calculateQualityScore(searchResults, researchDimensions);

  // 3. 做出决策
  return makeSearchDecision(
    estimatedOutputCount,
    qualityScore,
    config.minCount,
    config.qualityThreshold
  );
}

/**
 * 快速检查：是否需要继续搜索
 */
export function shouldContinueSearch(
  searchResults: SearchResult[],
  minCount: number = DEFAULT_CONFIG.minCount,
  filterPassRate: number = DEFAULT_CONFIG.filterPassRate
): boolean {
  const estimatedCount = estimateOutputCount(searchResults, filterPassRate);
  return estimatedCount < minCount;
}
