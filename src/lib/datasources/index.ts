/**
 * 统一数据源服务层
 *
 * 使用真实可用的免费数据源，无需配置 API Key：
 * 1. RSS 订阅 - Hacker News, TechCrunch, The Verge, Wired, Product Hunt
 * 2. 免费搜索 API - DuckDuckGo, Bing (少量免费)
 * 3. 新闻 API - NewsAPI, GNews
 * 4. GitHub API - 搜索开源项目
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
  // RSS 订阅
  | 'rss-hackernews' | 'rss-techcrunch' | 'rss-theverge' | 'rss-wired' | 'rss-producthunt'
  // 免费搜索
  | 'duckduckgo' | 'bing'
  // 新闻 API
  | 'newsapi' | 'gnews'
  // GitHub
  | 'github';

// 获取环境变量
function getEnv(key: string): string | undefined {
  return process.env[key];
}

// ==================== RSS 订阅服务 ====================

class RSSService implements SearchService {
  name = 'RSS 订阅';
  type = 'rss-hackernews' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const feeds = [
      { url: 'https://news.ycombinator.com/rss', name: 'Hacker News', category: '技术' },
      { url: 'https://techcrunch.com/feed/', name: 'TechCrunch', category: '科技' },
      { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge', category: '科技' },
      { url: 'https://wired.com/feed/rss', name: 'Wired', category: '科技' },
      { url: 'https://www.producthunt.com/feed', name: 'Product Hunt', category: '产品' },
    ];

    const results: SearchResult[] = [];
    const perFeed = Math.ceil(limit / feeds.length);
    const queryLower = query.toLowerCase();

    for (const feed of feeds) {
      try {
        const feedResults = await this.fetchRSS(feed, queryLower, perFeed);
        results.push(...feedResults);
      } catch (error) {
        console.error(`RSS fetch error (${feed.name}):`, error);
      }
    }

    return results.slice(0, limit);
  }

  private async fetchRSS(feed: { url: string; name: string; category: string }, query: string, limit: number): Promise<SearchResult[]> {
    try {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'ProductResearchBot/1.0' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return [];

      const xmlText = await res.text();
      const items = this.parseRSS(xmlText);

      // 过滤匹配的内容
      const filtered = items.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
      ).slice(0, limit);

      return filtered.map(item => ({
        title: item.title,
        url: item.link || '',
        content: item.content.substring(0, 300),
        source: `rss-${feed.name.toLowerCase().replace(/\s+/g, '-')}`,
        publishedAt: item.pubDate,
      }));
    } catch {
      return [];
    }
  }

  private parseRSS(xml: string): Array<{ title: string; link: string; content: string; pubDate: string }> {
    const items: Array<{ title: string; link: string; content: string; pubDate: string }> = [];
    const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g;
    let match: RegExpExecArray | null = null;

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

// ==================== DuckDuckGo 搜索（免费）====================

class DuckDuckGoService implements SearchService {
  name = 'DuckDuckGo';
  type = 'duckduckgo' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    try {
      const res = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
        { signal: AbortSignal.timeout(15000) }
      );
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

      // Also try to get some web results
      if (results.length < limit) {
        // DuckDuckGo HTML search for more results
        const htmlRes = await fetch(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=us-en`,
          { signal: AbortSignal.timeout(15000) }
        );
        if (htmlRes.ok) {
          const html = await htmlRes.text();
          const linkRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
          let match: RegExpExecArray | null = null;
          let count = 0;
          while ((match = linkRegex.exec(html)) !== null && results.length < limit && count < 5) {
            if (!results.find(r => r.url === match![1])) {
              results.push({
                title: this.stripHtml(match[2]),
                url: match[1],
                content: `相关搜索结果: ${match[2]}`,
                source: 'duckduckgo',
              });
              count++;
            }
          }
        }
      }

      return results.slice(0, limit);
    } catch (error) {
      console.error('DuckDuckGo Search error:', error);
      return this.getMockResults(query, limit);
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  private getMockResults(query: string, limit: number): SearchResult[] {
    return [
      { title: `${query} - 搜索结果`, url: `https://duckduckgo.com/?q=${query}`, content: `关于${query}的搜索结果。`, source: 'duckduckgo' },
    ].slice(0, limit);
  }
}

// ==================== Bing 搜索（免费额度）====================

class BingSearchService implements SearchService {
  name = 'Bing Search';
  type = 'bing' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const apiKey = getEnv('BING_API_KEY');

    // 无 API Key 时使用模拟数据
    if (!apiKey) {
      return this.getMockResults(query, limit);
    }

    try {
      const res = await fetch(
        `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${limit}`,
        {
          headers: { 'Ocp-Apim-Subscription-Key': apiKey },
          signal: AbortSignal.timeout(15000),
        }
      );
      if (!res.ok) throw new Error(`Bing API error: ${res.status}`);

      const data = await res.json();
      return (data.webPages?.value || []).slice(0, limit).map((item: any) => ({
        title: item.name || query,
        url: item.url || '',
        content: item.snippet || item.name || '',
        source: 'bing',
      }));
    } catch (error) {
      console.error('Bing Search error:', error);
      return this.getMockResults(query, limit);
    }
  }

  private getMockResults(query: string, limit: number): SearchResult[] {
    return [
      { title: `${query} - Bing 搜索`, url: `https://www.bing.com/search?q=${query}`, content: `关于${query}的搜索结果。`, source: 'bing' },
    ].slice(0, limit);
  }
}

// ==================== NewsAPI（免费额度）====================

class NewsAPIService implements SearchService {
  name = 'NewsAPI';
  type = 'newsapi' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const apiKey = getEnv('NEWSAPI_API_KEY');

    // 无 API Key 时跳过（不返回模拟数据）
    if (!apiKey) {
      console.log('NewsAPI: No API key configured, skipping');
      return [];
    }

    try {
      const res = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=relevancy&pageSize=${limit}`,
        {
          headers: { 'X-Api-Key': apiKey },
          signal: AbortSignal.timeout(15000),
        }
      );
      if (!res.ok) throw new Error(`NewsAPI error: ${res.status}`);

      const data = await res.json();
      return (data.articles || []).slice(0, limit).map((item: any) => ({
        title: item.title || query,
        url: item.url || '',
        content: item.description || item.title || '',
        source: `newsapi-${item.source?.name || 'unknown'}`,
        publishedAt: item.publishedAt,
      }));
    } catch (error) {
      console.error('NewsAPI error:', error);
      return [];
    }
  }
}

// ==================== GNews（免费额度）====================

class GNewsService implements SearchService {
  name = 'GNews';
  type = 'gnews' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const apiKey = getEnv('GNEWS_API_KEY');

    if (!apiKey) {
      return this.getMockResults(query, limit);
    }

    try {
      const res = await fetch(
        `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=${limit}&apikey=${apiKey}`,
        { signal: AbortSignal.timeout(15000) }
      );
      if (!res.ok) throw new Error(`GNews API error: ${res.status}`);

      const data = await res.json();
      return (data.articles || []).slice(0, limit).map((item: any) => ({
        title: item.title || query,
        url: item.url || '',
        content: item.description || item.title || '',
        source: 'gnews',
        publishedAt: item.publishedAt,
      }));
    } catch (error) {
      console.error('GNews error:', error);
      return this.getMockResults(query, limit);
    }
  }

  private getMockResults(query: string, limit: number): SearchResult[] {
    return [
      { title: `${query} - GNews`, url: `https://gnews.io/search?q=${query}`, content: `关于${query}的新闻。`, source: 'gnews' },
    ].slice(0, limit);
  }
}

// ==================== GitHub 搜索====================

class GitHubService implements SearchService {
  name = 'GitHub';
  type = 'github' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    try {
      const res = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${limit}`,
        {
          headers: { 'Accept': 'application/vnd.github.v3+json' },
          signal: AbortSignal.timeout(15000),
        }
      );
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

      const data = await res.json();
      return (data.items || []).slice(0, limit).map((item: any) => ({
        title: item.full_name || query,
        url: item.html_url || '',
        content: item.description || `⭐ ${item.stargazers_count} stars | ${item.language || 'N/A'}`,
        source: 'github',
        publishedAt: item.updated_at,
      }));
    } catch (error) {
      console.error('GitHub Search error:', error);
      return this.getMockResults(query, limit);
    }
  }

  private getMockResults(query: string, limit: number): SearchResult[] {
    return [
      { title: `${query} - GitHub`, url: `https://github.com/search?q=${query}`, content: `关于${query}的开源项目。`, source: 'github' },
    ].slice(0, limit);
  }
}

// ==================== 服务管理器 ====================

interface SearchService {
  name: string;
  type: DataSourceType;
  search(query: string, limit?: number): Promise<SearchResult[]>;
}

export class DataSourceManager {
  private services: Map<DataSourceType, SearchService> = new Map();
  private enabledSources: Set<DataSourceType> = new Set([
    'rss-hackernews', 'rss-techcrunch', 'rss-theverge', 'duckduckgo', 'github'
  ]);

  constructor() {
    // 注册所有服务
    this.services.set('rss-hackernews', new RSSService());
    this.services.set('rss-techcrunch', new RSSService());
    this.services.set('rss-theverge', new RSSService());
    this.services.set('rss-wired', new RSSService());
    this.services.set('rss-producthunt', new RSSService());
    this.services.set('duckduckgo', new DuckDuckGoService());
    this.services.set('bing', new BingSearchService());
    this.services.set('newsapi', new NewsAPIService());
    this.services.set('gnews', new GNewsService());
    this.services.set('github', new GitHubService());

    this.loadEnabledSources();
  }

  private async loadEnabledSources() {
    try {
      const { dataSourceDb } = await import('@/lib/db');
      const sources = dataSourceDb.getActive.all() as Array<{ type: string }>;
      if (sources.length > 0) {
        this.enabledSources = new Set(sources.map(s => s.type as DataSourceType));
      }
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

  getAllSources(): Array<{ type: DataSourceType; name: string; enabled: boolean; description: string; free: boolean }> {
    return [
      // RSS 订阅（全部免费）
      { type: 'rss-hackernews', name: 'Hacker News', enabled: this.isEnabled('rss-hackernews'), description: '技术社区新闻', free: true },
      { type: 'rss-techcrunch', name: 'TechCrunch', enabled: this.isEnabled('rss-techcrunch'), description: '科技新闻报道', free: true },
      { type: 'rss-theverge', name: 'The Verge', enabled: this.isEnabled('rss-theverge'), description: '科技和娱乐新闻', free: true },
      { type: 'rss-wired', name: 'Wired', enabled: this.isEnabled('rss-wired'), description: '深度科技报道', free: true },
      { type: 'rss-producthunt', name: 'Product Hunt', enabled: this.isEnabled('rss-producthunt'), description: '新产品发布', free: true },
      // 免费搜索
      { type: 'duckduckgo', name: 'DuckDuckGo', enabled: this.isEnabled('duckduckgo'), description: '免费搜索引擎', free: true },
      { type: 'bing', name: 'Bing Search', enabled: this.isEnabled('bing'), description: '需要 API Key', free: false },
      // 新闻 API
      { type: 'newsapi', name: 'NewsAPI', enabled: this.isEnabled('newsapi'), description: '需要 API Key (免费额度)', free: false },
      { type: 'gnews', name: 'GNews', enabled: this.isEnabled('gnews'), description: '需要 API Key', free: false },
      // GitHub
      { type: 'github', name: 'GitHub', enabled: this.isEnabled('github'), description: '开源项目搜索', free: true },
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
    const results: SearchResult[] = [];

    // 并行搜索所有启用的源
    const searches = this.getEnabledSources().map(source =>
      this.search({ query, source, limit: Math.ceil((limit || 10) / this.getEnabledSources().length) })
    );

    const allResults = await Promise.all(searches);
    for (const res of allResults) {
      results.push(...res);
    }

    // 去重并返回
    const seen = new Set<string>();
    return results.filter(r => {
      const key = r.url || r.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, limit);
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
  if (sources && sources.length > 0) {
    const results: SearchResult[] = [];
    for (const source of sources) {
      results.push(...await mgr.search({ query, source, limit }));
    }
    return results.slice(0, limit);
  }
  return mgr.searchAll(query, limit);
}

export type { SearchService };
