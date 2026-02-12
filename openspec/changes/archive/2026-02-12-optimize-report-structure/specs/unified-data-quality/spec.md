# unified-data-quality Specification

## Purpose
Defines requirements for unified handling and display of missing or incomplete data scenarios in research reports.

## ADDED Requirements

### Requirement: Unified Data Quality Section

The system SHALL replace scattered "暂无数据" (no data available) messages with a dedicated "数据质量说明" (Data Quality Note) section.

#### Scenario: Dedicated section replaces scattered messages

- **WHEN** a report is generated with missing data
- **THEN** the system SHALL NOT display scattered "暂无数据" messages in individual sections
- **AND** instead, it SHALL aggregate all missing data information into a single "数据质量说明" section

#### Scenario: Section includes completeness score

- **WHEN** the data quality section is generated
- **THEN** it SHALL calculate and display:
  - Overall Data Completeness Score: X/100
  - Score breakdown by dimension (market data, competitor data, user data)

#### Scenario: Section provides improvement suggestions

- **WHEN** the data quality section is generated
- **THEN** it SHALL provide actionable suggestions for data improvement:
  - Suggested data sources to consult
  - Specific metrics to prioritize
  - Data collection recommendations

### Requirement: Missing Data Placeholder Standardization

The system SHALL use standardized placeholders instead of "暂无数据" for missing information.

#### Scenario: Use "待分析" for unavailable analysis

- **WHEN** specific analysis cannot be performed due to missing data
- **THEN** the system SHALL display "待分析" (pending analysis)
- **AND** it SHALL include a reference to the data quality section

#### Scenario: Use "数据推断" for estimated values

- **WHEN** data is estimated or inferred from available information
- **THEN** the system SHALL display "数据推断" (data estimated)
- **AND** it SHALL provide confidence level for the estimate

#### Scenario: Confidence levels are clearly marked

- **WHEN** data with varying confidence levels is displayed
- **THEN** it SHALL be marked with:
  - 高置信度 (High): Data from official/authoritative sources
  - 中置信度 (Medium): Data from industry reports/public analysis
  - 低置信度 (Low): Data based on model inference
