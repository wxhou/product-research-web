# research-report Specification

## Purpose
TBD - created by archiving change enhance-report-quality. Update Purpose after archive.

## Requirements
### Requirement: Quantitative Market Data Analysis

The system SHALL provide quantitative market data analysis including market size estimation, growth rate trends, and market driver analysis with data source attribution.

#### Scenario: Market size estimation with data source

- **WHEN** the analyzer processes market research data
- **THEN** it SHALL calculate and present the estimated market size in currency units (e.g., RMB, USD) with a defined market size range (min, base, max)
- **AND** it SHALL annotate each data point with its source (e.g., iResearch, QuestMobile, company financial reports)
- **AND** it SHALL provide a confidence level indicator (High/Medium/Low) for each market size estimate

#### Scenario: Historical growth rate analysis

- **WHEN** the analyzer processes historical market data
- **THEN** it SHALL calculate the compound annual growth rate (CAGR) for the past 3-5 years
- **AND** it SHALL identify growth trends (accelerating, stable, decelerating)
- **AND** it SHALL provide year-over-year (YoY) growth rates for each historical period

#### Scenario: Market driver and constraint analysis

- **WHEN** the analyzer generates market analysis
- **THEN** it SHALL identify at least 3 key market drivers (e.g., technology advancement, policy support, user demand growth)
- **AND** it SHALL identify at least 2 market constraints (e.g., regulatory limitations, technical barriers, market saturation)
- **AND** it SHALL quantify the impact level of each driver and constraint (High/Medium/Low)

### Requirement: User Research Data Integration

The system SHALL integrate user research data including user personas, sample sizes, confidence levels, and research methodologies with proper source attribution.

#### Scenario: User persona generation with demographics

- **WHEN** the analyzer processes user research data
- **THEN** it SHALL generate user personas with demographic attributes (age distribution, gender ratio, geographic distribution, income level)
- **AND** it SHALL include behavioral attributes (usage frequency, preferred features, payment willingness)
- **AND** it SHALL annotate persona data with source type (survey, behavioral data, third-party research)

#### Scenario: Sample size and confidence level disclosure

- **WHEN** user research data is included in the report
- **THEN** it SHALL disclose the sample size (e.g., n=1,500 respondents)
- **AND** it SHALL provide the confidence level (e.g., 95% confidence interval)
- **AND** it SHALL indicate the research methodology (e.g., online survey, telephone interview, focus group)

#### Scenario: User penetration and adoption metrics

- **WHEN** analyzing user data for a specific market
- **THEN** it SHALL calculate the market penetration rate (percentage of target users using the product category)
- **AND** it SHALL provide adoption trends over time (early adopters, early majority, late majority, laggards)
- **AND** it SHALL compare adoption rates across different user segments

### Requirement: Competitor Quantitative Analysis

The system SHALL provide quantitative competitor analysis including market share comparison, revenue metrics, and key performance indicators (KPUs) with visual representation.

#### Scenario: Market share comparison

- **WHEN** the analyzer processes competitor data
- **THEN** it SHALL calculate and present market share for each major competitor as a percentage
- **AND** it SHALL provide market share trends over time (quarterly or annually)
- **AND** it SHALL include a visual representation (pie chart or bar chart) of market share distribution
- **AND** it SHALL cite data sources for each market share figure

#### Scenario: Revenue and financial metrics comparison

- **WHEN** financial data is available for competitors
- **THEN** it SHALL present revenue figures in currency units with consistent time periods
- **AND** it SHALL calculate and present year-over-year revenue growth rates
- **AND** it SHALL include revenue per user (ARPU) where applicable
- **AND** it SHALL note data sources (public reports, estimates, industry analysis)

#### Scenario: CAC, LTV, and Unit Economics comparison

- **WHEN** the analyzer has sufficient data on competitor economics
- **THEN** it SHALL present Customer Acquisition Cost (CAC) for each competitor where available
- **AND** it SHALL present Customer Lifetime Value (LTV) estimates with calculation methodology
- **AND** it SHALL calculate and present LTV/CAC ratio as a measure of unit economics health
- **AND** it SHALL provide a clear disclaimer for estimated figures

### Requirement: Business Model Analysis

The system SHALL analyze and present business model characteristics including pricing strategies, monetization patterns, and overall commercial maturity assessment.

#### Scenario: Pricing strategy analysis

- **WHEN** the analyzer processes pricing data
- **THEN** it SHALL identify the pricing model (subscription, freemium, one-time purchase, usage-based)
- **AND** it SHALL present price points for different tiers (if applicable)
- **AND** it SHALL compare pricing against market averages
- **AND** it SHALL note regional pricing variations if applicable

#### Scenario: Unit Economics assessment

- **WHEN** the analyzer calculates unit economics metrics
- **THEN** it SHALL present the break-even analysis (time to break-even or revenue needed)
- **AND** it SHALL calculate the contribution margin at product or service level
- **AND** it SHALL assess the scalability of the unit economics model
- **AND** it SHALL provide a commercial maturity rating (Early Stage/Maturing/Mature)

