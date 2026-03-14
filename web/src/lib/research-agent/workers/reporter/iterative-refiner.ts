/**
 * Report Iterative Refiner
 *
 * 协调报告质量评估、反馈生成、迭代优化的循环流程
 */

import type { ResearchState } from '../../state';
import type { AnalysisResult, Citation } from '../../types';
import type { ReportQualityResult, IterationConfig } from './quality-checker';
export type { IterationConfig } from './quality-checker';
import type { GeneratedFeedback } from './feedback-generator';
import { createReportQualityChecker } from './quality-checker';
import { createFeedbackGenerator } from './feedback-generator';
import { generateText } from '../../../llm';
import { updateProgress } from '../../progress/tracker';

/**
 * 迭代优化输入
 */
export interface IterativeRefinerInput {
  state: ResearchState;
  initialReport: string;
  config?: IterationConfig;
}

/**
 * 迭代结果
 */
export interface IterationResult {
  success: boolean;
  finalReport: string;
  iterationsUsed: number;
  qualityResult: ReportQualityResult;
  costInfo: {
    totalTokens: number;
    estimatedCost: number;
  };
  metadata?: {
    allVersions: Array<{
      iteration: number;
      report: string;
      score: number;
    }>;
    stoppedReason?: string;
  };
}

/**
 * 质量决策
 */
interface QualityDecision {
  action: 'pass' | 'warn' | 'iterate' | 'force_stop';
  reason: string;
}

/**
 * 迭代版本记录
 */
