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
 *
 * 【优化说明】：改为引用 Analyzer 已完成的分析结果
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

【引用分析结果】
以下内容来自 Analyzer 阶段的分析结果，请基于这些结果组织报告大纲：

${generateEnhancedDataSummary(analysis)}

【格式要求】
1. 输出 Markdown 格式
2. 必须包含大纲（使用 ## 二级标题）
3. 根据数据情况自动决定章节取舍，数据丰富的章节详述，数据缺失的章节简略
4. 战略建议章节需包含具体数字目标、实施时间表

【任务】
请生成报告大纲，包含以下维度：
- 执行摘要
- 市场分析
- 竞争格局
- 功能分析
- SWOT 分析
- 用户画像分析
- ROI 投资回报分析
- KPI 指标建议
- 风险矩阵分析
- 供应商对比分析
- 战略建议（必须包含量化指标）
- 数据质量评估

请直接输出大纲，不要其他内容。`;
}

/**
 * 内容生成提示词
 *
 * 【优化说明】：改为引用 Analyzer 已完成的分析结果
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

  // 生成增强分析摘要
  const enhancedSummary = generateEnhancedDataSummary(analysis);

  return `你是专业的产品调研报告撰写专家。

【主题】
${title}

【关键词】
${keywords.join(', ')}

【报告大纲】
${outline}

【分析数据】
${serializedData}

【增强分析结果摘要】
以下内容来自 Analyzer 阶段的分析结果，请直接整合到报告中：

${enhancedSummary}

【引用来源】
${formattedCitations}

【格式要求】
1. 使用 Markdown 格式输出完整报告
2. 必须包含大纲中的所有章节（使用 ## 二级标题）
3. 每个主要观点后用 [^n] 标注引用来源
4. 报告末尾自动生成参考文献列表
5. 数据缺失处理原则：
   - 优先标注"数据缺失"
   - 如有可能，基于行业通用数据进行合理估算并说明
   - 明确说明数据来源建议（如"建议参考中汽协/IDC/Strategy Analytics报告"）
6. 每个战略建议必须包含：
   - 具体数字目标（如市场份额提升5%、成本降低10%）
   - 实施时间表（如Q1-Q2完成）
   - 风险评估（高/中/低）

【任务】
请根据以上大纲和分析数据，生成完整的调研报告。报告应包含以下增强分析维度的内容：
- 用户画像分析 - 基于 Analyzer 分析结果
- ROI 投资回报分析 - 基于 Analyzer 分析结果
- KPI 指标建议 - 基于 Analyzer 分析结果
- 风险矩阵分析 - 基于 Analyzer 分析结果
- 供应商对比分析 - 基于 Analyzer 分析结果
`;
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

  // 增强分析维度
  if (analysis.userPersonaAnalysis) {
    parts.push('- 用户画像分析: 有');
  }
  if (analysis.roiAnalysis) {
    parts.push('- ROI分析: 有');
  }
  if (analysis.kpiMetrics?.length) {
    parts.push(`- KPI指标: ${analysis.kpiMetrics.length} 个`);
  }
  if (analysis.riskMatrix?.length) {
    parts.push(`- 风险矩阵: ${analysis.riskMatrix.length} 项`);
  }
  if (analysis.vendorComparison?.length) {
    parts.push(`- 供应商对比: ${analysis.vendorComparison.length} 家`);
  }

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
 * 生成增强分析摘要
 * 用于 Reporter 引用 Analyzer 已完成的分析结果
 */
function generateEnhancedDataSummary(analysis: AnalysisResult): string {
  const parts: string[] = [];

  // 用户画像分析
  if (analysis.userPersonaAnalysis) {
    const upa = analysis.userPersonaAnalysis;
    parts.push('### 用户画像分析');
    if (upa.decisionMakers?.length) {
      parts.push(`- 决策者: ${upa.decisionMakers.join(', ')}`);
    }
    if (upa.users?.length) {
      parts.push(`- 使用者: ${upa.users.join(', ')}`);
    }
    if (upa.beneficiaries?.length) {
      parts.push(`- 受益者: ${upa.beneficiaries.join(', ')}`);
    }
    parts.push('');
  }

  // ROI 分析
  if (analysis.roiAnalysis) {
    const roi = analysis.roiAnalysis;
    parts.push('### ROI 投资回报分析');
    if (roi.costComparison) parts.push(`- 成本对比: ${roi.costComparison}`);
    if (roi.paybackPeriod) parts.push(`- 回报周期: ${roi.paybackPeriod}`);
    if (roi.roi) parts.push(`- 投资回报率: ${roi.roi}`);
    parts.push('');
  }

  // KPI 指标
  if (analysis.kpiMetrics?.length) {
    parts.push('### KPI 指标建议');
    for (const kpi of analysis.kpiMetrics.slice(0, 5)) {
      parts.push(`- ${kpi.name}: ${kpi.targetValue} (${kpi.benchmark})`);
    }
    parts.push('');
  }

  // 风险矩阵
  if (analysis.riskMatrix?.length) {
    parts.push('### 风险矩阵分析');
    for (const risk of analysis.riskMatrix.slice(0, 5)) {
      parts.push(`- ${risk.risk} (概率: ${risk.probability}, 影响: ${risk.impact})`);
      parts.push(`  - 应对措施: ${risk.mitigation}`);
    }
    parts.push('');
  }

  // 供应商对比
  if (analysis.vendorComparison?.length) {
    parts.push('### 供应商对比分析');
    for (const vendor of analysis.vendorComparison.slice(0, 5)) {
      parts.push(`- ${vendor.name}: ${vendor.priceRange}, ${vendor.serviceCapability}`);
    }
  }

  return parts.length > 0 ? parts.join('\n') : '无增强分析数据';
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
    // 新增增强分析字段
    userPersonaAnalysis: analysis.userPersonaAnalysis ? {
      decisionMakers: analysis.userPersonaAnalysis.decisionMakers?.slice(0, 5) || [],
      users: analysis.userPersonaAnalysis.users?.slice(0, 5) || [],
      beneficiaries: analysis.userPersonaAnalysis.beneficiaries?.slice(0, 5) || [],
    } : undefined,
    roiAnalysis: analysis.roiAnalysis,
    kpiMetrics: analysis.kpiMetrics?.slice(0, 10) || [],
    riskMatrix: analysis.riskMatrix?.slice(0, 10) || [],
    vendorComparison: analysis.vendorComparison?.slice(0, 10) || [],
    // 原有字段
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
