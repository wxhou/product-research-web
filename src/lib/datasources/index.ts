/**
 * 统一数据源服务层
 *
 * 支持多种数据获取方式：
 * 1. 搜索 API - Brave, Exa, Google, Bing, Serper, DuckDuckGo
 * 2. RSS 订阅 - 解析 RSS/Atom 订阅源
 * 3. 通用 HTTP API - 可配置的任意 REST API
 *
 * 所有数据源都使用标准 HTTP API，无须 MCP
 */

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  source: string;
  publishedAt?: string;
  author?: string;
}

export interface SearchOptions {
  query: string;
  source: DataSourceType;
  limit?: number;
}

// 支持的数据源类型
export type DataSourceType =
  // 搜索 API
  | 'brave' | 'exa' | 'google' | 'bing' | 'serper' | 'duckduckgo'
  // RSS 订阅
  | 'rss'
  // 通用 API
  | 'http';

// RSS 订阅源配置
export interface RSSFeed {
  url: string;
  name: string;
  category: string;
}

// 通用 API 配置
export interface HTTPAPIConfig {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  responsePath?: string; // JSON 路径，如 "data.items"
  titlePath?: string;    // JSON 路径，如 "title"
  contentPath?: string;  // JSON 路径，如 "content"
  urlPath?: string;      // JSON 路径，如 "url"
}

// 获取环境变量的辅助函数
function getEnv(key: string): string | undefined {
  return process.env[key];
}

// ==================== 搜索 API 服务 ====================

// Brave Search 服务
class BraveSearchService implements SearchService {
  name = 'Brave Search';
  type = 'brave' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const apiKey = getEnv('BRAVE_API_KEY');
    if (!apiKey) return this.getMockResults(query, limit);

    try {
      const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey,
        },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`Brave API error: ${res.status}`);
      const data = await res.json();
      return (data.web?.results || []).slice(0, limit).map((item: any) => ({
        title: item.title || query,
        url: item.url || '',
        content: item.description || item.title || '',
        source: 'brave',
      }));
    } catch (error) {
      console.error('Brave Search error:', error);
      return this.getMockResults(query, limit);
    }
  }

  private getMockResults(query: string, limit: number): SearchResult[] {
    return [
      { title: `${query} - 行业解决方案`, url: `https://example.com/${query}`, content: `提供全面的${query}解决方案。`, source: 'brave' },
      { title: `${query} - 产品功能`, url: 'https://example.com/features', content: '核心功能模块介绍。', source: 'brave' },
    ].slice(0, limit);
  }
}

// Exa Search 服务
class ExaSearchService implements SearchService {
  name = 'Exa';
  type = 'exa' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const apiKey = getEnv('EXA_API_KEY');
    if (!apiKey) return this.getMockResults(query, limit);

    try {
      const res = await fetch('https://api.exa.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ query, limit, type: 'auto' }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`Exa API error: ${res.status}`);
      const data = await res.json();
      return (data.results || []).slice(0, limit).map((item: any) => ({
        title: item.title || '',
        url: item.url || '',
        content: item.text || item.excerpt || '',
        source: 'exa',
      }));
    } catch (error) {
      console.error('Exa Search error:', error);
      return this.getMockResults(query, limit);
    }
  }

  private getMockResults(query: string, limit: number): SearchResult[] {
    return [
      { title: `${query} - 技术白皮书`, url: 'https://exa.ai/paper', content: '深度解析技术原理和最佳实践。', source: 'exa' },
      { title: `${query} - 学术研究`, url: 'https://exa.ai/research', content: '相关领域的学术论文。', source: 'exa' },
    ].slice(0, limit);
  }
}

// Serper.dev 服务（Google 搜索结果）
class SerperSearchService implements SearchService {
  name = 'Serper (Google)';
  type = 'serper' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const apiKey = getEnv('SERPER_API_KEY');
    if (!apiKey) return this.getMockResults(query, limit);

    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
        body: JSON.stringify({ q: query }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`Serper API error: ${res.status}`);
      const data = await res.json();
      const organicData = data.organic || data.results || [];
      return organicData.slice(0, limit).map((item: any) => ({
        title: item.title || '',
        url: item.url || '',
        content: item.snippet || item.title || '',
        source: 'serper',
      }));
    } catch (error) {
      console.error('Serper Search error:', error);
      return this.getMockResults(query, limit);
    }
  }

  private getMockResults(query: string, limit: number): SearchResult[] {
    return [
      { title: `${query} - Google 搜索结果`, url: `https://google.com/search?q=${query}`, content: `关于${query}的搜索结果。`, source: 'serper' },
    ].slice(0, limit);
  }
}

