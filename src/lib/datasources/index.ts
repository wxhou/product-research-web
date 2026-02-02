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
  | 'brave' | 'duckduckgo' | 'bing'
  // 新闻 API
  | 'newsapi' | 'gnews'
  // GitHub
  | 'github'
  // 国际技术社区
  | 'reddit' | 'hackernews-api'
  // 国内技术社区
  | 'v2ex'
  // 全文爬取
  | 'crawl4ai';

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

// ==================== Brave Search（需要 API Key 或使用备用方案）====================

class BraveSearchService implements SearchService {
  name = 'Brave Search';
  type = 'brave' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const apiKey = getEnv('BRAVE_API_KEY');

    // 有 API Key 时使用 API
    if (apiKey) {
      try {
        const res = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`,
          {
            headers: {
              'Accept': 'application/json',
              'X-Subscription-Token': apiKey,
            },
            signal: AbortSignal.timeout(15000),
          }
        );
        if (!res.ok) throw new Error(`Brave API error: ${res.status}`);

        const data = await res.json();
        return (data.web?.results || []).slice(0, limit).map((item: any) => ({
          title: item.title || query,
          url: item.url || '',
          content: item.description || item.title || '',
          source: 'brave',
          publishedAt: item.date,
        }));
      } catch (error) {
        console.error('Brave Search API error:', error);
        // Fall back to HTML scraping
      }
    }

    // 无 API Key 时尝试 Brave HTML（ Brave 可能使用客户端渲染，备用 DuckDuckGo）
    // 如果 Brave 失败，会返回空结果，由调用方使用备用源
    return [];
  }
}

// ==================== Bing Search（免费额度）====================

class BingSearchService implements SearchService {
  name = 'Bing Search';
  type = 'bing' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const apiKey = getEnv('BING_API_KEY');

    // 无 API Key 时跳过
    if (!apiKey) {
      console.log('Bing: No API key configured, skipping');
      return [];
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
      return [];
    }
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
      console.log('GNews: No API key configured, skipping');
      return [];
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
      return [];
    }
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

// ==================== Crawl4AI 全文爬取服务 ====================
//
// Crawl4AI 是一个开源的网页爬取工具，支持 Markdown 格式输出
// GitHub: https://github.com/unclecode/crawl4ai
// 特性：
// - 返回 Markdown 格式内容
// - 支持 JavaScript 渲染
// - 可配置超时和内容长度
// - 无需 API Key
//
// 使用方式：
// 1. 通过 Docker 启动服务：docker run -p 8000:8000 unclecode/crawl4ai
// 2. 或使用官方 API：https://crawl4ai.com
// 3. 设置环境变量 CRAWL4AI_API_URL

interface Crawl4AIConfig {
  baseUrl: string;
  timeout: number;
  maxLength: number;
}

interface Crawl4AIResult {
  url: string;
  success: boolean;
  markdown?: string;
  error?: string;
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

class Crawl4AIService {
  private config: Crawl4AIConfig;
  private initialized = false;

  constructor() {
    this.config = {
      baseUrl: process.env.CRAWL4AI_API_URL || 'http://192.168.0.124:11235',
      timeout: parseInt(process.env.CRAWL4AI_TIMEOUT || '60000', 10),
      maxLength: parseInt(process.env.CRAWL4AI_MAX_LENGTH || '100000', 10),
    };

    console.log(`[Crawl4AI] Initialized with baseUrl: ${this.config.baseUrl}`);
  }

  /**
   * 刷新配置
   */
  refreshConfig(): void {
    this.config = {
      baseUrl: process.env.CRAWL4AI_API_URL || 'http://192.168.0.124:11235',
      timeout: parseInt(process.env.CRAWL4AI_TIMEOUT || '60000', 10),
      maxLength: parseInt(process.env.CRAWL4AI_MAX_LENGTH || '100000', 10),
    };
    console.log(`[Crawl4AI] Config refreshed: ${this.config.baseUrl}`);
  }

  /**
   * 检查服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${this.config.baseUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * 爬取单个 URL
   */
  async crawl(
    url: string,
    _originalContent?: string,
    options?: { timeout?: number; maxLength?: number }
  ): Promise<Crawl4AIResult | null> {
    const timeout = options?.timeout || this.config.timeout;
    const maxLength = options?.maxLength || this.config.maxLength;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // 使用简单的请求格式，确保兼容性
      // 高级提取选项（extraction_strategy、css_selector等）可能不被所有版本的Crawl4AI支持
      // 内容质量通过 extractor 中的 cleanContent 函数后处理来保证
      const requestBody = {
        urls: [url],
        priority: 10,
      };

      const res = await fetch(`${this.config.baseUrl}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const error = await res.text();
        console.error(`[Crawl4AI] API error: ${res.status} - ${error}`);
        return { url, success: false, error: `API error: ${res.status}` };
      }

      const data = await res.json();

      // 处理响应格式
      // 可能是 { results: [...] } 或 { success: true, results: [...] }
      const results = data.results || [];
      const result = results[0] || data;

      // 获取 markdown 内容
      let markdown: string | undefined;
      if (typeof result.markdown === 'string') {
        markdown = result.markdown;
      } else if (result.markdown && typeof result.markdown === 'object') {
        // markdown 可能是对象，包含 fit_markdown 或 raw_markdown
        markdown = result.markdown.fit_markdown || result.markdown.raw_markdown || result.markdown;
      }

      // 检查是否成功：优先使用 success 字段，status_code 200 或 201 都算成功
      const success = result.success !== false && [200, 201].includes(result.status_code);

      return {
        url: result.url || url,
        success,
        markdown,
        error: success ? undefined : result.error_message || 'Crawl failed',
        metadata: {
          title: result.metadata?.title || result.title,
          description: result.metadata?.description || result.description,
          keywords: result.metadata?.keywords || result.keywords,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Crawl4AI] Failed to crawl ${url}: ${errorMessage}`);
      return { url, success: false, error: errorMessage };
    }
  }

  /**
   * 批量爬取多个 URL
   */
  async crawlMultiple(
    urls: string[],
    _originalContents?: Map<string, string>,
    options?: { timeout?: number; maxLength?: number }
  ): Promise<Crawl4AIResult[]> {
    if (urls.length === 0) return [];

    const timeout = options?.timeout || this.config.timeout;
    const results: Crawl4AIResult[] = [];

    // 并行爬取（限制并发数）
    const concurrency = 4;
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(url => this.crawl(url, undefined, options))
      );

      for (const result of batchResults) {
        if (result) {
          results.push(result);
        }
      }

      // 避免请求过于频繁
      if (i + concurrency < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }
}

// 单例
let crawl4aiService: Crawl4AIService | null = null;
export function getCrawl4AIService(): Crawl4AIService {
  if (!crawl4aiService) {
    crawl4aiService = new Crawl4AIService();
  }
  return crawl4aiService;
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
    // 全部免费数据源默认启用（已移除 github，因为其搜索结果噪音大）
    'rss-hackernews', 'rss-techcrunch', 'rss-theverge', 'rss-wired', 'rss-producthunt',
    'rss-googlenews', 'rss-mittechreview',
    'rss-cnblogs', 'rss-juejin',
    'duckduckgo', 'reddit', 'hackernews-api', 'v2ex',
  ]);

  constructor() {
    // 注册所有 RSS 服务（复用同一个 RSSService 类）
    this.services.set('rss-hackernews', new RSSService());
    this.services.set('rss-techcrunch', new RSSService());
    this.services.set('rss-theverge', new RSSService());
    this.services.set('rss-wired', new RSSService());
    this.services.set('rss-producthunt', new RSSService());
    this.services.set('rss-googlenews', new RSSService());
    this.services.set('rss-mittechreview', new RSSService());
    this.services.set('rss-cnblogs', new RSSService());
    this.services.set('rss-juejin', new RSSService());

    // 注册其他服务
    this.services.set('brave', new BraveSearchService());
    this.services.set('duckduckgo', new DuckDuckGoService());
    this.services.set('bing', new BingSearchService());
    this.services.set('newsapi', new NewsAPIService());
    this.services.set('gnews', new GNewsService());
    this.services.set('github', new GitHubService());
    this.services.set('reddit', new RedditService());
    this.services.set('hackernews-api', new HackerNewsAPIService());
    this.services.set('v2ex', new V2EXService());

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
      { type: 'rss-googlenews', name: 'Google News AI', enabled: this.isEnabled('rss-googlenews'), description: 'AI 技术新闻', free: true },
      { type: 'rss-mittechreview', name: 'MIT Tech Review', enabled: this.isEnabled('rss-mittechreview'), description: '麻省理工科技评论', free: true },
      // 国内 RSS
      { type: 'rss-cnblogs', name: '博客园', enabled: this.isEnabled('rss-cnblogs'), description: '国内开发者社区', free: true },
      { type: 'rss-juejin', name: '掘金', enabled: this.isEnabled('rss-juejin'), description: '掘金技术社区', free: true },
      // 免费搜索
      { type: 'duckduckgo', name: 'DuckDuckGo', enabled: this.isEnabled('duckduckgo'), description: '免费搜索引擎', free: true },
      { type: 'brave', name: 'Brave Search', enabled: this.isEnabled('brave'), description: '需要 API Key', free: false },
      { type: 'bing', name: 'Bing Search', enabled: this.isEnabled('bing'), description: '需要 API Key', free: false },
      // 新闻 API
      { type: 'newsapi', name: 'NewsAPI', enabled: this.isEnabled('newsapi'), description: '需要 API Key (免费额度)', free: false },
      { type: 'gnews', name: 'GNews', enabled: this.isEnabled('gnews'), description: '需要 API Key', free: false },
      // GitHub
      { type: 'github', name: 'GitHub', enabled: this.isEnabled('github'), description: '开源项目搜索', free: true },
      // 国际技术社区
      { type: 'reddit', name: 'Reddit', enabled: this.isEnabled('reddit'), description: '技术社区讨论', free: true },
      { type: 'hackernews-api', name: 'Hacker News API', enabled: this.isEnabled('hackernews-api'), description: '官方 API 搜索', free: true },
      // 国内技术社区
      { type: 'v2ex', name: 'V2EX', enabled: this.isEnabled('v2ex'), description: '国内程序员社区', free: true },
      // 全文爬取
      { type: 'crawl4ai', name: 'Crawl4AI', enabled: this.isEnabled('crawl4ai'), description: '网页全文爬取（需要启动 Crawl4AI 服务）', free: true },
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
