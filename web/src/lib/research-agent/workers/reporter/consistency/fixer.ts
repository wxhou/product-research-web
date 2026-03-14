/**
 * 数据修正建议器
 *
 * 基于上下文推断正确数值，提供多个修正选项
 */

import { generateText } from '@/lib/llm';
import { parseJsonFromLLM } from '@/lib/json-utils';
import type { ConsistencyIssue } from './detector';

/**
 * 修正选项
 */
export interface FixOption {
  id: string;
  description: string;
  confidence: number; // 1-5
  correctedValue?: string;
  reasoning: string;
}

/**
 * 修正建议
 */
export interface FixSuggestion {
  issueId: string;
  issueTitle: string;
  options: FixOption[];
  recommendedOption?: string;
}

/**
 * 基于规则生成修正建议（不调用 LLM）
 */
function generateRuleBasedFix(issue: ConsistencyIssue): FixSuggestion {
  const options: FixOption[] = [];

  switch (issue.type) {
    case 'percentage_overflow':
      // 百分比超过 100% 的修正
      if (issue.values && issue.values[0]) {
        const value = parseFloat(issue.values[0].replace('%', ''));
        if (value > 100) {
          // 可能是小数点位置错误
          const corrected = value / 100;
          options.push({
            id: 'fix-decimal',
            description: `将 ${issue.values[0]} 修正为 ${corrected}%`,
            confidence: 4,
            correctedValue: `${corrected}%`,
            reasoning: '可能是小数点位置错误，如 25% 写成了 2500%',
          });

          // 可能是漏了小数点
          if (value > 1000) {
            const corrected2 = value / 10000;
            options.push({
              id: 'fix-decimal-2',
              description: `将 ${issue.values[0]} 修正为 ${corrected2}%`,
              confidence: 3,
              correctedValue: `${corrected2}%`,
              reasoning: '数值过大，可能是漏写了多个小数点',
            });
          }
        }
      }
      break;

    case 'duplicate_metric':
      // 重复指标 - 建议核实
      options.push({
        id: 'verify-source',
        description: '核实数据来源，确认正确数值',
        confidence: 5,
        reasoning: '需要查阅原始数据来源来确定正确数值',
      });
      break;

    case 'logical_contradiction':
      // 逻辑矛盾
      options.push({
        id: 'review-context',
        description: '重新审视上下文语境',
        confidence: 3,
        reasoning: '可能存在语境理解差异，需要人工确认',
      });
      break;

    default:
      options.push({
        id: 'manual-review',
        description: '需要人工审查',
        confidence: 1,
        reasoning: '此问题需要人工判断',
      });
  }

  return {
    issueId: issue.id,
    issueTitle: issue.title,
    options,
    recommendedOption: options.find(o => o.confidence === Math.max(...options.map(p => p.confidence)))?.id,
  };
}

/**
 * 使用 LLM 生成修正建议
 */
async function generateLLMFix(issue: ConsistencyIssue, context: string): Promise<FixSuggestion> {
  const prompt = `你是数据修正专家。请为以下检测到的数据问题提供修正建议。

## 问题信息
- 类型: ${issue.type}
- 标题: ${issue.title}
- 描述: ${issue.description}
- 相关数值: ${issue.values?.join(', ') || '无'}
- 建议: ${issue.suggestion || '无'}

## 要求
1. 根据问题类型和上下文，提供 2-3 个可能的修正方案
2. 每个方案包含：修正描述、置信度(1-5)、推断理由
3. 标注推荐的修正方案

## 输出格式
**重要：必须返回严格符合 JSON 规范的输出**
- 所有属性名必须使用双引号包裹
- 所有字符串值必须使用双引号
- 不能使用单引号
- 不能使用尾随逗号
- 不要在 JSON 外面包裹任何文字说明

返回 JSON：
{
  "issueId": "${issue.id}",
  "issueTitle": "${issue.title}",
  "options": [
    {
      "id": "option-1",
      "description": "修正描述",
      "confidence": 4,
      "correctedValue": "修正后的数值（如适用）",
      "reasoning": "推断理由"
    }
  ],
  "recommendedOption": "推荐的选项 id"
}

## 示例
问题: 百分比超过100%，数值为250%
输出:
{
  "issueId": "pct-overflow-1",
  "issueTitle": "百分比超过 100%: 250%",
  "options": [
    {
      "id": "fix-decimal",
      "description": "将 250% 修正为 2.5%",
      "confidence": 4,
      "correctedValue": "2.5%",
      "reasoning": "可能是小数点位置错误"
    },
    {
      "id": "keep-original",
      "description": "保持原值（确认业务场景确实可超过100%）",
      "confidence": 2,
      "reasoning": "某些场景如增长率确实可能超过100%"
    }
  ],
  "recommendedOption": "fix-decimal"
}

## 报告上下文（部分）
${context.substring(0, 3000)}`;

  try {
    const result = await generateText(prompt);
    const suggestion = parseJsonFromLLM<FixSuggestion>(result);
    if (suggestion && suggestion.issueId) {
      return suggestion;
    }
    return generateRuleBasedFix(issue);
  } catch (error) {
    console.error('[Fixer] LLM fix generation failed:', error);
    return generateRuleBasedFix(issue);
  }
}

/**
 * 创建数据修正建议器
 */
export function createDataFixer() {
  return {
    suggest: async (issues: ConsistencyIssue[], context?: string): Promise<FixSuggestion[]> => {
      return generateFixSuggestions(issues, context);
    },
  };
}

/**
 * 生成修正建议列表
 */
async function generateFixSuggestions(
  issues: ConsistencyIssue[],
  context?: string
): Promise<FixSuggestion[]> {
  const suggestions: FixSuggestion[] = [];

  for (const issue of issues) {
    // 严重问题才需要修正建议
    if (issue.severity === 'error' || issue.severity === 'warning') {
      if (context) {
        const suggestion = await generateLLMFix(issue, context);
        suggestions.push(suggestion);
      } else {
        suggestions.push(generateRuleBasedFix(issue));
      }
    }
  }

  return suggestions;
}

/**
 * 应用修正到报告
 */
export function applyFix(
  content: string,
  issue: ConsistencyIssue,
  correctedValue: string
): string {
  if (!issue.values || issue.values.length === 0) {
    return content;
  }

  let corrected = content;

  for (const wrongValue of issue.values) {
    // 简单替换 - 注意这可能会替换错误的位置
    corrected = corrected.replace(wrongValue, correctedValue);
  }

  return corrected;
}

export { generateFixSuggestions, generateRuleBasedFix };
