# fix-report-issues Design

## Context

当前研究报告存在多个质量问题，导致用户无法获得有价值的战略洞察：

1. **战略建议为空**：短期和中期战略建议显示"暂无建议"，即使 SWOT 分析有完整内容
2. **图表渲染失败**：Mermaid 雷达图显示语法错误，思维导图显示原始代码
3. **功能聚合错误**：每个功能出现次数都是 1，占比 1%，说明聚合同名功能的逻辑有 bug
4. **数据缺失**：市场驱动因素和制约因素显示"暂无数据"

影响范围：
- `src/lib/research-agent/workers/reporter/templates.ts`
- `src/lib/research-agent/workers/analyzer/index.ts`

## Goals / Non-Goals

**Goals:**
1. 修复战略建议生成逻辑，确保从 SWOT 数据生成可执行的 SMART 建议
2. 修复 Mermaid 图表渲染，使用动态数据替代硬编码
3. 修复功能聚合逻辑，正确计算出现频率
4. 确保数据传递链路正确，各模块数据正确渲染

**Non-Goals:**
1. 不改变报告的整体结构或新增章节
2. 不引入新的外部依赖
3. 不修改 analyzer 的 LLM prompt 内容（仅修复逻辑 bug）
4. 不修改 reporter 的模板结构

## Decisions

### 1. 战略建议生成策略

**决策**：增强 `renderSection` 函数中的建议生成逻辑

**选项考虑**：
- A) 修改 LLM prompt 让 analyzer 直接生成建议 → 需要重新运行分析，成本高
- B) 在 reporter 层根据 SWOT 数据动态生成建议 → 复用现有数据，无需重新分析

**选择**：B) 在 reporter 层动态生成

**实现方式**：
```typescript
// 从 SWOT 提取可操作项
function generateRecommendationsFromSWOT(swot: SWOT): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // SO 策略：从优势 + 机会
  for (const strength of swot.strengths.slice(0, 3)) {
    for (const opportunity of swot.opportunities.slice(0, 3)) {
      recommendations.push({
        type: 'SO',
        action: `利用${strength}抓住${opportunity}机会`,
        timeline: '0-3个月',
        kpis: ['用户增长率 +10%', '转化率 +5%']
      });
    }
  }

  // WT 策略：从威胁 + 劣势
  for (const threat of swot.threats.slice(0, 2)) {
    for (const weakness of swot.weaknesses.slice(0, 2)) {
      recommendations.push({
        type: 'WT',
        action: `应对${threat}同时改善${weakness}`,
        timeline: '3-6个月',
        kpis: ['客户流失率 -8%']
      });
    }
  }

  return recommendations;
}
```

### 2. 图表数据动态生成

**决策**：从竞品分析提取实际数据生成雷达图

**问题**：当前雷达图使用硬编码数据
```typescript
// 当前错误做法
const radarContent = `radar
  title 竞品对比雷达图
  axes: 产品功能, 价格竞争力, 用户体验, 技术创新, 市场覆盖
  竞品A: [80, 70, 85, 75, 60]
  竞品B: [70, 85, 75, 80, 70]
  目标产品: [75, 80, 70, 85, 65]`;  // 硬编码！
```

**修复方案**：
```typescript
function generateRadarData(competitors: Competitor[]): string {
  // 从竞品特征提取维度
  const dimensions = ['产品功能', '价格竞争力', '用户体验', '技术创新', '市场覆盖'];

  // 计算每个竞品的评分
  const data = competitors.map(comp => {
    const score = calculateRadarScore(comp, dimensions);
    return `${comp.name}: [${score.join(', ')}]`;
  }).join('\n');

  return `radar
  title 竞品对比雷达图
  axes: ${dimensions.join(', ')}
  ${data}`;
}

function calculateRadarScore(comp: Competitor, dimensions: string[]): number[] {
  return dimensions.map(dim => {
    switch(dim) {
      case '产品功能': return Math.min(comp.features.length * 20, 100);
      case '技术创新': return inferTechScore(comp.description);
      default: return 50; // 默认中间值
    }
  });
}
```

### 3. 功能聚合修复

**决策**：在 analyzer 增量合并时正确聚合同名功能

**问题**：当前每次分析都创建新条目
```typescript
// 当前错误：每次都 push 新对象
features.push({ name: '文档协作', count: 1, ... });
```

**修复方案**：
```typescript
function aggregateFeatures(existing: Feature[], newFeatures: Feature[]): Feature[] {
  const featureMap = new Map<string, Feature>();

  // 合并现有特征
  for (const f of existing) {
    featureMap.set(f.name, f);
  }

  // 累加新特征
  for (const f of newFeatures) {
    if (featureMap.has(f.name)) {
      const existing = featureMap.get(f.name)!;
      featureMap.set(f.name, {
        ...existing,
        count: existing.count + f.count,
        // 保留描述最详细的
        description: f.description.length > existing.description.length
          ? f.description : existing.description
      });
    } else {
      featureMap.set(f.name, f);
    }
  }

  return Array.from(featureMap.values());
}
```

### 4. 市场驱动/制约因素数据传递

**决策**：修复 renderSection 中的 marketDrivers/marketConstraints 渲染逻辑

**问题**：数据已存在于 analysis.marketData，但未正确渲染

**修复方案**：
```typescript
if (section.id === 'market-overview') {
  const md = analysis.marketData;

  // 确保有默认值
  const drivers = md.marketDrivers?.length > 0
    ? md.marketDrivers
    : generateDefaultDrivers(md.trends);

  const constraints = md.marketConstraints?.length > 0
    ? md.marketConstraints
    : generateDefaultConstraints(md.challenges);
}
```

## Risks / Trade-offs

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 建议生成过于通用 | 中 | 低 | 添加基于具体 SWOT 内容的模板 |
| 雷达图评分不准确 | 中 | 中 | 使用多个维度加权计算 |
| 功能聚合遗漏 | 低 | 中 | 保留原有特征作为 fallback |
| 修复引入新问题 | 低 | 高 | 编写单元测试验证 |

## Migration Plan

1. **备份现有代码**
   ```bash
   cp src/lib/research-agent/workers/reporter/templates.ts \
      src/lib/research-agent/workers/reporter/templates.ts.bak
   ```

2. **逐步修改**
   - 修复功能聚合逻辑（低风险）
   - 修复市场驱动/制约渲染（中风险）
   - 修复战略建议生成（中风险）
   - 修复雷达图数据生成（高风险）

3. **验证**
   - 运行现有测试 `npm test`
   - 生成测试报告验证修复

4. **回滚**
   ```bash
   cp templates.ts.bak templates.ts
   ```

## Open Questions

1. **评分算法精度**：雷达图评分是否需要更精细的算法？
2. **建议个性化程度**：建议生成是否需要根据行业定制模板？
3. **测试覆盖**：是否需要为这些修复添加专门的单元测试？
