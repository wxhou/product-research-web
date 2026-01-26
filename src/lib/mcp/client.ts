/**
 * MCP Client Module
 *
 * ⚠️ 当前为模拟实现，返回预定义的测试数据
 *
 * 计划实现真正的 MCP 服务器连接：
 * 1. 使用 @modelcontextprotocol/sdk 连接 MCP Server
 * 2. 或通过 HTTP API 调用外部搜索服务
 *
 * 支持的数据源：
 * - brave: Brave Search API
 * - exa: Exa API
 * - firecrawl: Firecrawl API
 * - context7: Context7 API
 */

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  source: string;
}

export interface SearchOptions {
  query: string;
  source: 'brave' | 'exa' | 'firecrawl' | 'context7';
  limit?: number;
}

// 模拟MCP搜索函数
async function mockSearch(options: SearchOptions): Promise<SearchResult[]> {
  const { query, source, limit = 10 } = options;

  // 模拟延迟
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

  // 根据数据源返回不同的模拟结果
  const mockData: Record<string, SearchResult[]> = {
    brave: [
      {
        title: `${query} - 行业解决方案`,
        url: `https://brave.com/${query.toLowerCase().replace(/\s+/g, '-')}`,
        content: `提供全面的${query}解决方案，集成AI算法和IoT传感器技术。`,
        source: 'brave',
      },
      {
        title: `${query} - 产品功能特性`,
        url: `https://brave.com/features`,
        content: '实时监测、故障预测、预警告警等核心功能模块介绍。',
        source: 'brave',
      },
      {
        title: `${query} - 客户成功案例`,
        url: `https://brave.com/case-studies`,
        content: '已成功应用于制造业、能源、交通等多个行业。',
        source: 'brave',
      },
    ],
    exa: [
      {
        title: `${query} - 技术白皮书`,
        url: 'https://exa.ai/papers/technical-whitepaper',
        content: '深度解析预测性维护的技术原理、算法实现和最佳实践。',
        source: 'exa',
      },
      {
        title: `${query} - 学术研究`,
        url: 'https://exa.ai/papers/academic-research',
        content: '基于深度学习的设备故障预测方法研究论文。',
        source: 'exa',
      },
    ],
    firecrawl: [
      {
        title: `${query} - 竞品分析报告`,
        url: 'https://firecrawl.dev/competitor-analysis',
        content: '详细分析主要竞争对手的产品功能、定价策略和市场定位。',
        source: 'firecrawl',
      },
      {
        title: `${query} - 产品评测`,
        url: 'https://firecrawl.dev/reviews',
        content: '客观评测各产品的优缺点和使用体验。',
        source: 'firecrawl',
      },
    ],
    context7: [
      {
        title: `${query} - 官方文档`,
        url: 'https://context7.com/docs',
        content: '完整的API文档、SDK使用指南和开发教程。',
        source: 'context7',
      },
    ],
  };

  const results = mockData[source] || [];
  return results.slice(0, limit);
}

// MCP客户端类
export class MCPClient {
  private enabledSources: Set<string> = new Set(['brave', 'exa']);

  constructor() {
    // 初始化时从数据库加载启用的数据源
    this.loadEnabledSources();
  }

  private async loadEnabledSources() {
    try {
      // 动态导入避免循环依赖
      const { dataSourceDb } = await import('@/lib/db');
      const sources = dataSourceDb.getActive.all() as Array<{ type: string }>;
      this.enabledSources = new Set(sources.map((s) => s.type));
    } catch (error) {
      console.error('Failed to load enabled sources:', error);
    }
  }

  // 启用/禁用数据源
  async setEnabled(source: string, enabled: boolean) {
    if (enabled) {
      this.enabledSources.add(source);
    } else {
      this.enabledSources.delete(source);
    }
  }

  // 检查数据源是否启用
  isEnabled(source: string): boolean {
    return this.enabledSources.has(source);
  }

  // 搜索单个数据源
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { source } = options;

    // 检查是否启用
    if (!this.isEnabled(source)) {
      return [];
    }

    // 如果是生产环境，这里会调用实际的MCP服务器
    // 目前使用模拟实现
    return mockSearch(options);
  }

  // 并行搜索多个数据源
  async searchAll(sources: string[], query: string, limit?: number): Promise<SearchResult[]> {
    const results = await Promise.all(
      sources.map((source) =>
        this.search({ query, source: source as SearchOptions['source'], limit })
      )
    );

    return results.flat();
  }

  // 获取所有启用的数据源
  getEnabledSources(): string[] {
    return Array.from(this.enabledSources);
  }
}

// 单例实例
let mcpClient: MCPClient | null = null;

export function getMCPClient(): MCPClient {
  if (!mcpClient) {
    mcpClient = new MCPClient();
  }
  return mcpClient;
}
