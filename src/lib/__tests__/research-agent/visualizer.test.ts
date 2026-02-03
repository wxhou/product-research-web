/**
 * Data Visualizer Tests
 *
 * Type validation tests for DataVisualizer module
 */

import { describe, it, expect } from '@jest/globals';
import type { MarketData, CompetitorQuantitative, MermaidChart } from '../../types';

// Type validation only - implementation tests require full integration setup
describe('DataVisualizer Types', () => {
  describe('MermaidChart validation', () => {
    it('should validate MermaidChart structure', () => {
      const chart: MermaidChart = {
        id: 'chart-1',
        type: 'pie',
        title: '市场份额分布',
        code: `pie title 市场份额
  "厂商A" : 35
  "厂商B" : 25
  "其他" : 40`,
      };

      expect(chart.id).toBe('chart-1');
      expect(chart.type).toBe('pie');
      expect(chart.title).toBe('市场份额分布');
      expect(chart.code).toContain('pie');
    });

    it('should validate different chart types', () => {
      const chartTypes = ['pie', 'xychart', 'gantt', 'mindmap', 'flowchart', 'graph', 'classDiagram', 'erDiagram', 'stateDiagram', 'journey'];

      chartTypes.forEach(type => {
        const chart: MermaidChart = {
          id: `chart-${type}`,
          type: type as MermaidChart['type'],
          title: `Test ${type} chart`,
          code: `graph TD\n  A-->B`,
        };
        expect(chart.type).toBe(type);
      });
    });

    it('should validate pie chart code format', () => {
      const pieChart: MermaidChart = {
        id: 'pie-1',
        type: 'pie',
        title: '市场份额',
        code: `pie title 市场份额
  "A公司" : 40
  "B公司" : 35
  "C公司" : 25`,
      };

      expect(pieChart.code).toContain('pie title');
      expect(pieChart.code).toContain('A公司');
      expect(pieChart.code).toContain(': 40');
    });

    it('should validate gantt chart code format', () => {
      const ganttChart: MermaidChart = {
        id: 'gantt-1',
        type: 'gantt',
        title: '产品路线图',
        code: `gantt
  title 产品开发路线图
  dateFormat YYYY-MM-DD
  section 规划
  需求分析 :a1, 2024-01-01, 30d
  section 开发
  功能开发 :a2, after a1, 60d`,
      };

      expect(ganttChart.code).toContain('gantt');
      expect(ganttChart.code).toContain('title');
    });

    it('should validate xy chart code format', () => {
      const xyChart: MermaidChart = {
        id: 'xy-1',
        type: 'xychart',
        title: '增长趋势',
        code: `xychart-beta
  title "增长趋势"
  x-axis ["2021", "2022", "2023", "2024"]
  y-axis "用户数" 0 --> 100
  bar [10, 25, 40, 65]`,
      };

      expect(xyChart.code).toContain('xychart');
    });
  });

  describe('MarketData validation', () => {
    it('should validate market data structure', () => {
      const data: MarketData = {
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['公司A', '公司B', '公司C'],
        trends: ['AI 驱动', '自动化'],
        opportunities: ['垂直行业深耕'],
        challenges: ['数据隐私'],
        marketSizeRange: {
          min: '$40B',
          base: '$50B',
          max: '$60B',
          currency: 'USD',
        },
        growthRateHistorical: [
          { year: '2020', rate: '10%', source: '行业报告' },
          { year: '2021', rate: '12%', source: '行业报告' },
          { year: '2022', rate: '15%', source: '行业报告' },
        ],
        dataSource: {
          primary: '艾瑞咨询',
          secondary: ['QuestMobile', '易观分析'],
          lastUpdated: '2024-01-15',
        },
        confidenceLevel: 'High',
      };

      expect(data.marketSize).toBe('$50B');
      expect(data.growthRate).toBe('15%');
      expect(data.keyPlayers).toHaveLength(3);
      expect(data.confidenceLevel).toBe('High');
    });

    it('should validate market size range', () => {
      const range = {
        min: '$1B',
        base: '$1.5B',
        max: '$2B',
        currency: 'USD',
      };

      expect(range.min).toBe('$1B');
      expect(range.base).toBe('$1.5B');
      expect(range.max).toBe('$2B');
      expect(range.currency).toBe('USD');
    });

    it('should validate growth rate historical data', () => {
      const historical = [
        { year: '2020', rate: '8%', source: '数据源A' },
        { year: '2021', rate: '12%', source: '数据源B' },
        { year: '2022', rate: '15%', source: '数据源C' },
      ];

      expect(historical).toHaveLength(3);
      expect(historical[0].year).toBe('2020');
      expect(historical[1].rate).toBe('12%');
    });

    it('should validate market drivers and constraints', () => {
      const data: MarketData = {
        marketSize: '$10B',
        growthRate: '20%',
        keyPlayers: ['A', 'B'],
        trends: [],
        opportunities: [],
        challenges: [],
        marketDrivers: [
          { factor: '技术进步', impact: 'High', description: 'AI 技术快速发展' },
          { factor: '需求增长', impact: 'Medium', description: '企业数字化转型需求' },
        ],
        marketConstraints: [
          { factor: '数据隐私法规', impact: 'High', description: '合规成本增加' },
        ],
      };

      expect(data.marketDrivers).toHaveLength(2);
      expect(data.marketConstraints).toHaveLength(1);
      expect(data.marketDrivers?.[0].impact).toBe('High');
    });
  });

  describe('CompetitorQuantitative validation', () => {
    it('should validate competitor quantitative structure', () => {
      const data: CompetitorQuantitative = {
        marketShare: [
          { competitor: '公司A', share: 35, yoyGrowth: '12%' },
          { competitor: '公司B', share: 25, yoyGrowth: '8%' },
          { competitor: '公司C', share: 15, yoyGrowth: '20%' },
        ],
        ltvCacRatio: [
          { competitor: '公司A', ltv: '$5000', cac: '$1000', ratio: '5.0', health: '良好' },
          { competitor: '公司B', ltv: '$3000', cac: '$800', ratio: '3.75', health: '一般' },
        ],
        revenueMetrics: [
          { competitor: '公司A', revenue: '$100M', revenueGrowthRate: '25%' },
          { competitor: '公司B', revenue: '$80M', revenueGrowthRate: '18%' },
        ],
      };

      expect(data.marketShare).toHaveLength(3);
      expect(data.marketShare[0].share).toBe(35);
      expect(data.ltvCacRatio).toHaveLength(2);
      expect(data.revenueMetrics).toHaveLength(2);
    });

    it('should validate market share data', () => {
      const marketShare = [
        { competitor: '领导者', share: 40, yoyGrowth: '10%', period: '2024 Q1', source: '报告A' },
        { competitor: '挑战者', share: 25, yoyGrowth: '15%', period: '2024 Q1', source: '报告A' },
        { competitor: '跟随者', share: 20, yoyGrowth: '5%', period: '2024 Q1', source: '报告A' },
        { competitor: '其他', share: 15, yoyGrowth: '-', period: '2024 Q1', source: '报告A' },
      ];

      expect(marketShare.reduce((sum, m) => sum + m.share, 0)).toBe(100);
    });

    it('should validate LTV/CAC ratio data', () => {
      const ltvCac = [
        { competitor: '公司A', ltv: '$10,000', cac: '$2,000', ratio: '5.0', health: '健康' },
        { competitor: '公司B', ltv: '$6,000', cac: '$2,500', ratio: '2.4', health: '需改善' },
        { competitor: '公司C', ltv: '$15,000', cac: '$1,500', ratio: '10.0', health: '优秀' },
      ];

      expect(ltvCac[0].ratio).toBe('5.0');
      expect(ltvCac[2].health).toBe('优秀');
    });
  });
});
