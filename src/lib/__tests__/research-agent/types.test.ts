/**
 * Types and State Tests
 */

import type {
  ResearchStatus,
  AgentName,
  DataSourceType,
  ResearchTask,
  SearchQuery,
  SearchPlan,
  QualityThresholds,
  SearchResult,
  ExtractionResult,
  FeatureAnalysis,
  CompetitorAnalysis,
  SWOTAnalysis,
  MarketData,
  AnalysisResult,
  ReportSection,
  MermaidChart,
  ReportMetadata,
  Citation,
  DataQualityCheck,
  DimensionCoverage,
  AgentResult,
  StageFailureSummary,
  AgentTimeoutConfig,
  OperationTimeouts,
  ProgressDetail,
  ProgressState,
  CancellationState,
  BackupConfig,
  BackupManifest,
} from '../../research-agent/types';
import type { ResearchState } from '../../research-agent/state';

describe('Research Agent Types', () => {
  describe('ResearchStatus', () => {
    it('should allow all valid statuses', () => {
      const statuses: ResearchStatus[] = [
        'pending',
        'planning',
        'searching',
        'extracting',
        'analyzing',
        'reporting',
        'completed',
        'failed',
        'cancelled',
      ];

      expect(statuses).toHaveLength(9);
    });
  });

  describe('AgentName', () => {
    it('should allow all agent names', () => {
      const agents: AgentName[] = ['planner', 'searcher', 'extractor', 'analyzer', 'reporter'];
      expect(agents).toHaveLength(5);
    });
  });

  describe('DataSourceType', () => {
    it('should include expected data sources', () => {
      const sources: DataSourceType[] = [
        'rss-hackernews',
        'rss-techcrunch',
        'rss-theverge',
        'rss-wired',
        'rss-producthunt',
        'duckduckgo',
        'reddit',
        'v2ex',
        'crawl4ai',
      ];

      expect(sources).toHaveLength(9);
    });
  });

  describe('SearchQuery', () => {
    it('should allow valid search query objects', () => {
      const query: SearchQuery = {
        id: 'q1',
        query: 'AI products 2024',
        purpose: 'Find AI product information',
        dimension: 'product_features',
        priority: 5,
        hints: 'Look for recent launches',
      };

      expect(query.id).toBe('q1');
      expect(query.priority).toBeGreaterThanOrEqual(1);
      expect(query.priority).toBeLessThanOrEqual(5);
    });
  });

  describe('SearchResult', () => {
    it('should allow valid search result objects', () => {
      const result: SearchResult = {
        id: 'r1',
        source: 'duckduckgo',
        title: 'Test Product',
        url: 'https://example.com',
        content: 'Product description',
        quality: 8,
        crawled: false,
        queryId: 'q1',
        dimension: 'general',
      };

      expect(result.quality).toBeGreaterThanOrEqual(0);
      expect(result.quality).toBeLessThanOrEqual(10);
    });
  });

  describe('ExtractionResult', () => {
    it('should allow valid extraction result objects', () => {
      const result: ExtractionResult = {
        url: 'https://example.com',
        source: 'duckduckgo',
        title: 'Test',
        content: 'Full content here',
        metadata: {
          crawledAt: new Date().toISOString(),
          contentLength: 1000,
          qualityScore: 8,
          features: ['feature1', 'feature2'],
          competitors: ['competitor1'],
          techStack: ['React', 'TypeScript'],
        },
      };

      expect(result.metadata.features).toHaveLength(2);
    });
  });

  describe('AnalysisResult', () => {
    it('should allow valid analysis result objects', () => {
      const result: AnalysisResult = {
        features: [
          { name: 'AI Chat', count: 10, sources: ['source1'], description: 'AI-powered chat' },
        ],
        competitors: [
          { name: 'Competitor A', industry: 'Tech', features: ['chat'], description: 'Main competitor', marketPosition: 'Leader' },
        ],
        swot: {
          strengths: ['AI technology'],
          weaknesses: ['Limited market'],
          opportunities: ['Growing demand'],
          threats: ['Competition'],
        },
        marketData: {
          marketSize: '$10B',
          growthRate: '20%',
          keyPlayers: ['Company A', 'Company B'],
          trends: ['AI adoption'],
        },
        confidenceScore: 0.85,
        dataGaps: [],
      };

      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });
  });

  describe('AgentResult', () => {
    it('should allow successful agent results', () => {
      const result: AgentResult<string> = {
        success: true,
        data: 'Processed data',
        metadata: {
          attemptedAt: new Date().toISOString(),
          duration: 5000,
          attempts: 1,
        },
      };

      expect(result.success).toBe(true);
      expect(result.data).toBe('Processed data');
    });

    it('should allow failed agent results with error', () => {
      const result: AgentResult<string> = {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'Operation timed out',
          retryable: true,
        },
        metadata: {
          attemptedAt: new Date().toISOString(),
          duration: 30000,
          attempts: 3,
        },
      };

      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(true);
    });
  });

  describe('ProgressDetail', () => {
    it('should allow valid progress detail objects', () => {
      const detail: ProgressDetail = {
        stage: 'searching',
        step: '执行搜索',
        totalItems: 15,
        completedItems: 8,
        currentItem: '正在搜索第 8 条',
        percentage: 53,
        estimatedTimeRemaining: 120,
      };

      expect(detail.percentage).toBeGreaterThanOrEqual(0);
      expect(detail.percentage).toBeLessThanOrEqual(100);
    });
  });

  describe('CancellationState', () => {
    it('should allow valid cancellation state objects', () => {
      const state: CancellationState = {
        projectId: 'project-1',
        requestedAt: new Date().toISOString(),
        requestedBy: 'user-1',
        status: 'pending',
        forced: false,
      };

      expect(state.status).toBe('pending');
      expect(state.forced).toBe(false);
    });

    it('should allow all status values', () => {
      const statuses: CancellationState['status'][] = ['pending', 'processing', 'completed', 'timeout'];
      expect(statuses).toHaveLength(4);
    });
  });

  describe('BackupManifest', () => {
    it('should allow valid backup manifest objects', () => {
      const manifest: BackupManifest = {
        backupId: 'backup-1',
        projectId: 'project-1',
        createdAt: new Date().toISOString(),
        stateSnapshot: 'searching',
        checksum: 'abc123...',
        size: 1024,
      };

      expect(manifest.checksum).toBeDefined();
      expect(manifest.size).toBeGreaterThan(0);
    });
  });
});

