/**
 * 质量评估模块
 *
 * 提供数据完整度、来源可信度、可视化覆盖率等质量评估功能
 */

import type { AnalysisResult } from '../../types';

/**
 * 质量评分权重配置
 */
export interface QualityWeights {
  marketData: number;        // 0.30
  competitorData: number;     // 0.25
  businessModel: number;     // 0.20
  userResearch: number;      // 0.15
  techAnalysis: number;     // 0.10
}

/**
 * 质量评估结果
 */
export interface QualityAssessmentResult {
  overallScore: number;           // 0-100
  completenessScore: number;     // 0-100
  credibilityScore: number;      // 0-100
  visualizationScore: number;    // 0-100
  breakdown: {
    marketData: number;
    competitorData: number;
    businessModel: number;
    userResearch: number;
    techAnalysis: number;
  };
  dataGaps: string[];
  recommendations: string[];
}

/**
 * 默认质量权重
 */
const DEFAULT_WEIGHTS: QualityWeights = {
  marketData: 0.30,
  competitorData: 0.25,
  businessModel: 0.20,
  userResearch: 0.15,
  techAnalysis: 0.10,
};

/**
 * 行业基准数据
 */
const INDUSTRY_BENCHMARKS = {
  saas: {
    ltvCacRatio: { healthy: 3, excellent: 5 },
    cacPaybackMonths: { good: 12, acceptable: 18 },
    grossMargin: { target: 75, minAcceptable: 65 },
    freeToPaidConversion: { good: 5, average: 2 },
  },
  b2b: {
    ltvCacRatio: { healthy: 3, excellent: 4 },
    cacPaybackMonths: { good: 18, acceptable: 24 },
    grossMargin: { target: 60, minAcceptable: 50 },
    freeToPaidConversion: { good: 10, average: 5 },
  },
  enterprise: {
    ltvCacRatio: { healthy: 4, excellent: 6 },
    cacPaybackMonths: { good: 24, acceptable: 30 },
    grossMargin: { target: 70, minAcceptable: 60 },
    freeToPaidConversion: { good: 15, average: 8 },
  },
};

/**
 * 质量评估器
 */
export class QualityAssessor {
  private weights: QualityWeights;

  constructor(weights?: Partial<QualityWeights>) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * 评估分析结果的质量
   */
  assess(analysis: AnalysisResult): QualityAssessmentResult {
    // 计算各维度得分
    const marketScore = this.assessMarketData(analysis);
    const competitorScore = this.assessCompetitorData(analysis);
    const businessScore = this.assessBusinessModel(analysis);
    const userScore = this.assessUserResearch(analysis);
    const techScore = this.assessTechAnalysis(analysis);

    // 计算加权总分
    const completenessScore = Math.round(
      marketScore * this.weights.marketData +
      competitorScore * this.weights.competitorData +
      businessScore * this.weights.businessModel +
      userScore * this.weights.userResearch +
      techScore * this.weights.techAnalysis
    );

    // 评估数据缺口
    const dataGaps = this.identifyDataGaps(analysis);

    // 生成改进建议
    const recommendations = this.generateRecommendations(analysis, {
      marketScore,
      competitorScore,
      businessScore,
      userScore,
      techScore,
    });

    // 计算来源可信度
    const credibilityScore = this.assessSourceCredibility(analysis);

    // 计算可视化覆盖率
    const visualizationScore = this.assessVisualizationCoverage(analysis);

    return {
      overallScore: Math.round((completenessScore + credibilityScore + visualizationScore) / 3),
      completenessScore,
      credibilityScore,
      visualizationScore,
      breakdown: {
        marketData: marketScore,
        competitorData: competitorScore,
        businessModel: businessScore,
        userResearch: userScore,
        techAnalysis: techScore,
      },
      dataGaps,
      recommendations,
    };
  }

