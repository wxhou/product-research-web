## ADDED Requirements

### Requirement: Quality Assessment Scoring

The system SHALL calculate quality assessment scores for analysis results based on data completeness, source credibility, and visualization coverage.

#### Scenario: Data completeness scoring

- **WHEN** analysis is completed
- **THEN** the system SHALL calculate data completeness score using weighted scoring:
  - Market data: 30% weight
  - Competitor data: 25% weight
  - Business model: 20% weight
  - User research: 15% weight
  - Tech analysis: 10% weight
- **AND** the score SHALL be between 0 and 100
- **AND** the score SHALL be included in `qualityAssessment.dataCompletenessScore`

#### Scenario: Source credibility scoring

- **WHEN** analysis includes external data sources
- **THEN** the system SHALL assign credibility scores:
  - Primary sources (official reports): High
  - Secondary sources (news, blogs): Medium
  - Estimated/reconstructed data: Low
- **AND** the overall credibility SHALL be included in `qualityAssessment.sourceCredibilityScore`

### Requirement: Market Size Estimation

The system SHALL estimate market size ranges and growth rates from search results when exact data is unavailable.

#### Scenario: Keyword-based market size extraction

- **WHEN** searching for market data
- **THEN** the system SHALL search for keywords: "market size", "billion", "million", "RMB", "USD"
- **AND** it SHALL extract numeric values with context
- **AND** it SHALL calculate min/base/max ranges
- **AND** it SHALL assign confidence based on source quality

#### Scenario: Growth rate extraction

- **WHEN** searching for market trends
- **THEN** the system SHALL extract growth rates (CAGR, YoY)
- **AND** it SHALL identify the time period
- **AND** it SHALL provide growth rate in percentage format

### Requirement: Competitor Quantitative Metrics

The system SHALL estimate competitor quantitative metrics including market share, LTV/CAC ratios, and pricing tiers.

#### Scenario: Market share estimation by tier

- **WHEN** competitor analysis is performed
- **THEN** the system SHALL estimate market share using tier-based approach:
  - Tier 1 (market leaders): 20-40%
  - Tier 2 (challengers): 10-20%
  - Tier 3 (niche players): 5-10%
  - Tier 4 (others): remaining share
- **AND** estimates SHALL be clearly marked as "estimated"
- **AND** source confidence SHALL be Low

#### Scenario: LTV/CAC ratio calculation

- **WHEN** competitor financial metrics are needed
- **THEN** the system SHALL estimate LTV/CAC ratios using industry benchmarks:
  - SaaS benchmark: 3-5x (Healthy: >3x, Excellent: >5x)
  - B2B benchmark: 2-4x
  - Consumer benchmark: 1.5-3x
- **AND** health assessment SHALL be based on ratio thresholds

#### Scenario: Pricing tier extraction

- **WHEN** analyzing business models
- **THEN** the system SHALL extract pricing information:
  - Model type (subscription, usage-based, one-time)
  - Price range (min, max)
  - Currency unit

### Requirement: Unit Economics Estimation

The system SHALL estimate unit economics metrics using industry benchmarks when specific data is unavailable.

#### Scenario: Gross margin estimation

- **WHEN** business model analysis is performed
- **THEN** the system SHALL estimate gross margins:
  - SaaS software: 70-85%
  - Platform: 60-75%
  - Service: 30-50%
- **AND** estimates SHALL be marked with confidence level

#### Scenario: CAC payback period estimation

- **WHEN** customer acquisition data is needed
- **THEN** the system SHALL estimate payback period:
  - SaaS benchmark: 12-18 months
  - B2B benchmark: 18-24 months
  - Consumer benchmark: 6-12 months

### Requirement: User Research Metrics

The system SHALL estimate user research metrics including penetration rates and adoption trends.

#### Scenario: Penetration rate estimation

- **WHEN** user research data is collected
- **THEN** the system SHALL estimate penetration rates:
  - Early adopters: 2.5%
  - Early majority: 13.5%
  - Late majority: 34%
  - Laggards: 34%
- **AND** rates SHALL be adjustable based on market maturity

#### Scenario: Adoption trend modeling

- **WHEN** analyzing market adoption
- **THEN** the system SHALL model adoption trends:
  - Phase 1 (Innovators): 2.5%
  - Phase 2 (Early Adopters): 13.5%
  - Phase 3 (Early Majority): 34%
  - Phase 4 (Late Majority): 34%
  - Phase 5 (Laggards): 16%
