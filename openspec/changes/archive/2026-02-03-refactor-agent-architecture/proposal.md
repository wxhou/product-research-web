# Change: 采用 LangGraph Supervisor 模式重构 Agent 架构

## Why

当前 `research-agent/index.ts` 文件超过 1000 行，承担了过多职责：
- 研究计划生成
- 搜索执行
- 内容提取
- 数据分析
- 报告生成

这种"单体式"设计导致：
1. **维护困难** - 代码耦合度高，修改一处可能影响多处
2. **扩展性差** - 难以新增 Agent 类型或修改工作流
3. **复用性低** - 各功能模块难以独立测试和复用
4. **可观测性差** - 缺乏清晰的执行流程追踪

## What Changes

- **新增 Agent 抽象层**：定义 Supervisor Agent 和 Worker Agent 的基础接口
- **拆分研究流程为独立 Agent**：
  - Planner Agent - 研究计划生成
  - Searcher Agent - 信息搜索
  - Extractor Agent - 内容提取
  - Analyzer Agent - 深度分析
  - Reporter Agent - 报告生成
- **采用 LangGraph 图状态机**编排工作流
- **重构文件结构**，确保每个文件不超过 1000 行
- **新增共享状态类型**，定义 Agent 间通信协议

## Impact

- Affected specs: `specs/research-agent`
- Affected code:
  - `src/lib/research-agent/` - 完全重构
  - `src/lib/llm/` - 可能需要调整接口
  - `src/lib/task-persistence.ts` - 适配新状态结构

### Breaking Changes

- 持久化任务数据的 JSON 结构将发生变化
- 外部调用接口保持兼容（API 层封装）
