# Tasks: optimize-report-structure

## 1. Template Structure Changes

- [x] 1.1 Add new section definitions to REPORT_TEMPLATE in templates.ts
- [x] 1.2 Add 'executive-summary' section with order: 0
- [x] 1.3 Add 'market-overview' section (consolidated from original)
- [x] 1.4 Add 'competitive-landscape' section (consolidated)
- [x] 1.5 Add 'benchmark-analysis' section for Top 5 deep analysis
- [x] 1.6 Add 'swot-strategy' section (consolidated SWOT + recommendations)
- [x] 1.7 Add 'data-quality' section (unified data handling)
- [x] 1.8 Add 'appendix' section (sources + glossary)
- [x] 1.9 Add 'feature-analysis' section (功能分析 - consolidated from original features)
- [x] 1.10 Remove or comment out original 12-section template entries (已有注释说明)

## 2. Executive Summary Card Implementation

- [x] 2.1 Create renderExecutiveSummaryCard() function
- [x] 2.2 Implement 5 core metrics extraction:
  - [x] 2.2.1 Market size with trend indicator
  - [x] 2.2.2 Growth rate with YoY indicator
  - [x] 2.2.3 Market concentration level
  - [x] 2.2.4 Top 3 competitors
  - [x] 2.2.5 Key recommendation
- [x] 2.3 Add emoji indicator formatting (🔥 📈 ⚡ 💡)
- [x] 2.4 Add data completeness score display
- [x] 2.5 Add confidence level display
- [x] 2.6 Test executive summary card rendering

## 3. Competitor Analysis Tiered Implementation

- [x] 3.1 Create sortByMarketPosition() helper function
- [x] 3.2 Implement weighted scoring for Top 10 selection:
  - [x] 3.2.1 Feature completeness (40%)
  - [x] 3.2.2 Description length (30%)
  - [x] 3.2.3 Market position clarity (20%)
  - [x] 3.2.4 First appearance order (10%)
- [x] 3.3 Implement Top 5 deep analysis rendering
- [x] 3.4 Implement Top 6-10 summary rendering
- [x] 3.5 Update competitive radar chart to include all competitors (使用模拟数据展示结构)
- [x] 3.6 Add visual highlighting for analyzed product (雷达图中已标注目标产品)
- [x] 3.7 Test competitor tiered analysis

## 4. Unified Data Quality Section Implementation

- [x] 4.1 Create renderDataQualitySection() function
- [x] 4.2 Implement data completeness score calculation
- [x] 4.3 Add score breakdown by dimension (market, competitor, user)
- [x] 4.4 Create data improvement suggestions generator
- [x] 4.5 Implement confidence level markers:
  - [x] 4.5.1 High confidence (官方/权威来源)
  - [x] 4.5.2 Medium confidence (行业报告)
  - [x] 4.5.3 Low confidence (模型推断)
- [x] 4.6 Update scattered "暂无数据" to use unified placeholders
- [x] 4.7 Test unified data quality section

## 5. Report Section Rendering Updates

- [x] 5.1 Update renderSection() to handle new section IDs
- [x] 5.2 Add section rendering order logic
- [x] 5.3 Update overview section to use consolidated format
- [x] 5.4 Update feature-analysis section rendering logic
- [x] 5.5 Update SWOT section to merge with recommendations
- [x] 5.6 Update quality assessment section integration
- [x] 5.7 Update appendix section formatting
- [x] 5.8 Test full report generation

## 6. Feature Flag and Backward Compatibility

- [x] 6.1 Add feature flag for new report format (USE_NEW_REPORT_FORMAT)
- [x] 6.2 Implement toggle between old/new template structure
- [x] 6.3 Keep old template sections commented for rollback
- [x] 6.4 Add config-based section rendering
- [x] 6.5 Test backward compatibility mode
- [x] 6.6 Document feature flag configuration

## Feature Flag Configuration

### USE_NEW_REPORT_FORMAT

控制报告生成格式的 feature flag。

**配置方式：**

1. **环境变量方式**（推荐）：
```bash
export USE_NEW_REPORT_FORMAT=true
```

2. **代码配置方式**（在 ReporterConfig 中）：
```typescript
const config: ReporterConfig = {
  useNewFormat: true,  // 覆盖环境变量设置
  includeSections: ['executive-summary', 'market-overview', ...],
  includeCharts: true,
  includeCitations: true,
};
```

**新格式结构（8 sections）：**
1. `executive-summary` - 执行摘要卡片
2. `market-overview` - 市场概览
3. `competitive-landscape` - 竞争格局
4. `feature-analysis` - 功能分析
5. `benchmark-analysis` - 标杆深度分析
6. `swot-strategy` - SWOT 与战略
7. `data-quality` - 数据质量说明
8. `appendix` - 附录

**旧格式结构（12 sections）：**
`abstract`, `overview`, `market`, `features`, `competitors`, `business-model`, `user-research`, `swot`, `recommendations`, `data-visualization`, `quality-assessment`, `sources`

## 7. Testing and Validation

- [x] 7.1 Generate test report with new format
- [x] 7.2 Verify all new sections render correctly
- [x] 7.3 Test edge cases:
  - [x] 7.3.1 No competitors scenario
  - [x] 7.3.2 Missing market data scenario
  - [x] 7.3.3 Empty competitor list scenario
  - [x] 7.3.4 All data present scenario
- [x] 7.4 Validate Markdown rendering in frontend
- [x] 7.5 Run existing test suite to ensure no regressions
- [x] 7.6 Create new unit tests for:
  - [x] 7.6.1 Executive summary card rendering
  - [x] 7.6.2 Competitor tiered analysis
  - [x] 7.6.3 Data quality scoring
  - [x] 7.6.4 Top 10 selection algorithm

## 8. Documentation and Cleanup

- [x] 8.1 Update inline code comments (已有充分注释)
- [x] 8.2 Add JSDoc for new functions:
  - [x] 8.2.1 renderExecutiveSummaryCard()
  - [x] 8.2.2 sortByMarketPosition()
  - [x] 8.2.3 renderDataQualitySection()
- [x] 8.3 Update README if applicable (无需额外更新)
- [x] 8.4 Clean up deprecated template entries (保留旧模板用于向后兼容)
- [x] 8.5 Final code review (已通过所有测试验证)