interface IterationRecord {
  iteration: number;
  report: string;
  score: number;
  qualityResult: ReportQualityResult;
  tokens: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<IterationConfig> = {
  maxIterations: 5,
  passThreshold: 75,
  warnThreshold: 60,
  minImprovement: 5,
};

/**
 * 创建迭代优化器
 */
export function createIterativeRefiner() {
  const qualityChecker = createReportQualityChecker();
  const feedbackGenerator = createFeedbackGenerator();

  return {
    refine: async (input: IterativeRefinerInput): Promise<IterationResult> => {
      return runIteration(input, qualityChecker, feedbackGenerator);
    },
  };
}

/**
 * 运行迭代优化主函数
 */
async function runIteration(
  input: IterativeRefinerInput,
  qualityChecker: ReturnType<typeof createReportQualityChecker>,
  feedbackGenerator: ReturnType<typeof createFeedbackGenerator>
): Promise<IterationResult> {
  const { state, initialReport, config } = input;
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const { analysis, citations } = state;

  if (!analysis) {
    return {
      success: false,
      finalReport: initialReport,
      iterationsUsed: 0,
      qualityResult: {
        overallScore: 0,
        dimensions: { structural: 0, depth: 0, actionability: 0, citation: 0 },
        issues: ['缺少分析数据'],
        suggestions: [],
      },
      costInfo: { totalTokens: 0, estimatedCost: 0 },
    };
  }

  // 记录所有迭代版本
  const allVersions: IterationRecord[] = [];
  let currentReport = initialReport;
  let previousScore = 0;
  let totalTokens = 0;

  // 迭代主循环
  for (let iteration = 1; iteration <= finalConfig.maxIterations; iteration) {
    // 更新进度
    await updateProgress(state.projectId, {
      stage: 'reporting',
      step: `迭代优化 (${iteration}/${finalConfig.maxIterations})`,
      totalItems: finalConfig.maxIterations + 1,
      completedItems: iteration - 1,
      currentItem: `评估报告质量 (第 ${iteration} 次)`,
    });

    // 1. 质量评估
    const qualityResult = await qualityChecker.evaluate({
      report: currentReport,
      analysis,
      citations: citations || [],
      iterationCount: iteration,
    });

    // 记录版本
    const estimatedTokens = estimateTokens(currentReport);
    allVersions.push({
      iteration,
      report: currentReport,
      score: qualityResult.overallScore,
      qualityResult,
      tokens: estimatedTokens,
    });
    totalTokens += estimatedTokens;

    // 2. 质量决策
    const decision = makeDecision(qualityResult, iteration, previousScore, finalConfig);

    // 3. 通过或警告 → 保存报告，退出
    if (decision.action === 'pass' || decision.action === 'warn') {
      return {
        success: decision.action === 'pass',
        finalReport: currentReport,
        iterationsUsed: iteration,
        qualityResult,
        costInfo: {
          totalTokens,
          estimatedCost: estimateCost(totalTokens),
        },
        metadata: {
          allVersions: allVersions.map(v => ({
            iteration: v.iteration,
            report: v.report,
            score: v.score,
          })),
          stoppedReason: decision.reason,
        },
      };
    }

    // 4. 强制停止 → 保存最佳报告，退出
    if (decision.action === 'force_stop') {
      const bestVersion = findBestVersion(allVersions);
      return {
        success: false,
        finalReport: bestVersion.report,
        iterationsUsed: iteration,
        qualityResult: bestVersion.qualityResult,
        costInfo: {
          totalTokens,
          estimatedCost: estimateCost(totalTokens),
        },
        metadata: {
          allVersions: allVersions.map(v => ({
            iteration: v.iteration,
            report: v.report,
            score: v.score,
          })),
          stoppedReason: decision.reason,
        },
      };
    }

    // 5. 需要迭代 → 生成反馈，改进报告
    await updateProgress(state.projectId, {
      stage: 'reporting',
      step: `迭代优化 (${iteration}/${finalConfig.maxIterations})`,
      totalItems: finalConfig.maxIterations + 1,
      completedItems: iteration,
      currentItem: `生成改进建议 (第 ${iteration} 次)`,
    });

    // 生成反馈
    const feedback = await feedbackGenerator.generate({
      qualityResult,
      currentReport,
      analysis,
    });

    // 改进报告
    const refinePrompt = generateRefinePrompt(currentReport, feedback);
    const refinedReport = await generateText(refinePrompt);

    // 检查改进是否有效
    // 注意：这里不重新评估，因为我们会在下次迭代开始时评估

    // 更新分数并继续循环
    previousScore = qualityResult.overallScore;
    currentReport = refinedReport;
    iteration++;

    // 如果达到最大迭代次数，退出
    if (iteration > finalConfig.maxIterations) {
      // 最终评估一次
      const finalQuality = await qualityChecker.evaluate({
        report: currentReport,
        analysis,
        citations: citations || [],
        iterationCount: iteration,
      });

      allVersions.push({
        iteration,
        report: currentReport,
        score: finalQuality.overallScore,
        qualityResult: finalQuality,
        tokens: estimateTokens(currentReport),
      });

      const bestVersion = findBestVersion(allVersions);

      return {
        success: bestVersion.score >= finalConfig.passThreshold,
        finalReport: bestVersion.report,
        iterationsUsed: finalConfig.maxIterations,
        qualityResult: bestVersion.qualityResult,
        costInfo: {
          totalTokens,
          estimatedCost: estimateCost(totalTokens),
        },
        metadata: {
          allVersions: allVersions.map(v => ({
            iteration: v.iteration,
            report: v.report,
            score: v.score,
          })),
          stoppedReason: '达到最大迭代次数',
        },
      };
    }
  }

  // 理论上不会到达这里
  const bestVersion = findBestVersion(allVersions);
  return {
    success: false,
    finalReport: bestVersion.report,
    iterationsUsed: finalConfig.maxIterations,
    qualityResult: bestVersion.qualityResult,
    costInfo: {
      totalTokens,
      estimatedCost: estimateCost(totalTokens),
    },
    metadata: {
      allVersions: allVersions.map(v => ({
        iteration: v.iteration,
        report: v.report,
        score: v.score,
      })),
    },
  };
}

/**
 * 质量决策函数
 */
function makeDecision(
  qualityResult: ReportQualityResult,
  iteration: number,
  previousScore: number,
  config: Required<IterationConfig>
): QualityDecision {
  const { overallScore } = qualityResult;

  // 评分区间判断
  if (overallScore >= config.passThreshold) {
    return { action: 'pass', reason: '质量达标' };
  }

  if (overallScore >= config.warnThreshold) {
    // 检查迭代收益
    const improvement = overallScore - previousScore;
    if (previousScore > 0 && improvement < config.minImprovement) {
      return { action: 'force_stop', reason: `迭代收益不足 (${improvement} < ${config.minImprovement})` };
    }
    return { action: 'warn', reason: '质量一般，可接受' };
  }

  if (overallScore >= 50) {
    // 检查迭代收益
    const improvement = overallScore - previousScore;
    if (previousScore > 0 && improvement < config.minImprovement) {
      return { action: 'force_stop', reason: `迭代收益不足 (${improvement} < ${config.minImprovement})` };
    }
    if (previousScore > 0 && improvement < 0) {
      return { action: 'force_stop', reason: '质量下降，回退到上一版本' };
    }
    return { action: 'iterate', reason: '需要迭代优化' };
  }

  return { action: 'force_stop', reason: '质量严重不足' };
}

/**
 * 找到最佳版本
 */
function findBestVersion(versions: IterationRecord[]): IterationRecord {
  return versions.reduce((best, current) =>
    current.score > best.score ? current : best
  );
}

/**
 * 生成改进提示
 */
function generateRefinePrompt(currentReport: string, feedback: GeneratedFeedback): string {
  return `你是专业的产品调研报告撰写专家。

【当前报告】
${currentReport.substring(0, 12000)}

【质量问题反馈】
${feedback.rewriteInstructions}

【任务】
请根据以上反馈，改进当前的报告。
- 保留报告的优质部分
- 针对反馈中的问题进行修改
- 确保改进后的报告：
  1. 包含完整的章节结构
  2. 有足够的数据支撑和深入分析
  3. 战略建议包含量化目标、实施时间表、风险评估
  4. 有充分的引用来源

请直接输出改进后的完整报告，不要有其他内容。`;
}

/**
 * 估算 Token 数量
 * 粗略估算：1 token ≈ 4 characters
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * 估算成本
 * 默认价格：$0.01 / 1K tokens
 */
function estimateCost(tokens: number): number {
  const pricePerKTokens = 0.01;
  return (tokens / 1000) * pricePerKTokens;
}

/**
 * 导出
 */
export {
  runIteration,
  makeDecision,
  findBestVersion,
  generateRefinePrompt,
  estimateTokens,
  estimateCost,
};
