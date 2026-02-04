/**
 * Reporter Templates Tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  renderGlossary,
  renderExecutiveSummary,
  renderSWOTWithBusinessImpact,
  renderStrategicRecommendations,
  renderUnitEconomicsComparison,
  validateTableStructure,
  hasUnfilledPlaceholders,
  sanitizeContent,
} from '../../research-agent/workers/reporter/templates';

describe('Reporter Templates', () => {
  describe('renderGlossary', () => {
    it('should render glossary with all business terms', () => {
      const glossary = renderGlossary();

      expect(glossary).toContain('### 附录 A. 术语表');
      expect(glossary).toContain('| 术语 | 定义 |');
      expect(glossary).toContain('ARR');
      expect(glossary).toContain('LTV');
      expect(glossary).toContain('CAC');
      expect(glossary).toContain('NPS');
      expect(glossary).toContain('MRR');
      expect(glossary).toContain('ROI');
    });

    it('should have proper markdown table structure', () => {
      const glossary = renderGlossary();

      expect(glossary).toMatch(/\| .+ \| .+ \|/);
      expect(glossary).toContain('|------|');
    });

    it('should include both English and Chinese definitions', () => {
      const glossary = renderGlossary();

      expect(glossary).toContain('Annual Recurring Revenue');
      expect(glossary).toContain('年度经常性收入');
    });
  });

  describe('renderExecutiveSummary', () => {
    it('should render executive summary with quantitative metrics', () => {
      const summary = renderExecutiveSummary({
        marketSize: '280亿元',
        growthRate: '32.5%',
        marketShare: '头部5家占65%',
        pricing: '15-50万/年',
        userPenetration: '大型企业45%',
      });

      expect(summary).toContain('## 执行摘要');
      expect(summary).toContain('### 核心定量指标');
      expect(summary).toContain('**280亿元**');
      expect(summary).toContain('**32.5%**');
    });

    it('should have proper table structure', () => {
      const summary = renderExecutiveSummary({
        marketSize: '100亿',
        growthRate: '15%',
        marketShare: '头部3家占50%',
        pricing: '10-30万/年',
        userPenetration: '中型企业30%',
      });

      expect(summary).toMatch(/\| 指标 \| 数值 \| 说明 \|/);
    });

    it('should include data source disclaimer', () => {
      const summary = renderExecutiveSummary({
        marketSize: '200亿',
        growthRate: '20%',
        marketShare: '头部5家占60%',
        pricing: '20-40万/年',
        userPenetration: '小企业20%',
      });

      expect(summary).toContain('以上数据基于公开市场调研');
      expect(summary).toContain('仅供参考');
    });
  });

  describe('renderSWOTWithBusinessImpact', () => {
    it('should limit SWOT items to max 5', () => {
      const items = [
        '技术领先',
        '成本优势',
        '市场份额大',
        '品牌影响力强',
        '创新能力突出',
        '人才储备充足',
        '渠道覆盖广',
      ];

      const result = renderSWOTWithBusinessImpact(items, 5);
      const lines = result.split('\n').filter(l => l.trim());

      expect(lines.length).toBeLessThanOrEqual(7); // 5 items + headers if any
    });

    it('should include business impact labels', () => {
      const items = ['技术创新', '成本控制'];

      const result = renderSWOTWithBusinessImpact(items);

      expect(result).toContain('业务影响:');
      expect(result).toContain('提升15-30%运营效率');
      expect(result).toContain('降低10-25%运营成本');
    });

    it('should handle empty array', () => {
      const result = renderSWOTWithBusinessImpact([]);

      expect(result).toBe('暂无数据');
    });

    it('should add numbered list prefix', () => {
      const items = ['技术领先', '成本优势'];

      const result = renderSWOTWithBusinessImpact(items);

      expect(result).toContain('1. **');
      expect(result).toContain('2. **');
    });
  });

  describe('renderStrategicRecommendations', () => {
    it('should render recommendation table with all columns', () => {
      const recommendations = [
        {
          recommendation: '强化大模型能力',
          kpi: '意图识别准确率',
          currentValue: '85%',
          targetValue: '92%',
          timeline: '3个月',
          budget: '500万',
        },
      ];

      const result = renderStrategicRecommendations(recommendations);

      expect(result).toContain('| 建议 | KPI | 当前值 | 目标值 | 时间节点 | 预算 |');
      expect(result).toContain('强化大模型能力');
      expect(result).toContain('意图识别准确率');
      expect(result).toContain('85%');
      expect(result).toContain('92%');
      expect(result).toContain('3个月');
      expect(result).toContain('500万');
    });

    it('should handle multiple recommendations', () => {
      const recommendations = [
        {
          recommendation: '建议1',
          kpi: 'KPI1',
          currentValue: '10%',
          targetValue: '20%',
          timeline: '1个月',
          budget: '100万',
        },
        {
          recommendation: '建议2',
          kpi: 'KPI2',
          currentValue: '30%',
          targetValue: '40%',
          timeline: '6个月',
          budget: '200万',
        },
      ];

      const result = renderStrategicRecommendations(recommendations);

      // Verify both recommendations are present
      expect(result).toContain('建议1');
      expect(result).toContain('建议2');
      expect(result).toContain('KPI1');
      expect(result).toContain('KPI2');
    });

    it('should show placeholder when no recommendations', () => {
      const result = renderStrategicRecommendations([]);

      expect(result).toContain('暂无建议');
      expect(result).toContain('-');
    });
  });

  describe('renderUnitEconomicsComparison', () => {
    it('should render unit economics table with benchmark comparison', () => {
      const data = {
        companyMetrics: [
          {
            competitor: '厂商A',
            ltvCacRatio: '5.3x',
            cacPaybackMonths: 18,
            grossMargin: 72,
          },
        ],
        benchmark: {
          ltvCacRatio: 4.4,
          cacPaybackMonths: 22,
          grossMargin: 65,
        },
      };

      const result = renderUnitEconomicsComparison(data);

      expect(result).toContain('| 指标 | 厂商A | 行业基准 | 评估 |');
      expect(result).toContain('LTV/CAC');
      expect(result).toContain('5.3x');
      expect(result).toContain('4.4x');
      expect(result).toContain('CAC回收月数');
      expect(result).toContain('毛利率');
    });

    it('should include health assessment', () => {
      const data = {
        companyMetrics: [
          {
            competitor: '厂商A',
            ltvCacRatio: '5.3x',
            cacPaybackMonths: 18,
            grossMargin: 72,
          },
        ],
        benchmark: {
          ltvCacRatio: 4.4,
          cacPaybackMonths: 22,
          grossMargin: 65,
        },
      };

      const result = renderUnitEconomicsComparison(data);

      expect(result).toContain('优秀');
      expect(result).toContain('良好');
    });
  });

  describe('validateTableStructure', () => {
    it('should return true for valid table', () => {
      const content = `| 标题1 | 标题2 |
|-------|-------|
| 内容1 | 内容2 |`;

      expect(validateTableStructure(content)).toBe(true);
    });

    it('should return true for content without tables', () => {
      const content = '这是一段普通文本，不包含表格';

      expect(validateTableStructure(content)).toBe(true);
    });

    it('should handle malformed tables', () => {
      const content = `这是表头
| 内容1 | 内容2 |`;

      expect(validateTableStructure(content)).toBe(false);
    });

    it('should validate table has separator row', () => {
      const content = `| 标题1 | 标题2 |
| 内容1 | 内容2 |`;

      expect(validateTableStructure(content)).toBe(false);
    });
  });

  describe('hasUnfilledPlaceholders', () => {
    it('should return false for clean content', () => {
      const content = `# 报告标题

这是报告正文`;

      expect(hasUnfilledPlaceholders(content)).toBe(false);
    });

    it('should return true for content with unfilled placeholders', () => {
      const content = `# 报告标题

这是 {placeholder} 文本`;

      expect(hasUnfilledPlaceholders(content)).toBe(true);
    });

    it('should return false for empty content', () => {
      expect(hasUnfilledPlaceholders('')).toBe(false);
    });
  });

  describe('sanitizeContent', () => {
    it('should replace unfilled placeholders with fallback', () => {
      const content = `这是 {unknownPlaceholder} 文本`;

      const result = sanitizeContent(content);

      expect(result).not.toContain('{unknownPlaceholder}');
    });

    it('should preserve code block content', () => {
      const content = '```mermaid\npie title "Test"\n```';

      const result = sanitizeContent(content);

      expect(result).toContain('mermaid');
    });
  });
});
