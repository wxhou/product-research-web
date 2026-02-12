# Design: optimize-report-structure

## Context

### Current State

The research report currently has a 12-section structure with significant readability issues:

1. **No executive summary**: Reports start directly with detailed sections
2. **Excessive competitor analysis**: Section 4 "竞品分析" contains 4 subsections analyzing 50+ competitors individually
3. **Scattered "no data" handling**: Missing data appears as "暂无数据" throughout various sections
4. **Repetitive content**: The same template is applied to each competitor, resulting in low information density

### Current Report Structure
```
1. 摘要 → 2. 调研概览 → 3. 市场分析 → 4. 竞品分析(4 subsections) →
5. 商业模式 → 6. 用户研究 → 7. SWOT分析 → 8. 战略建议 →
9. 数据可视化 → 10. 报告质量评估 → 11. 数据来源说明
```

### Target State
```
执行摘要卡片 → 1. 市场概览 → 2. 竞争格局 → 3. 标杆深度分析 →
4. SWOT与战略 → 5. 数据质量说明 → 附录
```

### Constraints
- Must maintain backward compatibility with existing data sources
- Changes should be isolated to report generation layer
- No changes to Crawl4AI, DuckDuckGo, or free data sources
- Must work within existing Next.js + TypeScript stack

## Goals / Non-Goals

### Goals
1. Add executive summary card with 5 core insights at report start
2. Limit competitor deep analysis to Top 10 (5 detailed + 10 table overview)
3. Implement unified data quality section replacing scattered "暂无数据"
4. Reduce average reading time from 30+ minutes to 10-15 minutes

### Non-Goals
- Do NOT change the underlying data collection pipeline
- Do NOT modify the analyzer or extractor workers
- Do NOT add new data sources or change existing ones
- Do NOT redesign the graph workflow or agent coordination

## Decisions

### D1: Executive Summary Card Structure

**Decision**: Create a dedicated "执行摘要卡片" section using a highlighted Markdown block format

```markdown
> ## 执行摘要卡片
>
> | 指标 | 值 | 说明 |
> |-----|---|------|
> | 市场规模 | 🔥 热 - XXX 亿元 | ... |
> | 增长率 | 📈 +XX% YoY | ... |
> | 市场集中度 | ⚡ High/Medium/Low | ... |
> | Top 竞品 | 1. XXX 2. XXX 3. XXX | ... |
> | 核心建议 | 💡 一句话建议 | ... |
>
> **数据完整度**: XX/100 | **置信度**: XX%
```

**Rationale**:
- Follows industry standard (McKinsey, iResearch use executive summary cards)
- Card format is scannable - readers get value in 30 seconds
- Uses simple Markdown table, no external dependencies
- Can be styled by frontend if needed

**Alternatives Considered**:
- HTML cards: Too complex, requires frontend changes
- Mermaid diagrams: Adds rendering complexity
- JSON block: Not readable for non-technical users

### D2: Competitor Analysis Optimization

**Decision**: Implement tiered competitor analysis

| Tier | Count | Analysis Level | Format |
|-----|-------|----------------|--------|
| Top 5 | 5 | Full analysis | Template with all fields |
| Top 6-10 | 5 | Summary only | Table row +一句话定位 |
| Others | Rest | Mentioned in matrix | Competitive radar chart |

**Rationale**:
- Top 5 represents ~80% of market coverage
- Detailed analysis of 50+ competitors provides diminishing returns
- Radar chart provides visual comparison of all players

**Implementation**:
```typescript
// In templates.ts, limit rendering
const TOP_N_DEEP_ANALYSIS = 5;
const TOP_N_TABLE_OVERVIEW = 10;

function renderCompetitorSection(competitors: Competitor[]): string {
  const sorted = sortByMarketPosition(competitors);
  const top5 = sorted.slice(0, TOP_N_DEEP_ANALYSIS);
  const top6_10 = sorted.slice(TOP_N_DEEP_ANALYSIS, TOP_N_TABLE_OVERVIEW);
  // ... render accordingly
}
```

