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
  renderExecutiveSummaryCard,
  sortByMarketPosition,
  renderCompetitorTieredAnalysis,
  renderDataQualitySection,
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

  // ============================================================
  // 新增：优化报告模板函数测试
  // ============================================================

  describe('renderExecutiveSummaryCard', () => {
    it('should render executive summary card with all metrics', () => {
      const card = renderExecutiveSummaryCard({
        title: "AI写作助手市场调研",
        keywords: ["AI", "写作", "NLP"],
        searchResultCount: 150,
        extractionCount: 45,
        analysis: {
          features: [
            { name: "智能写作", count: 25, description: "自动生成文本内容" },
            { name: "语法检查", count: 18, description: "自动检测语法错误" }
          ],
          competitors: [
            { name: "产品A", industry: "AI", features: ["功能1", "功能2"], description: "详细描述产品A的功能特点和市场定位", marketPosition: "领导者" },
            { name: "产品B", industry: "AI", features: ["功能3"], description: "产品B的描述", marketPosition: "挑战者" }
          ],
          marketData: {
            marketSize: "280亿元",
            growthRate: "32.5%",
            marketConcentration: "头部5家占65%",
            trends: ["趋势1", "趋势2"],
            opportunities: ["机会1"]
          },
          swot: {
            strengths: ["技术领先"],
            opportunities: ["市场需求增长"]
          },
          qualityAssessment: {
            dataCompletenessScore: 85,
            sourceCredibilityScore: 80,
            overallQualityScore: 82
          }
        }
      });

      expect(card).toContain('## 执行摘要卡片');
      expect(card).toContain('| 市场规模 |');
      expect(card).toContain('| 增长率 |');
      expect(card).toContain('| 市场集中度 |');
      expect(card).toContain('| Top 竞品 |');
      expect(card).toContain('| 核心建议 |');
      expect(card).toContain('🔥'); // 趋势 indicator
      expect(card).toContain('📈'); // YoY indicator
      expect(card).toContain('⚡'); // 集中度 indicator
      expect(card).toContain('💡'); // 建议 indicator
      expect(card).toContain('**数据完整度**: 85/100');
      expect(card).toContain('**置信度**: 82%');
    });

    it('should show placeholder when no data available', () => {
      const card = renderExecutiveSummaryCard({
        title: "测试调研",
        keywords: [],
        searchResultCount: 0,
        extractionCount: 0,
        analysis: {
          features: [],
          competitors: [],
          marketData: {},
          swot: { strengths: [], opportunities: [] }
        }
      });

      expect(card).toContain('暂无数据');
      expect(card).toContain('🔥 待分析');
      expect(card).toContain('📈 待分析');
      expect(card).toContain('⚡ 待分析');
    });

    it('should display top 3 competitors from sorted list', () => {
      const card = renderExecutiveSummaryCard({
        title: "测试",
        keywords: [],
        searchResultCount: 10,
        extractionCount: 5,
        analysis: {
          features: [{ name: "功能1", count: 5, description: "" }],
          competitors: [
            { name: "竞品C", industry: "AI", features: ["f1"], description: "短描述", marketPosition: "" },
            { name: "竞品A", industry: "AI", features: ["f1", "f2", "f3", "f4", "f5"], description: "很长的详细描述".repeat(20), marketPosition: "领导者" },
            { name: "竞品B", industry: "AI", features: ["f1", "f2"], description: "中等长度的描述", marketPosition: "挑战者" }
          ],
          marketData: {},
          swot: { strengths: [], opportunities: [] }
        }
      });

      // 竞品A 有最多功能和最长描述，应该排第一
      expect(card).toContain('竞品A');
      expect(card).toContain('竞品B');
      expect(card).toContain('竞品C');
    });
  });

  describe('sortByMarketPosition', () => {
    it('should return empty array for empty competitors', () => {
      const result = sortByMarketPosition([]);
      expect(result).toEqual([]);
    });

    it('should sort competitors by weighted scoring', () => {
      const competitors = [
        { name: "产品A", industry: "AI", features: ["f1", "f2"], description: "描述", marketPosition: "" },
        { name: "产品B", industry: "AI", features: ["f1", "f2", "f3", "f4", "f5"], description: "很长的详细描述".repeat(20), marketPosition: "领导者" },
        { name: "产品C", industry: "AI", features: ["f1"], description: "短", marketPosition: "" }
      ];

      const result = sortByMarketPosition(competitors);

      expect(result[0].name).toBe('产品B'); // 最多功能 + 最长描述
      expect(result[0].rankingScore).toBeGreaterThan(result[1].rankingScore);
      expect(result[1].rankingScore).toBeGreaterThan(result[2].rankingScore);
    });

    it('should add rankingScore to each competitor', () => {
      const competitors = [
        { name: "产品A", industry: "AI", features: ["f1"], description: "描述", marketPosition: "领导者" }
      ];

      const result = sortByMarketPosition(competitors);

      expect(result[0]).toHaveProperty('rankingScore');
      expect(typeof result[0].rankingScore).toBe('number');
    });

    it('should prioritize market position clarity', () => {
      const competitors = [
        { name: "有定位", industry: "AI", features: ["f1"], description: "描述", marketPosition: "市场领导者" },
        { name: "无定位", industry: "AI", features: ["f1"], description: "描述", marketPosition: "" }
      ];

      const result = sortByMarketPosition(competitors);

      expect(result[0].name).toBe('有定位');
      expect(result[0].rankingScore).toBeGreaterThan(result[1].rankingScore);
    });

    it('should weight first appearance in list', () => {
      const competitors = [
        { name: "第一个", industry: "AI", features: ["f1"], description: "描述", marketPosition: "" },
        { name: "第二个", industry: "AI", features: ["f1"], description: "描述", marketPosition: "" },
        { name: "第三个", industry: "AI", features: ["f1"], description: "描述", marketPosition: "" }
      ];

      const result = sortByMarketPosition(competitors);

      // 第一个应该排名更高（即使其他因素相同）
      expect(result[0].name).toBe('第一个');
    });
  });

  describe('renderCompetitorTieredAnalysis', () => {
    it('should return placeholder for empty competitors', () => {
      const result = renderCompetitorTieredAnalysis([]);

      expect(result.benchmarkAnalysis).toBe('暂无竞品深度分析数据');
      expect(result.top6_10Summary).toBe('暂无竞品摘要数据');
    });

    it('should generate deep analysis for Top 5', () => {
      const competitors = [
        { name: "竞品A", industry: "AI写作", features: ["功能1", "功能2"], description: "产品A是AI写作领域的领导者", marketPosition: "领导者" },
        { name: "竞品B", industry: "AI写作", features: ["功能3", "功能4"], description: "产品B专注于企业级市场", marketPosition: "挑战者" },
        { name: "竞品C", industry: "AI写作", features: ["功能5"], description: "产品C是新兴创业公司", marketPosition: "跟随者" }
      ];

      const result = renderCompetitorTieredAnalysis(competitors);

      expect(result.benchmarkAnalysis).toContain('### 1. 竞品A');
      expect(result.benchmarkAnalysis).toContain('### 2. 竞品B');
      expect(result.benchmarkAnalysis).toContain('### 3. 竞品C');
      expect(result.benchmarkAnalysis).toContain('**行业定位**：AI写作');
      expect(result.benchmarkAnalysis).toContain('**市场定位**：领导者');
      expect(result.benchmarkAnalysis).toContain('**核心功能**：功能1、功能2');
    });

    it('should generate summary table for Top 6-10', () => {
      const competitors = Array.from({ length: 8 }, (_, i) => ({
        name: `竞品${i + 1}`,
        industry: "AI",
        features: [`功能${i}`],
        description: `描述${i}`,
        marketPosition: "跟随者"
      }));

      const result = renderCompetitorTieredAnalysis(competitors);

      expect(result.top6_10Summary).toContain('| 排名 |');
      expect(result.top6_10Summary).toContain('| 竞品6 |');
      expect(result.top6_10Summary).toContain('| 竞品7 |');
      expect(result.top6_10Summary).toContain('| 竞品8 |');
    });

    it('should limit to top 5 for deep analysis', () => {
      const competitors = Array.from({ length: 12 }, (_, i) => ({
        name: `竞品${i + 1}`,
        industry: "AI",
        features: [`功能${i}`],
        description: `描述${i}`,
        marketPosition: "定位"
      }));

      const result = renderCompetitorTieredAnalysis(competitors);

      // 只应该有5个深度分析
      const deepAnalysisCount = (result.benchmarkAnalysis.match(/### \d+\. 竞品/g) || []).length;
      expect(deepAnalysisCount).toBe(5);
    });

    it('should include ranking basis in analysis', () => {
      const competitors = [
        { name: "竞品A", industry: "AI", features: ["f1", "f2"], description: "描述ABC", marketPosition: "L" }
      ];

      const result = renderCompetitorTieredAnalysis(competitors);

      expect(result.benchmarkAnalysis).toContain('**排名依据**：');
      expect(result.benchmarkAnalysis).toContain('功能完整性 2 项');
      expect(result.benchmarkAnalysis).toContain('描述 5 字');
    });
  });

  describe('renderDataQualitySection', () => {
    it('should render data quality section with scores', () => {
      const section = renderDataQualitySection({
        marketData: { marketSize: "100亿", growthRate: "20%" },
        competitors: [{ name: "A", features: [], description: "" }],
        userResearch: { personas: [{ name: "用户1" }] },
        qualityAssessment: { dataCompletenessScore: 75, sourceCredibilityScore: 80 }
      });

      expect(section).toContain('### 数据完整度评分:');
      expect(section).toContain('| 维度 | 评分 | 说明 |');
      expect(section).toContain('| 市场规模数据 |');
      expect(section).toContain('| 竞品数据 |');
      expect(section).toContain('| 用户数据 |');
      expect(section).toContain('### 数据获取建议');
      expect(section).toContain('### 置信度说明');
    });

    it('should calculate correct overall score', () => {
      const section = renderDataQualitySection({
        marketData: { marketSize: "100亿", growthRate: "20%" },
        competitors: [],
        userResearch: undefined,
        qualityAssessment: undefined
      });

      // 市场规模: 80, 竞品: 30, 用户: 20, 平均: 43
      expect(section).toContain('数据完整度评分: 43/100');
    });

    it('should show appropriate notes for missing data', () => {
      const section = renderDataQualitySection({
        marketData: {},
        competitors: [],
        userResearch: undefined,
        qualityAssessment: undefined
      });

      expect(section).toContain('缺少具体金额数据');
      expect(section).toContain('竞品数据不足');
      expect(section).toContain('基于公开推断');
    });

    it('should include improvement suggestions', () => {
      const section = renderDataQualitySection({
        marketData: {},
        competitors: [],
        userResearch: undefined,
        qualityAssessment: undefined
      });

      expect(section).toContain('建议补充艾瑞/QuestMobile');
      expect(section).toContain('建议获取竞品公开财务数据');
      expect(section).toContain('建议进行用户调研');
    });

    it('should explain confidence levels', () => {
      const section = renderDataQualitySection({
        marketData: { marketSize: "100亿", growthRate: "20%" },
        competitors: [],
        userResearch: undefined,
        qualityAssessment: undefined
      });

      expect(section).toContain('**高置信度**: 数据来自官方/权威来源');
      expect(section).toContain('**中置信度**: 数据来自行业报告/公开分析');
      expect(section).toContain('**低置信度**: 数据基于模型推断');
    });
  });
});
