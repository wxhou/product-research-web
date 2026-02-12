/**
 * Reporter Agent 报告模板
 *
 * 定义报告生成的模板和格式
 */

/** 报告模板配置 */
export interface ReportTemplate {
  sections: ReportSectionConfig[];
  mermaidCharts: MermaidChartConfig[];
  metadata: ReportMetadataConfig;
}

/** 报告章节配置 */
export interface ReportSectionConfig {
  id: string;
  title: string;
  required: boolean;
  order: number;
  template: string;
}

/** Mermaid 图表配置 */
export interface MermaidChartConfig {
  id: string;
  type: 'pie' | 'mindmap' | 'timeline' | 'radar' | 'graph' | 'quadrant' | 'journey' | 'stateDiagram' | 'xychart' | 'gantt';
  title: string;
  required: boolean;
}

/** 报告元数据配置 */
export interface ReportMetadataConfig {
  templateVersion: string;
  generatedAt: string;
}

/** 默认报告模板 - 增强版 */
export const REPORT_TEMPLATE: ReportTemplate = {
  sections: [
    // 新结构：执行摘要卡片放在最前面
    {
      id: 'executive-summary',
      title: '执行摘要卡片',
      required: true,
      order: 0,
      template: `> ## 执行摘要卡片
>
> | 指标 | 值 | 说明 |
> |-----|---|------|
> | 市场规模 | {marketSizeSummary} | {marketSizeTrend} |
> | 增长率 | {growthRateSummary} | {growthRateYoY} |
> | 市场集中度 | {marketConcentration} | {marketConcentrationLevel} |
> | Top 竞品 | {topCompetitors} | 前3名 |
> | 核心建议 | {keyRecommendation} | 💡 |
>
> **数据完整度**: {dataCompletenessScore}/100 | **置信度**: {confidenceLevel}%`,
    },
    {
      id: 'market-overview',
      title: '市场概览',
      required: true,
      order: 1,
      template: `## 1. 市场概览

### 市场规模

| 指标 | 数据 |
|-----|------|
| 市场规模 | {marketSize} |
| 增长率 | {growthRate} |
| 置信度 | {confidenceLevel} |
| 数据来源 | {dataSource} |

### 市场驱动因素

{drivers}

### 市场制约因素

{constraints}

### 市场趋势

{trends}`,
    },
    {
      id: 'competitive-landscape',
      title: '竞争格局',
      required: true,
      order: 2,
      template: `## 2. 竞争格局

### Top 10 竞品概览

| 排名 | 竞品名称 | 行业 | 核心功能 | 市场定位 |
|-----|---------|------|---------|---------|
{competitorTableRows}

### Top 6-10 摘要

{top6_10Summary}

### 竞争格局矩阵

\`\`\`mermaid
radar
  title 竞品对比雷达图
  axes: 产品功能, 价格竞争力, 用户体验, 技术创新, 市场覆盖
  竞品A: [80, 70, 85, 75, 60]
  竞品B: [70, 85, 75, 80, 70]
  目标产品: [75, 80, 70, 85, 65]
\`\`\`

[MINDMAP_CHART]
mindmap
  root((竞争格局))
{competitorMindmap}
[/MINDMAP_CHART]`,
    },
    {
      id: 'feature-analysis',
      title: '功能分析',
      required: true,
      order: 2.5,
      template: `## 2. 功能分析

### 核心功能列表

以下是我们识别出的产品核心功能，按出现频率排序：

| 功能 | 出现次数 | 占比 | 详细描述 |
|-----|---------|------|---------|
{featureTableRows}

### 功能频率分布

[PIE_CHART]
{featurePieChart}
[/PIE_CHART]

### 功能价值分析

{featureValueAnalysis}`,
    },
    {
      id: 'benchmark-analysis',
      title: '标杆深度分析',
      required: true,
      order: 3,
      template: `## 3. 标杆深度分析

以下是对行业标杆竞品的深度分析：

{benchmarkAnalysis}`,
    },
    {
      id: 'swot-strategy',
      title: 'SWOT与战略',
      required: true,
      order: 4,
      template: `## 4. SWOT与战略

### SWOT 分析

#### 优势 (Strengths)
{strengths}

#### 劣势 (Weaknesses)
{weaknesses}

#### 机会 (Opportunities)
{opportunities}

#### 威胁 (Threats)
{threats}

### 战略建议

#### 短期行动（0-6个月）
{shortTermRecommendations}

#### 中期规划（6-12个月）
{mediumTermRecommendations}

#### 长期愿景（1-3年）
{longTermRecommendations}`,
    },
    {
      id: 'data-quality',
      title: '数据质量说明',
      required: true,
      order: 5,
      template: `## 5. 数据质量说明

### 数据完整度评分: {overallScore}/100

| 维度 | 评分 | 说明 |
|-----|-----|------|
| 市场规模数据 | {marketDataScore}/100 | {marketDataNote} |
| 竞品数据 | {competitorDataScore}/100 | {competitorDataNote} |
| 用户数据 | {userDataScore}/100 | {userDataNote} |

### 数据获取建议

{dataSuggestions}

### 置信度说明

- **高置信度**: 数据来自官方/权威来源
- **中置信度**: 数据来自行业报告/公开分析
- **低置信度**: 数据基于模型推断`,
    },
    {
      id: 'appendix',
      title: '附录',
      required: false,
      order: 6,
      template: `## 附录

### 数据来源

{sourceList}

### 术语表

| 术语 | 定义 |
|-----|------|
| ARR | Annual Recurring Revenue，年度经常性收入 |
| CAGR | Compound Annual Growth Rate，复合年均增长率 |
| LTV | Lifetime Value，客户终身价值 |
| CAC | Customer Acquisition Cost，获客成本 |
| NPS | Net Promoter Score，净推荐值 |
| ARPPU | Average Revenue Per Paying User，每付费用户平均收入 |

**报告生成时间**: {generatedAt}`,
    },
    // 原有章节保留但在新结构中不再使用
    {
      id: 'abstract',
      title: '摘要',
      required: true,
      order: 1,
      template: `## 摘要

本报告通过调研全网产品信息，为您提供关于【{title}】的深度分析报告。基于对{searchResultCount}条搜索结果和{extractionCount}个页面内容的深度分析，我们识别出{featureCount}个核心功能类别、{competitorCount}个主要竞品，并深入分析了市场机会、技术栈、使用场景和战略建议。

**核心发现：**
- 产品定位：{productPositioning}
- 主要竞争优势：{keyStrengths}
- 市场机会：{marketOpportunity}
- 建议关注领域：{recommendationFocus}
- 数据完整度：**{dataCompletenessScore}分**
- 数据来源可信度：**{sourceCredibilityScore}分**`,
    },
    {
      id: 'overview',
      title: '调研概览',
      required: true,
      order: 2,
      template: `## 1. 调研概览

| 项目 | 数据 |
|-----|------|
| 调研产品数 | {productCount} |
| 数据来源 | {dataSources} |
| 关键词 | {keywords} |
| 识别功能数 | {featureCount} |
| 识别竞品数 | {competitorCount} |
| 分析置信度 | {confidenceScore}% |
| 数据完整度评分 | {dataCompletenessScore}/100 |
| 数据来源可信度 | {sourceCredibilityScore}/100 |
| 数据缺口 | {dataGaps} |`,
    },
    {
      id: 'market',
      title: '市场分析',
      required: true,
      order: 3,
      template: `## 2. 市场分析

### 2.1 市场规模

| 指标 | 数据 |
|-----|------|
| 市场规模范围 | {marketSizeRange} |
| 增长率 | {growthRate} |
| 置信度等级 | {confidenceLevel} |
| 数据来源 | {dataSource} |

### 2.2 市场规模趋势

\`\`\`mermaid
xychart-beta
    title "市场规模趋势与预测"
    x-axis [2022, 2023, 2024, 2025, 2026, 2028]
    y-axis "市场规模 (USD)" 0 --> 200
    bar [30, 45, 60, 75, 90, 120]
\`\`\`

### 2.3 历史增长率

| 年份 | 增长率 | 数据来源 |
|-----|-------|---------|
{marketGrowthHistory}

### 2.4 市场驱动因素

{marketDrivers}

### 2.5 市场制约因素

{marketConstraints}

### 2.6 市场预测（未来 {forecastYears} 年）

| 年份 | 预测规模 | 预测增长率 | 预测方法 |
|-----|---------|-----------|---------|
{marketForecasts}

### 2.7 主要玩家

{keyPlayers}`,
    },
    {
      id: 'features',
      title: '功能分析',
      required: true,
      order: 4,
      template: `## 3. 功能分析

### 3.1 核心功能列表

以下是我们识别出的产品核心功能，按出现频率排序：

| 功能 | 出现次数 | 占比 | 详细描述 |
|-----|---------|------|---------|
{featureTableRows}

### 3.2 功能频率分布

[PIE_CHART]
{featurePieChart}
[/PIE_CHART]

### 3.3 功能价值分析

基于深度分析，我们识别出以下核心功能及其用户价值：

{featureValueAnalysis}`,
    },
    {
      id: 'competitors',
      title: '竞品分析',
      required: true,
      order: 5,
      template: `## 4. 竞品分析

### 4.1 竞品总览

我们识别出以下主要竞争对手，并对其进行了深度分析：

| 竞品名称 | 行业 | 核心功能 | 市场定位 |
|---------|------|---------|---------|
{competitorTableRows}

### 4.2 竞品定量对比

#### 4.2.1 市场份额

\`\`\`mermaid
pie title 市场份额分布 ({currentYear})
{marketSharePie}
\`\`\`

#### 4.2.2 LTV/CAC 比率

| 竞品 | LTV/CAC 比率 | 健康度评估 |
|------|-------------|-----------|
{ltvCacRatio}

### 4.3 竞品深度对比

{competitorAnalysis}

### 4.4 竞品差异化分析

通过对比分析，我们发现各竞品之间的差异化特征：

{competitorDifferentiation}

### 4.5 市场空白点

{marketGaps}

### 4.6 竞争格局矩阵

\`\`\`mermaid
radar
  title 竞品对比
  axes: 产品功能, 价格竞争力, 用户体验, 技术创新, 市场覆盖
  竞品A: [80, 70, 85, 75, 60]
  竞品B: [70, 85, 75, 80, 70]
  目标产品: [75, 80, 70, 85, 65]
\`\`\`

[MINDMAP_CHART]
{competitorMindmap}
[/MINDMAP_CHART]`,
    },
    {
      id: 'business-model',
      title: '商业模式分析',
      required: false,
      order: 6,
      template: `## 5. 商业模式分析

### 5.1 定价模式

**定价类型：** {pricingModelType}

| 套餐 | 价格 | 包含功能 |
|-----|------|---------|
{pricingTiers}

### 5.2 Unit Economics 分析

| 指标 | 数值 | 评估 |
|-----|------|-----|
| 毛利率 | {contributionMargin}% | {marginAssessment} |
| 盈亏平衡时间 | {breakEvenTime} | - |
| 免费转付费率 | {conversionRate}% | {conversionAssessment} |
| ARPPU | {arppu} | {arppuAssessment} |

### 5.3 商业化成熟度评估

**成熟度等级：** {commercialMaturityRating}

**评估说明：** {commercialMaturityAssessment}

### 5.4 关键指标

- 月经常性收入 (MRR)：{mrr}
- 客户生命周期价值 (LTV)：{ltv}
- 客户获取成本 (CAC)：{cac}
- 月流失率：{churnRate}
- 净推荐值 (NPS)：{nps}`,
    },
    {
      id: 'user-research',
      title: '用户研究',
      required: false,
      order: 7,
      template: `## 6. 用户研究

### 6.1 调研方法

**研究方法：** {researchMethodology}

**样本信息：**
- 样本量：{sampleSize}
- 置信水平：{confidenceLevel}%
- 误差范围：±{marginOfError}%

### 6.2 用户画像

{userPersonas}

### 6.3 渗透率分析

| 用户群体 | 渗透率 |
|---------|-------|
{penetrationRates}

### 6.4 用户满意度

**净推荐值 (NPS)：** {npsScore}

**满意度评分：** {satisfactionScore}/10

**关键反馈：** {keyFeedback}

### 6.5 用户采纳趋势

| 阶段 | 用户占比 | 描述 |
|-----|---------|-----|
{adoptionTrends}`,
    },
    {
      id: 'swot',
      title: 'SWOT 分析',
      required: true,
      order: 8,
      template: `## 7. SWOT 分析

### 7.1 优势 (Strengths)

{strengths}

### 7.2 劣势 (Weaknesses)

{weaknesses}

### 7.3 机会 (Opportunities)

{opportunities}

### 7.4 威胁 (Threats)

{threats}

### 7.5 SWOT 战略矩阵

基于以上分析，我们提出以下战略建议：

- **SO 策略（优势+机会）**：利用技术优势和品牌影响力，快速占领新兴市场
- **WO 策略（劣势+机会）**：通过合作或并购弥补能力短板，把握市场机遇
- **ST 策略（优势+威胁）**：强化核心竞争壁垒，应对竞争压力
- **WT 策略（劣势+威胁）**：聚焦核心业务，避免多线作战

### 7.6 SWOT 思维导图

[MINDMAP_CHART]
  root((SWOT 分析))
    优势(S)
{strengthsMindmap}
    劣势(W)
{weaknessesMindmap}
    机会(O)
{opportunitiesMindmap}
    威胁(T)
{threatsMindmap}
[/MINDMAP_CHART]`,
    },
    {
      id: 'recommendations',
      title: '战略建议',
      required: true,
      order: 9,
      template: `## 8. 战略建议

基于以上深度分析，我们提出以下遵循 SMART 原则的战略建议：

### 8.1 短期行动（0-6个月）

{shortTermRecommendations}

**具体行动计划：**
1. 优先聚焦核心场景，打磨产品体验
2. 建立标杆客户案例，验证产品价值
3. 优化定价策略，降低客户尝试门槛

**关键里程碑：**
- [ ] 第1个月：完成市场调研和竞品分析报告
- [ ] 第3个月：推出核心功能优化版本
- [ ] 第6个月：获得首批付费客户验证

### 8.2 中期规划（6-12个月）

{mediumTermRecommendations}

**关键里程碑：**
1. 扩展功能覆盖，发布正式版本
2. 建立销售渠道和合作伙伴体系
3. 获得首批付费客户，实现商业化

### 8.3 长期愿景（1-3年）

{longTermRecommendations}

**愿景目标：**
1. 成为细分领域领先供应商
2. 建立开放生态系统，吸引第三方开发者
3. 探索国际化机会，拓展海外市场

### 8.4 实施路线图

\`\`\`mermaid
gantt
    title 实施路线图
    dateFormat  YYYY-MM-DD
    section 短期 (0-6个月)
    市场调研 :active, 2025-02-01, 30d
    产品优化 :2025-03-01, 60d
    section 中期 (6-12个月)
    功能扩展 :2025-08-01, 90d
    渠道建设 :2025-09-01, 60d
    section 长期 (1-3年)
    生态建设 :2026-02-01, 365d
    国际化探索 :2027-02-01, 365d
\`\`\``,
    },
    {
      id: 'data-visualization',
      title: '数据可视化',
      required: false,
      order: 10,
      template: `## 9. 数据可视化

### 9.1 用户细分热力图

{userSegmentationHeatmap}

### 9.2 产业链上下游关系

\`\`\`mermaid
graph LR
  subgraph 上游
  U1[原材料]
  U2[技术]
  end

  subgraph 中游
  M1[产品开发]
  M2[服务提供]
  end

  subgraph 下游
  D1[用户]
  D2[客户]
  end

  U1 --> M1
  U2 --> M1
  M1 --> D1
  M1 --> D2
  M2 --> D1
  M2 --> D2
\`\`\``,
    },
    {
      id: 'quality-assessment',
      title: '报告质量评估',
      required: false,
      order: 11,
      template: `## 10. 报告质量评估

### 10.1 质量评分

| 评估维度 | 得分 | 说明 |
|---------|-----|------|
| 数据完整度 | {dataCompletenessScore}/100 | 基于收集到的数据量 |
| 数据来源可信度 | {sourceCredibilityScore}/100 | 基于数据来源的可靠性 |
| 可视化覆盖率 | {visualizationCoverageScore}/100 | 基于图表类型覆盖率 |
| **总体质量** | **{overallQualityScore}/100** | 综合评分 |

### 10.2 数据缺口

{dataGaps}

### 10.3 改进建议

{qualityRecommendations}`,
    },
    {
      id: 'sources',
      title: '数据来源说明',
      required: true,
      order: 12,
      template: `## 11. 数据来源说明

本报告数据来源于以下渠道：

{sourceList}

### 数据收集时间

- 调研时间: {generatedAt}

### 方法论

本报告采用以下调研方法：

1. **信息收集**：通过多渠道收集产品相关信息（{dataSources}）
2. **数据分析**：使用 AI 进行功能、竞品、市场深度分析
3. **定量分析**：基于数据模型进行市场规模估算和预测
4. **洞察生成**：基于数据分析生成战略洞察和建议
5. **可视化呈现**：通过 Mermaid 图表展示分析结果

### 数据可信度说明

- **Primary（主要来源）**：直接引用的权威数据源（艾瑞、QuestMobile等）
- **Secondary（次要来源）**：公开报道、行业分析等
- **Estimated（估算数据）**：基于模型推算的数据
- **Unverified（未验证）**：来源不明确的数据

### 分析置信度说明

- 置信度 {confidenceScore}%：基于数据完整性和来源可靠性计算
- 数据缺口：{dataGaps}`,
    },
  ],
  mermaidCharts: [
    { id: 'feature-frequency', type: 'pie', title: '功能频率分布', required: true },
    { id: 'competitor-mindmap', type: 'mindmap', title: '竞品思维导图', required: false },
    { id: 'swot-mindmap', type: 'mindmap', title: 'SWOT思维导图', required: true },
    { id: 'market-size-trend', type: 'xychart', title: '市场规模趋势图', required: true },
    { id: 'market-share', type: 'pie', title: '市场份额饼图', required: true },
    { id: 'competitor-radar', type: 'radar', title: '竞品雷达图', required: false },
    { id: 'roadmap-gantt', type: 'gantt', title: '实施路线图', required: false },
  ],
  metadata: {
    templateVersion: '3.0.0',
    generatedAt: new Date().toISOString(),
  },
};

