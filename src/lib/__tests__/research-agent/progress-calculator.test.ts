/**
 * Progress Module Tests
 */

import { describe, it, expect } from '@jest/globals';
import type { ResearchState } from '../../research-agent/state';

// Import from the actual calculator module
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
  type StageProgressConfig,
  type ProgressQualityThresholds,
} from '../../research-agent/progress/calculator';

describe('Progress Calculator', () => {
  describe('STAGE_PROGRESS_CONFIG', () => {
    it('should have correct stage order', () => {
      const stages = STAGE_PROGRESS_CONFIG.map(c => c.stage);
      expect(stages).toEqual(['planner', 'searcher', 'extractor', 'analyzer', 'reporter']);
    });

    it('should have continuous progress ranges', () => {
      for (let i = 0; i < STAGE_PROGRESS_CONFIG.length - 1; i++) {
        const current = STAGE_PROGRESS_CONFIG[i];
        const next = STAGE_PROGRESS_CONFIG[i + 1];
        expect(current.maxProgress).toBe(next.baseProgress);
      }
    });

    it('should have valid progress ranges', () => {
      STAGE_PROGRESS_CONFIG.forEach(config => {
        expect(config.baseProgress).toBeGreaterThanOrEqual(0);
        expect(config.maxProgress).toBeGreaterThan(config.baseProgress);
        expect(config.maxProgress).toBeLessThanOrEqual(100);
        expect(config.weight).toBeGreaterThan(0);
        expect(config.weight).toBeLessThanOrEqual(1);
      });
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

    it('should have reasonable threshold values', () => {
      // These are practical thresholds for a research task
      expect(DEFAULT_QUALITY_THRESHOLDS.minSearchResults).toBeGreaterThanOrEqual(5);
      expect(DEFAULT_QUALITY_THRESHOLDS.minExtractions).toBeGreaterThanOrEqual(3);
      expect(DEFAULT_QUALITY_THRESHOLDS.minFeatures).toBeGreaterThanOrEqual(2);
      expect(DEFAULT_QUALITY_THRESHOLDS.minCompetitors).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateOverallProgress', () => {
    it('should return 100% for completed status', () => {
      const completedState: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: 'completed',
        currentStep: 'reporter',
        progress: 100,
        progressMessage: '完成',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };

      expect(calculateOverallProgress(completedState)).toBe(100);
    });

    it('should return current progress for failed status', () => {
      const failedState: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: 'failed',
        currentStep: 'searcher',
        progress: 45,
        progressMessage: '失败',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };

      expect(calculateOverallProgress(failedState)).toBe(45);
    });

    it('should return current progress for cancelled status', () => {
      const cancelledState: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: 'cancelled',
        currentStep: 'extractor',
        progress: 55,
        progressMessage: '已取消',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };

      expect(calculateOverallProgress(cancelledState)).toBe(55);
    });

    it('should calculate progress for planning stage', () => {
      const planningState: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: 'planning',
        currentStep: 'planner',
        progress: 10,
        progressMessage: '规划中',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };

      const progress = calculateOverallProgress(planningState);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(20);
    });
  });

  describe('calculatePlannerProgress', () => {
    it('should return 100% when queries are generated', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: 'searching',
        currentStep: 'searcher',
        progress: 25,
        progressMessage: '开始搜索',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [{ id: 'q1', query: 'test', purpose: '', dimension: '', priority: 5 }],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };

      expect(calculatePlannerProgress(state)).toBe(100);
    });

    it('should return 50% during planning', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: 'planning',
        currentStep: 'planner',
        progress: 5,
        progressMessage: '规划中',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };

      expect(calculatePlannerProgress(state)).toBe(50);
    });

    it('should return 0% before planning', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: 'pending',
        currentStep: 'planner',
        progress: 0,
        progressMessage: '等待开始',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };

      expect(calculatePlannerProgress(state)).toBe(0);
    });
  });

  describe('calculateSearcherProgress', () => {
    it('should return 0% before searching', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: 'pending',
        currentStep: 'planner',
        progress: 0,
        progressMessage: '',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };

      expect(calculateSearcherProgress(state, DEFAULT_QUALITY_THRESHOLDS)).toBe(0);
    });

    it('should return 0% during planning', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: 'planning',
        currentStep: 'planner',
        progress: 10,
        progressMessage: '',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };

      expect(calculateSearcherProgress(state, DEFAULT_QUALITY_THRESHOLDS)).toBe(0);
    });

    it('should calculate progress based on search results count', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: 'searching',
        currentStep: 'searcher',
        progress: 25,
        progressMessage: '',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [{ id: 'q1', query: 'test', purpose: '', dimension: '', priority: 5 }],
        searchResults: [
          { id: 'sr1', source: 'duckduckgo', title: '', url: '', content: '', quality: 5, crawled: false, queryId: 'q1', dimension: '' },
          { id: 'sr2', source: 'duckduckgo', title: '', url: '', content: '', quality: 6, crawled: false, queryId: 'q1', dimension: '' },
          { id: 'sr3', source: 'duckduckgo', title: '', url: '', content: '', quality: 7, crawled: false, queryId: 'q1', dimension: '' },
        ],
        extractedContent: [],
        totalSearches: 3,
        maxRetries: 3,
      };

      const progress = calculateSearcherProgress(state, DEFAULT_QUALITY_THRESHOLDS);
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(100);
    });

    it('should return 100% when threshold is met', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: 'extracting',
        currentStep: 'extractor',
        progress: 45,
        progressMessage: '',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [{ id: 'q1', query: 'test', purpose: '', dimension: '', priority: 5 }],
        searchResults: Array(DEFAULT_QUALITY_THRESHOLDS.minSearchResults + 5).fill(null).map((_, i) => ({
          id: `sr${i}`,
          source: 'duckduckgo' as const,
          title: '',
          url: '',
          content: '',
          quality: 5,
          crawled: false,
          queryId: 'q1',
          dimension: '',
        })),
        extractedContent: [],
        totalSearches: DEFAULT_QUALITY_THRESHOLDS.minSearchResults + 5,
        maxRetries: 3,
      };

      expect(calculateSearcherProgress(state, DEFAULT_QUALITY_THRESHOLDS)).toBe(100);
    });
  });

  describe('generateProgressDetail', () => {
    it('should generate detail for planner stage', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test Research',
        status: 'planning',
        currentStep: 'planner',
        progress: 10,
        progressMessage: '生成研究计划',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };

      const detail = generateProgressDetail(state);
      expect(detail.stage).toBe('planner');
      expect(detail.step).toContain('研究计划');
      expect(detail.totalItems).toBe(3);
    });

    it('should generate detail for searcher stage', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test Research',
        status: 'searching',
        currentStep: 'searcher',
        progress: 30,
        progressMessage: '执行搜索',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [{ id: 'q1', query: 'test', purpose: '', dimension: '', priority: 5 }],
        searchResults: [
          { id: 'sr1', source: 'duckduckgo', title: '', url: '', content: '', quality: 5, crawled: false, queryId: 'q1', dimension: '' },
        ],
        extractedContent: [],
        totalSearches: 1,
        maxRetries: 3,
      };

      const detail = generateProgressDetail(state);
      expect(detail.stage).toBe('searcher');
      expect(detail.step).toContain('搜索');
      expect(detail.completedItems).toBe(1);
      expect(detail.currentItem).toContain('1');
    });

    it('should generate detail for extractor stage', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test Research',
        status: 'extracting',
        currentStep: 'extractor',
        progress: 50,
        progressMessage: '提取内容',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [{ id: 'q1', query: 'test', purpose: '', dimension: '', priority: 5 }],
        searchResults: [
          { id: 'sr1', source: 'duckduckgo', title: '', url: '', content: '', quality: 5, crawled: false, queryId: 'q1', dimension: '' },
          { id: 'sr2', source: 'duckduckgo', title: '', url: '', content: '', quality: 5, crawled: false, queryId: 'q1', dimension: '' },
        ],
        extractedContent: [
          { url: 'https://example.com', source: 'duckduckgo', title: '', content: '', metadata: { crawledAt: '', contentLength: 0, qualityScore: 5, features: [], competitors: [], techStack: [] } },
        ],
        totalSearches: 2,
        maxRetries: 3,
      };

      const detail = generateProgressDetail(state);
      expect(detail.stage).toBe('extractor');
      expect(detail.step).toContain('提取');
      expect(detail.completedItems).toBe(1);
    });

    it('should generate detail for analyzer stage', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test Research',
        status: 'analyzing',
        currentStep: 'analyzer',
        progress: 65,
        progressMessage: '分析内容',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
        analysis: {
          features: [],
          competitors: [],
          swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
          marketData: { marketSize: '', growthRate: '', keyPlayers: [], trends: [] },
          confidenceScore: 0.5,
          dataGaps: [],
        },
      };

      const detail = generateProgressDetail(state);
      expect(detail.stage).toBe('analyzer');
      expect(detail.step).toContain('分析');
      expect(detail.currentItem).toContain('50%');
    });

    it('should generate detail for reporter stage', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test Research',
        status: 'reporting',
        currentStep: 'reporter',
        progress: 85,
        progressMessage: '生成报告',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };

      const detail = generateProgressDetail(state);
      expect(detail.stage).toBe('reporter');
      expect(detail.step).toContain('报告');
    });
  });

  describe('calculateExtractorProgress', () => {
    it('should return 0% before extracting', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: 'searching',
        currentStep: 'searcher',
        progress: 30,
        progressMessage: '',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };

      expect(calculateExtractorProgress(state, DEFAULT_QUALITY_THRESHOLDS)).toBe(0);
    });

    it('should return 0% when no search results exist', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: 'extracting',
        currentStep: 'extractor',
        progress: 40,
        progressMessage: '',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };

      expect(calculateExtractorProgress(state, DEFAULT_QUALITY_THRESHOLDS)).toBe(0);
    });
  });

  describe('calculateAnalyzerProgress', () => {
    it('should return 0% before analyzing', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: 'extracting',
        currentStep: 'extractor',
        progress: 50,
        progressMessage: '',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };

      expect(calculateAnalyzerProgress(state, DEFAULT_QUALITY_THRESHOLDS)).toBe(0);
    });

    it('should return 50% during analysis', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: 'analyzing',
        currentStep: 'analyzer',
        progress: 65,
        progressMessage: '',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
        analysis: undefined,
      };

      expect(calculateAnalyzerProgress(state, DEFAULT_QUALITY_THRESHOLDS)).toBe(50);
    });
  });

  describe('calculateReporterProgress', () => {
    it('should return 100% when completed', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: 'completed',
        currentStep: 'reporter',
        progress: 100,
        progressMessage: '',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };

      expect(calculateReporterProgress(state)).toBe(100);
    });

    it('should return 50% during reporting', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: 'reporting',
        currentStep: 'reporter',
        progress: 90,
        progressMessage: '',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };

      expect(calculateReporterProgress(state)).toBe(50);
    });
  });
});
