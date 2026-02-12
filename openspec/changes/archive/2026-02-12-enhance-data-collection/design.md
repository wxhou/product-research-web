# Design: Enhance Data Collection for Quantitative Analysis

## Goals

1. **Increase data completeness** - Target 70%+ completeness score
2. **Provide quantitative insights** - Include actual numbers, not "暂无数据"
3. **Calculate quality scores** - Automatic scoring based on data coverage
4. **Enable benchmark comparisons** - Industry benchmarks for unit economics

## Constraints

- Must work with existing search/extraction pipeline
- Fallback to estimates when exact data unavailable
- Cannot make external API calls (use existing search)
- Must handle missing data gracefully

## Decisions

### D1: Quality Score Calculation

**Option A**: Count populated fields
- Simple field count
- Doesn't reflect data importance

**Option B**: Weighted scoring by importance
- Market data: 30%
- Competitor data: 25%
- Business model: 20%
- User research: 15%
- Tech analysis: 10%

**Selected**: Option B - Weighted scoring

### D2: Market Size Estimation

**Option A**: Direct extraction from sources
- Requires explicit numbers in content
- Low coverage

**Option B**: Range estimation with keywords
- Search for "market size", "billion", "million"
- Calculate range from context

**Selected**: Option B with keyword-based extraction

### D3: Competitor Metrics

**Option A**: Full financial data
- CAC, LTV, revenue from public reports
- Very sparse data

**Option B**: Tier-based estimation
- Assign tiers based on company size/market position
- Estimate ranges per tier

**Selected**: Option B - Tier-based estimation with industry benchmarks

### D4: Unit Economics

**Option A**: Calculate from first principles
- Revenue / Customer count = ARPU
- Too many unknowns

**Option B**: Use industry benchmarks
- SaaS: CAC payback 12-18 months
- LTV/CAC benchmark 3x
- Gross margin 70-85%

**Selected**: Option B - Industry benchmark ranges

## Implementation

### Quality Assessor

```typescript
interface QualityWeights {
  marketData: number;      // 0.30
  competitorData: number;    // 0.25
  businessModel: number;     // 0.20
  userResearch: number;      // 0.15
  techAnalysis: number;      // 0.10
}

function calculateCompletenessScore(analysis: AnalysisResult): number {
  const weights: QualityWeights = {
    marketData: 0.30,
    competitorData: 0.25,
    businessModel: 0.20,
    userResearch: 0.15,
    techAnalysis: 0.10
  };

  const scores = {
    marketData: calculateMarketDataScore(analysis),
    competitorData: calculateCompetitorScore(analysis),
    businessModel: calculateBusinessModelScore(analysis),
    userResearch: calculateUserResearchScore(analysis),
    techAnalysis: calculateTechScore(analysis)
  };

  return Math.round(
    scores.marketData * weights.marketData +
    scores.competitorData * weights.competitorData +
    scores.businessModel * weights.businessModel +
    scores.userResearch * weights.userResearch +
    scores.techAnalysis * weights.techAnalysis
  );
}
```

### Market Analyzer

```typescript
interface MarketSizeEstimation {
  min: string;      // e.g., "100亿"
  base: string;     // e.g., "150亿"
  max: string;      // e.g., "200亿"
  currency: string;
  source: string;
  confidence: 'High' | 'Medium' | 'Low';
}

function estimateMarketSize(searchResults: SearchResult[]): MarketSizeEstimation {
  // Extract numbers with keywords: "market size", "billion", "million"
  // Calculate min/base/max range
  // Assign confidence based on source quality
}
```

### Competitor Analyzer

```typescript
interface CompetitorQuantitative {
  marketShare: Array<{
    competitor: string;
    share: number;      // percentage
    source?: string;
  }>;
  ltvCacRatio: Array<{
    competitor: string;
    ltv: string;
    cac: string;
    ratio: string;
    health: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  }>;
}

function estimateCompetitorMetrics(competitors: Competitor[]): CompetitorQuantitative {
  // Use tier-based estimation
  // Apply industry benchmarks
  // Calculate health based on LTV/CAC ratio
}
```

## Testing

1. Unit tests for scoring algorithms
2. Integration tests with sample data
3. End-to-end tests with real reports
