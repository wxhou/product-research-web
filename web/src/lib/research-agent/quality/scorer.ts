/**
 * 数据质量评分系统
 *
 * 通用设计：适用于任意领域
 */

export type QualityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * 数据来源质量等级定义
 */
export const SOURCE_QUALITY: Record<string, QualityLevel> = {
  // 高质量来源
  'official': 'HIGH',
  '官方': 'HIGH',
  '财报': 'HIGH',
  'annual report': 'HIGH',
  '10-K': 'HIGH',
  '10-Q': 'HIGH',

  // 行业报告
  '艾瑞': 'HIGH',
  'Gartner': 'HIGH',
  'IDC': 'HIGH',
  'QuestMobile': 'HIGH',
  '易观': 'HIGH',
  '比达': 'HIGH',
  '行业报告': 'MEDIUM',
  'research report': 'MEDIUM',

  // 中等质量
  'medium': 'MEDIUM',
  '权威媒体': 'MEDIUM',
  '36氪': 'MEDIUM',
  '虎嗅': 'MEDIUM',
  '钛媒体': 'MEDIUM',
  'techcrunch': 'MEDIUM',
  'forbes': 'MEDIUM',

  // 技术博客
  '博客': 'MEDIUM',
  'CSDN': 'MEDIUM',
  '掘金': 'MEDIUM',

  // 低质量
  '论坛': 'LOW',
  '贴吧': 'LOW',
  '知乎': 'LOW',
  '小红书': 'LOW',
  'twitter': 'LOW',
  '微博': 'LOW',
  'reddit': 'LOW',
};

/**
 * 评估数据来源质量
 */
export function evaluateSourceQuality(source: string): QualityLevel {
  const lower = source.toLowerCase();

  for (const [keyword, quality] of Object.entries(SOURCE_QUALITY)) {
    if (lower.includes(keyword.toLowerCase())) {
      return quality;
    }
  }

  return 'LOW'; // 无数据时返回低置信度
}

/**
 * 计算数据置信度分数
 */
export interface ConfidenceScore {
  level: QualityLevel;
  score: number; // 0-100
  reasons: string[];
}

/**
 * 评估单条数据的置信度
 */
export function evaluateDataConfidence(
  data: {
    source?: string;
    isEstimate?: boolean;
    hasMultipleSources?: boolean;
    dataType?: 'market' | 'competitor' | 'user' | 'feature';
  }
): ConfidenceScore {
  const reasons: string[] = [];
  let baseScore = 0;

  // 来源质量
  if (data.source) {
    const sourceQuality = evaluateSourceQuality(data.source);
    switch (sourceQuality) {
      case 'HIGH':
        baseScore += 30;
        reasons.push('来源权威');
        break;
      case 'MEDIUM':
        baseScore += 10;
        reasons.push('来源一般');
        break;
      case 'LOW':
        baseScore -= 10;
        reasons.push('来源可信度低');
        break;
    }
  }

  // 是否为估算
  if (data.isEstimate) {
    baseScore -= 20;
    reasons.push('数据为估算');
  }

  // 多源验证
  if (data.hasMultipleSources) {
    baseScore += 20;
    reasons.push('多源验证');
  }

  // 数据类型权重
  const typeWeights: Record<string, number> = {
    'market': 10,    // 市场规模最难获取，降低权重
    'competitor': 0,
    'user': -10,
    'feature': 0,
  };
  baseScore += typeWeights[data.dataType || 'feature'];

  // 限制范围
  const score = Math.max(0, Math.min(100, baseScore));

  // 确定等级
  let level: QualityLevel;
  if (score >= 70) level = 'HIGH';
  else if (score >= 40) level = 'MEDIUM';
  else level = 'LOW';

  return { level, score, reasons };
}

/**
 * 90分评分系统
 */
export interface QualityScorecard {
  totalScore: number;
  dimensions: {
    dataCompleteness: number; // 40%
    analysisDepth: number;    // 30%
    decisionValue: number;     // 30%
  };
  breakdown: {
    metric: string;
    score: number;
    maxScore: number;
    status: 'pass' | 'fail';
  }[];
}

