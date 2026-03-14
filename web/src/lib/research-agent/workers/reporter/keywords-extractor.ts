/**
 * 报告关键词提取器
 *
 * 从报告内容中提取核心关键词
 */

import { generateText } from '@/lib/llm';
import { parseJsonFromLLM } from '@/lib/json-utils';

/**
 * 从报告内容提取关键词
 *
 * @param content 报告内容
 * @param maxKeywords 最大关键词数量，默认5个
 * @returns 关键词数组
 */
export async function extractKeywordsFromReport(
  content: string,
  maxKeywords: number = 5
): Promise<string[]> {
  // 如果内容为空，返回空数组
  if (!content || content.trim().length === 0) {
    return [];
  }

  // 截取前5000字符用于关键词提取（避免过长）
  const truncatedContent = content.substring(0, 5000);

  const prompt = `你是专业的行业研究分析师。请从以下报告中提取 ${maxKeywords} 个核心关键词。

## 要求
1. 关键词必须是能概括报告主题的专业术语（如技术名词、行业术语、产品名称）
2. 优先选择出现频率高且具有区分度的词汇
3. 排除以下类型的词：
   - 常见虚词：的、了、和、是、在、有、与、或、以及
   - 泛泛而谈的词：分析、研究、报告、产品、公司、企业、市场、行业
   - 通用动词：进行、实现、提供、采用、使用

## 输出格式
**重要：必须返回严格符合 JSON 规范的输出**
- 所有属性名必须使用双引号包裹
- 所有字符串值必须使用双引号
- 不能使用单引号
- 不能使用尾随逗号
- 返回纯 JSON 数组，不要其他文字

## 示例
输入：关于人工智能在计算机视觉领域的发展研究报告...
输出：["计算机视觉", "深度学习", "卷积神经网络", "目标检测", "图像识别"]

报告内容：
${truncatedContent}`;

  try {
    const result = await generateText(prompt);

    // 使用项目统一的JSON解析工具
    const keywords = parseJsonFromLLM<string[]>(result, []);
    // 确保返回数组且不超过最大数量
    return Array.isArray(keywords) ? keywords.slice(0, maxKeywords) : [];
  } catch (error) {
    console.error('[KeywordsExtractor] 提取关键词失败:', error);
    return [];
  }
}

/**
 * 简单关键词提取（不调用 LLM）
 *
 * @param content 报告内容
 * @param maxKeywords 最大关键词数量
 * @returns 关键词数组
 */
export function extractKeywordsSimple(
  content: string,
  maxKeywords: number = 5
): string[] {
  if (!content || content.trim().length === 0) {
    return [];
  }

  // 提取标题中的词（通常在前1000字符中）
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : '';

  // 常见停用词
  const stopWords = new Set([
    '的', '了', '和', '是', '在', '有', '与', '或', '以及',
    'the', 'and', 'or', 'is', 'are', 'in', 'on', 'at',
    '分析', '报告', '研究', '产品', '公司', '企业', '市场',
  ]);

  // 提取中文词组（2-4个字符）
  const chinesePattern = /[\u4e00-\u9fa5]{2,4}/g;
  const chineseWords = content.match(chinesePattern) || [];

  // 词频统计
  const wordFreq = new Map<string, number>();
  for (const word of chineseWords) {
    if (!stopWords.has(word)) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }

  // 按频率排序
  const sortedWords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);

  // 如果标题中有词且不在列表中，优先添加
  const titleWords = title.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
  const result: string[] = [];

  // 先添加标题中的词
  for (const word of titleWords) {
    if (result.length >= maxKeywords) break;
    if (!result.includes(word)) {
      result.push(word);
    }
  }

  // 再添加高频词
  for (const word of sortedWords) {
    if (result.length >= maxKeywords) break;
    if (!result.includes(word)) {
      result.push(word);
    }
  }

  return result;
}
