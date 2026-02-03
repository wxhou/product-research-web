/**
 * Competitor Quantitative Analyzer Tests
 *
 * Tests for CompetitorQuantitative type structure
 */

import type { CompetitorQuantitative } from '../research-agent/types';

describe('CompetitorQuantitative Type Tests', () => {
  describe('Market Share', () => {
    it('should have required fields', () => {
      const data: CompetitorQuantitative = {
        marketShare: [
          { competitor: 'Leader A', share: 35, period: '2024', source: 'Market Analysis' },
        ],
      };

      expect(data.marketShare).toHaveLength(1);
      expect(data.marketShare?.[0].competitor).toBe('Leader A');
      expect(data.marketShare?.[0].share).toBe(35);
    });

    it('should allow multiple competitors', () => {
      const data: CompetitorQuantitative = {
        marketShare: [
          { competitor: 'A', share: 35, period: '2024' },
          { competitor: 'B', share: 28, period: '2024' },
          { competitor: 'C', share: 15, period: '2024' },
        ],
      };

      expect(data.marketShare).toHaveLength(3);
      const totalShare = data.marketShare?.reduce((sum, ms) => sum + ms.share, 0) || 0;
      expect(totalShare).toBe(78);
    });
  });

  describe('Revenue Metrics', () => {
    it('should have revenue metrics structure', () => {
      const data: CompetitorQuantitative = {
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
      };

      expect(data.revenueMetrics?.[0].revenue).toBe('$5.2B');
      expect(data.revenueMetrics?.[0].revenueGrowthRate).toContain('%');
      expect(data.revenueMetrics?.[0].currency).toBe('USD');
    });

    it('should allow multiple revenue entries', () => {
      const data: CompetitorQuantitative = {
        revenueMetrics: [
          { competitor: 'A', revenue: '$5B', revenueGrowthRate: '15%', period: '2024', currency: 'USD' },
          { competitor: 'B', revenue: '$3B', revenueGrowthRate: '20%', period: '2024', currency: 'USD' },
        ],
      };

      expect(data.revenueMetrics).toHaveLength(2);
    });
  });

  describe('ARPU Metrics', () => {
    it('should have ARPU structure', () => {
      const data: CompetitorQuantitative = {
        arpuMetrics: [
          { competitor: 'A', arpu: '$45/month', currency: 'USD', period: 'Monthly' },
        ],
      };

      expect(data.arpuMetrics?.[0].arpu).toContain('$');
      expect(data.arpuMetrics?.[0].currency).toBe('USD');
    });
  });

  describe('CAC Metrics', () => {
    it('should have CAC structure', () => {
      const data: CompetitorQuantitative = {
        cacMetrics: [
          { competitor: 'A', cac: '$120', currency: 'USD', period: '2024' },
        ],
      };

      expect(data.cacMetrics?.[0].cac).toContain('$');
    });
  });

  describe('LTV Metrics', () => {
    it('should have LTV structure', () => {
      const data: CompetitorQuantitative = {
        ltvMetrics: [
          { competitor: 'A', ltv: '$1,800', currency: 'USD', calculationMethod: 'LTV = ARPU × Lifetime' },
        ],
      };

      expect(data.ltvMetrics?.[0].ltv).toContain('$');
      expect(data.ltvMetrics?.[0].calculationMethod).toBeDefined();
    });
  });

  describe('LTV/CAC Ratio', () => {
    it('should have ratio structure with health assessment', () => {
      const data: CompetitorQuantitative = {
        ltvCacRatio: [
          { competitor: 'A', ltv: '$1,800', cac: '$120', ratio: '15.0', health: 'Healthy' },
          { competitor: 'B', ltv: '$500', cac: '$400', ratio: '1.25', health: 'Needs Improvement' },
          { competitor: 'C', ltv: '$200', cac: '$400', ratio: '0.5', health: 'Critical' },
        ],
      };

      expect(data.ltvCacRatio).toHaveLength(3);
      expect(data.ltvCacRatio?.[0].health).toBe('Healthy');
      expect(data.ltvCacRatio?.[1].health).toBe('Needs Improvement');
      expect(data.ltvCacRatio?.[2].health).toBe('Critical');
    });

    it('should calculate ratio correctly', () => {
      const data: CompetitorQuantitative = {
        ltvCacRatio: [
          { competitor: 'A', ltv: '$1,200', cac: '$300', ratio: '4.0', health: 'Healthy' },
        ],
      };

      const ltv = parseFloat(data.ltvCacRatio?.[0].ltv.replace(/[$,]/g, '') || '0');
      const cac = parseFloat(data.ltvCacRatio?.[0].cac.replace(/[$,]/g, '') || '1');
      const expectedRatio = (ltv / cac).toFixed(1);

      expect(data.ltvCacRatio?.[0].ratio).toBe(expectedRatio);
    });
  });

  describe('Optional Fields', () => {
    it('should allow minimal data', () => {
      const data: CompetitorQuantitative = {};

      expect(data.marketShare).toBeUndefined();
      expect(data.revenueMetrics).toBeUndefined();
      expect(data.arpuMetrics).toBeUndefined();
      expect(data.cacMetrics).toBeUndefined();
      expect(data.ltvMetrics).toBeUndefined();
      expect(data.ltvCacRatio).toBeUndefined();
    });

    it('should allow partial metrics', () => {
      const data: CompetitorQuantitative = {
        marketShare: [{ competitor: 'A', share: 40, period: '2024', source: 'Analysis' }],
      };

      expect(data.marketShare).toHaveLength(1);
      expect(data.revenueMetrics).toBeUndefined();
    });
  });

  describe('Data Validation', () => {
    it('should validate share percentages sum to 100', () => {
      const data: CompetitorQuantitative = {
        marketShare: [
          { competitor: 'A', share: 40, period: '2024' },
          { competitor: 'B', share: 35, period: '2024' },
          { competitor: 'C', share: 25, period: '2024' },
        ],
      };

      const total = data.marketShare?.reduce((sum, ms) => sum + ms.share, 0) || 0;
      expect(total).toBe(100);
    });

    it('should validate ratio strings are numeric', () => {
      const data: CompetitorQuantitative = {
        ltvCacRatio: [
          { competitor: 'A', ltv: '$1,000', cac: '$100', ratio: '10.0', health: 'Healthy' },
        ],
      };

      const ratio = parseFloat(data.ltvCacRatio?.[0].ratio || '0');
      expect(typeof ratio).toBe('number');
      expect(ratio).toBeGreaterThan(0);
    });
  });
});