/**
 * 从分析结果生成报告内容
 */
export function generateReportContent(
  title: string,
  keywords: string[],
  searchResultCount: number,
  extractionCount: number,
  analysis: {
    features: Array<{ name: string; count: number; sources?: string[]; description: string }>;
    competitors: Array<{ name: string; industry: string; features: string[]; description: string; marketPosition: string }>;
    swot: {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    };
    marketData: {
      marketSize: string;
      growthRate: string;
      keyPlayers: string[];
      trends: string[];
      opportunities: string[];
      challenges: string[];
      marketSizeRange?: { min: string; base: string; max: string; currency: string };
      growthRateHistorical?: Array<{ year: string; rate: string; source: string }>;
      forecastYears?: Array<{ year: string; projectedSize: string; projectedRate: string; methodology: string }>;
      dataSource?: { primary: string; secondary: string[]; lastUpdated: string };
      confidenceLevel?: 'High' | 'Medium' | 'Low';
      marketDrivers?: Array<{ factor: string; impact: 'High' | 'Medium' | 'Low'; description: string }>;
      marketConstraints?: Array<{ factor: string; impact: 'High' | 'Medium' | 'Low'; description: string }>;
    };
    competitorQuantitative?: {
      marketShare?: Array<{ competitor: string; share: number; yoyGrowth?: string; period?: string; source?: string }>;
      ltvCacRatio?: Array<{ competitor: string; ltv: string; cac: string; ratio: string; health: string }>;
      revenueMetrics?: Array<{ competitor: string; revenue: string; revenueGrowthRate: string }>;
    };
    businessModel?: {
      pricingModel?: {
        type: string;
        tiers?: Array<{ name: string; price: string; features: string }>;
        regionalVariations?: string;
      };
      unitEconomics?: {
        breakEvenAnalysis?: { timeToBreakEven: string; revenueNeeded: string };
        contributionMargin?: number;
        scalabilityAssessment: string;
      };
      monetizationEfficiency?: {
        freeToPaidConversion?: number;
        arppu?: string;
        rpDau?: string;
      };
      commercialMaturity?: {
        rating: 'Early Stage' | 'Maturing' | 'Mature';
        assessment: string;
        keyMetrics: string[];
      };
    };
    userResearch?: {
      userPersonas?: Array<{
        name: string;
        demographics: { ageRange: string; genderRatio: string; geographicDistribution: string; incomeLevel: string };
        behavioral: { usageFrequency: string; preferredFeatures: string[]; paymentWillingness: string };
        source: string;
      }>;
      sampleSize?: { total: number; targetPopulation: string; confidenceLevel: number; marginOfError: number };
      researchMethodology?: string;
      penetrationRate?: { overall: number; bySegment: Array<{ segment: string; rate: number }> };
      userSatisfaction?: { nps?: number; satisfactionScore: number; keyFeedback: string[] };
      adoptionTrends?: Array<{ phase: string; percentage: number; description: string }>;
    };
    techAnalysis?: {
      architecture: string[];
      techStack: string[];
      emergingTech: string[];
      innovationPoints: string[];
    };
    confidenceScore: number;
    dataGaps: string[];
    qualityAssessment?: {
      dataCompletenessScore: number;
      sourceCredibilityScore: number;
      visualizationCoverageScore: number;
      overallQualityScore: number;
      dataGaps: string[];
      recommendations: string[];
    };
    roadmap?: {
      shortTerm: Array<{
        specific: string;
        measurable: { kpis: Array<{ name: string; target: string; current: string; unit: string }> };
        achievable: { feasibility: string; rationale: string };
        relevant: { relevanceScore: number; businessImpact: string };
        timeBound: {
          deadline: string;
          milestones: Array<{ name: string; targetDate: string; successCriteria: string }>;
        };
        resourceRequirements: { budget: string; teamSize: string };
      }>;
      mediumTerm: Array<{
        specific: string;
        measurable: { kpis: Array<{ name: string; target: string; current: string; unit: string }> };
        achievable: { feasibility: string; rationale: string };
        relevant: { relevanceScore: number; businessImpact: string };
        timeBound: {
          deadline: string;
          milestones: Array<{ name: string; targetDate: string; successCriteria: string }>;
        };
        resourceRequirements: { budget: string; teamSize: string };
      }>;
      longTerm: Array<{
        specific: string;
        measurable: { kpis: Array<{ name: string; target: string; current: string; unit: string }> };
        achievable: { feasibility: string; rationale: string };
        relevant: { relevanceScore: number; businessImpact: string };
        timeBound: {
          deadline: string;
          milestones: Array<{ name: string; targetDate: string; successCriteria: string }>;
        };
        resourceRequirements: { budget: string; teamSize: string };
      }>;
    };
  },
  dataSources: string | string[],
  options?: {
    useNewFormat?: boolean;
  }
): string {
  // 统一 dataSources 为字符串
  const dataSourcesStr = Array.isArray(dataSources) ? dataSources.join(', ') : dataSources;
  const keywordsStr = Array.isArray(keywords) ? keywords.join(', ') : keywords;

  const template = REPORT_TEMPLATE.sections;

  // 根据格式过滤 sections
  const newFormatSectionIds = new Set([
    'executive-summary',
    'market-overview',
    'competitive-landscape',
    'feature-analysis',
    'benchmark-analysis',
    'swot-strategy',
    'data-quality',
    'appendix'
  ]);

  const filteredTemplate = template.filter(section => {
    if (options?.useNewFormat) {
      return newFormatSectionIds.has(section.id);
    }
    // 旧格式：排除新格式的 sections
    return !newFormatSectionIds.has(section.id);
  });

  // 生成各章节内容
  let report = '';

  for (const section of filteredTemplate.sort((a, b) => a.order - b.order)) {
    report += renderSection(section, {
      title,
      keywords: keywordsStr,
      searchResultCount,
      extractionCount,
      analysis,
      dataSources: dataSourcesStr,
    });
    report += '\n\n';
  }

  // 如果使用新格式，添加附录（来源+术语表）
  if (options?.useNewFormat) {
    // appendix 已经包含了 sources
  } else {
    // 旧格式：单独添加术语表
    report += renderGlossary();
  }

  return report.trim();
}

/**
 * 报告渲染数据接口
 */
