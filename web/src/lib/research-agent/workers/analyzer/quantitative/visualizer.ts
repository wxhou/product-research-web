/**
 * 数据可视化模块
 *
 * 提供 Mermaid 图表生成功能，支持多种图表类型
 */

import type { MermaidChart } from '../../../types';
import type { MarketData, CompetitorQuantitative } from '../../../types';

/**
 * 图表样式配置
 */
export interface ChartStyleConfig {
  theme: 'default' | 'dark' | 'forest' | 'neutral';
  width?: number;
  height?: number;
}

/**
 * 数据可视化器
 */
export class DataVisualizer {
  private styleConfig: ChartStyleConfig;

  constructor(styleConfig?: Partial<ChartStyleConfig>) {
    this.styleConfig = {
      theme: styleConfig?.theme || 'default',
      ...styleConfig,
    };
  }

  /**
   * 生成市场规模趋势图（柱状图+折线图）
   */
  generateMarketSizeTrendChart(data: MarketData): MermaidChart {
    const historical = data.growthRateHistorical || [];
    const forecast = data.forecastYears || [];
    const range = data.marketSizeRange;

    let chartData = '';
    let xAxisLabels = '';

    // 历史数据
    for (const h of historical) {
      const sizeValue = this.parseMarketSize(range?.base || '$50B');
      chartData += `${h.year} : ${sizeValue}\n`;
      xAxisLabels += `${h.year} `;
    }

    // 预测数据（虚线）
    const lastHistorical = historical[historical.length - 1];
    if (lastHistorical) {
      chartData += `${lastHistorical.year} : ${this.parseMarketSize(range?.base || '$50B')}\n`;
      xAxisLabels += `${lastHistorical.year} `;
    }

    for (const f of forecast) {
      const sizeValue = this.parseMarketSize(f.projectedSize);
      chartData += `${f.year} : ${sizeValue}\n`;
      xAxisLabels += `${f.year} `;
    }

    const code = `xychart-beta
    title "市场规模趋势与预测"
    x-axis [${xAxisLabels}]
    y-axis "市场规模 (USD)" 0 --> 200
    bar [30 45 60 75 ${this.parseMarketSize(range?.base || '$50B')} ${this.parseMarketSize(forecast[0]?.projectedSize || '$60B')} ${this.parseMarketSize(forecast[1]?.projectedSize || '$80B')}]`;

    return {
      id: 'market-size-trend',
      type: 'xychart',
      title: '市场规模趋势与预测',
      code,
    };
  }