// ============================================================
// 数据质量驱动重启 - 质量评估工具
// ============================================================

import type {
  SearchResult,
  ExtractionResult,
  AnalysisResult,
  QualityMetrics,
  DataSourceType,
} from '../types';

// 数据源可信度权重（用于搜索结果）
// 使用 string 以兼容各种数据源类型
const SOURCE_CREDIBILITY_WEIGHTS: Record<string, number> = {
  // 高可信度
  'official-docs': 1.0,
  'government': 1.0,
  'academic': 0.9,
  // 中可信度
  'news': 0.7,
  'blog': 0.6,
  'rss-hackernews': 0.6,
  'rss-techcrunch': 0.6,
  'rss-theverge': 0.6,
  'rss-wired': 0.6,
  'rss-producthunt': 0.6,
  // 低可信度
  'community': 0.4,
  'social': 0.3,
  'rss-cnblogs': 0.5,
  'rss-juejin': 0.5,
  'hackernews-api': 0.6,
};

/**
 * 计算数据完整性评分
 */
export function calculateCompleteness(
  searchResults: SearchResult[],
  extractedContent: ExtractionResult[],
  analysis?: AnalysisResult,
  researchDimensions: string[] = []
): number {
  let score = 100;

  // 1. 搜索结果数量检查
  const minResults = 15;
  if (searchResults.length < minResults) {
    const penalty = (minResults - searchResults.length) * 3;
    score -= penalty;
  }

  // 2. 提取结果数量检查
  const minExtractions = 5;
  if (extractedContent.length < minExtractions) {
    const penalty = (minExtractions - extractedContent.length) * 5;
    score -= penalty;
  }

  // 3. 分析维度覆盖检查
  if (researchDimensions.length > 0) {
    const coveredDimensions = new Set(
      searchResults.map((r) => r.dimension).filter(Boolean)
    );
    const coverage = coveredDimensions.size / researchDimensions.length;
    if (coverage < 0.6) {
      score -= 15;
    }
  }

  // 4. 功能分析检查
  const minFeatures = 3;
  if (analysis?.features && analysis.features.length < minFeatures) {
    const penalty = (minFeatures - analysis.features.length) * 8;
    score -= penalty;
  }

  // 5. 竞品分析检查
  const minCompetitors = 2;
  if (analysis?.competitors && analysis.competitors.length < minCompetitors) {
    const penalty = (minCompetitors - analysis.competitors.length) * 10;
    score -= penalty;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * 计算来源可信度评分
 */
export function calculateCredibility(
  searchResults: SearchResult[],
  extractedContent: ExtractionResult[]
): number {
  const allSources = [
    ...searchResults.map((r) => r.source),
    ...extractedContent.map((e) => e.source),
  ];

  if (allSources.length === 0) {
    return 0;
  }

  let totalCredibility = 0;

  for (const source of allSources) {
    totalCredibility += SOURCE_CREDIBILITY_WEIGHTS[source] ?? 0.5;
  }

  const avgCredibility = (totalCredibility / allSources.length) * 100;

  // 额外检查：高可信度来源占比
  const highCredSources = ['official-docs', 'government', 'academic'];
  const highCredRatio = allSources.filter((s) => highCredSources.includes(s)).length / allSources.length;

  if (highCredRatio < 0.2) {
    return Math.max(0, avgCredibility - 20);
  }

  return Math.max(0, Math.min(100, avgCredibility));
}

/**
 * 计算内容相关性评分
 */
export function calculateRelevance(
  searchResults: SearchResult[],
  targetIndustry: string,
  researchDimensions: string[] = []
): number {
  if (searchResults.length === 0) {
    return 0;
  }

  // 基于质量分数的相关性评估
  const highQualityCount = searchResults.filter((r) => r.quality >= 7).length;
  const lowQualityCount = searchResults.filter((r) => r.quality < 4).length;

  const highQualityRatio = highQualityCount / searchResults.length;
  const lowQualityRatio = lowQualityCount / searchResults.length;

  let qualityScore = 0;
  if (highQualityRatio >= 0.3 && lowQualityRatio <= 0.3) {
    qualityScore = 80 + highQualityRatio * 20;
  } else if (highQualityRatio >= 0.2 && lowQualityRatio <= 0.4) {
    qualityScore = 60 + highQualityRatio * 20;
  } else {
    qualityScore = 40 + highQualityRatio * 20;
  }

  // 维度匹配度
  let dimensionScore = 100;
  if (researchDimensions.length > 0) {
    const coveredDimensions = new Set(
      searchResults.map((r) => r.dimension).filter(Boolean)
    );
    const matchRatio = Math.min(1, coveredDimensions.size / researchDimensions.length);
    dimensionScore = matchRatio * 100;
  }

  // 去重率
  const titles = searchResults.map((r) => r.title.toLowerCase());
  const uniqueTitles = new Set(titles);
  const deduplicationRate = uniqueTitles.size / titles.length;
  const dedupScore = deduplicationRate * 100;

  const relevance = qualityScore * 0.5 + dimensionScore * 0.3 + dedupScore * 0.2;

  return Math.max(0, Math.min(100, relevance));
}

/**
 * 计算综合质量评分
 */
export function calculateOverallScore(
  completeness: number,
  credibility: number,
  relevance: number
): number {
  const overall = completeness * 0.4 + credibility * 0.3 + relevance * 0.3;
  return Math.max(0, Math.min(100, Math.round(overall)));
}

/**
 * 完整的质量评估
 */
export function evaluateQuality(
  searchResults: SearchResult[],
  extractedContent: ExtractionResult[],
  analysis?: AnalysisResult,
  targetIndustry?: string,
  researchDimensions: string[] = []
): QualityMetrics {
  const completeness = calculateCompleteness(
    searchResults,
    extractedContent,
    analysis,
    researchDimensions
  );

  const credibility = calculateCredibility(searchResults, extractedContent);

  const relevance = calculateRelevance(
    searchResults,
    targetIndustry || '',
    researchDimensions
  );

  const overallScore = calculateOverallScore(completeness, credibility, relevance);

  const issues: string[] = [];
  const suggestions: string[] = [];

  if (completeness < 50) {
    issues.push('数据完整性不足');
    suggestions.push('增加搜索查询数量和维度覆盖');
  }

  if (credibility < 50) {
    issues.push('数据来源可信度低');
    suggestions.push('优先使用官方文档和权威来源');
  }

  if (relevance < 50) {
    issues.push('内容与目标行业相关性不足');
    suggestions.push('重新评估行业判断或调整搜索关键词');
  }

  return {
    overallScore,
    completeness,
    credibility,
    relevance,
    dimensionScores: {
      completeness,
      credibility,
      relevance,
    },
    issues,
    suggestions,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * 质量门禁决策
 */
export type QualityGateAction = 'proceed' | 'restart';

export interface QualityGateResult {
  action: QualityGateAction;
  shouldWarn: boolean;
  reason?: string;
}

/**
 * 质量阈值配置 - 可在运行时自定义
 */
export interface QualityThresholdsConfig {
  /** 通过阈值 - 超过此分数直接通过 */
  passThreshold: number;
  /** 警告阈值 - 超过此分数但低于通过阈值时警告 */
  warnThreshold: number;
  /** 重启阈值 - 低于此分数必须重启 */
  restartThreshold: number;
}

/**
 * 默认质量阈值
 */
export const DEFAULT_QUALITY_THRESHOLDS: QualityThresholdsConfig = {
  passThreshold: 70,
  warnThreshold: 50,
  restartThreshold: 30,
};

/**
 * 可配置的质量阈值
 */
let qualityThresholds: QualityThresholdsConfig = { ...DEFAULT_QUALITY_THRESHOLDS };

/**
 * 设置质量阈值
 */
export function setQualityThresholds(config: Partial<QualityThresholdsConfig>): void {
  qualityThresholds = { ...qualityThresholds, ...config };
}

/**
 * 获取当前质量阈值
 */
export function getQualityThresholds(): QualityThresholdsConfig {
  return { ...qualityThresholds };
}

/**
 * 重置质量阈值到默认值
 */
export function resetQualityThresholds(): void {
  qualityThresholds = { ...DEFAULT_QUALITY_THRESHOLDS };
}

/**
 * 根据质量评分决定是否继续或重启（使用可配置阈值）
 */
export function qualityGateDecision(
  overallScore: number,
  customThresholds?: QualityThresholdsConfig
): QualityGateResult {
  const thresholds = customThresholds || qualityThresholds;

  if (overallScore >= thresholds.passThreshold) {
    return { action: 'proceed', shouldWarn: false };
  }

  if (overallScore >= thresholds.warnThreshold) {
    return {
      action: 'proceed',
      shouldWarn: true,
      reason: '质量评分一般，建议关注数据质量',
    };
  }

  if (overallScore >= thresholds.restartThreshold) {
    return {
      action: 'restart',
      shouldWarn: false,
      reason: '质量评分较差，建议重新搜索',
    };
  }

  return {
    action: 'restart',
    shouldWarn: true,
    reason: '质量评分严重不足，必须重新搜索',
  };
}

/**
 * 计算报告质量评分
 */
export function calculateQualityScore(report: {
  hasMarketSize?: boolean;
  hasCompetitorData?: boolean;
  competitorCount?: number;
  hasUserPersona?: boolean;
  hasCausalAnalysis?: boolean;
  hasComparison?: boolean;
  hasTrend?: boolean;
  hasStrategy?: boolean;
  hasResourcePlan?: boolean;
  hasRiskAssessment?: boolean;
}): QualityScorecard {
  const breakdown: QualityScorecard['breakdown'] = [];

  // 数据完整性 (40分)
  const marketSizeScore = (report.hasMarketSize ? 15 : 0);
  const competitorScore = ((report.competitorCount ?? 0) >= 10 ? 15 : 5);
  const userPersonaScore = (report.hasUserPersona ? 10 : 0);
  const dataCompleteness = marketSizeScore + competitorScore + userPersonaScore;
  breakdown.push(
    { metric: '市场规模数据', score: marketSizeScore, maxScore: 15, status: marketSizeScore >= 10 ? 'pass' : 'fail' },
    { metric: '竞品数据(10+)', score: competitorScore, maxScore: 15, status: competitorScore >= 10 ? 'pass' : 'fail' },
    { metric: '用户画像', score: userPersonaScore, maxScore: 10, status: userPersonaScore >= 5 ? 'pass' : 'fail' }
  );

  // 分析深度 (30分)
  const causalScore = (report.hasCausalAnalysis ? 10 : 0);
  const comparisonScore = (report.hasComparison ? 10 : 0);
  const trendScore = (report.hasTrend ? 10 : 0);
  const analysisDepth = causalScore + comparisonScore + trendScore;
  breakdown.push(
    { metric: '因果分析', score: causalScore, maxScore: 10, status: causalScore >= 5 ? 'pass' : 'fail' },
    { metric: '对比分析', score: comparisonScore, maxScore: 10, status: comparisonScore >= 5 ? 'pass' : 'fail' },
    { metric: '趋势分析', score: trendScore, maxScore: 10, status: trendScore >= 5 ? 'pass' : 'fail' }
  );

  // 决策价值 (30分)
  const strategyScore = (report.hasStrategy ? 10 : 0);
  const resourceScore = (report.hasResourcePlan ? 10 : 0);
  const riskScore = (report.hasRiskAssessment ? 10 : 0);
  const decisionValue = strategyScore + resourceScore + riskScore;
  breakdown.push(
    { metric: '战略建议', score: strategyScore, maxScore: 10, status: strategyScore >= 5 ? 'pass' : 'fail' },
    { metric: '资源配置', score: resourceScore, maxScore: 10, status: resourceScore >= 5 ? 'pass' : 'fail' },
    { metric: '风险评估', score: riskScore, maxScore: 10, status: riskScore >= 5 ? 'pass' : 'fail' }
  );

  // 计算总分
  const totalScore = dataCompleteness + analysisDepth + decisionValue;

  return {
    totalScore,
    dimensions: {
      dataCompleteness,
      analysisDepth,
      decisionValue,
    },
    breakdown,
  };
}
