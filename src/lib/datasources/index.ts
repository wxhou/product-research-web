/**
 * 统一数据源服务层
 *
 * 使用真实可用的免费数据源，无需配置 API Key：
 * 1. RSS 订阅 - Hacker News, TechCrunch, The Verge, Wired, Product Hunt
 * 2. 免费搜索 API - DuckDuckGo, Bing (少量免费)
 * 3. 新闻 API - NewsAPI, GNews
 * 4. GitHub API - 搜索开源项目
 */

export interface McpFetchResult {
  original: string;
  enriched: string;
  timestamp: string;
  contentLength: number;
}

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
  // 爬虫扩展字段
  mcpFetchContent?: McpFetchResult;
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
  | 'devto' | 'reddit' | 'hackernews-api'
  // 国内技术社区
  | 'v2ex'
  // 全文爬取
  | 'mcp-fetch';

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
        try {
          const htmlRes = await fetch(
            `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=us-en`,
            { signal: AbortSignal.timeout(15000) }
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
          // Silently ignore HTML fetch errors
        }
      }

      return results.slice(0, limit);
    } catch (error) {
      console.error('DuckDuckGo Search error:', error);
      return [];
    }
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

// ==================== Dev.to 技术社区====================

class DevToService implements SearchService {
  name = 'Dev.to';
  type = 'devto' as DataSourceType;

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch(
          `https://dev.to/api/articles?tag=${encodeURIComponent(query)}&per_page=${limit}`,
          { signal: AbortSignal.timeout(15000) }
        );

        if (res.status === 429) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Dev.to rate limited, waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        if (!res.ok) {
          console.log(`Dev.to API error: ${res.status}`);
          return [];
        }

