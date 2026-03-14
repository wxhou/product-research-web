/**
 * 质量门禁配置
 *
 * 可配置的质量检查规则和阈值
 */

import type { ConsistencyCheckConfig } from '../consistency/detector';
import type { ReferenceValidationConfig } from '../references/validator';

/**
 * 质量门禁规则配置
 */
export interface QualityGateConfig {
  /** 是否启用质量门禁 */
  enabled: boolean;
  /** 最低质量分数阈值 */
  minQualityScore: number;
  /** 允许跳过的检查类型 */
  skippedChecks: QualityCheckType[];
  /** 数据一致性检查配置 */
  consistency: ConsistencyCheckConfig;
  /** 结构完整性检查配置 */
  structural: StructuralCheckConfig;
  /** 深度检查配置 */
  depth: DepthCheckConfig;
  /** 参考文献验证配置 */
  references: ReferenceValidationConfig;
}

/**
 * 检查类型
 */
export type QualityCheckType =
  | 'structural'
  | 'depth'
  | 'actionability'
  | 'citation'
  | 'consistency'
  | 'keywords'
  | 'references';

/**
 * 结构完整性检查配置
 */
export interface StructuralCheckConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 必需章节列表 */
  requiredSections: string[];
  /** 每章节最小字数 */
  minSectionLength: number;
  /** 章节缺失扣分 */
  missingSectionPenalty: number;
  /** 内容不足扣分 */
  insufficientContentPenalty: number;
}

/**
 * 深度检查配置
 */
export interface DepthCheckConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 最少数据点数 */
  minDataPoints: number;
  /** 是否需要对比分析 */
  requireComparison: boolean;
  /** 是否需要趋势分析 */
  requireTrend: boolean;
}

/**
 * 严格程度预设
 */
export const STRICTNESS_PRESETS = {
  /** 宽松 - 最低要求 */
  lenient: {
    enabled: true,
    minQualityScore: 50,
    skippedChecks: [],
    consistency: {
      checkDuplicateMetrics: true,
      checkPercentageOverflow: true,
      checkLogicalContradictions: false,
      enableLLMDetection: false,
      checkPercentageSum: false,
      checkROICalculation: false,
    },
    structural: {
      enabled: true,
      requiredSections: ['市场分析', '竞争格局', '战略建议'],
      minSectionLength: 200,
      missingSectionPenalty: 15,
      insufficientContentPenalty: 5,
    },
    depth: {
      enabled: true,
      minDataPoints: 3,
      requireComparison: false,
      requireTrend: false,
    },
    references: {
      checkDuplicates: true,
      checkNumbering: false,
      checkMatching: false,
      enableLLMCompletion: false,
    },
  } as QualityGateConfig,

  /** 标准 - 推荐设置 */
  standard: {
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
  } as QualityGateConfig,

  /** 严格 - 高标准要求 */
  strict: {
    enabled: true,
    minQualityScore: 80,
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
      requiredSections: ['执行摘要', '市场分析', '竞争格局', '功能分析', 'SWOT分析', '战略建议', '实施计划'],
      minSectionLength: 500,
      missingSectionPenalty: 25,
      insufficientContentPenalty: 15,
    },
    depth: {
      enabled: true,
      minDataPoints: 10,
      requireComparison: true,
      requireTrend: true,
    },
    references: {
      checkDuplicates: true,
      checkNumbering: true,
      checkMatching: true,
      enableLLMCompletion: true,
    },
  } as QualityGateConfig,
};

/**
 * 默认配置（标准模式）
 */
export const DEFAULT_QUALITY_GATE: QualityGateConfig = STRICTNESS_PRESETS.standard;

/**
 * 创建质量门禁检查器
 */
export function createQualityGate(config: Partial<QualityGateConfig> = {}) {
  const finalConfig: QualityGateConfig = {
    ...DEFAULT_QUALITY_GATE,
    ...config,
    consistency: {
      ...DEFAULT_QUALITY_GATE.consistency,
      ...(config.consistency || {}),
    },
    structural: {
      ...DEFAULT_QUALITY_GATE.structural,
      ...(config.structural || {}),
    },
    depth: {
      ...DEFAULT_QUALITY_GATE.depth,
      ...(config.depth || {}),
    },
    references: {
      ...DEFAULT_QUALITY_GATE.references,
      ...(config.references || {}),
    },
  };

  return {
    config: finalConfig,
    shouldFail: (qualityScore: number, issues: string[]): boolean => {
      if (!finalConfig.enabled) return false;
      if (qualityScore < finalConfig.minQualityScore) return true;
      if (issues.length > 0 && finalConfig.skippedChecks.length === 0) {
        // 严重问题导致失败
        const criticalIssues = issues.filter(i =>
          i.toLowerCase().includes('错误') ||
          i.toLowerCase().includes('矛盾')
        );
        return criticalIssues.length > 0;
      }
      return false;
    },
    getFailedChecks: (qualityScore: number, issues: string[]): QualityCheckType[] => {
      const failed: QualityCheckType[] = [];
      if (finalConfig.enabled && qualityScore < finalConfig.minQualityScore) {
        failed.push('structural', 'depth', 'actionability', 'citation');
      }
      return failed;
    },
  };
}

/**
 * 导出配置管理器
 */
export const qualityGateManager = {
  presets: STRICTNESS_PRESETS,
  default: DEFAULT_QUALITY_GATE,
  create: createQualityGate,
};
