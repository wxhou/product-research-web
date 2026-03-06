/**
 * Reporter Agent
 *
 * 负责生成最终报告的 Agent
 *
 * 功能：
 * 1. 收集分析结果
 * 2. 调用 LLM 生成报告
 * 3. 支持两阶段模式（大纲 + 内容）
 */

import type { ResearchState } from '../../state';
import type { AnalysisResult, Citation, ReportMetadata } from '../../types';
import {
  generateOutlinePrompt,
  generateContentPrompt,
  formatCitations,
  shouldUseTwoStage,
  serializeAnalysisData,
  type ReportGenerationContext,
} from '../../prompts/reporter';
import { generateText } from '../../../llm';
import { updateProgress } from '../../progress/tracker';
import { createCancelCheck } from '../../cancellation/handler';
import { getFileStorageService } from '@/lib/file-storage';

/**
 * Reporter Agent 配置
 */
export interface ReporterConfig {
  /** 报告标题 */
  title?: string;
  /** 最大重试次数 */
  maxRetries?: number;
}

/** 默认配置 */
const DEFAULT_CONFIG: ReporterConfig = {
  maxRetries: 3,
};

/**
 * Reporter Agent 执行结果
 */
export interface ReporterResult {
  success: boolean;
  report?: string;
  reportPath?: string;
  metadata?: ReportMetadata;
  error?: string;
}

/**
 * 创建 Reporter Agent
 */
function createReporterAgent(config: Partial<ReporterConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return {
    config: finalConfig,
    execute: (state: ResearchState) => executeReport(state, finalConfig),
  };
}

/**
 * 主执行函数：生成报告（LLM 驱动）
 */
