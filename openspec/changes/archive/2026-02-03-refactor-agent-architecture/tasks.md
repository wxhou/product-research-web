## 1. 基础设施搭建

- [x] 1.1 创建 `src/lib/research-agent/types.ts` - 定义共享类型
- [x] 1.2 创建 `src/lib/research-agent/state.ts` - 定义图状态
- [x] 1.3 搭建 `supervisor/`、`workers/`、`graph/`、`progress/`、`cancellation/`、`backup/` 目录结构
- [x] 1.4 创建各目录的 `index.ts` 导出文件

## 2. 类型和状态定义

- [x] 2.1 定义 `ResearchTask` - 研究任务类型
- [x] 2.2 定义 `SearchQuery` - 搜索查询类型
- [x] 2.3 定义 `ExtractionResult` - 提取结果类型
- [x] 2.4 定义 `AnalysisResult` - 分析结果类型
- [x] 2.5 定义 `ReportSection` - 报告章节类型
- [x] 2.6 定义 `ResearchState` - 图状态接口（包含所有 Agent 共享状态）

## 3. Worker Agents 实现

### 3.1 Planner Agent
- [x] 3.1.1 创建 `workers/planner/prompts.ts` - 规划提示词
- [x] 3.1.2 创建 `workers/planner/index.ts` - Planner Agent 实现
- [x] 3.1.3 实现搜索计划生成逻辑
- [x] 3.1.4 测试 Planner Agent 独立运行

### 3.2 Searcher Agent
- [x] 3.2.1 创建 `workers/searcher/tools.ts` - 搜索工具封装
- [x] 3.2.2 创建 `workers/searcher/index.ts` - Searcher Agent 实现
- [x] 3.2.3 实现多数据源搜索逻辑
- [x] 3.2.4 测试 Searcher Agent 独立运行

### 3.3 Extractor Agent
- [x] 3.3.1 创建 `workers/extractor/tools.ts` - 爬取工具封装
- [x] 3.3.2 创建 `workers/extractor/index.ts` - Extractor Agent 实现
- [x] 3.3.3 实现内容深度提取逻辑
- [x] 3.3.4 测试 Extractor Agent 独立运行

### 3.4 Analyzer Agent
- [x] 3.4.1 创建 `workers/analyzer/prompts.ts` - 分析提示词
- [x] 3.4.2 创建 `workers/analyzer/index.ts` - Analyzer Agent 实现
- [x] 3.4.3 实现竞品分析和 SWOT 生成
- [x] 3.4.4 测试 Analyzer Agent 独立运行

### 3.5 Reporter Agent
- [x] 3.5.1 创建 `workers/reporter/templates.ts` - 报告模板
- [x] 3.5.2 创建 `workers/reporter/index.ts` - Reporter Agent 实现
- [x] 3.5.3 实现完整报告生成逻辑
- [x] 3.5.4 测试 Reporter Agent 独立运行

## 4. Supervisor 实现

- [x] 4.1 创建 `supervisor/prompts.ts` - Supervisor 提示词
- [x] 4.2 创建 `supervisor/index.ts` - Supervisor Agent
- [x] 4.3 实现任务分解和路由逻辑
- [x] 4.4 实现结果合成逻辑

## 5. 图编排

- [x] 5.1 创建 `graph/builder.ts` - LangGraph 图构建器
- [x] 5.2 定义节点和边关系
- [x] 5.3 实现条件分支（质量检查、重试）
- [x] 5.4 创建 `graph/checkpoint.ts` - 检查点持久化
- [x] 5.5 创建 `graph/markdown-state.ts` - Markdown 状态读写

## 6. Markdown 存储实现

- [x] 6.1 实现 Frontmatter 解析和生成
- [x] 6.2 实现搜索结果表格生成
- [x] 6.3 实现提取内容格式化为 Markdown
- [x] 6.4 实现状态文件解析（供 API 查询使用）

## 7. API 迁移

- [x] 7.1 创建 `service.ts` - API 与多代理架构桥接
- [x] 7.2 创建 `researchTaskExecutor` - 任务执行器
- [x] 7.3 保持 API 接口兼容性（runResearchAgent 入口函数）
- [x] 7.4 添加新架构的断点续传支持
- [x] 7.5 迁移 `taskQueue.ts` 使用新架构

## 8. 测试和验证

- [x] 8.1 编写各 Agent 单元测试
- [ ] 8.2 编写集成测试（完整研究流程）
- [ ] 8.3 验证端到端功能正确性
- [ ] 8.4 性能测试（与旧架构对比）

## 9. 进度展示实现

- [x] 9.1 创建 `progress/types.ts` - 定义进度相关类型
- [x] 9.2 创建 `progress/calculator.ts` - 进度计算器
- [x] 9.3 创建 `progress/tracker.ts` - 进度追踪器
- [x] 9.4 实现进度存储到 Frontmatter
- [x] 9.5 前端进度展示组件集成

## 10. 任务取消机制实现

- [x] 10.1 创建 `cancellation/store.ts` - 取消状态存储
- [x] 10.2 创建 `cancellation/handler.ts` - 取消处理逻辑
- [x] 10.3 实现 Agent 级取消响应
- [x] 10.4 实现强制终止超时机制（30秒）
- [x] 10.5 API 取消任务接口

## 11. 状态备份机制实现

- [x] 11.1 创建 `backup/index.ts` - 备份管理器
- [x] 11.2 实现备份恢复逻辑
- [x] 11.3 实现定时备份（30秒间隔）
- [x] 11.4 实现检查点备份
- [x] 11.5 实现备份完整性校验（SHA-256）

## 12. 清理和文档

- [x] 12.1 验证所有文件行数 < 1000
- [x] 12.2 无旧单体文件需要删除（已采用渐进式重构）
- [x] 12.3 API 路由已适配新架构
- [ ] 12.4 添加架构图和使用说明
