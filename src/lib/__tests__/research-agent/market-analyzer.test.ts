/**
 * Market Data Analyzer Tests
 *
 * Tests for MarketDataAnalyzer class:
 * - Market size estimation
 * - Growth rate trend analysis
 * - Market forecasting
 * - Market drivers/constraints identification
 */

import type { MarketData } from '../research-agent/types';

describe('MarketData Type Tests', () => {
  describe('MarketData structure', () => {
    it('should have required fields', () => {
      const data: MarketData = {
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['Company A'],
        trends: [],
        opportunities: [],
        challenges: [],
      };

      expect(data.marketSize).toBe('$50B');
      expect(data.growthRate).toBe('15%');
      expect(data.keyPlayers).toContain('Company A');
    });

    it('should support enhanced fields', () => {
      const data: MarketData = {
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['Company A'],
        trends: [],
        opportunities: [],
        challenges: [],
        marketSizeRange: {
          min: '$40B',
          base: '$50B',
          max: '$60B',
          currency: 'USD',
        },
        growthRateHistorical: [
          { year: '2022', rate: '12%', source: 'Historical' },
        ],
        forecastYears: [
          { year: '2025', projectedSize: '$60B', projectedRate: '16%', methodology: 'CAGR' },
        ],
        dataSource: {
          primary: '艾瑞咨询',
          secondary: ['QuestMobile'],
          lastUpdated: '2024-01-01',
        },
        confidenceLevel: 'High',
        marketDrivers: [
          { factor: '技术创新', impact: 'High', description: '推动增长' },
        ],
        marketConstraints: [
          { factor: '监管政策', impact: 'Medium', description: '增加合规成本' },
        ],
      };

      expect(data.marketSizeRange?.base).toBe('$50B');
      expect(data.confidenceLevel).toBe('High');
      expect(data.marketDrivers).toHaveLength(1);
      expect(data.marketConstraints).toHaveLength(1);
    });

    it('should allow optional fields to be undefined', () => {
      const data: MarketData = {
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['Company A'],
        trends: [],
        opportunities: [],
        challenges: [],
      };

      expect(data.marketSizeRange).toBeUndefined();
      expect(data.growthRateHistorical).toBeUndefined();
      expect(data.forecastYears).toBeUndefined();
    });

    it('should allow all confidence levels', () => {
      const levels: MarketData['confidenceLevel'][] = ['High', 'Medium', 'Low'];

      levels.forEach(level => {
        const data: MarketData = {
          marketSize: '$50B',
          growthRate: '15%',
          keyPlayers: ['A'],
          trends: [],
          opportunities: [],
          challenges: [],
          confidenceLevel: level,
        };
        expect(data.confidenceLevel).toBe(level);
      });
    });

    it('should allow market drivers with different impacts', () => {
      const drivers: MarketData['marketDrivers'] = [
        { factor: 'A', impact: 'High', description: 'High impact' },
        { factor: 'B', impact: 'Medium', description: 'Medium impact' },
        { factor: 'C', impact: 'Low', description: 'Low impact' },
      ];

      expect(drivers[0].impact).toBe('High');
      expect(drivers[1].impact).toBe('Medium');
      expect(drivers[2].impact).toBe('Low');
    });

    it('should have correct marketSizeRange structure', () => {
      const data: MarketData = {
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['A'],
        trends: [],
        opportunities: [],
        challenges: [],
        marketSizeRange: {
          min: '$40B',
          base: '$50B',
          max: '$60B',
          currency: 'USD',
        },
      };

      expect(data.marketSizeRange?.currency).toBe('USD');
      expect(parseFloat(data.marketSizeRange?.min.replace('$', '').replace('B', ''))).toBeLessThan(
        parseFloat(data.marketSizeRange?.base.replace('$', '').replace('B', ''))
      );
      expect(parseFloat(data.marketSizeRange?.max.replace('$', '').replace('B', ''))).toBeGreaterThan(
        parseFloat(data.marketSizeRange?.base.replace('$', '').replace('B', ''))
      );
    });

    it('should have correct dataSource structure', () => {
      const data: MarketData = {
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['A'],
        trends: [],
        opportunities: [],
        challenges: [],
        dataSource: {
          primary: 'Primary Source',
          secondary: ['Source A', 'Source B'],
          lastUpdated: '2024-01-01',
        },
      };

      expect(data.dataSource?.primary).toBe('Primary Source');
      expect(data.dataSource?.secondary).toHaveLength(2);
      expect(data.dataSource?.lastUpdated).toBeDefined();
    });

    it('should have correct growthRateHistorical structure', () => {
      const data: MarketData = {
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['A'],
        trends: [],
        opportunities: [],
        challenges: [],
        growthRateHistorical: [
          { year: '2022', rate: '12%', source: 'Historical' },
          { year: '2023', rate: '14%', source: 'Historical' },
        ],
      };

      expect(data.growthRateHistorical).toHaveLength(2);
      expect(data.growthRateHistorical?.[0].year).toBe('2022');
      expect(data.growthRateHistorical?.[0].rate).toContain('%');
    });

    it('should have correct forecastYears structure', () => {
      const data: MarketData = {
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['A'],
        trends: [],
        opportunities: [],
        challenges: [],
        forecastYears: [
          { year: '2025', projectedSize: '$60B', projectedRate: '16%', methodology: 'CAGR' },
          { year: '2026', projectedSize: '$70B', projectedRate: '15%', methodology: 'CAGR' },
        ],
      };

      expect(data.forecastYears).toHaveLength(2);
      expect(data.forecastYears?.[0].projectedSize).toContain('$');
      expect(data.forecastYears?.[0].projectedRate).toContain('%');
    });
  });
});

