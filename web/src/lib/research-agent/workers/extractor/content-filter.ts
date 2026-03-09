/**
 * 内容相关性过滤模块
 *
 * 对爬取内容进行相关性评分，过滤低质量/不相关内容
 */

import type { SearchResult, ExtractionResult } from '../../types';
import { generateText } from '@/lib/llm';

/**
 * URL 可信度评级表
 */
const SOURCE_CREDIBILITY = {
  // 高可信度
  'official-docs': { weight: 1.0, keywords: ['docs', 'documentation', 'developer', 'reference', 'api'] },
  'whitepaper': { weight: 1.0, keywords: ['whitepaper', 'report.pdf'] },
  'government': { weight: 1.0, keywords: ['.gov', '.org'] },

  // 中可信度
  'news': { weight: 0.7, keywords: ['news', 'article', 'press'] },
  'blog': { weight: 0.7, keywords: ['blog', 'medium.com', 'dev.to'] },
  'industry-portal': { weight: 0.7, keywords: ['industry', 'portal'] },

  // 低可信度
  'community': { weight: 0.4, keywords: ['forum', 'reddit', 'stackoverflow'] },
  'social': { weight: 0.3, keywords: ['twitter', 'x.com', 'linkedin', 'facebook'] },
} as const;

/**
 * 内容过滤输入
 */
export interface ContentFilterInput {
  url: string;
  rawContent: string;
  targetIndustry?: string;
  researchDimensions?: string[];
}

/**
 * 内容过滤输出
 */
export interface ContentFilterOutput {
  isRelevant: boolean;
  relevanceScore: number;
  confidenceScore: number;
  issues: string[];
}

/**
 * URL 可信度评估
 */
function evaluateUrlCredibility(url: string): number {
  const lowerUrl = url.toLowerCase();

  for (const [type, config] of Object.entries(SOURCE_CREDIBILITY)) {
    if (config.keywords.some(kw => lowerUrl.includes(kw))) {
      return config.weight;
    }
  }

  return 0.5; // 默认中等可信度
}

/**
 * 内容长度检查
 */
function checkContentLength(content: string): { isValid: boolean; issue?: string } {
  const minLength = 500;

  if (!content || content.trim().length === 0) {
    return { isValid: false, issue: '内容为空' };
  }

  if (content.length < minLength) {
    return { isValid: false, issue: `内容过短: ${content.length} 字符` };
  }

  return { isValid: true };
}

/**
 * 评估内容相关性
 */
async function evaluateContentRelevance(
  content: string,
  targetIndustry?: string,
  researchDimensions?: string[]
): Promise<{ score: number; confidence: number; issues: string[] }> {
  if (!targetIndustry && (!researchDimensions || researchDimensions.length === 0)) {
    // 没有行业信息，返回默认高分
    return { score: 0.7, confidence: 0.3, issues: ['缺少行业信息'] };
  }

  const prompt = `请评估以下内容与目标行业和研究维度的相关性：

## 内容摘要（前2000字符）
${content.slice(0, 2000)}

${targetIndustry ? `## 目标行业\n${targetIndustry}` : ''}
${researchDimensions?.length ? `## 研究维度\n${researchDimensions.join(', ')}` : ''}

请返回 JSON 格式的评估结果：
{
  "relevanceScore": 0-1,
  "confidenceScore": 0-1,
  "issues": ["发现的问题"]
}`;

  try {
    const responseText = await generateText(prompt);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return { score: 0.5, confidence: 0.3, issues: ['无法解析评估结果'] };
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      score: result.relevanceScore ?? 0.5,
      confidence: result.confidenceScore ?? 0.3,
      issues: result.issues ?? [],
    };
  } catch (error) {
    console.error('[ContentFilter] LLM 评估失败:', error);
    return { score: 0.5, confidence: 0.2, issues: ['LLM 评估失败'] };
  }
}

/**
 * 内容过滤主函数
 */
export async function filterContent(
  input: ContentFilterInput
): Promise<ContentFilterOutput> {
  const { url, rawContent, targetIndustry, researchDimensions } = input;
  const issues: string[] = [];

  // 1. URL 可信度评估
  const urlCredibility = evaluateUrlCredibility(url);

  // 2. 内容长度检查
  const lengthCheck = checkContentLength(rawContent);
  if (!lengthCheck.isValid) {
    return {
      isRelevant: false,
      relevanceScore: 0,
      confidenceScore: urlCredibility,
      issues: [lengthCheck.issue || '内容无效'],
    };
  }

  // 3. LLM 相关性评估
  const relevanceResult = await evaluateContentRelevance(
    rawContent,
    targetIndustry,
    researchDimensions
  );

  issues.push(...relevanceResult.issues);

  // 4. 综合评分
  const finalRelevance = relevanceResult.score;
  const finalConfidence = Math.min(
    relevanceResult.confidence * 0.7 + urlCredibility * 0.3,
    1.0
  );

  // 5. 阈值判定
  const isRelevant =
    finalRelevance >= 0.6 ||
    (finalRelevance >= 0.5 && finalConfidence >= 0.7) ||
    urlCredibility >= 0.8; // 高可信度来源降低阈值

  return {
    isRelevant,
    relevanceScore: finalRelevance,
    confidenceScore: finalConfidence,
    issues,
  };
}

/**
 * 批量过滤内容
 */
export async function filterContents(
  results: { result: SearchResult; content: string }[],
  targetIndustry?: string,
  researchDimensions?: string[]
): Promise<{ kept: SearchResult[]; filtered: SearchResult[] }> {
  const kept: SearchResult[] = [];
  const filtered: SearchResult[] = [];

  for (const { result, content } of results) {
    const filterResult = await filterContent({
      url: result.url,
      rawContent: content,
      targetIndustry,
      researchDimensions,
    });

    if (filterResult.isRelevant) {
      kept.push(result);
    } else {
      filtered.push(result);
      console.log(`[ContentFilter] 过滤低质量内容: ${result.title} - ${filterResult.issues.join(', ')}`);
    }
  }

  console.log(`[ContentFilter] 过滤完成: ${kept.length}/${results.length} 保留`);

  return { kept, filtered };
}
