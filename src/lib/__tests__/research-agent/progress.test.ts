/**
 * Progress Calculator Tests
 */

import {
  calculateOverallProgress,
  calculatePlannerProgress,
  calculateSearcherProgress,
  calculateExtractorProgress,
  calculateAnalyzerProgress,
  calculateReporterProgress,
  generateProgressDetail,
  STAGE_PROGRESS_CONFIG,
  DEFAULT_QUALITY_THRESHOLDS,
} from '../../research-agent/progress/calculator';
import type { ResearchState } from '../../research-agent/state';

describe('Progress Calculator', () => {
  describe('STAGE_PROGRESS_CONFIG', () => {
    it('should have 5 stages', () => {
      expect(STAGE_PROGRESS_CONFIG).toHaveLength(5);
    });

    it('should cover all agent stages', () => {
      const stages = STAGE_PROGRESS_CONFIG.map(c => c.stage);
      expect(stages).toContain('planner');
      expect(stages).toContain('searcher');
      expect(stages).toContain('extractor');
      expect(stages).toContain('analyzer');
      expect(stages).toContain('reporter');
    });

    it('should have valid progress ranges', () => {
      for (const config of STAGE_PROGRESS_CONFIG) {
        expect(config.baseProgress).toBeGreaterThanOrEqual(0);
        expect(config.maxProgress).toBeLessThanOrEqual(100);
        expect(config.baseProgress).toBeLessThan(config.maxProgress);
      }
    });
  });

  describe('DEFAULT_QUALITY_THRESHOLDS', () => {
    it('should have valid threshold values', () => {
      expect(DEFAULT_QUALITY_THRESHOLDS.minSearchResults).toBeGreaterThan(0);
      expect(DEFAULT_QUALITY_THRESHOLDS.minExtractions).toBeGreaterThan(0);
      expect(DEFAULT_QUALITY_THRESHOLDS.minFeatures).toBeGreaterThan(0);
      expect(DEFAULT_QUALITY_THRESHOLDS.minCompetitors).toBeGreaterThan(0);
      expect(DEFAULT_QUALITY_THRESHOLDS.minConfidenceScore).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_QUALITY_THRESHOLDS.minConfidenceScore).toBeLessThanOrEqual(1);
    });
  });

  describe('calculatePlannerProgress', () => {
    it('should return 100% when pendingQueries exist', () => {
      const state = createMockState({
        pendingQueries: [{ id: 'q1', query: 'test', purpose: 'test', dimension: 'general', priority: 5 }],
        status: 'planning'
      });
      expect(calculatePlannerProgress(state)).toBe(100);
    });

    it('should return 50% when planning', () => {
      const state = createMockState({ status: 'planning' });
      expect(calculatePlannerProgress(state)).toBe(50);
    });

    it('should return 100% when past planning stage', () => {
      const state = createMockState({ status: 'searching' });
      expect(calculatePlannerProgress(state)).toBe(100);
    });

    it('should return 0% for pending status', () => {
      const state = createMockState({ status: 'pending', pendingQueries: [] });
      expect(calculatePlannerProgress(state)).toBe(0);
    });
  });

  describe('calculateSearcherProgress', () => {
    it('should return 0% for pending or planning status', () => {
      expect(calculateSearcherProgress(createMockState({ status: 'pending' }), DEFAULT_QUALITY_THRESHOLDS)).toBe(0);
      expect(calculateSearcherProgress(createMockState({ status: 'planning' }), DEFAULT_QUALITY_THRESHOLDS)).toBe(0);
    });

    it('should return 100% when target reached', () => {
      const state = createMockState({
        status: 'searching',
        searchResults: Array(20).fill({ url: 'http://test.com', title: 'Test', source: 'duckduckgo', quality: 8, crawled: false, queryId: 'q1', dimension: 'general' }),
      });
      expect(calculateSearcherProgress(state, DEFAULT_QUALITY_THRESHOLDS)).toBe(100);
    });

    it('should calculate progress proportionally', () => {
      const state = createMockState({
        status: 'searching',
        searchResults: Array(7).fill({ url: 'http://test.com', title: 'Test', source: 'duckduckgo', quality: 8, crawled: false, queryId: 'q1', dimension: 'general' }),
      });
      const progress = calculateSearcherProgress(state, DEFAULT_QUALITY_THRESHOLDS);
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(100);
    });
  });

  describe('calculateExtractorProgress', () => {
    it('should return 0% for early stages', () => {
      expect(calculateExtractorProgress(createMockState({ status: 'pending' }), DEFAULT_QUALITY_THRESHOLDS)).toBe(0);
      expect(calculateExtractorProgress(createMockState({ status: 'planning' }), DEFAULT_QUALITY_THRESHOLDS)).toBe(0);
      expect(calculateExtractorProgress(createMockState({ status: 'searching' }), DEFAULT_QUALITY_THRESHOLDS)).toBe(0);
    });

    it('should return 0% when no search results', () => {
      const state = createMockState({ status: 'extracting', searchResults: [] });
      expect(calculateExtractorProgress(state, DEFAULT_QUALITY_THRESHOLDS)).toBe(0);
    });

    it('should return 100% when target reached', () => {
      const state = createMockState({
        status: 'extracting',
        searchResults: Array(10).fill({ url: 'http://test.com', title: 'Test', source: 'duckduckgo', quality: 8, crawled: false, queryId: 'q1', dimension: 'general' }),
        extractedContent: Array(5).fill({ url: 'http://test.com', source: 'duckduckgo', title: 'Test', content: 'Test content', metadata: { crawledAt: new Date().toISOString(), contentLength: 1000, qualityScore: 8, features: [], competitors: [], techStack: [] } }),
      });
      expect(calculateExtractorProgress(state, DEFAULT_QUALITY_THRESHOLDS)).toBe(100);
    });
  });

  describe('calculateAnalyzerProgress', () => {
    it('should return 0% for early stages', () => {
      const thresholds = DEFAULT_QUALITY_THRESHOLDS;
      expect(calculateAnalyzerProgress(createMockState({ status: 'pending' }), thresholds)).toBe(0);
      expect(calculateAnalyzerProgress(createMockState({ status: 'planning' }), thresholds)).toBe(0);
    });

    it('should return 50% when analyzing without results', () => {
      const state = createMockState({ status: 'analyzing' });
      expect(calculateAnalyzerProgress(state, DEFAULT_QUALITY_THRESHOLDS)).toBe(50);
    });

    it('should return 100% when all thresholds met', () => {
      const state = createMockState({
        status: 'completed',
        analysis: {
          features: Array(5).fill({ name: 'Feature', count: 1, sources: [], description: 'Test' }),
          competitors: Array(3).fill({ name: 'Competitor', industry: 'Tech', features: [], description: 'Test', marketPosition: 'Leader' }),
          swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
          marketData: { marketSize: '', growthRate: '', keyPlayers: [], trends: [] },
          confidenceScore: 0.8,
          dataGaps: [],
        },
      });
      expect(calculateAnalyzerProgress(state, DEFAULT_QUALITY_THRESHOLDS)).toBe(100);
    });
  });

  describe('calculateReporterProgress', () => {
    it('should return 100% for completed status', () => {
      expect(calculateReporterProgress(createMockState({ status: 'completed' }))).toBe(100);
    });

    it('should return 50% when reporting', () => {
      expect(calculateReporterProgress(createMockState({ status: 'reporting' }))).toBe(50);
    });

    it('should return 25% when analysis completed', () => {
      const state = createMockState({
        status: 'analyzing',
        analysis: {
          features: [],
          competitors: [],
          swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
          marketData: { marketSize: '', growthRate: '', keyPlayers: [], trends: [] },
          confidenceScore: 0.5,
          dataGaps: [],
        },
      });
      expect(calculateReporterProgress(state)).toBe(25);
    });

    it('should return 0% for other statuses', () => {
      expect(calculateReporterProgress(createMockState({ status: 'pending' }))).toBe(0);
      expect(calculateReporterProgress(createMockState({ status: 'planning' }))).toBe(0);
    });
  });

  describe('calculateOverallProgress', () => {
    it('should return 100% for completed status', () => {
      const state = createMockState({ status: 'completed', progress: 100 });
      expect(calculateOverallProgress(state)).toBe(100);
    });

    it('should return current progress for failed status', () => {
      const state = createMockState({ status: 'failed', progress: 50 });
      expect(calculateOverallProgress(state)).toBe(50);
    });

    it('should return current progress for cancelled status', () => {
      const state = createMockState({ status: 'cancelled', progress: 30 });
      expect(calculateOverallProgress(state)).toBe(30);
    });

    it('should calculate progress within valid range', () => {
      const state = createMockState({ status: 'searching' });
      const progress = calculateOverallProgress(state);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });
  });

  describe('generateProgressDetail', () => {
    it('should generate detail for planner stage', () => {
      const state = createMockState({ currentStep: 'planner', status: 'planning' });
      const detail = generateProgressDetail(state);
      expect(detail.stage).toBe('planner');
      expect(detail.step).toBe('生成研究计划');
    });

    it('should generate detail for searcher stage', () => {
      const state = createMockState({
        currentStep: 'searcher',
        status: 'searching',
        searchResults: Array(5).fill({ url: 'http://test.com', title: 'Test', source: 'duckduckgo', quality: 8, crawled: false, queryId: 'q1', dimension: 'general' }),
        totalSearches: 3,
      });
      const detail = generateProgressDetail(state);
      expect(detail.stage).toBe('searcher');
      expect(detail.step).toBe('执行搜索');
      expect(detail.completedItems).toBe(3);
    });

    it('should generate detail for reporter stage', () => {
      const state = createMockState({ currentStep: 'reporter', status: 'completed' });
      const detail = generateProgressDetail(state);
      expect(detail.stage).toBe('reporter');
      expect(detail.step).toBe('生成报告');
      expect(detail.currentItem).toBe('报告完成');
    });
  });
});

// Helper function to create mock state
function createMockState(overrides: Partial<ResearchState> = {}): ResearchState {
  return {
    projectId: 'test-project',
    title: 'Test Project',
    status: 'pending',
    currentStep: 'planner',
    progress: 0,
    progressMessage: 'Test',
    progressDetail: undefined,
    iterationsUsed: 0,
    totalSearches: 0,
    totalResults: 0,
    searchResults: [],
    pendingQueries: [],
    extractedContent: [],
    analysis: undefined,
    citations: [],
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: undefined,
    retryCount: 0,
    maxRetries: 3,
    keywords: [],
    ...overrides,
  };
}
