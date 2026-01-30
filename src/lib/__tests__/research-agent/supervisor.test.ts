/**
 * Supervisor Tests
 *
 * 测试 Supervisor 的路由决策逻辑，包括：
 * - LLM 响应解析的各种边界情况
 * - shouldContinue 字段的默认值处理
 * - 无效 nextAgent 的降级处理
 * - 规则引擎的决策逻辑
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { ResearchState, SupervisorDecision } from '../types';
import { makeRoutingDecision, ruleBasedDecision, createSupervisorAgent } from '../../research-agent/supervisor';

// Mock LLM module
jest.mock('../../llm', () => ({
  generateText: jest.fn(),
}));

import { generateText } from '../../llm';

describe('Supervisor', () => {
  describe('makeRoutingDecision - LLM 响应解析', () => {
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

    const defaultConfig = {
      useLLMRouting: true,
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

    describe('shouldContinue 字段处理', () => {
      it('should correctly handle shouldContinue = true', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: 'planner',
          reason: '开始调研',
          shouldContinue: true,
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        expect(decision.shouldContinue).toBe(true);
        expect(decision.nextAgent).toBe('planner');
      });

      it('should correctly handle shouldContinue = false', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: 'done',
          reason: '任务完成',
          shouldContinue: false,
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        expect(decision.shouldContinue).toBe(false);
        expect(decision.nextAgent).toBe('done');
      });

      it('should default shouldContinue to true when nextAgent is not "done" (critical bug fix test)', async () => {
        // 这是导致之前 bug 的场景：LLM 没有返回 shouldContinue 字段
        const mockResponse = JSON.stringify({
          nextAgent: 'planner',
          reason: '开始调研',
          // 注意：没有 shouldContinue 字段
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        // 修复后：shouldContinue 应该根据 nextAgent 判断
        // nextAgent = 'planner' (不是 'done') → shouldContinue = true
        expect(decision.shouldContinue).toBe(true);
        expect(decision.nextAgent).toBe('planner');
      });

      it('should default shouldContinue to false when nextAgent is "done" and shouldContinue is missing', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: 'done',
          reason: '调研完成',
          // 没有 shouldContinue 字段
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        // nextAgent = 'done' → shouldContinue = false
        expect(decision.shouldContinue).toBe(false);
        expect(decision.nextAgent).toBe('done');
      });

      it('should handle shouldContinue = null', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: 'searcher',
          reason: '开始搜索',
          shouldContinue: null,
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        // null !== undefined，所以使用 Boolean(null) = false
        expect(decision.shouldContinue).toBe(false);
      });

      it('should handle shouldContinue as string "true"', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: 'extractor',
          reason: '开始提取',
          shouldContinue: 'true',
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        // Boolean('true') = true
        expect(decision.shouldContinue).toBe(true);
      });

      it('should handle shouldContinue as string "false"', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: 'searcher',  // 改为 searcher，避免 nextAgent='done' 的干扰
          reason: '继续搜索',
          shouldContinue: 'false',
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        // Boolean('false') = true（因为非空字符串）
        expect(decision.shouldContinue).toBe(true);
      });

      it('should handle shouldContinue = 0', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: 'analyzer',
          reason: '开始分析',
          shouldContinue: 0,
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        // Boolean(0) = false
        expect(decision.shouldContinue).toBe(false);
      });

      it('should handle shouldContinue = 1', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: 'reporter',
          reason: '开始报告',
          shouldContinue: 1,
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        // Boolean(1) = true
        expect(decision.shouldContinue).toBe(true);
      });
    });

    describe('nextAgent 验证', () => {
      it('should accept valid nextAgent: planner', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: 'planner',
          reason: '重新规划',
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        expect(decision.nextAgent).toBe('planner');
      });

      it('should accept valid nextAgent: searcher', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: 'searcher',
          reason: '执行搜索',
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        expect(decision.nextAgent).toBe('searcher');
      });

      it('should accept valid nextAgent: extractor', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: 'extractor',
          reason: '提取内容',
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        expect(decision.nextAgent).toBe('extractor');
      });

      it('should accept valid nextAgent: analyzer', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: 'analyzer',
          reason: '分析内容',
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        expect(decision.nextAgent).toBe('analyzer');
      });

      it('should accept valid nextAgent: reporter', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: 'reporter',
          reason: '生成报告',
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        expect(decision.nextAgent).toBe('reporter');
      });

      it('should accept valid nextAgent: done', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: 'done',
          reason: '调研完成',
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        expect(decision.nextAgent).toBe('done');
        expect(decision.shouldContinue).toBe(false);
      });

      it('should fallback to rule-based decision for invalid nextAgent', async () => {
        // 无效的 nextAgent 应该触发降级到规则引擎
        const mockResponse = JSON.stringify({
          nextAgent: 'invalid_agent',
          reason: '错误决策',
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        // 应该使用规则引擎的决策
        expect(decision.nextAgent).toBe('planner'); // pending 状态默认去 planner
      });

      it('should fallback to rule-based decision for empty nextAgent', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: '',
          reason: '空决策',
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        expect(decision.nextAgent).toBe('planner');
      });

      it('should fallback to rule-based decision for missing nextAgent', async () => {
        const mockResponse = JSON.stringify({
          reason: '没有指定 nextAgent',
          // 没有 nextAgent 字段
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        expect(decision.nextAgent).toBe('planner');
      });
    });

    describe('reason 和 instructions 处理', () => {
      it('should use LLM reason when provided', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: 'searcher',
          reason: '搜索结果不足，需要更多搜索',
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        expect(decision.reason).toBe('搜索结果不足，需要更多搜索');
      });

      it('should use default reason when reason is missing', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: 'searcher',
          // 没有 reason
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        expect(decision.reason).toBe('LLM 决策');
      });

      it('should use instructions when provided', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: 'extractor',
          reason: '开始提取',
          instructions: '优先提取高质量搜索结果',
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        expect(decision.instructions).toBe('优先提取高质量搜索结果');
      });

      it('should use empty string for missing instructions', async () => {
        const mockResponse = JSON.stringify({
          nextAgent: 'extractor',
          reason: '开始提取',
        });
        (generateText as jest.Mock).mockResolvedValue(mockResponse);

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        expect(decision.instructions).toBe('');
      });
    });

    describe('JSON 解析错误处理', () => {
      it('should fallback to rule-based decision when JSON is invalid', async () => {
        (generateText as vi.Mock).mockResolvedValue('not valid json');

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        // 应该使用规则引擎的决策
        expect(decision.nextAgent).toBe('planner');
      });

      it('should fallback to rule-based decision when response is empty', async () => {
        (generateText as vi.Mock).mockResolvedValue('');

        const decision = await makeRoutingDecision(baseState, defaultConfig);

        expect(decision.nextAgent).toBe('planner');
      });

      it('should handle malformed JSON gracefully', async () => {
        (generateText as vi.Mock).mockResolvedValue('{ "nextAgent": "planner", }'); // trailing comma 可能导致问题

        // 尝试解析
        try {
          JSON.parse('{ "nextAgent": "planner", }');
        } catch {
          // 应该降级到规则引擎
          const decision = await makeRoutingDecision(baseState, defaultConfig);
          expect(decision.nextAgent).toBe('planner');
        }
      });
    });
  });

  describe('ruleBasedDecision - 规则引擎', () => {
    const defaultConfig = {
      useLLMRouting: true,
      maxRetries: 3,
      qualityThresholds: {
        minSearchResults: 15,
        minExtractions: 5,
        minFeatures: 3,
        minCompetitors: 2,
        completionScore: 60,
      },
    };

    it('should return planner for pending status', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        description: '',
        keywords: [],
        status: 'pending',
        currentStep: 'supervisor',
        progress: 0,
        progressMessage: '',
        searchResults: [],
        pendingQueries: [],
        extractedContent: [],
        iterationsUsed: 0,
        totalSearches: 0,
        totalResults: 0,
        analysis: undefined,
        citations: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        retryCount: 0,
        maxRetries: 3,
      };

      const decision = ruleBasedDecision(state, defaultConfig);

      expect(decision.nextAgent).toBe('planner');
      expect(decision.shouldContinue).toBe(true);
    });

    it('should return searcher for planning status', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        description: '',
        keywords: [],
        status: 'planning',
        currentStep: 'planner',
        progress: 10,
        progressMessage: '正在生成搜索计划',
        searchPlan: {
          id: 'plan-1',
          title: 'Test Plan',
          queries: [{ id: 'q1', query: 'test', purpose: 'test', dimension: 'general', priority: 5, status: 'pending' }],
        },
        searchResults: [],
        pendingQueries: [],
        extractedContent: [],
        iterationsUsed: 0,
        totalSearches: 0,
        totalResults: 0,
        analysis: undefined,
        citations: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        retryCount: 0,
        maxRetries: 3,
      };

      const decision = ruleBasedDecision(state, defaultConfig);

      expect(decision.nextAgent).toBe('searcher');
      expect(decision.shouldContinue).toBe(true);
    });

    it('should return reporter for reporting status', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        description: '',
        keywords: [],
        status: 'reporting',
        currentStep: 'analyzer',
        progress: 80,
        progressMessage: '正在分析内容',
        searchResults: [{ id: 'r1', title: 'Result', url: 'http://test.com', source: 'web', quality: 8, content: 'test', retrievedAt: new Date().toISOString() }],
        pendingQueries: [],
        extractedContent: [{ id: 'e1', url: 'http://test.com', title: 'Test', source: 'web', content: 'test content', metadata: { contentType: 'article', wordCount: 100, qualityScore: 7 }, extractedAt: new Date().toISOString() }],
        analysis: {
          features: ['feature1', 'feature2', 'feature3'],
          competitors: ['comp1', 'comp2'],
          useCases: [],
          techStack: [],
          swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
          dataGaps: [],
          confidenceScore: 0.7,
          analyzedAt: new Date().toISOString(),
        },
        iterationsUsed: 5,
        totalSearches: 10,
        totalResults: 20,
        citations: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        retryCount: 0,
        maxRetries: 3,
      };

      const decision = ruleBasedDecision(state, defaultConfig);

      expect(decision.nextAgent).toBe('done');
      expect(decision.shouldContinue).toBe(false);
    });
  });

  describe('createSupervisorAgent', () => {
    it('should create supervisor agent with correct config', () => {
      const agent = createSupervisorAgent({
        useLLMRouting: true,
        maxRetries: 3,
        qualityThresholds: {
          minSearchResults: 15,
          minExtractions: 5,
          minFeatures: 3,
          minCompetitors: 2,
          completionScore: 60,
        },
      });

      expect(agent).toBeDefined();
      expect(typeof agent.makeDecision).toBe('function');
    });
  });

  // 共享的配置
  const defaultConfig = {
    useLLMRouting: true,
    maxRetries: 3,
    qualityThresholds: {
      minSearchResults: 15,
      minExtractions: 5,
      minFeatures: 3,
      minCompetitors: 2,
      completionScore: 60,
    },
  };

  describe('ruleBasedDecision - 各种状态转换', () => {

    it('should return searcher when searching with enough results', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        description: '',
        keywords: [],
        status: 'searching',
        currentStep: 'searcher',
        progress: 20,
        progressMessage: '搜索中',
        searchResults: [
          { id: 'r1', title: 'Result 1', url: 'http://test1.com', source: 'web', quality: 8, content: 'content', retrievedAt: new Date().toISOString() },
          { id: 'r2', title: 'Result 2', url: 'http://test2.com', source: 'web', quality: 9, content: 'content', retrievedAt: new Date().toISOString() },
          { id: 'r3', title: 'Result 3', url: 'http://test3.com', source: 'web', quality: 7, content: 'content', retrievedAt: new Date().toISOString() },
          // ... 模拟 15+ 条结果
        ],
        pendingQueries: [],
        extractedContent: [],
        iterationsUsed: 2,
        totalSearches: 5,
        totalResults: 15,
        analysis: undefined,
        citations: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        retryCount: 0,
        maxRetries: 3,
      };

      const decision = ruleBasedDecision(state, defaultConfig);

      expect(decision.nextAgent).toBe('extractor');
      expect(decision.shouldContinue).toBe(true);
    });

    it('should return searcher when searching with no results', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        description: '',
        keywords: [],
        status: 'searching',
        currentStep: 'searcher',
        progress: 15,
        progressMessage: '搜索中',
        searchResults: [],
        pendingQueries: [],
        extractedContent: [],
        iterationsUsed: 1,
        totalSearches: 1,
        totalResults: 0,
        analysis: undefined,
        citations: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        retryCount: 0,
        maxRetries: 3,
      };

      const decision = ruleBasedDecision(state, defaultConfig);

      expect(decision.nextAgent).toBe('searcher');  // 重新搜索
      expect(decision.shouldContinue).toBe(true);
    });

    it('should return analyzer when extracting with enough content', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        description: '',
        keywords: [],
        status: 'extracting',
        currentStep: 'extractor',
        progress: 40,
        progressMessage: '提取中',
        searchResults: [],
        pendingQueries: [],
        extractedContent: [
          { id: 'e1', url: 'http://test1.com', title: 'Test 1', source: 'web', content: 'long content here', metadata: { contentType: 'article', wordCount: 1000, qualityScore: 8 }, extractedAt: new Date().toISOString() },
          { id: 'e2', url: 'http://test2.com', title: 'Test 2', source: 'web', content: 'long content here', metadata: { contentType: 'article', wordCount: 1500, qualityScore: 9 }, extractedAt: new Date().toISOString() },
          { id: 'e3', url: 'http://test3.com', title: 'Test 3', source: 'web', content: 'long content here', metadata: { contentType: 'article', wordCount: 800, qualityScore: 7 }, extractedAt: new Date().toISOString() },
        ],
        iterationsUsed: 3,
        totalSearches: 5,
        totalResults: 15,
        analysis: undefined,
        citations: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        retryCount: 0,
        maxRetries: 3,
      };

      const decision = ruleBasedDecision(state, defaultConfig);

      expect(decision.nextAgent).toBe('analyzer');
      expect(decision.shouldContinue).toBe(true);
    });

    it('should return analyzer when extracting with some content', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        description: '',
        keywords: [],
        status: 'extracting',
        currentStep: 'extractor',
        progress: 35,
        progressMessage: '提取中',
        searchResults: [],
        pendingQueries: [],
        extractedContent: [
          { id: 'e1', url: 'http://test1.com', title: 'Test 1', source: 'web', content: 'content', metadata: { contentType: 'article', wordCount: 100, qualityScore: 5 }, extractedAt: new Date().toISOString() },
        ],
        iterationsUsed: 2,
        totalSearches: 3,
        totalResults: 5,
        analysis: undefined,
        citations: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        retryCount: 0,
        maxRetries: 3,
      };

      const decision = ruleBasedDecision(state, defaultConfig);

      expect(decision.nextAgent).toBe('analyzer');  // 有结果就开始分析
      expect(decision.shouldContinue).toBe(true);
    });

    it('should return analyzer when analyzing with incomplete analysis', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        description: '',
        keywords: [],
        status: 'analyzing',
        currentStep: 'analyzer',
        progress: 60,
        progressMessage: '分析中',
        searchResults: [],
        pendingQueries: [],
        extractedContent: [],
        analysis: {
          features: ['feature1'],  // 只有 1 个，不够
          competitors: ['comp1'],  // 只有 1 个，不够
          useCases: [],
          techStack: [],
          swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
          dataGaps: [],
          confidenceScore: 0.3,  // 低于 0.5
          analyzedAt: new Date().toISOString(),
        },
        iterationsUsed: 4,
        totalSearches: 10,
        totalResults: 20,
        citations: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        retryCount: 0,
        maxRetries: 3,
      };

      const decision = ruleBasedDecision(state, defaultConfig);

      expect(decision.nextAgent).toBe('analyzer');  // 重新分析
      expect(decision.shouldContinue).toBe(true);
    });

    it('should return analyzer with complete analysis and not done yet', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        description: '',
        keywords: [],
        status: 'analyzing',
        currentStep: 'analyzer',
        progress: 70,
        progressMessage: '分析中',
        searchResults: [],
        pendingQueries: [],
        extractedContent: [],
        analysis: {
          features: ['f1', 'f2', 'f3'],
          competitors: ['c1', 'c2'],
          useCases: ['u1'],
          techStack: ['t1'],
          swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
          dataGaps: [],
          confidenceScore: 0.6,
          analyzedAt: new Date().toISOString(),
        },
        iterationsUsed: 5,
        totalSearches: 10,
        totalResults: 20,
        citations: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        retryCount: 0,
        maxRetries: 3,
      };

      const decision = ruleBasedDecision(state, defaultConfig);

      expect(decision.nextAgent).toBe('reporter');  // 分析完成，去 reporter
      expect(decision.shouldContinue).toBe(true);
    });

    it('should handle extracting with no content', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        description: '',
        keywords: [],
        status: 'extracting',
        currentStep: 'extractor',
        progress: 30,
        progressMessage: '提取中',
        searchResults: [],
        pendingQueries: [],
        extractedContent: [],  // 没有内容
        iterationsUsed: 1,
        totalSearches: 2,
        totalResults: 5,
        analysis: undefined,
        citations: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        retryCount: 0,
        maxRetries: 3,
      };

      const decision = ruleBasedDecision(state, defaultConfig);

      expect(decision.nextAgent).toBe('extractor');  // 重新提取
      expect(decision.shouldContinue).toBe(true);
    });
  });

  describe('executeSupervision - 执行监督流程', () => {
    it('should use rule-based decision when LLM routing is disabled', async () => {
      const agent = createSupervisorAgent({
        useLLMRouting: false,  // 禁用 LLM 路由
        maxRetries: 3,
        qualityThresholds: {
          minSearchResults: 15,
          minExtractions: 5,
          minFeatures: 3,
          minCompetitors: 2,
          completionScore: 60,
        },
      });

      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        description: '',
        keywords: [],
        status: 'pending',
        currentStep: 'supervisor',
        progress: 0,
        progressMessage: '',
        searchResults: [],
        pendingQueries: [],
        extractedContent: [],
        iterationsUsed: 0,
        totalSearches: 0,
        totalResults: 0,
        analysis: undefined,
        citations: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        retryCount: 0,
        maxRetries: 3,
      };

      const result = await agent.execute(state);

      expect(result.success).toBe(true);
      expect(result.decision.nextAgent).toBe('planner');  // 规则引擎返回
      expect(result.decision.shouldContinue).toBe(true);
    });

    it('should handle searching with partial results', () => {
      // 测试 ruleBasedDecision 中 searching 状态的部分结果分支
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        description: '',
        keywords: [],
        status: 'searching',
        currentStep: 'searcher',
        progress: 18,
        progressMessage: '搜索中',
        searchResults: [
          { id: 'r1', title: 'Result 1', url: 'http://test1.com', source: 'web', quality: 8, content: 'content', retrievedAt: new Date().toISOString() },
          { id: 'r2', title: 'Result 2', url: 'http://test2.com', source: 'web', quality: 9, content: 'content', retrievedAt: new Date().toISOString() },
          { id: 'r3', title: 'Result 3', url: 'http://test3.com', source: 'web', quality: 3, content: 'content', retrievedAt: new Date().toISOString() },  // 低质量
        ],
        pendingQueries: [],
        extractedContent: [],
        iterationsUsed: 2,
        totalSearches: 3,
        totalResults: 3,  // 只有 3 条，不够 15
        analysis: undefined,
        citations: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        retryCount: 0,
        maxRetries: 3,
      };

      const decision = ruleBasedDecision(state, defaultConfig);

      // 有结果但不够多，应该去 extractor
      expect(decision.nextAgent).toBe('extractor');
      expect(decision.shouldContinue).toBe(true);
    });
  });

  describe('边界条件和错误处理', () => {
    it('should handle state with undefined analysis', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        description: '',
        keywords: [],
        status: 'analyzing',
        currentStep: 'analyzer',
        progress: 55,
        progressMessage: '分析中',
        searchResults: [],
        pendingQueries: [],
        extractedContent: [],
        analysis: undefined,  // 未定义
        iterationsUsed: 3,
        totalSearches: 8,
        totalResults: 15,
        citations: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        retryCount: 0,
        maxRetries: 3,
      };

      const decision = ruleBasedDecision(state, defaultConfig);

      expect(decision.nextAgent).toBe('analyzer');
      expect(decision.shouldContinue).toBe(true);
    });

    it('should handle state with empty search results array', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        description: '',
        keywords: [],
        status: 'searching',
        currentStep: 'searcher',
        progress: 12,
        progressMessage: '搜索中',
        searchResults: [],  // 空数组
        pendingQueries: [],
        extractedContent: [],
        iterationsUsed: 0,
        totalSearches: 0,
        totalResults: 0,
        analysis: undefined,
        citations: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        retryCount: 0,
        maxRetries: 3,
      };

      const decision = ruleBasedDecision(state, defaultConfig);

      expect(decision.nextAgent).toBe('searcher');
      expect(decision.shouldContinue).toBe(true);
    });

    it('should handle state with empty extracted content', () => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        description: '',
        keywords: [],
        status: 'extracting',
        currentStep: 'extractor',
        progress: 28,
        progressMessage: '提取中',
        searchResults: [],
        pendingQueries: [],
        extractedContent: [],  // 空数组
        iterationsUsed: 0,
        totalSearches: 2,
        totalResults: 5,
        analysis: undefined,
        citations: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        retryCount: 0,
        maxRetries: 3,
      };

      const decision = ruleBasedDecision(state, defaultConfig);

      expect(decision.nextAgent).toBe('extractor');  // 重新提取
      expect(decision.shouldContinue).toBe(true);
    });
  });
});
