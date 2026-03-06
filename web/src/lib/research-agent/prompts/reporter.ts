/**
 * Reporter Agent 提示词
 *
 * 动态报告生成提示词系统
 * - 大纲生成提示词
 * - 内容生成提示词
 * - 数据序列化三层过滤
 * - Citations 预处理
 */

import type { AnalysisResult, Citation } from '../types';

/**
 * 报告生成上下文
 */
export interface ReportGenerationContext {
  title: string;
  keywords: string[];
  analysis: AnalysisResult;
  citations: Citation[];
}

/**
 * 大纲生成提示词
 */
export function generateOutlinePrompt(context: ReportGenerationContext): string {
  const { title, keywords, analysis } = context;

  // 数据概述
  const dataOverview = generateDataOverview(analysis);

  return `你是专业的产品调研报告撰写专家。

【主题】
${title}

【关键词】
${keywords.join(', ')}

【数据概述】
${dataOverview}

【格式要求】
1. 输出 Markdown 格式
2. 必须包含大纲（使用 ## 二级标题）
3. 根据数据情况自动决定章节取舍
4. 数据缺失部分标注"数据缺失"

【任务】
请生成报告大纲，包含以下维度：
- 执行摘要
- 市场分析
- 竞争格局
- 功能分析
- SWOT 分析
- 战略建议
- 数据质量评估

请直接输出大纲，不要其他内容。`;
}

/**
 * 内容生成提示词
 */
export function generateContentPrompt(
  context: ReportGenerationContext,
  outline: string
): string {
  const { title, keywords, analysis, citations } = context;

  // 序列化分析数据（带三层过滤）
  const serializedData = serializeAnalysisData(analysis);

  // 预处理 citations
  const formattedCitations = formatCitations(citations);

  return `你是专业的产品调研报告撰写专家。

【主题】
${title}

【关键词】
${keywords.join(', ')}

【报告大纲】
${outline}

【分析数据】
${serializedData}

【引用来源】
${formattedCitations}

【格式要求】
1. 使用 Markdown 格式输出完整报告
2. 必须包含大纲中的所有章节（使用 ## 二级标题）
3. 每个主要观点后用 [^n] 标注引用来源
4. 报告末尾自动生成参考文献列表
5. 数据缺失部分标注"数据缺失"，不要留空

【任务】
请根据以上大纲和分析数据，生成完整的调研报告。`;
}

/**
 * 生成数据概述（用于大纲阶段）
 */
function generateDataOverview(analysis: AnalysisResult): string {
  const parts: string[] = [];

  // 市场规模
  if (analysis.marketData?.marketSize) {
    parts.push(`- 市场规模: ${analysis.marketData.marketSize}`);
  }

  // 增长率
  if (analysis.marketData?.growthRate) {
    parts.push(`- 增长率: ${analysis.marketData.growthRate}`);
  }

  // 功能数量
  if (analysis.features?.length) {
    parts.push(`- 功能数量: ${analysis.features.length} 个`);
  }

  // 竞品数量
  if (analysis.competitors?.length) {
    parts.push(`- 竞品数量: ${analysis.competitors.length} 个`);
  }

  // SWOT
  const swotItems = [];
  if (analysis.swot?.strengths?.length) swotItems.push(`优势 ${analysis.swot.strengths.length} 条`);
  if (analysis.swot?.weaknesses?.length) swotItems.push(`劣势 ${analysis.swot.weaknesses.length} 条`);
  if (analysis.swot?.opportunities?.length) swotItems.push(`机会 ${analysis.swot.opportunities.length} 条`);
  if (analysis.swot?.threats?.length) swotItems.push(`威胁 ${analysis.swot.threats.length} 条`);
  if (swotItems.length) parts.push(`- SWOT: ${swotItems.join(', ')}`);

  // 定量数据
  if (analysis.businessModel) parts.push('- 商业模式: 有');
  if (analysis.userResearch) parts.push('- 用户研究: 有');
  if (analysis.competitorQuantitative) parts.push('- 竞品定量: 有');

  // 数据缺口
  if (analysis.dataGaps?.length) {
    parts.push(`\n【数据缺口】\n${analysis.dataGaps.map(d => `- ${d}`).join('\n')}`);
  }

  // 置信度
  if (analysis.confidenceScore) {
    parts.push(`\n【置信度】: ${(analysis.confidenceScore * 100).toFixed(0)}%`);
  }

  return parts.length > 0 ? parts.join('\n') : '无数据';
}