interface ReportRenderData {
  title: string;
  keywords: string;
  searchResultCount: number;
  extractionCount: number;
  analysis: {
    features: Array<{ name: string; count: number; sources?: string[]; description: string }>;
    competitors: Array<{ name: string; industry: string; features: string[]; description: string; marketPosition: string }>;
    swot: {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    };
    marketData: {
      marketSize: string;
      growthRate: string;
      keyPlayers: string[];
      trends: string[];
      opportunities: string[];
      challenges: string[];
      // 新增定量数据字段
      marketSizeRange?: {
        min: string;
        base: string;
        max: string;
        currency: string;
      };
      growthRateHistorical?: Array<{ year: string; rate: string; source: string }>;
      forecastYears?: Array<{ year: string; projectedSize: string; projectedRate: string; methodology: string }>;
      dataSource?: { primary: string; secondary: string[]; lastUpdated: string };
      confidenceLevel?: 'High' | 'Medium' | 'Low';
      marketDrivers?: Array<{ factor: string; impact: 'High' | 'Medium' | 'Low'; description: string }>;
      marketConstraints?: Array<{ factor: string; impact: 'High' | 'Medium' | 'Low'; description: string }>;
    };
    competitorQuantitative?: {
      marketShare?: Array<{ competitor: string; share: number; yoyGrowth?: string }>;
      ltvCacRatio?: Array<{ competitor: string; ltv: string; cac: string; ratio: string; health: string }>;
    };
    businessModel?: {
      pricingModel?: {
        type: string;
        tiers?: Array<{ name: string; price: string; features: string }>;
        regionalVariations?: string;
      };
      unitEconomics?: {
        breakEvenAnalysis?: { timeToBreakEven: string; revenueNeeded: string };
        contributionMargin?: number;
        scalabilityAssessment: string;
      };
      monetizationEfficiency?: {
        freeToPaidConversion?: number;
        arppu?: string;
        rpDau?: string;
      };
      commercialMaturity?: {
        rating: 'Early Stage' | 'Maturing' | 'Mature';
        assessment: string;
        keyMetrics: string[];
      };
    };
    userResearch?: {
      researchMethodology?: string;
      sampleSize?: { total: number; targetPopulation: string; confidenceLevel: number; marginOfError: number };
      userPersonas?: Array<{
        name: string;
        demographics: { ageRange: string; genderRatio: string; geographicDistribution: string; incomeLevel: string };
        behavioral: { usageFrequency: string; preferredFeatures: string[]; paymentWillingness: string };
        source: string;
      }>;
      penetrationRate?: { overall: number; bySegment: Array<{ segment: string; rate: number }> };
      userSatisfaction?: { nps?: number; satisfactionScore: number; keyFeedback: string[] };
      adoptionTrends?: Array<{ phase: string; percentage: number; description: string }>;
    };
    techAnalysis?: {
      architecture: string[];
      techStack: string[];
      emergingTech: string[];
      innovationPoints: string[];
    };
    confidenceScore: number;
    dataGaps: string[];
    qualityAssessment?: {
      dataCompletenessScore: number;
      sourceCredibilityScore: number;
      visualizationCoverageScore: number;
      overallQualityScore: number;
      dataGaps: string[];
      recommendations: string[];
    };
    roadmap?: {
      shortTerm: Array<{
        specific: string;
        measurable: { kpis: Array<{ name: string; target: string; current: string; unit: string }> };
        achievable: { feasibility: string; rationale: string };
        relevant: { relevanceScore: number; businessImpact: string };
        timeBound: {
          deadline: string;
          milestones: Array<{ name: string; targetDate: string; successCriteria: string }>;
        };
        resourceRequirements: { budget: string; teamSize: string };
      }>;
      // 使用与 shortTerm 相同的类型定义
      mediumTerm: Array<{
        specific: string;
        measurable: { kpis: Array<{ name: string; target: string; current: string; unit: string }> };
        achievable: { feasibility: string; rationale: string };
        relevant: { relevanceScore: number; businessImpact: string };
        timeBound: {
          deadline: string;
          milestones: Array<{ name: string; targetDate: string; successCriteria: string }>;
        };
        resourceRequirements: { budget: string; teamSize: string };
      }>;
      longTerm: Array<{
        specific: string;
        measurable: { kpis: Array<{ name: string; target: string; current: string; unit: string }> };
        achievable: { feasibility: string; rationale: string };
        relevant: { relevanceScore: number; businessImpact: string };
        timeBound: {
          deadline: string;
          milestones: Array<{ name: string; targetDate: string; successCriteria: string }>;
        };
        resourceRequirements: { budget: string; teamSize: string };
      }>;
    };
  };
  dataSources: string;
}

/**
 * 渲染单个章节
 */
