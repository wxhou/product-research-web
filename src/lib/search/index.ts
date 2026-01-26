/**
 * 统一搜索服务层
 *
 * 支持多个搜索数据源的统一接口
 * 可配置启用/禁用不同的数据源
 */

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  source: string;
}

export interface SearchOptions {
  query: string;
  source: SearchSource;
  limit?: number;
}

// 支持的搜索数据源
export type SearchSource = 'brave' | 'exa' | 'firecrawl' | 'context7';

// 搜索服务接口
interface SearchService {
  name: string;
  enabled: boolean;
  search(query: string, limit?: number): Promise<SearchResult[]>;
}

// Brave Search 服务
class BraveSearchService implements SearchService {
  name = 'Brave Search';
  enabled = true;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    // TODO: 实现真正的 Brave Search API 调用
    // API 文档: https://api.search.brave.com/api/docs

    // 模拟实现 - 实际使用时替换为真实 API 调用
    const mockResults: SearchResult[] = [
      {
        title: `${query} - 行业解决方案`,
        url: `https://example.com/${query.toLowerCase().replace(/\s+/g, '-')}`,
        content: `提供全面的${query}解决方案，集成AI算法和先进技术。`,
        source: 'brave',
      },
      {
        title: `${query} - 产品功能特性`,
        url: 'https://example.com/features',
        content: '核心功能模块介绍，包括实时监测、智能分析等。',
        source: 'brave',
      },
      {
        title: `${query} - 客户成功案例`,
        url: 'https://example.com/case-studies',
        content: '已成功应用于多个行业，积累丰富实践经验。',
        source: 'brave',
      },
    ];

    return mockResults.slice(0, limit);
  }
}

// Exa Search 服务
class ExaSearchService implements SearchService {
  name = 'Exa';
  enabled = true;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    // TODO: 实现真正的 Exa API 调用
    // API 文档: https://docs.exa.ai/api-reference

    const mockResults: SearchResult[] = [
      {
        title: `${query} - 技术白皮书`,
        url: 'https://exa.ai/papers/technical-whitepaper',
        content: '深度解析技术原理、算法实现和最佳实践。',
        source: 'exa',
      },
      {
        title: `${query} - 学术研究`,
        url: 'https://exa.ai/papers/academic-research',
        content: '相关领域的学术论文和研究资料。',
        source: 'exa',
      },
    ];

    return mockResults.slice(0, limit);
  }
}

// Firecrawl 服务（网页抓取）
class FirecrawlService implements SearchService {
  name = 'Firecrawl';
  enabled = false;

  async search(query: string, limit = 5): Promise<SearchResult[]> {
    // TODO: 实现真正的 Firecrawl API 调用
    // API 文档: https://docs.firecrawl.dev/api-reference

    const mockResults: SearchResult[] = [
      {
        title: `${query} - 竞品分析报告`,
        url: 'https://firecrawl.dev/competitor-analysis',
        content: '详细分析主要竞争对手的产品功能和定位。',
        source: 'firecrawl',
      },
    ];

    return mockResults.slice(0, limit);
  }
}

// Context7 服务（文档搜索）
class Context7Service implements SearchService {
  name = 'Context7';
  enabled = false;

  async search(query: string, limit = 5): Promise<SearchResult[]> {
    // TODO: 实现真正的 Context7 API 调用

    const mockResults: SearchResult[] = [
      {
        title: `${query} - 官方文档`,
        url: 'https://context7.com/docs',
        content: '完整的 API 文档、SDK 使用指南和教程。',
        source: 'context7',
      },
    ];

    return mockResults.slice(0, limit);
  }
}

// 搜索服务管理器
export class SearchServiceManager {
  private services: Map<SearchSource, SearchService> = new Map();
  private enabledSources: Set<SearchSource> = new Set(['brave', 'exa']);

  constructor() {
    // 注册所有搜索服务
    this.services.set('brave', new BraveSearchService());
    this.services.set('exa', new ExaSearchService());
    this.services.set('firecrawl', new FirecrawlService());
    this.services.set('context7', new Context7Service());

    // 从数据库加载启用的数据源
    this.loadEnabledSources();
  }

  private async loadEnabledSources() {
    try {
      const { dataSourceDb } = await import('@/lib/db');
      const sources = dataSourceDb.getActive.all() as Array<{ type: string }>;
      this.enabledSources = new Set(sources.map(s => s.type as SearchSource));
    } catch (error) {
      console.error('Failed to load enabled sources:', error);
    }
  }

  // 设置数据源启用状态
  setEnabled(source: SearchSource, enabled: boolean) {
    if (enabled) {
      this.enabledSources.add(source);
    } else {
      this.enabledSources.delete(source);
    }
  }

  // 检查数据源是否启用
  isEnabled(source: SearchSource): boolean {
    return this.enabledSources.has(source);
  }

  // 获取所有启用的数据源
  getEnabledSources(): SearchSource[] {
    return Array.from(this.enabledSources);
  }

  // 搜索单个数据源
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { source } = options;

    if (!this.isEnabled(source)) {
      return [];
    }

    const service = this.services.get(source);
    if (!service) {
      return [];
    }

    return service.search(options.query, options.limit);
  }

  // 并行搜索多个数据源
  async searchAll(sources: SearchSource[], query: string, limit?: number): Promise<SearchResult[]> {
    const results = await Promise.all(
      sources
        .filter(s => this.isEnabled(s))
        .map(source => this.search({ query, source, limit }))
    );

    return results.flat();
  }

  // 获取所有已注册的服务
  getAllServices(): Array<{ source: SearchSource; name: string; enabled: boolean }> {
    return Array.from(this.services.entries()).map(([source, service]) => ({
      source,
      name: service.name,
      enabled: this.isEnabled(source),
    }));
  }
}

// 单例实例
let serviceManager: SearchServiceManager | null = null;

export function getSearchServiceManager(): SearchServiceManager {
  if (!serviceManager) {
    serviceManager = new SearchServiceManager();
  }
  return serviceManager;
}

// 便捷函数
export async function search(query: string, sources?: SearchSource[], limit = 10): Promise<SearchResult[]> {
  const manager = getSearchServiceManager();
  const targetSources = sources || manager.getEnabledSources();
  return manager.searchAll(targetSources, query, limit);
}
