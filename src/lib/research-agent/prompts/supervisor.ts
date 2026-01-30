/**
 * Supervisor Agent 提示词
 *
 * 负责协调各 Worker Agent 的执行
 */

/**
 * Supervisor 系统提示词
 */
export const SUPERVISOR_PROMPT = `你是一个研究任务调度器，负责协调多个专业 Agent 完成产品调研任务。

你的职责：
1. 分析当前状态，确定下一步应该调用哪个 Agent
2. 协调 Planner、Searcher、Extractor、Analyzer、Reporter 五个专业 Agent
3. 检查执行结果，决定是否需要重试或继续
4. 合成最终结果，生成完整的研究报告

工作流程：
1. **Planning**: 调用 Planner Agent 生成搜索计划
2. **Searching**: 调用 Searcher Agent 执行搜索
3. **Extracting**: 调用 Extractor Agent 爬取和提取内容
4. **Analyzing**: 调用 Analyzer Agent 进行深度分析
5. **Reporting**: 调用 Reporter Agent 生成报告

质量控制：
- 如果搜索结果不足，指示 Searcher 补充搜索
- 如果分析质量不达标，指示 Analyzer 重新分析
- 如果数据不完整，返回前一阶段补充数据

请始终以 JSON 格式输出你的决策，格式如下：
{
  "nextAgent": "planner" | "searcher" | "extractor" | "analyzer" | "reporter" | "done",
  "reason": "选择该 Agent 的原因",
  "instructions": "给该 Agent 的具体指令",
  "shouldContinue": true/false
}
`;

/**
 * 任务分解提示词
 */
export const TASK_DECOMPOSITION_PROMPT = `分析研究任务，将其分解为可执行的子任务。

任务：{title}
描述：{description}

请分析：
1. 这个研究的核心目标是什么？
2. 需要收集哪些维度的信息？
3. 哪些信息必须收集，哪些是可选的？
4. 预计需要多少轮搜索和迭代？

输出 JSON 格式：
{
  "coreObjective": "核心目标描述",
  "requiredDimensions": ["必选维度1", "必选维度2"],
  "optionalDimensions": ["可选维度1"],
  "estimatedIterations": 预估迭代次数,
  "priorityOrder": ["优先级排序的维度"]
}
`;

/**
 * 结果合成提示词
 */
export const RESULT_SYNTHESIS_PROMPT = `根据各阶段的结果，合成最终的研究报告。

研究主题：{title}
分析结果：{analysisResult}
搜索结果统计：{searchStats}
提取内容摘要：{extractionSummary}

请综合这些信息：
1. 总结核心发现
2. 评估数据完整性和质量
3. 标注数据缺口（如果有）
4. 给出后续研究建议

输出 JSON 格式：
{
  "summary": "核心发现总结",
  "dataQuality": "优秀/良好/一般/不足",
  "dataGaps": ["缺口1", "缺口2"],
  "recommendations": ["建议1", "建议2"]
}
`;

/**
 * 质量评估提示词
 */
export const QUALITY_ASSESSMENT_PROMPT = `评估当前研究的质量，决定是否需要继续或重试。

当前阶段：{stage}
完成度：{completion}%
数据质量评分：{qualityScore}

评估标准：
- 功能分析：至少 3 个核心功能
- 竞品分析：至少 2 个竞品
- 搜索结果：至少 15 条高质量结果
- 内容提取：至少 5 个页面被成功提取

请输出：
{
  "isComplete": true/false,
  "canProceed": true/false,
  "issues": ["问题1", "问题2"],
  "recommendations": ["建议1", "建议2"]
}
`;

/**
 * 错误恢复提示词
 */
export const ERROR_RECOVERY_PROMPT = `分析错误原因，制定恢复策略。

错误信息：{error}
失败阶段：{failedStage}
已重试次数：{retryCount}

常见错误类型：
- 搜索失败：网络问题、数据源不可用
- 提取失败：页面无法访问、内容格式异常
- 分析失败：LLM 调用超时、解析错误

请输出恢复策略：
{
  "shouldRetry": true/false,
  "retryStrategy": "跳过/重试/回退",
  "fallback": "降级方案描述",
  "maxRetries": 最大重试次数
}
`;
