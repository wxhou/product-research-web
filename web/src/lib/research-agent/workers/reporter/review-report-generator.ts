/**
 * 评审报告生成器
 *
 * 生成结构化的报告评审报告，包含：
 * - 多维度评分
 * - 改进建议
 * - 优先级排序
 */

import { generateText } from '@/lib/llm';
import { parseJsonFromLLM } from '@/lib/json-utils';
import type { ConsistencyReport } from './consistency/detector';
import type { ReferenceValidationReport } from './references/validator';

/**
 * 评审维度评分
 */
export interface DimensionScore {
  dimension: string;
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
}

/**
 * 完整评审报告
 */
export interface ReviewReport {
  generatedAt: string;
  overallScore: number;
  dimensions: DimensionScore[];
  highPriorityIssues: string[];
  mediumPriorityIssues: string[];
  lowPriorityIssues: string[];
  improvementSuggestions: string[];
  summary: string;
}

/**
 * 评审报告生成输入
 */
export interface ReviewReportInput {
  report: string;
  industry?: string;
  productName?: string;
  consistencyReport?: ConsistencyReport;
  referenceReport?: ReferenceValidationReport;
  strategicEvaluation?: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
}

/**
 * 生成评审报告
 */
export async function generateReviewReport(input: ReviewReportInput): Promise<ReviewReport> {
  const dimensions: DimensionScore[] = [];

  // 1. 数据质量评分
  const dataScore = calculateDataQualityScore(input);
  dimensions.push(dataScore);

  // 2. 战略建议质量评分
  const strategyScore = calculateStrategyScore(input);
  dimensions.push(strategyScore);

  // 3. 竞争分析质量评分
  const competitiveScore = await calculateCompetitiveScore(input.report);
  dimensions.push(competitiveScore);

  // 4. 参考文献质量评分
  const referenceScore = calculateReferenceScore(input);
  dimensions.push(referenceScore);

  // 计算总分
  const overallScore = Math.round(
    dimensions.reduce((acc, d) => acc + d.score, 0) / dimensions.length
  );

  // 分类问题
  const { high, medium, low } = categorizeIssues(dimensions);

  // 生成改进建议
  const suggestions = generateSuggestions(dimensions);

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    dimensions,
    highPriorityIssues: high,
    mediumPriorityIssues: medium,
    lowPriorityIssues: low,
    improvementSuggestions: suggestions,
    summary: generateSummary(overallScore, high.length, medium.length),
  };
}

/**
 * 计算数据质量评分
 */
function calculateDataQualityScore(input: ReviewReportInput): DimensionScore {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  if (input.consistencyReport) {
    const { errors, warnings, totalIssues } = input.consistencyReport;

    // 错误扣分
    score -= errors * 15;
    // 警告扣分
    score -= warnings * 5;

    if (totalIssues > 0) {
      issues.push(`数据一致性: ${totalIssues}个问题`);
      suggestions.push('修复数据逻辑矛盾，验证数值计算准确性');
    }
  }

  return {
    dimension: '数据准确性',
    score: Math.max(0, score),
    issues,
    suggestions,
  };
}

/**
 * 计算战略建议质量评分
 */
function calculateStrategyScore(input: ReviewReportInput): DimensionScore {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 50; // 默认中等分数

  if (input.strategicEvaluation) {
    score = input.strategicEvaluation.score;

    issues.push(...input.strategicEvaluation.issues);
    suggestions.push(...input.strategicEvaluation.suggestions);
  } else {
    issues.push('未评估战略建议');
  }

  return {
    dimension: '战略质量',
    score: Math.max(0, Math.min(100, score)),
    issues,
    suggestions,
  };
}

/**
 * 计算竞争分析质量评分
 */
async function calculateCompetitiveScore(report: string): Promise<DimensionScore> {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 60;

  // 检查是否包含竞争分析章节
  if (!report.includes('竞争') && !report.includes('竞品')) {
    issues.push('缺少竞争分析章节');
    suggestions.push('添加竞争格局分析');
    score -= 20;
  }

  // 检查市场份额数据
  if (!report.includes('份额') && !report.includes('市场占有率')) {
    issues.push('缺少市场份额数据');
    suggestions.push('补充主要竞争对手的市场份额');
    score -= 10;
  }

  // 使用LLM评估竞争分析深度
  try {
    const prompt = `请评估以下报告的竞争分析质量（0-100分），只返回一个数字：

${report.substring(0, 3000)}`;

    const result = await generateText(prompt);
    const llmScore = parseInt(result.trim(), 10);
    if (!isNaN(llmScore) && llmScore >= 0 && llmScore <= 100) {
      score = Math.round((score + llmScore) / 2);
    }
  } catch (error) {
    console.error('[ReviewReport] LLM scoring failed:', error);
  }

  return {
    dimension: '竞争分析',
    score: Math.max(0, Math.min(100, score)),
    issues,
    suggestions,
  };
}

/**
 * 计算参考文献质量评分
 */
function calculateReferenceScore(input: ReviewReportInput): DimensionScore {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 70;

  if (input.referenceReport) {
    const { totalIssues, statistics } = input.referenceReport;

    if (totalIssues > 0) {
      issues.push(`参考文献: ${totalIssues}个问题`);
      suggestions.push('修复重复引用、编号连续性问题');
      score -= totalIssues * 10;
    }

    if (statistics) {
      if (statistics.unused > statistics.totalReferences * 0.3) {
        issues.push(`${statistics.unused}条参考文献未被引用`);
        suggestions.push('检查并清理未使用的参考文献');
        score -= 10;
      }
    }
  }

  return {
    dimension: '文献质量',
    score: Math.max(0, Math.min(100, score)),
    issues,
    suggestions,
  };
}

/**
 * 分类问题优先级
 */
function categorizeIssues(dimensions: DimensionScore[]): {
  high: string[];
  medium: string[];
  low: string[];
} {
  const high: string[] = [];
  const medium: string[] = [];
  const low: string[] = [];

  for (const dim of dimensions) {
    if (dim.score < 50) {
      high.push(`${dim.dimension}: ${dim.issues.join(', ')}`);
    } else if (dim.score < 75) {
      medium.push(`${dim.dimension}: ${dim.issues.join(', ')}`);
    } else {
      low.push(`${dim.dimension}: 良好`);
    }
  }

  return { high, medium, low };
}

/**
 * 生成改进建议
 */
function generateSuggestions(dimensions: DimensionScore[]): string[] {
  const suggestions: string[] = [];

  for (const dim of dimensions) {
    suggestions.push(...dim.suggestions);
  }

  // 去重
  return [...new Set(suggestions)];
}

/**
 * 生成摘要
 */
function generateSummary(score: number, highCount: number, mediumCount: number): string {
  if (score >= 80 && highCount === 0) {
    return '报告质量优秀，建议通过';
  } else if (score >= 60 && highCount <= 1) {
    return '报告质量良好，建议小幅修改后通过';
  } else if (score >= 40) {
    return '报告需要修改，请处理高优先级问题';
  } else {
    return '报告质量不足，建议重新生成';
  }
}

/**
 * 导出JSON格式
 */
export function exportReviewReportJSON(report: ReviewReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * 创建评审报告生成器
 */
export function createReviewReportGenerator() {
  return {
    generate: generateReviewReport,
    exportJSON: exportReviewReportJSON,
  };
}