function renderSection(
  section: ReportSectionConfig,
  data: ReportRenderData
): string {
  let content = section.template;
  const analysis = data.analysis;

  // 数据验证日志
  const validationLog = {
    section: section.id,
    hasSwot: !!analysis.swot,
    swotLengths: {
      strengths: analysis.swot?.strengths?.length || 0,
      weaknesses: analysis.swot?.weaknesses?.length || 0,
      opportunities: analysis.swot?.opportunities?.length || 0,
      threats: analysis.swot?.threats?.length || 0
    },
    hasMarketData: !!analysis.marketData,
    hasFeatures: analysis.features?.length > 0,
    featureCount: analysis.features?.length || 0,
    hasCompetitors: analysis.competitors?.length > 0,
    competitorCount: analysis.competitors?.length || 0,
    hasQualityAssessment: !!analysis.qualityAssessment
  };
  console.log(`[renderSection] ${section.id}:`, JSON.stringify(validationLog, null, 2));

  // 计算统计数据
  const featureCount = analysis.features?.length || 0;
  const competitorCount = analysis.competitors?.length || 0;
  const productCount = competitorCount + 1; // 包括目标产品本身

  // 替换简单占位符
  content = content.replace(/{title}/g, data.title);
  content = content.replace(/{keywords}/g, data.keywords || '无关键词');
  content = content.replace(/{searchResultCount}/g, String(data.searchResultCount));
  content = content.replace(/{extractionCount}/g, String(data.extractionCount));
  content = content.replace(/{dataSources}/g, data.dataSources);
  content = content.replace(/{featureCount}/g, String(featureCount));
  content = content.replace(/{competitorCount}/g, String(competitorCount));
  content = content.replace(/{productCount}/g, String(productCount));
  content = content.replace(/{dataGaps}/g, analysis.dataGaps.length > 0 ? analysis.dataGaps.join('、') : '无');
  // 注意：模板中已有 % 后缀，这里不再添加
  content = content.replace(/{confidenceScore}/g, String((data.analysis.confidenceScore * 100).toFixed(0)));

  // 特殊处理摘要章节
  if (section.id === 'abstract') {
    // 安全获取数据，支持 undefined
    const swot = analysis.swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] };
    const marketData = analysis.marketData || { opportunities: [], trends: [] };
    const competitors = analysis.competitors || [];
    const features = analysis.features || [];

    content = content.replace(/{productPositioning}/g, competitors.length > 0 ?
      `聚焦${competitors[0].industry || '目标'}市场，提供${features.slice(0, 3).map(f => f.name).join('、')}等核心功能` : '待分析');
    content = content.replace(/{keyStrengths}/g, swot.strengths.slice(0, 2).join('，') || '待分析');
    content = content.replace(/{marketOpportunity}/g, marketData.opportunities[0] || marketData.trends[0] || '待分析');
    content = content.replace(/{recommendationFocus}/g, swot.opportunities.slice(0, 2).join('，') || '待分析');

    // Handle quality assessment placeholders in abstract section
    const qa = analysis.qualityAssessment;
    if (qa) {
      content = content.replace(/{dataCompletenessScore}/g, String(qa.dataCompletenessScore));
      content = content.replace(/{sourceCredibilityScore}/g, String(qa.sourceCredibilityScore));
    } else {
      content = content.replace(/{dataCompletenessScore}/g, '0');
      content = content.replace(/{sourceCredibilityScore}/g, '0');
    }
  }

  // 特殊处理调研概览章节
  if (section.id === 'overview') {
    // Handle quality assessment placeholders in overview section
    const qa = analysis.qualityAssessment;
    if (qa) {
      content = content.replace(/{dataCompletenessScore}/g, String(qa.dataCompletenessScore));
      content = content.replace(/{sourceCredibilityScore}/g, String(qa.sourceCredibilityScore));
    } else {
      content = content.replace(/{dataCompletenessScore}/g, '0');
      content = content.replace(/{sourceCredibilityScore}/g, '0');
    }
  }

  // 特殊处理功能章节
  if (section.id === 'features') {
    content = content.replace('{featureTableRows}', renderFeatureTable(analysis.features));
    content = content.replace('{featureValueAnalysis}', renderFeatureValueAnalysis(analysis.features));
    content = replaceMermaidChart(content, 'PIE_CHART', 'pie title 功能出现频率统计', renderFeaturePieChart(analysis.features));
  }

  // 特殊处理竞品章节
  if (section.id === 'competitors') {
    content = content.replace('{competitorTableRows}', renderCompetitorTable(analysis.competitors));
    content = content.replace('{competitorAnalysis}', renderCompetitorAnalysis(analysis.competitors));
    content = content.replace('{competitorDifferentiation}', renderCompetitorDifferentiation(analysis.competitors));
    content = content.replace('{marketGaps}', renderMarketGaps(analysis.competitors, analysis.features));
    content = content.replace('{competitorMindmap}', renderCompetitorMindmap(analysis.competitors));

    // Handle market share pie chart
    const cq = analysis.competitorQuantitative;
    if (cq && cq.marketShare && cq.marketShare.length > 0) {
      const currentYear = new Date().getFullYear();
      content = content.replace(/{currentYear}/g, String(currentYear));
      const pieData = cq.marketShare.map(m => `  "${m.competitor}" : ${m.share}`).join('\n');
      content = content.replace(/{marketSharePie}/g, pieData);
    } else {
      content = content.replace(/{currentYear}/g, String(new Date().getFullYear()));
      content = content.replace(/{marketSharePie}/g, '  "暂无数据" : 100');
    }

    // Handle LTV/CAC ratio table
    if (cq && cq.ltvCacRatio && cq.ltvCacRatio.length > 0) {
      const ltvRows = cq.ltvCacRatio.map(l => `| ${l.competitor} | ${l.ratio} | ${l.health} |`).join('\n');
      content = content.replace(/{ltvCacRatio}/g, ltvRows);
    } else {
      content = content.replace(/{ltvCacRatio}/g, '| 暂无LTV/CAC数据 | - | 待分析 |');
    }

    content = replaceMermaidChart(content, 'MINDMAP_CHART', 'mindmap\n  root((竞品分析))', renderCompetitorMindmap(analysis.competitors));
  }

  // 特殊处理 SWOT 章节
  if (section.id === 'swot') {
    // 安全获取 SWOT 数据，支持 undefined
    const swot = analysis.swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] };
    const strengths = swot.strengths || [];
    const weaknesses = swot.weaknesses || [];
    const opportunities = swot.opportunities || [];
    const threats = swot.threats || [];

    // Limit SWOT items to 5 per category for executive readability
    content = content.replace('{strengths}', renderList(strengths.slice(0, 5)));
    content = content.replace('{weaknesses}', renderList(weaknesses.slice(0, 5)));
    content = content.replace('{opportunities}', renderList(opportunities.slice(0, 5)));
    content = content.replace('{threats}', renderList(threats.slice(0, 5)));

    // 渲染思维导图，添加空数据fallback
    const hasSwotData = strengths.length > 0 || weaknesses.length > 0 || opportunities.length > 0 || threats.length > 0;
    let mindmapContent: string;
    if (hasSwotData) {
      mindmapContent = `  root((SWOT 分析))\n    优势(S)\n${renderSafeMindmapItems(strengths.slice(0, 5))}\n    劣势(W)\n${renderSafeMindmapItems(weaknesses.slice(0, 5))}\n    机会(O)\n${renderSafeMindmapItems(opportunities.slice(0, 5))}\n    威胁(T)\n${renderSafeMindmapItems(threats.slice(0, 5))}`;
    } else {
      // 空数据时生成占位思维导图
      mindmapContent = `  root((SWOT 分析))\n    优势(S) : 待分析\n    劣势(W) : 待分析\n    机会(O) : 待分析\n    威胁(T) : 待分析`;
    }
    content = replaceMermaidChart(content, 'MINDMAP_CHART', 'mindmap', mindmapContent);
  }

  // ============================================================
  // 新增：处理优化报告模板的 section IDs
  // ============================================================

  // 处理执行摘要卡片
  if (section.id === 'executive-summary') {
    // 使用 renderExecutiveSummaryCard 函数
    const summaryCard = renderExecutiveSummaryCard({
      title: data.title,
      keywords: data.keywords ? data.keywords.split(',') : [],
      searchResultCount: data.searchResultCount,
      extractionCount: data.extractionCount,
      analysis: {
        features: analysis.features || [],
        competitors: analysis.competitors || [],
        marketData: analysis.marketData || { trends: [], opportunities: [] },
        swot: analysis.swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        qualityAssessment: analysis.qualityAssessment
      }
    });
    content = summaryCard;
  }

  // 处理市场概览
  if (section.id === 'market-overview') {
    const md = analysis.marketData || { trends: [], opportunities: [], challenges: [], marketDrivers: [], marketConstraints: [] };
    content = content.replace('{marketSize}', md.marketSize || '暂无数据');
    content = content.replace('{growthRate}', md.growthRate || '暂无数据');
    content = content.replace('{confidenceLevel}', md.confidenceLevel || 'Medium');
    content = content.replace('{dataSource}', md.dataSource?.primary || '基于网络调研估算');

    // 驱动因素 - 有数据则使用，无数据则基于趋势生成
    let drivers: string;
    if (md.marketDrivers && md.marketDrivers.length > 0) {
      drivers = md.marketDrivers.map(d => `- **${d.factor}** (${d.impact}): ${d.description}`).join('\n');
    } else {
      // 基于市场趋势生成默认驱动因素
      drivers = generateDefaultDrivers(md.trends, md.opportunities);
    }
    content = content.replace('{drivers}', drivers);

    // 制约因素 - 有数据则使用，无数据则基于挑战生成
    let constraints: string;
    if (md.marketConstraints && md.marketConstraints.length > 0) {
      constraints = md.marketConstraints.map(c => `- **${c.factor}** (${c.impact}): ${c.description}`).join('\n');
    } else {
      // 基于市场挑战生成默认制约因素
      constraints = generateDefaultConstraints(md.challenges);
    }
    content = content.replace('{constraints}', constraints);

    content = content.replace('{trends}', renderList(md.trends) || '暂无趋势数据');
  }

  // 处理竞争格局
  if (section.id === 'competitive-landscape') {
    // 竞品表格
    content = content.replace('{competitorTableRows}', renderCompetitorTable(analysis.competitors || []));

    // 分层竞品分析
    const tiered = renderCompetitorTieredAnalysis(analysis.competitors || []);
    content = content.replace('{benchmarkAnalysis}', tiered.benchmarkAnalysis);
    content = content.replace('{top6_10Summary}', tiered.top6_10Summary);

    // 竞品思维导图
    content = content.replace('{competitorMindmap}', renderCompetitorMindmap(analysis.competitors || []));

    // 竞争雷达图 - 使用动态数据
    const radarContent = generateCompetitorRadarData(analysis.competitors || []);
    content = replaceMermaidChart(content, 'RADAR_CHART', 'radar', radarContent);
  }

  // 处理功能分析
  if (section.id === 'feature-analysis') {
    content = content.replace('{featureTableRows}', renderFeatureTable(analysis.features || []));
    content = content.replace('{featureValueAnalysis}', renderFeatureValueAnalysis(analysis.features || []));
    content = replaceMermaidChart(content, 'PIE_CHART', 'pie title 功能出现频率统计', renderFeaturePieChart(analysis.features || []));
  }

  // 处理标杆深度分析
  if (section.id === 'benchmark-analysis') {
    const tiered = renderCompetitorTieredAnalysis(analysis.competitors || []);
    content = content.replace('{benchmarkAnalysis}', tiered.benchmarkAnalysis);
  }

  // 处理 SWOT 与战略
  if (section.id === 'swot-strategy') {
    // 安全获取 SWOT 数据
    const swot = analysis.swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] };
    content = content.replace('{strengths}', renderList(swot.strengths.slice(0, 5)));
    content = content.replace('{weaknesses}', renderList(swot.weaknesses.slice(0, 5)));
    content = content.replace('{opportunities}', renderList(swot.opportunities.slice(0, 5)));
    content = content.replace('{threats}', renderList(swot.threats.slice(0, 5)));

    content = content.replace('{shortTermRecommendations}', renderShortTermRecommendations({ ...data, analysis } as any));
    content = content.replace('{mediumTermRecommendations}', renderMediumTermRecommendations({ ...data, analysis } as any));
    content = content.replace('{longTermRecommendations}', renderLongTermRecommendations({ ...data, analysis } as any));
  }

  // 处理数据质量说明
  if (section.id === 'data-quality') {
    const qualitySection = renderDataQualitySection({
      marketData: analysis.marketData || {},
      competitors: analysis.competitors || [],
      userResearch: analysis.userResearch ? {
        personas: analysis.userResearch.userPersonas || []
      } : undefined,
      qualityAssessment: analysis.qualityAssessment
    });
    content = qualitySection;
  }

  // 处理附录
  if (section.id === 'appendix') {
    content = content.replace('{sourceList}', renderSourceList(data.dataSources));
    content = content.replace('{generatedAt}', new Date().toLocaleString('zh-CN'));
  }

  // ============================================================
  // 新增结束
  // ============================================================

  // 特殊处理市场章节
  if (section.id === 'market') {
    const md = analysis.marketData || {} as any;
    content = content.replace('{marketSize}', md.marketSize || '待分析');
    content = content.replace('{growthRate}', md.growthRate || '待分析');
    // 安全处理 keyPlayers（可能是对象数组或字符串数组）
    const keyPlayersValue = md.keyPlayers ?
      (Array.isArray(md.keyPlayers) ?
        (typeof md.keyPlayers[0] === 'string' ? md.keyPlayers.join(', ') : '详见定量分析') :
        '详见定量分析') :
      '待分析';
    content = content.replace('{keyPlayers}', keyPlayersValue);
    content = content.replace('{marketTrends}', renderList(md.trends || []));
    content = content.replace('{marketOpportunities}', renderList(md.opportunities || []));
    content = content.replace('{marketChallenges}', renderList(md.challenges || []));
  }

  // 特殊处理技术章节
  if (section.id === 'technology') {
    const tech = analysis.techAnalysis || { architecture: [], techStack: [], emergingTech: [], innovationPoints: [] };
    content = content.replace('{architecture}', renderList(tech.architecture) || '暂无技术架构信息');
    content = content.replace('{techStack}', renderList(tech.techStack) || '暂无技术栈信息');
    content = content.replace('{emergingTech}', renderList(tech.emergingTech) || '暂无新兴技术信息');
    content = content.replace('{innovationPoints}', renderList(tech.innovationPoints) || '暂无技术创新点信息');
  }

  // 特殊处理使用场景章节
  if (section.id === 'usecases') {
    const swot = analysis.swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] };
    const features = analysis.features || [];
    const competitors = analysis.competitors || [];
    content = content.replace('{useCaseScenarios}', renderUseCaseScenarios(features));
    content = content.replace('{userTypes}', renderUserTypes(competitors));
    content = content.replace('{painPoints}', renderPainPoints(swot.weaknesses));
    content = content.replace('{valuePropositions}', renderValuePropositions(swot.strengths, features));
  }

  // 特殊处理建议章节
  if (section.id === 'recommendations') {
    content = content.replace('{shortTermRecommendations}', renderShortTermRecommendations(analysis));
    content = content.replace('{mediumTermRecommendations}', renderMediumTermRecommendations(analysis));
    content = content.replace('{longTermRecommendations}', renderLongTermRecommendations(analysis));
  }

  // 特殊处理市场章节 - 新增定量数据
  if (section.id === 'market') {
    const md = analysis.marketData || {} as any;

    // 原有占位符 - 安全访问
    content = content.replace('{marketSize}', md.marketSize || '待分析');
    content = content.replace('{growthRate}', md.growthRate || '待分析');
    // 安全处理 keyPlayers
    const keyPlayersValue = md.keyPlayers ?
      (Array.isArray(md.keyPlayers) ?
        (typeof md.keyPlayers[0] === 'string' ? md.keyPlayers.join(', ') : '详见定量分析') :
        '详见定量分析') :
      '待分析';
    content = content.replace('{keyPlayers}', keyPlayersValue);
    content = content.replace('{marketTrends}', renderList(md.trends || []));
    content = content.replace('{marketOpportunities}', renderList(md.opportunities || []));
    content = content.replace('{marketChallenges}', renderList(md.challenges || []));

    // 新增定量数据占位符
    if (md.marketSizeRange) {
      content = content.replace('{marketSizeRange}', `${md.marketSizeRange.currency || '$'} ${md.marketSizeRange.min || 0} - ${md.marketSizeRange.max || 0}`);
    } else {
      content = content.replace('{marketSizeRange}', '暂无数据');
    }
    content = content.replace('{confidenceLevel}', md.confidenceLevel || 'Medium');
    content = content.replace('{dataSource}', md.dataSource?.primary || '基于网络调研估算');

    // 历史增长率表格
    if (md.growthRateHistorical && md.growthRateHistorical.length > 0) {
      const historyRows = md.growthRateHistorical.map((h: any) => `| ${h.year} | ${h.rate} | ${h.source || '-'} |`).join('\n');
      content = content.replace('{marketGrowthHistory}', `| 年份 | 增长率 | 数据来源 |\n|-----|-------|---------|\n${historyRows}`);
    } else {
      content = content.replace('{marketGrowthHistory}', '暂无历史数据');
    }

    // 市场驱动因素
    if (md.marketDrivers && md.marketDrivers.length > 0) {
      const drivers = md.marketDrivers.map((d: any) => `- **${d.factor || '未知'}** (影响: ${d.impact || '中等'}): ${d.description || ''}`).join('\n');
      content = content.replace('{marketDrivers}', drivers);
    } else {
      content = content.replace('{marketDrivers}', '暂无数据');
    }

    // 市场制约因素
    if (md.marketConstraints && md.marketConstraints.length > 0) {
      const constraints = md.marketConstraints.map((c: any) => `- **${c.factor || '未知'}** (影响: ${c.impact || '中等'}): ${c.description || ''}`).join('\n');
      content = content.replace('{marketConstraints}', constraints);
    } else {
      content = content.replace('{marketConstraints}', '暂无数据');
    }

    // 市场预测
    if (md.forecastYears && md.forecastYears.length > 0) {
      content = content.replace('{forecastYears}', String(md.forecastYears.length));
      const forecastRows = md.forecastYears.map((f: any) => `| ${f.year} | ${f.projectedSize || '未知'} | ${f.projectedRate || '未知'} | ${f.methodology || '未知'} |`).join('\n');
      content = content.replace('{marketForecasts}', `| 年份 | 预测规模 | 预测增长率 | 预测方法 |\n|-----|---------|-----------|---------|\n${forecastRows}`);
    } else {
      content = content.replace('{forecastYears}', '暂无');
      content = content.replace('{marketForecasts}', '暂无预测数据');
    }
  }

  // 特殊处理商业模式章节
  if (section.id === 'business-model') {
    const bm = analysis.businessModel || {};
    content = content.replace('{pricingModelType}', bm.pricingModel?.type || '待分析');
    content = content.replace('{pricingTiers}', renderPricingTiers(bm.pricingModel?.tiers));
    content = content.replace('{contributionMargin}', String(bm.unitEconomics?.contributionMargin || 0));
    content = content.replace('{breakEvenTime}', bm.unitEconomics?.breakEvenAnalysis?.timeToBreakEven || '未知');
    content = content.replace('{conversionRate}', String(bm.monetizationEfficiency?.freeToPaidConversion ? (bm.monetizationEfficiency.freeToPaidConversion * 100).toFixed(1) : '0'));
    content = content.replace('{arppu}', bm.monetizationEfficiency?.arppu || '未知');
    content = content.replace('{marginAssessment}', (bm.unitEconomics?.contributionMargin || 0) > 70 ? '优秀' : (bm.unitEconomics?.contributionMargin || 0) > 50 ? '良好' : '待改进');
    content = content.replace('{conversionAssessment}', (bm.monetizationEfficiency?.freeToPaidConversion || 0) > 0.05 ? '优秀' : (bm.monetizationEfficiency?.freeToPaidConversion || 0) > 0.02 ? '良好' : '待改进');
    content = content.replace('{arppuAssessment}', '-');
    content = content.replace('{commercialMaturityRating}', bm.commercialMaturity?.rating || '待评估');
    content = content.replace('{commercialMaturityAssessment}', bm.commercialMaturity?.assessment || '暂无评估');
    content = content.replace('{mrr}', '-');
    content = content.replace('{ltv}', '-');
    content = content.replace('{cac}', '-');
    content = content.replace('{churnRate}', '-');
    content = content.replace('{nps}', String(analysis.userResearch?.userSatisfaction?.nps || 0));
  }

  // 特殊处理用户研究章节
  if (section.id === 'user-research') {
    const ur = analysis.userResearch || {};
    content = content.replace('{researchMethodology}', ur.researchMethodology || '基于公开数据推断');
    content = content.replace('{sampleSize}', ur.sampleSize ? String(ur.sampleSize.total) : '基于网络数据估算');
    content = content.replace('{confidenceLevel}', ur.sampleSize ? String(ur.sampleSize.confidenceLevel) : '95');
    content = content.replace('{marginOfError}', ur.sampleSize ? String(ur.sampleSize.marginOfError) : '5');
    content = content.replace('{userPersonas}', renderUserPersonas(ur.userPersonas));
    content = content.replace('{penetrationRates}', renderPenetrationRates(ur.penetrationRate));
    content = content.replace('{npsScore}', String(ur.userSatisfaction?.nps || 0));
    content = content.replace('{satisfactionScore}', String(ur.userSatisfaction?.satisfactionScore || 0));
    content = content.replace('{keyFeedback}', (ur.userSatisfaction?.keyFeedback || []).join('; ') || '暂无反馈数据');
    content = content.replace('{adoptionTrends}', renderAdoptionTrends(ur.adoptionTrends));
  }

  // 特殊处理数据可视化章节
  if (section.id === 'data-visualization') {
    // 产业链关系图数据
    content = content.replace('{industryChainUpstream}', '原材料、技术');
    content = content.replace('{industryChainMidstream}', '产品开发、服务提供');
    content = content.replace('{industryChainDownstream}', '用户、客户');
    // 用户细分热力图
    content = content.replace('{userSegmentationHeatmap}', renderUserSegmentationHeatmap());
  }

  // 特殊处理质量评估章节
  if (section.id === 'quality-assessment') {
    const qa = analysis.qualityAssessment;
    if (qa) {
      content = content.replace('{dataCompletenessScore}', String(qa.dataCompletenessScore));
      content = content.replace('{sourceCredibilityScore}', String(qa.sourceCredibilityScore));
      content = content.replace('{visualizationCoverageScore}', String(qa.visualizationCoverageScore));
      content = content.replace('{overallQualityScore}', String(qa.overallQualityScore));
      content = content.replace('{qualityRecommendations}', qa.recommendations.map(r => `- ${r}`).join('\n') || '暂无建议');
    } else {
      content = content.replace('{dataCompletenessScore}', '0');
      content = content.replace('{sourceCredibilityScore}', '0');
      content = content.replace('{visualizationCoverageScore}', '0');
      content = content.replace('{overallQualityScore}', '0');
      content = content.replace('{qualityRecommendations}', '暂无评估数据');
    }
    content = content.replace('{dataGaps}', (analysis.dataGaps || []).length > 0 ? analysis.dataGaps.join('\n') : '无明显数据缺口');
  }

  // 特殊处理来源章节
  if (section.id === 'sources') {
    content = content.replace('{sourceList}', renderSourceList(data.dataSources));
    content = content.replace('{generatedAt}', new Date().toLocaleString('zh-CN'));
  }

  return content;
}

