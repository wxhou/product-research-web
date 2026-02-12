# Proposal: optimize-report-structure

## Why

The current research report structure has two critical issues affecting reader experience:

1. **Lack of executive summary**: Readers cannot quickly understand the core value of the report within 30 seconds
2. **Excessive competitor analysis**: 50+ competitors are analyzed one-by-one, resulting in repetitive content and poor readability

Professional reports from institutions like McKinsey and iResearch typically use an executive summary card plus focused analysis. Our current structure (12 sections with 50+ competitor details) does not meet this standard.

## What Changes

### P0 - Executive Summary Card (新增)
- Add a dedicated executive summary card at the report start
- Display 5 core insights: market size, growth rate, market concentration, top competitors, key recommendations
- Enable readers to understand report value in 30 seconds

### P0 - Unified "No Data" Handling (优化)
- Replace scattered "暂无数据" (no data available) messages with a unified data quality section
- Provide data collection suggestions when key data is missing
- Maintain professional appearance even with incomplete data

### P1 - Competitor Analysis Optimization (优化)
- Limit deep competitor analysis to Top 10
- Change from "50+ detailed analyses" to "Top 10 table overview + Top 5 deep analysis"
- Use competitive matrix/radar chart instead of repetitive text

## Capabilities

### New Capabilities
- `executive-summary-card`: Add executive summary card section with 5 core insights display
- `unified-data-quality`: Unified handling and display of missing data scenarios
- `competitor-analysis-limit`: Limit competitor deep analysis count to Top 10

### Modified Capabilities
- `research-report`: Modify report template structure (add executive summary, optimize competitor section)

## Impact

### Affected Files
- `src/lib/research-agent/workers/reporter/templates.ts`: Report template modification
- `src/lib/research-agent/workers/reporter/index.ts`: Report generation logic update
- `openspec/specs/research-report/spec.md`: Update report specification requirements

### Dependencies
- DuckDuckGo data source: No changes
- Crawl4AI service: No changes
- Free data sources: No changes

### User Experience Impact
- Reports will have better first impression with executive summary card
- Reading time reduced from 30+ minutes to 10-15 minutes
- Professional credibility improved
