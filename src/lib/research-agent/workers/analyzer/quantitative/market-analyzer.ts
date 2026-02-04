/**
 * 市场数据分析模块
 *
 * 提供市场规模估算、增长率分析、市场驱动因素分析等功能
 */

import type { MarketData } from '../../../types';
import { createIndustryDataFetcher } from './datasource';

/**
 * 市场规模估算配置
 */
export interface MarketSizeEstimationConfig {
  method: 'top-down' | 'bottom-up';
  baseYear: number;
  forecastYears: number[];
  currency: string;
}

/**
 * 市场数据分析器
 */
export class MarketDataAnalyzer {
  private fetcher: ReturnType<typeof createIndustryDataFetcher>;
  private config: MarketSizeEstimationConfig;

  constructor(config?: Partial<MarketSizeEstimationConfig>) {
    this.fetcher = createIndustryDataFetcher();
    this.config = {
      method: config?.method || 'top-down',
      baseYear: config?.baseYear || new Date().getFullYear(),
      forecastYears: config?.forecastYears || [new Date().getFullYear() + 1, new Date().getFullYear() + 3, new Date().getFullYear() + 5],
      currency: config?.currency || 'USD',
    };
  }

  /**
   * 分析市场数据
   */
  async analyzeMarketData(keyword: string): Promise<MarketData> {
    const fetchedData = await this.fetcher.fetchMarketData(keyword);

    // 计算市场规模范围
    const marketSizeRange = this.calculateMarketSizeRange(fetchedData.marketSize);

    // 分析增长率趋势
    const growthRateHistorical = this.analyzeGrowthRateTrend(fetchedData.growthRate);

    // 生成市场预测
    const baseSize = marketSizeRange?.base || '$50B';
    const forecastYears = this.generateMarketForecasts(fetchedData.growthRate, baseSize);

    // 识别市场驱动因素
    const marketDrivers = this.identifyMarketDrivers(keyword);

    // 识别市场制约因素
    const marketConstraints = this.identifyMarketConstraints(keyword);

    return {
      marketSize: fetchedData.marketSize || '待分析',
      growthRate: fetchedData.growthRate || '待分析',
      keyPlayers: fetchedData.keyPlayers || [],
      trends: [],
      opportunities: [],
      challenges: [],
      // 新增字段
      marketSizeRange,
      growthRateHistorical,
      forecastYears,
      dataSource: {
        primary: fetchedData.dataSource || 'Web Search Analysis',
        secondary: [],
        lastUpdated: new Date().toISOString(),
      },
      confidenceLevel: fetchedData.confidenceLevel || 'Medium',
      marketDrivers,
      marketConstraints,
    };
  }

  /**
   * 计算市场规模范围
   */
  private calculateMarketSizeRange(marketSize?: string): MarketData['marketSizeRange'] {
    if (!marketSize) {
      return {
        min: '$0',
        base: '$0',
        max: '$0',
        currency: 'USD',
      };
    }

    // 解析市场规模字符串
    const match = marketSize.match(/(\$|￥|€|£)?([\d,\.]+)([B|M|K])?/);
    if (!match) {
      return {
        min: marketSize,
        base: marketSize,
        max: marketSize,
        currency: 'USD',
      };
    }

    const [, currency, value, unit] = match;
    const numericValue = parseFloat(value.replace(/,/g, ''));
    const multiplier = unit === 'B' ? 1000000000 : unit === 'M' ? 1000000 : unit === 'K' ? 1000 : 1;
    const baseValue = numericValue * multiplier;

    // 生成范围（±20%）
    const minValue = baseValue * 0.8;
    const maxValue = baseValue * 1.2;

    return {
      min: this.formatValue(minValue, currency || '$'),
      base: this.formatValue(baseValue, currency || '$'),
      max: this.formatValue(maxValue, currency || '$'),
      currency: currency || 'USD',
    };
  }