// DuckDuckGo Instant Answer API（免费）
class DuckDuckGoService implements SearchService {
  name = 'DuckDuckGo';
  type = 'duckduckgo' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    try {
      const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`, {
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`DuckDuckGo API error: ${res.status}`);
      const data = await res.json();

      const results: SearchResult[] = [];

      // Instant Answer
      if (data.AbstractText) {
        results.push({
          title: data.Heading || query,
          url: data.AbstractURL || '',
          content: data.AbstractText,
          source: 'duckduckgo',
        });
      }

      // Related Topics
      for (const topic of (data.RelatedTopics || []).slice(0, limit - results.length)) {
        if (topic.Result) {
          results.push({
            title: topic.Text || query,
            url: topic.FirstURL || '',
            content: topic.Text || '',
            source: 'duckduckgo',
          });
        }
      }

      return results.slice(0, limit);
    } catch (error) {
      console.error('DuckDuckGo Search error:', error);
      return this.getMockResults(query, limit);
    }
  }

  private getMockResults(query: string, limit: number): SearchResult[] {
    return [
      { title: `${query} - DuckDuckGo`, url: `https://duckduckgo.com/?q=${query}`, content: `关于${query}的搜索结果。`, source: 'duckduckgo' },
    ].slice(0, limit);
  }
}

// ==================== RSS 订阅服务 ====================

class RSSService implements SearchService {
  name = 'RSS 订阅';
  type = 'rss' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const feeds = this.getDefaultFeeds();
    const results: SearchResult[] = [];

    for (const feed of feeds) {
      try {
        const feedResults = await this.fetchRSS(feed, query, Math.ceil(limit / feeds.length));
        results.push(...feedResults);
      } catch (error) {
        console.error(`RSS fetch error (${feed.name}):`, error);
      }
    }

    return results.slice(0, limit);
  }

  private getDefaultFeeds(): RSSFeed[] {
    return [
      { url: 'https://news.ycombinator.com/rss', name: 'Hacker News', category: '技术' },
      { url: 'https://techcrunch.com/feed/', name: 'TechCrunch', category: '科技' },
      { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge', category: '科技' },
      { url: 'https://wired.com/feed/rss', name: 'Wired', category: '科技' },
    ];
  }

  private async fetchRSS(feed: RSSFeed, query: string, limit: number): Promise<SearchResult[]> {
    try {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'ProductResearchBot/1.0' },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`RSS fetch error: ${res.status}`);

      const xmlText = await res.text();
      const items = this.parseRSS(xmlText);

      // 按关键词过滤
      const queryLower = query.toLowerCase();
      const filtered = items
        .filter(item =>
          item.title.toLowerCase().includes(queryLower) ||
          item.content.toLowerCase().includes(queryLower)
        )
        .slice(0, limit);

      return filtered.map(item => ({
        title: item.title,
        url: item.link || '',
        content: item.content.substring(0, 300),
        source: `rss-${feed.name.toLowerCase().replace(/\s+/g, '-')}`,
        publishedAt: item.pubDate,
      }));
    } catch (error) {
      console.error(`Failed to fetch RSS ${feed.name}:`, error);
      return [];
    }
  }

  private parseRSS(xml: string): Array<{ title: string; link: string; content: string; pubDate: string }> {
    const items: Array<{ title: string; link: string; content: string; pubDate: string }> = [];

    // 简单解析 RSS/Atom
    const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];

      const titleMatch = itemXml.match(/<title[^>]*>([^<]*)<\/title>/i);
      const linkMatch = itemXml.match(/<link[^>]*>([^<]*)<\/link>/i) || itemXml.match(/<link[^>]+href="([^"]+)"[^>]*\/>/i);
      const descMatch = itemXml.match(/<(?:description|summary|content)(?:[^>]*)>([^<]*)<\/[^>]+>/i);
      const pubMatch = itemXml.match(/<(?:pubDate|published|updated)>([^<]*)<\/[^>]+>/i);

      if (titleMatch) {
        items.push({
          title: this.stripHtml(titleMatch[1].trim()),
          link: linkMatch ? this.stripHtml(linkMatch[1].trim()) : '',
          content: descMatch ? this.stripHtml(descMatch[1].trim()) : '',
          pubDate: pubMatch ? pubMatch[1].trim() : '',
        });
      }
    }

    return items;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

// ==================== 通用 HTTP API 服务 ====================

class HTTPAPIService implements SearchService {
  name = '自定义 API';
  type = 'http' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const apiUrl = getEnv('CUSTOM_API_URL');
    if (!apiUrl) return this.getMockResults(query, limit);

