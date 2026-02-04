/**
 * Research Agent 共享类型定义
 *
 * 定义所有 Agent 共享的数据类型，确保类型一致性
 */

import type { SearchResult as BaseSearchResult, DataSourceType as BaseDataSourceType } from '@/lib/datasources';

// ============================================================
// 核心类型
// ============================================================

/** 研究任务状态 */
export type ResearchStatus =
  | 'pending'
  | 'planning'
  | 'searching'
  | 'extracting'
  | 'analyzing'
  | 'reporting'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Agent 名称 */
export type AgentName = 'planner' | 'searcher' | 'extractor' | 'analyzer' | 'reporter' | 'supervisor' | 'done';

/** 数据源类型 - 复用 datasources 定义 */
export type DataSourceType = BaseDataSourceType;

/** 数据源可信度级别 */
export type DataSourceCredibility = 'Primary' | 'Secondary' | 'Estimated' | 'Unverified';

/** 数据源信息 */
export interface DataSourceInfo {
  type: DataSourceType;
  name: string;
  credibility: DataSourceCredibility;
  lastAccessed: string;
  recordCount: number;
}

// ============================================================
// 任务配置
// ============================================================

/** 研究任务输入 */
export interface ResearchTaskInput {
  projectId: string;
  title: string;
  description?: string;
  keywords?: string[];
}

/** 研究任务 */
export interface ResearchTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  keywords: string[];
  status: ResearchStatus;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 搜索相关
// ============================================================

/** 搜索查询 */
export interface SearchQuery {
  id: string;
  query: string;
  purpose: string;
  dimension: string;
  priority: number; // 1-5，1 为最高优先级
  hints?: string;
}

/** 搜索计划 */
export interface SearchPlan {
  queries: SearchQuery[];
  targetSources: DataSourceType[];
  researchDimensions: string[];
  qualityThresholds: QualityThresholds;
}

/** 质量阈值 */
export interface QualityThresholds {
  minFeatures: number;
  minCompetitors: number;
  minUseCases: number;
  minTechStack: number;
  minSearchResults: number;
  minIterations: number;
  completionScore: number;
}

/** 搜索结果 - 继承基础类型并扩展 */
export interface SearchResult extends BaseSearchResult {
  id: string;
  source: DataSourceType;
  quality: number; // 1-10
  crawled: boolean;
  queryId: string;
  dimension: string;
}

// ============================================================
// 提取相关
// ============================================================

/** 提取结果 */
export interface ExtractionResult {
  url: string;
  source: DataSourceType;
  title: string;
  content: string;
  metadata: {
    crawledAt: string;
    contentLength: number;
    qualityScore: number;
    features: string[];
    competitors: string[];
    techStack: string[];
    filePath?: string;
  };
}

// ============================================================
// 分析相关
// ============================================================

/** 功能分析 */
export interface FeatureAnalysis {
  name: string;
  count: number;
  sources: string[];
  description: string;
}

/** 竞品分析 */
export interface CompetitorAnalysis {
  name: string;
  industry: string;
  features: string[];
  description: string;
  marketPosition: string;
}

/** SWOT 分析 */
export interface SWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

/** 市场数据 - 增强版 */
export interface MarketData {
  // 原有字段
  marketSize: string;
  growthRate: string;
  keyPlayers: string[];
  trends: string[];
  opportunities: string[];
  challenges: string[];
  // 新增：定量数据字段
  marketSizeRange?: {
    min: string; // 最小市场规模
    base: string; // 基准市场规模
    max: string; // 最大市场规模
    currency: string; // 货币单位
  };
  growthRateHistorical?: Array<{
    year: string;
    rate: string;
    source: string;
  }>;
  forecastYears?: Array<{
    year: string;
    projectedSize: string;
    projectedRate: string;
    methodology: string;
  }>;
  dataSource?: {
    primary: string;
    secondary: string[];
    lastUpdated: string;
  };
  confidenceLevel?: 'High' | 'Medium' | 'Low';
  marketDrivers?: Array<{
    factor: string;
    impact: 'High' | 'Medium' | 'Low';
    description: string;
  }>;
  marketConstraints?: Array<{
    factor: string;
    impact: 'High' | 'Medium' | 'Low';
    description: string;
  }>;
}

/** 用户研究数据 - 新增 */
export interface UserResearchData {
  userPersonas?: Array<{
    name: string;
    demographics: {
      ageRange: string;
      genderRatio: string;
      geographicDistribution: string;
      incomeLevel: string;
    };
    behavioral: {
      usageFrequency: string;
      preferredFeatures: string[];
      paymentWillingness: string;
    };
    source: string;
  }>;
  sampleSize?: {
    total: number;
    targetPopulation: string;
    confidenceLevel: number; // e.g., 95
    marginOfError: number; // e.g., 3
  };
  researchMethodology?: string; // e.g., '在线问卷', '电话访谈', '焦点小组'
  penetrationRate?: {
    overall: number;
    bySegment: Array<{
      segment: string;
      rate: number;
    }>;
  };
  userSatisfaction?: {
    nps?: number; // Net Promoter Score
    satisfactionScore: number; // 1-10
    keyFeedback: string[];
  };
  adoptionTrends?: Array<{
    phase: string; // 'early adopters', 'early majority', etc.
    percentage: number;
    description: string;
  }>;
}

