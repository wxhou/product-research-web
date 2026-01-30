/**
 * Analyzer Agent 提示词
 *
 * 用于竞品分析和深度分析的 LLM 提示词
 */

/** 竞品分析提示词 */
export const COMPETITOR_ANALYSIS_PROMPT = `你是产品分析师，请分析以下产品数据并输出 JSON 格式结果。

【产品主题】{title}
{description}

【数据来源】
{extractedContent}

【任务】
分析上述内容，提取：
1. 核心功能（5-10个，每个用2-6个字的名词表示）
2. 竞品信息（3-5个完整产品名称）
3. SWOT分析（每项2-4条）
4. 市场数据

【输出格式要求】
请直接输出 JSON，不要添加 \`\`\`json 标记：

{{
  "features": [
    {{"name": "智能对话", "count": 5, "description": "支持多轮对话"}},
    {{"name": "知识库", "count": 4, "description": "企业知识沉淀"}},
    {{"name": "工单系统", "count": 3, "description": "自动创建工单"}},
    {{"name": "数据分析", "count": 2, "description": "可视化报表"}},
    {{"name": "多渠道接入", "count": 2, "description": "全渠道统一"}}
  ],
  "competitors": [
    {{"name": "阿里云智能客服", "industry": "云服务", "features": ["智能对话", "知识库"], "marketPosition": "行业领先"}},
    {{"name": "腾讯企点", "industry": "云服务", "features": ["在线客服", "CRM"], "marketPosition": "市场第二"}},
    {{"name": "Zendesk", "industry": "SaaS", "features": ["工单管理", "自助服务"], "marketPosition": "国际领先"}}
  ],
  "swot": {{
    "strengths": ["技术成熟", "生态完善", "品牌知名度高"],
    "weaknesses": ["成本较高", "定制困难"],
    "opportunities": ["AI大模型普及", "企业数字化转型"],
    "threats": ["竞争加剧", "开源替代方案"]
  }},
  "marketData": {{
    "marketSize": "500亿元",
    "growthRate": "25%",
    "keyPlayers": ["阿里", "腾讯", "华为"],
    "trends": ["大模型应用", "私有化部署"]
  }},
  "confidenceScore": 0.75,
  "dataGaps": []
}}

【关键规则】
- features.name 必须是2-6个字的名词短语，如"智能对话"、"知识库"，不是句子
- competitors.name 必须是真实产品名，如"阿里云智能客服"
- 如果数据不足，基于行业知识补充合理内容
- confidenceScore: 0.3-0.5=数据少, 0.5-0.7=数据中等, 0.7-1.0=数据充足`;



/** 压缩内容提示 */
export const COMPRESS_CONTENT_PROMPT = `请压缩以下内容，保留关键信息：

【原始内容】
{content}

【要求】
1. 保留所有产品名称和竞品名称
2. 保留核心功能和特点
3. 保留关键数据（数字、指标）
4. 移除冗余描述和重复信息
5. 最大保留 3000 tokens

【输出】
压缩后的内容...`;

/**
 * 压缩提取的内容
 */
export function compressExtractedContent(
  content: string,
  maxLength: number = 30000
): string {
  if (content.length <= maxLength) {
    return content;
  }

  // 简单的压缩策略：保留段落首句
  const paragraphs = content.split(/\n\n+/);
  const compressed: string[] = [];

  for (const para of paragraphs) {
    const lines = para.split(/\n/);
    if (lines.length > 5) {
      // 多行段落：保留首行和末行
      compressed.push(lines[0]);
      compressed.push('...');
      compressed.push(lines[lines.length - 1]);
    } else {
      compressed.push(para);
    }
  }

  const result = compressed.join('\n\n');
  return result.length > maxLength ? result.slice(0, maxLength) : result;
}

/**
 * 格式化内容用于分析
 */
export function formatContentForAnalysis(
  title: string,
  description: string | undefined,
  extractions: Array<{ url: string; content: string; metadata: { features: string[]; competitors: string[]; techStack: string[] } }>
): string {
  const formatted = [`【研究主题】`, title];

  if (description) {
    formatted.push(description);
  }

  formatted.push('\n【提取的内容】');

  for (const ext of extractions) {
    formatted.push(`\n--- 来源: ${ext.url} ---`);
    formatted.push(ext.content.slice(0, 5000)); // 限制每个来源的长度
  }

  return formatted.join('\n');
}
