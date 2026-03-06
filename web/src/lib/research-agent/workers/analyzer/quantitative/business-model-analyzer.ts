/**
 * 商业模式分析模块
 *
 * 提供定价模式、Unit Economics、盈利模式分析功能
 */

import type { BusinessModelAnalysis, CompetitorAnalysis } from '../../../types';

/**
 * 商业模式分析器
 */
export class BusinessModelAnalyzer {
  /**
   * 分析商业模式
   */
  analyzeBusinessModel(competitors: CompetitorAnalysis[]): BusinessModelAnalysis {
    return {
      pricingModel: this.analyzePricingModel(competitors),
      unitEconomics: this.analyzeUnitEconomics(competitors),
      monetizationEfficiency: this.analyzeMonetizationEfficiency(competitors),
      commercialMaturity: this.assessCommercialMaturity(competitors),
    };
  }

  /**
   * 分析定价模式
   */
  private analyzePricingModel(competitors: CompetitorAnalysis[]): BusinessModelAnalysis['pricingModel'] {
    // 基于竞品分析推断定价模式
    const industry = competitors[0]?.industry || 'Technology';

    // 模拟定价模式分析
    const type = this.inferPricingType(industry);

    return {
      type,
      tiers: [
        {
          name: '基础版',
          price: '$0-29/月',
          features: ['核心功能', '基础支持', '有限存储'],
        },
        {
          name: '专业版',
          price: '$29-99/月',
          features: ['全部功能', '优先支持', '更大存储', 'API访问'],
        },
        {
          name: '企业版',
          price: '$99+/月',
          features: ['定制功能', '专属支持', '无限存储', 'SLA保障'],
        },
      ],
      regionalVariations: '不同地区可能有不同的定价策略和支付方式',
    };
  }

  /**
   * 推断定价类型
   */
  private inferPricingType(industry: string): string {
    const pricingPatterns: Record<string, string> = {
      'SaaS': 'subscription',
      '移动互联网': 'freemium',
      '电子商务': 'one-time',
      '金融科技': 'subscription',
      '人工智能': 'subscription',
      '企业服务': 'subscription',
    };

    return pricingPatterns[industry] || 'subscription';
  }

  /**
   * 分析 Unit Economics
   */
  private analyzeUnitEconomics(competitors: CompetitorAnalysis[]): BusinessModelAnalysis['unitEconomics'] {
    // 模拟 Unit Economics 分析
    return {
      breakEvenAnalysis: {
        timeToBreakEven: '18-24 个月',
        revenueNeeded: '$2-5M',
      },
      contributionMargin: 0.7, // 70%
      scalabilityAssessment: '高可扩展性 - 边际成本低，适合规模化增长',
    };
  }

  /**
   * 分析变现效率
   */
  private analyzeMonetizationEfficiency(competitors: CompetitorAnalysis[]): BusinessModelAnalysis['monetizationEfficiency'] {
    // 无法获取真实数据，返回 undefined
    return undefined;
  }

  /**
   * 评估商业化成熟度
   */
  private assessCommercialMaturity(competitors: CompetitorAnalysis[]): BusinessModelAnalysis['commercialMaturity'] {
    // 无法获取真实数据，返回 undefined
    return undefined;
  }

  /**
   * 生成成熟度评估描述
   */
  private generateMaturityAssessment(rating: 'Early Stage' | 'Maturing' | 'Mature'): string {
    switch (rating) {
      case 'Early Stage':
        return '商业化模式正在探索中，主要关注用户增长和功能完善，变现策略待验证';
      case 'Maturing':
        return '商业化模式已初步验证，开始关注单位经济模型优化和客户留存';
      case 'Mature':
        return '商业化模式成熟稳定，具备健康的单位经济模型和可预测的增长引擎';
    }
  }

  /**
   * 生成 Unit Economics 对比表
   */
  generateUnitEconomicsComparison(analysis: BusinessModelAnalysis): string {
    let table = '### Unit Economics 对比分析\n\n';

    table += '| 指标 | 数值 | 行业基准 | 评估 |\n';
    table += '|------|------|---------|------|\n';

    if (analysis.unitEconomics) {
      const margin = analysis.unitEconomics.contributionMargin || 0;
      const marginStatus = margin >= 0.7 ? '🟢 优秀' : margin >= 0.5 ? '🟡 良好' : '🔴 需改进';
      table += `| 毛利率 | ${(margin * 100).toFixed(0)}% | 70%+ | ${marginStatus} |\n`;

      table += `| 盈亏平衡时间 | ${analysis.unitEconomics.breakEvenAnalysis?.timeToBreakEven || 'N/A'} | 12-18个月 | 🟡 适中 |\n`;
    }

    if (analysis.monetizationEfficiency) {
      const conversion = (analysis.monetizationEfficiency.freeToPaidConversion || 0) * 100;
      const convStatus = conversion >= 5 ? '🟢 优秀' : conversion >= 2 ? '🟡 良好' : '🔴 需改进';
      table += `| 免费转付费率 | ${conversion.toFixed(1)}% | 2-5% | ${convStatus} |\n`;

      table += `| ARPPU | ${analysis.monetizationEfficiency.arppu || 'N/A'} | $25-50 | 🟡 适中 |\n`;
    }

    table += '\n**评估说明：**\n';
    table += '- 🟢 优秀：指标优于行业基准，具有竞争优势\n';
    table += '- 🟡 良好：指标符合行业平均水平\n';
    table += '- 🔴 需改进：指标低于行业基准，需要优化\n';

    return table;
  }
}

/**
 * 创建商业模式分析器
 */
export function createBusinessModelAnalyzer(): BusinessModelAnalyzer {
  return new BusinessModelAnalyzer();
}