/** 竞品定量分析 - 新增 */
export interface CompetitorQuantitative {
  marketShare?: Array<{
    competitor: string;
    share: number; // percentage
    period: string;
    source: string;
  }>;
  revenueMetrics?: Array<{
    competitor: string;
    revenue: string;
    revenueGrowthRate: string;
    period: string;
    currency: string;
    source: string;
  }>;
  arpuMetrics?: Array<{
    competitor: string;
    arpu: string;
    currency: string;
    period: string;
  }>;
  cacMetrics?: Array<{
    competitor: string;
    cac: string;
    currency: string;
    period: string;
  }>;
  ltvMetrics?: Array<{
    competitor: string;
    ltv: string;
    currency: string;
    calculationMethod: string;
  }>;
  ltvCacRatio?: Array<{
    competitor: string;
    ratio: number;
    assessment: string; // 'Healthy', 'Needs Improvement', etc.
  }>;
  /** 竞品能力评分 */
  capabilityScore?: Array<{
    competitor: string;
    overallScore: number; // 0-100
    technologyScore: number;
    marketScore: number;
    productScore: number;
    financialScore: number;
    strengths: string[];
    weaknesses: string[];
    assessment: 'Leader' | 'Strong' | 'Average' | 'Weak';
  }>;
}

/** 商业模式分析 - 新增 */
export interface BusinessModelAnalysis {
  pricingModel?: {
    type: string; // 'subscription', 'freemium', 'one-time', 'usage-based'
    tiers?: Array<{
      name: string;
      price: string;
      features: string[];
    }>;
    regionalVariations?: string;
  };
  unitEconomics?: {
    breakEvenAnalysis?: {
      timeToBreakEven: string;
      revenueNeeded: string;
    };
    contributionMargin?: number;
    scalabilityAssessment: string;
  };
  monetizationEfficiency?: {
    freeToPaidConversion?: number;
    arppu?: string; // Average Revenue Per Paying User
    rpDau?: string; // Revenue Per Daily Active User
  };
  commercialMaturity?: {
    rating: 'Early Stage' | 'Maturing' | 'Mature';
    assessment: string;
    keyMetrics: string[];
  };
}

/** 战略建议 - 新增 */
export interface StrategicRecommendation {
  specific?: string; // 具体描述
  measurable?: {
    kpis: Array<{
      name: string;
      target: string;
      current: string;
      unit: string;
    }>;
  };
  achievable?: {
    feasibility: 'High' | 'Medium' | 'Low';
    rationale: string;
  };
  relevant?: {
    relevanceScore: number; // 1-10
    businessImpact: string;
  };
  timeBound?: {
    deadline: string;
    milestones: Array<{
      name: string;
      targetDate: string;
      successCriteria: string;
    }>;
  };
  resourceRequirements?: {
    budget?: string;
    teamSize?: string;
    technologyNeeds?: string[];
  };
  riskAssessment?: {
    risks: Array<{
      risk: string;
      likelihood: 'High' | 'Medium' | 'Low';
      impact: 'High' | 'Medium' | 'Low';
      mitigation: string;
    }>;
  };
  roiProjection?: {
    expectedReturn: string;
    paybackPeriod: string;
    assumptions: string[];
  };
}

/** 实施路线图 - 新增 */
export interface ImplementationRoadmap {
  shortTerm?: Array<StrategicRecommendation>; // 0-6 months
  mediumTerm?: Array<StrategicRecommendation>; // 6-12 months
  longTerm?: Array<StrategicRecommendation>; // 12+ months
}

/** 报告质量评估 - 新增 */
export interface ReportQualityAssessment {
  dataCompletenessScore: number; // 0-100
  sourceCredibilityScore: number; // 0-100
  visualizationCoverageScore: number; // 0-100
  overallQualityScore: number; // 0-100
  dataGaps: string[];
  recommendations: string[];
}

/** 技术栈分析 */
export interface TechStackAnalysis {
  architecture: string[];
  techStack: string[];
  emergingTech: string[];
  innovationPoints: string[];
}

/** 使用场景分析 */
export interface UseCaseAnalysis {
  scenarios: Array<{
    name: string;
    description: string;
    targetUsers: string[];
    value: string;
  }>;
  userTypes: string[];
  painPoints: string[];
  valuePropositions: string[];
}