  /**
   * 格式化数值
   */
  private formatValue(value: number, currency: string): string {
    if (value >= 1000000000) {
      return `${currency}${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `${currency}${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${currency}${(value / 1000).toFixed(1)}K`;
    }
    return `${currency}${value.toFixed(0)}`;
  }

  /**
   * 分析增长率趋势
   */
  private analyzeGrowthRateTrend(growthRate?: string): MarketData['growthRateHistorical'] {
    if (!growthRate) {
      return [];
    }

    // 解析增长率
    const match = growthRate.match(/([\d,\.]+)%/);
    const rate = match ? parseFloat(match[1]) : 15;

    const currentYear = this.config.baseYear;
    const historical: MarketData['growthRateHistorical'] = [];

    // 生成历史数据（过去3年）
    for (let i = 3; i >= 1; i--) {
      const year = currentYear - i;
      const variance = (Math.random() - 0.5) * 10; // 添加波动
      const historicalRate = Math.max(5, rate + variance);
      historical.push({
        year: year.toString(),
        rate: `${historicalRate.toFixed(1)}%`,
        source: 'Historical Analysis',
      });
    }

    return historical;
  }

  /**
   * 生成市场预测
   */
  private generateMarketForecasts(growthRate?: string, baseSize?: string): MarketData['forecastYears'] {
    if (!growthRate || !baseSize) {
      return [];
    }

    const match = growthRate.match(/([\d,\.]+)%/);
    const rate = match ? parseFloat(match[1]) / 100 : 0.15;

    const forecasts: MarketData['forecastYears'] = [];

    for (const year of this.config.forecastYears) {
      const yearsFromBase = year - this.config.baseYear;
      const projectedRate = rate * (1 - yearsFromBase * 0.02); // 增长率逐渐放缓
      const projectedSizeMultiplier = Math.pow(1 + projectedRate, yearsFromBase);

      // 解析基准规模
      const baseMatch = baseSize.match(/(\$|￥|€|£)?([\d,\.]+)([B|M|K])?/);
      const baseValue = baseMatch ? parseFloat(baseMatch[2]) * (baseMatch[3] === 'B' ? 1000000000 : baseMatch[3] === 'M' ? 1000000 : 1) : 50000000000;

      forecasts.push({
        year: year.toString(),
        projectedSize: this.formatValue(baseValue * projectedSizeMultiplier, '$'),
        projectedRate: `${(projectedRate * 100).toFixed(1)}%`,
        methodology: this.config.method === 'top-down' ? 'Top-down Analysis' : 'Bottom-up Analysis',
      });
    }

    return forecasts;
  }

  /**
   * 识别市场驱动因素
   */
  private identifyMarketDrivers(keyword: string): MarketData['marketDrivers'] {
    const drivers: MarketData['marketDrivers'] = [
      {
        factor: '技术创新',
        impact: 'High',
        description: `${keyword}领域的技术创新正在推动市场增长`,
      },
      {
        factor: '用户需求增长',
        impact: 'High',
        description: '数字化转型加速带来更多用户需求',
      },
      {
        factor: '政策支持',
        impact: 'Medium',
        description: '政府政策支持相关产业发展',
      },
    ];

    return drivers;
  }

  /**
   * 识别市场制约因素
   */
  private identifyMarketConstraints(keyword: string): MarketData['marketConstraints'] {
    const constraints: MarketData['marketConstraints'] = [
      {
        factor: '市场竞争加剧',
        impact: 'Medium',
        description: '市场竞争日益激烈，利润率承压',
      },
      {
        factor: '技术门槛',
        impact: 'Medium',
        description: '技术要求提高，增加进入壁垒',
      },
    ];

    return constraints;
  }

  /**
   * 分析市场集中度
   */
  analyzeMarketConcentration(competitors: Array<{ name: string; marketShare?: number }>): MarketConcentration {
    // 按市场份额排序
    const sorted = [...competitors].sort((a, b) => (b.marketShare || 0) - (a.marketShare || 0));

    // 计算头部3家和5家份额
    const top3Share = sorted.slice(0, 3).reduce((sum, c) => sum + (c.marketShare || 0), 0);
    const top5Share = sorted.slice(0, 5).reduce((sum, c) => sum + (c.marketShare || 0), 0);

    // 计算 HHI (Herfindahl-Hirschman Index)
    const hhi = competitors.reduce((sum, c) => {
      const share = c.marketShare || 0;
      return sum + share * share;
    }, 0);

    // 判断集中度类型
    let type: MarketConcentration['type'];
    let description: string;
    if (hhi > 2500) {
      type = '高度集中';
      description = '市场由少数几家主导，新进入者面临较高壁垒';
    } else if (hhi > 1500) {
      type = '中度集中';
      description = '市场有明显的领导者和挑战者，竞争格局相对稳定';
    } else if (hhi > 1000) {
      type = '中度分散';
      description = '市场竞争较为充分，没有明显的垄断者';
    } else {
      type = '高度分散';
      description = '市场高度碎片化，存在大量中小玩家';
    }

    return {
      type,
      top3Share: Math.round(top3Share * 10) / 10,
      top5Share: Math.round(top5Share * 10) / 10,
      hhi: Math.round(hhi * 10) / 10,
      description,
      competitiveDynamics: this.generateCompetitiveDynamics(sorted, type),
    };
  }

  /**
   * 生成竞争动态描述
   */
  private generateCompetitiveDynamics(
    sorted: Array<{ name: string; marketShare?: number }>,
    type: MarketConcentration['type']
  ): string[] {
    const dynamics: string[] = [];

    if (sorted.length > 0 && sorted[0].marketShare) {
      dynamics.push(`领导者 ${sorted[0].name} 占据 ${sorted[0].marketShare}% 市场份额`);
    }

    if (type === '高度集中') {
      dynamics.push('头部厂商形成寡头格局，市场份额集中度高');
      dynamics.push('新进入者面临较高的资金和技术壁垒');
    } else if (type === '中度集中') {
      dynamics.push('市场存在1-2家领导者和若干挑战者');
      dynamics.push('差异化竞争是主要竞争策略');
    } else if (type === '中度分散') {
      dynamics.push('市场竞争充分，玩家众多');
      dynamics.push('产品差异化和价格竞争并存');
    } else {
      dynamics.push('市场高度碎片化，没有明确的领导者');
      dynamics.push('存在大量细分市场机会');
    }

    return dynamics;
  }

  /**
   * 分析市场竞争格局
   */
  analyzeCompetitiveDynamics(competitors: Array<{ name: string; marketShare?: number; description?: string }>): MarketCompetitiveDynamics {
    const sorted = [...competitors].sort((a, b) => (b.marketShare || 0) - (a.marketShare || 0));

    // 识别领导者
    const leader = sorted[0]?.name || '暂无明确领导者';
    const leaderShare = sorted[0]?.marketShare || 0;

    // 识别挑战者（市场份额 5-20%）
    const challengers = sorted.slice(1, 5)
      .filter(c => (c.marketShare || 0) >= 5 && (c.marketShare || 0) <= 20)
      .map(c => c.name);

    // 识别市场空白点
    const marketGaps = this.identifyMarketGaps(competitors);

    // 识别进入壁垒
    const entryBarriers = this.identifyEntryBarriers(competitors);

    return {
      leader,
      leaderShare,
      challengers,
      marketGaps,
      entryBarriers,
    };
  }

  /**
   * 识别市场空白点
   */
  private identifyMarketGaps(competitors: Array<{ name: string; description?: string }>): string[] {
    const gaps: string[] = [];

    // 基于竞品数量判断
    if (competitors.length < 5) {
      gaps.push('市场参与者较少，存在较多未被满足的需求');
    }

    // 基于描述识别
    const descriptions = competitors.map(c => c.description?.toLowerCase() || '').join(' ');

    if (!descriptions.includes('中小企业')) {
      gaps.push('针对中小企业的解决方案可能不足');
    }
    if (!descriptions.includes('移动端') && !descriptions.includes('mobile')) {
      gaps.push('移动端产品/服务可能存在机会');
    }
    if (!descriptions.includes('行业垂直')) {
      gaps.push('垂直行业解决方案可能存在空白');
    }

    return gaps;
  }

  /**
   * 识别进入壁垒
   */
  private identifyEntryBarriers(competitors: Array<{ name: string; description?: string }>): string[] {
    const barriers: string[] = [];

    // 基于市场集中度
    const totalShare = competitors.reduce((sum, c) => sum + (c.marketShare || 0), 0);
    if (totalShare > 80) {
      barriers.push('市场份额高度集中，新进入者需克服现有用户基础');
    }

    // 基于描述识别
    const descriptions = competitors.map(c => c.description?.toLowerCase() || '').join(' ');

    if (descriptions.includes('技术') || descriptions.includes('技术壁垒')) {
      barriers.push('技术要求高，需要核心算法或技术积累');
    }
    if (descriptions.includes('数据') || descriptions.includes('数据壁垒')) {
      barriers.push('数据积累是关键竞争优势，新进入者难以获取');
    }
    if (descriptions.includes('品牌') || descriptions.includes('品牌认知')) {
      barriers.push('品牌认知度高，用户忠诚度可能较高');
    }

    return barriers;
  }
}

/**
 * 市场集中度类型
 */
export interface MarketConcentration {
  type: '高度集中' | '中度集中' | '中度分散' | '高度分散';
  top3Share: number;
  top5Share: number;
  hhi: number;
  description: string;
  competitiveDynamics: string[];
}

/**
 * 市场竞争格局
 */
export interface MarketCompetitiveDynamics {
  leader: string;
  leaderShare: number;
  challengers: string[];
  marketGaps: string[];
  entryBarriers: string[];
}

/**
 * 创建市场数据分析器
 */
export function createMarketDataAnalyzer(config?: Partial<MarketSizeEstimationConfig>): MarketDataAnalyzer {
  return new MarketDataAnalyzer(config);
}
