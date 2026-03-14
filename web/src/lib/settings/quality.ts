/**
 * 质量检查设置类型定义
 */

import type { QualityGateConfig } from '../lib/research-agent/workers/reporter/quality-gate';

/**
 * 报告质量设置
 */
export interface ReportQualitySettings {
  /** 是否启用自动质量检查 */
  autoCheck: boolean;
  /** 是否自动提取关键词 */
  autoKeywords: boolean;
  /** 是否自动提取参考文献 */
  autoReferences: boolean;
  /** 是否进行数据一致性检查 */
  consistencyCheck: boolean;
  /** 是否进行参考文献验证 */
  referenceValidation: boolean;
  /** 是否启用迭代优化 */
  iterativeOptimization: boolean;
  /** 质量门禁配置 */
  qualityGate: QualityGateConfig;
  /** ROI分析开关 */
  enableROI: boolean;
  /** 实施计划开关 */
  enableImplementation: boolean;
  /** 战略建议生成开关 */
  enableStrategicRecommendations: boolean;
}

/**
 * 默认质量设置
 */
export const DEFAULT_QUALITY_SETTINGS: ReportQualitySettings = {
  autoCheck: true,
  autoKeywords: true,
  autoReferences: true,
  consistencyCheck: true,
  referenceValidation: true,
  iterativeOptimization: false,
  qualityGate: {
    enabled: true,
    minQualityScore: 65,
    skippedChecks: [],
    consistency: {
      checkDuplicateMetrics: true,
      checkPercentageOverflow: true,
      checkLogicalContradictions: true,
      enableLLMDetection: true,
      checkPercentageSum: true,
      checkROICalculation: true,
    },
    structural: {
      enabled: true,
      requiredSections: ['执行摘要', '市场分析', '竞争格局', '功能分析', 'SWOT分析', '战略建议'],
      minSectionLength: 300,
      missingSectionPenalty: 20,
      insufficientContentPenalty: 10,
    },
    depth: {
      enabled: true,
      minDataPoints: 5,
      requireComparison: true,
      requireTrend: false,
    },
    references: {
      checkDuplicates: true,
      checkNumbering: true,
      checkMatching: true,
      enableLLMCompletion: true,
    },
  },
  enableROI: false,
  enableImplementation: false,
  enableStrategicRecommendations: false,
};
