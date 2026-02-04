## Context

The current research report generation system produces verbose, qualitative reports that are difficult for business leaders to quickly understand and act upon. The system generates:
- SWOT analyses with 50+ bullet points
- Qualitative competitor descriptions without quantitative comparisons
- Strategic recommendations without KPIs or measurable targets
- Tables with formatting errors showing header labels as data
- Mermaid charts that fail to render due to syntax issues

## Goals / Non-Goals

### Goals
1. Make reports readable by business executives in under 5 minutes
2. Provide quantitative, data-driven insights
3. Make strategic recommendations actionable with clear KPIs
4. Fix all template formatting issues
5. Ensure all visualizations render correctly

### Non-Goals
- Change the underlying research workflow (Planner → Searcher → Extractor → Analyzer → Reporter)
- Modify the LangGraph StateGraph architecture
- Add new data sources or research capabilities
- Change the database schema

## Decisions

### 1. Executive Summary Structure

**Decision**: Create a dedicated executive summary section with fixed quantitative metrics

```typescript
interface ExecutiveSummary {
  marketSize: string;        // e.g., "280亿元"
  growthRate: string;        // e.g., "32.5%"
  marketShare: string;       // e.g., "头部5家占65%"
  pricing: string;           // e.g., "15-50万/年"
  userPenetration: string;  // e.g., "大型企业45%"
}
```

**Rationale**: Business leaders need to see key numbers immediately without reading the full report.

### 2. Prioritized SWOT Analysis

**Decision**: Limit SWOT to top 5 items per category with business impact labels

```markdown
### 7.1 优势 (Strengths)

1. **AI技术领先** (业务影响: 降低30%客服成本)
2. **全渠道覆盖** (业务影响: 提升50%响应效率)
3. ...
```

**Rationale**: Too many SWOT points dilute the message. Business impact labels help prioritize.

### 3. Strategic Recommendations Framework

**Decision**: Use structured table format for all recommendations

```markdown
| 建议 | KPI | 当前值 | 目标值 | 时间节点 | 预算 |
|------|-----|-------|-------|---------|------|
| 强化大模型能力 | 意图识别准确率 | 85% | 92% | 3个月 | 500万 |
```

**Rationale**: Table format is scannable and includes all necessary action information.

### 4. Unit Economics Section

**Decision**: Add dedicated Unit Economics analysis section

```markdown
### 4.4 Unit Economics 指标

| 指标 | 厂商A | 行业基准 |
|------|-------|---------|
| LTV/CAC | 5.3x | 4.4x |
| CAC回收月数 | 18个月 | 22个月 |
| 毛利率 | 72% | 65% |
```

**Rationale**: Investors and business leaders care about unit economics for ROI assessment.

### 5. Table Formatting Validation

**Decision**: Add validation function for table structure

```typescript
function validateTableStructure(content: string): boolean {
  // Ensure markdown tables have:
  // 1. Header row with | delimiters
  // 2. Separator row with - characters
  // 3. Data rows with proper | delimiters
  // 4. No header labels appearing as data
}
```

**Rationale**: Tables with formatting errors (header labels as data) damage report credibility.

### 6. Mermaid Chart Fallbacks

**Decision**: Add graceful fallbacks for Mermaid charts

```typescript
function renderMermaidChartWithFallback(
  chartType: string,
  data: ChartData | null
): string {
  if (!data || isInvalidData(data)) {
    return renderPlaceholderChart(chartType);
  }
  return renderChart(chartType, data);
}
```

**Rationale**: Charts that fail to render harm the report's visual appeal and clarity.

### 7. Glossary Section

**Decision**: Add glossary for business metrics

```markdown
### 附录 A. 术语表

| 术语 | 定义 |
|-----|------|
| ARR | Annual Recurring Revenue，年度经常性收入 |
| NDR | Net Dollar Retention，净美元留存率 |
| LTV | Lifetime Value，客户终身价值 |
| CAC | Customer Acquisition Cost，获客成本 |
```

**Rationale**: Non-technical stakeholders may not understand industry acronyms.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Longer report generation time | Cache rendered templates; only regenerate on data changes |
| More complex template system | Use consistent patterns; add comprehensive tests |
| Backward compatibility with existing reports | New templates only apply to new reports |
| Additional prompt tokens for LLMs | Optimize prompts for conciseness; use structured outputs |

## Migration Plan

1. **Phase 1**: Fix placeholder fallbacks and table formatting (low risk)
2. **Phase 2**: Add quantitative templates (medium risk)
3. **Phase 3**: Update reporter agent prompts (medium risk)
4. **Phase 4**: Add validation and tests (low risk)

Rollback: Keep old templates in comments for emergency rollback.

## Open Questions

1. Should we add a "TL;DR" summary at the very top of the report?
2. Should we allow configuration of which quantitative metrics to include?
3. Should we add a "confidence score" to each recommendation?
