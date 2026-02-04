/**
 * Quality Assessor Tests
 */

import { describe, it, expect } from '@jest/globals';
import { QualityAssessor, createQualityAssessor } from '../../research-agent/workers/analyzer/quantitative/quality-assessor';
import type { AnalysisResult } from '../../research-agent/types';

describe('QualityAssessor', () => {
  describe('constructor', () => {
    it('should create with default weights', () => {
      const assessor = new QualityAssessor();
      expect(assessor).toBeDefined();
    });

    it('should create with custom weights', () => {
      const assessor = new QualityAssessor({
        marketData: 0.40,
        competitorData: 0.20,
        businessModel: 0.20,
        userResearch: 0.10,
        techAnalysis: 0.10,
      });
      expect(assessor).toBeDefined();
    });
  });

  describe('assess', () => {
    it('should return valid assessment for empty analysis', () => {
      const assessor = new QualityAssessor();
      const emptyAnalysis: AnalysisResult = {
        features: [],
        competitors: [],
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        marketData: {
          marketSize: '',
          growthRate: '',
          keyPlayers: [],
          trends: [],
          opportunities: [],
          challenges: [],
        },
        confidenceScore: 0,
        dataGaps: [],
      };

      const result = assessor.assess(emptyAnalysis);

      expect(result.overallScore).toBeDefined();
      expect(result.completenessScore).toBeDefined();
      expect(result.credibilityScore).toBeDefined();
      expect(result.visualizationScore).toBeDefined();
      expect(result.dataGaps).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should score market data completeness', () => {
      const assessor = new QualityAssessor();
      const analysis: AnalysisResult = {
        features: [],
        competitors: [],
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        marketData: {
          marketSize: '100亿',
          growthRate: '20%',
          keyPlayers: ['厂商A', '厂商B', '厂商C'],
          trends: ['趋势1', '趋势2'],
          opportunities: ['机会1'],
          challenges: ['挑战1'],
          marketSizeRange: {
            min: '80亿',
            base: '100亿',
            max: '120亿',
            currency: 'CNY',
          },
          growthRateHistorical: [
            { year: '2022', rate: '18%', source: '报告' },
            { year: '2023', rate: '20%', source: '报告' },
          ],
          confidenceLevel: 'High',
          marketDrivers: [{ factor: '技术', impact: 'High', description: '技术创新' }],
          marketConstraints: [{ factor: '竞争', impact: 'Medium', description: '竞争加剧' }],
        },
        confidenceScore: 0.8,
        dataGaps: [],
      };

      const result = assessor.assess(analysis);

      expect(result.breakdown.marketData).toBeGreaterThan(0);
      expect(result.dataGaps.filter(g => g.includes('市场规模'))).toHaveLength(0);
    });

    it('should identify missing data gaps', () => {
      const assessor = new QualityAssessor();
      const analysis: AnalysisResult = {
        features: [],
        competitors: [],
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        marketData: {
          marketSize: '',
          growthRate: '',
          keyPlayers: [],
          trends: [],
          opportunities: [],
          challenges: [],
        },
        confidenceScore: 0.5,
        dataGaps: [],
      };

      const result = assessor.assess(analysis);

      expect(result.dataGaps.length).toBeGreaterThan(0);
      expect(result.dataGaps).toContain('市场规模估算缺失');
    });

    it('should calculate overall score', () => {
      const assessor = new QualityAssessor();
      const completeAnalysis: AnalysisResult = {
        features: [
          { name: '功能1', count: 5, sources: ['url1'], description: '功能描述' },
          { name: '功能2', count: 3, sources: ['url2'], description: '功能描述' },
        ],
        competitors: [
          { name: '竞品1', industry: '科技', features: ['功能1'], description: '描述', marketPosition: '领导者' },
          { name: '竞品2', industry: '科技', features: ['功能2'], description: '描述', marketPosition: '挑战者' },
        ],
        swot: {
          strengths: ['优势1', '优势2'],
          weaknesses: ['劣势1'],
          opportunities: ['机会1'],
          threats: ['威胁1'],
        },
        marketData: {
          marketSize: '100亿',
          growthRate: '20%',
          keyPlayers: ['厂商A', '厂商B'],
          trends: [],
          opportunities: [],
          challenges: [],
          marketSizeRange: {
            min: '80亿',
            base: '100亿',
            max: '120亿',
            currency: 'CNY',
          },
          confidenceLevel: 'High',
        },
        competitorQuantitative: {
          marketShare: [{ competitor: 'A', share: 30, period: '2024', source: '报告' }],
          ltvCacRatio: [{ competitor: 'A', ratio: 4.5, assessment: 'Healthy' }],
        },
        businessModel: {
          pricingModel: { type: 'SaaS' },
          unitEconomics: { contributionMargin: 75, scalabilityAssessment: '高可扩展性' },
          monetizationEfficiency: { freeToPaidConversion: 5 },
          commercialMaturity: { rating: 'Maturing', assessment: '评估', keyMetrics: ['指标1'] },
        },
        userResearch: {
          userPersonas: [{ name: '用户1', demographics: { ageRange: '25-35', genderRatio: '60:40', geographicDistribution: '一线城市', incomeLevel: '30-50K' }, behavioral: { usageFrequency: '每周', preferredFeatures: ['功能A'], paymentWillingness: '中等' }, source: '调研' }],
          penetrationRate: { overall: 10, bySegment: [{ segment: '企业', rate: 15 }] },
          userSatisfaction: { satisfactionScore: 7.5, keyFeedback: ['反馈1'] },
          adoptionTrends: [{ phase: '早期采用者', percentage: 13.5, description: '早期用户' }],
        },
        techAnalysis: {
          architecture: ['微服务'],
          techStack: ['React', 'Node.js'],
          emergingTech: ['AI'],
          innovationPoints: ['创新1'],
        },
        confidenceScore: 0.85,
        dataGaps: [],
      };

      const result = assessor.assess(completeAnalysis);

      expect(result.overallScore).toBeGreaterThanOrEqual(40);
      expect(result.completenessScore).toBeGreaterThanOrEqual(40);
    });

    it('should generate recommendations for low scores', () => {
      const assessor = new QualityAssessor();
      const poorAnalysis: AnalysisResult = {
        features: [],
        competitors: [],
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        marketData: {
          marketSize: '',
          growthRate: '',
          keyPlayers: [],
          trends: [],
          opportunities: [],
          challenges: [],
        },
        confidenceScore: 0.3,
        dataGaps: [],
      };

      const result = assessor.assess(poorAnalysis);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('getIndustryBenchmark', () => {
    it('should return SaaS benchmark by default', () => {
      const assessor = new QualityAssessor();
      const benchmark = assessor.getIndustryBenchmark('saas');

      expect(benchmark.ltvCacRatio.healthy).toBe(3);
      expect(benchmark.cacPaybackMonths.good).toBe(12);
      expect(benchmark.grossMargin.target).toBe(75);
    });

    it('should return B2B benchmark', () => {
      const assessor = new QualityAssessor();
      const benchmark = assessor.getIndustryBenchmark('b2b');

      expect(benchmark.ltvCacRatio.healthy).toBe(3);
      expect(benchmark.grossMargin.target).toBe(60);
    });

    it('should return enterprise benchmark', () => {
      const assessor = new QualityAssessor();
      const benchmark = assessor.getIndustryBenchmark('enterprise');

      expect(benchmark.ltvCacRatio.excellent).toBe(6);
      expect(benchmark.cacPaybackMonths.good).toBe(24);
    });
  });

  describe('createQualityAssessor', () => {
    it('should create assessor with default weights', () => {
      const assessor = createQualityAssessor();
      expect(assessor).toBeDefined();
    });

    it('should create assessor with custom weights', () => {
      const assessor = createQualityAssessor({ marketData: 0.5 });
      expect(assessor).toBeDefined();
    });
  });
});
