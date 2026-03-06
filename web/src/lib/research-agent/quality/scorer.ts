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
