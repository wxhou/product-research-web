/**
 * Reporter Worker Tests
 *
 * Tests for Reporter Worker including:
 * - Report section validation
 * - MermaidChart generation
 * - Citation management
 * - Report metadata
 * - Template rendering integration
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import type { ReportSection, MermaidChart, ReportMetadata, Citation } from '../../research-agent/types';
import {
  REPORT_TEMPLATE,
  generateReportContent,
  generateTitleBlock,
  renderFeatureTable,
  renderCompetitorTable,
  renderList,
  renderFeaturePieChart,
  renderCompetitorMindmap,
  renderSourceList,
  renderFeatureValueAnalysis,
  renderCompetitorAnalysis,
  renderCompetitorDifferentiation,
  renderMarketGaps,
  renderShortTermRecommendations,
  renderMediumTermRecommendations,
  renderLongTermRecommendations,
  renderPricingTiers,
  renderUserPersonas,
  renderPenetrationRates,
  renderAdoptionTrends,
  renderUserSegmentationHeatmap,
} from '../research-agent/workers/reporter/templates';

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
        'xychart',
        'gantt',
        'heatmap',
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

    it('should create citation with all fields', () => {
      const citation: Citation = {
        id: 'cite1',
        source: 'duckduckgo',
        title: 'Example',
        url: 'https://example.com',
        relevanceScore: 0.92,
        referencedAt: '2024-01-29T10:00:00Z',
      };

      expect(citation.relevanceScore).toBe(0.92);
      expect(citation.referencedAt).toBeDefined();
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

describe('Report Template', () => {
  describe('REPORT_TEMPLATE structure', () => {
    it('should have required sections', () => {
      expect(REPORT_TEMPLATE.sections.length).toBeGreaterThan(0);
    });

    it('should have abstract section', () => {
      const abstractSection = REPORT_TEMPLATE.sections.find(s => s.id === 'abstract');
      expect(abstractSection).toBeDefined();
      expect(abstractSection?.required).toBe(true);
    });

    it('should have market analysis section', () => {
      const marketSection = REPORT_TEMPLATE.sections.find(s => s.id === 'market');
      expect(marketSection).toBeDefined();
    });

    it('should have competitor analysis section', () => {
      const competitorSection = REPORT_TEMPLATE.sections.find(s => s.id === 'competitors');
      expect(competitorSection).toBeDefined();
    });

    it('should have SWOT analysis section', () => {
      const swotSection = REPORT_TEMPLATE.sections.find(s => s.id === 'swot');
      expect(swotSection).toBeDefined();
    });

    it('should have recommendations section', () => {
      const recommendationsSection = REPORT_TEMPLATE.sections.find(s => s.id === 'recommendations');
      expect(recommendationsSection).toBeDefined();
    });

    it('should have sources section', () => {
      const sourcesSection = REPORT_TEMPLATE.sections.find(s => s.id === 'sources');
      expect(sourcesSection).toBeDefined();
      expect(sourcesSection?.required).toBe(true);
    });

    it('should have mermaid charts configuration', () => {
      expect(REPORT_TEMPLATE.mermaidCharts.length).toBeGreaterThan(0);
    });

    it('should have valid chart types', () => {
      const chartTypes = REPORT_TEMPLATE.mermaidCharts.map(c => c.type);
      expect(chartTypes).toContain('pie');
      expect(chartTypes).toContain('mindmap');
      expect(chartTypes).toContain('xychart');
    });
  });
});

describe('Template Helper Functions', () => {
  describe('renderFeatureTable', () => {
    it('should render feature table with data', () => {
      const features = [
        { name: '功能A', count: 10, description: '描述A' },
        { name: '功能B', count: 5, description: '描述B' },
      ];
      const table = renderFeatureTable(features);

      expect(table).toContain('功能A');
      expect(table).toContain('功能B');
      expect(table).toContain('10');
      expect(table).toContain('5');
    });

    it('should calculate percentages', () => {
      const features = [
        { name: '功能A', count: 3, description: '描述A' },
        { name: '功能B', count: 1, description: '描述B' },
      ];
      const table = renderFeatureTable(features);

      expect(table).toContain('75%');
      expect(table).toContain('25%');
    });

    it('should handle empty features', () => {
      const table = renderFeatureTable([]);
      expect(table).toContain('暂无功能数据');
    });

    it('should limit to 15 features', () => {
      const features = Array.from({ length: 20 }, (_, i) => ({
        name: `功能${i}`,
        count: i + 1,
        description: `描述${i}`,
      }));
      const table = renderFeatureTable(features);

      // Table should not contain the 16th feature
      expect(table).not.toContain('功能15');
    });
  });

  describe('renderCompetitorTable', () => {
    it('should render competitor table', () => {
      const competitors = [
        { name: '竞品A', industry: 'SaaS', features: ['功能1', '功能2'], description: '描述', marketPosition: '领导者' },
      ];
      const table = renderCompetitorTable(competitors);

      expect(table).toContain('竞品A');
      expect(table).toContain('SaaS');
      expect(table).toContain('功能1, 功能2');
    });

    it('should handle empty competitors', () => {
      const table = renderCompetitorTable([]);
      expect(table).toEqual('');
    });

    it('should limit to 10 competitors', () => {
      const competitors = Array.from({ length: 12 }, (_, i) => ({
        name: `竞品${i}`,
        industry: 'SaaS',
        features: ['功能'],
        description: '描述',
        marketPosition: '定位',
      }));
      const table = renderCompetitorTable(competitors);

      expect(table).not.toContain('竞品10');
    });
  });

  describe('renderList', () => {
    it('should render list items', () => {
      const list = renderList(['项目1', '项目2', '项目3']);
      expect(list).toContain('- 项目1');
      expect(list).toContain('- 项目2');
      expect(list).toContain('- 项目3');
    });

    it('should handle empty list', () => {
      const list = renderList([]);
      expect(list).toBe('暂无数据');
    });
  });

  describe('renderFeaturePieChart', () => {
    it('should render pie chart data', () => {
      const features = [
        { name: '功能A', count: 30 },
        { name: '功能B', count: 20 },
      ];
      const chart = renderFeaturePieChart(features);

      expect(chart).toContain('功能A');
      expect(chart).toContain('30');
      expect(chart).toContain('功能B');
    });

    it('should sanitize special characters', () => {
      const features = [
        { name: '功能"A"', count: 10 },
      ];
      const chart = renderFeaturePieChart(features);

      expect(chart).not.toContain('"功能"A""');
      expect(chart).toContain("'");
    });

    it('should handle empty features', () => {
      const chart = renderFeaturePieChart([]);
      expect(chart).toContain('暂无数据');
    });

    it('should limit to 8 features', () => {
      const features = Array.from({ length: 10 }, (_, i) => ({
        name: `功能${i}`,
        count: i + 1,
      }));
      const chart = renderFeaturePieChart(features);

      expect(chart).not.toContain('功能8');
    });
  });

  describe('renderCompetitorMindmap', () => {
    it('should render mindmap data', () => {
      const competitors = [
        { name: '竞品A', industry: 'SaaS', features: ['功能1'], description: '描述', marketPosition: '定位' },
      ];
      const mindmap = renderCompetitorMindmap(competitors);

      expect(mindmap).toContain('竞品A');
      expect(mindmap).toContain('SaaS');
    });

    it('should sanitize special characters in names', () => {
      const competitors = [
        { name: '竞品(A)', industry: 'SaaS', features: [], description: '描述', marketPosition: '定位' },
      ];
      const mindmap = renderCompetitorMindmap(competitors);

      expect(mindmap).not.toContain('(');
      expect(mindmap).not.toContain(')');
    });

    it('should handle empty competitors', () => {
      const mindmap = renderCompetitorMindmap([]);
      expect(mindmap).toContain('暂无竞品数据');
    });

    it('should limit to 5 competitors', () => {
      const competitors = Array.from({ length: 7 }, (_, i) => ({
        name: `竞品${i}`,
        industry: 'SaaS',
        features: [],
        description: '描述',
        marketPosition: '定位',
      }));
      const mindmap = renderCompetitorMindmap(competitors);

      expect(mindmap).not.toContain('竞品5');
    });
  });

  describe('renderSourceList', () => {
    it('should render source list', () => {
      const list = renderSourceList('Google, Bing, DuckDuckGo');
      expect(list).toContain('- Google');
      expect(list).toContain('- Bing');
      expect(list).toContain('- DuckDuckGo');
    });

    it('should handle single source', () => {
      const list = renderSourceList('Google');
      expect(list).toContain('- Google');
    });

    it('should trim whitespace', () => {
      const list = renderSourceList(' Google , Bing ');
      expect(list).toContain('- Google');
      expect(list).toContain('- Bing');
    });
  });

  describe('renderFeatureValueAnalysis', () => {
    it('should render feature value analysis', () => {
      const features = [
        { name: '核心功能', count: 10, description: '描述' },
        { name: '次要功能', count: 3, description: '描述' },
      ];
      const analysis = renderFeatureValueAnalysis(features);

      expect(analysis).toContain('核心功能');
      expect(analysis).toContain('重要功能');
    });

    it('should categorize by count', () => {
      const features = [
        { name: '核心', count: 10, description: '描述' },
        { name: '重要', count: 3, description: '描述' },
        { name: '辅助', count: 1, description: '描述' },
      ];
      const analysis = renderFeatureValueAnalysis(features);

      expect(analysis).toContain('核心功能');
      expect(analysis).toContain('重要功能');
      expect(analysis).toContain('辅助功能');
    });

    it('should handle empty features', () => {
      const analysis = renderFeatureValueAnalysis([]);
      expect(analysis).toContain('暂无功能价值分析数据');
    });

    it('should limit to 5 features', () => {
      const features = Array.from({ length: 7 }, (_, i) => ({
        name: `功能${i}`,
        count: i + 1,
        description: '描述',
      }));
      const analysis = renderFeatureValueAnalysis(features);

      expect(analysis).not.toContain('功能5');
    });
  });

  describe('renderCompetitorAnalysis', () => {
    it('should render competitor analysis', () => {
      const competitors = [
        { name: '竞品A', industry: 'SaaS', features: ['功能1'], description: '详细描述', marketPosition: '领导者' },
      ];
      const analysis = renderCompetitorAnalysis(competitors);

      expect(analysis).toContain('竞品A');
      expect(analysis).toContain('SaaS');
      expect(analysis).toContain('详细描述');
    });

    it('should handle multiple competitors', () => {
      const competitors = [
        { name: '竞品A', industry: 'SaaS', features: ['功能1'], description: '描述A', marketPosition: '定位A' },
        { name: '竞品B', industry: 'SaaS', features: ['功能2'], description: '描述B', marketPosition: '定位B' },
      ];
      const analysis = renderCompetitorAnalysis(competitors);

      expect(analysis).toContain('竞品A');
      expect(analysis).toContain('竞品B');
    });

    it('should handle empty competitors', () => {
      const analysis = renderCompetitorAnalysis([]);
      expect(analysis).toContain('暂无竞品深度分析数据');
    });
  });

  describe('renderCompetitorDifferentiation', () => {
    it('should render differentiation for multiple competitors', () => {
      const competitors = [
        { name: '竞品A', industry: 'SaaS', features: ['功能1', '功能2'], description: '', marketPosition: '' },
        { name: '竞品B', industry: 'SaaS', features: ['功能2', '功能3'], description: '', marketPosition: '' },
      ];
      const diff = renderCompetitorDifferentiation(competitors);

      expect(diff).toContain('竞品A');
      expect(diff).toContain('竞品B');
    });

    it('should identify unique features', () => {
      const competitors = [
        { name: '竞品A', industry: 'SaaS', features: ['功能1'], description: '', marketPosition: '' },
        { name: '竞品B', industry: 'SaaS', features: ['功能2'], description: '', marketPosition: '' },
      ];
      const diff = renderCompetitorDifferentiation(competitors);

      expect(diff).toContain('独特优势');
    });

    it('should require at least 2 competitors', () => {
      const competitors = [
        { name: '竞品A', industry: 'SaaS', features: ['功能1'], description: '', marketPosition: '' },
      ];
      const diff = renderCompetitorDifferentiation(competitors);
      expect(diff).toContain('竞品数量不足');
    });
  });

  describe('renderMarketGaps', () => {
    it('should render market gaps', () => {
      const competitors = [
        { name: '竞品A', industry: 'SaaS', features: ['功能1'] },
      ];
      const features = [
        { name: '功能A', count: 10 },
      ];
      const gaps = renderMarketGaps(competitors, features);

      expect(gaps).toContain('垂直行业深耕');
      expect(gaps).toContain('中小企业市场');
      expect(gaps).toContain('私有化部署');
    });

    it('should include feature-based gaps', () => {
      const competitors = [{ name: '竞品A', industry: 'SaaS', features: ['功能1'] }];
      const features = [
        { name: '功能A', count: 10 },
        { name: '功能B', count: 5 },
        { name: '功能C', count: 3 },
      ];
      const gaps = renderMarketGaps(competitors, features);

      expect(gaps).toContain('功能A');
      expect(gaps).toContain('功能B');
      expect(gaps).toContain('功能C');
    });
  });

  describe('renderShortTermRecommendations', () => {
    it('should render short-term recommendations', () => {
      const analysis = {
        features: [{ name: '功能A', count: 10, description: '描述' }],
        competitors: [{ name: '竞品A', industry: 'SaaS', features: [], description: '', marketPosition: '' }],
        swot: { strengths: ['优势A'], weaknesses: [], opportunities: [], threats: [] },
        marketData: { trends: [], opportunities: [], challenges: [], marketSize: '', growthRate: '', keyPlayers: [] },
        techAnalysis: {},
      } as any;
      const recommendations = renderShortTermRecommendations(analysis);

      expect(recommendations).toContain('差异化定位');
      expect(recommendations).toContain('功能优化');
      expect(recommendations).toContain('优势强化');
    });

    it('should handle empty analysis', () => {
      const analysis = {
        features: [],
        competitors: [],
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        marketData: { trends: [], opportunities: [], challenges: [], marketSize: '', growthRate: '', keyPlayers: [] },
        techAnalysis: {},
      } as any;
      const recommendations = renderShortTermRecommendations(analysis);

      expect(recommendations).toContain('暂无短期建议');
    });
  });

  describe('renderMediumTermRecommendations', () => {
    it('should render medium-term recommendations', () => {
      const analysis = {
        features: [],
        competitors: [],
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        marketData: {
          trends: ['趋势A'],
          opportunities: ['机会A'],
          challenges: [],
          marketSize: '',
          growthRate: '',
          keyPlayers: [],
        },
        techAnalysis: { techStack: [], emergingTech: ['新技术A'], architecture: [], innovationPoints: [] },
      } as any;
      const recommendations = renderMediumTermRecommendations(analysis);

      expect(recommendations).toContain('趋势把握');
      expect(recommendations).toContain('机会把握');
      expect(recommendations).toContain('技术升级');
    });
  });

  describe('renderLongTermRecommendations', () => {
    it('should render long-term recommendations', () => {
      const analysis = {
        features: [],
        competitors: [],
        swot: {
          strengths: [],
          weaknesses: [],
          opportunities: [],
          threats: ['威胁A'],
        },
        marketData: {
          trends: [],
          opportunities: [],
          challenges: ['挑战A'],
          marketSize: '',
          growthRate: '',
          keyPlayers: [],
        },
        techAnalysis: { innovationPoints: ['创新点A'], techStack: [], emergingTech: [], architecture: [] },
      } as any;
      const recommendations = renderLongTermRecommendations(analysis);

      expect(recommendations).toContain('风险应对');
      expect(recommendations).toContain('挑战突破');
      expect(recommendations).toContain('创新驱动');
      expect(recommendations).toContain('生态建设');
      expect(recommendations).toContain('国际化');
    });
  });

  describe('renderPricingTiers', () => {
    it('should render pricing tiers', () => {
      const tiers = [
        { name: '基础版', price: '$0', features: '核心功能' },
        { name: '专业版', price: '$29', features: '全部功能' },
      ];
      const rendered = renderPricingTiers(tiers);

      expect(rendered).toContain('基础版');
      expect(rendered).toContain('专业版');
      expect(rendered).toContain('$0');
      expect(rendered).toContain('$29');
    });

    it('should handle empty tiers', () => {
      const rendered = renderPricingTiers(undefined);
      expect(rendered).toContain('暂无定价信息');
    });
  });

  describe('renderUserPersonas', () => {
    it('should render user personas', () => {
      const personas = [
        {
          name: '职场新人',
          demographics: { ageRange: '22-28岁', genderRatio: '55%男/45%女', geographicDistribution: '一线城市', incomeLevel: '10-20万年薪' },
          behavioral: { usageFrequency: '每日使用', preferredFeatures: ['效率工具'], paymentWillingness: '中等' },
          source: 'Web Search',
        },
      ];
      const rendered = renderUserPersonas(personas);

      expect(rendered).toContain('职场新人');
      expect(rendered).toContain('22-28岁');
      expect(rendered).toContain('效率工具');
    });

    it('should handle empty personas', () => {
      const rendered = renderUserPersonas(undefined);
      expect(rendered).toContain('暂无用户画像数据');
    });
  });

  describe('renderPenetrationRates', () => {
    it('should render penetration rates', () => {
      const rate = {
        overall: 10,
        bySegment: [
          { segment: '大型企业', rate: 15 },
          { segment: '中小企业', rate: 8 },
        ],
      };
      const rendered = renderPenetrationRates(rate);

      expect(rendered).toContain('大型企业');
      expect(rendered).toContain('15%');
      expect(rendered).toContain('中小企业');
    });

    it('should handle undefined rate', () => {
      const rendered = renderPenetrationRates(undefined);
      expect(rendered).toContain('暂无数据');
    });
  });

  describe('renderAdoptionTrends', () => {
    it('should render adoption trends', () => {
      const trends = [
        { phase: '创新者', percentage: 2.5, description: '最早采用' },
        { phase: '早期采用者', percentage: 13.5, description: '愿意尝试' },
      ];
      const rendered = renderAdoptionTrends(trends);

      expect(rendered).toContain('创新者');
      expect(rendered).toContain('2.5%');
      expect(rendered).toContain('早期采用者');
    });

    it('should handle empty trends', () => {
      const rendered = renderAdoptionTrends(undefined);
      expect(rendered).toContain('探索期');
    });
  });

  describe('renderUserSegmentationHeatmap', () => {
    it('should render heatmap', () => {
      const rendered = renderUserSegmentationHeatmap();

      expect(rendered).toContain('用户群体');
      expect(rendered).toContain('青少年');
      expect(rendered).toContain('职场人士');
      expect(rendered).toContain('退休人群');
      expect(rendered).toContain('🟢');
      expect(rendered).toContain('🔴');
      expect(rendered).toContain('说明');
    });
  });
});

describe('generateTitleBlock', () => {
  it('should generate title block with title', () => {
    const block = generateTitleBlock('测试报告', ['关键词1', '关键词2']);

    expect(block).toContain('# 测试报告');
    expect(block).toContain('调研时间');
    expect(block).toContain('调研主题');
    expect(block).toContain('关键词');
  });

  it('should include keywords', () => {
    const block = generateTitleBlock('测试报告', ['关键词1', '关键词2']);

    expect(block).toContain('关键词1');
    expect(block).toContain('关键词2');
  });

  it('should include timestamp', () => {
    const block = generateTitleBlock('测试报告', []);

    expect(block).toContain(new Date().getFullYear().toString());
  });
});

describe('generateReportContent Integration', () => {
  it('should generate report with all sections', () => {
    const mockAnalysis = {
      features: [
        { name: '功能A', count: 10, description: '核心功能', sources: [] },
        { name: '功能B', count: 5, description: '辅助功能', sources: [] },
      ],
      competitors: [
        { name: '竞品A', industry: 'SaaS', features: ['功能1'], description: '描述', marketPosition: '领导者' },
      ],
      swot: {
        strengths: ['技术领先'],
        weaknesses: ['市场份额低'],
        opportunities: ['新兴市场'],
        threats: ['竞争加剧'],
      },
      marketData: {
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['公司A', '公司B'],
        trends: ['AI adoption'],
        opportunities: ['Emerging markets'],
        challenges: ['Competition'],
        marketSizeRange: { min: '$40B', base: '$50B', max: '$60B', currency: 'USD' },
        growthRateHistorical: [
          { year: '2022', rate: '12%', source: 'Historical' },
          { year: '2023', rate: '14%', source: 'Historical' },
        ],
        forecastYears: [
          { year: '2025', projectedSize: '$60B', projectedRate: '16%', methodology: 'CAGR' },
        ],
        dataSource: { primary: '艾瑞咨询', secondary: [], lastUpdated: '2024-01-01' },
        confidenceLevel: 'High' as const,
        marketDrivers: [{ factor: '技术创新', impact: 'High' as const, description: '推动增长' }],
        marketConstraints: [{ factor: '监管政策', impact: 'Medium' as const, description: '增加合规成本' }],
      },
      confidenceScore: 0.85,
      dataGaps: ['缺少竞品财务数据'],
    };

    const report = generateReportContent(
      '测试产品',
      ['关键词1', '关键词2'],
      100,
      50,
      mockAnalysis as any,
      ['数据源A', '数据源B']
    );

    expect(report).toContain('# 测试产品');
    expect(report).toContain('## 摘要');
    expect(report).toContain('## 1. 调研概览');
    expect(report).toContain('## 2. 市场分析');
    expect(report).toContain('## 3. 功能分析');
    expect(report).toContain('## 4. 竞品分析');
    expect(report).toContain('## 7. SWOT 分析');
    expect(report).toContain('## 8. 战略建议');
    expect(report).toContain('## 11. 数据来源说明');
  });

  it('should include market data in report', () => {
    const mockAnalysis = {
      features: [],
      competitors: [],
      swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      marketData: {
        marketSize: '$50B',
        growthRate: '15%',
        keyPlayers: ['公司A'],
        trends: [],
        opportunities: [],
        challenges: [],
        marketSizeRange: { min: '$40B', base: '$50B', max: '$60B', currency: 'USD' },
        growthRateHistorical: [{ year: '2022', rate: '12%', source: 'Test' }],
        forecastYears: [{ year: '2025', projectedSize: '$60B', projectedRate: '16%', methodology: 'Test' }],
        dataSource: { primary: 'Test', secondary: [], lastUpdated: '2024-01-01' },
        confidenceLevel: 'High' as const,
        marketDrivers: [],
        marketConstraints: [],
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

    expect(report).toContain('$50B');
    expect(report).toContain('15%');
    expect(report).toContain('High');
  });

  it('should handle minimal analysis data', () => {
    const mockAnalysis = {
      features: [],
      competitors: [],
      swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      marketData: {
        marketSize: '',
        growthRate: '',
        keyPlayers: [],
        trends: [],
        opportunities: [],
        challenges: [],
      },
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

    expect(report).toContain('# 测试产品');
    expect(report).toContain('## 摘要');
  });

  it('should include SWOT analysis', () => {
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

    expect(report).toContain('技术优势');
    expect(report).toContain('资源有限');
    expect(report).toContain('市场增长');
    expect(report).toContain('新进入者');
  });
});
