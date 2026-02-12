# research-report Specification

## Purpose
Defines requirements for generating comprehensive research reports with quantitative analysis, competitive insights, and strategic recommendations. This is a DELTA spec updating the original research-report spec.

## ADDED Requirements

### Requirement: Report Structure with Executive Summary

The research report SHALL follow a restructured format with an executive summary card at the beginning.

#### Scenario: Report starts with executive summary card

- **WHEN** a research report is generated
- **THEN** it SHALL start with an "执行摘要卡片" (Executive Summary Card) section
- **AND** the card SHALL display 5 core insights as defined in executive-summary-card spec

### Requirement: Consolidated Report Sections

The report SHALL use a consolidated section structure instead of the original 12-section format.

#### Scenario: Report uses 7-section structure

- **WHEN** a research report is generated
- **THEN** it SHALL contain the following sections in order:
  1. 执行摘要卡片 (Executive Summary Card)
  2. 市场概览 (Market Overview) - consolidated from original sections
  3. 竞争格局 (Competitive Landscape) - consolidated from competitor sections
  4. 标杆深度分析 (Benchmark Deep Analysis) - Top 5 competitors
  5. SWOT与战略 (SWOT & Strategy) - consolidated sections
  6. 数据质量说明 (Data Quality Note) - unified handling
  7. 附录 (Appendix) - sources and glossary

#### Scenario: Section numbering follows new structure

- **WHEN** sections are numbered
- **THEN** the executive summary card SHALL use "执行摘要卡片" (not numbered)
- **AND** the numbered sections SHALL start from 1 for 市场概览

## MODIFIED Requirements

### Requirement: Competitor Analysis Scope

**Original**: Analyzed all identified competitors in detail
**Updated**: Limited to Top 10 with tiered analysis depth

#### Scenario: Competitor analysis limited to Top 10

- **WHEN** competitor analysis is generated
- **THEN** detailed analysis SHALL be limited to Top 10 competitors as defined in competitor-analysis-limit spec
- **AND** deeper analysis (full template) SHALL be limited to Top 5
- **AND** competitors ranked 6-10 SHALL receive summary treatment

### Requirement: Data Quality Display

**Original**: Scattered "暂无数据" messages throughout report
**Updated**: Unified data quality section replacing scattered messages

#### Scenario: Missing data handled uniformly

- **WHEN** data is missing from analysis
- **THEN** the system SHALL NOT display "暂无数据" in individual sections
- **AND** instead, all missing data information SHALL be aggregated in the "数据质量说明" section as defined in unified-data-quality spec
