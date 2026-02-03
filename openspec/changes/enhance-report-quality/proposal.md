# Change: 提升市场调研报告质量对标头部咨询机构

## Why

当前系统生成的市场调研报告与头部咨询机构（艾瑞咨询、QuestMobile、易观分析）的报告存在显著差距，主要体现在：

1. **缺乏定量数据支撑**：现有报告多为定性描述，缺少市场规模、增长率、用户规模等量化指标及数据来源
2. **缺少用户调研数据**：没有样本量、置信度、调研方法等用户研究核心指标
3. **竞品分析不够深入**：缺少市场份额、营收、客单价等定量竞品分析
4. **商业模式分析缺失**：缺少 ARPU、CAC、LTV、Unit Economics 等商业化指标
5. **数据可视化不足**：缺少柱状图、饼图、趋势图、热力图等图表支撑
6. **战略建议过于笼统**：缺少具体数字目标、时间节点、资源需求等可执行建议

这些不足导致报告专业度和可信度不足，难以满足高质量产品调研需求。

## What Changes

### 核心功能增强

1. **定量市场数据模块**
   - 添加市场规模（Market Size）估算和预测数据
   - 添加增长率（Growth Rate）趋势分析
   - 添加市场驱动因素（Market Drivers）分析
   - 添加数据来源标注和可信度评级

2. **用户调研数据模块**
   - 添加用户画像数据（人口统计、行为特征）
   - 添加用户规模估算和渗透率分析
   - 添加用户满意度/净推荐值（NPS）数据
   - 标注数据来源和调研方法

3. **竞品定量分析模块**
   - 添加市场份额（Market Share）对比数据
   - 添加营收规模和增速对比
   - 添加用户规模/付费用户数对比
   - 添加客单价（ARPU）、获客成本（CAC）、用户生命周期价值（LTV）对比

4. **商业模式分析模块**
   - 添加定价模式和收费策略分析
   - 添加 Unit Economics（单位经济模型）分析
   - 添加盈利模式和变现效率分析
   - 添加商业化成熟度评估

5. **数据可视化增强**
   - 添加市场规模趋势图（柱状图+折线图）
   - 添加市场份额分布图（饼图）
   - 添加竞品对比雷达图
   - 添加用户画像热力图
   - 添加产业链上下游关系图

6. **战略建议优化**
   - 遵循 SMART 原则：具体（Specific）、可衡量（Measurable）、可达成（Achievable）、相关性（Relevant）、有时限（Time-bound）
   - 添加具体数字目标和 KPI 指标
   - 添加时间节点和里程碑规划
   - 添加资源需求和投资回报预期

### 技术实现

- 新增 `MarketDataAnalyzer` 模块，用于深度定量分析
- 新增 `BusinessModelAnalyzer` 模块，用于商业模式分析
- 新增 `DataVisualizer` 模块，用于图表生成
- 增强 `Reporter` Agent，集成定量分析能力
- 扩展报告模板，支持新的数据模块和图表

## Impact

### Affected Specs

- `specs/research-report/spec.md` - 新增市场调研报告规范

### Affected Code

- `src/lib/research-agent/workers/reporter/` - Reporter Agent 增强
- `src/lib/research-agent/workers/analyzer/` - Analyzer Agent 扩展
- `src/lib/research-agent/types.ts` - 新增类型定义
- `src/lib/research-agent/prompts/` - 新增提示词模板
- `src/lib/visualization/` - 新增可视化模块

### Breaking Changes

- **无破坏性变更**：此改动为功能新增，保持向后兼容
- 报告结构扩展，但不影响现有字段解析
