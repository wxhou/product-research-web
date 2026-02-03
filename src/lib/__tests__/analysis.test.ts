/**
 * @jest-environment jsdom
 */

import { describe, it, expect } from '@jest/globals';
import { analyzeSearchResults, generateFullReport, type AnalysisResult } from '../analysis';
import type { SearchResult } from '../datasources';

describe('Analysis Module', () => {
  const mockSearchResults: SearchResult[] = [
    {
      id: '1',
      title: 'ThingWorx 工业物联网平台',
      url: 'https://example.com/thingworx',
      source: 'brave',
      content: 'ThingWorx是PTC推出的工业物联网平台，提供实时监测、故障预测、预警告警等功能。支持多数据源接入和AI分析。'
    },
    {
      id: '2',
      title: '西门子 MindSphere',
      url: 'https://example.com/mindsphere',
      source: 'exa',
      content: '西门子MindSphere是面向制造业的工业操作系统，提供数据可视化、工单管理、IoT集成等功能。'
    },
    {
      id: '3',
      title: 'Predix 工业数据分析平台',
      url: 'https://example.com/predix',
      source: 'brave',
      content: 'GE的Predix平台专注于工业数据分析，提供故障预测、实时监测、自动化运维等核心功能。'
    },
    {
      id: '4',
      title: '阿里云 工业大脑',
      url: 'https://example.com/ali-brain',
      source: 'exa',
      content: '阿里云工业大脑整合AI分析、多数据源接入和移动端支持，为制造业提供智能化解决方案。'
    },
    {
      id: '5',
      title: '树根互联 根云平台',
      url: 'https://example.com/rootcloud',
      source: 'firecrawl',
      content: '根云平台提供设备监测、故障预测、数据可视化、API接口等完整的工业互联网解决方案。'
    }
  ];

  describe('analyzeSearchResults', () => {
    it('should extract features from search results', () => {
      const result = analyzeSearchResults(mockSearchResults, '工业物联网平台');

      expect(result.features).toBeDefined();
      expect(result.features.length).toBeGreaterThan(0);

      // Check for expected features
      const featureNames = result.features.map(f => f.name);
      expect(featureNames).toContain('实时监测');
      expect(featureNames).toContain('故障预测');
      expect(featureNames).toContain('预警告警');
      expect(featureNames).toContain('数据可视化');
      expect(featureNames).toContain('AI分析');
      expect(featureNames).toContain('IoT集成');
    });

    it('should calculate feature percentages correctly', () => {
      const result = analyzeSearchResults(mockSearchResults, '工业物联网平台');

      for (const feature of result.features) {
        expect(feature.percentage).toBeGreaterThanOrEqual(0);
        expect(feature.percentage).toBeLessThanOrEqual(100);
      }
    });

    it('should track sources for each feature', () => {
      const result = analyzeSearchResults(mockSearchResults, '工业物联网平台');

      for (const feature of result.features) {
        expect(feature.sources).toBeDefined();
        expect(Array.isArray(feature.sources)).toBe(true);
      }
    });

    it('should generate SWOT analysis', () => {
      const result = analyzeSearchResults(mockSearchResults, '工业物联网平台');

      expect(result.swot).toBeDefined();
      expect(result.swot.strengths).toBeDefined();
      expect(result.swot.weaknesses).toBeDefined();
      expect(result.swot.opportunities).toBeDefined();
      expect(result.swot.threats).toBeDefined();

      expect(result.swot.strengths.length).toBeGreaterThan(0);
      expect(result.swot.weaknesses.length).toBeGreaterThan(0);
      expect(result.swot.opportunities.length).toBeGreaterThan(0);
      expect(result.swot.threats.length).toBeGreaterThan(0);
    });

    it('should extract competitors from search results', () => {
      const result = analyzeSearchResults(mockSearchResults, '工业物联网平台');

      expect(result.competitors).toBeDefined();
      expect(result.competitors.length).toBeGreaterThan(0);
      expect(result.competitors.length).toBeLessThanOrEqual(5);
    });

    it('should detect industry for each competitor', () => {
      const result = analyzeSearchResults(mockSearchResults, '工业物联网平台');

      for (const competitor of result.competitors) {
        expect(competitor.industry).toBeDefined();
        expect(typeof competitor.industry).toBe('string');
      }
    });

    it('should generate Mermaid charts', () => {
      const result = analyzeSearchResults(mockSearchResults, '工业物联网平台');

      expect(result.mermaidCharts).toBeDefined();
      expect(result.mermaidCharts.length).toBeGreaterThan(0);

      // Check for required chart types
      const chartTypes = result.mermaidCharts.map(c => c.type);
      expect(chartTypes).toContain('pie'); // Feature frequency
      expect(chartTypes).toContain('timeline'); // Tech roadmap
      expect(chartTypes).toContain('mindmap'); // SWOT
      expect(chartTypes).toContain('journey'); // User journey
      expect(chartTypes).toContain('graph'); // Architecture diagram
    });

    it('should generate market data', () => {
      const result = analyzeSearchResults(mockSearchResults, '工业物联网平台');

      expect(result.marketData).toBeDefined();
      expect(result.marketData.marketSize).toBeDefined();
      expect(result.marketData.growthRate).toBeDefined();
      expect(result.marketData.keyPlayers).toBeDefined();
      expect(result.marketData.trends).toBeDefined();
    });

    it('should handle empty search results', () => {
      const result = analyzeSearchResults([], 'Empty Project');

      expect(result.features).toEqual([]);
      expect(result.competitors.length).toBeGreaterThan(0); // Should add default competitors
      expect(result.mermaidCharts.length).toBeGreaterThan(0);
    });

    it('should sort features by count descending', () => {
      const result = analyzeSearchResults(mockSearchResults, '工业物联网平台');

      for (let i = 1; i < result.features.length; i++) {
        expect(result.features[i - 1].count).toBeGreaterThanOrEqual(result.features[i].count);
      }
    });
  });

  describe('generateFullReport', () => {
    const mockProject = {
      id: 'proj-123',
      title: '工业物联网平台',
      description: '智能制造解决方案',
      keywords: '["物联网", "工业", "预测性维护"]'
    };

    const mockAnalysis: AnalysisResult = {
      features: [
        { name: '实时监测', count: 4, percentage: 80, sources: ['brave', 'exa'] },
        { name: '故障预测', count: 3, percentage: 60, sources: ['brave', 'firecrawl'] },
      ],
      swot: {
        strengths: ['多数据源实时采集', 'AI驱动分析'],
        weaknesses: ['行业定制化不足'],
        opportunities: ['制造业数字化转型'],
        threats: ['国际厂商竞争']
      },
      competitors: [
        {
          name: 'ThingWorx',
          url: 'https://example.com',
          features: ['实时监测', '故障预测'],
          description: 'PTC工业物联网平台',
          industry: '制造业'
        }
      ],
      marketData: {
        marketSize: '数百亿',
        growthRate: '20%',
        keyPlayers: ['西门子', 'GE', 'PTC'],
        trends: ['AI与IoT融合', '边缘计算']
      },
      mermaidCharts: [
        {
          id: 'feature-frequency',
          type: 'bar',
          title: '功能频率分布',
          content: 'xychart-beta\ntitle "Test"'
        },
        {
          id: 'swot-mindmap',
          type: 'mindmap',
          title: 'SWOT分析',
          content: 'mindmap\nroot((SWOT))'
        }
      ]
    };

    it('should generate a complete report with all sections', () => {
      const report = generateFullReport(mockProject, mockSearchResults, mockAnalysis);

      expect(report).toContain('# 工业物联网平台');
      expect(report).toContain('## 摘要');
      expect(report).toContain('## 1. 调研概览');
      expect(report).toContain('### 5.2 功能频率分布图');
      expect(report).toContain('### 5.3 功能对比矩阵');
      expect(report).toContain('## 7. SWOT 分析');
      expect(report).toContain('## 4. 竞品分析');
      expect(report).toContain('## 2. 市场背景分析');
      expect(report).toContain('## 5. 功能分析');
      expect(report).toContain('## 6. 技术分析');
      expect(report).toContain('## 8. 商业模式分析');
      expect(report).toContain('## 9. 市场机会分析');
      expect(report).toContain('## 10. 技术路线演进');
      expect(report).toContain('## 12. 战略建议');
      expect(report).toContain('## 17. 调研产品详单');
    });

    it('should include project metadata', () => {
      const report = generateFullReport(mockProject, mockSearchResults, mockAnalysis);

      expect(report).toContain('调研主题: 智能制造解决方案');
      expect(report).toContain('关键词: 物联网, 工业, 预测性维护');
    });

    it('should include feature table', () => {
      const report = generateFullReport(mockProject, mockSearchResults, mockAnalysis);

      expect(report).toContain('| 功能 | 出现次数 | 占比 |');
      expect(report).toContain('| 实时监测 |');
    });

    it('should include Mermaid charts', () => {
      const report = generateFullReport(mockProject, mockSearchResults, mockAnalysis);

      expect(report).toContain('```mermaid');
      expect(report).toContain('xychart-beta');
      expect(report).toContain('mindmap');
    });

    it('should include SWOT sections', () => {
      const report = generateFullReport(mockProject, mockSearchResults, mockAnalysis);

      expect(report).toContain('### 7.1 优势 (Strengths)');
      expect(report).toContain('### 7.2 劣势 (Weaknesses)');
      expect(report).toContain('### 7.3 机会 (Opportunities)');
      expect(report).toContain('### 7.4 威胁 (Threats)');
    });

    it('should include competitor cards', () => {
      const report = generateFullReport(mockProject, mockSearchResults, mockAnalysis);

      expect(report).toContain('#### 1. ThingWorx');
      expect(report).toContain('**行业定位**: 制造业');
      expect(report).toContain('**核心功能**:');
    });

    it('should include market data', () => {
      const report = generateFullReport(mockProject, mockSearchResults, mockAnalysis);

      expect(report).toContain('| 市场规模 |');
      expect(report).toContain('| 年增长率 |');
      expect(report).toContain('数百亿');
      expect(report).toContain('20%');
    });

    it('should include search result citations', () => {
      const report = generateFullReport(mockProject, mockSearchResults, mockAnalysis);

      expect(report).toContain('## 17. 调研产品详单');
      expect(report).toContain('ThingWorx 工业物联网平台');
    });

    it('should include timestamp', () => {
      const report = generateFullReport(mockProject, mockSearchResults, mockAnalysis);

      expect(report).toContain('报告生成时间:');
    });

    it('should handle empty keywords', () => {
      const projectWithEmptyKeywords = { ...mockProject, keywords: '[]' };
      const report = generateFullReport(projectWithEmptyKeywords, mockSearchResults, mockAnalysis);

      expect(report).toContain('关键词:');
      expect(report).not.toContain('undefined');
    });
  });
});

describe('Feature Extraction', () => {
  it('should detect multiple features in single result', () => {
    const results: SearchResult[] = [
      {
        id: '1',
        title: '智能运维平台',
        url: 'https://example.com',
        source: 'test',
        content: '提供实时监测、故障预测、预警告警、工单管理、数据可视化等完整功能'
      }
    ];

    const result = analyzeSearchResults(results, '智能运维');

    const featureNames = result.features.map(f => f.name);
    expect(featureNames).toContain('实时监测');
    expect(featureNames).toContain('故障预测');
    expect(featureNames).toContain('预警告警');
    expect(featureNames).toContain('工单管理');
    expect(featureNames).toContain('数据可视化');
  });

  it('should be case insensitive', () => {
    const results: SearchResult[] = [
      {
        id: '1',
        title: 'AI Platform',
        url: 'https://example.com',
        source: 'test',
        content: 'ARTIFICIAL INTELLIGENCE and MACHINE LEARNING capabilities'
      }
    ];

    const result = analyzeSearchResults(results, 'AI Platform');

    expect(result.features.some(f => f.name === 'AI分析')).toBe(true);
  });
});
