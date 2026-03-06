/**
 * SWOT 分析阶段提示词
 */

export const PHASE_SWOT_PROMPT = `你是资深产品分析师，请分析以下产品研究数据中的【SWOT】。

【产品主题】
{title}

【产品描述】
{description}

【原始数据】
{extractedContent}

【任务要求】
请进行 SWOT 分析：

1. **优势 (Strengths)**：列出产品的优势
2. **劣势 (Weaknesses)**：列出产品的劣势
3. **机会 (Opportunities)**：列出市场机会
4. **威胁 (Threats)**：列出潜在威胁

每个维度需要：
- 至少 3 条，最多 5 条
- 附带简短说明

【输出格式】
请直接输出 JSON，不要添加 \`\`\`json 标记：

{{
  "swot": {{
    "strengths": ["优势1", "优势2", "优势3"],
    "weaknesses": ["劣势1", "劣势2", "劣势3"],
    "opportunities": ["机会1", "机会2", "机会3"],
    "threats": ["威胁1", "威胁2", "威胁3"]
  }},
  "swotSummary": "SWOT 分析总结",
  "confidenceScore": 0.7
}}

【注意】
- 只提取文档中明确提到的信息，不要编造
- 如果某个维度没有信息，返回空数组 []`;
