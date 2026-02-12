# Change: Enhance Data Collection for Quantitative Analysis

## Why

Current research reports have many empty data fields because the analyzer agents don't collect or calculate quantitative metrics. Key issues:
- Market size, growth rates missing
- Competitor market share not collected
- LTV/CAC ratios not calculated
- Pricing models not captured
- Unit economics metrics absent
- Quality assessment scores default to 0

This results in reports with placeholders like:
- `市场规模范围: 暂无数据`
- `数据完整度评分: 0/100`
- `LTV/CAC 比率: 暂无LTV/CAC数据`

## What Changes

### Analyzer Improvements

1. **Quality Assessment Calculation**
   - Calculate `dataCompletenessScore` based on populated fields
   - Calculate `sourceCredibilityScore` based on source types
   - Track visualization coverage

2. **Market Data Collection**
   - Collect market size ranges (min, base, max)
   - Capture growth rates (CAGR, YoY)
   - Identify key market drivers/constraints
   - Estimate market concentration

3. **Competitor Quantitative Analysis**
   - Collect market share estimates for competitors
   - Gather LTV and CAC estimates
   - Calculate LTV/CAC ratios
   - Identify pricing tiers

4. **Business Model Extraction**
   - Extract pricing models (subscription, usage-based, etc.)
   - Estimate unit economics (margins, payback period)
   - Calculate free-to-paid conversion rates

5. **User Research Enhancement**
   - Collect penetration rates by segment
   - Estimate adoption trends
   - Gather NPS scores

## Impact

- Affected specs: `research-agent`
- Affected code:
  - `src/lib/research-agent/workers/analyzer/types.ts`
  - `src/lib/research-agent/workers/analyzer/market-analyzer.ts`
  - `src/lib/research-agent/workers/analyzer/competitor-analyzer.ts`
  - `src/lib/research-agent/workers/analyzer/business-model-analyzer.ts`
  - `src/lib/research-agent/workers/analyzer/quality-assessor.ts`
  - `src/lib/research-agent/workers/analyzer/user-research-analyzer.ts`
