export const RESEARCH_QUALITY_THRESHOLDS = {
  minSearchResults: 30,  // 增加以确保有足够的搜索结果
  minExtractions: 10,    // 最小提取数量（质量保障）
  minFeatures: 3,
  minCompetitors: 2,
  completionScore: 60,
  minConfidenceScore: 0.5,
} as const;

/** 搜索质量阈值 - 用于多轮迭代判断 */
export const SEARCH_QUALITY_THRESHOLDS = {
  minResults: 30,              // 最少结果数
  minHighQualityRatio: 0.3,    // 高质量(>=7分)占比 >= 30%
  maxLowQualityRatio: 0.4,     // 低质量(<4分)占比 <= 40%
  minDimensionCoverage: 0.6,    // 维度覆盖 >= 60%
  minDeduplicationRate: 0.7,   // 去重率 >= 70%
} as const;

/** 搜索质量保障配置 - 用于数量预估 */
export const QUALITY_GUARANTEE_CONFIG = {
  /** 预估过滤通过率 */
  filterPassRate: 0.4,
  /** 最低内容数量要求 */
  minContentCount: 10,
  /** 质量评分阈值 */
  qualityThreshold: 60,
  /** 最大补充搜索轮次 */
  maxSupplementRounds: 3,
} as const;

export const SEARCHER_DEFAULTS = {
  minQualityScore: 3,
  maxResults: 150,
  searchRounds: 10,
  targetDataPoints: 100,
  // 多轮迭代配置
  maxIterations: 3,                    // 最大迭代轮次
  qualityThreshold: SEARCH_QUALITY_THRESHOLDS,
  // 成本保护
  maxTotalQueries: 50,                 // 最大总查询数
  roundTimeout: 120000,                // 单轮超时 120s
  totalTimeout: 300000,                // 总超时 300s
  // 质量保障配置
  qualityGuarantee: QUALITY_GUARANTEE_CONFIG,
} as const;
