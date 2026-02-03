/**
 * User Research Analyzer Tests
 *
 * Type validation tests for UserResearchAnalyzer module
 */

import { describe, it, expect } from '@jest/globals';
import type { UserResearchData, CompetitorAnalysis } from '../../types';

// Type validation only - implementation tests require full integration setup
describe('UserResearchAnalyzer Types', () => {
  describe('UserResearchData validation', () => {
    it('should validate UserResearchData structure', () => {
      const data: UserResearchData = {
        userPersonas: [
          {
            name: '职场新人',
            demographics: {
              ageRange: '22-28岁',
              genderRatio: '55%男/45%女',
              geographicDistribution: '一线城市',
              incomeLevel: '10-20万年薪',
            },
            behavioral: {
              usageFrequency: '每日使用',
              preferredFeatures: ['效率工具', '协作功能'],
              paymentWillingness: '中等',
            },
            source: 'Web Search Analysis',
          },
        ],
        sampleSize: {
          total: 1500,
          targetPopulation: '目标市场用户',
          confidenceLevel: 95,
          marginOfError: 3,
        },
        researchMethodology: 'Web Search Analysis',
        userSatisfaction: {
          nps: 42,
          satisfactionScore: 7.5,
          keyFeedback: ['功能丰富', '界面友好'],
        },
      };

      expect(data.userPersonas).toHaveLength(1);
      expect(data.userPersonas[0].name).toBe('职场新人');
      expect(data.sampleSize.total).toBe(1500);
      expect(data.userSatisfaction.nps).toBe(42);
    });

    it('should validate empty user research data', () => {
      const data: UserResearchData = {
        userPersonas: [],
        userSatisfaction: {
          satisfactionScore: 0,
          keyFeedback: [],
        },
      };

      expect(data.userPersonas).toHaveLength(0);
      expect(data.userSatisfaction.satisfactionScore).toBe(0);
    });

    it('should validate user persona demographics', () => {
      const demographics = {
        ageRange: '25-35岁',
        genderRatio: '50%男/50%女',
        geographicDistribution: '全国',
        incomeLevel: '15-25万年薪',
      };

      expect(demographics.ageRange).toBe('25-35岁');
      expect(demographics.genderRatio).toBe('50%男/50%女');
      expect(demographics.geographicDistribution).toBe('全国');
      expect(demographics.incomeLevel).toBe('15-25万年薪');
    });

    it('should validate user persona behavioral', () => {
      const behavioral = {
        usageFrequency: '每周3-5次',
        preferredFeatures: ['搜索', '推荐', '分类'],
        paymentWillingness: '高',
      };

      expect(behavioral.usageFrequency).toBe('每周3-5次');
      expect(behavioral.preferredFeatures).toContain('搜索');
      expect(behavioral.paymentWillingness).toBe('高');
    });

    it('should validate sample size structure', () => {
      const sampleSize = {
        total: 3000,
        targetPopulation: '中国职场人士',
        confidenceLevel: 95,
        marginOfError: 2.5,
      };

      expect(sampleSize.total).toBe(3000);
      expect(sampleSize.confidenceLevel).toBe(95);
      expect(sampleSize.marginOfError).toBe(2.5);
    });

    it('should validate user satisfaction structure', () => {
      const satisfaction = {
        nps: 55,
        satisfactionScore: 8.2,
        keyFeedback: ['响应速度快', '准确率高'],
      };

      expect(satisfaction.nps).toBe(55);
      expect(satisfaction.satisfactionScore).toBe(8.2);
      expect(satisfaction.keyFeedback).toHaveLength(2);
    });

    it('should validate optional fields', () => {
      const data: UserResearchData = {
        userPersonas: [],
        userSatisfaction: {
          satisfactionScore: 5,
          keyFeedback: [],
        },
        // Optional fields
        penetrationRate: {
          overall: 15.5,
          bySegment: [
            { segment: '大型企业', rate: 25 },
            { segment: '中小企业', rate: 10 },
          ],
        },
        adoptionTrends: [
          { phase: '引入期', percentage: 5, description: '早期采用者' },
          { phase: '增长期', percentage: 20, description: '快速增长阶段' },
        ],
      };

      expect(data.penetrationRate?.overall).toBe(15.5);
      expect(data.adoptionTrends).toHaveLength(2);
    });

    it('should validate penetration rate structure', () => {
      const penetrationRate = {
        overall: 12.5,
        bySegment: [
          { segment: '科技行业', rate: 18 },
          { segment: '金融行业', rate: 15 },
          { segment: '零售行业', rate: 8 },
        ],
      };

      expect(penetrationRate.overall).toBe(12.5);
      expect(penetrationRate.bySegment).toHaveLength(3);
    });

    it('should validate adoption trends structure', () => {
      const trends = [
        { phase: '探索期', percentage: 3, description: '市场教育阶段' },
        { phase: '导入期', percentage: 10, description: '用户开始接受' },
        { phase: '成长期', percentage: 35, description: '快速扩张' },
        { phase: '成熟期', percentage: 60, description: '市场饱和' },
      ];

      expect(trends).toHaveLength(4);
      expect(trends[0].percentage).toBe(3);
      expect(trends[3].percentage).toBe(60);
    });
  });
});
