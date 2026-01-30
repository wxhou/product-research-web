/**
 * Extractor Agent
 *
 * 负责爬取和提取网页内容的 Agent
 *
 * 功能：
 * 1. 创建项目文件目录结构
 * 2. 使用 MCP Fetch 爬取网页内容
 * 3. 保存原始 Markdown 文件到文件系统
 * 4. 生成项目索引和清单
 */

import type { ResearchState } from '../../state';
import type { SearchResult, ExtractionResult } from '../../types';
import { createCrawlTools, type CrawlTools } from './tools';
import { updateProgress } from '../../progress/tracker';
import { createCancelCheck } from '../../cancellation/handler';
import { getFileStorageService, type FileStorageService } from '@/lib/file-storage';

/**
 * Extractor Agent 配置
 */
export interface ExtractorConfig {
  /** 最大爬取数量 */
  maxCrawlCount: number;
  /** 是否跳过已爬取的内容 */
  skipCrawled: boolean;
  /** 是否保存文件到磁盘 */
  saveToFiles: boolean;
}

/** 默认配置 */
const DEFAULT_CONFIG: ExtractorConfig = {
  maxCrawlCount: 20,
  skipCrawled: true,
  saveToFiles: true,  // 默认保存文件
};

/**
 * Extractor Agent 执行结果
 */
export interface ExtractorResult {
  success: boolean;
  extractedContent?: ExtractionResult[];
  projectPath?: string;
  rawFileCount?: number;
  error?: string;
}

/**
 * 创建 Extractor Agent
 */
function createExtractorAgent(config: Partial<ExtractorConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const crawlTools = createCrawlTools({
    maxContentLength: 100000,  // 保留完整内容（不压缩）
  });

  return {
    config: finalConfig,
    execute: (state: ResearchState) => executeExtract(state, finalConfig, crawlTools),
  };
}

/**
 * 主执行函数：提取内容并保存到文件
 */
async function executeExtract(
  state: ResearchState,
  config: ExtractorConfig,
  crawlTools: CrawlTools
): Promise<ExtractorResult> {
  const { projectId, title, description, keywords, searchResults } = state;

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
      rawFileCount: 0,
    };
  }

  // 创建文件存储服务
  const fileService = getFileStorageService();

  // 创建项目目录并初始化索引
  const projectPath = fileService.createProjectDir(projectId);
  fileService.initProjectIndex(projectPath, projectId, title, description, keywords);

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
    const rawFilePaths: string[] = [];
    let successCount = 0;

    // 分批并发爬取
    const batchSize = 3;  // 并发数
    for (let i = 0; i < targets.length; i += batchSize) {
      // 检查取消
      if (isCancelled()) {
        return {
          success: false,
          error: '爬取被用户取消',
          extractedContent: allExtractions,
          projectPath,
          rawFileCount: successCount,
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

      // 并发爬取批次
      const batchResults = await Promise.all(
        batch.map(async (result, batchIndex) => {
          const globalIndex = i + batchIndex + 1;
          return crawlWithFileSave(result, fileService, projectPath, globalIndex, crawlTools);
        })
      );

      // 收集结果
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.extraction) {
          allExtractions.push(result.extraction);
          if (result.filePath) {
            rawFilePaths.push(result.filePath);
          }
          successCount++;
        }
      }
    }

    // 更新进度
    await updateProgress(projectId, {
      stage: 'extracting',
      step: '内容提取完成',
      totalItems: targets.length,
      completedItems: targets.length,
      currentItem: `${successCount} 个页面已保存到文件`,
    });

    // 生成主文件
    const masterContent = fileService.generateMasterFile(projectPath);
    fileService.saveAnalysisFile(projectPath, 'summary', masterContent, '项目索引');

    return {
      success: true,
      extractedContent: allExtractions,
      projectPath,
      rawFileCount: successCount,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '内容提取失败',
      projectPath,
    };
  }
}

/**
 * 爬取单个 URL 并保存到文件
 */
async function crawlWithFileSave(
  result: SearchResult,
  fileService: FileStorageService,
  projectPath: string,
  index: number,
  crawlTools: CrawlTools
): Promise<{
  extraction: ExtractionResult | null;
  filePath?: string;
}> {
  try {
    // 爬取内容
    const extraction = await crawlTools.crawl(result);

    if (!extraction) {
      return { extraction: null };
    }

    // 保存到文件
    const saveResult = fileService.saveRawFile(projectPath, index, extraction.content, {
      url: result.url,
      title: extraction.title || result.title,
      source: result.source,
    });

    if (saveResult.success && saveResult.filePath) {
      // 返回完整内容给 Analyzer（保存到 state）
      return {
        extraction: {
          ...extraction,
          metadata: {
            ...extraction.metadata,
            filePath: saveResult.filePath,
          },
        },
        filePath: saveResult.filePath,
      };
    }

    return { extraction };
  } catch (error) {
    console.error(`爬取失败 [${result.url}]:`, error);
    return { extraction: null };
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

  return {
    score: Math.max(0, score),
    issues,
  };
}

// ============================================================
// 导出
// ============================================================

export { executeExtract, createExtractorAgent };
