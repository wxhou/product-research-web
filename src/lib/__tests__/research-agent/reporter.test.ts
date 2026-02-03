/**
 * Reporter Worker Tests
 *
 * Tests for Reporter Worker including:
 * - Report generation
 * - Title block generation
 * - Template structure validation
 * - Integration tests with various analysis data
 */

import { describe, it, expect } from '@jest/globals';
import {
  REPORT_TEMPLATE,
  generateReportContent,
  generateTitleBlock,
} from '../../research-agent/workers/reporter/templates';

describe('Reporter Worker', () => {
  describe('generateTitleBlock', () => {
    it('should generate title block with correct format', () => {
      const titleBlock = generateTitleBlock('测试产品', ['关键词1', '关键词2']);

      expect(typeof titleBlock).toBe('string');
      expect(titleBlock).toContain('测试产品');
      expect(titleBlock).toContain('# 测试产品');
      expect(titleBlock).toContain('调研时间');
      expect(titleBlock).toContain('关键词');
    });

    it('should handle empty keywords', () => {
      const titleBlock = generateTitleBlock('产品X', []);

      expect(titleBlock).toContain('产品X');
      expect(titleBlock).toContain('关键词');
    });

    it('should format keywords correctly', () => {
      const titleBlock = generateTitleBlock('AI产品', ['机器学习', 'NLP']);

      expect(titleBlock).toContain('机器学习');
      expect(titleBlock).toContain('NLP');
    });
  });

  describe('REPORT_TEMPLATE', () => {
    it('should have required sections', () => {
      expect(REPORT_TEMPLATE.sections).toBeDefined();
      expect(Array.isArray(REPORT_TEMPLATE.sections)).toBe(true);
      expect(REPORT_TEMPLATE.sections.length).toBeGreaterThan(0);
    });

    it('should have required properties', () => {
      const section = REPORT_TEMPLATE.sections[0];
      expect(section.id).toBeDefined();
      expect(section.title).toBeDefined();
      expect(typeof section.order).toBe('number');
    });
  });

  describe('generateReportContent', () => {
    it('should generate report with full analysis data', () => {
      const mockAnalysis = {
        features: [
          { name: '智能客服', count: 5, sources: ['source1'], description: 'AI驱动的客服功能' },
          { name: '多语言支持', count: 3, sources: ['source2'], description: '支持多种语言' },
        ],
        competitors: [
          { name: '竞品A', industry: '智能客服', features: ['功能1', '功能2'], description: '市场领先者', marketPosition: '高端市场' },
          { name: '竞品B', industry: '智能客服', features: ['功能3'], description: '新兴挑战者', marketPosition: '中端市场' },
        ],
        swot: {
          strengths: ['技术优势', '团队经验'],
          weaknesses: ['品牌知名度不足'],
          opportunities: ['市场需求增长', '政策支持'],
          threats: ['竞争加剧', '技术变革'],
        },
        marketData: {
          marketSize: '$10B',
          growthRate: '20%',
          keyPlayers: ['公司A', '公司B', '公司C'],
          trends: ['AI 驱动', '自动化'],
          opportunities: ['垂直行业深耕', '出海'],
          challenges: ['数据隐私', '合规要求'],
        },
        confidenceScore: 0.85,
        dataGaps: [],
      };

      const report = generateReportContent(
        '智能客服产品',
        ['AI', '客服', 'NLP'],
        100,
        50,
        mockAnalysis as any,
        ['行业报告', '公司财报']
      );

      // 验证报告生成成功
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(500);

      // 验证报告包含必要元素
      expect(report).toContain('智能客服产品');
      expect(report).toContain('##');
      expect(report).toContain('AI');
      expect(report).toContain('客服');
    });

    it('should handle minimal analysis data', () => {
      const mockAnalysis = {
        features: [],
        competitors: [],
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        marketData: { marketSize: '', growthRate: '', keyPlayers: [], trends: [], opportunities: [], challenges: [] },
        confidenceScore: 0.5,
        dataGaps: [],
      };

      const report = generateReportContent(
        '测试产品',
        ['关键词'],
        10,
        5,
        mockAnalysis as any,
        ['数据源']
      );

      // 验证报告生成成功且包含必要元素
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
      expect(report).toMatch(/测试产品/);
      expect(report).toContain('##');
    });

    it('should include SWOT analysis content', () => {
      const mockAnalysis = {
        features: [],
        competitors: [],
        swot: {
          strengths: ['技术优势'],
          weaknesses: ['资源有限'],
          opportunities: ['市场增长'],
          threats: ['新进入者'],
        },
        marketData: { marketSize: '', growthRate: '', keyPlayers: [], trends: [], opportunities: [], challenges: [] },
        confidenceScore: 0.7,
        dataGaps: [],
      };

      const report = generateReportContent(
        '测试产品',
        ['关键词'],
        20,
        10,
        mockAnalysis as any,
        ['数据源']
      );

      // 验证 SWOT 内容被包含
      expect(report).toMatch(/技术优势|资源有限|市场增长|新进入者/);
    });

    it('should handle market data', () => {
      const mockAnalysis = {
        features: [],
        competitors: [],
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        marketData: {
          marketSize: '$50B',
          growthRate: '15%',
          keyPlayers: ['公司A', '公司B'],
          trends: ['增长趋势'],
          opportunities: ['机会1'],
          challenges: ['挑战1'],
        },
        confidenceScore: 0.8,
        dataGaps: [],
      };

      const report = generateReportContent(
        '测试产品',
        ['关键词'],
        50,
        25,
        mockAnalysis as any,
        ['数据源']
      );

      // 验证市场数据被包含
      expect(report).toMatch(/市场/);
      expect(report).toMatch(/数据/);
    });

    it('should include features in report', () => {
      const mockAnalysis = {
        features: [
          { name: '核心功能A', count: 10, sources: ['src1'], description: '功能描述A' },
          { name: '核心功能B', count: 8, sources: ['src2'], description: '功能描述B' },
        ],
        competitors: [],
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        marketData: { marketSize: '', growthRate: '', keyPlayers: [], trends: [], opportunities: [], challenges: [] },
        confidenceScore: 0.6,
        dataGaps: [],
      };

      const report = generateReportContent(
        '测试产品',
        ['关键词'],
        30,
        15,
        mockAnalysis as any,
        ['数据源']
      );

      expect(report).toMatch(/核心功能A|核心功能B/);
    });

    it('should include competitors in report', () => {
      const mockAnalysis = {
        features: [],
        competitors: [
          { name: '竞品1', industry: '行业A', features: ['f1'], description: '描述1', marketPosition: '位置1' },
          { name: '竞品2', industry: '行业A', features: ['f2'], description: '描述2', marketPosition: '位置2' },
        ],
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        marketData: { marketSize: '', growthRate: '', keyPlayers: [], trends: [], opportunities: [], challenges: [] },
        confidenceScore: 0.7,
        dataGaps: [],
      };

      const report = generateReportContent(
        '测试产品',
        ['关键词'],
        40,
        20,
        mockAnalysis as any,
        ['数据源']
      );

      expect(report).toMatch(/竞品1|竞品2/);
    });

    it('should handle large analysis data', () => {
      // 创建大量测试数据
      const features = Array.from({ length: 20 }, (_, i) => ({
        name: `功能${i + 1}`,
        count: Math.floor(Math.random() * 10) + 1,
        sources: [`source${i}`],
        description: `功能${i + 1}的详细描述`,
      }));

      const competitors = Array.from({ length: 10 }, (_, i) => ({
        name: `竞品${i + 1}`,
        industry: '行业',
        features: [`f${i}`],
        description: `竞品${i + 1}描述`,
        marketPosition: '市场定位',
      }));

      const mockAnalysis = {
        features,
        competitors,
        swot: {
          strengths: Array.from({ length: 5 }, (_, i) => `优势${i + 1}`),
          weaknesses: Array.from({ length: 3 }, (_, i) => `劣势${i + 1}`),
          opportunities: Array.from({ length: 4 }, (_, i) => `机会${i + 1}`),
          threats: Array.from({ length: 3 }, (_, i) => `威胁${i + 1}`),
        },
        marketData: {
          marketSize: '$100B',
          growthRate: '25%',
          keyPlayers: ['大公司A', '大公司B', '大公司C'],
          trends: ['趋势1', '趋势2'],
          opportunities: ['市场机会'],
          challenges: ['主要挑战'],
        },
        confidenceScore: 0.9,
        dataGaps: [],
      };

      const report = generateReportContent(
        '复杂产品',
        ['关键词1', '关键词2', '关键词3'],
        500,
        200,
        mockAnalysis as any,
        ['数据源1', '数据源2', '数据源3']
      );

      expect(report.length).toBeGreaterThan(1000);
      expect(report).toContain('复杂产品');
    });

    it('should handle data with special characters', () => {
      const mockAnalysis = {
        features: [
          { name: '功能（含特殊字符）', count: 3, sources: ['source'], description: '描述"包含"引号\'和\'单引号' },
        ],
        competitors: [
          { name: '竞品&Ampersand', industry: '行业/slash', features: ['f&f'], description: '描述<标签>HTML', marketPosition: '位置"引号"' },
        ],
        swot: {
          strengths: ['优势（括号）'],
          weaknesses: ['劣势[方括号]'],
          opportunities: ['机会{大括号}'],
          threats: ['威胁**粗体**'],
        },
        marketData: {
          marketSize: '$10M',
          growthRate: '5%',
          keyPlayers: ['公司A', '公司B'],
          trends: ['趋势1'],
          opportunities: ['opp1'],
          challenges: ['chal1'],
        },
        confidenceScore: 0.75,
        dataGaps: [],
      };

      const report = generateReportContent(
        '产品（含特殊字符）',
        ['关键词&Amp', '关键词2'],
        10,
        5,
        mockAnalysis as any,
        ['数据源']
      );

      expect(report).toContain('产品（含特殊字符）');
    });
  });
});