### D3: Unified Data Quality Section

**Decision**: Replace scattered "暂无数据" with a dedicated "数据质量说明" section

**Section Structure**:
```markdown
## 数据质量说明

### 数据完整度评分: XX/100

| 维度 | 评分 | 说明 |
|-----|-----|------|
| 市场规模数据 | X/100 | 缺少具体金额数据 |
| 竞品数据 | X/100 | Top 10 数据完整 |
| 用户数据 | X/100 | 基于公开推断 |

### 数据获取建议
1. 建议补充艾瑞/QuestMobile 行业报告
2. 建议获取竞品公开财务数据
3. 建议进行用户调研收集一手数据

### 置信度说明
- **高置信度**: 数据来自官方/权威来源
- **中置信度**: 数据来自行业报告/公开分析
- **低置信度**: 数据基于模型推断
```

**Rationale**:
- Centralizes data quality information
- Provides actionable suggestions for data improvement
- Maintains professional appearance

### D4: Report Template Restructuring

**Decision**: Modify `REPORT_TEMPLATE.sections` structure

**New Section Order**:
```typescript
const REPORT_TEMPLATE: ReportTemplate = {
  sections: [
    { id: 'executive-summary', title: '执行摘要卡片', order: 0 },
    { id: 'market-overview', title: '市场概览', order: 1 },      // 合并原市场分析
    { id: 'competitive-landscape', title: '竞争格局', order: 2 }, // 精简竞品分析
    { id: 'benchmark-analysis', title: '标杆深度分析', order: 3 }, // Top 5 深度
    { id: 'swot-strategy', title: 'SWOT与战略', order: 4 },     // 合并SWOT和建议
    { id: 'data-quality', title: '数据质量说明', order: 5 },    // 统一数据缺口
    { id: 'appendix', title: '附录', order: 6 },                  // 来源+术语表
  ],
  // ...
};
```

**Rationale**:
- Follows top-down information flow (summary → market → competition → action)
- Reduces from 12 sections to 7
- Each section serves a clear purpose

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|-----|--------|------------|
| **R1**: Breaking existing report format | Medium | Add feature flag; maintain backward compatibility |
| **R2**: Top 10 selection criteria unclear | Low | Use multiple factors: mention count, feature count, description length |
| **R3**: Frontend needs to adapt | Low | Changes are in Markdown; frontend only renders |
| **R4**: Data quality section may confuse users | Low | Add clear explanations and suggestions |

### Trade-offs

- **Depth vs Breadth**: Sacrificing detail on competitors 11-50 for better readability
- **Standardization vs Flexibility**: Unified format reduces per-report customization
- **New Sections vs Maintenance**: Adding sections increases template complexity

## Migration Plan

### Phase 1: Template Changes (Day 1)
1. Add new sections to `REPORT_TEMPLATE` in `templates.ts`
2. Add `executive-summary-card` section
3. Add `data-quality` section
4. Modify `competitor` section to use tiered rendering

### Phase 2: Logic Changes (Day 2)
1. Add `sortByMarketPosition()` helper function
2. Add `renderExecutiveSummaryCard()` function
3. Add `renderDataQualitySection()` function
4. Update `renderSection()` to handle new sections

### Phase 3: Testing (Day 3)
1. Generate test reports with new format
2. Verify all sections render correctly
3. Check edge cases (no competitors, missing data)
4. Validate Markdown rendering in frontend

### Rollback Strategy
- Keep old template sections commented out
- Feature flag to toggle between old/new format
- Git revert if critical issues found

## Open Questions

1. **Q1**: Should the executive summary card use emoji indicators?
   - Current design uses 🔥 📈 ⚡ 💡
   - Alternative: Use text "Hot/High/Recommended"

2. **Q2**: How to determine "Top 10" competitors?
   - Options: By mention count, by feature completeness, by description length
   - Recommendation: Weighted score of all three factors

3. **Q3**: Should we preserve the old section structure as an option?
   - Yes: Feature flag for backward compatibility
