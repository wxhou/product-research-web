/**
 * 统一数据源服务层
 *
 * 使用真实可用的免费数据源，无需配置 API Key：
 * 1. RSS 订阅 - Hacker News, TechCrunch, The Verge, Wired, Product Hunt
 * 2. 免费搜索 - DuckDuckGo
 * 3. GitHub API - 搜索开源项目
 * 4. 技术社区 - Reddit, V2EX, Hacker News
 */

export interface SearchResult {
  // 基础字段
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  author?: string;
  // 扩展字段（研究Agent使用）- content 在搜索时可能为空
  id?: string;
  quality?: number;
  crawled?: boolean;
  queryId?: string;
  dimension?: string;
  crawledAt?: string;
  contentHash?: string;
  content?: string;
}

export interface SearchOptions {
  query: string;
  source: DataSourceType;
  limit?: number;
  hints?: string;  // 搜索提示，用于提升搜索质量
}

// 支持的数据源类型
export type DataSourceType =
  // RSS 订阅
  | 'rss-hackernews' | 'rss-techcrunch' | 'rss-theverge' | 'rss-wired' | 'rss-producthunt'
  | 'rss-cnblogs' | 'rss-juejin' | 'rss-googlenews' | 'rss-mittechreview'
  // 免费搜索
  | 'duckduckgo'
  // GitHub
  | 'github'
  // 国际技术社区
  | 'reddit' | 'hackernews-api'
  // 国内技术社区
  | 'v2ex';

// 获取环境变量
function getEnv(key: string): string | undefined {
  return process.env[key];
}

// ==================== RSS 订阅服务（支持多源配置）====================

class RSSService implements SearchService {
  name = 'RSS 订阅';
  type = 'rss-hackernews' as DataSourceType;

