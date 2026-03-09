/**
 * Planner Agent 提示词
 *
 * 用于生成研究计划的 LLM 提示词
 */

/** 研究计划生成提示词模板 */
export const PLAN_RESEARCH_PROMPT = `你是一个专业的产品调研规划专家。请为以下产品主题制定详细的研究计划。

【研究任务】
主题: {title}
描述: {description || '无'}

【任务要求】
1. 分析这个产品主题的特点，确定需要研究哪些维度
2. 为每个维度设计 3-5 个针对性的搜索查询（确保总共至少 15 个查询）
3. 为每个查询设计搜索提示，帮助搜索引擎返回更相关的结果
4. 根据主题特点调整质量阈值
5. 合理分配优先级（1=最高，5=最低）

【重要：排除低质量来源】
请在查询中排除以下低质量来源：
- 博客园、简书、论坛的低质量文章
- 个人博客的水文和广告内容
- 社交媒体上的碎片化信息
- 无实质内容的转载文章

建议在查询中添加高质量来源要求，如：
- 限定：site:docs.xxxx.com 官方文档
- 限定：site:github.com 技术文档
- 限定：行业报告、白皮书

【输出要求】
请以 JSON 格式返回研究计划：

{{
  "researchDimensions": ["维度1", "维度2", "维度3"],
  "qualityThresholds": {{
    "minFeatures": 数字,
    "minCompetitors": 数字,
    "minUseCases": 数字,
    "minTechStack": 数字,
    "minSearchResults": 数字,
    "completionScore": 数字
  }},
  "queries": [
    {{
      "id": "q1",
      "query": "搜索查询语句",
      "purpose": "为什么进行这个搜索",
      "dimension": "所属研究维度",
      "priority": 1,
      "hints": "搜索提示，帮助搜索引擎返回更相关的结果"
    }}
  ]
}}

【注意事项】
- 质量阈值应根据主题复杂度调整，复杂主题需要更高的阈值
- 搜索查询应具体且有针对性，避免过于宽泛
- 优先覆盖产品功能、竞品、技术栈、市场等核心维度
- 请直接输出纯 JSON 对象，不要用 \`\`\`json 或其他标记包裹
- 所有字符串值必须写在同一行内，不要在字符串中使用换行符`;

/** 默认质量阈值 */
export const DEFAULT_QUALITY_THRESHOLDS = {
  minFeatures: 3,
  minCompetitors: 2,
  minUseCases: 3,
  minTechStack: 2,
  minSearchResults: 30, // 增加以确保有足够的搜索结果
  minIterations: 3,
  completionScore: 60,
};

/** 默认研究维度 */
export const DEFAULT_DIMENSIONS = [
  '产品功能特性',
  '竞品分析',
  '技术架构',
  '市场规模与趋势',
  '使用场景与用户案例',
];

/** 简单主题的研究维度（精简版） */
export const SIMPLE_DIMENSIONS = [
  '产品功能特性',
  '竞品分析',
  '主要特点',
];

/**
 * 生成默认搜索查询
 */
export function generateDefaultQueries(title: string) {
  return [
    // 产品功能维度 - 5个查询
    {
      id: 'q1',
      query: `${title} 产品功能特点`,
      purpose: '了解产品的核心功能',
      dimension: '产品功能特性',
      priority: 1,
      hints: '请关注产品的核心功能、独特卖点和用户价值',
    },
    {
      id: 'q2',
      query: `${title} 主要功能 特性`,
      purpose: '了解产品的详细功能列表',
      dimension: '产品功能特性',
      priority: 1,
      hints: '请关注功能列表和特性对比',
    },
    {
      id: 'q3',
      query: `${title} 使用教程 功能演示`,
      purpose: '了解产品的使用方式',
      dimension: '产品功能特性',
      priority: 2,
      hints: '请关注使用教程和功能演示',
    },
    // 竞品分析维度 - 5个查询
    {
      id: 'q4',
      query: `${title} 竞品对比`,
      purpose: '了解市场竞争格局',
      dimension: '竞品分析',
      priority: 1,
      hints: '请关注主要竞争对手、差异化特点和市场份额',
    },
    {
      id: 'q5',
      query: `${title} 替代方案 竞争产品`,
      purpose: '了解可替代的产品',
      dimension: '竞品分析',
      priority: 1,
      hints: '请关注替代产品和竞争产品分析',
    },
    // 技术架构维度 - 3个查询
    {
      id: 'q6',
      query: `${title} 技术架构`,
      purpose: '了解技术实现方式',
      dimension: '技术架构',
      priority: 2,
      hints: '请关注技术栈、架构模式和技术创新点',
    },
    // 市场数据维度 - 4个查询
    {
      id: 'q7',
      query: `${title} 市场应用案例`,
      purpose: '了解实际使用场景',
      dimension: '使用场景与用户案例',
      priority: 2,
      hints: '请关注典型应用场景、成功案例和用户评价',
    },
  ];
}

/**
 * 格式化提示词
 */
export function formatPrompt(
  template: string,
  params: { title: string; description?: string }
): string {
  return template
    .replace('{title}', params.title)
    .replace('{description}', params.description || '无');
}