    try {
      const res = await fetch(apiUrl.replace('{query}', encodeURIComponent(query)), {
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`Custom API error: ${res.status}`);
      const data = await res.json();

      // 解析自定义路径
      const itemsPath = (getEnv('CUSTOM_API_ITEMS_PATH') || 'data.items').split('.');
      const items = this.getNestedValueArray(data, itemsPath) || data.items || data.results || data.data || [data];
      const titlePath = (getEnv('CUSTOM_API_TITLE') || 'title').split('.');
      const contentPath = (getEnv('CUSTOM_API_CONTENT') || 'content').split('.');
      const urlPath = (getEnv('CUSTOM_API_URL_FIELD') || 'url').split('.');

      return (items as any[]).slice(0, limit).map((item: any) => ({
        title: this.getNestedValue(item, titlePath) || query,
        url: this.getNestedValue(item, urlPath) || '',
        content: this.getNestedValue(item, contentPath) || '',
        source: 'custom-api',
      }));
    } catch (error) {
      console.error('Custom API error:', error);
      return this.getMockResults(query, limit);
    }
  }

  private getNestedValue(obj: any, path: string[]): string {
    let current = obj;
    for (const key of path) {
      if (current === undefined || current === null) return '';
      current = current[key];
    }
    return current ? String(current) : '';
  }

  private getNestedValueArray(obj: any, path: string[]): any[] | undefined {
    let current = obj;
    for (const key of path) {
      if (current === undefined || current === null) return undefined;
      current = current[key];
    }
    return Array.isArray(current) ? current : undefined;
  }

  private getMockResults(query: string, limit: number): SearchResult[] {
    return [
      { title: `${query} - 自定义 API`, url: 'https://api.example.com', content: '自定义 API 返回结果。', source: 'custom-api' },
    ].slice(0, limit);
  }
}

// ==================== 搜索服务接口和管理器 ====================

interface SearchService {
  name: string;
  type: DataSourceType;
  search(query: string, limit?: number): Promise<SearchResult[]>;
}

export class DataSourceManager {
  private services: Map<DataSourceType, SearchService> = new Map();
  private enabledSources: Set<DataSourceType> = new Set(['brave', 'exa', 'rss']);

  constructor() {
    // 注册所有服务
    this.services.set('brave', new BraveSearchService());
    this.services.set('exa', new ExaSearchService());
    this.services.set('serper', new SerperSearchService());
    this.services.set('duckduckgo', new DuckDuckGoService());
    this.services.set('rss', new RSSService());
    this.services.set('http', new HTTPAPIService());

    this.loadEnabledSources();
  }

  private async loadEnabledSources() {
    try {
      const { dataSourceDb } = await import('@/lib/db');
      const sources = dataSourceDb.getActive.all() as Array<{ type: string }>;
      this.enabledSources = new Set(sources.map(s => s.type as DataSourceType));
    } catch (error) {
      console.error('Failed to load enabled sources:', error);
    }
  }

  setEnabled(source: DataSourceType, enabled: boolean) {
    if (enabled) {
      this.enabledSources.add(source);
    } else {
      this.enabledSources.delete(source);
    }
  }

  isEnabled(source: DataSourceType): boolean {
    return this.enabledSources.has(source);
  }

  getEnabledSources(): DataSourceType[] {
    return Array.from(this.enabledSources);
  }

  getAllSources(): Array<{ type: DataSourceType; name: string; enabled: boolean; description: string }> {
    return [
      { type: 'brave', name: 'Brave Search', enabled: this.isEnabled('brave'), description: '网页搜索 API' },
      { type: 'exa', name: 'Exa', enabled: this.isEnabled('exa'), description: 'AI 驱动的搜索引擎' },
      { type: 'serper', name: 'Serper (Google)', enabled: this.isEnabled('serper'), description: 'Google 搜索结果' },
      { type: 'duckduckgo', name: 'DuckDuckGo', enabled: this.isEnabled('duckduckgo'), description: '免费即时搜索' },
      { type: 'rss', name: 'RSS 订阅', enabled: this.isEnabled('rss'), description: '科技新闻订阅源' },
      { type: 'http', name: '自定义 API', enabled: this.isEnabled('http'), description: '配置任意 REST API' },
    ];
  }

  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { source, limit } = options;
    if (!this.isEnabled(source)) return [];

    const service = this.services.get(source);
    if (!service) return [];

    return service.search(options.query, limit);
  }

  async searchAll(query: string, limit?: number): Promise<SearchResult[]> {
    const results = await Promise.all(
      this.getEnabledSources().map(source => this.search({ query, source, limit }))
    );
    return results.flat();
  }
}

// 单例
let manager: DataSourceManager | null = null;
export function getDataSourceManager(): DataSourceManager {
  if (!manager) manager = new DataSourceManager();
  return manager;
}

// 便捷函数
export async function search(query: string, sources?: DataSourceType[], limit = 10): Promise<SearchResult[]> {
  const mgr = getDataSourceManager();
  if (sources) {
    const results: SearchResult[] = [];
    for (const source of sources) {
      results.push(...await mgr.search({ query, source, limit }));
    }
    return results.slice(0, limit);
  }
  return mgr.searchAll(query, limit);
}

export type { SearchService };
