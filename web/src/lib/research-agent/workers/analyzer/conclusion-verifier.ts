/**
 * 结论置信度验证器
 *
 * 使用 LLM 验证 Analyzer 输出的结论的可靠性
 */

import { generateText } from '@/lib/llm';
import { parseJsonWithRetry } from '@/lib/json-utils';

/**
 * 结论验证输入
 */
export interface ConclusionVerificationInput {
  /** 研究结论 */
  conclusions: string[];
  /** 研究主题 */
  researchTopic: string;
}

/**
 * 单个结论的验证
 */
export interface ConclusionEvaluation {
  conclusion: string;
  confidence: '高' | '中' | '低';
  evidence: string;
  issues?: string;
}

/**
 * 结论验证输出
 */
export interface ConclusionVerificationOutput {
  evaluations: ConclusionEvaluation[];
  action: '通过' | '标记' | '需重做';
}

/**
 * 结论验证 Prompt
 */
const CONCLUSION_VERIFICATION_PROMPT = `你是一个研究结论验证专家。请评估以下研究结论的可靠性。

注意：这是 Analyzer 输出的结论，需要验证结论的可靠性。

评估维度：
1. 数据支撑：结论是否基于可信数据？
2. 逻辑一致性：结论是否与多个数据点一致？
3. 来源多样性：是否引用多个独立来源？

置信度等级：
- 高：数据支撑强 + 逻辑一致 + 来源多样
- 中：数据支撑中等 + 逻辑基本一致
- 低：数据支撑弱 或 逻辑不一致

研究主题：{research_topic}

 Analyzer 输出的结论：
{conclusions}

请按以下结构输出纯 JSON（不要 Markdown 代码块，不要解释文字）：
{
  "evaluations": [
    {
      "conclusion": "结论内容",
      "confidence": "高/中/低",
      "evidence": "支撑证据",
      "issues": "发现的问题（如有）"
    }
  ],
  "action": "通过/标记/需重做"
}`;

/**
 * 验证研究结论
 */
export async function verifyConclusions(
  input: ConclusionVerificationInput
): Promise<ConclusionVerificationOutput> {
  const { conclusions, researchTopic } = input;

  if (conclusions.length === 0) {
    return {
      evaluations: [],
      action: '通过',
    };
  }

  // 构建结论文本
  const conclusionsText = conclusions.map((c, i) => `${i + 1}. ${c}`).join('\n\n');

  // 调用 LLM 进行验证（带重试机制）
  const prompt = CONCLUSION_VERIFICATION_PROMPT
    .replace('{research_topic}', researchTopic)
    .replace('{conclusions}', conclusionsText);
  const systemPrompt = '你是一个专业的研究结论验证专家，请客观评估每个结论的可靠性。';

  // 解析 JSON 结果
  const result = await parseJsonWithRetry<{
    evaluations: ConclusionEvaluation[];
    action: '通过' | '标记' | '需重做';
  }>(
    (p, maxTokens) => generateText(p, systemPrompt, { maxTokens, jsonMode: true }),
    prompt,
    3,
    8192
  );

  return result || {
    evaluations: [],
    action: '通过',
  };
}

/**
 * 过滤不可靠结论
 *
 * 返回只包含高置信度结论的列表
 */
export function filterUnreliableConclusions(
  verification: ConclusionVerificationOutput
): string[] {
  return verification.evaluations
    .filter((e) => e.confidence === '高')
    .map((e) => e.conclusion);
}

/**
 * 标记需要验证的结论
 *
 * 返回带有标记的结论列表
 */
export function markConclusionsForReview(
  verification: ConclusionVerificationOutput
): Array<{ conclusion: string; needsReview: boolean; reason?: string }> {
  return verification.evaluations.map((e) => ({
    conclusion: e.conclusion,
    needsReview: e.confidence !== '高',
    reason: e.issues,
  }));
}
