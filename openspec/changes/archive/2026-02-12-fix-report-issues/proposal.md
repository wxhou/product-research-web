## Why

当前研究报告存在多个质量问题，严重影响报告的专业性和可用性：
1. **战略建议为空**：短期和中期战略建议显示"暂无建议"，即使 SWOT 分析有完整内容
2. **图表渲染失败**：Mermaid 雷达图显示语法错误，思维导图显示原始代码
3. **功能聚合错误**：每个功能出现次数都是 1，占比 1%，说明聚合同名功能的逻辑有 bug
4. **数据缺失**：市场驱动因素和制约因素显示"暂无数据"
5. **数据来源不足**：数据来源标注不完整，缺少具体来源和置信度

这些问题导致用户无法从报告中获得有价值的战略洞察。

## What Changes

### Reporter 修复（P0）
- 修复 `renderSection` 函数中的数据传递问题，确保 SWOT 数据正确渲染
- 增强战略建议生成逻辑，从 SWOT 和市场数据自动生成 SMART 建议
- 修复 Mermaid 图表渲染，使用动态竞品数据替代硬编码
- 优化执行摘要卡片的数据完整性

### Analyzer 修复（P1）
- 修复功能聚合同名合并逻辑，正确计算出现频率和占比
- 增强数据提取 prompt，提取市场驱动因素和制约因素
- 改进数据来源追踪，为每个数据点添加来源和置信度标注

## Capabilities

### New Capabilities
- `strategy-recommendations`: 从 SWOT 分析和市场数据生成符合 SMART 原则的战略建议（短期/中期/长期）
- `dynamic-chart-data`: 动态生成 Mermaid 图表数据，从竞品分析提取实际评分

### Modified Capabilities
- `research-report`: 增强报告质量要求，修复现有功能缺陷而非添加新功能

## Impact

- `src/lib/research-agent/workers/reporter/templates.ts`: 修复 renderSection、战略建议生成、图表渲染
- `src/lib/research-agent/workers/analyzer/index.ts`: 修复功能聚合、数据提取逻辑
- `openspec/specs/research-report/spec.md`: 更新质量要求以匹配修复后的行为
