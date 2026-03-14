/**
 * 搜索结果质量评估器
 *
 * 使用 LLM 评估搜索结果的质量
 * 评估的是搜索结果（URL + 标题 + 摘要），不是提取后的内容
 */

import type { SearchResult } from '../../types';
import { generateText } from '@/lib/llm';
import { parseJsonWithRetry } from '@/lib/json-utils';

/**
 * 搜索结果质量评估输入
 */
export interface QualityEvaluationInput {
  searchResults: SearchResult[];
}

/**
 * 单个搜索结果的评估
 */
export interface SearchResultEvaluation {
  url: string;
  title: string;
  sourceType: '官方文档' | '行业媒体' | '个人博客' | '新闻稿' | '供应商软文' | '其他';
  quality: '高' | '中' | '低';
  reason: string;
}

/**
 * 评估摘要
 */
export interface EvaluationSummary {
  highQuality: string[];
  mediumQuality: string[];
  lowQuality: string[];
  action: '继续' | '重做搜索';
}

/**
 * 搜索结果质量评估输出
 */
export interface QualityEvaluationOutput {
  evaluations: SearchResultEvaluation[];
  summary: EvaluationSummary;
}

/**
 * 质量评估 Prompt
 */
const QUALITY_EVALUATION_PROMPT = `你是一个数据源质量评估专家。请评估以下搜索结果的可信度。

注意：你评估的是"搜索结果"（URL + 标题 + 摘要），不是网页正文内容。

评估维度：
1. 来源类型：官方文档/行业媒体/个人博客/新闻稿/供应商软文/其他
2. 内容预览：标题和摘要是否包含具体数据？
3. 可信度：高/中/低

评估标准：
- 高可信：权威行业媒体、官方文档、第三方研究机构
- 中可信：一般新闻报道，技术博客
- 低可信：供应商软文，广告性质内容，无具体数据

搜索结果（URL + 标题 + 摘要）：
{search_results}

请按以下 JSON 结构返回结果，只输出纯 JSON，不要有其他文字：

{
  "evaluations": [
    {
      "url": "https://example.com",
      "sourceType": "行业媒体",
      "quality": "高",
      "reason": "简短评估理由"
    }
  ],
  "summary": {
    "highQuality": ["https://example.com"],
    "mediumQuality": [],
    "lowQuality": []
  },
  "action": "继续"
}

请勿输出 Markdown 代码块或额外说明。`;

/**
 * 评估单个搜索结果
 */
export async function evaluateSearchResults(
  input: QualityEvaluationInput
): Promise<QualityEvaluationOutput> {
  const { searchResults } = input;

  if (searchResults.length === 0) {
    return {
      evaluations: [],
      summary: {
        highQuality: [],
        mediumQuality: [],
        lowQuality: [],
        action: '重做搜索',
      },
    };
  }

  // 构建搜索结果文本
  const searchResultsText = searchResults
    .map((r, i) => `${i + 1}. URL: ${r.url}\n   标题: ${r.title}\n   摘要: ${r.content?.substring(0, 200) || '无摘要'}`)
    .join('\n\n');

  // 调用 LLM 进行评估（带重试机制）
  const prompt = QUALITY_EVALUATION_PROMPT.replace('{search_results}', searchResultsText);
  const systemPrompt = '你是一个专业的数据源质量评估专家，请根据提供的搜索结果进行客观评估。';

  // 解析 JSON 结果
  const result = await parseJsonWithRetry<{
    evaluations: SearchResultEvaluation[];
    summary: EvaluationSummary;
  }>(
    (p, maxTokens) => generateText(p, systemPrompt, { maxTokens, jsonMode: true }),
    prompt,
    3,
    8192
  );

  return result || {
    evaluations: [],
    summary: {
      highQuality: [],
      mediumQuality: [],
      lowQuality: [],
      action: '继续',
    },
  };
}

/**
 * 快速检查：是否需要重新搜索
 *
 * 基于评估结果判断是否需要继续搜索
 */
export function shouldResearch(evaluation: QualityEvaluationOutput): boolean {
  const { summary } = evaluation;

  // 如果 action 是"重做搜索"，需要重新搜索
  if (summary.action === '重做搜索') {
    return true;
  }

  // 如果高质量结果少于 5 个，可能需要重新搜索
  if (summary.highQuality.length < 5) {
    return true;
  }

  return false;
}

/**
 * 获取高质量搜索结果
 *
 * 从评估结果中筛选出高质量的搜索结果
 */
export function getHighQualityResults(
  evaluation: QualityEvaluationOutput,
  originalResults: SearchResult[]
): SearchResult[] {
  const { summary } = evaluation;
  const highQualityUrls = new Set(summary.highQuality);

  return originalResults.filter((r) => highQualityUrls.has(r.url));
}