  // 国际科技 RSS 源
  private readonly internationalFeeds = [
    { url: 'https://news.ycombinator.com/rss', name: 'Hacker News', category: '技术' },
    { url: 'https://techcrunch.com/feed/', name: 'TechCrunch', category: '科技' },
    { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge', category: '科技' },
    { url: 'https://wired.com/feed/rss', name: 'Wired', category: '科技' },
    { url: 'https://www.producthunt.com/feed', name: 'Product Hunt', category: '产品' },
    { url: 'https://news.google.com/rss/search?q=AI+technology&hl=en-US&gl=US&ceid=US:en', name: 'Google News AI', category: '新闻' },
    { url: 'https://www.technologyreview.com/feed/', name: 'MIT Tech Review', category: '科技' },
  ];

  // 国内技术 RSS 源
  private readonly chineseFeeds = [
    { url: 'https://www.cnblogs.com/cate/108703/', name: '博客园', category: '技术' },
    { url: 'https://juejin.cn/feed/all', name: '掘金', category: '技术' },
  ];

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    // 根据类型确定使用哪个 feed 列表
    const feeds = this.getFeedsByType(this.type);
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

  private getFeedsByType(type: DataSourceType) {
    switch (type) {
      case 'rss-hackernews':
        return [this.internationalFeeds[0]];
      case 'rss-techcrunch':
        return [this.internationalFeeds[1]];
      case 'rss-theverge':
        return [this.internationalFeeds[2]];
      case 'rss-wired':
        return [this.internationalFeeds[3]];
      case 'rss-producthunt':
        return [this.internationalFeeds[4]];
      case 'rss-googlenews':
        return [this.internationalFeeds[5]];
      case 'rss-mittechreview':
        return [this.internationalFeeds[6]];
      case 'rss-cnblogs':
        return [this.chineseFeeds[0]];
      case 'rss-juejin':
        return [this.chineseFeeds[1]];
      default:
        return this.internationalFeeds;
    }
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

/**
 * 带重试的 fetch 函数
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  baseDelay = 1000
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return res;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[DuckDuckGo] Fetch attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

class DuckDuckGoService implements SearchService {
  name = 'DuckDuckGo';
  type = 'duckduckgo' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      // API 搜索
      const res = await fetchWithRetry(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
        {}
      );

      if (!res.ok) throw new Error(`DuckDuckGo API error: ${res.status}`);

      const text = await res.text();
      if (!text || text.trim() === '') {
        return [];
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('DuckDuckGo JSON parse error:', parseError);
        return [];
      }

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
    } catch (error) {
      console.warn('DuckDuckGo API search failed, falling back to HTML search:', error);
    }

    // HTML 搜索作为备选
    if (results.length < limit) {
      try {
        const htmlRes = await fetchWithRetry(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=us-en`,
          {}
        );
        if (htmlRes.ok) {
          const html = await htmlRes.text();
          if (html && html.trim()) {
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
      } catch (htmlError) {
        console.warn('DuckDuckGo HTML search failed:', htmlError);
      }
    }

    return results.slice(0, limit);
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

// ==================== GitHub 搜索====================

class GitHubService implements SearchService {
  name = 'GitHub';
  type = 'github' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const token = getEnv('GITHUB_TOKEN');

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Product-Research-Web',
    };

    // 如果有 token，添加认证头（提高速率限制到 5000 次/小时）
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    try {
      const res = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${limit}`,
        {
          headers,
          signal: AbortSignal.timeout(15000),
        }
      );

      // 如果请求失败（速率限制等），静默返回空结果而不是抛出异常
      if (!res.ok) {
        console.log(`GitHub API: rate limited or error (${res.status}), skipping`);
        return [];
      }

      const data = await res.json();
      return (data.items || []).slice(0, limit).map((item: any) => ({
        title: item.full_name || query,
        url: item.html_url || '',
        content: item.description || `⭐ ${item.stargazers_count} stars | ${item.language || 'N/A'}`,
        source: 'github',
        publishedAt: item.updated_at,
      }));
    } catch (error) {
      // 静默处理错误，避免中断整个研究任务
      console.log('GitHub Search: skipped due to error');
      return [];
    }
  }
}

// ==================== Reddit 社区讨论====================

class RedditService implements SearchService {
  name = 'Reddit';
  type = 'reddit' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    try {
      // Reddit 公开帖子 API
      const subreddits = ['programming', 'technology', 'software', 'webdev', 'computers'];
      const results: SearchResult[] = [];

      for (const subreddit of subreddits.slice(0, 2)) {
        if (results.length >= limit) break;

        try {
          const res = await fetch(
            `https://www.reddit.com/r/${subreddit}/new.json?limit=${Math.ceil(limit / 2)}&sort=new`,
            {
              headers: { 'User-Agent': 'ProductResearchBot/1.0' },
              signal: AbortSignal.timeout(15000),
            }
          );
          if (!res.ok) continue;

          const data = await res.json();
          const posts = (data.data?.children || []).map((child: any) => child.data);

          // 过滤匹配的内容
          for (const post of posts) {
            if (results.length >= limit) break;
            const title = post.title?.toLowerCase() || '';
            const content = (post.selftext || '').toLowerCase();
            const queryLower = query.toLowerCase();

            if (title.includes(queryLower) || content.includes(queryLower)) {
              results.push({
                title: post.title || query,
                url: `https://reddit.com${post.permalink}`,
                content: (post.selftext || post.title || '').substring(0, 300),
                source: `reddit-${subreddit}`,
                publishedAt: new Date(post.created_utc * 1000).toISOString(),
              });
            }
          }
        } catch (e) {
          // Continue to next subreddit
        }
      }

      return results.slice(0, limit);
    } catch (error) {
      console.error('Reddit Search error:', error);
      return [];
    }
  }
}

// ==================== Hacker News 官方 API====================

class HackerNewsAPIService implements SearchService {
  name = 'Hacker News API';
  type = 'hackernews-api' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    try {
      // 搜索 API
      const res = await fetch(
        `https://hacker-news.firebaseio.com/v0/search.json?q=${encodeURIComponent(query)}&tags=story&limit=${limit * 2}`,
        { signal: AbortSignal.timeout(15000) }
      );

      // 401/403 表示需要认证或被拒绝，静默返回空结果
      if (res.status === 401 || res.status === 403) {
        console.warn('Hacker News API requires authentication, skipping...');
        return [];
      }

      if (!res.ok) {
        console.warn(`Hacker News API returned ${res.status}, skipping...`);
        return [];
      }

      const data = await res.json();
      const queryLower = query.toLowerCase();

      return (data || [])
        .filter((item: any) => {
          const title = item.title?.toLowerCase() || '';
          return title.includes(queryLower);
        })
        .slice(0, limit)
        .map((item: any) => ({
          title: item.title || query,
          url: item.url || `https://news.ycombinator.com/item?id=${item.objectID}`,
          content: `Score: ${item.points || 0} | Comments: ${item.num_comments || 0}`,
          source: 'hackernews-api',
          publishedAt: item.created_at,
        }));
    } catch (error) {
      // 静默处理，不记录错误
      return [];
    }
  }
}

// ==================== V2EX 技术社区（国内）====================

class V2EXService implements SearchService {
  name = 'V2EX';
  type = 'v2ex' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    try {
      // V2EX 公开 API
      const tabs = ['programming', 'technology', 'life', 'creative'];
      const results: SearchResult[] = [];

      for (const tab of tabs) {
        if (results.length >= limit) break;

        try {
          const res = await fetch(
            `https://www.v2ex.com/api/v2/tabs/${tab}/topics?page=1&size=${limit}`,
            { signal: AbortSignal.timeout(15000) }
          );
          if (!res.ok) continue;

          const data = await res.json();
          const topics = data.results || [];

          for (const topic of topics) {
            if (results.length >= limit) break;
            const title = (topic.title || '').toLowerCase();
            const content = (topic.content || topic.title || '').toLowerCase();
            const queryLower = query.toLowerCase();

            if (title.includes(queryLower) || content.includes(queryLower)) {
              results.push({
                title: topic.title || query,
                url: `https://www.v2ex.com/t/${topic.id}`,
                content: (topic.content || topic.title || '').substring(0, 300),
                source: 'v2ex',
                publishedAt: topic.created,
              });
            }
          }
        } catch (e) {
          // Continue to next tab
        }
      }

      return results.slice(0, limit);
    } catch (error) {
      console.error('V2EX Search error:', error);
      return [];
    }
  }
}

// ==================== 博客园 RSS（国内）====================

class CnBlogsRSSService implements SearchService {
  name = '博客园';
  type = 'rss-cnblogs' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    try {
      const res = await fetch(
        'https://www.cnblogs.com/cate/108703/',
        {
          headers: { 'User-Agent': 'ProductResearchBot/1.0' },
          signal: AbortSignal.timeout(15000),
        }
      );
      if (!res.ok) return [];

      const html = await res.text();
      const queryLower = query.toLowerCase();

      // 解析博客列表
      const results: SearchResult[] = [];
      const linkRegex = /<a[^>]+href="([^"]+\.cnblogs\.com[^"]+)"[^>]*>([^<]+)<\/a>/g;
      let match: RegExpExecArray | null = null;

      while ((match = linkRegex.exec(html)) !== null && results.length < limit) {
        const title = this.stripHtml(match[2]);
        if (title.toLowerCase().includes(queryLower)) {
          results.push({
            title,
            url: match[1],
            content: title,
            source: 'cnblogs',
          });
        }
      }

      return results;
    } catch (error) {
      console.error('CnBlogs RSS Search error:', error);
      return [];
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}


// ==================== Jina Reader 全文爬取服务 ====================
//
// 使用 Jina Reader API 将 URL 转换为 Markdown
// API: https://r.jina.ai/{url}
// 免费，无需部署

interface JinaReaderResult {
  url: string;
  success: boolean;
  markdown?: string;
  error?: string;
  metadata?: {
    title?: string;
    description?: string;
  };
}

export class JinaReaderService {
  private timeout = 30000;

  /**
   * 爬取单个 URL
   */
  async crawl(url: string): Promise<JinaReaderResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const res = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return { url, success: false, error: `HTTP ${res.status}` };
      }

      const text = await res.text();

      // Jina Reader 直接返回文本，需要提取 markdown
      // 格式: # Title \n\n Content
      const markdown = text.trim();

      // 尝试提取标题
      const titleMatch = markdown.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : undefined;

      return {
        url,
        success: true,
        markdown,
        metadata: { title },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { url, success: false, error: errorMessage };
    }
  }