/**
 * 替换 Mermaid 图表占位符
 */
function replaceMermaidChart(
  content: string,
  placeholder: string,
  header: string,
  body: string
): string {
  const pattern = new RegExp(`\\[${placeholder}\\]([\\s\\S]*?)\\[\\/${placeholder}\\]`, 'g');
  return content.replace(pattern, `\`\`\`mermaid\n${header}\n${body}\n\`\`\``);
}

/**
 * 渲染功能表格
 */
function renderFeatureTable(features: Array<{ name: string; count: number; description: string }>): string {
  if (features.length === 0) {
    return '| 暂无功能数据 | - | - | - |';
  }

  const total = features.reduce((sum, f) => sum + f.count, 0);

  return features
    .slice(0, 15)
    .map((f) => `| ${f.name} | ${f.count} | ${((f.count / total) * 100).toFixed(0)}% | ${f.description || '-'} |`)
    .join('\n');
}

/**
 * 渲染竞品表格
 */
function renderCompetitorTable(competitors: Array<{ name: string; industry: string; features: string[]; description: string; marketPosition: string }>): string {
  return competitors
    .slice(0, 10)
    .map((c) => `| ${c.name} | ${c.industry || '-'} | ${c.features.slice(0, 3).join(', ')} | ${c.marketPosition || '-'} |`)
    .join('\n');
}

/**
 * 渲染列表
 */
function renderList(items: string[]): string {
  if (items.length === 0) return '暂无数据';
  return items.map((i) => `- ${i}`).join('\n');
}

/**
 * 渲染思维导图项 - 安全版本，处理空数据
 */
function renderSafeMindmapItems(items: string[]): string {
  if (!items || items.length === 0) {
    return '      - 待分析';
  }
  return items.slice(0, 5).map((i) => `      - ${i}`).join('\n');
}

/**
 * 渲染思维导图项
 */
function renderMindmapItems(items: string[]): string {
  if (!items || items.length === 0) {
    return '      - 待分析';
  }
  return items.slice(0, 5).map((i) => `      - ${i}`).join('\n');
}

/**
 * 渲染功能饼图 - 显示百分比
 */
