/**
 * 场景分析阶段提示词
 */

export const PHASE_USECASE_PROMPT = `你是资深产品分析师，请分析以下产品研究数据中的【使用场景】。

【产品主题】
{title}

【产品描述】
{description}

【原始数据】
{extractedContent}

【任务要求】
请分析使用场景信息：

1. **主要使用场景**：列出产品的典型使用场景
   - 场景名称
   - 场景描述
   - 目标用户
   - 用户价值

2. **目标用户类型**：分析目标用户群体

3. **用户痛点**：识别用户痛点

4. **产品价值主张**：产品为用户提供的价值

【输出格式】
请直接输出 JSON，不要添加 \`\`\`json 标记：

{{
  "useCases": {{
    "scenarios": [
      {{"name": "场景名", "description": "场景描述", "targetUsers": ["用户1", "用户2"], "value": "用户价值"}}
    ],
    "userTypes": ["用户类型1", "用户类型2"],
    "painPoints": ["痛点1", "痛点2"],
    "valuePropositions": ["价值主张1", "价值主张2"]
  }},
  "useCaseSummary": "场景分析总结",
  "confidenceScore": 0.6
}}

【注意】
- 只提取文档中明确提到的信息，不要编造
- 如果没有场景信息，返回空对象 {{}}`;
