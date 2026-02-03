## 1. 类型定义扩展

- [x] 1.1 扩展 `MarketData` 类型，添加 `marketSizeRange`、`growthRateHistorical`、`forecastYears`、`dataSource`、`confidenceLevel` 字段
- [x] 1.2 新增 `UserResearchData` 类型，包含用户画像、样本量、置信度、调研方法等字段
- [x] 1.3 新增 `CompetitorQuantitative` 类型，包含市场份额、营收、ARPU、CAC、LTV 等字段
- [x] 1.4 新增 `BusinessModelAnalysis` 类型，包含定价模式、Unit Economics、盈利模式等字段
- [x] 1.5 新增 `StrategicRecommendation` 类型，包含 KPI 指标、时间节点、资源需求等字段
- [x] 1.6 扩展 `ReportSection` 类型，支持新的报告模块

## 2. 数据源增强

- [x] 2.1 集成行业数据 API（艾瑞、QuestMobile、易观等）获取市场数据
- [x] 2.2 集成上市公司财报数据源（营收、用户规模等）
- [x] 2.3 集成 App Annie/Sensor Tower 数据源（下载量、收入排名）
- [x] 2.4 实现数据源可信度评估和来源标注

## 3. 定量分析模块

- [x] 3.1 实现 `MarketDataAnalyzer` 模块
  - [x] 3.1.1 市场规模估算算法（自上而下/自下而上）
  - [x] 3.1.2 增长率趋势分析和预测
  - [x] 3.1.3 市场驱动因素和制约因素分析
  - [x] 3.1.4 市场规模细分（按产品类型、用户群体、地域）
- [x] 3.2 实现 `UserResearchAnalyzer` 模块
  - [x] 3.2.1 用户画像生成和聚合
  - [x] 3.2.2 用户规模和渗透率估算
  - [x] 3.2.3 用户行为特征分析
  - [x] 3.2.4 用户满意度和 NPS 分析
- [x] 3.3 实现 `CompetitorQuantitativeAnalyzer` 模块
  - [x] 3.3.1 市场份额计算和对比
  - [x] 3.3.2 营收规模和增速对比
  - [x] 3.3.3 ARPU/CAC/LTV 对比分析
  - [x] 3.3.4 竞争格局矩阵分析
- [x] 3.4 实现 `BusinessModelAnalyzer` 模块
  - [x] 3.4.1 定价模式和收费策略分析
  - [x] 3.4.2 Unit Economics 计算和对比
  - [x] 3.4.3 盈利模式和变现效率分析
  - [x] 3.4.4 商业化成熟度评估模型

## 4. 数据可视化模块

- [x] 4.1 实现 `DataVisualizer` 模块
  - [x] 4.1.1 市场规模趋势图（柱状图+折线图）
  - [x] 4.1.2 市场份额分布图（饼图/环形图）
  - [x] 4.1.3 竞品对比雷达图
  - [x] 4.1.4 用户画像热力图
  - [x] 4.1.5 产业链上下游关系图
  - [x] 4.1.6 增长趋势预测图
- [x] 4.2 扩展 Mermaid 图表支持
- [x] 4.3 实现图表样式定制化

## 5. Reporter Agent 增强

- [x] 5.1 扩展 Reporter Agent 集成新的分析模块
- [x] 5.2 新增定量分析提示词模板
- [x] 5.3 实现报告结构模板扩展
- [x] 5.4 集成图表生成到报告渲染流程
- [x] 5.5 实现战略建议 SMART 化生成

## 6. 报告模板重构

- [x] 6.1 重构报告模板结构，新增以下章节：
  - [x] 6.1.1 执行摘要（Executive Summary）
  - [x] 6.1.2 市场概览（Market Overview）- 含市场规模数据
  - [x] 6.1.3 用户研究（User Research）- 含用户画像数据
  - [x] 6.1.4 竞品分析（Competitor Analysis）- 含定量对比数据
  - [x] 6.1.5 商业模式（Business Model）- 含 Unit Economics
  - [x] 6.1.6 数据可视化（Data Visualization）- 含图表
  - [x] 6.1.7 战略建议（Strategic Recommendations）- 含 SMART 目标
- [x] 6.2 实现报告模板可配置化
- [x] 6.3 添加报告质量评估功能

## 7. 测试

- [ ] 7.1 编写类型定义测试
- [ ] 7.2 编写分析模块单元测试
- [ ] 7.3 编写可视化模块测试
- [ ] 7.4 编写 Reporter Agent 集成测试
- [ ] 7.5 编写端到端报告生成测试

## 8. 文档

- [ ] 8.1 更新 API 文档
- [ ] 8.2 编写新模块使用文档
- [ ] 8.3 更新用户指南
- [ ] 8.4 添加示例报告
