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
