export const RESEARCH_QUALITY_THRESHOLDS = {
  minSearchResults: 15,
  minExtractions: 5,
  minFeatures: 3,
  minCompetitors: 2,
  completionScore: 60,
  minConfidenceScore: 0.5,
} as const;

export const SEARCHER_DEFAULTS = {
  minQualityScore: 3,
  maxResults: 150,
  searchRounds: 10,
  targetDataPoints: 100,
} as const;
