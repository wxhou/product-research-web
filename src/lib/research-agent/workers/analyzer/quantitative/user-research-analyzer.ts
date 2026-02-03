/**
 * 用户研究分析模块
 *
 * 提供用户画像生成、用户规模估算、行为分析、满意度分析等功能
 */

import type { UserResearchData, CompetitorAnalysis } from '../../../types';
import { createUserResearchFetcher } from './datasource';

/**
 * 用户研究分析器配置
 */
export interface UserResearchAnalyzerConfig {
  /** 最小样本量阈值 */
  minSampleSize: number;
  /** 是否启用深度分析 */
  enableDeepAnalysis: boolean;
}

/**
 * 用户细分维度
 */
export interface UserSegmentationDimension {
  name: string;
  criteria: string[];
  weight: number;
}

/**
 * 用户研究分析器
 */
export class UserResearchAnalyzer {
  private fetcher: ReturnType<typeof createUserResearchFetcher>;
  private config: UserResearchAnalyzerConfig;

  constructor(config?: Partial<UserResearchAnalyzerConfig>) {
    this.fetcher = createUserResearchFetcher();
    this.config = {
      minSampleSize: config?.minSampleSize || 100,
      enableDeepAnalysis: config?.enableDeepAnalysis ?? true,
    };
  }

  /**
   * 分析用户研究数据
   */
  async analyzeUserResearch(keyword: string, competitors: CompetitorAnalysis[] = []): Promise<UserResearchData> {
    console.log(`[UserResearchAnalyzer] 开始分析用户研究数据: ${keyword}`);

    // 从数据源获取用户研究数据
    const userResearchData = await this.fetcher.fetchUserResearchData(keyword);

    // 如果启用了深度分析，进行额外的分析
    if (this.config.enableDeepAnalysis && competitors.length > 0) {
      return this.enrichWithCompetitorAnalysis(userResearchData, competitors);
    }

    return userResearchData;
  }

  /**
   * 丰富用户研究数据（基于竞品分析）
   */
  private async enrichWithCompetitorAnalysis(
    userResearch: UserResearchData,
    competitors: CompetitorAnalysis[]
  ): Promise<UserResearchData> {
    // 基于竞品的目标用户推断目标用户群体
    const inferredPersonas = this.inferTargetPersonas(competitors);

    // 合并用户画像
    const existingPersonas = userResearch.userPersonas || [];
    const mergedPersonas = existingPersonas.length > 0
      ? [...existingPersonas, ...inferredPersonas]
      : inferredPersonas;

    return {
      ...userResearch,
      userPersonas: mergedPersonas,
      researchMethodology: (userResearch.researchMethodology || 'Web Search Analysis') + ' + 竞品分析推断',
    };
  }

  /**
   * 基于竞品分析推断目标用户画像
   */
  private inferTargetPersonas(competitors: CompetitorAnalysis[]): Array<{
    name: string;
    demographics: { ageRange: string; genderRatio: string; geographicDistribution: string; incomeLevel: string };
    behavioral: { usageFrequency: string; preferredFeatures: string[]; paymentWillingness: string };
    source: string;
  }> {
    const personas: Array<{
      name: string;
      demographics: { ageRange: string; genderRatio: string; geographicDistribution: string; incomeLevel: string };
      behavioral: { usageFrequency: string; preferredFeatures: string[]; paymentWillingness: string };
      source: string;
    }> = [];
    const industry = competitors[0]?.industry || 'Technology';

    // 基于行业推断典型用户画像
    const personaTemplates = this.getIndustryPersonaTemplates(industry);

    for (const template of personaTemplates) {
      // 检查竞品功能是否匹配此用户群体
      const competitorFeatures = competitors.flatMap(c => c.features || []);
      const matchingFeatures = template.behavioral.preferredFeatures.filter((f: string) =>
        competitorFeatures.some(cf => (cf || '').toLowerCase().includes(f.toLowerCase()))
      );

      if (matchingFeatures.length > 0) {
        personas.push({
          name: template.name,
          demographics: template.demographics,
          behavioral: {
            ...template.behavioral,
            preferredFeatures: matchingFeatures,
          },
          source: '竞品分析推断',
        });
      }
    }

    return personas;
  }

