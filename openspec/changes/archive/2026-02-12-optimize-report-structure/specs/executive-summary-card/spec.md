# executive-summary-card Specification

## Purpose
Defines requirements for the executive summary card feature that provides a quick overview of the research report.

## ADDED Requirements

### Requirement: Executive Summary Card Display

The system SHALL generate an executive summary card at the beginning of each research report that displays 5 core insights in a scannable format.

#### Scenario: Card displays 5 core metrics

- **WHEN** a research report is generated
- **THEN** the executive summary card SHALL display:
  - 市场规模 (Market Size): Value with trend indicator and brief description
  - 增长率 (Growth Rate): Percentage with YoY indicator
  - 市场集中度 (Market Concentration): Level indicator (High/Medium/Low)
  - Top 竞品 (Top Competitors): Top 3 competitor names
  - 核心建议 (Key Recommendation): One actionable insight

#### Scenario: Card uses visual indicators

- **WHEN** the executive summary card is rendered
- **THEN** it SHALL use emoji indicators for quick scanning:
  - 🔥 for hot/large market
  - 📈 for positive growth
  - ⚡ for high concentration
  - 💡 for recommendations

#### Scenario: Card includes quality scores

- **WHEN** the executive summary card is generated
- **THEN** it SHALL include:
  - 数据完整度 (Data Completeness Score): X/100
  - 置信度 (Confidence Level): X%

### Requirement: Card Position in Report

The executive summary card SHALL be the first section of the report.

#### Scenario: Card appears before market overview

- **WHEN** a report is rendered
- **THEN** the executive summary card SHALL appear as Section 0 (before all numbered sections)
- **AND** it SHALL use the title "执行摘要卡片"

#### Scenario: Card formatting uses highlighted block

- **WHEN** the executive summary card is generated
- **THEN** it SHALL be formatted as a highlighted Markdown block
- **AND** it SHALL use a table structure for metrics alignment