  /**
   * 评估市场数据质量
   */
  private assessMarketData(analysis: AnalysisResult): number {
    const market = analysis.marketData;
    let score = 0;
    const maxScore = 100;

    // 市场规模 (30分)
    if (market.marketSize && market.marketSize !== '待分析') score += 15;
    if (market.marketSizeRange?.base) score += 15;

    // 增长率 (20分)
    if (market.growthRate && market.growthRate !== '待分析') score += 10;
    if (market.growthRateHistorical && market.growthRateHistorical.length > 0) score += 10;

    // 主要玩家 (15分)
    if (market.keyPlayers && market.keyPlayers.length > 0) score += 15;

    // 市场驱动因素 (15分)
    if (market.marketDrivers && market.marketDrivers.length > 0) score += 15;

    // 市场制约因素 (10分)
    if (market.marketConstraints && market.marketConstraints.length > 0) score += 10;

    // 市场预测 (10分)
    if (market.forecastYears && market.forecastYears.length > 0) score += 10;

    // 置信度等级
    if (market.confidenceLevel === 'High') score += 5;

    return Math.min(score, maxScore);
  }

  /**
   * 评估竞品数据质量
   */
  private assessCompetitorData(analysis: AnalysisResult): number {
    const competitors = analysis.competitors;
    const quantitative = analysis.competitorQuantitative;
    let score = 0;
    const maxScore = 100;

    // 竞品数量 (20分)
    if (competitors && competitors.length >= 5) score += 20;
    else if (competitors && competitors.length > 0) score += competitors.length * 4;

    // 市场数据 (25分)
    if (quantitative?.marketShare && quantitative.marketShare.length > 0) score += 25;

    // LTV/CAC 数据 (25分)
    if (quantitative?.ltvCacRatio && quantitative.ltvCacRatio.length > 0) score += 25;

    // 收入指标 (15分)
    if (quantitative?.revenueMetrics && quantitative.revenueMetrics.length > 0) score += 15;

    // 定价信息 (15分)
    if (quantitative?.arpuMetrics && quantitative.arpuMetrics.length > 0) score += 15;

    return Math.min(score, maxScore);
  }

  /**
   * 评估商业模式数据质量
   */
  private assessBusinessModel(analysis: AnalysisResult): number {
    const business = analysis.businessModel;
    let score = 0;
    const maxScore = 100;

    if (!business) return 0;

    // 定价模式 (25分)
    if (business.pricingModel?.type) score += 15;
    if (business.pricingModel?.tiers && business.pricingModel.tiers.length > 0) score += 10;

    // 单位经济效益 (35分)
    if (business.unitEconomics?.contributionMargin) score += 15;
    if (business.unitEconomics?.breakEvenAnalysis) score += 10;
    if (business.unitEconomics?.scalabilityAssessment) score += 10;

    // 货币化效率 (20分)
    if (business.monetizationEfficiency?.freeToPaidConversion) score += 10;
    if (business.monetizationEfficiency?.arppu) score += 10;

    // 商业化成熟度 (20分)
    if (business.commercialMaturity?.rating) score += 10;
    if (business.commercialMaturity?.keyMetrics && business.commercialMaturity.keyMetrics.length > 0) score += 10;

    return Math.min(score, maxScore);
  }

  /**
   * 评估用户研究数据质量
   */
  private assessUserResearch(analysis: AnalysisResult): number {
    const user = analysis.userResearch;
    let score = 0;
    const maxScore = 100;

    if (!user) return 0;

    // 用户画像 (25分)
    if (user.userPersonas && user.userPersonas.length > 0) score += 25;

    // 样本信息 (15分)
    if (user.sampleSize) score += 15;

    // 调研方法 (10分)
    if (user.researchMethodology) score += 10;

    // 渗透率 (20分)
    if (user.penetrationRate) score += 20;

    // 用户满意度 (15分)
    if (user.userSatisfaction) score += 15;

    // 采纳趋势 (15分)
    if (user.adoptionTrends && user.adoptionTrends.length > 0) score += 15;

    return Math.min(score, maxScore);
  }

  /**
   * 评估技术分析数据质量
   */
  private assessTechAnalysis(analysis: AnalysisResult): number {
    const tech = analysis.techAnalysis;
    let score = 0;
    const maxScore = 100;

    if (!tech) return 0;

    // 架构 (25分)
    if (tech.architecture && tech.architecture.length > 0) score += 25;

    // 技术栈 (25分)
    if (tech.techStack && tech.techStack.length > 0) score += 25;

    // 新兴技术 (25分)
    if (tech.emergingTech && tech.emergingTech.length > 0) score += 25;

    // 创新点 (25分)
    if (tech.innovationPoints && tech.innovationPoints.length > 0) score += 25;

    return Math.min(score, maxScore);
  }

