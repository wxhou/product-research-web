# dynamic-chart-data Specification

## Purpose
定义动态生成 Mermaid 图表数据的要求，确保雷达图、饼图、思维导图等图表使用实际分析数据而非硬编码。

## Requirements
### Requirement: Competitor Radar Chart Data

The system SHALL generate dynamic radar chart data based on actual competitor analysis.

#### Scenario: Extract radar dimensions from competitor data

- **WHEN** generating radar chart data
- **THEN** the system SHALL extract dimensions from competitor features and descriptions
- **AND** dimensions SHALL include at minimum:
  - Product features (from feature analysis)
  - Price competitiveness (from pricing data)
  - User experience (from user feedback)
  - Technology innovation (from tech analysis)
  - Market coverage (from market share data)

#### Scenario: Calculate radar scores for each competitor

- **WHEN** generating radar chart data
- **THEN** the system SHALL calculate scores (0-100) for each competitor on each dimension
- **AND** scores SHALL be derived from:
  - Mention count in source data
  - Feature completeness
  - Description detail level
  - Market position clarity

### Requirement: Feature Pie Chart Data

The system SHALL generate dynamic pie chart data based on feature frequency analysis.

#### Scenario: Aggregate feature frequencies

- **WHEN** generating pie chart data
- **THEN** the system SHALL aggregate features by category
- **AND** percentages SHALL be calculated as:
  ```
  feature_category_percentage = (category_count / total_features) * 100
  ```

#### Scenario: Handle feature aggregation edge cases

- **WHEN** features have similar names but different descriptions
- **THEN** the system SHALL attempt to merge similar features
- **AND** merged features SHALL retain the most detailed description

### Requirement: SWOT Mind Map Data

The system SHALL generate dynamic mind map data from SWOT analysis.

#### Scenario: Generate mind map structure

- **WHEN** generating mind map data
- **THEN** the system SHALL create a hierarchical structure:
  ```
  root((SWOT 分析))
    优势(S)
      - item 1
      - item 2
    劣势(W)
      - item 1
      ...
  ```

#### Scenario: Limit mind map items

- **WHEN** SWOT contains more than 5 items per category
- **THEN** the system SHALL limit display to 5 items
- **AND** additional items SHALL be available in appendix

### Requirement: Mermaid Chart Syntax Validation

The system SHALL validate Mermaid syntax before rendering.

#### Scenario: Validate radar chart syntax

- **WHEN** generating radar chart
- **THEN** the system SHALL verify:
  - Axis labels contain only valid characters
  - Score values are within 0-100 range
  - All competitors have scores for all dimensions

#### Scenario: Validate pie chart syntax

- **WHEN** generating pie chart
- **THEN** the system SHALL verify:
  - All percentages sum to 100 (±1 for rounding)
  - Labels are non-empty
  - No duplicate labels

### Requirement: Fallback Chart Data

The system SHALL provide fallback chart data when analysis data is insufficient.

#### Scenario: Minimal competitor data

- **WHEN** fewer than 3 competitors are identified
- **THEN** the system SHALL generate a simplified chart with:
  - Only available dimensions
  - Generic score of 50 for missing data

#### Scenario: No competitor data available

- **WHEN** no competitor data is available
- **THEN** the system SHALL display placeholder message
- **AND** SHALL NOT render broken charts