/**
 * 数据序列化三层过滤
 */
export function serializeAnalysisData(analysis: AnalysisResult): string {
  // Layer 1: 字段选择 - 只保留报告需要的字段
  const selected = {
    features: analysis.features?.slice(0, 20).map(f => ({
      name: f.name,
      count: f.count,
      description: truncate(f.description, 500),
    })),
    competitors: analysis.competitors?.slice(0, 15).map(c => ({
      name: c.name,
      industry: c.industry,
      marketPosition: c.marketPosition,
      description: truncate(c.description, 500),
      features: c.features?.slice(0, 5),
    })),
    swot: {
      strengths: analysis.swot?.strengths?.slice(0, 5) || [],
      weaknesses: analysis.swot?.weaknesses?.slice(0, 5) || [],
      opportunities: analysis.swot?.opportunities?.slice(0, 5) || [],
      threats: analysis.swot?.threats?.slice(0, 5) || [],
    },
    marketData: analysis.marketData ? {
      marketSize: analysis.marketData.marketSize,
      growthRate: analysis.marketData.growthRate,
      keyPlayers: analysis.marketData.keyPlayers?.slice(0, 10) || [],
      trends: analysis.marketData.trends?.slice(0, 5) || [],
      opportunities: analysis.marketData.opportunities?.slice(0, 5) || [],
      challenges: analysis.marketData.challenges?.slice(0, 5) || [],
      confidenceLevel: analysis.marketData.confidenceLevel,
    } : undefined,
    techAnalysis: analysis.techAnalysis ? {
      architecture: analysis.techAnalysis.architecture?.slice(0, 5) || [],
      techStack: analysis.techAnalysis.techStack?.slice(0, 10) || [],
    } : undefined,
    businessModel: analysis.businessModel,
    userResearch: analysis.userResearch,
    confidenceScore: analysis.confidenceScore,
    dataGaps: analysis.dataGaps,
  };

  // Layer 2 & 3: 长度限制 + 格式清理
  const cleaned = cleanData(selected);

  return JSON.stringify(cleaned, null, 2);
}

/**
 * 截断字符串
 */
function truncate(str: string | undefined, maxLength: number): string {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

/**
 * 清理数据（Layer 3: 格式清理）
 * - 移除 undefined
 * - 移除循环引用
 */
function cleanData(data: any): any {
  if (data === null || data === undefined) return null;
  if (typeof data === 'string') return data || '';
  if (typeof data === 'number' || typeof data === 'boolean') return data;
  if (Array.isArray(data)) {
    return data.map(item => cleanData(item)).filter(item => item !== undefined && item !== null && item !== '');
  }
  if (typeof data === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      const cleaned = cleanData(value);
      if (cleaned !== undefined && cleaned !== null) {
        result[key] = cleaned;
      }
    }
    return result;
  }
  return data;
}

/**
 * Citations 预处理
 */
export function formatCitations(citations: Citation[]): string {
  if (!citations || citations.length === 0) {
    return '无引用来源';
  }

  // 按相关性排序，取 top 20
  const sorted = [...citations]
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 20);

  return sorted
    .map((c, i) => `[${i + 1}] ${c.title}\n    URL: ${c.url}\n    相关性: ${Math.round(c.relevanceScore * 100)}%`)
    .join('\n\n');
}

/**
 * Token 估算函数
 * 粗略估算：1 token ≈ 4 characters
 */
export function estimateTokens(analysis: AnalysisResult): number {
  const jsonString = JSON.stringify(analysis);
  return Math.ceil(jsonString.length / 4);
}

/**
 * 判断是否需要两阶段模式
 */
export function shouldUseTwoStage(analysis: AnalysisResult): boolean {
  const tokens = estimateTokens(analysis);

  // 条件1: Token 数量
  if (tokens > 8000) return true;

  // 条件2: 字段数量
  let fieldCount = 0;
  if (analysis.features) fieldCount += analysis.features.length;
  if (analysis.competitors) fieldCount += analysis.competitors.length;
  if (analysis.marketData?.keyPlayers) fieldCount += analysis.marketData.keyPlayers.length;
  if (fieldCount > 50) return true;

  // 条件3: 包含丰富数据
  if (analysis.userResearch || analysis.businessModel || analysis.competitorQuantitative) {
    return true;
  }

  return false;
}
