/**
 * User Research Analyzer Tests
 *
 * Tests for UserResearchAnalyzer class:
 * - User research data analysis
 * - Target persona inference
 * - Penetration rate calculation
 * - Segmentation heatmap generation
 * - Satisfaction index calculation
 * - Behavior pattern analysis
 */

import { createUserResearchAnalyzer, UserResearchAnalyzer } from '../research-agent/workers/analyzer/quantitative/user-research-analyzer';
import type { UserResearchData, CompetitorAnalysis } from '../../research-agent/types';

// Mock the datasource module
jest.mock('../research-agent/workers/analyzer/quantitative/datasource', () => ({
  createUserResearchFetcher: jest.fn(() => ({
    fetchUserResearchData: jest.fn().mockResolvedValue({
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
    }),
  })),
}));

describe('UserResearchAnalyzer', () => {
  let analyzer: UserResearchAnalyzer;

  beforeEach(() => {
    analyzer = createUserResearchAnalyzer();
  });

  describe('analyzeUserResearch', () => {
    it('should return user research data with all fields', async () => {
      const competitors: CompetitorAnalysis[] = [
        { name: 'Competitor A', industry: 'SaaS', features: ['效率工具', '协作功能'] },
      ];

      const result = await analyzer.analyzeUserResearch('Test Keyword', competitors);

      expect(result).toHaveProperty('userPersonas');
      expect(result).toHaveProperty('sampleSize');
      expect(result).toHaveProperty('researchMethodology');
      expect(result).toHaveProperty('penetrationRate');
      expect(result).toHaveProperty('userSatisfaction');
      expect(result).toHaveProperty('adoptionTrends');
    });

    it('should handle empty competitors list', async () => {
      const result = await analyzer.analyzeUserResearch('Test Keyword', []);

      expect(result).toBeDefined();
      expect(result.userPersonas).toBeDefined();
    });

    it('should include user personas', async () => {
      const result = await analyzer.analyzeUserResearch('Test Keyword', []);

      expect(Array.isArray(result.userPersonas)).toBe(true);
      if (result.userPersonas && result.userPersonas.length > 0) {
        expect(result.userPersonas[0]).toHaveProperty('name');
        expect(result.userPersonas[0]).toHaveProperty('demographics');
        expect(result.userPersonas[0]).toHaveProperty('behavioral');
        expect(result.userPersonas[0]).toHaveProperty('source');
      }
    });

    it('should include sample size information', async () => {
      const result = await analyzer.analyzeUserResearch('Test Keyword', []);

      expect(result.sampleSize).toHaveProperty('total');
      expect(result.sampleSize).toHaveProperty('targetPopulation');
      expect(result.sampleSize).toHaveProperty('confidenceLevel');
      expect(result.sampleSize).toHaveProperty('marginOfError');
    });

    it('should include user satisfaction data', async () => {
      const result = await analyzer.analyzeUserResearch('Test Keyword', []);

      expect(result.userSatisfaction).toHaveProperty('nps');
      expect(result.userSatisfaction).toHaveProperty('satisfactionScore');
      expect(result.userSatisfaction).toHaveProperty('keyFeedback');
    });

    it('should include adoption trends', async () => {
      const result = await analyzer.analyzeUserResearch('Test Keyword', []);

      expect(result.adoptionTrends).toBeDefined();
      expect(Array.isArray(result.adoptionTrends)).toBe(true);
      if (result.adoptionTrends && result.adoptionTrends.length > 0) {
        expect(result.adoptionTrends[0]).toHaveProperty('phase');
        expect(result.adoptionTrends[0]).toHaveProperty('percentage');
        expect(result.adoptionTrends[0]).toHaveProperty('description');
      }
    });

    it('should include penetration rate', async () => {
      const result = await analyzer.analyzeUserResearch('Test Keyword', []);

      expect(result.penetrationRate).toHaveProperty('overall');
      expect(result.penetrationRate).toHaveProperty('bySegment');
    });

    it('should enrich data when competitors provided', async () => {
      const competitors: CompetitorAnalysis[] = [
        { name: 'Competitor A', industry: 'SaaS', features: ['效率工具', '协作功能'] },
      ];

      const result = await analyzer.analyzeUserResearch('Test Keyword', competitors);

      expect(result.userPersonas).toBeDefined();
      expect(result.researchMethodology).toContain('竞品分析推断');
    });
  });

  describe('calculatePenetrationRate', () => {
    it('should calculate penetration rate correctly', () => {
      const userResearch: UserResearchData = {
        userPersonas: [],
        sampleSize: {
          total: 1500,
          targetPopulation: '目标市场用户',
          confidenceLevel: 95,
          marginOfError: 3,
        },
        penetrationRate: {
          overall: 12.5,
          bySegment: [],
        },
      };

      const rate = analyzer.calculatePenetrationRate(userResearch, 100000);

      expect(typeof rate).toBe('number');
      expect(rate).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for insufficient sample size', () => {
      const userResearch: UserResearchData = {
        userPersonas: [],
        sampleSize: {
          total: 50, // Below minSampleSize of 100
          targetPopulation: '目标市场用户',
          confidenceLevel: 95,
          marginOfError: 5,
        },
        penetrationRate: {
          overall: 10,
          bySegment: [],
        },
      };

      const rate = analyzer.calculatePenetrationRate(userResearch, 100000);

      expect(rate).toBe(0);
    });

    it('should adjust rate by confidence level', () => {
      const userResearch: UserResearchData = {
        userPersonas: [],
        sampleSize: {
          total: 1000,
          targetPopulation: '目标市场用户',
          confidenceLevel: 95,
          marginOfError: 3,
        },
        penetrationRate: {
          overall: 20,
          bySegment: [],
        },
      };

      const rate = analyzer.calculatePenetrationRate(userResearch, 100000);

      // Rate should be adjusted by confidence level (0.95)
      expect(rate).toBeLessThan(20);
    });

    it('should handle missing penetration rate', () => {
      const userResearch: UserResearchData = {
        userPersonas: [],
        sampleSize: {
          total: 1000,
          targetPopulation: '目标市场用户',
          confidenceLevel: 95,
          marginOfError: 3,
        },
      };

      const rate = analyzer.calculatePenetrationRate(userResearch, 100000);

      expect(typeof rate).toBe('number');
    });
  });

  describe('generateSegmentationHeatmap', () => {
    it('should return heatmap as 2D array', () => {
      const userResearch: UserResearchData = {
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
              preferredFeatures: ['效率工具'],
              paymentWillingness: '中等',
            },
            source: 'Test',
          },
        ],
        sampleSize: { total: 1000 },
      };

      const heatmap = analyzer.generateSegmentationHeatmap(userResearch);

      expect(Array.isArray(heatmap)).toBe(true);
      expect(heatmap.length).toBeGreaterThan(0);
    });

    it('should have correct number of columns', () => {
      const userResearch: UserResearchData = {
        userPersonas: [
          { name: 'Persona A', demographics: {} as any, behavioral: {} as any, source: 'Test' },
          { name: 'Persona B', demographics: {} as any, behavioral: {} as any, source: 'Test' },
        ],
        sampleSize: { total: 1000 },
      };

      const heatmap = analyzer.generateSegmentationHeatmap(userResearch);

      // 1 for name + 5 for dimensions
      expect(heatmap[0].length).toBe(6);
    });

    it('should include persona names as first column', () => {
      const userResearch: UserResearchData = {
        userPersonas: [
          { name: 'Test Persona', demographics: {} as any, behavioral: {} as any, source: 'Test' },
        ],
        sampleSize: { total: 1000 },
      };

      const heatmap = analyzer.generateSegmentationHeatmap(userResearch);

      expect(heatmap[0][0]).toBe('Test Persona');
    });

    it('should return default rows for empty personas', () => {
      const userResearch: UserResearchData = {
        userPersonas: [],
        sampleSize: { total: 1000 },
      };

      const heatmap = analyzer.generateSegmentationHeatmap(userResearch);

      // Should return 3 default rows
      expect(heatmap.length).toBe(3);
    });

    it('should include percentage values', () => {
      const userResearch: UserResearchData = {
        userPersonas: [
          { name: 'Test', demographics: {} as any, behavioral: {} as any, source: 'Test' },
        ],
        sampleSize: { total: 1000 },
      };

      const heatmap = analyzer.generateSegmentationHeatmap(userResearch);

      expect(heatmap[0][1]).toContain('%');
    });
  });

  describe('calculateSatisfactionIndex', () => {
    it('should return overall satisfaction score', () => {
      const userResearch: UserResearchData = {
        userPersonas: [],
        userSatisfaction: {
          nps: 42,
          satisfactionScore: 7.5,
          keyFeedback: ['Good'],
        },
      };

      const index = analyzer.calculateSatisfactionIndex(userResearch);

      expect(index).toHaveProperty('overall');
      expect(typeof index.overall).toBe('number');
      expect(index.overall).toBeGreaterThanOrEqual(0);
      expect(index.overall).toBeLessThanOrEqual(100);
    });

    it('should return breakdown scores', () => {
      const userResearch: UserResearchData = {
        userPersonas: [],
        userSatisfaction: {
          nps: 42,
          satisfactionScore: 7.5,
          keyFeedback: ['Good'],
        },
      };

      const index = analyzer.calculateSatisfactionIndex(userResearch);

      expect(index).toHaveProperty('breakdown');
      expect(typeof index.breakdown).toBe('object');
      expect(Object.keys(index.breakdown).length).toBeGreaterThan(0);
    });

    it('should return recommendations based on score', () => {
      const userResearch: UserResearchData = {
        userPersonas: [],
        userSatisfaction: {
          nps: 42,
          satisfactionScore: 7.5,
          keyFeedback: ['Good'],
        },
      };

      const index = analyzer.calculateSatisfactionIndex(userResearch);

      expect(index).toHaveProperty('recommendations');
      expect(Array.isArray(index.recommendations)).toBe(true);
      expect(index.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle missing satisfaction data', () => {
      const userResearch: UserResearchData = {
        userPersonas: [],
      };

      const index = analyzer.calculateSatisfactionIndex(userResearch);

      expect(index.overall).toBe(0);
      expect(index.recommendations).toContain('需要更多用户反馈数据');
    });

    it('should give different recommendations for low scores', () => {
      const userResearch: UserResearchData = {
        userPersonas: [],
        userSatisfaction: {
          nps: 10,
          satisfactionScore: 4.5,
          keyFeedback: ['Issues'],
        },
      };

      const index = analyzer.calculateSatisfactionIndex(userResearch);

      expect(index.overall).toBeLessThan(60);
      expect(index.recommendations.some(r => r.includes('痛点'))).toBe(true);
    });

    it('should give positive recommendations for high scores', () => {
      const userResearch: UserResearchData = {
        userPersonas: [],
        userSatisfaction: {
          nps: 70,
          satisfactionScore: 9.0,
          keyFeedback: ['Excellent'],
        },
      };

      const index = analyzer.calculateSatisfactionIndex(userResearch);

      expect(index.overall).toBeGreaterThanOrEqual(80);
      expect(index.recommendations.some(r => r.includes('口碑'))).toBe(true);
    });
  });

  describe('analyzeBehaviorPatterns', () => {
    it('should return usage pattern', () => {
      const userResearch: UserResearchData = {
        userPersonas: [
          {
            name: 'Test',
            demographics: {} as any,
            behavioral: {
              usageFrequency: '每日使用',
              preferredFeatures: ['效率工具'],
              paymentWillingness: '中等',
            },
            source: 'Test',
          },
        ],
        sampleSize: { total: 1000 },
      };

      const patterns = analyzer.analyzeBehaviorPatterns(userResearch);

      expect(patterns).toHaveProperty('usagePattern');
      expect(typeof patterns.usagePattern).toBe('string');
    });

    it('should return key touchpoints', () => {
      const userResearch: UserResearchData = {
        userPersonas: [
          {
            name: 'Test',
            demographics: {} as any,
            behavioral: {
              usageFrequency: '每日使用',
              preferredFeatures: ['效率工具', '协作功能', '移动端'],
              paymentWillingness: '中等',
            },
            source: 'Test',
          },
        ],
        sampleSize: { total: 1000 },
      };

      const patterns = analyzer.analyzeBehaviorPatterns(userResearch);

      expect(patterns).toHaveProperty('keyTouchpoints');
      expect(Array.isArray(patterns.keyTouchpoints)).toBe(true);
      expect(patterns.keyTouchpoints).toContain('移动App');
    });

    it('should return churn risk factors', () => {
      const userResearch: UserResearchData = {
        userPersonas: [],
        userSatisfaction: {
          nps: 50,
          satisfactionScore: 7.5,
          keyFeedback: [],
        },
      };

      const patterns = analyzer.analyzeBehaviorPatterns(userResearch);

      expect(patterns).toHaveProperty('churnRiskFactors');
      expect(Array.isArray(patterns.churnRiskFactors)).toBe(true);
    });

    it('should return engagement drivers', () => {
      const userResearch: UserResearchData = {
        userPersonas: [
          {
            name: 'Test',
            demographics: {} as any,
            behavioral: {
              usageFrequency: '每日使用',
              preferredFeatures: ['效率工具', '团队协作', '个性化'],
              paymentWillingness: '中等',
            },
            source: 'Test',
          },
        ],
        sampleSize: { total: 1000 },
      };

      const patterns = analyzer.analyzeBehaviorPatterns(userResearch);

      expect(patterns).toHaveProperty('engagementDrivers');
      expect(Array.isArray(patterns.engagementDrivers)).toBe(true);
      expect(patterns.engagementDrivers).toContain('效率提升');
      expect(patterns.engagementDrivers).toContain('团队协作');
      expect(patterns.engagementDrivers).toContain('个性化体验');
    });

    it('should identify churn risk from low NPS', () => {
      const userResearch: UserResearchData = {
        userPersonas: [],
        userSatisfaction: {
          nps: 10, // Low NPS
          satisfactionScore: 5.5,
          keyFeedback: [],
        },
      };

      const patterns = analyzer.analyzeBehaviorPatterns(userResearch);

      expect(patterns.churnRiskFactors.some(r => r.includes('NPS'))).toBe(true);
    });

    it('should handle empty personas', () => {
      const userResearch: UserResearchData = {
        userPersonas: [],
        sampleSize: { total: 1000 },
      };

      const patterns = analyzer.analyzeBehaviorPatterns(userResearch);

      expect(patterns.usagePattern).toBeDefined();
      expect(patterns.keyTouchpoints).toBeDefined();
      expect(patterns.churnRiskFactors).toBeDefined();
      expect(patterns.engagementDrivers).toBeDefined();
    });
  });

  describe('persona demographics', () => {
    it('should include age range', async () => {
      const result = await analyzer.analyzeUserResearch('Test Keyword', []);

      if (result.userPersonas && result.userPersonas.length > 0) {
        expect(result.userPersonas[0].demographics).toHaveProperty('ageRange');
      }
    });

    it('should include gender ratio', async () => {
      const result = await analyzer.analyzeUserResearch('Test Keyword', []);

      if (result.userPersonas && result.userPersonas.length > 0) {
        expect(result.userPersonas[0].demographics).toHaveProperty('genderRatio');
      }
    });

    it('should include geographic distribution', async () => {
      const result = await analyzer.analyzeUserResearch('Test Keyword', []);

      if (result.userPersonas && result.userPersonas.length > 0) {
        expect(result.userPersonas[0].demographics).toHaveProperty('geographicDistribution');
      }
    });

    it('should include income level', async () => {
      const result = await analyzer.analyzeUserResearch('Test Keyword', []);

      if (result.userPersonas && result.userPersonas.length > 0) {
        expect(result.userPersonas[0].demographics).toHaveProperty('incomeLevel');
      }
    });
  });

  describe('persona behavioral data', () => {
    it('should include usage frequency', async () => {
      const result = await analyzer.analyzeUserResearch('Test Keyword', []);

      if (result.userPersonas && result.userPersonas.length > 0 && result.userPersonas[0].behavioral) {
        expect(result.userPersonas[0].behavioral).toHaveProperty('usageFrequency');
      }
    });

    it('should include preferred features', async () => {
      const result = await analyzer.analyzeUserResearch('Test Keyword', []);

      if (result.userPersonas && result.userPersonas.length > 0 && result.userPersonas[0].behavioral) {
        expect(result.userPersonas[0].behavioral).toHaveProperty('preferredFeatures');
        expect(Array.isArray(result.userPersonas[0].behavioral?.preferredFeatures)).toBe(true);
      }
    });

    it('should include payment willingness', async () => {
      const result = await analyzer.analyzeUserResearch('Test Keyword', []);

      if (result.userPersonas && result.userPersonas.length > 0 && result.userPersonas[0].behavioral) {
        expect(result.userPersonas[0].behavioral).toHaveProperty('paymentWillingness');
      }
    });
  });

  describe('adoption trend stages', () => {
    it('should include all adoption stages', async () => {
      const result = await analyzer.analyzeUserResearch('Test Keyword', []);

      if (result.adoptionTrends) {
        const phases = result.adoptionTrends.map(t => t.phase);
        expect(phases).toContain('创新者 (Innovators)');
        expect(phases).toContain('早期采用者 (Early Adopters)');
        expect(phases).toContain('早期多数 (Early Majority)');
        expect(phases).toContain('晚期多数 (Late Majority)');
        expect(phases).toContain('滞后者 (Laggards)');
      }
    });

    it('should have percentages summing to approximately 100', async () => {
      const result = await analyzer.analyzeUserResearch('Test Keyword', []);

      if (result.adoptionTrends) {
        const total = result.adoptionTrends.reduce((sum, t) => sum + t.percentage, 0);
        expect(total).toBeGreaterThanOrEqual(99);
        expect(total).toBeLessThanOrEqual(101);
      }
    });
  });

  describe('segment penetration rates', () => {
    it('should include segment breakdown', async () => {
      const result = await analyzer.analyzeUserResearch('Test Keyword', []);

      if (result.penetrationRate?.bySegment) {
        expect(result.penetrationRate.bySegment.length).toBeGreaterThan(0);
        expect(result.penetrationRate.bySegment[0]).toHaveProperty('segment');
        expect(result.penetrationRate.bySegment[0]).toHaveProperty('rate');
      }
    });

    it('should have realistic penetration rates', async () => {
      const result = await analyzer.analyzeUserResearch('Test Keyword', []);

      if (result.penetrationRate?.bySegment) {
        result.penetrationRate.bySegment.forEach(segment => {
          expect(segment.rate).toBeGreaterThanOrEqual(0);
          expect(segment.rate).toBeLessThanOrEqual(100);
        });
      }
    });
  });
});
