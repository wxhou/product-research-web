/**
 * Report Quality Checker
 *
 * 评估报告质量的结构完整性、分析深度、可操作性和引用质量
 */

import type { AnalysisResult, Citation } from '../../types';
import { generateText } from '../../../llm';

/**
 * 质量评估输入
 */
export interface QualityCheckerInput {
  report: string;
  analysis: AnalysisResult;
  citations: Citation[];
  iterationCount?: number;
}

/**
 * 质量评估结果
 */
export interface ReportQualityResult {
  overallScore: number;           // 综合评分 0-100
  dimensions: {
    structural: number;           // 结构完整性 0-100
    depth: number;               // 分析深度 0-100
    actionability: number;        // 可操作性 0-100
    citation: number;             // 引用质量 0-100
  };
  issues: string[];              // 发现的问题
  suggestions: string[];         // 改进建议
}

/**
 * 迭代配置
 */
export interface IterationConfig {
  maxIterations?: number;      // 默认 5
  passThreshold?: number;     // 默认 75
  warnThreshold?: number;     // 默认 60
  minImprovement?: number;    // 默认 5
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
 * 必需章节列表
 */
const REQUIRED_SECTIONS = [
  '执行摘要',
  '市场分析',
  '竞争格局',
  '功能分析',
  'SWOT 分析',
  '战略建议',
];

/**
 * 创建报告质量检查器
 */
export function createReportQualityChecker() {
  return {
    evaluate: (input: QualityCheckerInput): Promise<ReportQualityResult> => {
      return evaluateReportQuality(input);
    },
  };
}

/**
 * 评估报告质量（主函数）
 */
async function evaluateReportQuality(input: QualityCheckerInput): Promise<ReportQualityResult> {
  const { report, analysis, citations } = input;

  // 1. 评估结构完整性
  const structuralScore = evaluateStructuralCompleteness(report);

  // 2. 评估分析深度（LLM 辅助，多次评估取平均）
  const depthScore = await evaluateAnalysisDepth(report);

  // 3. 评估可操作性
  const actionabilityScore = evaluateActionability(report);

  // 4. 评估引用质量
  const citationScore = evaluateCitationQuality(report, citations);

  // 5. 计算综合评分
  const overallScore = calculateOverallScore(
    structuralScore,
    depthScore,
    actionabilityScore,
    citationScore
  );

  // 6. 生成问题和建议
  const { issues, suggestions } = generateIssuesAndSuggestions({
    structural: structuralScore,
    depth: depthScore,
    actionability: actionabilityScore,
    citation: citationScore,
  });

  return {
    overallScore,
    dimensions: {
      structural: structuralScore,
      depth: depthScore,
      actionability: actionabilityScore,
      citation: citationScore,
    },
    issues,
    suggestions,
  };
}

/**
 * 评估结构完整性 (30% 权重)
 * - 检查必需章节
 * - 检查章节长度（每章节至少 300 字）
 */
function evaluateStructuralCompleteness(report: string): number {
  let score = 100;

  // 检查必需章节
  for (const section of REQUIRED_SECTIONS) {
    if (!report.includes(section) && !report.includes(`## ${section}`)) {
      score -= 20; // 缺失章节扣 20 分
    }
  }

  // 检查章节长度（粗略检查）
  const sections = report.split(/^## /m);
  for (let i = 1; i < sections.length; i++) {
    const sectionContent = sections[i].split(/^## /m)[0] || sections[i];
    if (sectionContent.length < 300) {
      score -= 10; // 内容不足扣 10 分
    }
  }

  return Math.max(0, score);
}

/**
 * 评估分析深度 (30% 权重)
 * - 统计数据点数量（数字、百分比、金额）
 * - 统计对比分析数量
 * - 评估因果分析、趋势分析
 *
 * 为确保评估一致性，采用 2 次 LLM 评估取平均
 */
async function evaluateAnalysisDepth(report: string): Promise<number> {
  // 第一次评估
  const score1 = await llmEvaluateDepth(report);
  // 第二次评估
  const score2 = await llmEvaluateDepth(report);

  // 计算平均分
  const avgScore = (score1 + score2) / 2;

  // 如果两次评估差异 > 15 分，进行第三次评估取中位数
  if (Math.abs(score1 - score2) > 15) {
    const score3 = await llmEvaluateDepth(report);
    const scores = [score1, score2, score3].sort((a, b) => a - b);
    return scores[1]; // 返回中位数
  }

  return Math.round(avgScore);
}

/**
 * LLM 评估分析深度
 */
async function llmEvaluateDepth(report: string): Promise<number> {
  const prompt = `你是报告质量评估专家。请评估以下报告的分析深度。

【评估标准】
1. 数据点数量（0-40分）：报告包含多少数据点（数字、百分比、金额等），越多越好
2. 对比分析（0-30分）：竞品对比是否有、时间对比等对比分析
3. 因果分析（0-15分）：是否分析了原因和结果
4. 趋势分析（0-15分）：是否分析了发展趋势

【报告内容】
${report.substring(0, 8000)}

【输出要求】
请直接输出一个 0-100 的数字，不要其他内容。`;

  try {
    const result = await generateText(prompt);
    const score = parseInt(result.trim().match(/\d+/)?.[0] || '0', 10);
    return Math.min(100, Math.max(0, score));
  } catch (error) {
    console.error('[QualityChecker] LLM depth evaluation failed:', error);
    // LLM 失败时使用规则基础评估
    return ruleBasedDepthEvaluation(report);
  }
}

/**
 * 规则基础的分析深度评估（降级方案）
 */
function ruleBasedDepthEvaluation(report: string): number {
  let score = 50; // 基础分

  // 数据点统计
  const numberMatches = report.match(/\d+(\.\d+)?%|\$\d+|¥\d+|\d+亿|\d+万/g);
  const dataPointCount = numberMatches ? numberMatches.length : 0;
  if (dataPointCount >= 10) score += 20;
  else if (dataPointCount >= 5) score += 10;

  // 对比分析
  const comparisonPatterns = ['对比', ' versus ', '相比', '差异', '优劣'];
  const hasComparison = comparisonPatterns.some(p => report.includes(p));
  if (hasComparison) score += 15;

  // 趋势分析
  const trendPatterns = ['趋势', '增长', '下降', '预测', '未来'];
  const hasTrend = trendPatterns.some(p => report.includes(p));
  if (hasTrend) score += 10;

  return Math.min(100, score);
}

/**
 * 评估可操作性 (25% 权重)
 * - 检查战略建议数量（≥3条）
 * - 检查是否包含量化目标
 * - 检查是否包含实施时间表
 * - 检查是否包含风险评估
 */
function evaluateActionability(report: string): number {
  let score = 0;

  // 1. 战略建议数量
  const recommendationMatches = report.match(/^\d+[\.、]\s*.+/gm);
  const recommendationCount = recommendationMatches ? recommendationMatches.length : 0;

  if (recommendationCount >= 3) {
    score += 25;
  } else if (recommendationCount >= 1) {
    score += 15;
  }

  // 2. 量化目标检查
  const hasQuantifiedGoals = /\d+(\.\d+)?%|\$\d+|¥\d+|\d+倍/.test(report);
  if (hasQuantifiedGoals) {
    score += 25;
  }

  // 3. 实施时间表检查
  const hasTimeline = /Q[1-4]|\d+月|第[一二三]季度|\d+-\d+月/.test(report);
  if (hasTimeline) {
    score += 25;
  }

  // 4. 风险评估检查
  const hasRiskAssessment = /风险|高.*中.*低|低.*中.*高/.test(report);
  if (hasRiskAssessment) {
    score += 25;
  }

  return Math.min(100, score);
}

/**
 * 评估引用质量 (15% 权重)
 * - 统计引用数量（≥5）
 * - 统计来源多样性（≥3种类型）
 */
function evaluateCitationQuality(report: string, citations: Citation[]): number {
  let score = 50; // 基础分

  // 检查报告中的引用标注
  const citationMarkers = report.match(/\[\^\d+\]|\[\d+\]/g);
  const citationCount = citationMarkers ? citationMarkers.length : 0;

  if (citationCount >= 5) {
    score += 25;
  } else if (citationCount >= 1) {
    score += 10;
  }

  // 检查来源多样性
  if (citations && citations.length > 0) {
    const sourceTypes = new Set(citations.map(c => {
      const url = c.url || '';
      if (url.includes('github.com') || url.includes('gitlab.com')) return 'code';
      if (url.includes('report') || url.includes('research')) return 'report';
      if (url.includes('news') || url.includes('blog')) return 'news';
      if (url.includes('wikipedia.org')) return 'encyclopedia';
      return 'other';
    }));

    const diversityScore = Math.min(25, sourceTypes.size * 8);
    score += diversityScore;
  } else if (citationCount > 0) {
    // 如果报告有引用但没有传入 citations，至少给部分分
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * 计算综合评分
 * 权重：结构 30%，深度 30%，可操作 25%，引用 15%
 */
function calculateOverallScore(
  structural: number,
  depth: number,
  actionability: number,
  citation: number
): number {
  return Math.round(
    structural * 0.30 +
    depth * 0.30 +
    actionability * 0.25 +
    citation * 0.15
  );
}

/**
 * 生成问题和建议
 */
function generateIssuesAndSuggestions(dimensions: {
  structural: number;
  depth: number;
  actionability: number;
  citation: number;
}): { issues: string[]; suggestions: string[] } {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // 结构完整性问题
  if (dimensions.structural < 60) {
    issues.push('报告结构不完整，缺少必需章节');
    suggestions.push('确保包含执行摘要、市场分析、竞争格局、功能分析、SWOT分析、战略建议等章节');
  } else if (dimensions.structural < 80) {
    issues.push('部分章节内容不足');
    suggestions.push('增加各章节内容长度，确保每章节至少300字');
  }

  // 分析深度问题
  if (dimensions.depth < 60) {
    issues.push('分析深度不足，缺乏数据支撑');
    suggestions.push('增加量化数据、对比分析、趋势分析等内容');
  }

  // 可操作性问题
  if (dimensions.actionability < 60) {
    issues.push('战略建议缺乏可操作性');
    suggestions.push('为每条战略建议添加量化目标、实施时间表和风险评估');
  }

  // 引用质量问题
  if (dimensions.citation < 60) {
    issues.push('引用质量不足');
    suggestions.push('增加引用来源，确保引用多样性和权威性');
  }

  return { issues, suggestions };
}

/**
 * 导出工厂函数和类型
 */
export {
  evaluateReportQuality,
  evaluateStructuralCompleteness,
  evaluateAnalysisDepth,
  evaluateActionability,
  evaluateCitationQuality,
  calculateOverallScore,
};
