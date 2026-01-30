/**
 * Analyzer Agent 提示词
 *
 * 用于竞品分析和深度分析的 LLM 提示词
 */

/** 竞品分析提示词 */
export const COMPETITOR_ANALYSIS_PROMPT = `你是一个专业的产品分析师。请对以下产品进行深度分析：

【研究主题】
{title}
{description}

【已收集的数据】
{extractedContent}

【分析要求】
请从以下维度进行分析：

1. **功能分析**
   - 列出核心功能（至少 5 个）
   - 分析每个功能的特点和价值
   - 统计功能出现频率

2. **竞品分析**
   - 识别主要竞品
   - 分析每个竞品的市场定位
   - 对比差异化特点

3. **SWOT 分析**
   - 优势（Strengths）
   - 劣势（Weaknesses）
   - 机会（Opportunities）
   - 威胁（Threats）

4. **市场数据**
   - 市场规模和增长趋势
   - 主要市场参与者
   - 行业趋势

5. **技术分析**
   - 技术架构特点
   - 使用的技术栈
   - 技术创新点

【输出要求】
请以 JSON 格式返回分析结果：

{{
  "features": [
    {{
      "name": "功能名称",
      "count": 出现次数,
      "sources": ["来源1", "来源2"],
      "description": "功能特点描述"
    }}
  ],
  "competitors": [
    {{
      "name": "竞品名称",
      "industry": "所属行业",
      "features": ["功能1", "功能2"],
      "description": "简要描述",
      "marketPosition": "市场定位"
    }}
  ],
  "swot": {{
    "strengths": ["优势1", "优势2"],
    "weaknesses": ["劣势1", "劣势2"],
    "opportunities": ["机会1", "机会2"],
    "threats": ["威胁1", "威胁2"]
  }},
  "marketData": {{
    "marketSize": "市场规模",
    "growthRate": "增长率",
    "keyPlayers": ["玩家1", "玩家2"],
    "trends": ["趋势1", "趋势2"]
  }},
  "techAnalysis": {{
    "architecture": ["架构特点"],
    "techStack": ["技术栈"],
    "emergingTech": ["新兴技术"]
  }},
  "confidenceScore": 0.0-1.0的置信度分数,
  "dataGaps": ["缺失的数据维度"]
}}

【注意事项】
- 如果某个维度信息不足，明确标注 dataGaps
- 保持分析的客观性
- 基于已有证据进行推断
- 置信度分数反映分析的可信程度`;

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
