/**
 * Quantitative Analysis Types Tests
 *
 * Tests for enhanced report quality types:
 * - UserResearchData
 * - CompetitorQuantitative
 * - BusinessModelAnalysis
 * - StrategicRecommendation
 * - MarketData (enhanced)
 */

import type {
  UserResearchData,
  CompetitorQuantitative,
  BusinessModelAnalysis,
  StrategicRecommendation,
  MarketData,
  ReportQualityAssessment,
  ImplementationRoadmap,
  DataSourceInfo,
  DataSourceCredibility,
  MermaidChart,
} from '../../research-agent/types';

describe('Quantitative Analysis Types', () => {
  describe('UserResearchData', () => {
    it('should allow valid user research data with all fields', () => {
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
        researchMethodology: '在线问卷调查',
        penetrationRate: {
          overall: 12.5,
          bySegment: [
            { segment: '大型企业', rate: 18.2 },
            { segment: '中小企业', rate: 10.5 },
          ],
        },
        userSatisfaction: {
          nps: 42,
          satisfactionScore: 7.5,
          keyFeedback: ['功能丰富', '界面友好'],
        },
        adoptionTrends: [
          { phase: '创新者', percentage: 2.5, description: '最早采用' },
          { phase: '早期采用者', percentage: 13.5, description: '愿意尝试新事物' },
        ],
      };

      expect(data.userPersonas).toHaveLength(1);
      expect(data.sampleSize?.total).toBe(1500);
      expect(data.userSatisfaction?.nps).toBe(42);
      expect(data.adoptionTrends).toHaveLength(2);
    });

    it('should allow minimal user research data', () => {
      const data: UserResearchData = {};

      expect(data.userPersonas).toBeUndefined();
      expect(data.sampleSize).toBeUndefined();
      expect(data.researchMethodology).toBeUndefined();
    });

    it('should allow user research with partial satisfaction data', () => {
      const data: UserResearchData = {
        userSatisfaction: {
          satisfactionScore: 8.2,
          keyFeedback: ['使用方便'],
        },
      };

      expect(data.userSatisfaction?.nps).toBeUndefined();
      expect(data.userSatisfaction?.satisfactionScore).toBe(8.2);
    });
  });

  describe('CompetitorQuantitative', () => {
    it('should allow valid competitor quantitative data', () => {
      const data: CompetitorQuantitative = {
        marketShare: [
          { competitor: 'Leader A', share: 35, period: '2024', source: 'Market Analysis' },
          { competitor: 'Leader B', share: 28, period: '2024', source: 'Market Analysis' },
          { competitor: 'Challenger C', share: 15, period: '2024', source: 'Market Analysis' },
        ],
        revenueMetrics: [
          {
            competitor: 'Leader A',
            revenue: '$5.2B',
            revenueGrowthRate: '18.5%',
            period: '2024',
            currency: 'USD',
            source: 'Financial Reports',
          },
        ],
        arpuMetrics: [
          { competitor: 'Leader A', arpu: '$45/month', currency: 'USD', period: '2024' },
        ],
        cacMetrics: [
          { competitor: 'Leader A', cac: '$120', currency: 'USD', period: '2024' },
        ],
        ltvMetrics: [
          { competitor: 'Leader A', ltv: '$1,800', currency: 'USD', period: '2024' },
        ],
        ltvCacRatio: [
          { competitor: 'Leader A', ltv: '$1,800', cac: '$120', ratio: '15.0', health: 'Good' },
        ],
      };

      expect(data.marketShare).toHaveLength(3);
      expect(data.revenueMetrics).toHaveLength(1);
      expect(data.ltvCacRatio?.[0].ratio).toBe('15.0');
      expect(data.ltvCacRatio?.[0].health).toBe('Good');
    });

    it('should allow minimal competitor quantitative data', () => {
      const data: CompetitorQuantitative = {};

      expect(data.marketShare).toBeUndefined();
      expect(data.revenueMetrics).toBeUndefined();
    });

    it('should allow competitor quantitative with partial metrics', () => {
      const data: CompetitorQuantitative = {
        marketShare: [{ competitor: 'A', share: 40, period: '2024', source: 'Analysis' }],
      };

      expect(data.marketShare).toHaveLength(1);
      expect(data.arpuMetrics).toBeUndefined();
    });
  });

  describe('BusinessModelAnalysis', () => {
    it('should allow valid business model analysis', () => {
      const data: BusinessModelAnalysis = {
        pricingModel: {
          type: 'subscription',
          tiers: [
            { name: '基础版', price: '$29/月', features: ['核心功能'] },
            { name: '专业版', price: '$99/月', features: ['全部功能'] },
          ],
          regionalVariations: '不同地区有不同的定价策略',
        },
        unitEconomics: {
          breakEvenAnalysis: {
            timeToBreakEven: '18 个月',
            revenueNeeded: '$3M',
          },
          contributionMargin: 0.75,
          scalabilityAssessment: '高可扩展性 - 边际成本低',
        },
        monetizationEfficiency: {
          freeToPaidConversion: 0.045,
          arppu: '$35/月',
          rpDau: '$0.8/日活',
        },
        commercialMaturity: {
          rating: 'Maturing',
          assessment: '商业化模式已初步验证',
          keyMetrics: ['MRR', 'LTV', 'CAC', 'Churn Rate', 'NPS'],
        },
      };

      expect(data.pricingModel?.type).toBe('subscription');
      expect(data.pricingModel?.tiers).toHaveLength(2);
      expect(data.unitEconomics?.contributionMargin).toBe(0.75);
      expect(data.commercialMaturity?.rating).toBe('Maturing');
    });

    it('should allow minimal business model analysis', () => {
      const data: BusinessModelAnalysis = {};

      expect(data.pricingModel).toBeUndefined();
      expect(data.unitEconomics).toBeUndefined();
      expect(data.monetizationEfficiency).toBeUndefined();
      expect(data.commercialMaturity).toBeUndefined();
    });

    it('should allow business model with only pricing', () => {
      const data: BusinessModelAnalysis = {
        pricingModel: {
          type: 'freemium',
          tiers: [{ name: '免费版', price: '$0', features: ['基础功能'] }],
        },
      };

      expect(data.pricingModel?.type).toBe('freemium');
      expect(data.unitEconomics).toBeUndefined();
    });

    it('should allow all commercial maturity ratings', () => {
      const ratings: BusinessModelAnalysis['commercialMaturity']['rating'][] = [
        'Early Stage',
        'Maturing',
        'Mature',
      ];

      expect(ratings).toHaveLength(3);
    });
  });

  describe('StrategicRecommendation', () => {
    it('should allow valid strategic recommendation', () => {
      const recommendation: StrategicRecommendation = {
        specific: '优化移动端用户体验',
        measurable: {
          kpis: [
            { name: '移动端留存率', target: '60%', current: '45%', unit: '百分比' },
            { name: 'App Store 评分', target: '4.5', current: '4.2', unit: '分' },
          ],
        },
        achievable: {
          feasibility: '高',
          rationale: '现有团队具备相关技术能力',
        },
        relevant: {
          relevanceScore: 9,
          businessImpact: '提升用户增长和留存',
        },
        timeBound: {
          deadline: '2025-06-30',
          milestones: [
            { name: '完成用户调研', targetDate: '2025-02-28', successCriteria: '收集500+用户反馈' },
            { name: '发布优化版本', targetDate: '2025-05-15', successCriteria: '新版本上线' },
          ],
        },
        resourceRequirements: {
          budget: '$50,000',
          teamSize: '5人',
        },
      };

      expect(recommendation.specific).toBe('优化移动端用户体验');
      expect(recommendation.measurable.kpis).toHaveLength(2);
      expect(recommendation.relevant.relevanceScore).toBe(9);
      expect(recommendation.timeBound.milestones).toHaveLength(2);
    });

    it('should allow strategic recommendation with minimal fields', () => {
      const recommendation: StrategicRecommendation = {
        specific: '提升用户体验',
      };

      expect(recommendation.specific).toBe('提升用户体验');
      expect(recommendation.measurable).toBeUndefined();
    });
  });

  describe('MarketData (Enhanced)', () => {
    it('should allow enhanced market data with all fields', () => {
      const data: MarketData = {
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['Company A', 'Company B', 'Company C'],
        trends: ['AI adoption', 'Mobile-first'],
        opportunities: ['Emerging markets'],
        challenges: ['Competition'],
        // Enhanced fields
        marketSizeRange: {
          min: '$35B',
          base: '$50B',
          max: '$65B',
          currency: 'USD',
        },
        growthRateHistorical: [
          { year: '2022', rate: '12%', source: 'Industry Report' },
          { year: '2023', rate: '14%', source: 'Industry Report' },
        ],
        forecastYears: [
          { year: '2025', projectedSize: '$60B', projectedRate: '16%', methodology: 'CAGR Forecast' },
        ],
        dataSource: {
          primary: '艾瑞咨询 2024',
          secondary: ['QuestMobile', '易观分析'],
          lastUpdated: '2024-12-01',
        },
        confidenceLevel: 'High',
        marketDrivers: [
          { factor: '数字化转型', impact: 'High', description: '企业数字化需求增长' },
        ],
        marketConstraints: [
          { factor: '监管政策', impact: 'Medium', description: '数据隐私法规趋严' },
        ],
      };

      expect(data.marketSize).toBe('$50B');
      expect(data.marketSizeRange?.base).toBe('$50B');
      expect(data.confidenceLevel).toBe('High');
      expect(data.marketDrivers).toHaveLength(1);
      expect(data.marketDrivers?.[0].impact).toBe('High');
    });

    it('should allow market data with minimal fields', () => {
      const data: MarketData = {
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['Company A'],
        trends: [],
        opportunities: [],
        challenges: [],
      };

      expect(data.marketSize).toBe('$50B');
      expect(data.marketSizeRange).toBeUndefined();
      expect(data.confidenceLevel).toBeUndefined();
    });

    it('should allow all confidence levels', () => {
      const levels: MarketData['confidenceLevel'][] = ['High', 'Medium', 'Low'];

      expect(levels).toHaveLength(3);
    });

    it('should allow market data with partial enhanced fields', () => {
      const data: MarketData = {
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['Company A'],
        trends: [],
        opportunities: [],
        challenges: [],
        marketSizeRange: {
          min: '$35B',
          base: '$50B',
          max: '$65B',
          currency: 'USD',
        },
      };

      expect(data.marketSizeRange).toBeDefined();
      expect(data.dataSource).toBeUndefined();
    });
  });

  describe('ReportQualityAssessment', () => {
    it('should allow valid quality assessment', () => {
      const assessment: ReportQualityAssessment = {
        dataCompletenessScore: 85,
        sourceCredibilityScore: 78,
        visualizationCoverageScore: 60,
        overallQualityScore: 76,
        dataGaps: ['缺少竞品财务数据'],
        recommendations: ['建议补充上市公司财报数据', '增加用户调研样本量'],
      };

      expect(assessment.overallQualityScore).toBeGreaterThanOrEqual(0);
      expect(assessment.overallQualityScore).toBeLessThanOrEqual(100);
      expect(assessment.dataCompletenessScore).toBeGreaterThan(assessment.visualizationCoverageScore);
      expect(assessment.recommendations).toHaveLength(2);
    });

    it('should allow quality assessment with partial scores', () => {
      const assessment: ReportQualityAssessment = {
        dataCompletenessScore: 90,
        sourceCredibilityScore: 85,
        visualizationCoverageScore: 0,
        overallQualityScore: 70,
        dataGaps: [],
        recommendations: [],
      };

      expect(assessment.visualizationCoverageScore).toBe(0);
      expect(assessment.recommendations).toHaveLength(0);
    });
  });

  describe('ImplementationRoadmap', () => {
    it('should allow valid implementation roadmap', () => {
      const roadmap: ImplementationRoadmap = {
        shortTerm: [
          {
            specific: '完成产品 MVP',
            measurable: { kpis: [{ name: '功能完成率', target: '100%', current: '60%', unit: '百分比' }] },
            achievable: { feasibility: '高', rationale: '团队经验丰富' },
            relevant: { relevanceScore: 9, businessImpact: '快速验证产品假设' },
            timeBound: {
              deadline: '2025-03-31',
              milestones: [{ name: 'MCP 集成完成', targetDate: '2025-02-28', successCriteria: '核心功能可用' }],
            },
            resourceRequirements: { budget: '$100,000', teamSize: '8人' },
          },
        ],
        mediumTerm: [],
        longTerm: [],
      };

      expect(roadmap.shortTerm).toHaveLength(1);
      expect(roadmap.shortTerm[0].timeBound.milestones).toHaveLength(1);
    });
  });

  describe('DataSourceCredibility', () => {
    it('should allow all credibility levels', () => {
      const levels: DataSourceCredibility[] = ['Primary', 'Secondary', 'Estimated', 'Unverified'];

      expect(levels).toHaveLength(4);
    });
  });

  describe('MermaidChart (Enhanced)', () => {
    it('should allow enhanced chart types', () => {
      const charts: MermaidChart[] = [
        { id: 'chart1', type: 'pie', title: 'Market Share', code: 'pie title Test' },
        { id: 'chart2', type: 'radar', title: 'Competitor Analysis', code: 'radar title Test' },
        { id: 'chart3', type: 'xychart', title: 'Growth Trend', code: 'xychart-beta title Test' },
        { id: 'chart4', type: 'gantt', title: 'Roadmap', code: 'gantt title Test' },
        { id: 'chart5', type: 'mindmap', title: 'Overview', code: 'mindmap title Test' },
        { id: 'chart6', type: 'graph', title: 'Industry Chain', code: 'graph LR A-->B' },
        { id: 'chart7', type: 'heatmap', title: 'User Segmentation', code: 'heatmap title Test' },
      ];

      expect(charts).toHaveLength(7);
      expect(charts[2].type).toBe('xychart');
      expect(charts[3].type).toBe('gantt');
      expect(charts[6].type).toBe('heatmap');
    });
  });
});
