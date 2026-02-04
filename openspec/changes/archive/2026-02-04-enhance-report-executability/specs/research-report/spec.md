## MODIFIED Requirements

### Requirement: Report Structure for Business Executives

The research report SHALL be structured for business executive readability, enabling comprehension in under 5 minutes while providing actionable quantitative insights.

#### Scenario: Executive summary with key quantitative metrics

- **WHEN** the report is generated
- **THEN** it SHALL include a dedicated executive summary section at the top
- **AND** the executive summary SHALL display key quantitative metrics including:
  - Market size (e.g., "280亿元")
  - Growth rate (e.g., "32.5%")
  - Market concentration (e.g., "头部5家占65%")
  - Pricing range (e.g., "15-50万/年")
  - Target user penetration (e.g., "大型企业45%")
- **AND** all metrics SHALL have clear units and context
- **AND** no raw placeholders (e.g., `{dataCompletenessScore}`) SHALL appear in the output

#### Scenario: Prioritized SWOT analysis with business impact

- **WHEN** the SWOT analysis section is generated
- **THEN** it SHALL limit each category (Strengths, Weaknesses, Opportunities, Threats) to a maximum of 5 items
- **AND** each item SHALL include a business impact label showing quantifiable effect (e.g., "业务影响: 降低30%客服成本")
- **AND** items SHALL be ordered by business impact severity (highest impact first)

#### Scenario: Strategic recommendation tables with KPIs

- **WHEN** strategic recommendations are generated
- **THEN** they SHALL be presented in a structured table format with columns for:
  - Recommendation (建议)
  - KPI metric (KPI)
  - Current value (当前值)
  - Target value (目标值)
  - Timeline/time节点
  - Budget requirement (预算)
- **AND** each recommendation SHALL include at least one measurable KPI
- **AND** timelines SHALL be specific (e.g., "3个月", "6个月") rather than vague

#### Scenario: Unit economics metrics presentation

- **WHEN** unit economics data is available
- **THEN** the report SHALL include a dedicated Unit Economics section
- **AND** it SHALL present metrics in comparison table format including:
  - LTV/CAC ratio (with benchmark comparison)
  - CAC payback period (months to recover acquisition cost)
  - Gross margin percentage
- **AND** all metrics SHALL include industry benchmarks for context

### Requirement: Report Formatting and Quality

The research report SHALL maintain professional formatting with correct table structures and reliable visualization rendering.

#### Scenario: Table markdown structure validation

- **WHEN** markdown tables are generated in the report
- **THEN** they SHALL have proper markdown syntax including:
  - Header row with `|` delimiters on both sides
  - Separator row with `-` characters between header and data
  - Data rows with consistent `|` delimiter placement
- **AND** header labels SHALL NOT appear as data rows
- **AND** empty cells SHALL use appropriate placeholder text (e.g., "暂无数据")

#### Scenario: Mermaid chart rendering with fallbacks

- **WHEN** Mermaid charts are generated
- **THEN** the chart syntax SHALL be validated before rendering
- **AND** if chart data is missing or invalid, the system SHALL render a placeholder with clear message
- **AND** all charts SHALL include proper axis labels, legends, and data source citations
- **AND** charts that fail to render SHALL NOT break the report display

#### Scenario: Glossary for business terminology

- **WHEN** the report includes business metrics (ARR, NDR, LTV, CAC, etc.)
- **THEN** it SHALL include a glossary section in the appendix
- **AND** the glossary SHALL define each acronym in both English and Chinese
- **AND** the glossary format SHALL be:
  ```
  | 术语 | 定义 |
  |-----|------|
  | ARR | Annual Recurring Revenue，年度经常性收入 |
  ```

## ADDED Requirements

### Requirement: Report Completeness Validation

The system SHALL validate that reports meet minimum quality standards before delivery.

#### Scenario: Placeholder fallback verification

- **WHEN** templates are rendered
- **THEN** every placeholder MUST have a corresponding fallback value
- **AND** raw placeholders (text matching `{...}` pattern) SHALL NOT appear in final output
- **AND** validation SHALL occur before report completion

#### Scenario: Data quality indicators

- **WHEN** the report is generated
- **THEN** it SHALL display data completeness score (0-100%)
- **AND** it SHALL display source credibility score (High/Medium/Low)
- **AND** data from unverified sources SHALL be clearly marked
- **AND** data freshness timestamp SHALL indicate when data was collected