async function executeReport(
  state: ResearchState,
  config: ReporterConfig
): Promise<ReporterResult> {
  const {
    projectId,
    title,
    keywords,
    analysis,
    citations,
  } = state;

  if (!analysis) {
    return {
      success: false,
      error: '没有可生成报告的分析结果',
    };
  }

  // 创建取消检查
  const isCancelled = createCancelCheck(projectId);
  const maxRetries = config.maxRetries ?? 3;

  try {
    // 更新进度
    await updateProgress(projectId, {
      stage: 'reporting',
      step: '准备报告数据',
      totalItems: shouldUseTwoStage(analysis) ? 3 : 2,
      completedItems: 0,
      currentItem: '整理分析结果',
    });

    // 检查取消
    if (isCancelled()) {
      return {
        success: false,
        error: '报告生成被用户取消',
      };
    }

    // 构建上下文
    const context: ReportGenerationContext = {
      title,
      keywords,
      analysis,
      citations: citations || [],
    };

    // 判断是否使用两阶段模式
    const useTwoStage = shouldUseTwoStage(analysis);

    let fullReport: string;

    if (useTwoStage) {
      // 两阶段模式：先大纲，后内容
      fullReport = await generateReportTwoStage(context, isCancelled, maxRetries, projectId);
    } else {
      // 单阶段模式：直接生成完整报告
      fullReport = await generateReportSingleStage(context, isCancelled, maxRetries, projectId);
    }

    // 检查取消
    if (isCancelled()) {
      return {
        success: false,
        error: '报告生成被用户取消',
      };
    }

    // 保存报告
    await updateProgress(projectId, {
      stage: 'reporting',
      step: '保存报告文件',
      totalItems: useTwoStage ? 3 : 2,
      completedItems: useTwoStage ? 2 : 1,
      currentItem: '写入文件',
    });

    const fileService = getFileStorageService();
    let reportPath: string | undefined;

    if (state.projectPath) {
      const saveResult = fileService.saveReport(state.projectPath, fullReport);
      if (saveResult.success && saveResult.filePath) {
        reportPath = saveResult.filePath;
      }
    }

    if (!reportPath) {
      reportPath = `task-data/project-${projectId}/report.md`;
    }

    // 完成
    await updateProgress(projectId, {
      stage: 'reporting',
      step: '报告生成完成',
      totalItems: useTwoStage ? 3 : 2,
      completedItems: useTwoStage ? 3 : 2,
      currentItem: '完成',
    });

    return {
      success: true,
      report: fullReport,
      reportPath,
      metadata: {
        reportId: `report-${projectId}`,
        projectId,
        title,
        generatedAt: new Date().toISOString(),
        keywords,
        summary: generateSummary(fullReport),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '报告生成失败',
    };
  }
}

/**
 * 单阶段模式：直接生成完整报告
 */
async function generateReportSingleStage(
  context: ReportGenerationContext,
  isCancelled: () => boolean,
  maxRetries: number,
  projectId: string
): Promise<string> {
  await updateProgress(projectId, {
    stage: 'reporting',
    step: '生成报告内容',
    totalItems: 2,
    completedItems: 1,
    currentItem: 'LLM 生成中...',
  });

  // 直接生成内容（包含大纲）
  const contentPrompt = generateContentPrompt(context, '');

  // 重试机制
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (isCancelled()) {
      throw new Error('报告生成被用户取消');
    }

    try {
      const reportContent = await generateText(contentPrompt);

      // 验证输出
      if (isValidMarkdown(reportContent)) {
        return generateTitleBlock(context.title, context.keywords) + '\n\n---\n\n' + reportContent;
      }

      console.warn(`[Reporter] Attempt ${attempt}: Invalid markdown format, retrying...`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[Reporter] Attempt ${attempt} failed:`, lastError.message);
    }
  }

  throw new Error(`报告生成失败，已重试 ${maxRetries} 次: ${lastError?.message}`);
}

/**
 * 两阶段模式：先大纲，后内容
 */
async function generateReportTwoStage(
  context: ReportGenerationContext,
  isCancelled: () => boolean,
  maxRetries: number,
  projectId: string
): Promise<string> {
  // Stage 1: 生成大纲
  await updateProgress(projectId, {
    stage: 'reporting',
    step: '生成报告大纲',
    totalItems: 3,
    completedItems: 1,
    currentItem: 'LLM 生成大纲中...',
  });

  const outlinePrompt = generateOutlinePrompt(context);
  let outline = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (isCancelled()) {
      throw new Error('报告生成被用户取消');
    }

    try {
      const outlineResult = await generateText(outlinePrompt);
      if (outlineResult.includes('##')) {
        outline = outlineResult;
        break;
      }
      console.warn(`[Reporter] Attempt ${attempt}: No outline found, retrying...`);
    } catch (error) {
      console.warn(`[Reporter] Outline attempt ${attempt} failed:`, error);
    }
  }

  if (!outline) {
    throw new Error('无法生成报告大纲');
  }

  // Stage 2: 生成内容
  await updateProgress(projectId, {
    stage: 'reporting',
    step: '生成报告内容',
    totalItems: 3,
    completedItems: 2,
    currentItem: 'LLM 生成内容中...',
  });

  const contentPrompt = generateContentPrompt(context, outline);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (isCancelled()) {
      throw new Error('报告生成被用户取消');
    }

    try {
      const reportContent = await generateText(contentPrompt);

      if (isValidMarkdown(reportContent)) {
        return generateTitleBlock(context.title, context.keywords) + '\n\n---\n\n' + reportContent;
      }

      console.warn(`[Reporter] Content attempt ${attempt}: Invalid markdown format, retrying...`);
    } catch (error) {
      console.warn(`[Reporter] Content attempt ${attempt} failed:`, error);
    }
  }

  throw new Error('报告内容生成失败');
}

/**
 * 生成报告标题块
 */
function generateTitleBlock(title: string, keywords: string[]): string {
  return `# ${title}

**关键词**: ${keywords.join(', ')}
**生成时间**: ${new Date().toLocaleString('zh-CN')}`;
}

/**
 * 验证 Markdown 格式
 */
function isValidMarkdown(content: string): boolean {
  if (!content || content.trim().length < 100) return false;
  // 检查是否包含至少一个二级标题
  return content.includes('##');
}

/**
 * 生成报告摘要
 */
function generateSummary(report: string): string {
  // 提取第一个二级标题后的内容作为摘要
  const match = report.match(/## [^#\n]+\n\n([\s\S]{1,200})/);
  if (match) {
    return match[1].trim() + '...';
  }
  return '暂无摘要';
}

// ============================================================
// 导出
// ============================================================

export { executeReport, createReporterAgent };
