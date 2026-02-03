/**
 * Supervisor Tests
 *
 * Type validation tests for Supervisor module
 */

import { describe, it, expect } from '@jest/globals';
import type { ResearchState, SupervisorDecision } from '../types';
import { createSupervisorAgent } from '../../research-agent/supervisor';

describe('Supervisor Types', () => {
  describe('SupervisorDecision validation', () => {
    it('should validate SupervisorDecision structure', () => {
      const decision: SupervisorDecision = {
        nextAgent: 'planner',
        reason: '开始调研',
        shouldContinue: true,
      };

      expect(decision.nextAgent).toBe('planner');
      expect(decision.reason).toBe('开始调研');
      expect(decision.shouldContinue).toBe(true);
    });

    it('should validate done decision', () => {
      const decision: SupervisorDecision = {
        nextAgent: 'done',
        reason: '调研完成',
        shouldContinue: false,
      };

      expect(decision.nextAgent).toBe('done');
      expect(decision.shouldContinue).toBe(false);
    });

    it('should validate all agent types', () => {
      const agents: SupervisorDecision['nextAgent'][] = ['planner', 'searcher', 'extractor', 'analyzer', 'reporter', 'done'];

      agents.forEach(agent => {
        const decision: SupervisorDecision = {
          nextAgent: agent,
          reason: `跳转到 ${agent}`,
          shouldContinue: agent !== 'done',
        };
        expect(decision.nextAgent).toBe(agent);
      });
    });

    it('should validate decision with instructions', () => {
      const decision: SupervisorDecision = {
        nextAgent: 'searcher',
        reason: '开始搜索',
        instructions: '优先搜索高质量来源',
        shouldContinue: true,
      };

      expect(decision.instructions).toBe('优先搜索高质量来源');
    });
  });

  describe('ResearchState validation', () => {
    it('should validate minimal research state', () => {
      const state: ResearchState = {
        projectId: 'test-project',
        title: 'Test Research',
        description: '',
        keywords: ['test'],
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
        citations: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        retryCount: 0,
        maxRetries: 3,
      };

      expect(state.projectId).toBe('test-project');
      expect(state.status).toBe('pending');
      expect(state.searchResults).toHaveLength(0);
    });

    it('should validate state with analysis', () => {
      const state: ResearchState = {
        projectId: 'test-project',
        title: 'Test Research',
        description: '',
        keywords: ['test'],
        status: 'analyzing',
        currentStep: 'analyzer',
        progress: 60,
        progressMessage: '分析中',
        searchResults: [],
        pendingQueries: [],
        extractedContent: [],
        analysis: {
          features: ['功能1', '功能2', '功能3'],
          competitors: ['竞品1', '竞品2'],
          useCases: ['场景1'],
          techStack: ['技术A'],
          swot: {
            strengths: ['优势1'],
            weaknesses: ['劣势1'],
            opportunities: ['机会1'],
            threats: ['威胁1'],
          },
          dataGaps: [],
          confidenceScore: 0.75,
          analyzedAt: new Date().toISOString(),
        },
        iterationsUsed: 3,
        totalSearches: 10,
        totalResults: 50,
        citations: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        retryCount: 0,
        maxRetries: 3,
      };

      expect(state.status).toBe('analyzing');
      expect(state.analysis?.features).toHaveLength(3);
      expect(state.analysis?.confidenceScore).toBe(0.75);
    });

    it('should validate all status values', () => {
      const statuses: ResearchState['status'][] = ['pending', 'planning', 'searching', 'extracting', 'analyzing', 'reporting', 'completed', 'failed'];

      statuses.forEach(status => {
        const state: ResearchState = {
          projectId: 'test',
          title: 'Test',
          description: '',
          keywords: [],
          status,
          currentStep: 'supervisor',
          progress: 0,
          progressMessage: '',
          searchResults: [],
          pendingQueries: [],
          extractedContent: [],
          iterationsUsed: 0,
          totalSearches: 0,
          totalResults: 0,
          citations: [],
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: undefined,
          retryCount: 0,
          maxRetries: 3,
        };
        expect(state.status).toBe(status);
      });
    });

    it('should validate search results structure', () => {
      const results: ResearchState['searchResults'] = [
        {
          id: 'r1',
          title: '搜索结果1',
          url: 'https://example.com/1',
          source: 'web',
          quality: 8,
          content: '内容摘要',
          retrievedAt: new Date().toISOString(),
        },
        {
          id: 'r2',
          title: '搜索结果2',
          url: 'https://example.com/2',
          source: 'rss',
          quality: 7,
          content: '内容摘要2',
          retrievedAt: new Date().toISOString(),
        },
      ];

      expect(results).toHaveLength(2);
      expect(results[0].quality).toBe(8);
      expect(results[1].source).toBe('rss');
    });

    it('should validate extracted content structure', () => {
      const extracted: ResearchState['extractedContent'] = [
        {
          id: 'e1',
          url: 'https://example.com/1',
          title: '页面标题',
          source: 'web',
          content: '提取的正文内容',
          metadata: {
            contentType: 'article',
            wordCount: 1500,
            qualityScore: 8,
          },
          extractedAt: new Date().toISOString(),
        },
      ];

      expect(extracted).toHaveLength(1);
      expect(extracted[0].metadata.wordCount).toBe(1500);
    });
  });

  describe('createSupervisorAgent', () => {
    it('should create supervisor agent', () => {
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
      expect(typeof agent.execute).toBe('function');
    });

    it('should create supervisor agent with custom config', () => {
      const agent = createSupervisorAgent({
        useLLMRouting: false,
        maxRetries: 5,
        qualityThresholds: {
          minSearchResults: 20,
          minExtractions: 8,
          minFeatures: 5,
          minCompetitors: 3,
          completionScore: 70,
        },
      });

      expect(agent).toBeDefined();
    });
  });
});