  /**
   * 批量爬取多个 URL
   */
  async crawlMultiple(urls: string[]): Promise<JinaReaderResult[]> {
    const results: JinaReaderResult[] = [];

    for (const url of urls) {
      const result = await this.crawl(url);
      results.push(result);
    }

    return results;
  }
}

// 单例
let jinaReaderService: JinaReaderService | null = null;
export function getJinaReaderService(): JinaReaderService {
  if (!jinaReaderService) {
    jinaReaderService = new JinaReaderService();
  }
  return jinaReaderService;
}

// ==================== 服务管理器 ====================

interface SearchService {
  name: string;
  type: DataSourceType;
  search(query: string, limit?: number): Promise<SearchResult[]>;
}

export class DataSourceManager {
  private services: Map<DataSourceType, SearchService> = new Map();
  // 数据源从数据库加载，不再硬编码
  private enabledSources: Set<DataSourceType> = new Set();

  constructor() {
    // 预注册所有已实现的服务（按类型）
    this.registerAllServices();
    // 从数据库加载启用的数据源
    this.loadEnabledSources();
  }

  // 已实现服务的映射表
  private serviceImplementations: Map<DataSourceType, () => SearchService> = new Map([
    ['rss-hackernews', () => new RSSService()],
    ['rss-techcrunch', () => new RSSService()],
    ['rss-theverge', () => new RSSService()],
    ['rss-wired', () => new RSSService()],
    ['rss-producthunt', () => new RSSService()],
    ['rss-googlenews', () => new RSSService()],
    ['rss-mittechreview', () => new RSSService()],
    ['rss-cnblogs', () => new RSSService()],
    ['rss-juejin', () => new RSSService()],
    ['duckduckgo', () => new DuckDuckGoService()],
    ['github', () => new GitHubService()],
    ['reddit', () => new RedditService()],
    ['hackernews-api', () => new HackerNewsAPIService()],
    ['v2ex', () => new V2EXService()],
  ]);

  // 注册所有已实现的服务
  private registerAllServices() {
    for (const [type, factory] of this.serviceImplementations) {
      this.services.set(type, factory());
    }
  }

  private loadEnabledSources() {
    try {
      // 同步导入 db 模块
      const { dataSourceDb } = require('@/lib/db');
      const sources = dataSourceDb.getActive.all() as Array<{ type: string }>;
      if (sources.length > 0) {
        this.enabledSources = new Set(sources.map((s: { type: string }) => s.type as DataSourceType));
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
    try {
      const { dataSourceDb } = require('@/lib/db');
      const sources = dataSourceDb.getAll.all() as Array<{
        id: string;
        name: string;
        type: string;
        description: string;
        is_active: number;
        is_free: number;
      }>;
      return sources.map(s => ({
        type: s.type as DataSourceType,
        name: s.name,
        enabled: s.is_active === 1,
        description: s.description || '',
        free: s.is_free === 1,
      }));
    } catch (error) {
      console.error('Failed to get all sources:', error);
      return [];
    }
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
