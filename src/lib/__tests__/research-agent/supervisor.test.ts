/**
 * Supervisor Tests
 *
 * 测试 Supervisor Agent 的路由决策逻辑，包括：
 * - LLM 响应解析的各种边界情况
 * - shouldContinue 字段的默认值处理
 * - 无效 nextAgent 的降级处理
 * - getDefaultDecision 默认决策逻辑
 * - 重试保护机制
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { ResearchState } from '../../research-agent/state';
import type { SupervisorConfig, SupervisorDecision } from '../../research-agent/supervisor';
import { createSupervisorAgent } from '../../research-agent/supervisor';

// Mock LLM module
jest.mock('../../llm', () => ({
  generateText: jest.fn(),
}));

import { generateText } from '../../llm';

describe('Supervisor', () => {
  const baseState: ResearchState = {
    projectId: 'test-project',
    title: 'Test Research',
    description: '',
    keywords: ['test'],
    status: 'pending',
    currentStep: 'supervisor',
    progress: 0,
    progressMessage: '',
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
  };

  const defaultConfig: SupervisorConfig = {
    maxRetries: 3,
    qualityThresholds: {
      minSearchResults: 15,
      minExtractions: 5,
      minFeatures: 3,
      minCompetitors: 2,
      completionScore: 60,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSupervisorAgent', () => {
    it('should create supervisor agent with correct config', () => {
      const agent = createSupervisorAgent(defaultConfig);

      expect(agent).toBeDefined();
      expect(typeof agent.makeDecision).toBe('function');
      expect(typeof agent.assessQuality).toBe('function');
      expect(typeof agent.synthesize).toBe('function');
    });

    it('should have default config when not provided', () => {
      const agent = createSupervisorAgent();

      expect(agent.config.maxRetries).toBe(3);
      expect(agent.config.qualityThresholds.minSearchResults).toBe(15);
    });
  });

  describe('makeRoutingDecision - LLM 响应解析', () => {
    it('should return planner for pending status', async () => {
      (generateText as jest.Mock).mockResolvedValue(JSON.stringify({
        nextAgent: 'planner',
        reason: '任务尚未开始',
        instructions: '创建研究计划',
        shouldContinue: true,
      }));

      const agent = createSupervisorAgent(defaultConfig);
      const decision = await agent.makeDecision({ ...baseState, status: 'pending' });

      expect(decision.nextAgent).toBe('planner');
      expect(decision.shouldContinue).toBe(true);
    });

    it('should return searcher for planning status', async () => {
      (generateText as jest.Mock).mockResolvedValue(JSON.stringify({
        nextAgent: 'searcher',
        reason: '计划已生成',
        instructions: '执行搜索',
        shouldContinue: true,
      }));

      const agent = createSupervisorAgent(defaultConfig);
      const decision = await agent.makeDecision({ ...baseState, status: 'planning' });

      expect(decision.nextAgent).toBe('searcher');
      expect(decision.shouldContinue).toBe(true);
    });

    it('should return extractor for searching status with enough results', async () => {
      (generateText as jest.Mock).mockResolvedValue(JSON.stringify({
        nextAgent: 'extractor',
        reason: '搜索结果充足',
        instructions: '开始提取',
        shouldContinue: true,
      }));

      const agent = createSupervisorAgent(defaultConfig);
      const stateWithResults = {
        ...baseState,
        status: 'searching' as const,
        searchResults: Array(20).fill({ id: 'r1', title: 'Result', url: 'http://test.com', source: 'duckduckgo' as const, quality: 8, content: 'content', retrievedAt: new Date().toISOString() }),
      };
      const decision = await agent.makeDecision(stateWithResults);

      expect(decision.nextAgent).toBe('extractor');
      expect(decision.shouldContinue).toBe(true);
    });

    it('should return analyzer for extracting status', async () => {
      (generateText as jest.Mock).mockResolvedValue(JSON.stringify({
        nextAgent: 'analyzer',
        reason: '提取完成',
        instructions: '开始分析',
        shouldContinue: true,
      }));

      const agent = createSupervisorAgent(defaultConfig);
      const stateWithExtractions = {
        ...baseState,
        status: 'extracting' as const,
        extractedContent: Array(10).fill({ url: 'http://test.com', source: 'duckduckgo' as const, title: 'Test', content: 'content', metadata: { crawledAt: '', contentLength: 100, qualityScore: 8, features: [], competitors: [], techStack: [] } }),
      };
      const decision = await agent.makeDecision(stateWithExtractions);

      expect(decision.nextAgent).toBe('analyzer');
    });

    it('should return reporter for analyzing status with analysis', async () => {
      (generateText as jest.Mock).mockResolvedValue(JSON.stringify({
        nextAgent: 'reporter',
        reason: '分析完成',
        instructions: '生成报告',
        shouldContinue: true,
      }));

      const agent = createSupervisorAgent(defaultConfig);
      const stateWithAnalysis = {
        ...baseState,
        status: 'analyzing' as const,
        analysis: {
          features: [{ name: 'Feature 1', count: 5, sources: [], description: 'Desc' }],
          competitors: [{ name: 'Competitor A', industry: 'Tech', features: [], description: '', marketPosition: 'Leader' }],
          swot: { strengths: ['Strong'], weaknesses: [], opportunities: [], threats: [] },
          marketData: { marketSize: '100M', growthRate: '10%', keyPlayers: [], trends: [] },
          confidenceScore: 0.8,
          dataGaps: [],
        },
      };
      const decision = await agent.makeDecision(stateWithAnalysis);

      expect(decision.nextAgent).toBe('reporter');
    });

    it('should return done for reporting status', async () => {
      (generateText as jest.Mock).mockResolvedValue(JSON.stringify({
        nextAgent: 'done',
        reason: '报告生成完成',
        instructions: '任务完成',
        shouldContinue: false,
      }));

      const agent = createSupervisorAgent(defaultConfig);
      const decision = await agent.makeDecision({ ...baseState, status: 'reporting' });

      expect(decision.nextAgent).toBe('done');
      expect(decision.shouldContinue).toBe(false);
    });

    it('should use default decision when LLM response is invalid JSON', async () => {
      (generateText as jest.Mock).mockResolvedValue('invalid json response');

      const agent = createSupervisorAgent(defaultConfig);
      const decision = await agent.makeDecision({ ...baseState, status: 'pending' });

      expect(decision.nextAgent).toBe('planner');
    });

    it('should use default decision when nextAgent is invalid', async () => {
      (generateText as jest.Mock).mockResolvedValue(JSON.stringify({
        nextAgent: 'invalid-agent',
        reason: '测试无效 agent',
        shouldContinue: true,
      }));

      const agent = createSupervisorAgent(defaultConfig);
      const decision = await agent.makeDecision({ ...baseState, status: 'pending' });

      expect(['planner', 'searcher', 'extractor', 'analyzer', 'reporter', 'done']).toContain(decision.nextAgent);
    });

    it('should default shouldContinue to true when not specified', async () => {
      (generateText as jest.Mock).mockResolvedValue(JSON.stringify({
        nextAgent: 'searcher',
        reason: '测试默认 shouldContinue',
      }));

      const agent = createSupervisorAgent(defaultConfig);
      const decision = await agent.makeDecision({ ...baseState, status: 'planning' });

      expect(decision.shouldContinue).toBe(true);
    });
  });

  describe('assessQuality - 质量评估', () => {
    it('should assess complete research quality', () => {
      const agent = createSupervisorAgent(defaultConfig);
      const stateWithQuality = {
        ...baseState,
        status: 'analyzing' as const,
        searchResults: Array(20).fill({ id: 'r1', title: 'Result', url: 'http://test.com', source: 'duckduckgo' as const, quality: 8, content: 'content', retrievedAt: new Date().toISOString() }),
        extractedContent: Array(10).fill({ url: 'http://test.com', source: 'duckduckgo' as const, title: 'Test', content: 'content', metadata: { crawledAt: '', contentLength: 100, qualityScore: 8, features: [], competitors: [], techStack: [] } }),
        analysis: {
          features: [{ name: 'Feature 1', count: 5, sources: [], description: 'Desc' }],
          competitors: [{ name: 'Competitor A', industry: 'Tech', features: [], description: '', marketPosition: 'Leader' }],
          swot: { strengths: ['Strong'], weaknesses: [], opportunities: [], threats: [] },
          marketData: { marketSize: '100M', growthRate: '10%', keyPlayers: [], trends: [] },
          confidenceScore: 0.8,
          dataGaps: [],
        },
      };

      const assessment = agent.assessQuality(stateWithQuality);

      expect(assessment.isComplete).toBe(true);
      expect(assessment.score).toBeGreaterThan(60);
    });
  });

  describe('synthesize - 结果合成', () => {
    it('should synthesize results correctly', async () => {
      const agent = createSupervisorAgent(defaultConfig);
      const stateWithAnalysis = {
        ...baseState,
        searchResults: Array(15).fill({ id: 'r1', title: 'Result', url: 'http://test.com', source: 'duckduckgo' as const, quality: 8, content: 'content', retrievedAt: new Date().toISOString() }),
        extractedContent: Array(5).fill({ url: 'http://test.com', source: 'duckduckgo' as const, title: 'Test', content: 'content', metadata: { crawledAt: '', contentLength: 100, qualityScore: 8, features: [], competitors: [], techStack: [] } }),
        analysis: {
          features: [
            { name: 'Feature 1', count: 5, sources: [], description: 'Desc 1' },
            { name: 'Feature 2', count: 3, sources: [], description: 'Desc 2' },
          ],
          competitors: [
            { name: 'Competitor A', industry: 'Tech', features: [], description: '', marketPosition: 'Leader' },
          ],
          swot: {
            strengths: ['Strong brand', 'Good technology'],
            weaknesses: ['High cost'],
            opportunities: ['Market growth'],
            threats: ['Competition'],
          },
          marketData: { marketSize: '100M', growthRate: '10%', keyPlayers: [], trends: [] },
          confidenceScore: 0.75,
          dataGaps: [],
        },
      };

      const result = await agent.synthesize(stateWithAnalysis);

      expect(result.success).toBe(true);
      expect(result.summary).toContain('Test Research');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should fail when no analysis available', async () => {
      const agent = createSupervisorAgent(defaultConfig);
      const result = await agent.synthesize(baseState);

      expect(result.success).toBe(false);
      expect(result.summary).toContain('没有可合成的分析结果');
    });
  });
});
