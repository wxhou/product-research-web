/**
 * Searcher Agent 搜索工具
 *
 * 封装各种数据源的搜索功能
 */

import { getDataSourceManager, type SearchResult as DataSourceSearchResult } from '../../../datasources';
import type { DataSourceType } from '../../../datasources';
import type { SearchQuery, SearchResult as ResearchSearchResult } from '../../types';

/**
 * 搜索工具配置
 */
export interface SearchToolsConfig {
  /** 最大并发搜索数 */
  maxConcurrency: number;
  /** 单个搜索超时（毫秒） */
  timeout: number;
  /** 每个查询最少结果数 */
  minResultsPerQuery: number;
}

/** 默认配置 */
const DEFAULT_CONFIG: SearchToolsConfig = {
  maxConcurrency: 3,
  timeout: 15000, // 15 秒
  minResultsPerQuery: 5,
};

/**
 * 搜索工具集合
 */
export interface SearchTools {
  /** 执行单个搜索 */
  search: (query: SearchQuery, source: DataSourceType) => Promise<ResearchSearchResult[]>;
  /** 并发执行多个搜索 */
  searchAll: (queries: SearchQuery[], sources: DataSourceType[]) => Promise<ResearchSearchResult[]>;
  /** 去重搜索结果 */
  deduplicate: (results: ResearchSearchResult[]) => ResearchSearchResult[];
  /** 检查是否需要爬取 */
  needsCrawl: (result: ResearchSearchResult) => boolean;
}

/**
 * 创建搜索工具
 */
export function createSearchTools(config: Partial<SearchToolsConfig> = {}): SearchTools {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const dsManager = getDataSourceManager();

  return {
    search: (query, source) => executeSearch(query, source, finalConfig, dsManager),
    searchAll: (queries, sources) => executeSearchAll(queries, sources, finalConfig, dsManager),
    deduplicate: (results) => deduplicateResults(results),
    needsCrawl: (result) => !result.crawled,
  };
}

/**
 * 将数据源结果转换为研究代理结果
 */
function toResearchSearchResult(
  dsResult: DataSourceSearchResult,
  query: SearchQuery
): ResearchSearchResult {
  // 验证 source 是否是有效的 DataSourceType
  const validSources = [
    'rss-hackernews', 'rss-techcrunch', 'rss-theverge', 'rss-wired', 'rss-producthunt',
    'duckduckgo', 'reddit', 'v2ex', 'crawl4ai'
  ];
  const sourceStr = dsResult.source;
  const source = validSources.includes(sourceStr)
    ? (sourceStr as DataSourceType)
    : 'duckduckgo' as DataSourceType;

  return {
    id: dsResult.url,
    source,
    title: dsResult.title,
    url: dsResult.url,
    quality: calculateQuality(dsResult),
    crawled: false,
    queryId: query.id,
    dimension: query.dimension,
  } as ResearchSearchResult;
}

/**
 * 计算搜索结果质量分数
 */
function calculateQuality(result: DataSourceSearchResult): number {
  let score = 5; // 基础分数
  const content = result.content || '';

  // 根据内容长度调整
  if (content.length > 500) score += 2;
  else if (content.length > 200) score += 1;

  // 根据标题质量调整
  if (result.title.length > 20 && result.title.length < 100) score += 1;

  // 根据是否有作者信息调整
  if (result.author) score += 1;

  return Math.min(10, Math.max(1, score));
}

/**
 * 执行单个搜索
 */
async function executeSearch(
  query: SearchQuery,
  source: DataSourceType,
  config: SearchToolsConfig,
  dsManager: ReturnType<typeof getDataSourceManager>
): Promise<ResearchSearchResult[]> {
  try {
    const results = await Promise.race([
      dsManager.search({ source, query: query.query, hints: query.hints }),
      sleep(config.timeout).then(() => [] as DataSourceSearchResult[]),
    ]);

    // 转换为研究代理结果格式
    return results.map((r) => toResearchSearchResult(r, query));
  } catch (error) {
    console.error(`搜索失败 [${source}]:`, error);
    return [];
  }
}

/**
 * 并发执行多个搜索
 */
async function executeSearchAll(
  queries: SearchQuery[],
  sources: DataSourceType[],
  config: SearchToolsConfig,
  dsManager: ReturnType<typeof getDataSourceManager>
): Promise<ResearchSearchResult[]> {
  // 创建所有搜索任务
  const tasks: Promise<ResearchSearchResult[]>[] = [];

  for (const query of queries) {
    for (const source of sources) {
      tasks.push(executeSearch(query, source, config, dsManager));
    }
  }

  // 并发执行（限制并发数）
  const chunkSize = config.maxConcurrency;
  const results: ResearchSearchResult[] = [];

  for (let i = 0; i < tasks.length; i += chunkSize) {
    const chunk = tasks.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk);
    results.push(...chunkResults.flat());
  }

  // 去重
  return deduplicateResults(results);
}

/**
 * 去重搜索结果
 */
function deduplicateResults(results: ResearchSearchResult[]): ResearchSearchResult[] {
  const seen = new Map<string, ResearchSearchResult>();

  for (const result of results) {
    const key = result.url;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, result);
    } else {
      // 保留质量评分更高的
      if (result.quality > existing.quality) {
        seen.set(key, result);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * 睡眠辅助函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 评估结果质量分数
 */
export function calculateQualityScore(result: ResearchSearchResult): number {
  let score = result.quality;

  // 根据内容长度调整
  if (result.content) {
    const length = result.content.length;
    if (length > 5000) score += 1;
    else if (length > 2000) score += 0.5;
    else if (length < 500) score -= 0.5;
  }

  // 根据来源调整
  const highQualitySources = ['rss-hackernews', 'rss-techcrunch'];
  if (highQualitySources.includes(result.source)) {
    score += 0.5;
  }

  return Math.min(10, Math.max(1, score));
}

/**
 * 过滤低质量结果
 */
export function filterLowQuality(results: ResearchSearchResult[], minScore: number = 3): ResearchSearchResult[] {
  return results.filter((r) => r.quality >= minScore);
}

/**
 * 按质量排序结果
 */
export function sortByQuality(results: ResearchSearchResult[]): ResearchSearchResult[] {
  return [...results].sort((a, b) => b.quality - a.quality);
}

/**
 * 限制结果数量
 */
export function limitResults(results: ResearchSearchResult[], maxCount: number): ResearchSearchResult[] {
  return sortByQuality(results).slice(0, maxCount);
}

// ============================================================
// 数据源配置
// ============================================================

/** 可用的数据源列表 */
export const AVAILABLE_SOURCES: DataSourceType[] = [
  'rss-hackernews',
  'rss-techcrunch',
  'rss-theverge',
  'rss-wired',
  'rss-producthunt',
  'duckduckgo',
  'reddit',
  'v2ex',
  'crawl4ai',
];

/** 默认启用的数据源 */
export const DEFAULT_SOURCES: DataSourceType[] = [
  'duckduckgo',
  'rss-hackernews',
  'crawl4ai',
];

/** 每个数据源的默认超时 */
export const SOURCE_TIMEOUTS: Partial<Record<DataSourceType, number>> = {
  'rss-hackernews': 10000,
  'rss-techcrunch': 10000,
  'duckduckgo': 15000,
  'crawl4ai': 60000,
  'reddit': 20000,
};