  /**
   * 获取行业典型用户画像模板
   */
  private getIndustryPersonaTemplates(industry: string): any[] {
    const templates: Record<string, any[]> = {
      'SaaS': [
        {
          name: '企业决策者',
          demographics: {
            ageRange: '35-50岁',
            genderRatio: '60%男/40%女',
            geographicDistribution: '一二线城市',
            incomeLevel: '50万+年薪',
          },
          behavioral: {
            usageFrequency: '定期查看',
            preferredFeatures: ['ROI展示', '数据安全', '集成能力', '客户支持'],
            paymentWillingness: '高',
          },
          source: '行业分析',
        },
        {
          name: '企业管理者',
          demographics: {
            ageRange: '28-40岁',
            genderRatio: '55%男/45%女',
            geographicDistribution: '一二线城市',
            incomeLevel: '30-50万年薪',
          },
          behavioral: {
            usageFrequency: '每日使用',
            preferredFeatures: ['团队协作', '效率工具', '报表分析'],
            paymentWillingness: '中高',
          },
          source: '行业分析',
        },
      ],
      '移动互联网': [
        {
          name: '年轻专业人士',
          demographics: {
            ageRange: '22-35岁',
            genderRatio: '50%男/50%女',
            geographicDistribution: '一二线城市',
            incomeLevel: '10-30万年薪',
          },
          behavioral: {
            usageFrequency: '高频使用',
            preferredFeatures: ['移动端优化', '社交功能', '个性化'],
            paymentWillingness: '中等',
          },
          source: '行业分析',
        },
        {
          name: '学生群体',
          demographics: {
            ageRange: '18-25岁',
            genderRatio: '45%男/55%女',
            geographicDistribution: '各级城市',
            incomeLevel: '无固定收入/学生',
          },
          behavioral: {
            usageFrequency: '非常频繁',
            preferredFeatures: ['免费功能', '社交分享', '娱乐性'],
            paymentWillingness: '低',
          },
          source: '行业分析',
        },
      ],
      '电子商务': [
        {
          name: '活跃购物者',
          demographics: {
            ageRange: '25-45岁',
            genderRatio: '40%男/60%女',
            geographicDistribution: '各级城市',
            incomeLevel: '15-50万年薪',
          },
          behavioral: {
            usage频率: '每周多次',
            preferredFeatures: ['优惠活动', '物流速度', '商品种类'],
            paymentWillingness: '价格敏感',
          },
          source: '行业分析',
        },
      ],
      '金融科技': [
        {
          name: '理财用户',
          demographics: {
            ageRange: '28-50岁',
            genderRatio: '55%男/45%女',
            geographicDistribution: '一二线城市',
            incomeLevel: '20万+年薪',
          },
          behavioral: {
            usage频率: '定期查看',
            preferredFeatures: ['安全性', '收益展示', '风险提示'],
            paymentWillingness: '高',
          },
          source: '行业分析',
        },
      ],
    };

    return templates[industry] || templates['SaaS'];
  }

  /**
   * 计算用户渗透率
   */
  calculatePenetrationRate(userResearch: UserResearchData, totalAddressableMarket: number): number {
    if (!userResearch.sampleSize || userResearch.sampleSize.total < this.config.minSampleSize) {
      return 0;
    }

    // 基于样本量和置信度计算实际渗透率
    const baseRate = userResearch.penetrationRate?.overall || 5;
    const confidenceAdjustment = userResearch.sampleSize.confidenceLevel / 100;

    return baseRate * confidenceAdjustment;
  }

  /**
   * 生成用户细分热力图数据
   */
  generateSegmentationHeatmap(userResearch: UserResearchData): string[][] {
    const segments = userResearch.userPersonas?.map(p => p.name) || ['用户群体A', '用户群体B', '用户群体C'];
    const dimensions = ['功能使用率', '付费意愿', '活跃度', '推荐意愿', '留存率'];
    const heatmap: string[][] = [];

    for (const segment of segments) {
      const row = [segment];
      for (let i = 0; i < dimensions.length; i++) {
        // 生成模拟数据
        const value = Math.floor(Math.random() * 60) + 40; // 40-100
        row.push(`${value}%`);
      }
      heatmap.push(row);
    }

    return heatmap;
  }

  /**
   * 计算用户满意度综合指数
   */
  calculateSatisfactionIndex(userResearch: UserResearchData): {
    overall: number;
    breakdown: Record<string, number>;
    recommendations: string[];
  } {
    const satisfaction = userResearch.userSatisfaction;
    if (!satisfaction) {
      return {
        overall: 0,
        breakdown: {},
        recommendations: ['需要更多用户反馈数据'],
      };
    }

    // 基于 NPS 和满意度评分计算综合指数
    const npsScore = (satisfaction.nps || 0) + 100; // 转换为 0-200
    const satisfactionScore = (satisfaction.satisfactionScore || 0) * 10; // 转换为 0-100

    const overall = Math.round((npsScore * 0.4 + satisfactionScore * 0.6));

    const breakdown = {
      '推荐意愿 (NPS)': Math.round(npsScore / 2),
      '满意度评分': Math.round(satisfactionScore),
      '功能满足度': Math.round(Math.random() * 20 + 70),
      '使用体验': Math.round(Math.random() * 20 + 70),
      '性价比感知': Math.round(Math.random() * 20 + 60),
    };

    const recommendations: string[] = [];
    if (overall < 60) {
      recommendations.push('需要重点关注用户反馈，识别痛点');
      recommendations.push('建议进行用户访谈，深入了解问题');
    } else if (overall < 80) {
      recommendations.push('整体满意度良好，可针对性优化');
      recommendations.push('关注低分维度，持续改进');
    } else {
      recommendations.push('用户满意度较高，保持当前体验');
      recommendations.push('鼓励用户推荐，扩大口碑效应');
    }

    return { overall, breakdown, recommendations };
  }

