/**
 * Extractor Agent
 *
 * 负责爬取和提取网页内容的 Agent
 *
 * 功能：
 * 1. 创建项目文件目录结构
 * 2. 使用 Crawl4AI 爬取网页内容
 * 3. 保存原始 Markdown 文件到文件系统
 * 4. 生成项目索引和清单
 */

import type { ResearchState } from '../../state';
import type { SearchResult, ExtractionResult } from '../../types';
import { getCrawl4AIService } from '../../../datasources';
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
  /** 爬取超时（毫秒） */
  timeout: number;
}

/** 默认配置 */
const DEFAULT_CONFIG: ExtractorConfig = {
  maxCrawlCount: 20,
  skipCrawled: true,
  saveToFiles: true,
  timeout: 60000, // 60 秒
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
  const crawl4ai = getCrawl4AIService();

  return {
    config: finalConfig,
    execute: (state: ResearchState) => executeExtract(state, finalConfig, crawl4ai),
  };
}

/**
 * 从 DuckDuckGo 重定向 URL 中提取实际 URL
 * 例如: //duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.example.com -> https://www.example.com
 */
function extractActualUrl(redirectUrl: string): string {
  // 如果是 DuckDuckGo 重定向格式
  if (redirectUrl.includes('uddg=')) {
    try {
      const urlMatch = redirectUrl.match(/uddg=([^&]+)/);
      if (urlMatch) {
        return decodeURIComponent(urlMatch[1]);
      }
    } catch {
      // 忽略解码错误
    }
  }
  // 如果是相对路径，加上协议
  if (redirectUrl.startsWith('//')) {
    return 'https:' + redirectUrl;
  }
  return redirectUrl;
}

/**
 * 主执行函数：提取内容并保存到文件
 */
async function executeExtract(
  state: ResearchState,
  config: ExtractorConfig,
  crawl4ai: ReturnType<typeof getCrawl4AIService>
): Promise<ExtractorResult> {
  const { projectId, title, description, keywords, searchResults } = state;

  // 获取待爬取的结果
  const toCrawl = config.skipCrawled
    ? searchResults.filter((r) => !r.crawled)
    : searchResults;

  // 限制数量
  const targets = toCrawl.slice(0, config.maxCrawlCount);

  // 创建文件存储服务
  const fileService = getFileStorageService();

  // 创建项目目录并初始化索引（无论是否有目标都要创建）
  const projectPath = fileService.createProjectDir(projectId);
  fileService.initProjectIndex(projectPath, projectId, title, description, keywords);

  // 如果没有待爬取的内容，返回成功（项目目录已创建）
  if (targets.length === 0) {
    return {
      success: true,
      extractedContent: [],
      projectPath,
      rawFileCount: 0,
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

    // 提取 URL 列表（处理 DuckDuckGo 重定向）
    const urls = targets.map((r) => extractActualUrl(r.url));

    // 使用 Crawl4AI 批量爬取
    console.log(`[Extractor] 使用 Crawl4AI 爬取 ${urls.length} 个 URL`);
    const crawlResults = await crawl4ai.crawlMultiple(urls, undefined, {
      timeout: config.timeout,
    });

    // 统计成功数量
    const successfulResults = crawlResults.filter(r => r.success && r.markdown);

    if (successfulResults.length === 0) {
      const errors = crawlResults.filter(r => r.error).map(r => r.error).join(', ');
      return {
        success: false,
        error: errors || '所有 URL 爬取失败',
        projectPath,
      };
    }

    // 更新进度
    await updateProgress(projectId, {
      stage: 'extracting',
      step: `爬取完成，处理 ${successfulResults.length} 个结果`,
      totalItems: targets.length,
      completedItems: targets.length,
      currentItem: `${successfulResults.length} 个页面`,
    });

    const allExtractions: ExtractionResult[] = [];
    const rawFilePaths: string[] = [];
    let successCount = 0;

    // 处理爬取结果
    for (let i = 0; i < crawlResults.length; i++) {
      const result = crawlResults[i];
      const originalResult = targets[i];

      if (!result.success || typeof result.markdown !== 'string') {
        console.warn(`[Extractor] 爬取失败: ${result.url} - ${result.error || 'markdown 非字符串或为空'}`);
        continue;
      }

      // 确保 content 是字符串
      const markdownContent = String(result.markdown);
      if (markdownContent.length === 0) {
        console.warn(`[Extractor] 爬取内容为空: ${result.url}`);
        continue;
      }

      // 清理内容（移除导航、页脚等非正文内容）
      const cleaned = cleanContent(markdownContent);

      // 记录清理效果
      if (cleaned.length < markdownContent.length * 0.5) {
        console.log(`[Extractor] 内容清理: ${markdownContent.length} → ${cleaned.length} 字符 (减少 ${Math.round((1 - cleaned.length / markdownContent.length) * 100)}%)`);
      }

      // 压缩内容
      const maxContentLength = 100000;
      const compressed = compressContent(cleaned, maxContentLength);

      // 提取实体信息
      const entities = extractEntitiesFromContent(compressed);

      const extraction: ExtractionResult = {
        url: result.url,
        source: originalResult.source,
        title: result.metadata?.title || originalResult.title,
        content: compressed,
        metadata: {
          crawledAt: new Date().toISOString(),
          contentLength: compressed.length,
          qualityScore: originalResult.quality,
          features: entities.features,
          competitors: entities.competitors,
          techStack: entities.techStack,
        },
      };

      allExtractions.push(extraction);

      // 保存到文件
      if (config.saveToFiles) {
        const saveResult = fileService.saveRawFile(projectPath, i + 1, compressed || result.markdown, {
          url: result.url,
          title: extraction.title,
          source: originalResult.source,
        });

        if (saveResult.success && saveResult.filePath) {
          rawFilePaths.push(saveResult.filePath);
          extraction.metadata.filePath = saveResult.filePath;
        }
      }

      successCount++;

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
 * 清理和优化提取的内容
 * 移除导航、页脚、侧边栏等非正文内容
 * 注意：避免过度清理，保留有价值的短内容
 */
function cleanContent(content: string): string {
  let cleaned = content;

  // 移除常见的导航和菜单内容（更宽松的模式）
  const navigationPatterns = [
    /\[(?:首页|主页|Home)\].*?(?=\n|$)/gi,
    /(?:导航|菜单|Menu|Navigation)[：:\s]*[^\n]*/gi,
  ];

  for (const pattern of navigationPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // 移除空行
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

  // 移除过短的非内容行（更宽松：保留有标点的行）
  const lines = cleaned.split('\n');
  const meaningfulLines = lines.filter(line => {
    const stripped = line.trim();
    // 保留：非空行、有实质内容的行
    if (!stripped) return false;
    // 过滤掉纯符号和空白
    if (/^[·\s\x00-\x1f]+$/.test(stripped)) return false;
    // 过滤掉单字符无意义行（但保留中文标点和数字）
    if (stripped.length === 1 && !stripped.match(/[。！？：；、．，,。]/) && !/\d/.test(stripped)) return false;
    return true;
  });

  cleaned = meaningfulLines.join('\n');

  // 移除开头和结尾的空白
  cleaned = cleaned.trim();

  return cleaned;
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
