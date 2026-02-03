/**
 * Data Visualizer Tests
 *
 * Tests for DataVisualizer class:
 * - Market size trend chart generation
 * - Market share chart generation
 * - Competitor radar chart generation
 * - User segmentation heatmap generation
 * - Roadmap Gantt chart generation
 * - Growth trend chart generation
 * - Industry chain diagram generation
 */

import { createDataVisualizer, DataVisualizer } from '../research-agent/workers/analyzer/quantitative/visualizer';
import type { MarketData, CompetitorQuantitative, MermaidChart } from '../../research-agent/types';

describe('DataVisualizer', () => {
  let visualizer: DataVisualizer;

  beforeEach(() => {
    visualizer = createDataVisualizer();
  });

  describe('constructor', () => {
    it('should create visualizer with default theme', () => {
      expect(visualizer).toBeInstanceOf(DataVisualizer);
    });

    it('should accept custom theme configuration', () => {
      const customVisualizer = createDataVisualizer({ theme: 'dark' });
      expect(customVisualizer).toBeInstanceOf(DataVisualizer);
    });

    it('should accept width and height configuration', () => {
      const customVisualizer = createDataVisualizer({ width: 800, height: 600 });
      expect(customVisualizer).toBeInstanceOf(DataVisualizer);
    });
  });

  describe('generateMarketSizeTrendChart', () => {
    it('should return MermaidChart object', () => {
      const marketData: MarketData = {
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['A', 'B'],
        trends: [],
        opportunities: [],
        challenges: [],
        growthRateHistorical: [
          { year: '2022', rate: '12%', source: 'Test' },
          { year: '2023', rate: '14%', source: 'Test' },
        ],
        forecastYears: [
          { year: '2025', projectedSize: '$60B', projectedRate: '16%', methodology: 'Test' },
          { year: '2026', projectedSize: '$70B', projectedRate: '15%', methodology: 'Test' },
        ],
        marketSizeRange: {
          min: '$40B',
          base: '$50B',
          max: '$60B',
          currency: 'USD',
        },
      };

      const chart = visualizer.generateMarketSizeTrendChart(marketData);

      expect(chart).toHaveProperty('id');
      expect(chart).toHaveProperty('type');
      expect(chart).toHaveProperty('title');
      expect(chart).toHaveProperty('code');
      expect(chart.type).toBe('xychart');
    });

    it('should include market size trend in title', () => {
      const marketData: MarketData = {
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['A'],
        trends: [],
        opportunities: [],
        challenges: [],
      };

      const chart = visualizer.generateMarketSizeTrendChart(marketData);

      expect(chart.title).toContain('市场规模趋势与预测');
    });

    it('should handle empty historical data', () => {
      const marketData: MarketData = {
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['A'],
        trends: [],
        opportunities: [],
        challenges: [],
        growthRateHistorical: [],
        forecastYears: [],
        marketSizeRange: { min: '$40B', base: '$50B', max: '$60B', currency: 'USD' },
      };

      const chart = visualizer.generateMarketSizeTrendChart(marketData);

      expect(chart).toBeDefined();
      expect(chart.code).toContain('xychart-beta');
    });

    it('should include x-axis labels', () => {
      const marketData: MarketData = {
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['A'],
        trends: [],
        opportunities: [],
        challenges: [],
        growthRateHistorical: [
          { year: '2022', rate: '12%', source: 'Test' },
          { year: '2023', rate: '14%', source: 'Test' },
        ],
        marketSizeRange: { min: '$40B', base: '$50B', max: '$60B', currency: 'USD' },
      };

      const chart = visualizer.generateMarketSizeTrendChart(marketData);

      expect(chart.code).toContain('x-axis');
      expect(chart.code).toContain('2022');
      expect(chart.code).toContain('2023');
    });

    it('should include forecast years', () => {
      const marketData: MarketData = {
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['A'],
        trends: [],
        opportunities: [],
        challenges: [],
        growthRateHistorical: [
          { year: '2023', rate: '14%', source: 'Test' },
        ],
        forecastYears: [
          { year: '2025', projectedSize: '$60B', projectedRate: '16%', methodology: 'Test' },
          { year: '2026', projectedSize: '$70B', projectedRate: '15%', methodology: 'Test' },
        ],
        marketSizeRange: { min: '$40B', base: '$50B', max: '$60B', currency: 'USD' },
      };

      const chart = visualizer.generateMarketSizeTrendChart(marketData);

      expect(chart.code).toContain('2025');
      expect(chart.code).toContain('2026');
    });
  });

  describe('generateMarketShareChart', () => {
    it('should return pie chart', () => {
      const data: CompetitorQuantitative = {
        marketShare: [
          { competitor: 'Leader A', share: 35, period: '2024', source: 'Test' },
          { competitor: 'Leader B', share: 28, period: '2024', source: 'Test' },
        ],
      };

      const chart = visualizer.generateMarketShareChart(data);

      expect(chart.type).toBe('pie');
      expect(chart.title).toContain('市场份额');
    });

    it('should include competitor names in chart', () => {
      const data: CompetitorQuantitative = {
        marketShare: [
          { competitor: 'Leader A', share: 35, period: '2024', source: 'Test' },
          { competitor: 'Leader B', share: 28, period: '2024', source: 'Test' },
        ],
      };

      const chart = visualizer.generateMarketShareChart(data);

      expect(chart.code).toContain('Leader A');
      expect(chart.code).toContain('Leader B');
    });

    it('should include share percentages', () => {
      const data: CompetitorQuantitative = {
        marketShare: [
          { competitor: 'A', share: 35, period: '2024', source: 'Test' },
          { competitor: 'B', share: 28, period: '2024', source: 'Test' },
        ],
      };

      const chart = visualizer.generateMarketShareChart(data);

      expect(chart.code).toContain('35');
      expect(chart.code).toContain('28');
    });

    it('should handle empty market share data', () => {
      const data: CompetitorQuantitative = {};

      const chart = visualizer.generateMarketShareChart(data);

      expect(chart.code).toContain('暂无数据');
    });

    it('should sanitize competitor names with quotes', () => {
      const data: CompetitorQuantitative = {
        marketShare: [
          { competitor: 'Company "A"', share: 50, period: '2024', source: 'Test' },
        ],
      };

      const chart = visualizer.generateMarketShareChart(data);

      expect(chart.code).not.toContain('"Company "A""');
    });

    it('should include current year in title', () => {
      const data: CompetitorQuantitative = {
        marketShare: [
          { competitor: 'A', share: 50, period: '2024', source: 'Test' },
        ],
      };

      const chart = visualizer.generateMarketShareChart(data);

      expect(chart.title).toContain(new Date().getFullYear().toString());
    });
  });

  describe('generateCompetitorRadarChart', () => {
    it('should return radar chart', () => {
      const chart = visualizer.generateCompetitorRadarChart([], [], []);

      expect(chart.type).toBe('radar');
      expect(chart.title).toContain('竞品对比');
    });

    it('should use default data when no competitors provided', () => {
      const chart = visualizer.generateCompetitorRadarChart([], [], []);

      expect(chart.code).toContain('竞品A');
      expect(chart.code).toContain('竞品B');
      expect(chart.code).toContain('目标产品');
    });

    it('should include competitor names', () => {
      const chart = visualizer.generateCompetitorRadarChart(
        ['Competitor A', 'Competitor B'],
        ['Feature', 'Price'],
        [[80, 70], [75, 85]]
      );

      expect(chart.code).toContain('Competitor A');
      expect(chart.code).toContain('Competitor B');
    });

    it('should include dimensions', () => {
      const dimensions = ['产品功能', '价格竞争力', '用户体验'];
      const chart = visualizer.generateCompetitorRadarChart(
        ['A', 'B'],
        dimensions,
        [[80, 70, 85], [75, 85, 80]]
      );

      expect(chart.code).toContain('产品功能');
      expect(chart.code).toContain('价格竞争力');
      expect(chart.code).toContain('用户体验');
    });

    it('should include scores for each competitor', () => {
      const chart = visualizer.generateCompetitorRadarChart(
        ['A', 'B'],
        ['Feature', 'Price'],
        [[80, 70], [75, 85]]
      );

      expect(chart.code).toContain('80');
      expect(chart.code).toContain('70');
      expect(chart.code).toContain('75');
      expect(chart.code).toContain('85');
    });

    it('should sanitize competitor names', () => {
      const chart = visualizer.generateCompetitorRadarChart(
        ['Company "A"'],
        ['Feature'],
        [[80]]
      );

      expect(chart.code).not.toContain('"Company "A""');
    });
  });

  describe('generateUserSegmentationHeatmap', () => {
    it('should return markdown table string', () => {
      const heatmap = visualizer.generateUserSegmentationHeatmap(
        ['Segment A', 'Segment B'],
        ['Feature 1', 'Feature 2'],
        [[80, 70], [60, 90]]
      );

      expect(typeof heatmap).toBe('string');
      expect(heatmap).toContain('### 用户细分热力图');
    });

    it('should include segment names as rows', () => {
      const heatmap = visualizer.generateUserSegmentationHeatmap(
        ['职场新人', '企业中层'],
        ['使用频率', '付费意愿'],
        [[80, 60], [70, 80]]
      );

      expect(heatmap).toContain('职场新人');
      expect(heatmap).toContain('企业中层');
    });

    it('should include attributes as columns', () => {
      const heatmap = visualizer.generateUserSegmentationHeatmap(
        ['Segment A'],
        ['使用频率', '付费意愿', '活跃度'],
        [[80, 60, 70]]
      );

      expect(heatmap).toContain('使用频率');
      expect(heatmap).toContain('付费意愿');
      expect(heatmap).toContain('活跃度');
    });

    it('should include color indicators for scores', () => {
      const heatmap = visualizer.generateUserSegmentationHeatmap(
        ['Segment A'],
        ['Feature'],
        [[85]]
      );

      expect(heatmap).toContain('🟢');
    });

    it('should use different colors for different score ranges', () => {
      const heatmap = visualizer.generateUserSegmentationHeatmap(
        ['A', 'B', 'C', 'D'],
        ['Feature'],
        [[85], [65], [45], [25]]
      );

      expect(heatmap).toContain('🟢');
      expect(heatmap).toContain('🟡');
      expect(heatmap).toContain('🟠');
      expect(heatmap).toContain('🔴');
    });

    it('should include legend', () => {
      const heatmap = visualizer.generateUserSegmentationHeatmap(
        ['Segment A'],
        ['Feature'],
        [[50]]
      );

      expect(heatmap).toContain('**说明：**');
    });

    it('should include percentage values', () => {
      const heatmap = visualizer.generateUserSegmentationHeatmap(
        ['Segment A'],
        ['Feature'],
        [[75]]
      );

      expect(heatmap).toContain('75%');
    });

    it('should handle empty segments', () => {
      const heatmap = visualizer.generateUserSegmentationHeatmap(
        [],
        [],
        []
      );

      expect(heatmap).toContain('### 用户细分热力图');
    });
  });

  describe('generateRoadmapGanttChart', () => {
    it('should return gantt chart', () => {
      const chart = visualizer.generateRoadmapGanttChart([
        { name: 'Phase 1', start: 0, duration: 3, milestones: ['M1'] },
      ]);

      expect(chart.type).toBe('gantt');
      expect(chart.title).toContain('实施路线图');
    });

    it('should include phase names', () => {
      const chart = visualizer.generateRoadmapGanttChart([
        { name: '产品开发', start: 0, duration: 6, milestones: ['MVP发布'] },
      ]);

      expect(chart.code).toContain('产品开发');
    });

    it('should include date format', () => {
      const chart = visualizer.generateRoadmapGanttChart([
        { name: 'Phase 1', start: 0, duration: 3, milestones: [] },
      ]);

      expect(chart.code).toContain('dateFormat');
      expect(chart.code).toContain('YYYY-MM-DD');
    });

    it('should include current year in dates', () => {
      const chart = visualizer.generateRoadmapGanttChart([
        { name: 'Phase 1', start: 0, duration: 1, milestones: [] },
      ]);

      const currentYear = new Date().getFullYear().toString();
      expect(chart.code).toContain(currentYear);
    });

    it('should handle multiple phases', () => {
      const chart = visualizer.generateRoadmapGanttChart([
        { name: '短期目标', start: 0, duration: 3, milestones: [] },
        { name: '中期目标', start: 3, duration: 6, milestones: [] },
        { name: '长期目标', start: 9, duration: 12, milestones: [] },
      ]);

      expect(chart.code).toContain('短期目标');
      expect(chart.code).toContain('中期目标');
      expect(chart.code).toContain('长期目标');
    });

    it('should generate valid date strings', () => {
      const chart = visualizer.generateRoadmapGanttChart([
        { name: 'Phase 1', start: 0, duration: 1, milestones: [] },
      ]);

      // Should match date format YYYY-MM-DD
      expect(chart.code).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('generateGrowthTrendChart', () => {
    it('should return xychart', () => {
      const chart = visualizer.generateGrowthTrendChart(
        ['2023', '2024', '2025'],
        [10, 15, 20]
      );

      expect(chart.type).toBe('xychart');
      expect(chart.title).toContain('增长趋势');
    });

    it('should include x-axis labels', () => {
      const chart = visualizer.generateGrowthTrendChart(
        ['2023', '2024', '2025'],
        [10, 15, 20]
      );

      expect(chart.code).toContain('2023');
      expect(chart.code).toContain('2024');
      expect(chart.code).toContain('2025');
    });

    it('should include bar data', () => {
      const chart = visualizer.generateGrowthTrendChart(
        ['2023', '2024'],
        [10, 15]
      );

      expect(chart.code).toContain('bar');
      expect(chart.code).toContain('10');
      expect(chart.code).toContain('15');
    });

    it('should include y-axis label', () => {
      const chart = visualizer.generateGrowthTrendChart(
        ['2023'],
        [10]
      );

      expect(chart.code).toContain('增长率 (%)');
    });
  });

  describe('generateIndustryChainDiagram', () => {
    it('should return graph chart', () => {
      const chart = visualizer.generateIndustryChainDiagram(
        ['上游A', '上游B'],
        ['中游A', '中游B'],
        ['下游A', '下游B']
      );

      expect(chart.type).toBe('graph');
      expect(chart.title).toContain('产业链');
    });

    it('should include upstream nodes', () => {
      const chart = visualizer.generateIndustryChainDiagram(
        ['原材料', '技术'],
        [],
        []
      );

      expect(chart.code).toContain('上游');
      expect(chart.code).toContain('原材料');
      expect(chart.code).toContain('技术');
    });

    it('should include midstream nodes', () => {
      const chart = visualizer.generateIndustryChainDiagram(
        [],
        ['产品开发', '服务提供'],
        []
      );

      expect(chart.code).toContain('中游');
      expect(chart.code).toContain('产品开发');
      expect(chart.code).toContain('服务提供');
    });

    it('should include downstream nodes', () => {
      const chart = visualizer.generateIndustryChainDiagram(
        [],
        [],
        ['用户', '客户']
      );

      expect(chart.code).toContain('下游');
      expect(chart.code).toContain('用户');
      expect(chart.code).toContain('客户');
    });

    it('should create connections between tiers', () => {
      const chart = visualizer.generateIndustryChainDiagram(
        ['U1'],
        ['M1'],
        ['D1']
      );

      expect(chart.code).toContain('-->');
    });

    it('should use default values for empty inputs', () => {
      const chart = visualizer.generateIndustryChainDiagram([], [], []);

      expect(chart.code).toContain('原材料');
      expect(chart.code).toContain('产品开发');
      expect(chart.code).toContain('用户');
    });
  });

  describe('parseMarketSize', () => {
    it('should parse billion values', () => {
      const value = (visualizer as any).parseMarketSize('$50B');
      expect(value).toBe(50);
    });

    it('should parse million values', () => {
      const value = (visualizer as any).parseMarketSize('$50M');
      expect(value).toBe(0.5);
    });

    it('should return default for invalid input', () => {
      const value = (visualizer as any).parseMarketSize('invalid');
      expect(value).toBe(50);
    });

    it('should handle CNY currency', () => {
      const value = (visualizer as any).parseMarketSize('￥100B');
      expect(value).toBe(100);
    });

    it('should handle EUR currency', () => {
      const value = (visualizer as any).parseMarketSize('€50B');
      expect(value).toBe(50);
    });

    it('should handle GBP currency', () => {
      const value = (visualizer as any).parseMarketSize('£50B');
      expect(value).toBe(50);
    });
  });

  describe('MermaidChart format', () => {
    it('should have unique IDs for different chart types', () => {
      const marketChart = visualizer.generateMarketSizeTrendChart({
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['A'],
        trends: [],
        opportunities: [],
        challenges: [],
      });

      const shareChart = visualizer.generateMarketShareChart({
        marketShare: [{ competitor: 'A', share: 50, period: '2024', source: 'Test' }],
      });

      expect(marketChart.id).not.toBe(shareChart.id);
    });

    it('should have code starting with chart type keyword', () => {
      const marketChart = visualizer.generateMarketSizeTrendChart({
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['A'],
        trends: [],
        opportunities: [],
        challenges: [],
      });

      expect(marketChart.code).toMatch(/^(xychart-beta|pie|radar|gantt|graph)/);
    });
  });
});
