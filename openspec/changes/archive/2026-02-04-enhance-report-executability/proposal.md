# Change: Enhance Report Executability for Business Decision Makers

## Why

Current research reports are too qualitative and verbose, making them difficult for business leaders to quickly extract actionable insights. Key issues include:
- Missing quantitative data (market size, growth rates, LTV/CAC ratios)
- SWOT analysis with 50+ points instead of prioritized insights
- Strategic recommendations lacking KPIs and measurable targets
- Table formatting errors showing header labels as data
- Mermaid charts failing to render

## What Changes

### Content Improvements
1. **Enhanced Executive Summary** - Add quantitative metrics (market size, growth rate, market share)
2. **Prioritized SWOT Analysis** - Limit to top 5 points per category with business impact labels
3. **Actionable Strategic Recommendations** - Include KPIs, current values, target values, timelines, and budget requirements
4. **Complete Business Model Section** - Add pricing tiers, Unit Economics (LTV/CAC, margins, payback period)
5. **Competitor Quantitative Comparison** - Add market share, revenue, customer count, growth metrics

### Quality Improvements
6. **Fix Table Formatting** - Ensure proper markdown table structure
7. **Ensure Mermaid Charts Render** - Validate chart syntax before rendering
8. **Add Data Source Citations** - Include credibility scores and data freshness indicators
9. **Executive-Friendly Terminology** - Add glossary for business metrics (ARR, NDR, LTV, CAC, etc.)

### Template Improvements
10. **Dynamic Placeholder Fallbacks** - Never show raw placeholders like `{dataCompletenessScore}`
11. **Structured Recommendation Tables** - Use consistent format: KPI | Current | Target | Timeline | Budget
12. **Visual Hierarchy** - Clear section numbering, concise paragraphs, bullet points for readability

## Impact

- Affected specs: `research-agent`
- Affected code:
  - `src/lib/research-agent/workers/reporter/templates.ts`
  - `src/lib/research-agent/workers/reporter/index.ts`
  - `src/components/ReportViewer.tsx`
  - `src/lib/__tests__/analysis.test.ts`
