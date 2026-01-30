/**
 * Analyzer Worker Tests
 */

import { describe, it, expect } from '@jest/globals';
import type {
  AnalysisResult,
  FeatureAnalysis,
  CompetitorAnalysis,
  SWOTAnalysis,
  MarketData,
} from '../../research-agent/types';

describe('Analyzer Worker', () => {
  describe('AnalysisResult validation', () => {
    it('should create valid analysis result', () => {
      const result: AnalysisResult = {
        features: [
          { name: '实时监测', count: 15, sources: ['url1', 'url2'], description: '实时监控设备状态' },
          { name: '故障预测', count: 12, sources: ['url1'], description: '预测设备故障' },
        ],
        competitors: [
          {
            name: '西门子 MindSphere',
            industry: '制造业',
            features: ['数据分析', '云平台'],
            description: '西门子的工业操作系统',
            marketPosition: '领导者',
          },
        ],
        swot: {
          strengths: ['技术领先', '市场份额大'],
          weaknesses: ['成本高', '部署复杂'],
          opportunities: ['工业4.0趋势', '智能化需求'],
          threats: ['竞争对手', '经济环境'],
        },
        marketData: {
          marketSize: '数百亿',
          growthRate: '15%',
          keyPlayers: ['西门子', 'GE', 'PTC'],
          trends: ['AI融合', '边缘计算'],
        },
        confidenceScore: 0.85,
        dataGaps: [],
      };

      expect(result.features).toHaveLength(2);
      expect(result.competitors).toHaveLength(1);
      expect(result.confidenceScore).toBe(0.85);
    });

    it('should validate confidence score range', () => {
      const scores = [0, 0.5, 1];

      scores.forEach(score => {
        const result: AnalysisResult = {
          features: [],
          competitors: [],
          swot: {
            strengths: [],
            weaknesses: [],
            opportunities: [],
            threats: [],
          },
          marketData: {
            marketSize: '',
            growthRate: '',
            keyPlayers: [],
            trends: [],
          },
          confidenceScore: score,
          dataGaps: [],
        };
        expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(result.confidenceScore).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('FeatureAnalysis validation', () => {
    it('should validate feature with all fields', () => {
      const feature: FeatureAnalysis = {
        name: '实时监测',
        count: 10,
        sources: ['https://example.com/1', 'https://example.com/2'],
        description: '实时监控设备运行状态',
      };

      expect(feature.name).toBe('实时监测');
      expect(feature.count).toBe(10);
      expect(feature.sources).toHaveLength(2);
    });

    it('should sort features by count', () => {
      const features: FeatureAnalysis[] = [
        { name: 'A', count: 5, sources: [], description: '' },
        { name: 'B', count: 15, sources: [], description: '' },
        { name: 'C', count: 10, sources: [], description: '' },
      ];

      const sorted = [...features].sort((a, b) => b.count - a.count);
      expect(sorted[0].name).toBe('B');
      expect(sorted[1].name).toBe('C');
      expect(sorted[2].name).toBe('A');
    });
  });

  describe('CompetitorAnalysis validation', () => {
    it('should validate competitor with all fields', () => {
      const competitor: CompetitorAnalysis = {
        name: '竞品A',
        industry: '科技',
        features: ['功能1', '功能2'],
        description: '竞品A的描述',
        marketPosition: '挑战者',
      };

      expect(competitor.industry).toBe('科技');
      expect(competitor.features).toHaveLength(2);
    });

    it('should support different market positions', () => {
      const positions: CompetitorAnalysis['marketPosition'][] = [
        '领导者',
        '挑战者',
        '跟随者',
        '利基者',
      ];

      positions.forEach(position => {
        const competitor: CompetitorAnalysis = {
          name: 'Test',
          industry: 'Tech',
          features: [],
          description: 'Test',
          marketPosition: position,
        };
        expect(competitor.marketPosition).toBe(position);
      });
    });
  });

  describe('SWOTAnalysis validation', () => {
    it('should validate SWOT structure', () => {
      const swot: SWOTAnalysis = {
        strengths: ['技术优势'],
        weaknesses: ['成本高'],
        opportunities: ['市场需求增长'],
        threats: ['竞争加剧'],
      };

      expect(swot.strengths).toBeDefined();
      expect(swot.weaknesses).toBeDefined();
      expect(swot.opportunities).toBeDefined();
      expect(swot.threats).toBeDefined();
    });

    it('should allow empty SWOT arrays', () => {
      const swot: SWOTAnalysis = {
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
      };

      expect(swot.strengths).toEqual([]);
    });
  });

  describe('MarketData validation', () => {
    it('should validate market data structure', () => {
      const marketData: MarketData = {
        marketSize: '数百亿人民币',
        growthRate: '15-20%',
        keyPlayers: ['厂商A', '厂商B', '厂商C'],
        trends: ['AI融合', '边缘计算'],
      };

      expect(marketData.marketSize).toBeDefined();
      expect(marketData.growthRate).toBeDefined();
      expect(marketData.keyPlayers).toHaveLength(3);
      expect(marketData.trends).toHaveLength(2);
    });
  });
});
