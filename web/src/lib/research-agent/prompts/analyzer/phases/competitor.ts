/**
 * 竞品分析阶段提示词
 */

export const PHASE_COMPETITOR_PROMPT = `你是资深产品分析师，请分析以下产品研究数据中的【竞品信息】。

【产品主题】
{title}

【产品描述】
{description}

【原始数据】
{extractedContent}

【任务要求】
请分析并提取竞品信息：

1. **竞品列表**：列出所有识别到的竞品
   - 产品名称
   - 所属行业
   - 核心功能
   - 市场定位
   - 产品描述

2. **差异化分析**：分析各竞品与目标产品的差异化特征

3. **市场格局**：分析市场竞争格局

【输出格式】
请直接输出 JSON，不要添加 \`\`\`json 标记：

{{
  "competitors": [
    {{"name": "竞品名", "industry": "行业", "features": ["功能1", "功能2"], "description": "描述", "marketPosition": "市场定位"}}
  ],
  "differentiation": ["差异化点1", "差异化点2"],
  "marketLandscape": "市场竞争格局描述",
  "confidenceScore": 0.8
}}

【注意】
- 只提取文档中明确提到的竞品，不要编造
- 如果没有竞品信息，返回空数组 []`;
