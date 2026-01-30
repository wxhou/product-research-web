/**
 * Extractor Agent 爬取工具
 *
 * 封装网页内容爬取功能
 */

import { crawlUrls, isCrawl4AIAvailable } from '../../../datasources';
import type { SearchResult as DataSourceSearchResult, DataSourceType } from '../../../datasources';
import type { SearchResult, ExtractionResult } from '../../types';

/**
 * Crawl4AI 爬取结果（包含额外信息）
 */
interface Crawl4SearchResult extends DataSourceSearchResult {
  crawl4aiContent?: {
    original: string;
    enriched: string;
    timestamp: string;
    contentLength: number;
  };
}

/**
 * 爬取工具配置
 */
export interface CrawlToolsConfig {
  /** 最大并发爬取数 */
  maxConcurrency: number;
  /** 单个 URL 超时（毫秒） */
  timeout: number;
  /** 最大内容长度 */
  maxContentLength: number;
}

/** 默认配置 */
const DEFAULT_CONFIG: CrawlToolsConfig = {
  maxConcurrency: 3,
  timeout: 30000, // 30 秒
  maxContentLength: 100000, // 100KB
};

/**
 * 爬取工具集合
 */
export interface CrawlTools {
  /** 爬取单个 URL */
  crawl: (result: SearchResult) => Promise<ExtractionResult | null>;
  /** 批量爬取 */
  crawlAll: (results: SearchResult[]) => Promise<ExtractionResult[]>;
  /** 压缩提取的内容 */
  compress: (content: string, maxLength?: number) => string;
  /** 提取实体信息 */
  extractEntities: (content: string) => {
    features: string[];
    competitors: string[];
    techStack: string[];
  };
}

/**
 * 创建爬取工具
 */
export function createCrawlTools(config: Partial<CrawlToolsConfig> = {}): CrawlTools {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return {
    crawl: (result) => executeCrawl(result, finalConfig),
    crawlAll: (results) => executeCrawlAll(results, finalConfig),
    compress: (content, maxLength) => compressContent(content, maxLength || finalConfig.maxContentLength),
    extractEntities: (content) => extractEntitiesFromContent(content),
  };
}

/**
 * 执行单个 URL 爬取
 */
async function executeCrawl(
  result: SearchResult,
  config: CrawlToolsConfig
): Promise<ExtractionResult | null> {
  if (result.crawled) {
    return null;
  }

  try {
    const crawled = await Promise.race([
      crawlUrls([result.url]),
      sleep(config.timeout).then(() => [] as DataSourceSearchResult[]),
    ]);

    if (crawled.length === 0 || !crawled[0]) {
      return null;
    }

    const page = crawled[0] as Crawl4SearchResult;
    const enriched = page.crawl4aiContent?.enriched || page.content || '';
    const compressed = compressContent(enriched, config.maxContentLength);
    const entities = extractEntitiesFromContent(compressed);

    return {
      url: result.url,
      source: result.source,
      title: page.title || result.title,
      content: compressed,
      metadata: {
        crawledAt: new Date().toISOString(),
        contentLength: compressed.length,
        qualityScore: result.quality,
        features: entities.features,
        competitors: entities.competitors,
        techStack: entities.techStack,
      },
    };
  } catch (error) {
    console.error(`爬取失败 [${result.url}]:`, error);
    return null;
  }
}

/**
 * 批量爬取
 */
async function executeCrawlAll(
  results: SearchResult[],
  config: CrawlToolsConfig
): Promise<ExtractionResult[]> {
  // 过滤未爬取的结果
  const pending = results.filter((r) => !r.crawled);

  if (pending.length === 0) {
    return [];
  }

  const resultsToCrawl = pending.slice(0, 50); // 最多爬取 50 个

  const extractions: ExtractionResult[] = [];

  // 分批并发执行
  for (let i = 0; i < resultsToCrawl.length; i += config.maxConcurrency) {
    const batch = resultsToCrawl.slice(i, i + config.maxConcurrency);
    const batchResults = await Promise.all(batch.map((r) => executeCrawl(r, config)));

    for (const result of batchResults) {
      if (result) {
        extractions.push(result);
      }
    }
  }

  return extractions;
}

/**
 * 压缩内容
 */
function compressContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }

  // 保留开头和结尾，中间压缩
  const headLength = Math.floor(maxLength * 0.4);
  const tailLength = Math.floor(maxLength * 0.4);

  const head = content.slice(0, headLength);
  const tail = content.slice(-tailLength);

  return `${head}\n\n[内容已压缩，原始长度: ${content.length} 字符]\n\n${tail}`;
}

/**
 * 从内容中提取实体信息
 */
function extractEntitiesFromContent(content: string): {
  features: string[];
  competitors: string[];
  techStack: string[];
} {
  const features: string[] = [];
  const competitors: string[] = [];
  const techStack: string[] = [];

  // 简单的关键词匹配（后续可用 LLM 优化）
  const featurePatterns = [
    /功能[：:\s]+([^\n。]+)/g,
    /特性[：:\s]+([^\n。]+)/g,
    /支持[：:\s]+([^\n。]+)/g,
    /特性[：:\s]*([^\n。]+)/gim,
  ];

  const competitorPatterns = [
    /竞品[：:\s]+([^\n。]+)/g,
    /竞争对?手[：:\s]+([^\n。]+)/g,
    /相比[^\n]+([^\n。]+)/g,
  ];

  const techPatterns = [
    /技术栈[：:\s]+([^\n。]+)/g,
    /使用[^\n]+技术[：:\s]*([^\n。]+)/g,
    /基于[^\n]+([^\n。]+)/g,
  ];

  // 提取特征
  for (const pattern of featurePatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        features.push(...match[1].split(/[,，]/).map((s) => s.trim()).filter(Boolean));
      }
    }
  }

  // 提取竞品
  for (const pattern of competitorPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        competitors.push(...match[1].split(/[,，]/).map((s) => s.trim()).filter(Boolean));
      }
    }
  }

  // 提取技术栈
  for (const pattern of techPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        techStack.push(...match[1].split(/[,，]/).map((s) => s.trim()).filter(Boolean));
      }
    }
  }

  // 去重
  return {
    features: [...new Set(features)].slice(0, 20),
    competitors: [...new Set(competitors)].slice(0, 10),
    techStack: [...new Set(techStack)].slice(0, 10),
  };
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
 * 计算内容哈希（用于去重）
 */
export function computeContentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * 去除 HTML 标签
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * 生成内容摘要
 */
export function generateSummary(content: string, maxLength: number = 200): string {
  const plain = stripHtml(content);
  if (plain.length <= maxLength) {
    return plain;
  }
  return plain.slice(0, maxLength - 3) + '...';
}