describe('ResearchState', () => {
  it('should allow valid research state objects', () => {
    const state: ResearchState = {
      projectId: 'project-1',
      title: 'Product Research',
      status: 'searching',
      currentStep: 'searcher',
      progress: 35,
      progressMessage: 'Searching for products...',
      progressDetail: {
        stage: 'searcher',
        step: '执行搜索',
        totalItems: 15,
        completedItems: 5,
        currentItem: '搜索中...',
        percentage: 35,
      },
      iterationsUsed: 1,
      totalSearches: 5,
      totalResults: 25,
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
      keywords: ['AI', 'product'],
    };

    expect(state.status).toBe('searching');
    expect(state.progress).toBe(35);
    expect(state.keywords).toHaveLength(2);
  });

  it('should allow completed state', () => {
    const state: ResearchState = {
      projectId: 'project-1',
      title: 'Product Research',
      status: 'completed',
      currentStep: 'reporter',
      progress: 100,
      progressMessage: 'Research completed',
      progressDetail: undefined,
      iterationsUsed: 2,
      totalSearches: 10,
      totalResults: 50,
      searchResults: [],
      pendingQueries: [],
      extractedContent: [],
      analysis: {
        features: [],
        competitors: [],
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        marketData: { marketSize: '', growthRate: '', keyPlayers: [], trends: [] },
        confidenceScore: 0.9,
        dataGaps: [],
      },
      citations: [],
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      retryCount: 1,
      maxRetries: 3,
      keywords: [],
    };

    expect(state.status).toBe('completed');
    expect(state.progress).toBe(100);
    expect(state.completedAt).toBeDefined();
  });
});
