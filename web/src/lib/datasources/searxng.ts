/**
 * SearXNG 搜索服务
 *
 * 使用自托管的 SearXNG 实例进行搜索
 * API: http://<host>/search?q=<query>&format=json
 */

import type { DataSourceType } from './index';
import type { SearchService, SearchResult } from './index';

// 默认 SearXNG 实例地址
const DEFAULT_SEARXNG_URL = 'http://192.168.0.125:18888';

/**
 * SearXNG 搜索结果类型
 */
interface SearxngApiResult {
  url: string;
  title: string;
  content?: string;
  engine?: string;
  publishedDate?: string;
  score?: number;
}

/**
 * SearXNG API 响应
 */
interface SearxngApiResponse {
  results: SearxngApiResult[];
  query: string;
  number_of_results?: number;
}

export class SearxngService implements SearchService {
  name = 'SearXNG';
  type = 'searxng' as DataSourceType;
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || DEFAULT_SEARXNG_URL;
  }

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    try {
      const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&format=json&engines=google,bing,ddg&language=en`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'ProductResearchBot/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`[SearXNG] HTTP ${res.status}, skipping...`);
        return [];
      }

      const data: SearxngApiResponse = await res.json();

      if (!data.results || data.results.length === 0) {
        return [];
      }

      return data.results
        .slice(0, limit)
        .map((item) => ({
          title: item.title || query,
          url: item.url,
          content: item.content?.substring(0, 300) || item.title || '',
          source: 'searxng',
          publishedAt: item.publishedDate,
        }));
    } catch (error) {
      // 静默处理，不中断流程
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[SearXNG] Search timeout');
      } else {
        console.warn('[SearXNG] Search failed:', error instanceof Error ? error.message : 'Unknown error');
      }
      return [];
    }
  }
}

// 单例
let searxngService: SearxngService | null = null;

export function getSearxngService(): SearxngService {
  if (!searxngService) {
    searxngService = new SearxngService();
  }
  return searxngService;
}

export type { SearchService, SearchResult };