/** 详细分析报告 */
export interface DetailedAnalysis {
  features: FeatureAnalysis[];
  competitors: CompetitorAnalysis[];
  swot: SWOTAnalysis;
  marketData: MarketData;
  techStack: TechStackAnalysis;
  useCases: UseCaseAnalysis;
  recommendations: {
    shortTerm: string[];
    mediumTerm: string[];
    longTerm: string[];
  };
  confidenceScore: number;
  dataGaps: string[];
  // 新增：定量分析模块
  userResearch?: UserResearchData;
  competitorQuantitative?: CompetitorQuantitative;
  businessModel?: BusinessModelAnalysis;
  roadmap?: ImplementationRoadmap;
  qualityAssessment?: ReportQualityAssessment;
}

/** 分析结果 - 保持向后兼容 */
export interface AnalysisResult extends Partial<DetailedAnalysis> {
  features: FeatureAnalysis[];
  competitors: CompetitorAnalysis[];
  swot: SWOTAnalysis;
  marketData: MarketData;
  techAnalysis?: TechStackAnalysis;
  confidenceScore: number;
  dataGaps: string[];
  // 新增：定量分析模块（可选）
  userResearch?: UserResearchData;
  competitorQuantitative?: CompetitorQuantitative;
  businessModel?: BusinessModelAnalysis;
  roadmap?: ImplementationRoadmap;
  qualityAssessment?: ReportQualityAssessment;
}

// ============================================================
// 报告相关
// ============================================================

/** 报告章节 */
export interface ReportSection {
  id: string;
  title: string;
  content: string;
  order: number;
  required: boolean;
}

/** Mermaid 图表配置 - 增强版 */
export interface MermaidChart {
  id: string;
  type: 'pie' | 'mindmap' | 'timeline' | 'radar' | 'graph' | 'quadrant' | 'journey' | 'stateDiagram' | 'xychart' | 'gantt' | 'heatmap';
  title: string;
  code: string;
}

/** 报告元数据 */
export interface ReportMetadata {
  reportId: string;
  projectId: string;
  title: string;
  generatedAt: string;
  keywords: string[];
  summary: string;
}

// ============================================================
// 引用相关
// ============================================================

/** 引用来源 */
export interface Citation {
  id: string;
  source: string;
  title: string;
  url: string;
  relevanceScore: number;
  referencedAt: string;
}

// ============================================================
// 数据质量
// ============================================================

/** 数据质量检查 */
export interface DataQualityCheck {
  isComplete: boolean;
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
  coverage: Record<string, number>;
  missingDimensions: string[];
}

/** 维度覆盖率 */
export interface DimensionCoverage {
  dimension: string;
  covered: boolean;
  itemCount: number;
}

// ============================================================
// 错误处理
// ============================================================

/** Agent 执行结果 */
export interface AgentResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  metadata: {
    attemptedAt: string;
    duration: number;
    attempts: number;
  };
}

/** 阶段失败汇总 */
export interface StageFailureSummary {
  stage: string;
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  successRate: number;
  errors: Array<{ item: string; error: string }>;
}

// ============================================================
// 超时配置
// ============================================================

/** Agent 超时配置 */
export interface AgentTimeoutConfig {
  agentName: AgentName;
  maxDuration: number; // 毫秒
  maxRetries: number;
}

/** 子操作超时配置 */
export interface OperationTimeouts {
  search: {
    rss: number;
    duckduckgo: number;
    webSearch: number;
  };
  crawl: {
    single: number;
    batch: number;
  };
  llm: {
    generate: number;
    analyze: number;
  };
}

// ============================================================
// 进度相关
// ============================================================

/** 进度详情 */
export interface ProgressDetail {
  stage: string; // 当前阶段: planning | searching | extracting | analyzing | reporting
  step: string; // 当前步骤描述
  totalItems: number; // 总数量
  completedItems: number; // 已完成数量
  currentItem: string; // 当前处理的项目
  percentage: number; // 总体进度百分比
  estimatedTimeRemaining?: number; // 预计剩余时间（秒）
}

/** 进度状态 */
export interface ProgressState {
  projectId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed';
  overallProgress: number; // 0-100
  overallMessage: string; // 总体描述
  currentAgent: string; // 当前执行的 Agent
  details: ProgressDetail;
  startedAt: string;
  updatedAt: string;
}

// ============================================================
// 取消相关
// ============================================================

/** 取消状态 */
export interface CancellationState {
  projectId: string;
  requestedAt: string; // 取消请求时间
  requestedBy: string; // 请求用户
  status: 'pending' | 'processing' | 'completed' | 'timeout';
  forced: boolean; // 是否强制终止
}

// ============================================================
// 备份相关
// ============================================================

/** 备份配置 */
export interface BackupConfig {
  trigger: 'interval' | 'checkpoint' | 'manual';
  intervalMs: number; // 间隔时间（默认 30 秒）
  checkpointBackup: boolean; // 是否在每个阶段结束时备份
  maxBackups: number; // 最大备份数量（默认 5）
  backupDir: string;
}

/** 备份清单 */
export interface BackupManifest {
  backupId: string;
  projectId: string;
  createdAt: string;
  stateSnapshot: string; // 状态快照
  checksum: string; // SHA-256 校验和
  size: number; // 文件大小
}
