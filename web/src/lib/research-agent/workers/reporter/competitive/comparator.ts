/**
 * 竞品对比器
 *
 * 生成功能对比矩阵，分析差异化定位
 */

import { generateText } from '@/lib/llm';
import { parseJsonFromLLM } from '@/lib/json-utils';
import type { CompetitorInfo } from './analyzer';

/**
 * 对比维度
 */
export type CompareDimension =
  | '功能'
  | '价格'
  | '用户体验'
  | '技术能力'
  | '市场份额'
  | '客户支持'
  | '集成能力'
  | '安全性';

/**
 * 对比结果项
 */
export interface ComparisonResult {
  dimension: CompareDimension;
  competitor: string;
  rating: number; // 1-5
  description: string;
  pros?: string[];
  cons?: string[];
}

/**
 * 对比矩阵
 */
export interface ComparisonMatrix {
  title: string;
  dimensions: CompareDimension[];
  competitors: string[];
  results: ComparisonResult[];
  summary: string;
  differentiators: Array<{
    competitor: string;
    differentiation: string;
  }>;
}

/**
 * 预定义对比维度
 */
const DEFAULT_DIMENSIONS: CompareDimension[] = [
  '功能', '价格', '用户体验', '技术能力', '集成能力', '安全性'
];

/**
 * 使用 LLM 生成对比矩阵
 */
async function generateComparisonMatrixWithLLM(
  competitors: CompetitorInfo[],
  dimensions: CompareDimension[],
  productName?: string
): Promise<ComparisonMatrix> {
  const competitorNames = competitors.map(c => c.name).join(', ');

  const prompt = `你是行业分析专家。请为以下竞品生成详细的对比矩阵。

## 竞品列表
${competitorNames}

## 对比维度
${dimensions.join(', ')}

## 参考信息
${competitors.map(c => `
### ${c.name}
- 定位: ${c.positioning}
- 产品: ${c.products.join(', ')}
- 优势: ${c.strengths.join(', ')}
- 劣势: ${c.weaknesses.join(', ')}
`).join('\n')}

## 要求
1. 对每个竞品的每个维度给出评分(1-5分)和简要描述
2. 识别各竞品的差异化定位
3. 总结整体竞争格局

## 输出格式
**重要：必须返回严格符合 JSON 规范的输出**
- 所有属性名必须使用双引号包裹
- 所有字符串值必须使用双引号
- 不能使用单引号
- 不能使用尾随逗号
- 不要在 JSON 外面包裹任何文字说明

返回 JSON：
{
  "title": "竞品对比分析",
  "dimensions": ["功能", "价格", ...],
  "competitors": ["竞品1", "竞品2", ...],
  "results": [
    {
      "dimension": "功能",
      "competitor": "竞品1",
      "rating": 4,
      "description": "功能描述",
      "pros": ["优点1"],
      "cons": ["缺点1"]
    }
  ],
  "summary": "竞争格局总结",
  "differentiators": [
    {"competitor": "竞品1", "differentiation": "差异化描述"}
  ]
}

## 示例
输入: 竞品["钉钉","飞书"], 维度["功能","价格","用户体验"]
输出:
{
  "title": "竞品对比分析",
  "dimensions": ["功能", "价格", "用户体验"],
  "competitors": ["钉钉", "飞书"],
  "results": [
    {"dimension": "功能", "competitor": "钉钉", "rating": 5, "description": "功能全面，企业生态完善", "pros": ["考勤打卡", "审批流程"], "cons": ["学习成本高"]},
    {"dimension": "功能", "competitor": "飞书", "rating": 4, "description": "协作功能强大，文档能力突出", "pros": ["即时文档", "多维表格"], "cons": ["企业功能稍弱"]},
    {"dimension": "价格", "competitor": "钉钉", "rating": 3, "description": "收费较高", "pros": [], "cons": ["收费模式复杂"]},
    {"dimension": "价格", "competitor": "飞书", "rating": 4, "description": "性价比高", "pros": ["免费版功能丰富"], "cons": []},
    {"dimension": "用户体验", "competitor": "钉钉", "rating": 3, "description": "功能多但界面复杂", "pros": [], "cons": ["界面较重"]},
    {"dimension": "用户体验", "competitor": "飞书", "rating": 5, "description": "体验优秀，设计简洁", "pros": ["界面美观", "操作流畅"], "cons": []}
  ],
  "summary": "钉钉功能全面但体验偏重，飞书体验优秀适合互联网团队",
  "differentiators": [
    {"competitor": "钉钉", "differentiation": "企业级综合管理平台"},
    {"competitor": "飞书", "differentiation": "高效协作工具"}
  ]
}`;

  try {
    const result = await generateText(prompt);
    const matrix = parseJsonFromLLM<ComparisonMatrix>(result);
    if (matrix && matrix.results) {
      return matrix;
    }
  } catch (error) {
    console.error('[Comparator] LLM comparison failed:', error);
  }

  return generateDefaultMatrix(competitors, dimensions);
}

/**
 * 生成默认对比矩阵
 */
function generateDefaultMatrix(
  competitors: CompetitorInfo[],
  dimensions: CompareDimension[]
): ComparisonMatrix {
  const results: ComparisonResult[] = [];

  for (const competitor of competitors) {
    for (const dimension of dimensions) {
      results.push({
        dimension,
        competitor: competitor.name,
        rating: 3,
        description: '待分析',
        pros: competitor.strengths.slice(0, 2),
        cons: competitor.weaknesses.slice(0, 2),
      });
    }
  }

  return {
    title: '竞品对比分析',
    dimensions,
    competitors: competitors.map(c => c.name),
    results,
    summary: '需要进一步分析',
    differentiators: competitors.map(c => ({
      competitor: c.name,
      differentiation: c.positioning,
    })),
  };
}

/**
 * 生成 Markdown 格式的对比表格
 */
export function generateComparisonMarkdown(matrix: ComparisonMatrix): string {
  let md = `## 竞品对比分析\n\n`;

  // 表头
  md += `| 维度 | ${matrix.competitors.map(c => c.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '')).join(' | ')} |\n`;
  md += `|${'|'.repeat(matrix.competitors.length + 1).replace(/\|/g, '---|')}\n`;

  // 按维度分组
  for (const dimension of matrix.dimensions) {
    const dimResults = matrix.results.filter(r => r.dimension === dimension);
    const ratings = matrix.competitors.map(c => {
      const result = dimResults.find(r => r.competitor === c);
      return result ? '★'.repeat(result.rating) + '☆'.repeat(5 - result.rating) : '☆☆☆☆☆';
    });
    md += `| ${dimension} | ${ratings.join(' | ')} |\n`;
  }

  md += `\n### 差异化定位\n\n`;
  for (const d of matrix.differentiators) {
    md += `- **${d.competitor}**: ${d.differentiation}\n`;
  }

  md += `\n### 总结\n\n${matrix.summary}\n`;

  return md;
}

/**
 * 创建竞品对比器
 */
export function createComparator() {
  return {
    compare: async (
      competitors: CompetitorInfo[],
      dimensions?: CompareDimension[]
    ): Promise<ComparisonMatrix> => {
      return generateComparisonMatrixWithLLM(
        competitors,
        dimensions || DEFAULT_DIMENSIONS
      );
    },
    toMarkdown: generateComparisonMarkdown,
  };
}

export { generateComparisonMatrixWithLLM, generateComparisonMarkdown };