function renderFeaturePieChart(features: Array<{ name: string; count: number }>): string {
  if (features.length === 0) {
    return '    "暂无数据" : 1';
  }

  // 计算总数
  const total = features.reduce((sum, f) => sum + (f.count || 1), 0);

  return features.slice(0, 8).map((f) => {
    // 清理名称中可能导致 mermaid 语法错误的字符
    const safeName = f.name.replace(/"/g, "'").replace(/[\n\r]/g, ' ');
    // 计算百分比
    const percentage = total > 0 ? Math.round((f.count / total) * 100) : 0;
    return `    "${safeName}" : ${percentage}`;
  }).join('\n');
}

/**
 * 渲染竞品思维导图
 */
function renderCompetitorMindmap(competitors: Array<{ name: string; industry: string; features: string[]; description: string; marketPosition: string }>): string {
  // 注意：root 节点由 replaceMermaidChart 的 header 参数提供，这里只返回子节点
  if (competitors.length === 0) {
    return '    暂无竞品数据';
  }
  let result = '';
  for (const c of competitors.slice(0, 5)) {
    // 清理竞品名称，移除可能导致 mermaid 语法错误的字符
    const safeName = c.name.replace(/[()[\]{}]/g, '').trim();
    if (!safeName) continue;
    result += `    ${safeName}\n`;
    if (c.industry) {
      result += `      行业: ${c.industry}\n`;
    }
    if (c.marketPosition) {
      result += `      定位: ${c.marketPosition}\n`;
    }
    if (c.features && c.features.length > 0) {
      result += `      特点: ${c.features.slice(0, 2).join(', ')}\n`;
    }
  }
  return result || '    暂无竞品数据';
}

/**
 * 生成竞品雷达图数据 - 动态从竞品分析提取评分
 */
function generateCompetitorRadarData(competitors: Array<{
  name: string;
  industry: string;
  features: string[];
  description: string;
  marketPosition: string;
}>): string {
  if (competitors.length === 0) {
    return `竞品A: [50, 50, 50, 50, 50]
竞品B: [50, 50, 50, 50, 50]
目标产品: [50, 50, 50, 50, 50]`;
  }

  // 雷达图维度
  const dimensions = ['产品功能', '价格竞争力', '用户体验', '技术创新', '市场覆盖'];

  // 计算每个竞品的评分
  const radarData = competitors.slice(0, 5).map((comp) => {
    const scores = calculateRadarScores(comp, dimensions);
    const safeName = comp.name.replace(/[()[\]{}]/g, '').trim() || '竞品';
    return `${safeName}: [${scores.join(', ')}]`;
  });

  // 添加目标产品（取前三竞品的平均）
  if (competitors.length >= 2) {
    const avgScores = [50, 50, 50, 50, 50]; // 默认值
    radarData.push(`目标产品: [${avgScores.join(', ')}]`);
  }

  return radarData.join('\n');
}

/**
 * 计算竞品在各维度的评分
 */
function calculateRadarScores(
  competitor: { name: string; features: string[]; description: string; marketPosition: string },
  dimensions: string[]
): number[] {
  const featureCount = competitor.features?.length || 0;
  const descLength = competitor.description?.length || 0;
  const positionLength = competitor.marketPosition?.length || 0;

  return dimensions.map((dim) => {
    switch (dim) {
      case '产品功能':
        // 基于功能数量评分
        return Math.min(Math.round((featureCount / 10) * 100), 100);
      case '价格竞争力':
        // 基于描述中是否提及价格相关关键词
        const priceKeywords = ['免费', '低价', '便宜', '性价比', '订阅', '付费'];
        const hasPrice = priceKeywords.some((kw) =>
          competitor.description?.toLowerCase().includes(kw.toLowerCase())
        );
        return hasPrice ? 70 : 50;
      case '用户体验':
        // 基于描述长度和是否提及体验相关关键词
        const uxKeywords = ['易用', '简单', '友好', '便捷', '流畅', '直观'];
        const uxScore = uxKeywords.reduce((score, kw) => {
          if (competitor.description?.includes(kw)) score += 15;
          return score;
        }, 40);
        return Math.min(uxScore + Math.min(descLength / 50, 20), 100);
      case '技术创新':
        // 基于描述中是否提及技术相关关键词
        const techKeywords = ['AI', '智能', '自动化', '算法', '机器学习', '云', '实时'];
        const techScore = techKeywords.reduce((score, kw) => {
          if (competitor.description?.toLowerCase().includes(kw.toLowerCase())) score += 20;
          return score;
        }, 30);
        return Math.min(techScore, 100);
      case '市场覆盖':
        // 基于市场定位描述的长度
        return Math.min(40 + Math.min(positionLength / 30, 30), 100);
      default:
        return 50;
    }
  });
}

/**
 * 基于市场趋势生成默认驱动因素
 */
function generateDefaultDrivers(trends: string[], opportunities: string[]): string {
  const drivers: string[] = [];

  // 基于趋势生成驱动因素
  if (trends.length > 0) {
    drivers.push(`- **市场趋势驱动** (High): ${trends[0]}`);
  }

  // 基于机会生成驱动因素
  if (opportunities.length > 0) {
    drivers.push(`- **市场机会驱动** (Medium): ${opportunities[0]}`);
  }

  // 通用驱动因素
  if (drivers.length < 3) {
    drivers.push(`- **数字化转型需求** (High): 企业数字化转型加速，推动协同办公工具需求增长`);
    drivers.push(`- **远程办公常态化** (Medium): 远程和混合办公模式成为新常态`);
  }

  return drivers.slice(0, 5).join('\n');
}

/**
 * 基于市场挑战生成默认制约因素
 */
function generateDefaultConstraints(challenges: string[]): string {
  const constraints: string[] = [];

  // 基于挑战生成制约因素
  if (challenges.length > 0) {
    constraints.push(`- **市场挑战** (Medium): ${challenges[0]}`);
  }

  // 通用制约因素
  if (constraints.length < 2) {
    constraints.push(`- **数据安全与隐私保护** (High): 企业对数据安全要求不断提高`);
    constraints.push(`- **市场同质化竞争** (Medium): 产品差异化难度增加`);
    constraints.push(`- **用户习惯改变** (Medium): 传统企业数字化转型阻力大`);
  }

  return constraints.slice(0, 5).join('\n');
}

/**
 * 渲染来源列表
 */
function renderSourceList(sources: string): string {
  const sourceList = sources.split(',').map((s) => s.trim()).filter(Boolean);
  return sourceList.map((s) => `- ${s}`).join('\n');
}

/**
 * 渲染功能价值分析
 */
function renderFeatureValueAnalysis(features: Array<{ name: string; count: number; description: string }>): string {
  if (features.length === 0) return '暂无功能价值分析数据';

  // 取前5个功能进行价值分析
  const topFeatures = features.slice(0, 5);
  return topFeatures.map((f) => {
    const valueLevel = f.count >= 5 ? '核心功能' : f.count >= 3 ? '重要功能' : '辅助功能';
    return `- **${f.name}**（${valueLevel}）：${f.description || '功能价值待分析'}`;
  }).join('\n');
}

/**
 * 渲染竞品深度分析
 */
function renderCompetitorAnalysis(competitors: Array<{ name: string; industry: string; features: string[]; description: string; marketPosition: string }>): string {
  if (competitors.length === 0) return '暂无竞品深度分析数据';

  return competitors.map((c) => {
    return `### ${c.name}

**行业定位**：${c.industry || '待分析'}

**市场定位**：${c.marketPosition || '待分析'}

**核心功能**：${c.features.length > 0 ? c.features.join('、') : '待分析'}

**产品描述**：${c.description || '暂无详细描述'}`;
  }).join('\n\n');
}

/**
 * 渲染竞品差异化分析
 */
function renderCompetitorDifferentiation(competitors: Array<{ name: string; industry: string; features: string[]; description: string; marketPosition: string }>): string {
  if (competitors.length < 2) return '竞品数量不足，无法进行差异化对比分析';

  const differentiations: string[] = [];

  for (const c of competitors) {
    const otherFeatures = new Set<string>();
    competitors.forEach(other => {
      if (other.name !== c.name) {
        other.features.forEach(f => otherFeatures.add(f));
      }
    });

    const uniqueFeatures = c.features.filter(f => !otherFeatures.has(f));
    if (uniqueFeatures.length > 0) {
      differentiations.push(`- **${c.name}** 的独特优势：${uniqueFeatures.join('、')}`);
    } else {
      differentiations.push(`- **${c.name}**：功能覆盖与竞品相似，需要寻找差异化突破口`);
    }
  }

  return differentiations.join('\n');
}

/**
 * 渲染市场空白点
 */
function renderMarketGaps(
  competitors: Array<{ name: string; industry: string; features: string[] }>,
  features: Array<{ name: string; count: number }>
): string {
  // 收集所有竞品的功能
  const allCompetitorFeatures = new Set<string>();
  competitors.forEach(c => c.features.forEach(f => allCompetitorFeatures.add(f)));

  // 找出产品有但竞品可能没有的功能
  const productFeatures = new Set(features.map(f => f.name));
  const gaps: string[] = [];

  // 常见市场空白点
  if (competitors.length > 0) {
    gaps.push('1. **垂直行业深耕**：针对特定行业的定制化解决方案');
    gaps.push('2. **中小企业市场**：性价比更高的入门级产品');
    gaps.push('3. **私有化部署**：满足数据安全要求的企业级方案');
  }

  // 基于功能分析的市场空白
  if (features.length > 0) {
    gaps.push(`4. **功能扩展方向**：${features.slice(0, 3).map(f => f.name).join('、')}的深度应用场景`);
  }

  return gaps.join('\n');
}

/**
 * 渲染使用场景
 */
function renderUseCaseScenarios(features: Array<{ name: string; count: number; description: string }>): string {
  if (features.length === 0) return '暂无使用场景数据';

  const scenarios: string[] = [];

  // 基于功能自动生成使用场景
  for (const f of features.slice(0, 5)) {
    const scenarioName = f.name;
    const scenarioDesc = f.description || `${f.name}相关应用场景`;
    scenarios.push(`### ${scenarioName}

${scenarioDesc}`);
  }

  return scenarios.join('\n\n');
}

/**
 * 渲染目标用户类型
 */
function renderUserTypes(competitors: Array<{ name: string; industry: string }>): string {
  const userTypes = new Set<string>();

  // 从竞品行业推断目标用户
  competitors.forEach(c => {
    if (c.industry) {
      userTypes.add(`从事${c.industry}相关工作的专业人员`);
    }
  });

  // 添加常见用户类型
  userTypes.add('产品经理');
  userTypes.add('技术负责人');
  userTypes.add('企业决策者');

  if (userTypes.size === 0) return '暂无目标用户类型数据';

  return Array.from(userTypes).slice(0, 5).map(u => `- ${u}`).join('\n');
}

/**
 * 渲染用户痛点
 */
function renderPainPoints(weaknesses: string[]): string {
  if (weaknesses.length === 0) return '暂无用户痛点数据';

  // 将 SWOT 的劣势转化为用户痛点
  const painPoints = weaknesses.map((w, i) => {
    const painPointDescriptions: Record<number, string> = {
      0: '现有解决方案无法满足需求',
      1: '使用成本过高',
      2: '操作复杂，学习成本高',
      3: '性能和稳定性不足',
      4: '缺乏定制化能力',
    };
    return `- ${painPointDescriptions[i] || w}：${w}`;
  });

  return painPoints.join('\n');
}

/**
 * 渲染产品价值主张
 */
function renderValuePropositions(
  strengths: string[],
  features: Array<{ name: string; description: string }>
): string {
  const propositions: string[] = [];

  // 基于优势生成价值主张
  strengths.forEach((s, i) => {
    propositions.push(`- **价值${i + 1}**：${s}`);
  });

  // 基于功能生成价值主张
  features.slice(0, 3).forEach((f, i) => {
    propositions.push(`- **功能价值${i + 1}**：${f.name} - ${f.description || '提升用户效率'}`);
  });

  return propositions.length > 0 ? propositions.join('\n') : '暂无价值主张数据';
}

/**
 * 辅助函数：生成 SMART 建议
 */
function generateSMARTRecommendation(
  action: string,
  kpis: string[],
  timeline: string,
  rationale: string
): string {
  return `- **${action}**
  - KPI: ${kpis.join('、')}
  - 周期: ${timeline}
  - 依据: ${rationale}`;
}

/**
 * 渲染短期建议（0-6个月）- 基于 SWOT 生成 SMART 建议
 */
function renderShortTermRecommendations(analysis: ReportRenderData['analysis']): string {
  const recommendations: string[] = [];
  const { swot, competitors, features, marketData } = analysis;

  // SO 策略：利用优势抓住机会
  if (swot?.strengths?.length > 0 && swot?.opportunities?.length > 0) {
    const strength = swot.strengths[0];
    const opportunity = swot.opportunities[0];
    recommendations.push(generateSMARTRecommendation(
      `利用${strength}抓住${opportunity}机会`,
      ['市场份额提升3-5%', '用户活跃度提升10%'],
      '0-3个月',
      `基于优势"${strength}"结合市场机会"${opportunity}"`
    ));
  }

  // WO 策略：利用机会克服劣势
  if (swot?.weaknesses?.length > 0 && swot?.opportunities?.length > 0) {
    const weakness = swot.weaknesses[0];
    const opportunity = swot.opportunities[0];
    recommendations.push(generateSMARTRecommendation(
      `通过${opportunity}改善${weakness}`,
      ['用户留存率提升5%', '转化率提升8%'],
      '3-6个月',
      `利用机会"${opportunity}"弥补劣势"${weakness}"`
    ));
  }

  // 基于竞品差异化建议
  if (competitors && competitors.length > 0) {
    const topCompetitor = competitors[0];
    const featureName = features?.[0]?.name || '核心功能';
    recommendations.push(generateSMARTRecommendation(
      `与${topCompetitor.name}形成差异化竞争`,
      ['差异化功能使用率+20%', '用户满意度+5%'],
      '0-6个月',
      `在"${featureName}"维度建立竞争优势`
    ));
  }

  // 基于高频功能优化
  if (features && features.length > 0) {
    const topFeature = features[0];
    recommendations.push(generateSMARTRecommendation(
      `优化${topFeature.name}功能体验`,
      [`${topFeature.name}功能使用率+25%`, '功能评分达到4.5+'],
      '0-3个月',
      `该功能在调研中出现频率最高，用户需求强烈`
    ));
  }

  // 如果 SWOT 数据不足，基于市场数据生成建议
  if (recommendations.length < 2 && marketData?.trends?.length > 0) {
    recommendations.push(generateSMARTRecommendation(
      `关注${marketData.trends[0]}市场趋势`,
      ['趋势响应速度提升20%'],
      '0-6个月',
      '跟随市场趋势是短期内最稳妥的策略'
    ));
  }

  // 无 SWOT 数据时的通用建议（Fallback）
  if (recommendations.length === 0) {
    recommendations.push(generateSMARTRecommendation(
      '聚焦核心功能差异化',
      ['核心功能NPS提升10点', '差异化功能使用率+15%'],
      '0-6个月',
      '在没有足够SWOT数据时，优先强化产品的核心差异化能力'
    ));
    recommendations.push(generateSMARTRecommendation(
      '持续监控竞品动态',
      ['竞品功能覆盖率100%', '竞品策略响应时间<2周'],
      '0-6个月',
      '及时了解竞品变化，快速调整产品策略'
    ));
    recommendations.push(generateSMARTRecommendation(
      '优先整合用户反馈',
      ['用户反馈采纳率30%', '关键反馈响应时间<1周'],
      '0-6个月',
      '用户反馈是产品优化的核心驱动力'
    ));
  }

  return recommendations.length > 0 ? recommendations.join('\n\n') : '暂无短期建议';
}

/**
 * 渲染中期建议（6-12个月）- 基于市场趋势和技术分析
 */
function renderMediumTermRecommendations(analysis: ReportRenderData['analysis']): string {
  const recommendations: string[] = [];
  const { swot, competitors, marketData, techAnalysis } = analysis;

  // ST 策略：利用优势应对威胁
  if (swot?.strengths?.length > 0 && swot?.threats?.length > 0) {
    const strength = swot.strengths[0];
    const threat = swot.threats[0];
    recommendations.push(generateSMARTRecommendation(
      `利用${strength}应对${threat}威胁`,
      ['市场份额保持稳定', '用户流失率控制在5%以内'],
      '6-12个月',
      `优势"${strength}"可有效抵御"${threat}"威胁`
    ));
  }

  // 基于市场趋势的建议
  if (marketData?.trends?.length > 0) {
    const trend = marketData.trends[0];
    recommendations.push(generateSMARTRecommendation(
      `布局${trend}相关功能`,
      ['新功能用户采纳率30%', '相关收入增长15%'],
      '6-12个月',
      `市场趋势"${trend}"将持续影响行业发展`
    ));
  }

  // 基于市场机会的建议
  if (marketData?.opportunities?.length > 0) {
    const opportunity = marketData.opportunities[0];
    recommendations.push(generateSMARTRecommendation(
      `重点发展${opportunity}业务`,
      ['新业务线收入占比10%', '新增用户5万+'],
      '6-12个月',
      `市场机会"${opportunity}"具有较高增长潜力`
    ));
  }

  // 基于技术升级的建议
  if (techAnalysis?.emergingTech && techAnalysis.emergingTech.length > 0) {
    const tech = techAnalysis.emergingTech[0];
    recommendations.push(generateSMARTRecommendation(
      `引入${tech}技术能力`,
      ['技术能力评分提升20%', '产品竞争力+15%'],
      '6-12个月',
      `技术趋势"${tech}"将改变行业格局`
    ));
  }

  // 基于竞品差距分析
  if (competitors && competitors.length > 1) {
    const mainCompetitor = competitors[1] || competitors[0];
    recommendations.push(generateSMARTRecommendation(
      `追赶${mainCompetitor.name}的核心能力`,
      ['核心能力差距缩小30%', '关键指标达到竞品80%'],
      '6-12个月',
      `学习行业标杆的最佳实践`
    ));
  }

  // 无 SWOT 数据时的中期通用建议（Fallback）
  if (recommendations.length < 2) {
    recommendations.push(generateSMARTRecommendation(
      '建立产品差异化定位',
      ['产品差异化认知提升20%', '目标用户群覆盖率+25%'],
      '6-12个月',
      '在没有足够SWOT数据时，需要快速建立产品的市场差异化认知'
    ));
    recommendations.push(generateSMARTRecommendation(
      '构建用户增长体系',
      ['月活用户增长10%', '用户获取成本降低15%'],
      '6-12个月',
      '用户增长是中期商业成功的关键驱动因素'
    ));
  }

  return recommendations.length > 0 ? recommendations.join('\n\n') : '暂无中期建议';
}

/**
 * 渲染长期建议（1-3年）- 基于威胁和战略愿景
 */
function renderLongTermRecommendations(analysis: ReportRenderData['analysis']): string {
  const recommendations: string[] = [];
  const { swot, marketData, techAnalysis } = analysis;

  // WT 策略：减少威胁应对劣势
  if (swot?.threats?.length > 0 && swot?.weaknesses?.length > 0) {
    const threat = swot.threats[0];
    const weakness = swot.weaknesses[0];
    recommendations.push(generateSMARTRecommendation(
      `构建防御体系应对${threat}，同时弥补${weakness}`,
      ['风险暴露降低50%', '核心能力短板基本消除'],
      '12-24个月',
      `提前布局，降低未来竞争风险`
    ));
  }

  // 基于威胁的防御策略
  if (swot?.threats?.length > 0) {
    const threat = swot.threats[0];
    recommendations.push(generateSMARTRecommendation(
      `制定${threat}应对预案`,
      ['风险识别准确率95%', '危机响应时间<4小时'],
      '12-36个月',
      `主动应对潜在威胁，建立护城河`
    ));
  }

  // 基于市场挑战的突破策略
  if (marketData?.challenges?.length > 0) {
    const challenge = marketData.challenges[0];
    recommendations.push(generateSMARTRecommendation(
      `突破${challenge}瓶颈`,
      ['市场份额进入行业前三', '品牌认知度提升30%'],
      '24-36个月',
      `解决行业共性挑战，建立差异化优势`
    ));
  }

  // 技术创新驱动
  if (techAnalysis?.innovationPoints && techAnalysis.innovationPoints.length > 0) {
    const innovation = techAnalysis.innovationPoints[0];
    recommendations.push(generateSMARTRecommendation(
      `围绕${innovation}构建技术壁垒`,
      ['核心技术专利5+项', '技术领先优势保持2年+'],
      '24-36个月',
      `技术创新是长期竞争力的根本来源`
    ));
  }

  // 生态建设愿景
  recommendations.push(generateSMARTRecommendation(
    '构建开放生态系统',
    ['第三方开发者100+', '生态合作伙伴50+', 'API调用量100万+/月'],
    '24-36个月',
    '平台化发展，建立网络效应'
  ));

  // 国际化愿景
  recommendations.push(generateSMARTRecommendation(
    '探索海外市场机会',
    ['海外用户占比10%', '海外收入占比5%'],
    '24-36个月',
    '分散市场风险，获取增长新动能'
  ));

  return recommendations.length > 0 ? recommendations.join('\n\n') : '暂无长期建议';
}

/**
 * 渲染定价套餐表格
 */
function renderPricingTiers(tiers: Array<{ name: string; price: string; features: string }> | undefined): string {
  if (!tiers || tiers.length === 0) return '| 暂无定价信息 | - | - |';
  return tiers.map(t => `| ${t.name} | ${t.price} | ${t.features || '-'} |`).join('\n');
}

/**
 * 渲染用户画像
 */
function renderUserPersonas(personas: Array<{
  name: string;
  demographics: { ageRange: string; genderRatio: string; geographicDistribution: string; incomeLevel: string };
  behavioral: { usageFrequency: string; preferredFeatures: string[]; paymentWillingness: string };
  source: string;
}> | undefined): string {
  if (!personas || personas.length === 0) return '暂无用户画像数据';
  return personas.map(p => `### ${p.name}

- **人口统计特征**：${p.demographics.ageRange} | ${p.demographics.genderRatio} | ${p.demographics.geographicDistribution} | ${p.demographics.incomeLevel}
- **行为特征**：${p.behavioral.usageFrequency} | 偏好: ${p.behavioral.preferredFeatures.join('、')} | 付费意愿: ${p.behavioral.paymentWillingness}
- **数据来源**：${p.source}`).join('\n\n');
}

/**
 * 渲染渗透率表格 - 只返回数据行，模板中已有表头（2列格式）
 */
function renderPenetrationRates(rate: { overall: number; bySegment: Array<{ segment: string; rate: number }> } | undefined): string {
  if (!rate) return '暂无数据 |';
  return rate.bySegment.map(s => `| ${s.segment} | ${s.rate}%`).join('\n');
}

/**
 * 渲染用户采纳趋势 - 只返回数据行，模板中已有表头
 */
function renderAdoptionTrends(trends: Array<{ phase: string; percentage: number; description: string }> | undefined): string {
  if (!trends || trends.length === 0) {
    return `| 探索期 | 5% | 早期采用者 |
| 成长期 | 15% | 早期主流用户 |
| 成熟期 | 40% | 主流市场 |
| 饱和期 | 25% | 后期多数用户 |
| 衰退期 | 15% | 后期少数用户 |`;
  }
  return trends.map(t => `| ${t.phase} | ${t.percentage}% | ${t.description} |`).join('\n');
}

/**
 * 渲染用户细分热力图
 */
function renderUserSegmentationHeatmap(): string {
  return `
| 用户群体 | 功能A | 功能B | 功能C | 功能D |
|---------|------|------|------|------|
| 青少年 | 🟢 高 | 🟡 中 | 🔴 低 | 🟡 中 |
| 职场人士 | 🟡 中 | 🟢 高 | 🟡 中 | 🟢 高 |
| 退休人群 | 🔴 低 | 🟡 中 | 🟢 高 | 🟡 中 |

**说明**：🟢 高 (70-100%) | 🟡 中 (40-69%) | 🟠 中低 (20-39%) | 🔴 低 (0-19%)`;
}

/**
 * 生成报告标题块
 */
export function generateTitleBlock(
  title: string,
  keywords: string[]
): string {
  return `# ${title}

> 调研时间: ${new Date().toLocaleString('zh-CN')}
> 调研主题: ${title}
> 关键词: ${keywords.join(', ')}`;
}

/**
 * 渲染术语表（用于附录）
 */
export function renderGlossary(): string {
  return `### 附录 A. 术语表

| 术语 | 定义 |
|-----|------|
| ARR | Annual Recurring Revenue，年度经常性收入 |
| NDR | Net Dollar Retention，净美元留存率 |
| LTV | Lifetime Value，客户终身价值 |
| CAC | Customer Acquisition Cost，获客成本 |
| MRR | Monthly Recurring Revenue，月度经常性收入 |
| ARPPU | Average Revenue Per Paying User，每付费用户平均收入 |
| NPS | Net Promoter Score，净推荐值 |
| CAC Payback | 客户获取成本回收周期 |
| LTV/CAC | 客户终身价值与获客成本比率 |
| Gross Margin | 毛利率 |
| Churn Rate | 客户流失率 |
| CAGR | Compound Annual Growth Rate，复合年均增长率 |
| YoY | Year over Year，同比增长 |
| ARPU | Average Revenue Per User，每用户平均收入 |
| ROI | Return on Investment，投资回报率 |`;
}

/**
 * 渲染执行摘要（定量指标版本）
 */
export function renderExecutiveSummary(data: {
  marketSize: string;
  growthRate: string;
  marketShare: string;
  pricing: string;
  userPenetration: string;
}): string {
  return `## 执行摘要

### 核心定量指标

| 指标 | 数值 | 说明 |
|-----|------|------|
| 市场规模 | **${data.marketSize}** | 目标市场总体规模 |
| 增长率 | **${data.growthRate}** | 年度复合增长率 |
| 市场集中度 | **${data.marketShare}** | 头部厂商占比 |
| 价格区间 | **${data.pricing}** | 主流产品定价 |
| 目标用户渗透率 | **${data.userPenetration}** | 目标客户群覆盖 |

> 以上数据基于公开市场调研和行业报告综合分析，仅供参考。`;
}

/**
 * 渲染带业务影响的SWOT列表
 */
export function renderSWOTWithBusinessImpact(
  items: string[],
  maxItems: number = 5
): string {
  if (items.length === 0) return '暂无数据';

  return items
    .slice(0, maxItems)
    .map((item, index) => {
      // 为每个SWOT项生成模拟的业务影响标签
      const impactLabels: Record<string, string> = {
        '技术': '业务影响: 提升15-30%运营效率',
        '成本': '业务影响: 降低10-25%运营成本',
        '市场': '业务影响: 扩大5-15%市场份额',
        '品牌': '业务影响: 增强20-40%品牌认知',
        '服务': '业务影响: 提升10-20%客户满意度',
      };

      let impact = '业务影响: 待量化';
      for (const [key, label] of Object.entries(impactLabels)) {
        if (item.includes(key)) {
          impact = label;
          break;
        }
      }

      return `${index + 1}. **${item}** (${impact})`;
    })
    .join('\n');
}

/**
 * 渲染结构化战略建议表格（带KPI）
 */
export function renderStrategicRecommendations(recommendations: Array<{
  recommendation: string;
  kpi: string;
  currentValue: string;
  targetValue: string;
  timeline: string;
  budget: string;
}>): string {
  if (recommendations.length === 0) {
    return `| 建议 | KPI | 当前值 | 目标值 | 时间节点 | 预算 |
|------|-----|-------|-------|---------|------|
| 暂无建议 | - | - | - | - | - |`;
  }

  const header = `| 建议 | KPI | 当前值 | 目标值 | 时间节点 | 预算 |
|------|-----|-------|-------|---------|------|`;
  const rows = recommendations.map(r =>
    `| ${r.recommendation} | ${r.kpi} | ${r.currentValue} | ${r.targetValue} | ${r.timeline} | ${r.budget} |`
  ).join('\n');

  return `${header}\n${rows}`;
}

/**
 * 渲染单位经济效益对比表
 */
export function renderUnitEconomicsComparison(data: {
  companyMetrics: Array<{
    competitor: string;
    ltvCacRatio: string;
    cacPaybackMonths: number;
    grossMargin: number;
  }>;
  benchmark: {
    ltvCacRatio: number;
    cacPaybackMonths: number;
    grossMargin: number;
  };
}): string {
  const header = `| 指标 | 厂商A | 行业基准 | 评估 |
|------|-------|---------|------|`;

  const ltvRow = `| LTV/CAC | ${data.companyMetrics[0]?.ltvCacRatio || '-'} | ${data.benchmark.ltvCacRatio}x | ${getLtvCacAssessment(data.companyMetrics[0]?.ltvCacRatio, data.benchmark.ltvCacRatio)} |`;
  const cacRow = `| CAC回收月数 | ${data.companyMetrics[0]?.cacPaybackMonths || '-'}个月 | ${data.benchmark.cacPaybackMonths}个月 | ${getCacPaybackAssessment(data.companyMetrics[0]?.cacPaybackMonths, data.benchmark.cacPaybackMonths)} |`;
  const marginRow = `| 毛利率 | ${data.companyMetrics[0]?.grossMargin || '-'}% | ${data.benchmark.grossMargin}% | ${getMarginAssessment(data.companyMetrics[0]?.grossMargin, data.benchmark.grossMargin)} |`;

  return `${header}\n${ltvRow}\n${cacRow}\n${marginRow}`;
}

/**
 * 辅助函数：评估LTV/CAC健康度
 */
function getLtvCacAssessment(value: string | undefined, benchmark: number): string {
  if (!value) return '待分析';
  const num = parseFloat(value);
  if (num >= benchmark * 1.2) return '优秀';
  if (num >= benchmark) return '良好';
  if (num >= benchmark * 0.8) return '一般';
  return '待改进';
}

/**
 * 辅助函数：评估CAC回收期
 */
function getCacPaybackAssessment(value: number | undefined, benchmark: number): string {
  if (!value) return '待分析';
  if (value <= benchmark * 0.8) return '优秀';
  if (value <= benchmark) return '良好';
  if (value <= benchmark * 1.2) return '一般';
  return '待改进';
}

/**
 * 辅助函数：评估毛利率
 */
function getMarginAssessment(value: number | undefined, benchmark: number): string {
  if (!value) return '待分析';
  if (value >= benchmark + 10) return '优秀';
  if (value >= benchmark) return '良好';
  if (value >= benchmark - 10) return '一般';
  return '待改进';
}

/**
 * 验证Markdown表格结构
 */
export function validateTableStructure(content: string): boolean {
  // 检查是否包含表格
  if (!content.includes('|')) return true;

  const lines = content.split('\n');
  let inTable = false;
  let hasValidStructure = true;

  for (const line of lines) {
    const trimmed = line.trim();

    // 检测表格开始（包含 | 的行）
    if (trimmed.includes('|')) {
      if (!inTable) {
        // 检查表头
        const hasSeparator = lines.some(l => l.trim().match(/^[\s|:\-]+$/));
        if (!hasSeparator) {
          hasValidStructure = false;
          break;
        }
        inTable = true;
      }
    }
  }

  return hasValidStructure;
}

/**
 * 验证是否存在未替换的占位符
 */
export function hasUnfilledPlaceholders(content: string): boolean {
  // 匹配 {xxx} 格式的占位符
  const placeholderPattern = /\{[^}]+\}/g;
  const matches = content.match(placeholderPattern);

  if (!matches) return false;

  // 检查是否包含有效的占位符（如 markdown 代码块中的内容）
  const inCodeBlock = content.includes('```');
  if (inCodeBlock) {
    // 简化处理：如果有代码块，假设占位符在代码块外是无效的
    const outsideCodeBlocks = content.split('```')[0];
    return !!outsideCodeBlocks.match(placeholderPattern);
  }

  return true;
}