describe('MarketConcentration Analysis', () => {
  let analyzer: any;

  beforeAll(async () => {
    const { MarketDataAnalyzer } = await import('../../research-agent/workers/analyzer/quantitative/market-analyzer');
    analyzer = new MarketDataAnalyzer();
  });

  describe('analyzeMarketConcentration', () => {
    it('should identify highly concentrated market', () => {
      const competitors = [
        { name: 'Leader', marketShare: 50 },
        { name: 'Challenger1', marketShare: 30 },
        { name: 'Challenger2', marketShare: 15 },
      ];

      const result = analyzer.analyzeMarketConcentration(competitors);

      expect(result.type).toBe('高度集中');
      expect(result.top3Share).toBe(95);
      expect(result.hhi).toBeGreaterThan(2500);
      expect(result.competitiveDynamics.length).toBeGreaterThan(0);
    });

    it('should identify moderately concentrated market', () => {
      const competitors = [
        { name: 'Leader', marketShare: 35 },
        { name: 'Challenger1', marketShare: 25 },
        { name: 'Challenger2', marketShare: 15 },
        { name: 'Other1', marketShare: 10 },
        { name: 'Other2', marketShare: 5 },
      ];

      const result = analyzer.analyzeMarketConcentration(competitors);

      expect(result.type).toBe('中度集中');
      expect(result.hhi).toBeGreaterThan(1500);
      expect(result.hhi).toBeLessThanOrEqual(2500);
    });

    it('should identify moderately fragmented market', () => {
      const competitors = [
        { name: 'Leader', marketShare: 25 },
        { name: 'Challenger1', marketShare: 15 },
        { name: 'Challenger2', marketShare: 12 },
        { name: 'Other1', marketShare: 10 },
        { name: 'Other2', marketShare: 8 },
      ];

      const result = analyzer.analyzeMarketConcentration(competitors);

      expect(result.type).toBe('中度分散');
      expect(result.hhi).toBeGreaterThan(1000);
      expect(result.hhi).toBeLessThanOrEqual(1500);
    });

    it('should identify highly fragmented market', () => {
      const competitors = [
        { name: 'A', marketShare: 8 },
        { name: 'B', marketShare: 7 },
        { name: 'C', marketShare: 6 },
        { name: 'D', marketShare: 5 },
        { name: 'E', marketShare: 4 },
        { name: 'F', marketShare: 3 },
      ];

      const result = analyzer.analyzeMarketConcentration(competitors);

      expect(result.type).toBe('高度分散');
      expect(result.hhi).toBeLessThanOrEqual(1000);
    });

    it('should handle empty competitor list', () => {
      const result = analyzer.analyzeMarketConcentration([]);

      expect(result.type).toBe('高度分散');
      expect(result.top3Share).toBe(0);
      expect(result.hhi).toBe(0);
    });

    it('should handle competitors without market share', () => {
      const competitors = [
        { name: 'A' },
        { name: 'B' },
      ];

      const result = analyzer.analyzeMarketConcentration(competitors);

      expect(result.top3Share).toBe(0);
      expect(result.hhi).toBe(0);
    });

    it('should calculate correct HHI values', () => {
      // Perfect monopoly: 100% share = 10000 HHI
      const competitors = [{ name: 'Monopoly', marketShare: 100 }];
      const result = analyzer.analyzeMarketConcentration(competitors);
      expect(result.hhi).toBe(10000);

      // Two equal players: 50% + 50% = 5000 HHI
      const competitors2 = [
        { name: 'A', marketShare: 50 },
        { name: 'B', marketShare: 50 },
      ];
      const result2 = analyzer.analyzeMarketConcentration(competitors2);
      expect(result2.hhi).toBe(5000);
    });
  });

  describe('analyzeCompetitiveDynamics', () => {
    it('should identify market leader correctly', () => {
      const competitors = [
        { name: 'LeaderCo', marketShare: 40 },
        { name: 'Challenger1', marketShare: 20 },
        { name: 'Challenger2', marketShare: 15 },
      ];

      const result = analyzer.analyzeCompetitiveDynamics(competitors);

      expect(result.leader).toBe('LeaderCo');
      expect(result.leaderShare).toBe(40);
    });

    it('should identify challengers correctly', () => {
      const competitors = [
        { name: 'Leader', marketShare: 40 },
        { name: 'Strong Challenger', marketShare: 15 },
        { name: 'Weak Challenger', marketShare: 4 },
        { name: 'Niche Player', marketShare: 3 },
      ];

      const result = analyzer.analyzeCompetitiveDynamics(competitors);

      expect(result.challengers).toContain('Strong Challenger');
      expect(result.challengers).not.toContain('Weak Challenger');
      expect(result.challengers).not.toContain('Niche Player');
    });

    it('should handle no leader case', () => {
      const result = analyzer.analyzeCompetitiveDynamics([]);

      expect(result.leader).toBe('暂无明确领导者');
      expect(result.leaderShare).toBe(0);
    });

    it('should identify market gaps', () => {
      const competitors = [
        { name: 'A', description: 'Enterprise solution' },
        { name: 'B', description: 'Enterprise solution' },
      ];

      const result = analyzer.analyzeCompetitiveDynamics(competitors);

      expect(result.marketGaps).toContain('针对中小企业的解决方案可能不足');
      expect(result.marketGaps).toContain('移动端产品/服务可能存在机会');
    });

    it('should identify entry barriers', () => {
      const competitors = [
        { name: 'A', description: '科技巨头，拥有大量数据积累' },
      ];

      const result = analyzer.analyzeCompetitiveDynamics(competitors);

      expect(result.entryBarriers.length).toBeGreaterThan(0);
    });
  });
});

describe('MarketSize Estimation', () => {
  let analyzer: any;

  beforeAll(async () => {
    const { MarketDataAnalyzer } = await import('../../research-agent/workers/analyzer/quantitative/market-analyzer');
    analyzer = new MarketDataAnalyzer();
  });

  describe('calculateMarketSizeRange', () => {
    it('should parse billion scale correctly', () => {
      const result = (analyzer as any).calculateMarketSizeRange('$50B');

      expect(result.base).toBe('$50.0B');
      expect(result.min).toBe('$40.0B');
      expect(result.max).toBe('$60.0B');
    });

    it('should parse million scale correctly', () => {
      const result = (analyzer as any).calculateMarketSizeRange('$10M');

      expect(result.base).toBe('$10.0M');
      expect(result.min).toBe('$8.0M');
      expect(result.max).toBe('$12.0M');
    });

    it('should handle undefined input', () => {
      const result = (analyzer as any).calculateMarketSizeRange(undefined);

      expect(result.base).toBe('$0');
      expect(result.min).toBe('$0');
    });

    it('should handle different currencies', () => {
      const result = (analyzer as any).calculateMarketSizeRange('￥500B');

      expect(result.currency).toBe('￥');
      expect(result.base).toContain('￥');
    });
  });
});
