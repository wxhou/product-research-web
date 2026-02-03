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
  dataSources: string[]
): string {
  const template = REPORT_TEMPLATE.sections;

  // 生成各章节内容
  let report = '';

  for (const section of template.sort((a, b) => a.order - b.order)) {
    report += renderSection(section, {
      title,
      keywords: keywords.join(', '),
      searchResultCount,
      extractionCount,
      analysis,
      dataSources: dataSources.join(', '),
    });
    report += '\n\n';
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

  // 计算统计数据
  const featureCount = analysis.features.length;
  const competitorCount = analysis.competitors.length;
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
    content = content.replace(/{productPositioning}/g, analysis.competitors.length > 0 ?
      `聚焦${analysis.competitors[0].industry || '目标'}市场，提供${analysis.features.slice(0, 3).map(f => f.name).join('、')}等核心功能` : '待分析');
    content = content.replace(/{keyStrengths}/g, analysis.swot.strengths.slice(0, 2).join('，') || '待分析');
    content = content.replace(/{marketOpportunity}/g, analysis.marketData.opportunities[0] || analysis.marketData.trends[0] || '待分析');
    content = content.replace(/{recommendationFocus}/g, analysis.swot.opportunities.slice(0, 2).join('，') || '待分析');
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
    content = replaceMermaidChart(content, 'MINDMAP_CHART', 'mindmap\n  root((竞品分析))', renderCompetitorMindmap(analysis.competitors));
  }

  // 特殊处理 SWOT 章节
  if (section.id === 'swot') {
    content = content.replace('{strengths}', renderList(analysis.swot.strengths));
    content = content.replace('{weaknesses}', renderList(analysis.swot.weaknesses));
    content = content.replace('{opportunities}', renderList(analysis.swot.opportunities));
    content = content.replace('{threats}', renderList(analysis.swot.threats));

    const mindmapContent = `  root((SWOT 分析))\n    优势(S)\n${renderMindmapItems(analysis.swot.strengths)}\n    劣势(W)\n${renderMindmapItems(analysis.swot.weaknesses)}\n    机会(O)\n${renderMindmapItems(analysis.swot.opportunities)}\n    威胁(T)\n${renderMindmapItems(analysis.swot.threats)}`;
    content = replaceMermaidChart(content, 'MINDMAP_CHART', 'mindmap', mindmapContent);
  }

  // 特殊处理市场章节
  if (section.id === 'market') {
    content = content.replace('{marketSize}', analysis.marketData.marketSize || '待分析');
    content = content.replace('{growthRate}', analysis.marketData.growthRate || '待分析');
    content = content.replace('{keyPlayers}', analysis.marketData.keyPlayers.join(', ') || '待分析');
    content = content.replace('{marketTrends}', renderList(analysis.marketData.trends));
    content = content.replace('{marketOpportunities}', renderList(analysis.marketData.opportunities));
    content = content.replace('{marketChallenges}', renderList(analysis.marketData.challenges));
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
    content = content.replace('{useCaseScenarios}', renderUseCaseScenarios(analysis.features));
    content = content.replace('{userTypes}', renderUserTypes(analysis.competitors));
    content = content.replace('{painPoints}', renderPainPoints(analysis.swot.weaknesses));
    content = content.replace('{valuePropositions}', renderValuePropositions(analysis.swot.strengths, analysis.features));
  }

  // 特殊处理建议章节
  if (section.id === 'recommendations') {
    content = content.replace('{shortTermRecommendations}', renderShortTermRecommendations(analysis));
    content = content.replace('{mediumTermRecommendations}', renderMediumTermRecommendations(analysis));
    content = content.replace('{longTermRecommendations}', renderLongTermRecommendations(analysis));
  }

  // 特殊处理市场章节 - 新增定量数据
  if (section.id === 'market') {
    // 原有占位符
    content = content.replace('{marketSize}', analysis.marketData.marketSize || '待分析');
    content = content.replace('{growthRate}', analysis.marketData.growthRate || '待分析');
    content = content.replace('{keyPlayers}', analysis.marketData.keyPlayers.join(', ') || '待分析');
    content = content.replace('{marketTrends}', renderList(analysis.marketData.trends));
    content = content.replace('{marketOpportunities}', renderList(analysis.marketData.opportunities));
    content = content.replace('{marketChallenges}', renderList(analysis.marketData.challenges));

    // 新增定量数据占位符
    const md = analysis.marketData;
    if (md.marketSizeRange) {
      content = content.replace('{marketSizeRange}', `${md.marketSizeRange.currency} ${md.marketSizeRange.min} - ${md.marketSizeRange.max}`);
    } else {
      content = content.replace('{marketSizeRange}', '暂无数据');
    }
    content = content.replace('{confidenceLevel}', md.confidenceLevel || 'Medium');
    content = content.replace('{dataSource}', md.dataSource?.primary || '基于网络调研估算');

    // 历史增长率表格
    if (md.growthRateHistorical && md.growthRateHistorical.length > 0) {
      const historyRows = md.growthRateHistorical.map(h => `| ${h.year} | ${h.rate} | ${h.source || '-'} |`).join('\n');
      content = content.replace('{marketGrowthHistory}', `| 年份 | 增长率 | 数据来源 |\n|-----|-------|---------|\n${historyRows}`);
    } else {
      content = content.replace('{marketGrowthHistory}', '暂无历史数据');
    }

    // 市场驱动因素
    if (md.marketDrivers && md.marketDrivers.length > 0) {
      const drivers = md.marketDrivers.map(d => `- **${d.factor}** (影响: ${d.impact}): ${d.description}`).join('\n');
      content = content.replace('{marketDrivers}', drivers);
    } else {
      content = content.replace('{marketDrivers}', '暂无数据');
    }

    // 市场制约因素
    if (md.marketConstraints && md.marketConstraints.length > 0) {
      const constraints = md.marketConstraints.map(c => `- **${c.factor}** (影响: ${c.impact}): ${c.description}`).join('\n');
      content = content.replace('{marketConstraints}', constraints);
    } else {
      content = content.replace('{marketConstraints}', '暂无数据');
    }

    // 市场预测
    if (md.forecastYears && md.forecastYears.length > 0) {
      content = content.replace('{forecastYears}', String(md.forecastYears.length));
      const forecastRows = md.forecastYears.map(f => `| ${f.year} | ${f.projectedSize} | ${f.projectedRate} | ${f.methodology} |`).join('\n');
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
 * 渲染思维导图项
 */
function renderMindmapItems(items: string[]): string {
  return items.slice(0, 5).map((i) => `      - ${i}`).join('\n');
}

/**
 * 渲染功能饼图
 */
function renderFeaturePieChart(features: Array<{ name: string; count: number }>): string {
  if (features.length === 0) {
    return '    "暂无数据" : 1';
  }

  return features.slice(0, 8).map((f) => {
    // 清理名称中可能导致 mermaid 语法错误的字符
    const safeName = f.name.replace(/"/g, "'").replace(/[\n\r]/g, ' ');
    return `    "${safeName}" : ${f.count}`;
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
 * 渲染短期建议
 */
function renderShortTermRecommendations(analysis: ReportRenderData['analysis']): string {
  const recommendations: string[] = [];

  // 基于竞品分析
  if (analysis.competitors.length > 0) {
    recommendations.push(`1. **差异化定位**：与${analysis.competitors[0].name}相比，突出自身在${analysis.features[0]?.name || '核心功能'}方面的优势`);
  }

  // 基于功能分析
  if (analysis.features.length > 0) {
    recommendations.push(`2. **功能优化**：优先完善${analysis.features[0].name}等高频功能`);
  }

  // 基于 SWOT
  if (analysis.swot.strengths.length > 0) {
    recommendations.push(`3. **优势强化**：充分利用${analysis.swot.strengths[0]}等优势`);
  }

  return recommendations.length > 0 ? recommendations.join('\n') : '暂无短期建议';
}

/**
 * 渲染中期建议
 */
function renderMediumTermRecommendations(analysis: ReportRenderData['analysis']): string {
  const recommendations: string[] = [];

  // 基于市场数据
  if (analysis.marketData.trends.length > 0) {
    recommendations.push(`1. **趋势把握**：关注${analysis.marketData.trends[0]}等市场趋势`);
  }

  // 基于机会
  if (analysis.marketData.opportunities.length > 0) {
    recommendations.push(`2. **机会把握**：重点布局${analysis.marketData.opportunities[0]}`);
  }

  // 基于技术分析
  if (analysis.techAnalysis?.techStack) {
    recommendations.push(`3. **技术升级**：引入${analysis.techAnalysis.emergingTech[0] || '新技术'}提升竞争力`);
  }

  return recommendations.length > 0 ? recommendations.join('\n') : '暂无中期建议';
}

/**
 * 渲染长期建议
 */
function renderLongTermRecommendations(analysis: ReportRenderData['analysis']): string {
  const recommendations: string[] = [];

  // 基于威胁
  if (analysis.swot.threats.length > 0) {
    recommendations.push(`1. **风险应对**：制定应对${analysis.swot.threats[0]}的长期策略`);
  }

  // 基于挑战
  if (analysis.marketData.challenges.length > 0) {
    recommendations.push(`2. **挑战突破**：持续投入解决${analysis.marketData.challenges[0]}`);
  }

  // 基于技术创新点
  if (analysis.techAnalysis?.innovationPoints) {
    recommendations.push(`3. **创新驱动**：围绕${analysis.techAnalysis.innovationPoints[0] || '核心技术创新'}建立壁垒`);
  }

  // 愿景性建议
  recommendations.push('4. **生态建设**：构建开放平台，吸引第三方开发者');
  recommendations.push('5. **国际化**：探索海外市场机会');

  return recommendations.length > 0 ? recommendations.join('\n') : '暂无长期建议';
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
 * 渲染渗透率表格
 */
function renderPenetrationRates(rate: { overall: number; bySegment: Array<{ segment: string; rate: number }> } | undefined): string {
  if (!rate) return '| 用户群体 | 渗透率 |暂无数据';
  return rate.bySegment.map(s => `| ${s.segment} | ${s.rate}% |`).join('\n');
}

/**
 * 渲染用户采纳趋势
 */
function renderAdoptionTrends(trends: Array<{ phase: string; percentage: number; description: string }> | undefined): string {
  if (!trends || trends.length === 0) return '| 阶段 | 用户占比 | 描述 |\n|-----|---------|-----|\n| 探索期 | 5% | 早期采用者 |';
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