  /**
   * 生成市场份额饼图
   */
  generateMarketShareChart(data: CompetitorQuantitative): MermaidChart {
    const marketShare = data.marketShare || [];

    let pieData = '';
    for (const item of marketShare) {
      const safeName = item.competitor.replace(/"/g, "'");
      pieData += `    "${safeName}" : ${item.share}\n`;
    }

    if (pieData === '') {
      pieData = '    "暂无数据" : 1';
    }

    const code = `pie title 市场份额分布 (${new Date().getFullYear()})\n${pieData}`;

    return {
      id: 'market-share-distribution',
      type: 'pie',
      title: '市场份额分布',
      code,
    };
  }

  /**
   * 生成竞品对比雷达图
   */
  generateCompetitorRadarChart(competitors: string[], dimensions: string[], scores: number[][]): MermaidChart {
    if (competitors.length === 0 || dimensions.length === 0) {
      return {
        id: 'competitor-radar',
        type: 'radar',
        title: '竞品对比雷达图',
        code: `radar
          title 竞品对比
          axes: 产品功能, 价格竞争力, 用户体验, 技术创新, 市场覆盖
          竞品A: [80, 70, 85, 75, 60]
          竞品B: [70, 85, 75, 80, 70]
          目标产品: [75, 80, 70, 85, 65]`,
      };
    }

    let radarData = `radar
      title 竞品对比
      axes: ${dimensions.join(', ')}\n`;

    for (let i = 0; i < competitors.length; i++) {
      const competitorScores = scores[i] || dimensions.map(() => 70);
      const safeName = competitors[i].replace(/"/g, "'");
      radarData += `  ${safeName}: [${competitorScores.join(', ')}]\n`;
    }

    return {
      id: 'competitor-radar',
      type: 'radar',
      title: '竞品对比雷达图',
      code: radarData,
    };
  }

  /**
   * 生成用户画像热力图数据
   */
  generateUserSegmentationHeatmap(segments: string[], attributes: string[], scores: number[][]): string {
    let heatmap = '### 用户细分热力图\n\n';
    heatmap += '| 用户群体 | ' + attributes.join(' | ') + ' |\n';
    heatmap += '|' + attributes.length + 1 + '---|'.repeat(attributes.length) + '\n';

    for (let i = 0; i < segments.length; i++) {
      const segmentScores = scores[i] || attributes.map(() => 0);
      const scoreCells = segmentScores
        .map((s) => {
          const color = s >= 80 ? '🟢' : s >= 60 ? '🟡' : s >= 40 ? '🟠' : '🔴';
          return `${color} ${s}%`;
        })
        .join(' | ');
      heatmap += `| **${segments[i]}** | ${scoreCells} |\n`;
    }

    heatmap += '\n**说明：** 🟢 高 | 🟡 中高 | 🟠 中低 | 🔴 低\n';

    return heatmap;
  }

  /**
   * 生成实施路线图甘特图
   */
  generateRoadmapGanttChart(
    phases: Array<{
      name: string;
      start: number;
      duration: number;
      milestones: string[];
    }>
  ): MermaidChart {
    let ganttData = `gantt
      title 实施路线图
      dateFormat  YYYY-MM-DD
      section 短期 (0-6个月)\n`;

    const now = new Date();
    const sectionDuration = 6;

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const sectionName = phase.name;
      const startMonth = phase.start;
      const endMonth = phase.start + phase.duration;

      const startDate = new Date(now.getFullYear(), now.getMonth() + startMonth, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + endMonth, 0);

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      ganttData += `    ${sectionName} : ${sectionName.toLowerCase().replace(/\s+/g, '-')}, ${startStr}, ${endStr}\n`;
    }

    return {
      id: 'implementation-roadmap',
      type: 'gantt',
      title: '实施路线图',
      code: ganttData,
    };
  }

  /**
   * 生成增长趋势预测图
   */
  generateGrowthTrendChart(
    periods: string[],
    values: number[]
  ): MermaidChart {
    const xAxis = periods.join(', ');

    const code = `xychart-beta
    title "增长趋势预测"
    x-axis [${xAxis}]
    y-axis "增长率 (%)" 0 --> 50
    bar [${values.join(', ')}]`;

    return {
      id: 'growth-trend',
      type: 'xychart',
      title: '增长趋势预测',
      code,
    };
  }

  /**
   * 解析市场规模字符串为数值
   */
  private parseMarketSize(size: string): number {
    const match = size.match(/(\$|￥|€|£)?([\d,\.]+)([B|M|K])?/);
    if (!match) return 50;

    const [, , value, unit] = match;
    const numericValue = parseFloat(value.replace(/,/g, ''));
    const multiplier = unit === 'B' ? 1 : unit === 'M' ? 0.01 : unit === 'K' ? 0.00001 : 1;

    // 归一化到 0-100 范围用于图表
    return Math.min(100, Math.max(1, numericValue * multiplier));
  }

  /**
   * 生成产业链关系图
   */
  generateIndustryChainDiagram(
    upstream: string[],
    midstream: string[],
    downstream: string[]
  ): MermaidChart {
    const diagram = `graph LR
      subgraph 上游
      U1[${upstream[0] || '原材料'}]
      U2[${upstream[1] || '技术'}]
      end

      subgraph 中游
      M1[${midstream[0] || '产品开发'}]
      M2[${midstream[1] || '服务提供'}]
      end

      subgraph 下游
      D1[${downstream[0] || '用户'}]
      D2[${downstream[1] || '客户'}]
      end

      U1 --> M1
      U2 --> M1
      M1 --> D1
      M1 --> D2
      M2 --> D1
      M2 --> D2`;

    return {
      id: 'industry-chain',
      type: 'graph',
      title: '产业链上下游关系',
      code: diagram,
    };
  }
}

/**
 * 创建数据可视化器
 */
export function createDataVisualizer(styleConfig?: Partial<ChartStyleConfig>): DataVisualizer {
  return new DataVisualizer(styleConfig);
}
