/**
 * Extractor Agent
 *
 * 负责爬取和提取网页内容的 Agent
 *
 * 功能：
 * 1. 获取待爬取的搜索结果
 * 2. 爬取网页内容
 * 3. 提取结构化信息
 * 4. 更新状态
 */

import type { ResearchState } from '../../state';
import type { SearchResult, ExtractionResult } from '../../types';
import { createCrawlTools, type CrawlTools } from './tools';
import { updateProgress } from '../../progress/tracker';
import { createCancelCheck } from '../../cancellation/handler';

/**
 * Extractor Agent 配置
 */
export interface ExtractorConfig {
  /** 最大爬取数量 */
  maxCrawlCount: number;
  /** 是否跳过已爬取的内容 */
  skipCrawled: boolean;
  /** 是否压缩内容 */
  enableCompression: boolean;
  /** 压缩后的最大长度 */
  maxCompressedLength: number;
}

/** 默认配置 */
const DEFAULT_CONFIG: ExtractorConfig = {
  maxCrawlCount: 20,
  skipCrawled: true,
  enableCompression: true,
  maxCompressedLength: 50000, // 50KB
};

/**
 * Extractor Agent 执行结果
 */
export interface ExtractorResult {
  success: boolean;
  extractedContent?: ExtractionResult[];
  error?: string;
}

/**
 * 创建 Extractor Agent
 */
function createExtractorAgent(config: Partial<ExtractorConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const tools = createCrawlTools({
    maxContentLength: finalConfig.maxCompressedLength,
  });

  return {
    config: finalConfig,
    execute: (state: ResearchState) => executeExtract(state, finalConfig, tools),
  };
}

/**
 * 主执行函数：提取内容
 */
async function executeExtract(
  state: ResearchState,
  config: ExtractorConfig,
  tools: CrawlTools
): Promise<ExtractorResult> {
  const { projectId, searchResults, extractedContent } = state;

  // 获取待爬取的结果
  const toCrawl = config.skipCrawled
    ? searchResults.filter((r) => !r.crawled)
    : searchResults;

  // 限制数量
  const targets = toCrawl.slice(0, config.maxCrawlCount);

  if (targets.length === 0) {
    return {
      success: true,
      extractedContent: [],
    };
  }

  // 创建取消检查
  const isCancelled = createCancelCheck(projectId);

  try {
    // 更新进度
    await updateProgress(projectId, {
      stage: 'extracting',
      step: '开始爬取内容',
      totalItems: targets.length,
      completedItems: 0,
      currentItem: targets[0]?.url || '',
    });

    const allExtractions: ExtractionResult[] = [];
    const batchSize = config.maxCrawlCount;

    // 分批爬取
    for (let i = 0; i < targets.length; i += batchSize) {
      // 检查取消
      if (isCancelled()) {
        return {
          success: false,
          error: '爬取被用户取消',
          extractedContent: allExtractions,
        };
      }

      const batch = targets.slice(i, i + batchSize);

      await updateProgress(projectId, {
        stage: 'extracting',
        step: `爬取进度 ${Math.min(i + batchSize, targets.length)}/${targets.length}`,
        totalItems: targets.length,
        completedItems: i,
        currentItem: batch[0]?.url || '',
      });

      // 爬取批次
      const batchResults = await tools.crawlAll(batch);
      allExtractions.push(...batchResults);
    }

    // 更新进度
    await updateProgress(projectId, {
      stage: 'extracting',
      step: '内容提取完成',
      totalItems: targets.length,
      completedItems: targets.length,
      currentItem: `${allExtractions.length} 个页面`,
    });

    return {
      success: true,
      extractedContent: allExtractions,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '内容提取失败',
    };
  }
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 合并提取结果
 */
export function mergeExtractions(
  existing: ExtractionResult[],
  newResults: ExtractionResult[]
): ExtractionResult[] {
  const urlMap = new Map<string, ExtractionResult>();

  // 添加已存在的结果
  for (const ext of existing) {
    urlMap.set(ext.url, ext);
  }

  // 添加新的结果（覆盖已存在的）
  for (const ext of newResults) {
    urlMap.set(ext.url, ext);
  }

  return Array.from(urlMap.values());
}

/**
 * 评估提取质量
 */
export function evaluateExtractionQuality(
  extractions: ExtractionResult[]
): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 100;

  if (extractions.length === 0) {
    return { score: 0, issues: ['没有提取到任何内容'] };
  }

  // 检查提取数量
  const minExpected = 5;
  if (extractions.length < minExpected) {
    issues.push(`提取数量不足: ${extractions.length}/${minExpected}`);
    score -= (minExpected - extractions.length) * 5;
  }

  // 检查内容质量
  let totalLength = 0;
  let emptyContentCount = 0;

  for (const ext of extractions) {
    totalLength += ext.content.length;
    if (ext.content.length < 100) {
      emptyContentCount++;
    }
  }

  const avgLength = totalLength / extractions.length;

  if (avgLength < 1000) {
    issues.push(`平均内容长度过短: ${Math.round(avgLength)} 字符`);
    score -= 10;
  }

  if (emptyContentCount > extractions.length * 0.3) {
    issues.push(`空内容过多: ${emptyContentCount}/${extractions.length}`);
    score -= 15;
  }

  // 检查实体提取
  let totalFeatures = 0;
  let totalCompetitors = 0;
  let totalTech = 0;

  for (const ext of extractions) {
    totalFeatures += ext.metadata.features.length;
    totalCompetitors += ext.metadata.competitors.length;
    totalTech += ext.metadata.techStack.length;
  }

  if (totalFeatures < 5) {
    issues.push('功能提取不足');
    score -= 5;
  }

  return {
    score: Math.max(0, score),
    issues,
  };
}

// ============================================================
// 导出
// ============================================================

export { executeExtract, createExtractorAgent };
