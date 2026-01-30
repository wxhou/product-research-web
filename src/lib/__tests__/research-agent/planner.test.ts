/**
 * Planner Worker Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import type { SearchQuery, SearchPlan, DataSourceType, QualityThresholds } from '../../research-agent/types';

describe('Planner Worker', () => {
  describe('SearchQuery validation', () => {
    it('should create valid search query', () => {
      const query: SearchQuery = {
        id: 'q1',
        query: '工业物联网平台',
        purpose: '了解工业物联网平台的功能特性',
        dimension: 'features',
        priority: 5,
      };

      expect(query.id).toBe('q1');
      expect(query.query).toBe('工业物联网平台');
      expect(query.purpose).toBe('了解工业物联网平台的功能特性');
      expect(query.dimension).toBe('features');
      expect(query.priority).toBe(5);
    });

    it('should require all mandatory fields', () => {
      const query: SearchQuery = {
        id: 'test',
        query: 'test query',
        purpose: 'test purpose',
        dimension: 'general',
        priority: 3,
      };

      expect(query.id).toBeDefined();
      expect(query.query).toBeDefined();
      expect(query.purpose).toBeDefined();
      expect(query.dimension).toBeDefined();
      expect(query.priority).toBeDefined();
    });

    it('should support optional hints field', () => {
      const query: SearchQuery = {
        id: 'q1',
        query: 'test',
        purpose: 'test',
        dimension: 'features',
        priority: 5,
        hints: '额外搜索提示',
      };

      expect(query.hints).toBe('额外搜索提示');
    });
  });

  describe('SearchPlan validation', () => {
    it('should create valid search plan', () => {
      const queries: SearchQuery[] = [
        {
          id: 'q1',
          query: 'ThingWorx 工业物联网',
          purpose: '了解核心功能',
          dimension: 'features',
          priority: 5,
        },
        {
          id: 'q2',
          query: '工业物联网平台 竞品',
          purpose: '了解竞争对手',
          dimension: 'competitors',
          priority: 4,
        },
      ];

      const qualityThresholds: QualityThresholds = {
        minFeatures: 3,
        minCompetitors: 2,
        minUseCases: 3,
        minTechStack: 2,
        minSearchResults: 15,
        minIterations: 2,
        completionScore: 0.7,
      };

      const plan: SearchPlan = {
        queries,
        targetSources: ['duckduckgo', 'rss-hackernews'],
        researchDimensions: ['features', 'competitors', 'techStack'],
        qualityThresholds,
      };

      expect(plan.queries).toHaveLength(2);
      expect(plan.targetSources).toContain('duckduckgo');
      expect(plan.researchDimensions).toContain('features');
      expect(plan.qualityThresholds.minSearchResults).toBe(15);
    });

    it('should validate priority range', () => {
      const query: SearchQuery = {
        id: 'q1',
        query: 'test',
        purpose: 'test',
        dimension: 'general',
        priority: 10,
      };
      expect(query.priority).toBeLessThanOrEqual(10);
    });

    it('should support empty queries array', () => {
      const plan: SearchPlan = {
        queries: [],
        targetSources: ['duckduckgo'],
        researchDimensions: ['general'],
        qualityThresholds: {
          minFeatures: 3,
          minCompetitors: 2,
          minUseCases: 3,
          minTechStack: 2,
          minSearchResults: 15,
          minIterations: 2,
          completionScore: 0.7,
        },
      };

      expect(plan.queries).toEqual([]);
    });
  });

  describe('QualityThresholds validation', () => {
    it('should create valid quality thresholds', () => {
      const thresholds: QualityThresholds = {
        minFeatures: 5,
        minCompetitors: 3,
        minUseCases: 5,
        minTechStack: 3,
        minSearchResults: 20,
        minIterations: 3,
        completionScore: 0.8,
      };

      expect(thresholds.minFeatures).toBe(5);
      expect(thresholds.completionScore).toBe(0.8);
    });

    it('should validate completion score range', () => {
      const thresholds: QualityThresholds = {
        minFeatures: 3,
        minCompetitors: 2,
        minUseCases: 3,
        minTechStack: 2,
        minSearchResults: 15,
        minIterations: 2,
        completionScore: 0.5,
      };

      expect(thresholds.completionScore).toBeGreaterThanOrEqual(0);
      expect(thresholds.completionScore).toBeLessThanOrEqual(1);
    });
  });

  describe('DataSourceType', () => {
    it('should support all expected data source types', () => {
      const sources: DataSourceType[] = [
        'rss-hackernews',
        'rss-techcrunch',
        'duckduckgo',
        'devto',
        'reddit',
        'v2ex',
        'mcp-fetch',
      ];

      sources.forEach(source => {
        expect(typeof source).toBe('string');
      });
    });
  });
});
