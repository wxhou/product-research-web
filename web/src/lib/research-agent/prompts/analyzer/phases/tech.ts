/**
 * 技术栈分析阶段提示词
 */

export const PHASE_TECH_PROMPT = `你是资深产品分析师，请分析以下产品研究数据中的【技术栈】。

【产品主题】
{title}

【产品描述】
{description}

【原始数据】
{extractedContent}

【任务要求】
请分析技术栈信息：

1. **技术架构**：产品的技术架构模式
2. **主要技术栈**：使用的主要技术
3. **新兴技术**：应用的新兴技术
4. **技术创新点**：技术创新之处

【输出格式】
请直接输出 JSON，不要添加 \`\`\`json 标记：

{{
  "techStack": {{
    "architecture": ["架构1", "架构2"],
    "techStack": ["技术1", "技术2"],
    "emergingTech": ["新兴技术1", "新兴技术2"],
    "innovationPoints": ["创新点1", "创新点2"]
  }},
  "techSummary": "技术分析总结",
  "confidenceScore": 0.6
}}

【注意】
- 只提取文档中明确提到的技术信息，不要编造
- 如果没有技术信息，返回空对象 {{}}`;
