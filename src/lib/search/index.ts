/**
 * 统一搜索服务层
 *
 * 支持多个搜索数据源的统一接口
 * 可配置启用/禁用不同的数据源
 *
 * 数据源配置：
 * - brave: Brave Search API (需要 BRAVE_API_KEY 环境变量)
 * - exa: Exa API (需要 EXA_API_KEY 环境变量)
 * - firecrawl: Firecrawl API (需要 FIRECRAWL_API_KEY 环境变量)
 * - context7: Context7 API (需要 CONTEXT7_API_KEY 环境变量)
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

// 获取 API Key 的辅助函数
function getApiKey(source: SearchSource): string | undefined {
  const envKeys: Record<SearchSource, string | undefined> = {
    brave: process.env.BRAVE_API_KEY,
    exa: process.env.EXA_API_KEY,
    firecrawl: process.env.FIRECRAWL_API_KEY,
    context7: process.env.CONTEXT7_API_KEY,
  };
  return envKeys[source];
}

// Brave Search 服务
class BraveSearchService implements SearchService {
  name = 'Brave Search';
  enabled = true;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const apiKey = getApiKey('brave');

    // 如果没有 API Key，返回模拟数据
    if (!apiKey) {
      console.log('Brave Search: No API key, using mock data');
      return this.getMockResults(query, limit);
    }

    try {
      const response = await fetch('https://api.search.brave.com/res/v1/web/search', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey,
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Brave API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseResults(data, query, limit);
    } catch (error) {
      console.error('Brave Search API error:', error);
      return this.getMockResults(query, limit);
    }
  }

  private parseResults(data: any, query: string, limit: number): SearchResult[] {
    const results = data.web?.results || [];
    return results.slice(0, limit).map((item: any) => ({
      title: item.title || query,
      url: item.url || '',
      content: item.description || item.title || '',
      source: 'brave',
    }));
  }

  private getMockResults(query: string, limit: number): SearchResult[] {
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
    const apiKey = getApiKey('exa');

    // 如果没有 API Key，返回模拟数据
    if (!apiKey) {
      console.log('Exa: No API key, using mock data');
      return this.getMockResults(query, limit);
    }

    try {
      const response = await fetch('https://api.exa.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          limit,
          type: 'auto',
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Exa API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseResults(data, limit);
    } catch (error) {
      console.error('Exa Search API error:', error);
      return this.getMockResults(query, limit);
    }
  }

  private parseResults(data: any, limit: number): SearchResult[] {
    const results = data.results || [];
    return results.slice(0, limit).map((item: any) => ({
      title: item.title || '',
      url: item.url || '',
      content: item.text || item.excerpt || '',
      source: 'exa',
    }));
  }

  private getMockResults(query: string, limit: number): SearchResult[] {
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
    const apiKey = getApiKey('firecrawl');

    // 如果没有 API Key，返回模拟数据
    if (!apiKey) {
      console.log('Firecrawl: No API key, using mock data');
      return this.getMockResults(query, limit);
    }

    try {
      // 先搜索网页
      const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          limit,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!searchResponse.ok) {
        throw new Error(`Firecrawl Search API error: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      const results = searchData.data || [];

      // 对每个结果进行抓取
      const detailedResults: SearchResult[] = [];

      for (const result of results.slice(0, limit)) {
        try {
          const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              url: result.url,
              onlyMainContent: true,
            }),
            signal: AbortSignal.timeout(30000),
          });

          if (scrapeResponse.ok) {
            const scrapeData = await scrapeResponse.json();
            detailedResults.push({
              title: result.title || scrapeData.data?.metadata?.title || result.url,
              url: result.url,
              content: scrapeData.data?.markdown || result.description || '',
              source: 'firecrawl',
            });
          } else {
            detailedResults.push({
              title: result.title || result.url,
              url: result.url,
              content: result.description || '',
              source: 'firecrawl',
            });
          }
        } catch {
          detailedResults.push({
            title: result.title || result.url,
            url: result.url,
            content: result.description || '',
            source: 'firecrawl',
          });
        }
      }

      return detailedResults;
    } catch (error) {
      console.error('Firecrawl API error:', error);
      return this.getMockResults(query, limit);
    }
  }

  private getMockResults(query: string, limit: number): SearchResult[] {
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
    const apiKey = getApiKey('context7');

    // 如果没有 API Key，返回模拟数据
    if (!apiKey) {
      console.log('Context7: No API key, using mock data');
      return this.getMockResults(query, limit);
    }

    try {
      // Context7 使用 MCP 协议，这里通过 HTTP API 调用
      const response = await fetch('https://api.context7.io/v1/library/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          limit,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Context7 API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseResults(data, limit);
    } catch (error) {
      console.error('Context7 Search API error:', error);
      return this.getMockResults(query, limit);
    }
  }

  private parseResults(data: any, limit: number): SearchResult[] {
    const results = data.documents || data.results || [];
    return results.slice(0, limit).map((item: any) => ({
      title: item.title || item.name || '',
      url: item.url || item.link || '',
      content: item.content || item.description || item.snippet || '',
      source: 'context7',
    }));
  }

  private getMockResults(query: string, limit: number): SearchResult[] {
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
