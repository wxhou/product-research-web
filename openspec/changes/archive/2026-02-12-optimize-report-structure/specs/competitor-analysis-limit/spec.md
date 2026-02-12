# competitor-analysis-limit Specification

## Purpose
Defines requirements for limiting competitor deep analysis to Top 10 while maintaining comprehensive market overview.

## ADDED Requirements

### Requirement: Tiered Competitor Analysis

The system SHALL implement tiered competitor analysis with different levels of detail for different ranking tiers.

#### Scenario: Top 5 competitors receive full analysis

- **WHEN** competitor analysis is generated
- **THEN** the system SHALL provide full analysis for the Top 5 competitors
- **AND** each SHALL include:
  - Industry positioning
  - Market positioning
  - Core features list
  - Product description
  - Competitive advantages

#### Scenario: Top 6-10 competitors receive summary analysis

- **WHEN** competitor analysis is generated
- **THEN** competitors ranked 6-10 SHALL receive summary analysis
- **AND** each SHALL include:
  - One-sentence positioning statement
  - Key differentiator (if any)
  - Reference to competitive matrix

#### Scenario: Remaining competitors are referenced in matrix

- **WHEN** there are more than 10 competitors
- **THEN** competitors ranked 11+ SHALL be referenced in the competitive matrix
- **AND** they SHALL NOT receive individual analysis sections

### Requirement: Top 10 Selection Criteria

The system SHALL use a weighted scoring algorithm to determine Top 10 competitors.

#### Scenario: Selection based on multiple factors

- **WHEN** determining Top 10 competitors
- **THEN** the system SHALL consider:
  - Mention count in source data (weight: 40%)
  - Feature completeness in analysis (weight: 30%)
  - Description length/detail (weight: 20%)
  - Market position clarity (weight: 10%)

#### Scenario: Selection results are deterministic

- **WHEN** the same source data is analyzed
- **THEN** the Top 10 selection SHALL produce identical results
- **AND** the selection SHALL be reproducible

### Requirement: Competitive Matrix Visualization

The system SHALL use radar chart or quadrant diagram for competitive landscape overview.

#### Scenario: Radar chart for all competitors

- **WHEN** competitive landscape visualization is generated
- **THEN** the system SHALL generate a radar chart comparing competitors
- **AND** the chart SHALL include dimensions: Product Features, Price, User Experience, Technology Innovation, Market Coverage

#### Scenario: Visual highlighting of analyzed product

- **WHEN** the competitive radar chart is rendered
- **THEN** the analyzed product SHALL be highlighted in the visualization
- **AND** Top 5 competitors SHALL be labeled