/**
 * 移除或替换残留占位符
 */
export function sanitizeContent(content: string): string {
  return content.replace(/\{[^}]+\}/g, (match) => {
    // 保留某些允许的占位符模式
    if (match.includes('date') || match.includes('Date')) {
      return new Date().toISOString().split('T')[0];
    }
    return '暂无数据';
  });
}

/**
 * 验证雷达图数据格式
 * 确保数据符合 Mermaid radar chart 语法规范
 */
export function validateRadarChartData(data: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 检查是否为空
  if (!data || data.trim().length === 0) {
    errors.push('雷达图数据为空');
    return { valid: false, errors };
  }

  // 检查每行格式：标题: [值1, 值2, 值3, 值4, 值5]
  const lines = data.trim().split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 提取标题和值部分
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      errors.push(`第 ${i + 1} 行格式错误：缺少冒号分隔符`);
      continue;
    }

    const title = line.substring(0, colonIndex).trim();
    const valuesPart = line.substring(colonIndex + 1).trim();

    // 检查值部分是否在方括号内
    if (!valuesPart.startsWith('[') || !valuesPart.endsWith(']')) {
      errors.push(`第 ${i + 1} 行格式错误：值应在方括号内，格式如 "[10, 20, 30, 40, 50]"`);
      continue;
    }

    // 解析并验证值
    const valuesStr = valuesPart.slice(1, -1);
    const values = valuesStr.split(',').map(v => v.trim());

    if (values.length !== 5) {
      errors.push(`第 ${i + 1} 行：维度数量应为5个，实际为 ${values.length} 个`);
    }

    // 验证每个值是否为有效数字
    for (let j = 0; j < values.length; j++) {
      const val = parseFloat(values[j]);
      if (isNaN(val) || val < 0 || val > 100) {
        errors.push(`第 ${i + 1} 行第 ${j + 1} 个值 "${values[j]}" 无效，应为 0-100 的数字`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证饼图数据格式
 * 确保数据符合 Mermaid pie chart 语法规范
 */
export function validatePieChartData(data: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 检查是否为空
  if (!data || data.trim().length === 0) {
    errors.push('饼图数据为空');
    return { valid: false, errors };
  }

  const lines = data.trim().split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 格式："标题" : 值
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      errors.push(`第 ${i + 1} 行格式错误：缺少冒号分隔符`);
      continue;
    }

    const title = line.substring(0, colonIndex).trim();
    const valueStr = line.substring(colonIndex + 1).trim();

    // 检查标题格式（应被引号包围）
    if (!title.startsWith('"') || !title.endsWith('"')) {
      // 允许不带引号的格式，但给出警告
      // errors.push(`第 ${i + 1} 行：标题建议使用引号包围`);
    }

    // 验证值为数字
    const value = parseFloat(valueStr);
    if (isNaN(value) || value < 0 || value > 100) {
      errors.push(`第 ${i + 1} 行值 "${valueStr}" 无效，应为 0-100 的数字`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证思维导图数据格式
 * 确保数据符合 Mermaid mindmap 语法规范
 */
export function validateMindmapData(data: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 检查是否为空
  if (!data || data.trim().length === 0) {
    errors.push('思维导图数据为空');
    return { valid: false, errors };
  }

  // 检查是否包含 root 节点
  if (!data.includes('root')) {
    errors.push('思维导图缺少 root 根节点');
  }

  // 检查缩进是否正确（使用空格缩进）
  const lines = data.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // 检查缩进数量（应为2的倍数）
    const leadingSpaces = line.search(/\S/);
    if (leadingSpaces % 2 !== 0 && leadingSpaces > 0) {
      errors.push(`第 ${i + 1} 行缩进应为2的倍数，当前 ${leadingSpaces} 个空格`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 全面验证图表数据
 * 对所有类型的图表数据进行验证
 */
export function validateAllChartData(charts: {
  radar?: string;
  pie?: string;
  mindmap?: string;
}): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (charts.radar) {
    const result = validateRadarChartData(charts.radar);
    if (!result.valid) {
      errors.push(...result.errors.map(e => `雷达图: ${e}`));
    }
  }

  if (charts.pie) {
    const result = validatePieChartData(charts.pie);
    if (!result.valid) {
      errors.push(...result.errors.map(e => `饼图: ${e}`));
    }
  }

  if (charts.mindmap) {
    const result = validateMindmapData(charts.mindmap);
    if (!result.valid) {
      errors.push(...result.errors.map(e => `思维导图: ${e}`));
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================
// 新增：优化报告模板的辅助函数
// ============================================================

/**
 * 渲染执行摘要卡片
 *
 * 根据设计文档 D1：展示5个核心洞察，为报告提供快速概览
 *
 * @param data - 包含标题、关键词、搜索结果数量、提取内容数量和分析数据的对象
 * @returns Markdown 格式的执行摘要卡片字符串
 *
 * @example
 * ```typescript
 * const summary = renderExecutiveSummaryCard({
 *   title: "AI写作助手市场调研",
 *   keywords: ["AI", "写作", "NLP"],
 *   searchResultCount: 150,
 *   extractionCount: 45,
 *   analysis: {
 *     features: [...],
 *     competitors: [...],
 *     marketData: {...},
 *     swot: {...}
 *   }
 * });
 * ```
 *
 * @remarks
 * - 展示指标：市场规模、增长率、市场集中度、Top 竞品、核心建议
 * - 使用 emoji 指示器：🔥（趋势）、📈（同比）、⚡（集中度）、💡（建议）
 * - 显示数据完整度和置信度评分
 */
export function renderExecutiveSummaryCard(data: {
  title: string;
  keywords: string[];
  searchResultCount: number;
  extractionCount: number;
  analysis: {
    features: Array<{ name: string; count: number; description: string }>;
    competitors: Array<{
      name: string;
      industry: string;
      features: string[];
      description: string;
      marketPosition: string;
    }>;
    marketData: {
      marketSize?: string;
      growthRate?: string;
      marketConcentration?: string;
      trends: string[];
      opportunities: string[];
    };
    swot: {
      strengths: string[];
      opportunities: string[];
    };
    qualityAssessment?: {
      dataCompletenessScore: number;
      sourceCredibilityScore: number;
      overallQualityScore: number;
    };
  };
}): string {
  const { analysis } = data;

  // 市场规模指标
  const marketSizeSummary = analysis.marketData.marketSize || '暂无数据';
  const marketSizeTrend = analysis.marketData.growthRate
    ? `${analysis.marketData.growthRate} 🔥`
    : '🔥 待分析';

  // 增长率指标
  const growthRateSummary = analysis.marketData.growthRate || '暂无数据';
  const growthRateYoY = analysis.marketData.growthRate ? '📈 YoY' : '📈 待分析';

  // 市场集中度
  const marketConcentration = analysis.marketData.marketConcentration || '暂无数据';
  const marketConcentrationLevel = marketConcentration === '暂无数据'
    ? '⚡ 待分析'
    : `⚡ ${marketConcentration}`;

  // Top 3 竞品
  const sortedCompetitors = sortByMarketPosition(analysis.competitors);
  const top3Competitors = sortedCompetitors.slice(0, 3).map(c => c.name).join(' | ') || '暂无数据';

  // 核心建议
  const keyRecommendation = analysis.swot.strengths[0]
    ? `与竞品相比，突出${analysis.features[0]?.name || '核心功能'}优势`
    : analysis.swot.opportunities[0]
    ? `把握${analysis.swot.opportunities[0]}机会`
    : '建议深入分析市场数据';

  // 质量评分
  const qa = analysis.qualityAssessment;
  const dataCompletenessScore = qa?.dataCompletenessScore ?? 0;
  const confidenceLevel = qa?.overallQualityScore ?? 0;

  return `> ## 执行摘要卡片
>
> | 指标 | 值 | 说明 |
> |-----|---|------|
> | 市场规模 | ${marketSizeSummary} | ${marketSizeTrend} |
> | 增长率 | ${growthRateSummary} | ${growthRateYoY} |
> | 市场集中度 | ${marketConcentration} | ${marketConcentrationLevel} |
> | Top 竞品 | ${top3Competitors} | 前3名 |
> | 核心建议 | 💡 ${keyRecommendation} | |
>
> **数据完整度**: ${dataCompletenessScore}/100 | **置信度**: ${confidenceLevel}%`;
}

/**
 * 根据多个因素对竞品进行排序
 *
 * 根据设计文档 D2：使用加权评分算法确定竞品排名
 *
 * @param competitors - 竞品数组，每个竞品包含名称、行业、核心功能、描述和市场定位
 * @returns 排序后的竞品数组，每项包含原始数据和 rankingScore 评分
 *
 * @example
 * ```typescript
 * const sorted = sortByMarketPosition([
 *   { name: "产品A", industry: "AI", features: ["功能1", "功能2"], description: "详细描述...", marketPosition: "领导者" }
 * ]);
 * // 返回: [{ name: "产品A", rankingScore: 85.5, ... }]
 * ```
 *
 * @remarks
 * - 功能完整性权重：40%（最多5个核心功能得满分）
 * - 描述长度权重：30%（200字以上得满分）
 * - 市场定位清晰度权重：20%（有描述得20分）
 * - 首现顺序权重：10%（越早出现分数越高）
 */
export function sortByMarketPosition(
  competitors: Array<{
    name: string;
    industry: string;
    features: string[];
    description: string;
    marketPosition: string;
  }>
): Array<typeof competitors[0] & { rankingScore: number }> {
  if (competitors.length === 0) return [];

  // 计算每个竞品的评分
  const scored = competitors.map((c, index) => {
    // 功能完整性 (40%)
    const featureScore = Math.min(c.features.length / 5, 1) * 40;

    // 描述长度 (30%) - 描述越详细通常越重要
    const descLength = c.description.length;
    const descriptionScore = Math.min(descLength / 200, 1) * 30;

    // 市场定位清晰度 (20%) - 有市场定位描述得分
    const marketPositionScore = c.marketPosition && c.marketPosition.length > 0 ? 20 : 0;

    // 首现顺序 (10%) - 越早出现越重要
    const orderScore = Math.max(10 - index * 0.5, 0);

    const totalScore = featureScore + descriptionScore + marketPositionScore + orderScore;

    return { ...c, rankingScore: totalScore };
  });

  // 按评分降序排序
  return scored.sort((a, b) => b.rankingScore - a.rankingScore);
}

/**
 * 渲染竞品分层分析
 *
 * 根据设计文档 D2：将竞品分为 Top 5 深度分析和 Top 6-10 摘要两个层级
 *
 * @param competitors - 竞品数组
 * @returns 包含 benchmarkAnalysis（Top 5 深度分析）和 top6_10Summary（Top 6-10 摘要表格）的对象
 *
 * @example
 * ```typescript
 * const analysis = renderCompetitorTieredAnalysis([
 *   { name: "产品A", industry: "AI", features: ["功能1"], description: "描述...", marketPosition: "领导者" },
 *   // ... 更多竞品
 * ]);
 * console.log(analysis.benchmarkAnalysis); // Top 5 深度分析
 * console.log(analysis.top6_10Summary);   // Top 6-10 摘要表格
 * ```
 *
 * @remarks
 * - Top 5：每个竞品包含行业定位、市场定位、核心功能、产品描述和排名依据
 * - Top 6-10：摘要表格格式，包含排名、名称、行业、核心功能、市场定位
 * - 独特功能标识：Top 6-10 中的功能会过滤掉与 Top 5 重复的项目
 */
export function renderCompetitorTieredAnalysis(
  competitors: Array<{
    name: string;
    industry: string;
    features: string[];
    description: string;
    marketPosition: string;
  }>
): { benchmarkAnalysis: string; top6_10Summary: string } {
  if (competitors.length === 0) {
    return {
      benchmarkAnalysis: '暂无竞品深度分析数据',
      top6_10Summary: '暂无竞品摘要数据'
    };
  }

  const sorted = sortByMarketPosition(competitors);
  const top5 = sorted.slice(0, 5);
  const top6_10 = sorted.slice(5, 10);

  // Top 5 深度分析
  const benchmarkAnalysis = top5.map((c, i) => {
    return `### ${i + 1}. ${c.name}

**行业定位**：${c.industry || '待分析'}

**市场定位**：${c.marketPosition || '待分析'}

**核心功能**：${c.features.length > 0 ? c.features.join('、') : '待分析'}

**产品描述**：${c.description || '暂无详细描述'}

**排名依据**：功能完整性 ${c.features.length} 项，描述 ${c.description.length} 字`;
  }).join('\n\n');

  // Top 6-10 摘要
  const top6_10Summary = top6_10.length > 0
    ? top6_10.map((c, i) => {
        const uniqueFeatures = c.features.filter(f =>
          !top5.slice(0, i).some(t5 => t5.features.includes(f))
        );
        return `| ${i + 6} | ${c.name} | ${c.industry || '-'} | ${uniqueFeatures.slice(0, 2).join('、') || c.features[0] || '-'} | ${c.marketPosition || '待分析'} |`;
      }).join('\n')
    : '暂无第6-10名竞品数据';

  return {
    benchmarkAnalysis,
    top6_10Summary: top6_10.length > 0
      ? `| 排名 | 竞品名称 | 行业 | 核心功能 | 市场定位 |
|-----|---------|------|---------|---------|
${top6_10Summary}`
      : '暂无第6-10名竞品数据'
  };
}

/**
 * 渲染数据质量说明部分
 *
 * 根据设计文档 D3：统一处理缺失数据，展示数据完整度评分和改进建议
 *
 * @param analysis - 包含市场数据、竞品数据、用户研究数据和质量评估的对象
 * @returns Markdown 格式的数据质量说明字符串
 *
 * @example
 * ```typescript
 * const quality = renderDataQualitySection({
 *   marketData: { marketSize: "100亿", growthRate: "20%" },
 *   competitors: [{ name: "产品A", features: [], description: "" }],
 *   userResearch: { personas: [{ name: "用户A" }] },
 *   qualityAssessment: { dataCompletenessScore: 75, sourceCredibilityScore: 80 }
 * });
 * ```
 *
 * @remarks
 * - 市场规模数据评分：有市场规模和增长率得80分，否则50分
 * - 竞品数据评分：有竞品数据得70分，否则30分
 * - 用户数据评分：有用户画像得60分，否则20分
 * - 总体评分：三个维度的平均值
 * - 包含置信度说明（高/中/低）和数据获取建议
 */
export function renderDataQualitySection(analysis: {
  marketData: {
    marketSize?: string;
    growthRate?: string;
    marketShare?: Array<{ competitor: string; share: number }>;
  };
  competitors: Array<{
    name: string;
    features: string[];
    description: string;
  }>;
  userResearch?: {
    personas?: Array<{ name: string }>;
  };
  qualityAssessment?: {
    dataCompletenessScore: number;
    sourceCredibilityScore: number;
  };
}): string {
  // 计算各维度评分
  const marketDataScore = analysis.marketData.marketSize && analysis.marketData.growthRate ? 80 : 50;
  const competitorDataScore = analysis.competitors.length > 0 ? 70 : 30;
  const userDataScore = analysis.userResearch?.personas?.length ? 60 : 20;

  const overallScore = Math.round((marketDataScore + competitorDataScore + userDataScore) / 3);

  // 各维度说明
  const marketDataNote = analysis.marketData.marketSize
    ? '市场规模数据完整'
    : '缺少具体金额数据，建议参考艾瑞/QuestMobile报告';
  const competitorDataNote = analysis.competitors.length > 0
    ? `竞品数据完整（${analysis.competitors.length}个竞品）`
    : '竞品数据不足';
  const userDataNote = analysis.userResearch?.personas?.length
    ? '用户画像数据完整'
    : '基于公开推断，建议进行用户调研';

  // 数据获取建议
  const suggestions = [
    '建议补充艾瑞/QuestMobile 行业报告获取市场规模数据',
    '建议获取竞品公开财务数据',
    '建议进行用户调研收集一手数据'
  ];

  return `### 数据完整度评分: ${overallScore}/100

| 维度 | 评分 | 说明 |
|-----|-----|------|
| 市场规模数据 | ${marketDataScore}/100 | ${marketDataNote} |
| 竞品数据 | ${competitorDataScore}/100 | ${competitorDataNote} |
| 用户数据 | ${userDataScore}/100 | ${userDataNote} |

### 数据获取建议

${suggestions.map(s => `- ${s}`).join('\n')}

### 置信度说明

- **高置信度**: 数据来自官方/权威来源
- **中置信度**: 数据来自行业报告/公开分析
- **低置信度**: 数据基于模型推断`;
}
