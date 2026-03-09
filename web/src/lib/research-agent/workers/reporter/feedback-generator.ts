/**
 * Report Feedback Generator
 *
 * 将报告质量问题转化为 LLM 改进指令
 */

import type { ReportQualityResult } from './quality-checker';
import type { AnalysisResult } from '../../types';
import { generateText } from '../../../llm';

/**
 * 反馈生成输入
 */
export interface FeedbackGeneratorInput {
  qualityResult: ReportQualityResult;
  currentReport: string;
  analysis: AnalysisResult;
}

/**
 * 生成的反馈
 */
export interface GeneratedFeedback {
  summary: string;              // 问题摘要
  items: {
    dimension: string;          // 维度名称
    priority: 'high' | 'medium' | 'low';
    issue: string;            // 具体问题
    specificGuidance: string;  // 改进指导
  }[];
  rewriteInstructions: string; // 完整重写指令
}

/**
 * 维度优先级映射
 */
const DIMENSION_PRIORITY_MAP: Record<string, 'high' | 'medium' | 'low'> = {
  structural: 'high',
  depth: 'high',
  actionability: 'high',
  citation: 'medium',
};

/**
 * 维度名称映射
 */
const DIMENSION_NAME_MAP: Record<string, string> = {
  structural: '结构完整性',
  depth: '分析深度',
  actionability: '可操作性',
  citation: '引用质量',
};

/**
 * 创建反馈生成器
 */
export function createFeedbackGenerator() {
  return {
    generate: async (input: FeedbackGeneratorInput): Promise<GeneratedFeedback> => {
      return generateFeedback(input);
    },
    generateFast: (input: FeedbackGeneratorInput): GeneratedFeedback => {
      return generateFastFeedback(input);
    },
  };
}

/**
 * 生成反馈（主函数，LLM 驱动）
 */
async function generateFeedback(input: FeedbackGeneratorInput): Promise<GeneratedFeedback> {
  const { qualityResult, currentReport, analysis } = input;

  // 1. 按优先级排序问题
  const sortedItems = sortIssuesByPriority(qualityResult);

  // 2. 生成问题摘要
  const summary = generateSummary(sortedItems, qualityResult.overallScore);

  // 3. 尝试 LLM 生成详细指导
  try {
    const llmGuidance = await generateLLMGuidance(sortedItems, currentReport, analysis);

    return {
      summary,
      items: sortedItems,
      rewriteInstructions: llmGuidance,
    };
  } catch (error) {
    console.error('[FeedbackGenerator] LLM generation failed, using fallback:', error);
    // LLM 失败时使用规则基础反馈
    return {
      summary,
      items: sortedItems,
      rewriteInstructions: generateRuleBasedInstructions(sortedItems),
    };
  }
}

/**
 * 快速反馈生成（规则基础，降级方案）
 */
function generateFastFeedback(input: FeedbackGeneratorInput): GeneratedFeedback {
  const { qualityResult, currentReport, analysis } = input;

  // 1. 按优先级排序问题
  const sortedItems = sortIssuesByPriority(qualityResult);

  // 2. 生成问题摘要
  const summary = generateSummary(sortedItems, qualityResult.overallScore);

  // 3. 使用规则基础生成指令
  return {
    summary,
    items: sortedItems,
    rewriteInstructions: generateRuleBasedInstructions(sortedItems),
  };
}

/**
 * 按优先级排序问题
 * - 评分 < 50 为高优先级
 * - 评分 50-74 为中优先级
 * - 评分 >= 75 为低优先级
 */