        const data = await res.json();
        return (data || []).slice(0, limit).map((item: any) => ({
          title: item.title || query,
          url: item.url || item.canonical_url || '',
          content: item.description || item.title || '',
          source: 'devto',
          publishedAt: item.published_at,
        }));
      } catch (error) {
        if (attempt === maxRetries - 1) {
          console.error('Dev.to Search error:', error);
          return [];
        }
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return [];
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

// ==================== MCP Fetch 全文爬取服务（MCP 协议）====================
//
// zcaceres/fetch-mcp 是一个基于 MCP 协议的网页内容提取工具
// GitHub: https://github.com/zcaceres/fetch-mcp
// 特性：
// - 使用 MCP 协议与 fetch-mcp-server 通信
// - 返回 Markdown 格式内容
// - 支持 fetch_markdown/fetch_html/fetch_json/fetch_txt 工具
// - 无需 Docker，通过 npx 启动子进程
//
// 使用方式：
// 1. 在设置页面启用 MCP Fetch（推荐）或设置环境变量 ENABLE_MCP_FETCH=true
// 2. 启动命令: npx mcp-fetch-server
// 3. 自动通过 stdio 与 MCP Server 通信

interface McpFetchConfig {
  enabled: boolean;
  maxLength: number;
}

class McpFetchService implements SearchService {
  name = 'MCP Fetch';
  type = 'mcp-fetch' as DataSourceType;

  private enabled!: boolean;
  private maxLength!: number;

  constructor() {
    this.loadConfig();

    if (this.enabled) {
      console.log(`[MCP Fetch] Enabled, maxLength: ${this.maxLength}`);
    } else {
      console.log('[MCP Fetch] Disabled');
    }
  }

  /**
   * 从数据库加载配置，优先数据库配置，回退到环境变量
   */
  private loadConfig(): void {
    try {
      const { settingsDb } = require('@/lib/db');
      const result = settingsDb.get.get({ key: 'mcp_fetch_config' }) as { value: string } | undefined;

      if (result?.value) {
        const config = JSON.parse(result.value) as McpFetchConfig;
        this.enabled = config.enabled;
        this.maxLength = config.maxLength || 50000;
      } else {
        // 回退到环境变量
        this.enabled = process.env.ENABLE_MCP_FETCH === 'true';
        this.maxLength = parseInt(process.env.MCP_FETCH_MAX_LENGTH || '50000', 10);
      }
    } catch (error) {
      // 回退到环境变量
      this.enabled = process.env.ENABLE_MCP_FETCH === 'true';
      this.maxLength = parseInt(process.env.MCP_FETCH_MAX_LENGTH || '50000', 10);
    }
  }

  /**
   * 刷新配置（从数据库重新加载）
   */
  refreshConfig(): void {
    this.loadConfig();
    console.log(`[MCP Fetch] Config refreshed: enabled=${this.enabled}, maxLength=${this.maxLength}`);
  }

  async search(_query: string, _limit = 10): Promise<SearchResult[]> {
    // MCP Fetch 不直接支持搜索，它用于爬取给定 URL 的内容
    console.log('[MCP Fetch] Direct search not supported, use crawl() method instead');
    return [];
  }

  /**
   * 使用 fetch_markdown 工具获取网页 Markdown 内容
   */
  async crawl(
    url: string,
    originalContent?: string,
    options?: { timeout?: number; maxLength?: number }
  ): Promise<SearchResult | null> {
    // 刷新配置，确保使用最新的设置
    this.refreshConfig();

    if (!this.enabled) {
      return null;
    }

    // 动态导入 MCP 模块
    let mcpFetchService: any = null;
    try {
      const mcp = await import('@/lib/mcp');
      mcpFetchService = mcp.getFetchService();
    } catch (error) {
      console.error('[MCP Fetch] Failed to import MCP module:', error);
      return null;
    }

    if (!mcpFetchService || !(await mcpFetchService.isAvailable())) {
      return null;
    }

    try {
      const maxLength = options?.maxLength || this.maxLength;
      const result = await mcpFetchService.crawl(url, originalContent, {
        timeout: options?.timeout,
        maxLength,
      });

      if (!result) {
        return null;
      }

      return {
        title: result.title || url,
        url,
        content: result.content,
        source: 'mcp-fetch',
        mcpFetchContent: result.mcpFetchContent,
      };
    } catch (error) {
      console.error(`[MCP Fetch] Failed to fetch ${url}:`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * 批量爬取多个 URL
   */
  async crawlMultiple(
    urls: string[],
    originalContents?: Map<string, string>,
    options?: { timeout?: number; maxLength?: number }
  ): Promise<SearchResult[]> {
    if (urls.length === 0) return [];

    // 刷新配置，确保使用最新的设置
    this.refreshConfig();

    if (!this.enabled) return [];

    // 动态导入 MCP 模块
    let mcpFetchService: any = null;
    try {
      const mcp = await import('@/lib/mcp');
      mcpFetchService = mcp.getFetchService();
    } catch (error) {
      console.error('[MCP Fetch] Failed to import MCP module:', error);
      return [];
    }

    if (!mcpFetchService || !(await mcpFetchService.isAvailable())) {
      return [];
    }

    try {
      const results = await mcpFetchService.crawlMultiple(urls, originalContents, options);
      return results.map((result: { title?: string; url: string; content: string; mcpFetchContent?: McpFetchResult }) => ({
        title: result.title || result.url,
        url: result.url,
        content: result.content,
        source: 'mcp-fetch',
        mcpFetchContent: result.mcpFetchContent,
      }));
    } catch (error) {
      console.error('[MCP Fetch] Batch crawl error:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  async isAvailable(): Promise<boolean> {
    // 刷新配置，确保使用最新的设置
    this.refreshConfig();

    if (!this.enabled) return false;

    try {
      const mcp = await import('@/lib/mcp');
      const mcpFetchService = mcp.getFetchService();
      return mcpFetchService ? await mcpFetchService.isAvailable() : false;
    } catch {
      return false;
    }
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
    // 全部免费数据源默认启用（已移除 github，因为其搜索结果噪音大）
    'rss-hackernews', 'rss-techcrunch', 'rss-theverge', 'rss-wired', 'rss-producthunt',
    'rss-googlenews', 'rss-mittechreview',
    'rss-cnblogs', 'rss-juejin',
    'duckduckgo', 'devto', 'reddit', 'hackernews-api', 'v2ex',
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
    this.services.set('devto', new DevToService());
    this.services.set('reddit', new RedditService());
    this.services.set('hackernews-api', new HackerNewsAPIService());
    this.services.set('v2ex', new V2EXService());

    // 注册 MCP Fetch 服务
    this.services.set('mcp-fetch', new McpFetchService());

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

  // 获取 MCP Fetch 服务实例（用于全文爬取）
  getMcpFetchService(): McpFetchService | null {
    const service = this.services.get('mcp-fetch');
    if (service instanceof McpFetchService) {
      return service;
    }
    return null;
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
      { type: 'devto', name: 'Dev.to', enabled: this.isEnabled('devto'), description: '技术文章社区', free: true },
      { type: 'reddit', name: 'Reddit', enabled: this.isEnabled('reddit'), description: '技术社区讨论', free: true },
      { type: 'hackernews-api', name: 'Hacker News API', enabled: this.isEnabled('hackernews-api'), description: '官方 API 搜索', free: true },
      // 国内技术社区
      { type: 'v2ex', name: 'V2EX', enabled: this.isEnabled('v2ex'), description: '国内程序员社区', free: true },
      // 全文爬取
      { type: 'mcp-fetch', name: 'MCP Fetch', enabled: this.isEnabled('mcp-fetch'), description: 'MCP 协议网页内容提取（需启用 ENABLE_MCP_FETCH）', free: true },
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

// 获取 MCP Fetch 服务实例（用于全文爬取）
export function getMcpFetchService(): McpFetchService | null {
  try {
    const mgr = getDataSourceManager();
    return mgr.getMcpFetchService();
  } catch {
    return null;
  }
}

// 使用 MCP Fetch 爬取 URL 的完整内容
export async function mcpFetchUrl(
  url: string,
  originalContent?: string,
  timeout = 30000
): Promise<SearchResult | null> {
  const service = getMcpFetchService();
  if (!service) {
    console.warn('MCP Fetch service not available');
    return null;
  }
  return service.crawl(url, originalContent, { timeout });
}

// 使用 MCP Fetch 批量爬取多个 URL
export async function mcpFetchUrls(
  urls: string[],
  originalContents?: Map<string, string>,
  timeout = 30000
): Promise<SearchResult[]> {
  const service = getMcpFetchService();
  if (!service) {
    console.warn('MCP Fetch service not available');
    return [];
  }
  return service.crawlMultiple(urls, originalContents, { timeout });
}

// 检查 MCP Fetch 服务是否可用
export async function isMcpFetchAvailable(): Promise<boolean> {
  const service = getMcpFetchService();
  if (!service) return false;
  return service.isAvailable();
}

export type { SearchService };
