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
    try {
      const res = await fetch(
        `https://dev.to/api/articles?tag=${encodeURIComponent(query)}&per_page=${limit}`,
        { signal: AbortSignal.timeout(15000) }
      );
      if (!res.ok) throw new Error(`Dev.to API error: ${res.status}`);

      const data = await res.json();
      return (data || []).slice(0, limit).map((item: any) => ({
        title: item.title || query,
        url: item.url || item.canonical_url || '',
        content: item.description || item.title || '',
        source: 'devto',
        publishedAt: item.published_at,
      }));
    } catch (error) {
      console.error('Dev.to Search error:', error);
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

// ==================== Crawl4AI 全文爬取服务（开源）====================
//
// Crawl4AI 是一个专为 AI 设计的开源网页爬虫工具
// GitHub: https://github.com/unclecode/crawl4ai
// 特性：
// - 无需 API Key（本地部署）
// - 返回完整的 Markdown 格式内容
// - 支持 JavaScript 渲染的页面
// - 可配置超时和内容过滤
//
// 使用方式：
// 1. Docker 部署: docker run -p 8000:8000 unclecode/crawl4ai
// 2. 本地运行: python -m crawl4ai
// 3. 在设置页面配置 URL

class Crawl4AIService implements SearchService {
  name = 'Crawl4AI';
  type = 'crawl4ai' as DataSourceType;

  private baseUrl: string;
  private enabled: boolean;

  constructor() {
    // 从数据库读取配置
    this.baseUrl = 'http://localhost:11235';
    this.enabled = false;
    this.loadConfig();
  }

  private loadConfig() {
    try {
      const { settingsDb } = require('@/lib/db');
      const result = settingsDb.get.get({ key: 'crawl4ai_config' }) as { value: string } | undefined;
      if (result?.value) {
        const config = JSON.parse(result.value);
        this.baseUrl = config.url || 'http://localhost:8000';
        this.enabled = config.enabled || false;
      }
    } catch (error) {
      console.error('Failed to load Crawl4AI config:', error);
    }
  }

  private getConfig() {
    this.loadConfig();
    return { url: this.baseUrl, enabled: this.enabled };
  }

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    // Crawl4AI 不直接支持搜索，它用于爬取给定 URL 的内容
    // 这里我们使用一个占位符，实际使用时需要配合其他搜索服务获取 URL
    // 此方法在 research-agent 中被调用来爬取特定 URL
    console.log('Crawl4AI: Direct search not supported, use crawl() method instead');
    return [];
  }

  /**
   * 安全提取 Crawl4AI 返回的内容
   * 新版本 Crawl4AI 返回的 markdown 是一个 dict，包含多个字段：
   * - raw_markdown: 原始 markdown 内容（最完整）
   * - markdown_with_citations: 带引用的 markdown
   * - references_markdown: 带底部引用列表的 markdown
   * - fit_markdown: 精简版 markdown
   *
   * @param result Crawl4AI 返回的结果对象
   * @returns 提取的 markdown 文本
   */
  private extractMarkdownContent(result: any): string {
    const markdown = result?.markdown;

    // 如果是字符串，直接返回
    if (typeof markdown === 'string') {
      return markdown;
    }

    // 如果是 dict，提取 raw_markdown（最完整的内容）
    if (typeof markdown === 'object' && markdown !== null) {
      // 优先使用 raw_markdown（最完整）
      if (typeof markdown.raw_markdown === 'string' && markdown.raw_markdown.length > 0) {
        return markdown.raw_markdown;
      }
      // 其次使用 markdown_with_citations
      if (typeof markdown.markdown_with_citations === 'string' && markdown.markdown_with_citations.length > 0) {
        return markdown.markdown_with_citations;
      }
      // 再次使用 references_markdown
      if (typeof markdown.references_markdown === 'string' && markdown.references_markdown.length > 0) {
        return markdown.references_markdown;
      }
    }

    // 回退到其他字段
    if (typeof result?.content === 'string') {
      return result.content;
    }
    if (typeof result?.text === 'string') {
      return result.text;
    }

    return '';
  }

  /**
   * 解析 DuckDuckGo 重定向链接，提取真实 URL
   * @param url DuckDuckGo 重定向链接
   * @returns 真实目标 URL
   */
  private extractRealUrl(url: string): string {
    // 处理 DuckDuckGo 重定向链接
    if (url.includes('duckduckgo.com/l/') && url.includes('uddg=')) {
      try {
        const urlObj = new URL(url.startsWith('http') ? url : 'https:' + url);
        const realUrl = urlObj.searchParams.get('uddg');
        if (realUrl) {
          console.log(`[Crawl4AI] Extracted real URL from DuckDuckGo redirect`);
          return decodeURIComponent(realUrl);
        }
      } catch (e) {
        console.error('[Crawl4AI] Failed to parse DuckDuckGo redirect URL:', e);
      }
    }
    return url;
  }

  /**
   * 爬取单个 URL 的完整内容
   * @param url 目标网页 URL
   * @param originalContent 原始内容（用于记录爬取前后对比）
   * @param options 可选配置
   * @returns 爬取结果
   */
  async crawl(
    url: string,
    originalContent?: string,
    options?: { timeout?: number; markdown?: boolean }
  ): Promise<SearchResult | null> {
    const config = this.getConfig();

    // 检查是否启用
    if (!config.enabled) {
      // console.debug('Crawl4AI is disabled');
      return null;
    }

    // 解析真实 URL（处理 DuckDuckGo 重定向）
    const realUrl = this.extractRealUrl(url);
    if (realUrl !== url) {
      console.log(`[Crawl4AI] Original URL was redirect, extracted: ${realUrl.substring(0, 80)}...`);
      url = realUrl;
    }

    try {
      const timeout = options?.timeout || 30000;
      console.log(`[Crawl4AI] Crawling: ${url}`);

      // 新版本 API 格式
      const res = await fetch(`${config.url}/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: [url],
          priority: 10, // 高优先级
        }),
        signal: AbortSignal.timeout(timeout + 5000),
      });

      console.log(`[Crawl4AI] Response status: ${res.status}`);

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[Crawl4AI] Crawl failed: ${res.status} - ${errorText.substring(0, 500)}`);
        return null;
      }

      const data = await res.json();
      console.log(`[Crawl4AI] Response keys:`, Object.keys(data || {}));

      // 解析返回结果
      // 新版本返回 results 数组
      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        const result = data.results[0];
        const enrichedContent = this.extractMarkdownContent(result);
        if (enrichedContent) {
          const truncatedContent = enrichedContent.substring(0, 5000);
          return {
            title: result.title || url,
            url,
            content: truncatedContent,
            source: 'crawl4ai',
            publishedAt: result.published_at,
            // 保存爬取信息（包含原始内容和爬取后内容）
            crawl4aiContent: {
              original: originalContent || '',
              enriched: truncatedContent,
              timestamp: new Date().toISOString(),
              contentLength: truncatedContent.length,
            },
          };
        }
      }

      return null;
    } catch (error) {
      console.error('[Crawl4AI] Crawl error:', error);
      return null;
    }
  }

  /**
   * 批量爬取多个 URL（优化版本 - 真正的批量 API）
   * @param urls URL 列表
   * @param originalContents 原始内容映射（url -> originalContent）
   * @param options 可选配置
   * @returns 爬取结果数组
   */
  async crawlMultiple(
    urls: string[],
    originalContents?: Map<string, string>,
    options?: { timeout?: number; markdown?: boolean }
  ): Promise<SearchResult[]> {
    if (urls.length === 0) return [];

    const config = this.getConfig();
    if (!config.enabled) return [];

    const timeout = options?.timeout || 30000;

    // 解析 DuckDuckGo 重定向链接
    const realUrls: string[] = [];
    const urlMapping: Map<string, string> = new Map(); // realUrl -> originalUrl

    for (const url of urls) {
      const realUrl = this.extractRealUrl(url);
      realUrls.push(realUrl);
      if (realUrl !== url) {
        urlMapping.set(realUrl, url);
        // 同时保留原始内容映射
        if (originalContents?.has(url)) {
          originalContents.set(realUrl, originalContents.get(url)!);
        }
      }
    }

    if (realUrls.length !== urls.length) {
      console.log(`[Crawl4AI] Processed ${urls.length} URLs, ${urlMapping.size} were DuckDuckGo redirects`);
    }

    try {
      console.log(`[Crawl4AI] Batch crawling ${realUrls.length} URLs`);

      // 使用真正的批量 API
      const res = await fetch(`${config.url}/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: realUrls,
          priority: 10,
        }),
        signal: AbortSignal.timeout(timeout + 5000),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[Crawl4AI] Batch crawl failed: ${res.status} - ${errorText.substring(0, 500)}`);
        return [];
      }

      const data = await res.json();

      // 详细调试日志
      console.log(`[Crawl4AI] Batch response status: ${res.status}`);
      console.log(`[Crawl4AI] Response type: ${typeof data}`);
      console.log(`[Crawl4AI] Response keys: ${Object.keys(data || {}).join(', ')}`);
      if (data && typeof data === 'object') {
        console.log(`[Crawl4AI] Full response:`, JSON.stringify(data, null, 2).substring(0, 2000));
      }

      console.log(`[Crawl4AI] Batch response: ok=${res.ok}, hasResults=${!!data.results}, resultsArray=${Array.isArray(data.results)}, resultsLength=${data.results?.length}`);

      // 解析返回结果
      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        console.log(`[Crawl4AI] Processing ${data.results.length} results...`);
        const timestamp = new Date().toISOString();
        return data.results.map((result: any) => {
          const enrichedContent = this.extractMarkdownContent(result).substring(0, 5000);
          const resultUrl = result.url || 'Unknown';
          return {
            title: result.title || resultUrl,
            url: resultUrl,
            content: enrichedContent,
            source: 'crawl4ai' as const,
            publishedAt: result.published_at,
            // 保存爬取信息
            crawl4aiContent: {
              original: originalContents?.get(resultUrl) || '',
              enriched: enrichedContent,
              timestamp,
              contentLength: enrichedContent.length,
            },
          };
        });
      }

      return [];
    } catch (error) {
      console.error('[Crawl4AI] Batch crawl error:', error);
      return [];
    }
  }

  /**
   * 旧版批量爬取（逐个爬取，兼容性备用）
   * @param urls URL 列表
   * @param options 可选配置
   * @returns 爬取结果数组
   */
  async crawlMultipleLegacy(urls: string[], options?: { timeout?: number; markdown?: boolean }): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const timeout = options?.timeout || 30000;

    // 并行爬取（限制并发数）
    const concurrency = 3;
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
    }

    return results;
  }

  /**
   * 检查 Crawl4AI 服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    const config = this.getConfig();

    // 检查是否启用
    if (!config.enabled) {
      console.log('Crawl4AI: Disabled in settings');
      return false;
    }

    try {
      const res = await fetch(`${config.url}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        console.log('Crawl4AI: Service available at', config.url);
      } else {
        console.log('Crawl4AI: Health check failed (status:', res.status, ')');
      }
      return res.ok;
    } catch (error) {
      console.log('Crawl4AI: Health check failed -', error instanceof Error ? error.message : error);
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
    // 全部免费数据源默认启用
    'rss-hackernews', 'rss-techcrunch', 'rss-theverge', 'rss-wired', 'rss-producthunt',
    'rss-googlenews', 'rss-mittechreview',
    'rss-cnblogs', 'rss-juejin',
    'duckduckgo', 'github', 'devto', 'reddit', 'hackernews-api', 'v2ex',
    // crawl4ai 不在这里默认启用，由数据库配置控制
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

    // 注册 Crawl4AI 服务
    this.services.set('crawl4ai', new Crawl4AIService());

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

  // 获取 Crawl4AI 服务实例（用于全文爬取）
  getCrawl4AIService(): Crawl4AIService | null {
    const service = this.services.get('crawl4ai');
    if (service instanceof Crawl4AIService) {
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
      { type: 'crawl4ai', name: 'Crawl4AI', enabled: this.isEnabled('crawl4ai'), description: '开源全文爬虫（需在设置页配置）', free: true },
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

// 获取 Crawl4AI 服务实例（用于全文爬取）
export function getCrawl4AIService(): Crawl4AIService | null {
  try {
    const mgr = getDataSourceManager();
    return mgr.getCrawl4AIService();
  } catch {
    return null;
  }
}

// 使用 Crawl4AI 爬取 URL 的完整内容
export async function crawlUrl(
  url: string,
  originalContent?: string,
  timeout = 30000
): Promise<SearchResult | null> {
  const service = getCrawl4AIService();
  if (!service) {
    console.warn('Crawl4AI service not available');
    return null;
  }
  return service.crawl(url, originalContent, { timeout, markdown: true });
}

// 使用 Crawl4AI 批量爬取多个 URL
export async function crawlUrls(
  urls: string[],
  originalContents?: Map<string, string>,
  timeout = 30000
): Promise<SearchResult[]> {
  const service = getCrawl4AIService();
  if (!service) {
    console.warn('Crawl4AI service not available');
    return [];
  }
  return service.crawlMultiple(urls, originalContents, { timeout, markdown: true });
}

// 检查 Crawl4AI 服务是否可用
export async function isCrawl4AIAvailable(): Promise<boolean> {
  const service = getCrawl4AIService();
  if (!service) return false;
  return service.isAvailable();
}

export type { SearchService };
