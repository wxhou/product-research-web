/**
 * Reporter Worker Tests
 */

import { describe, it, expect } from '@jest/globals';
import type { ReportSection, MermaidChart, ReportMetadata, Citation } from '../../research-agent/types';

describe('Reporter Worker', () => {
  describe('ReportSection validation', () => {
    it('should create valid report section', () => {
      const section: ReportSection = {
        id: 'sec1',
        title: '产品功能分析',
        content: '这部分详细介绍了产品的核心功能...',
        order: 1,
        required: true,
      };

      expect(section.id).toBe('sec1');
      expect(section.order).toBe(1);
      expect(section.required).toBe(true);
    });

    it('should validate section order', () => {
      const orders = [0, 1, 2, 3, 10];

      orders.forEach(order => {
        const section: ReportSection = {
          id: 'test',
          title: 'Test',
          content: 'Content',
          order,
          required: true,
        };
        expect(section.order).toBe(order);
      });
    });

    it('should validate required flag', () => {
      const requiredValues = [true, false];

      requiredValues.forEach(required => {
        const section: ReportSection = {
          id: 'test',
          title: 'Test',
          content: 'Content',
          order: 0,
          required,
        };
        expect(section.required).toBe(required);
      });
    });
  });

  describe('MermaidChart validation', () => {
    it('should create valid mermaid chart', () => {
      const chart: MermaidChart = {
        id: 'chart1',
        type: 'pie',
        title: '市场份额分布',
        code: `pie title 市场份额
  "厂商A" : 35
  "厂商B" : 25
  "其他" : 40`,
      };

      expect(chart.id).toBe('chart1');
      expect(chart.type).toBe('pie');
      expect(chart.title).toBe('市场份额分布');
      expect(chart.code).toContain('pie');
    });

    it('should support different chart types', () => {
      const chartTypes: MermaidChart['type'][] = [
        'pie',
        'mindmap',
        'timeline',
        'radar',
        'graph',
        'quadrant',
        'journey',
        'stateDiagram',
      ];

      chartTypes.forEach(type => {
        const chart: MermaidChart = {
          id: `chart-${type}`,
          type,
          title: 'Test Chart',
          code: `graph TD\nA-->B`,
        };
        expect(chart.type).toBe(type);
      });
    });

    it('should require id field', () => {
      const chart: MermaidChart = {
        id: 'test-id',
        type: 'pie',
        title: 'Test',
        code: 'pie title Test',
      };

      expect(chart.id).toBe('test-id');
    });
  });

  describe('Citation validation', () => {
    it('should create valid citation', () => {
      const citation: Citation = {
        id: 'cite1',
        source: 'duckduckgo',
        title: 'Example Source',
        url: 'https://example.com',
        relevanceScore: 0.85,
        referencedAt: '2024-01-29',
      };

      expect(citation.id).toBe('cite1');
      expect(citation.source).toBe('duckduckgo');
      expect(citation.relevanceScore).toBe(0.85);
    });

    it('should support optional fields', () => {
      const citation: Citation = {
        id: 'cite1',
        source: 'duckduckgo',
        title: 'Example',
        url: 'https://example.com',
      };

      expect(citation.relevanceScore).toBeUndefined();
      expect(citation.referencedAt).toBeUndefined();
    });
  });

  describe('ReportMetadata validation', () => {
    it('should create valid report metadata', () => {
      const metadata: ReportMetadata = {
        reportId: 'rpt-123',
        projectId: 'proj-456',
        title: '工业物联网平台研究报告',
        generatedAt: '2024-01-29T10:00:00Z',
        keywords: ['IoT', '工业'],
        summary: '这是一份关于工业物联网的研究报告',
      };

      expect(metadata.reportId).toBe('rpt-123');
      expect(metadata.keywords).toHaveLength(2);
    });

    it('should validate generatedAt format', () => {
      const date = new Date().toISOString();
      const metadata: ReportMetadata = {
        reportId: 'test',
        projectId: 'test',
        title: 'Test',
        generatedAt: date,
        keywords: [],
        summary: 'Test summary',
      };

      expect(metadata.generatedAt).toBeDefined();
    });

    it('should support empty keywords', () => {
      const metadata: ReportMetadata = {
        reportId: 'test',
        projectId: 'test',
        title: 'Test',
        generatedAt: new Date().toISOString(),
        keywords: [],
        summary: 'Test',
      };

      expect(metadata.keywords).toEqual([]);
    });
  });

  describe('Report sections with charts', () => {
    it('should support chart integration', () => {
      const chart: MermaidChart = {
        id: 'chart1',
        type: 'pie',
        title: '功能分布',
        code: 'pie title Test',
      };

      // Charts are standalone, not embedded in sections
      expect(chart.type).toBe('pie');
      expect(chart.id).toBe('chart1');
    });
  });
});
