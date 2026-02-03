/**
 * Business Model Analyzer Tests
 *
 * Tests for BusinessModelAnalysis type structure
 */

import type { BusinessModelAnalysis } from '../research-agent/types';

describe('BusinessModelAnalysis Type Tests', () => {
  describe('Pricing Model', () => {
    it('should have pricing model structure', () => {
      const data: BusinessModelAnalysis = {
        pricingModel: {
          type: 'subscription',
          tiers: [
            { name: '基础版', price: '$29/月', features: ['核心功能'] },
            { name: '专业版', price: '$99/月', features: ['全部功能'] },
          ],
          regionalVariations: '不同地区有不同的定价策略',
        },
      };

      expect(data.pricingModel?.type).toBe('subscription');
      expect(data.pricingModel?.tiers).toHaveLength(2);
      expect(data.pricingModel?.tiers?.[0].name).toBe('基础版');
    });

    it('should support freemium pricing', () => {
      const data: BusinessModelAnalysis = {
        pricingModel: {
          type: 'freemium',
          tiers: [
            { name: '免费版', price: '$0', features: ['基础功能'] },
            { name: '付费版', price: '$19/月', features: ['高级功能'] },
          ],
        },
      };

      expect(data.pricingModel?.type).toBe('freemium');
    });

    it('should support one-time pricing', () => {
      const data: BusinessModelAnalysis = {
        pricingModel: {
          type: 'one-time',
          tiers: [
            { name: '标准版', price: '$299', features: ['永久授权'] },
          ],
        },
      };

      expect(data.pricingModel?.type).toBe('one-time');
    });
  });

  describe('Unit Economics', () => {
    it('should have unit economics structure', () => {
      const data: BusinessModelAnalysis = {
        unitEconomics: {
          breakEvenAnalysis: {
            timeToBreakEven: '18 个月',
            revenueNeeded: '$3M',
          },
          contributionMargin: 0.75,
          scalabilityAssessment: '高可扩展性 - 边际成本低',
        },
      };

      expect(data.unitEconomics?.contributionMargin).toBe(0.75);
      expect(data.unitEconomics?.breakEvenAnalysis?.timeToBreakEven).toBe('18 个月');
      expect(data.unitEconomics?.scalabilityAssessment).toContain('可扩展');
    });

    it('should have contribution margin between 0 and 1', () => {
      const data: BusinessModelAnalysis = {
        unitEconomics: {
          contributionMargin: 0.72,
          scalabilityAssessment: '高可扩展性',
        },
      };

      expect(data.unitEconomics?.contributionMargin).toBeGreaterThanOrEqual(0);
      expect(data.unitEconomics?.contributionMargin).toBeLessThanOrEqual(1);
    });
  });

  describe('Monetization Efficiency', () => {
    it('should have monetization efficiency structure', () => {
      const data: BusinessModelAnalysis = {
        monetizationEfficiency: {
          freeToPaidConversion: 0.045,
          arppu: '$35/月',
          rpDau: '$0.8/日活',
        },
      };

      expect(data.monetizationEfficiency?.freeToPaidConversion).toBe(0.045);
      expect(data.monetizationEfficiency?.arppu).toContain('$');
      expect(data.monetizationEfficiency?.rpDau).toContain('$');
    });

    it('should have conversion rate between 0 and 1', () => {
      const data: BusinessModelAnalysis = {
        monetizationEfficiency: {
          freeToPaidConversion: 0.035,
          arppu: '$25/月',
          rpDau: '$0.5/日活',
        },
      };

      expect(data.monetizationEfficiency?.freeToPaidConversion).toBeGreaterThanOrEqual(0);
      expect(data.monetizationEfficiency?.freeToPaidConversion).toBeLessThanOrEqual(1);
    });
  });

  describe('Commercial Maturity', () => {
    it('should have commercial maturity structure', () => {
      const data: BusinessModelAnalysis = {
        commercialMaturity: {
          rating: 'Maturing',
          assessment: '商业化模式已初步验证',
          keyMetrics: ['MRR', 'LTV', 'CAC', 'Churn Rate', 'NPS'],
        },
      };

      expect(data.commercialMaturity?.rating).toBe('Maturing');
      expect(data.commercialMaturity?.keyMetrics).toContain('MRR');
      expect(data.commercialMaturity?.keyMetrics).toContain('LTV');
    });

    it('should allow all maturity ratings', () => {
      const ratings: BusinessModelAnalysis['commercialMaturity']['rating'][] = [
        'Early Stage',
        'Maturing',
        'Mature',
      ];

      ratings.forEach(rating => {
        const data: BusinessModelAnalysis = {
          commercialMaturity: {
            rating,
            assessment: 'Test assessment',
            keyMetrics: ['MRR'],
          },
        };
        expect(data.commercialMaturity?.rating).toBe(rating);
      });
    });
  });

  describe('Optional Fields', () => {
    it('should allow minimal data', () => {
      const data: BusinessModelAnalysis = {};

      expect(data.pricingModel).toBeUndefined();
      expect(data.unitEconomics).toBeUndefined();
      expect(data.monetizationEfficiency).toBeUndefined();
      expect(data.commercialMaturity).toBeUndefined();
    });

    it('should allow partial data', () => {
      const data: BusinessModelAnalysis = {
        pricingModel: {
          type: 'subscription',
          tiers: [],
        },
      };

      expect(data.pricingModel).toBeDefined();
      expect(data.unitEconomics).toBeUndefined();
    });
  });

  describe('Pricing Tiers Structure', () => {
    it('should have correct tier structure', () => {
      const data: BusinessModelAnalysis = {
        pricingModel: {
          type: 'subscription',
          tiers: [
            { name: '基础版', price: '$0-29/月', features: ['核心功能', '基础支持', '有限存储'] },
            { name: '专业版', price: '$29-99/月', features: ['全部功能', '优先支持', '更大存储', 'API访问'] },
            { name: '企业版', price: '$99+/月', features: ['定制功能', '专属支持', '无限存储', 'SLA保障'] },
          ],
        },
      };

      expect(data.pricingModel?.tiers).toHaveLength(3);
      expect(data.pricingModel?.tiers?.[0].price).toContain('$');
      expect(data.pricingModel?.tiers?.[2].features).toHaveLength(4);
    });
  });

  describe('Key Metrics', () => {
    it('should include standard SaaS metrics', () => {
      const data: BusinessModelAnalysis = {
        commercialMaturity: {
          rating: 'Mature',
          assessment: '商业化模式成熟',
          keyMetrics: [
            '月经常性收入 (MRR)',
            '客户生命周期价值 (LTV)',
            '客户获取成本 (CAC)',
            '月流失率',
            '净推荐值 (NPS)',
          ],
        },
      };

      expect(data.commercialMaturity?.keyMetrics).toContain('月经常性收入 (MRR)');
      expect(data.commercialMaturity?.keyMetrics).toContain('客户生命周期价值 (LTV)');
      expect(data.commercialMaturity?.keyMetrics).toHaveLength(5);
    });
  });
});