#### Scenario: Monetization efficiency analysis

- **WHEN** the analyzer has conversion and revenue data
- **THEN** it SHALL present the free-to-paid conversion rate where available
- **AND** it SHALL present the average revenue per paying user (ARPPU)
- **AND** it SHALL analyze the revenue per daily active user (RPDAU) or similar engagement metrics
- **AND** it SHALL benchmark these metrics against industry standards where possible

### Requirement: Data Visualization Integration

The system SHALL generate and embed data visualizations including charts, graphs, and diagrams to support quantitative findings in the research report.

#### Scenario: Market size trend chart

- **WHEN** market size data is available for multiple time periods
- **THEN** the system SHALL generate a combination chart showing historical data (bar chart) and growth trend (line chart)
- **AND** the chart SHALL include axis labels, legend, and data source citations
- **AND** the chart SHALL be rendered using Mermaid.js or equivalent visualization library

#### Scenario: Market share distribution chart

- **WHEN** competitor market share data is available
- **THEN** the system SHALL generate a pie chart or donut chart showing market share distribution
- **AND** the chart SHALL display percentage values and competitor names
- **AND** the chart SHALL include a data source citation in the caption

#### Scenario: Competitor comparison radar chart

- **WHEN** multi-dimensional competitor data is available
- **THEN** the system SHALL generate a radar chart comparing competitors across key dimensions (features, price, user experience, etc.)
- **AND** the chart SHALL include clear axis labels and competitor legends
- **AND** the chart SHALL highlight the analyzed product's position in the competitive landscape

#### Scenario: User segmentation heatmap

- **WHEN** user segmentation data is available
- **THEN** the system SHALL generate a heatmap visualization showing user characteristics across segments
- **AND** the heatmap SHALL use appropriate color scales to represent intensity
- **AND** the visualization SHALL include axis labels and segment descriptions

### Requirement: Strategic Recommendations with SMART Goals

The system SHALL generate strategic recommendations that follow SMART principles (Specific, Measurable, Achievable, Relevant, Time-bound) with clear KPIs and implementation timelines.

#### Scenario: SMART goal generation

- **WHEN** the reporter generates strategic recommendations
- **THEN** each recommendation SHALL include a Specific description of the action
- **AND** it SHALL include Measurable KPIs or metrics to track success
- **AND** it SHALL specify Achievable targets based on market analysis
- **AND** it SHALL explain the Relevance to the product's market position
- **AND** it SHALL include a Time-bound deadline or milestone

#### Scenario: Resource and investment requirements

- **WHEN** the reporter generates strategic recommendations
- **THEN** it SHALL estimate the resource requirements (budget, team size, technology stack)
- **AND** it SHALL provide expected ROI or return projections where quantifiable
- **AND** it SHALL identify potential risks and mitigation strategies
- **AND** it SHALL prioritize recommendations based on impact and feasibility

#### Scenario: Implementation roadmap

- **WHEN** the reporter generates the final report
- **THEN** it SHALL include an implementation roadmap with phased milestones
- **AND** the roadmap SHALL break down into short-term (0-6 months), mid-term (6-12 months), and long-term (12+ months) phases
- **AND** each phase SHALL have clear objectives and success criteria
- **AND** the roadmap SHALL be presented in a visual timeline format (Gantt chart or similar)

### Requirement: Report Quality Assessment

The system SHALL provide a quality assessment score for generated reports based on data completeness, source credibility, and visualization coverage.

#### Scenario: Data completeness scoring

- **WHEN** the report is generated
- **THEN** the system SHALL calculate a data completeness score based on the percentage of required data fields that are populated
- **AND** the score SHALL be displayed in the report metadata
- **AND** any missing critical data SHALL be noted as data gaps in the report

#### Scenario: Source credibility assessment

- **WHEN** the report includes external data sources
- **THEN** the system SHALL assess the credibility of each source (primary, secondary, estimated)
- **AND** it SHALL provide an overall source credibility score for the report
- **AND** data from unverified or low-credibility sources SHALL be clearly marked

#### Scenario: Visualization coverage report

- **WHEN** the report is generated
- **THEN** the system SHALL track the number and types of visualizations included
- **AND** it SHALL calculate a visualization coverage score based on industry benchmarks
- **AND** it SHALL provide recommendations for additional visualizations if coverage is below threshold

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

#### Scenario: Card position in report

- **WHEN** a report is rendered
- **THEN** the executive summary card SHALL appear as Section 0 (before all numbered sections)
- **AND** it SHALL use the title "执行摘要卡片"

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

#### Scenario: Missing data placeholder standardization

- **WHEN** specific analysis cannot be performed due to missing data
- **THEN** the system SHALL display "待分析" (pending analysis)
- **AND** it SHALL include a reference to the data quality section

#### Scenario: Confidence levels clearly marked

- **WHEN** data with varying confidence levels is displayed
- **THEN** it SHALL be marked with:
  - 高置信度 (High): Data from official/authoritative sources
  - 中置信度 (Medium): Data from industry reports/public analysis
  - 低置信度 (Low): Data based on model inference