  /**
   * 识别数据缺口
   */
  private identifyDataGaps(analysis: AnalysisResult): string[] {
    const gaps: string[] = [];

    // 市场数据缺口
    if (!analysis.marketData?.marketSizeRange?.base) {
      gaps.push('市场规模估算缺失');
    }
    if (!analysis.marketData?.growthRate) {
      gaps.push('增长率数据缺失');
    }
    if (!analysis.marketData?.keyPlayers?.length) {
      gaps.push('主要市场玩家数据缺失');
    }

    // 竞品数据缺口
    if (!analysis.competitorQuantitative?.marketShare?.length) {
      gaps.push('市场份额数据缺失');
    }
    if (!analysis.competitorQuantitative?.ltvCacRatio?.length) {
      gaps.push('LTV/CAC 比率数据缺失');
    }

    // 商业模式缺口
    if (!analysis.businessModel?.pricingModel?.type) {
      gaps.push('定价模式数据缺失');
    }
    if (!analysis.businessModel?.unitEconomics?.contributionMargin) {
      gaps.push('毛利率数据缺失');
    }

    // 用户研究缺口
    if (!analysis.userResearch?.userPersonas?.length) {
      gaps.push('用户画像数据缺失');
    }
    if (!analysis.userResearch?.penetrationRate) {
      gaps.push('渗透率数据缺失');
    }

    return gaps;
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(
    analysis: AnalysisResult,
    scores: { marketScore: number; competitorScore: number; businessScore: number; userScore: number; techScore: number }
  ): string[] {
    const recommendations: string[] = [];

    // 基于低分维度给出建议
    if (scores.marketScore < 50) {
      recommendations.push('建议收集更多市场调研报告以获取市场规模和增长率数据');
    }
    if (scores.competitorScore < 50) {
      recommendations.push('建议深入分析竞争对手的公开财务数据');
    }
    if (scores.businessScore < 50) {
      recommendations.push('建议研究目标行业的商业模式和定价策略');
    }
    if (scores.userScore < 50) {
      recommendations.push('建议通过用户访谈或问卷调查收集用户数据');
    }
    if (scores.techScore < 50) {
      recommendations.push('建议深入分析产品的技术架构和实现细节');
    }

    return recommendations;
  }

  /**
   * 评估来源可信度
   */
  private assessSourceCredibility(analysis: AnalysisResult): number {
    let score = 0;
    const maxScore = 100;

    // 市场数据来源
    if (analysis.marketData?.dataSource?.primary) {
      if (analysis.marketData.dataSource.primary.includes('艾瑞') ||
          analysis.marketData.dataSource.primary.includes('QuestMobile') ||
          analysis.marketData.dataSource.primary.includes('Gartner')) {
        score += 40; // 权威来源
      } else if (analysis.marketData.dataSource.primary.includes('行业报告')) {
        score += 30;
      } else {
        score += 20;
      }
    }

    // 竞品数据来源
    if (analysis.competitorQuantitative?.marketShare?.length) {
      score += 30;
    }

    // 数据更新时间
    if (analysis.marketData?.dataSource?.lastUpdated) {
      const daysSinceUpdate = (Date.now() - new Date(analysis.marketData.dataSource.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 30) {
        score += 30;
      } else if (daysSinceUpdate < 90) {
        score += 20;
      } else {
        score += 10;
      }
    }

    return Math.min(score, maxScore);
  }

  /**
   * 评估可视化覆盖率
   */
  private assessVisualizationCoverage(analysis: AnalysisResult): number {
    let score = 0;
    const maxScore = 100;

    // 功能图表
    if (analysis.features?.length >= 5) score += 20;

    // 竞品对比图表
    if (analysis.competitors?.length >= 3) score += 20;

    // SWOT 思维导图
    if (analysis.swot?.strengths?.length) score += 20;

    // 市场趋势图表
    if (analysis.marketData?.growthRateHistorical?.length) score += 20;

    // 用户分析图表
    if (analysis.userResearch?.adoptionTrends?.length) score += 20;

    return Math.min(score, maxScore);
  }

  /**
   * 获取行业基准
   */
  getIndustryBenchmark(industry: 'saas' | 'b2b' | 'enterprise' = 'saas') {
    return INDUSTRY_BENCHMARKS[industry];
  }
}

/**
 * 创建质量评估器
 */
export function createQualityAssessor(weights?: Partial<QualityWeights>): QualityAssessor {
  return new QualityAssessor(weights);
}
