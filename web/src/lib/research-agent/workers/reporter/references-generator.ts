/**
 * 参考文献生成器
 *
 * 从报告内容中提取引用并生成参考文献列表
 */

import { generateText } from '@/lib/llm';
import { parseJsonFromLLM } from '@/lib/json-utils';

/**
 * 参考文献项
 */
export interface ReferenceItem {
  id: string;
  source: string;
  title: string;
  url?: string;
  date?: string;
  type: 'report' | 'article' | 'website' | 'paper' | 'data' | 'unknown';
  /** 可信度评分 1-5，5为最高 */
  confidence: number;
  /** 推断依据 */
  reasoning?: string;
}

/**
 * 从报告内容提取参考文献
 *
 * @param content 报告内容
 * @returns 参考文献列表
 */
export async function extractReferences(
  content: string
): Promise<ReferenceItem[]> {
  if (!content || content.trim().length === 0) {
    return [];
  }

  // 提取所有引用标注 [^1], [^2], [1], [2] 等
  const citationMatches = content.match(/\[\^?\d+\]/g) || [];
  const uniqueCitations = [...new Set(citationMatches)];

  if (uniqueCitations.length === 0) {
    return [];
  }

  // 使用 LLM 推断参考文献信息
  const prompt = `你是学术文献整理专家。报告中使用了以下引用标注：${uniqueCitations.join(', ')}

请根据报告上下文推断每条引用的详细信息。

## 要求
1. 为每个引用生成标准参考文献格式
2. 来源类型判断规则：
   - report: 行业研究报告（如IDC、Gartner、艾瑞咨询、易观）
   - article: 新闻文章（如36氪、虎嗅、钛媒体）
   - website: 官网或百科（如Wikipedia、企业官网）
   - paper: 学术论文（如IEEE、MIT、CVPR）
   - data: 数据来源（如国家统计局、行业数据库）
   - unknown: 无法确定
3. 识别已知来源：IDC、Gartner、艾瑞咨询、易观、QuestMobile、36氪、虎嗅、钛媒体等
4. 根据上下文线索给出可信度评分(1-5)：
   - 5: 明确提到具体报告名称/机构
   - 4: 有明确上下文暗示来源
   - 3: 推测性较强
   - 2: 仅有模糊线索
   - 1: 完全无法确定
5. 提供简短的推断依据

## 重要约束
- 严格JSON输出: 只返回纯JSON数组，不要任何前缀文字、后缀解释或markdown代码块标记
- 无法推断时: 如果报告中没有足够的上下文信息来推断引用来源，返回空数组 []，不要生成示例或占位符
- 禁止占位符: 不要使用 xxx 等占位符，所有字段必须有实际值

## 输出格式
返回JSON数组，只返回JSON，不要其他文字。

## 示例
输入引用：[^1], [^2]
输出：
[{
  "id": "1",
  "source": "IDC",
  "title": "中国人工智能市场预测报告",
  "type": "report",
  "confidence": 5,
  "reasoning": "文中明确提到'根据IDC报告'"
}, {
  "id": "2",
  "source": "36氪",
  "title": "某AI公司融资报道",
  "type": "article",
  "confidence": 4,
  "reasoning": "提到'据36氪报道'"
}]

报告内容摘要：
${content.substring(0, 8000)}`;

  try {
    const result = await generateText(prompt);

    // 使用项目统一的JSON解析工具
    const references = parseJsonFromLLM<ReferenceItem[]>(result, []);
    return Array.isArray(references) ? references : [];
  } catch (error) {
    console.error('[ReferencesGenerator] 生成参考文献失败:', error);
    return generateSimpleReferences(content);
  }
}

/**
 * 简单参考文献生成（基于已知的引用模式）
 */
function generateSimpleReferences(content: string): ReferenceItem[] {
  const references: ReferenceItem[] = [];

  // 常见来源模式
  const sourcePatterns = [
    { pattern: /IDC/i, source: 'IDC', type: 'report' as const, confidence: 5 },
    { pattern: /Gartner/i, source: 'Gartner', type: 'report' as const, confidence: 5 },
    { pattern: /艾瑞/i, source: '艾瑞咨询', type: 'report' as const, confidence: 4 },
    { pattern: /易观/i, source: '易观分析', type: 'report' as const, confidence: 4 },
    { pattern: /QuestMobile/i, source: 'QuestMobile', type: 'report' as const, confidence: 4 },
    { pattern: /36氪/i, source: '36Kr', type: 'article' as const, confidence: 4 },
    { pattern: /虎嗅/i, source: '虎嗅', type: 'article' as const, confidence: 4 },
    { pattern: /钛媒体/i, source: '钛媒体', type: 'article' as const, confidence: 4 },
    { pattern: /MIT|麻省理工/i, source: 'MIT', type: 'paper' as const, confidence: 4 },
    { pattern: /IEEE/i, source: 'IEEE', type: 'paper' as const, confidence: 4 },
    { pattern: / wikipedia\.org/i, source: 'Wikipedia', type: 'website' as const, confidence: 3 },
  ];

  // 提取引用编号
  const citationMatches = content.match(/\[\^?(\d+)\]/g) || [];
  const uniqueCitations = [...new Set(citationMatches.map(m => m.replace(/[\[\]^]/g, '')))];

  // 为每个唯一引用生成一个参考文献
  for (const id of uniqueCitations) {
    let reference: ReferenceItem = {
      id,
      source: '待查证',
      title: `引用来源 [${id}]`,
      type: 'unknown',
      confidence: 1,
    };

    // 尝试匹配已知来源
    for (const { pattern, source, type, confidence } of sourcePatterns) {
      if (pattern.test(content)) {
        reference = {
          id,
          source,
          title: `${source} 相关报告`,
          type,
          confidence,
        };
        break;
      }
    }

    references.push(reference);
  }

  return references;
}

/**
 * 生成参考文献章节内容
 *
 * @param references 参考文献列表
 * @returns 参考文献章节 Markdown
 */
export function generateReferencesSection(references: ReferenceItem[]): string {
  if (references.length === 0) {
    return '';
  }

  let section = '\n---\n\n## 参考文献\n\n';

  for (const ref of references) {
    // 置信度图标: ★★★☆☆
    const stars = '★'.repeat(ref.confidence) + '☆'.repeat(5 - ref.confidence);
    section += `${ref.id}. [${stars}] ${ref.source}: ${ref.title}`;
    if (ref.date) {
      section += ` (${ref.date})`;
    }
    if (ref.url) {
      section += ` - ${ref.url}`;
    }
    if (ref.reasoning) {
      section += `\n   └ ${ref.reasoning}`;
    }
    section += '\n';
  }

  return section;
}
