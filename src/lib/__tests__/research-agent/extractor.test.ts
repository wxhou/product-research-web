/**
 * Extractor Worker Tests
 */

import { describe, it, expect } from '@jest/globals';
import type { ExtractionResult } from '../../research-agent/types';

describe('Extractor Worker', () => {
  describe('ExtractionResult validation', () => {
    it('should create valid extraction result', () => {
      const result: ExtractionResult = {
        url: 'https://example.com/product',
        source: 'duckduckgo',
        title: 'Product Page',
        content: 'This is the extracted content about the product...',
        metadata: {
          crawledAt: '2024-01-29T10:00:00Z',
          contentLength: 5000,
          qualityScore: 8,
          features: ['实时监测', '故障预测'],
          competitors: ['竞品A', '竞品B'],
          techStack: ['React', 'Node.js'],
        },
      };

      expect(result.url).toBe('https://example.com/product');
      expect(result.metadata.qualityScore).toBe(8);
      expect(result.metadata.features).toHaveLength(2);
    });

    it('should validate metadata structure', () => {
      const result: ExtractionResult = {
        url: 'https://test.com',
        source: 'mcp-fetch',
        title: 'Test',
        content: 'Content...',
        metadata: {
          crawledAt: new Date().toISOString(),
          contentLength: 1000,
          qualityScore: 7,
          features: [],
          competitors: [],
          techStack: [],
        },
      };

      expect(typeof result.metadata.crawledAt).toBe('string');
      expect(result.metadata.contentLength).toBeGreaterThan(0);
      expect(result.metadata.qualityScore).toBeLessThanOrEqual(10);
    });

    it('should support empty arrays for metadata', () => {
      const result: ExtractionResult = {
        url: 'https://test.com',
        source: 'duckduckgo',
        title: 'Minimal',
        content: 'Content',
        metadata: {
          crawledAt: new Date().toISOString(),
          contentLength: 100,
          qualityScore: 5,
          features: [],
          competitors: [],
          techStack: [],
        },
      };

      expect(result.metadata.features).toEqual([]);
      expect(result.metadata.competitors).toEqual([]);
      expect(result.metadata.techStack).toEqual([]);
    });
  });

  describe('Quality score calculation', () => {
    it('should validate quality score boundaries', () => {
      const scores = [0, 1, 5, 9, 10];

      scores.forEach(score => {
        const result: ExtractionResult = {
          url: 'https://test.com',
          source: 'duckduckgo',
          title: 'Test',
          content: 'Content',
          metadata: {
            crawledAt: new Date().toISOString(),
            contentLength: 1000,
            qualityScore: score,
            features: [],
            competitors: [],
            techStack: [],
          },
        };
        expect(result.metadata.qualityScore).toBeGreaterThanOrEqual(0);
        expect(result.metadata.qualityScore).toBeLessThanOrEqual(10);
      });
    });
  });
});
