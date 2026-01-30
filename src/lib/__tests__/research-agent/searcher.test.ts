/**
 * Searcher Worker Tests
 */

import { describe, it, expect } from '@jest/globals';
import type { SearchResult, DataSourceType } from '../../research-agent/types';

describe('Searcher Worker', () => {
  describe('SearchResult validation', () => {
    it('should create valid search result', () => {
      const result: SearchResult = {
        id: 'sr1',
        source: 'duckduckgo' as DataSourceType,
        title: 'ThingWorx 工业物联网平台',
        url: 'https://www.ptc.com/en/thingworx',
        content: 'ThingWorx is PTC industrial IoT platform...',
        quality: 8,
        crawled: false,
        queryId: 'q1',
        dimension: 'features',
      };

      expect(result.id).toBe('sr1');
      expect(result.quality).toBe(8);
      expect(result.crawled).toBe(false);
    });

    it('should calculate quality score range', () => {
      const validQualityScores = [1, 5, 10];
      validQualityScores.forEach(quality => {
        const result: SearchResult = {
          id: 'test',
          source: 'duckduckgo' as DataSourceType,
          title: 'Test',
          url: 'https://test.com',
          quality,
          crawled: false,
          queryId: 'q1',
          dimension: 'general',
        };
        expect(result.quality).toBeGreaterThanOrEqual(1);
        expect(result.quality).toBeLessThanOrEqual(10);
      });
    });

    it('should support optional fields', () => {
      const result: SearchResult = {
        id: 'sr1',
        source: 'duckduckgo' as DataSourceType,
        title: 'Test',
        url: 'https://test.com',
        quality: 7,
        crawled: true,
        queryId: 'q1',
        dimension: 'features',
        crawledAt: '2024-01-29T10:00:00Z',
        contentHash: 'abc123',
      };

      expect(result.crawledAt).toBeDefined();
      expect(result.contentHash).toBeDefined();
    });

    it('should support all valid data source types', () => {
      const validSources: DataSourceType[] = [
        'duckduckgo',
        'rss-hackernews',
        'rss-techcrunch',
        'rss-theverge',
        'rss-wired',
        'rss-producthunt',
        'devto',
        'reddit',
        'v2ex',
        'mcp-fetch',
      ];

      validSources.forEach(source => {
        const result: SearchResult = {
          id: 'test',
          source: source,
          title: 'Test',
          url: 'https://test.com',
          quality: 5,
          crawled: false,
          queryId: 'q1',
          dimension: 'general',
        };
        expect(result.source).toBe(source);
      });
    });

    it('should validate dimension values', () => {
      const validDimensions = ['general', 'features', 'competitors', 'market', 'pricing', 'reviews', 'technical'] as const;

      validDimensions.forEach(dimension => {
        const result: SearchResult = {
          id: 'test',
          source: 'duckduckgo' as DataSourceType,
          title: 'Test',
          url: 'https://test.com',
          quality: 5,
          crawled: false,
          queryId: 'q1',
          dimension,
        };
        expect(result.dimension).toBe(dimension);
      });
    });
  });
});
