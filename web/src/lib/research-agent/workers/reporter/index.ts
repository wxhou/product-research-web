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
import { createIterativeRefiner, type IterationConfig } from './iterative-refiner';

/**
 * Reporter Agent 配置
 */
export interface ReporterConfig {
  /** 报告标题 */
  title?: string;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否启用迭代优化 */
  enableIteration?: boolean;
  /** 迭代优化配置 */
  iterationConfig?: {
    /** 最大迭代次数，默认 3 */
    maxIterations?: number;
    /** 通过阈值，默认 75 */
    passThreshold?: number;
    /** 警告阈值，默认 60 */
    warnThreshold?: number;
    /** 最小收益，默认 5 */
    minImprovement?: number;
  };
}

/** 默认配置 */
const DEFAULT_CONFIG: ReporterConfig = {
  maxRetries: 3,
  enableIteration: false,
  iterationConfig: {
    maxIterations: 3,
    passThreshold: 75,
    warnThreshold: 60,
    minImprovement: 5,
  },
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
  /** 迭代优化相关信息 */
  iterationInfo?: {
    iterationsUsed: number;
    finalQualityScore: number;
    totalTokens: number;
    estimatedCost: number;
  };
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

  // 计算总步骤数
  const baseSteps = shouldUseTwoStage(analysis) ? 3 : 2;
  const iterationSteps = (config.enableIteration && config.iterationConfig?.maxIterations)
    ? config.iterationConfig.maxIterations + 1
    : 0;
  const totalSteps = baseSteps + iterationSteps;

  try {
    // 更新进度
    await updateProgress(projectId, {
      stage: 'reporting',
      step: '准备报告数据',
      totalItems: totalSteps,
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

    // 迭代优化（如果启用）
    let iterationInfo: ReporterResult['iterationInfo'];
    if (config.enableIteration && config.iterationConfig?.maxIterations && config.iterationConfig.maxIterations > 0) {
      await updateProgress(projectId, {
        stage: 'reporting',
        step: '迭代优化',
        totalItems: config.iterationConfig.maxIterations + 1,
        completedItems: 0,
        currentItem: '开始迭代优化',
      });

      const iterativeRefiner = createIterativeRefiner();
      const iterationConfig: IterationConfig = {
        maxIterations: config.iterationConfig.maxIterations,
        passThreshold: config.iterationConfig.passThreshold,
        warnThreshold: config.iterationConfig.warnThreshold,
        minImprovement: config.iterationConfig.minImprovement,
      };

      try {
        const iterationResult = await iterativeRefiner.refine({
          state,
          initialReport: fullReport,
          config: iterationConfig,
        });

        fullReport = iterationResult.finalReport;
        iterationInfo = {
          iterationsUsed: iterationResult.iterationsUsed,
          finalQualityScore: iterationResult.qualityResult.overallScore,
          totalTokens: iterationResult.costInfo.totalTokens,
          estimatedCost: iterationResult.costInfo.estimatedCost,
        };

        console.log(`[Reporter] 迭代优化完成: ${iterationResult.iterationsUsed} 次迭代, 最终评分 ${iterationResult.qualityResult.overallScore}`);
      } catch (error) {
        console.error('[Reporter] 迭代优化失败:', error);
        // 迭代失败时使用原始报告
      }
    }

    // 保存报告
    const completedBeforeSave = baseSteps - 1 + iterationSteps;
    await updateProgress(projectId, {
      stage: 'reporting',
      step: '保存报告文件',
      totalItems: totalSteps,
      completedItems: completedBeforeSave,
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
      totalItems: totalSteps,
      completedItems: totalSteps,
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
      iterationInfo,
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