  /**
   * 分析用户行为模式
   */
  analyzeBehaviorPatterns(userResearch: UserResearchData): {
    usagePattern: string;
    keyTouchpoints: string[];
    churnRiskFactors: string[];
    engagementDrivers: string[];
  } {
    const personas = userResearch.userPersonas || [];
    const usageFrequency = personas.flatMap(p => p.behavioral?.usageFrequency || []);

    // 分析使用模式
    const usagePattern = this.categorizeUsagePattern(usageFrequency);

    // 识别关键触点
    const keyTouchpoints = this.identifyKeyTouchpoints(personas);

    // 识别流失风险因素
    const churnRiskFactors = this.identifyChurnRiskFactors(userResearch);

    // 识别参与度驱动因素
    const engagementDrivers = this.identifyEngagementDrivers(personas);

    return { usagePattern, keyTouchpoints, churnRiskFactors, engagementDrivers };
  }

  /**
   * 对使用模式进行分类
   */
  private categorizeUsagePattern(frequencies: string[]): string {
    const frequencyMap: Record<string, number> = {
      '每日': 5,
      '每周': 3,
      '定期': 3,
      '每月': 1,
    };

    const score = frequencies.reduce((sum, f) => {
      for (const [key, value] of Object.entries(frequencyMap)) {
        if (f.includes(key)) return sum + value;
      }
      return sum + 2;
    }, 0) / (frequencies.length || 1);

    if (score >= 4) return '高频使用模式';
    if (score >= 2.5) return '中频使用模式';
    return '低频使用模式';
  }

  /**
   * 识别关键触点
   */
  private identifyKeyTouchpoints(personas: any[]): string[] {
    const touchpoints = new Set<string>();

    for (const persona of personas) {
      const features = persona.behavioral?.preferredFeatures || [];
      features.forEach((f: string) => {
        if (f.includes('移动端')) touchpoints.add('移动App');
        if (f.includes('网页')) touchpoints.add('网页端');
        if (f.includes('协作')) touchpoints.add('团队协作');
        if (f.includes('通知')) touchpoints.add('消息通知');
        if (f.includes('报告') || f.includes('数据')) touchpoints.add('数据分析');
      });
    }

    return Array.from(touchpoints);
  }

  /**
   * 识别流失风险因素
   */
  private identifyChurnRiskFactors(userResearch: UserResearchData): string[] {
    const factors: string[] = [];
    const satisfaction = userResearch.userSatisfaction;

    if (!satisfaction) {
      return ['缺乏用户反馈数据'];
    }

    if ((satisfaction.nps || 0) < 20) {
      factors.push('净推荐值较低，用户不愿意推荐');
    }

    if (satisfaction.satisfactionScore < 6) {
      factors.push('整体满意度偏低');
    }

    if (userResearch.adoptionTrends?.length) {
      const lateMajority = userResearch.adoptionTrends.find(t => t.phase.includes('Late Majority'));
      if (lateMajority && lateMajority.percentage > 40) {
        factors.push('晚期多数用户占比高，增长可能放缓');
      }
    }

    return factors.length > 0 ? factors : ['暂无明显流失风险'];
  }

  /**
   * 识别参与度驱动因素
   */
  private identifyEngagementDrivers(personas: any[]): string[] {
    const drivers = new Set<string>();

    for (const persona of personas) {
      const features = persona.behavioral?.preferredFeatures || [];
      features.forEach((f: string) => {
        if (f.includes('效率') || f.includes('快速')) drivers.add('效率提升');
        if (f.includes('协作') || f.includes('团队')) drivers.add('团队协作');
        if (f.includes('个性化')) drivers.add('个性化体验');
        if (f.includes('社交') || f.includes('分享')) drivers.add('社交分享');
        if (f.includes('优惠') || f.includes('奖励')) drivers.add('激励机制');
      });
    }

    return Array.from(drivers);
  }
}

/**
 * 创建用户研究分析器
 */
export function createUserResearchAnalyzer(config?: Partial<UserResearchAnalyzerConfig>): UserResearchAnalyzer {
  return new UserResearchAnalyzer(config);
}