function sortIssuesByPriority(qualityResult: ReportQualityResult): GeneratedFeedback['items'] {
  const { dimensions } = qualityResult;
  const items: GeneratedFeedback['items'] = [];

  for (const [key, score] of Object.entries(dimensions)) {
    const priority = DIMENSION_PRIORITY_MAP[key] || 'low';
    const dimensionName = DIMENSION_NAME_MAP[key] || key;

    let issue = '';
    let guidance = '';

    switch (key) {
      case 'structural':
        if (score < 60) {
          issue = '报告结构不完整，缺少必需章节或章节内容不足';
          guidance = '确保包含执行摘要、市场分析、竞争格局、功能分析、SWOT分析、战略建议等章节，且每章节至少300字';
        } else if (score < 80) {
          issue = '部分章节内容需要充实';
          guidance = '增加各章节内容长度，丰富分析细节';
        }
        break;
      case 'depth':
        if (score < 60) {
          issue = '分析深度不足，缺乏数据支撑和深入分析';
          guidance = '增加量化数据（数字、百分比、金额）、对比分析、因果分析、趋势分析等内容';
        } else if (score < 80) {
          issue = '分析深度可以进一步提升';
          guidance = '增加更多数据点和对比分析，提升分析的深度和说服力';
        }
        break;
      case 'actionability':
        if (score < 60) {
          issue = '战略建议缺乏可操作性';
          guidance = '为每条战略建议添加：1) 具体数字目标（如市场份额提升5%）；2) 实施时间表（如Q1-Q2完成）；3) 风险评估（高/中/低）';
        } else if (score < 80) {
          issue = '战略建议需要更具体';
          guidance = '完善战略建议的量化目标、时间表和风险评估，提升可操作性';
        }
        break;
      case 'citation':
        if (score < 60) {
          issue = '引用质量不足，缺乏权威来源';
          guidance = '增加引用来源，确保引用数量≥5个，来源多样性≥3种（报告、新闻、权威网站等）';
        } else if (score < 80) {
          issue = '引用可以更丰富';
          guidance = '适当增加引用数量和来源多样性';
        }
        break;
    }

    if (issue && priority !== 'low') {
      items.push({
        dimension: dimensionName,
        priority,
        issue,
        specificGuidance: guidance,
      });
    }
  }

  // 按优先级排序：高 -> 中 -> 低
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return items;
}

/**
 * 生成问题摘要
 */
function generateSummary(items: GeneratedFeedback['items'], overallScore: number): string {
  if (items.length === 0) {
    return '报告质量良好，无需改进';
  }

  const highPriorityCount = items.filter(i => i.priority === 'high').length;
  const mediumPriorityCount = items.filter(i => i.priority === 'medium').length;

  let summary = `报告综合评分 ${overallScore} 分，存在 `;
  if (highPriorityCount > 0) {
    summary += `${highPriorityCount} 个高优先级问题`;
  }
  if (mediumPriorityCount > 0) {
    summary += highPriorityCount > 0 ? `，${mediumPriorityCount} 个中优先级问题` : `${mediumPriorityCount} 个中优先级问题`;
  }
  summary += '，需要迭代优化';

  return summary;
}

/**
 * LLM 生成详细指导
 */
async function generateLLMGuidance(
  items: GeneratedFeedback['items'],
  currentReport: string,
  analysis: AnalysisResult
): Promise<string> {
  const issuesList = items
    .map((item, i) => `${i + 1}. [${item.priority.toUpperCase()}] ${item.dimension}: ${item.issue}`)
    .join('\n');

  const prompt = `你是报告优化专家。请根据以下质量问题，生成改进指令。

【当前问题】
${issuesList}

【分析数据摘要】
${JSON.stringify({
  features: analysis.features?.slice(0, 5),
  competitors: analysis.competitors?.slice(0, 5),
  marketData: analysis.marketData ? {
    marketSize: analysis.marketData.marketSize,
    growthRate: analysis.marketData.growthRate,
  } : undefined,
}, null, 2)}

【输出要求】
请生成结构化的重写指令，格式如下：

## 需要保留的部分
- 列出报告中应该保留的优质内容

## 需要修改的部分
- 针对每个问题，说明需要如何修改

## 需要新增的部分
- 列出需要新增的内容

## 重写指导
- 提供具体的重写建议和示例

请直接输出，不要有其他内容。`;

  return await generateText(prompt);
}

/**
 * 规则基础生成重写指令（降级方案）
 */
function generateRuleBasedInstructions(items: GeneratedFeedback['items']): string {
  if (items.length === 0) {
    return '报告质量良好，无需修改。';
  }

  let instructions = '## 需要修改的部分\n\n';

  for (const item of items) {
    instructions += `- ${item.dimension}（${item.priority}优先级）: ${item.specificGuidance}\n`;
  }

  instructions += '\n## 重写指导\n\n';
  instructions += '1. 优先修复高优先级问题\n';
  instructions += '2. 保持现有优质内容\n';
  instructions += '3. 在修改过程中确保逻辑连贯性\n';
  instructions += '4. 增加量化数据和分析深度\n';
  instructions += '5. 完善战略建议的可操作性\n';

  return instructions;
}

/**
 * 导出
 */
export {
  generateFeedback,
  generateFastFeedback,
  sortIssuesByPriority,
  generateSummary,
  generateRuleBasedInstructions,
};
