/**
 * 报告增强器
 *
 * 在报告生成后增强报告内容：
 * - 竞品分析模块
 * - 客户画像模块
 * - ROI 计算模块
 * - 实施计划模块
 * - 数据一致性检查
 * - 参考文献验证
 * - 战略建议生成
 */

import { createCompetitiveAnalyzer, generateComparisonMarkdown } from './competitive/analyzer';
import { createComparator } from './competitive/comparator';
import { detectMissingBrands, supplementBrandIntelligence } from './competitive/brand-database';
import { createCustomerProfiler, generateProfileMarkdown } from './customer/profiler';
import { createConsistencyChecker } from './consistency/detector';
import { createDataFixer, type FixSuggestion } from './consistency/fixer';
import { createReferenceValidator, createSourceTracer } from './references/validator';
import { createStrategicRecommender, evaluateRecommendationActionability } from './strategic-recommender';
import { createReviewReportGenerator } from './review-report-generator';
import type { QualityGateConfig } from './quality-gate';

/**
 * 报告增强配置
 */
export interface ReportEnhancerConfig {
  /** 是否添加竞品分析 */
  enableCompetitiveAnalysis?: boolean;
  /** 是否添加客户画像 */
  enableCustomerProfile?: boolean;
  /** 是否添加 ROI 计算 */
  enableROICalculation?: boolean;
  /** 是否添加实施计划 */
  enableImplementationPlan?: boolean;
  /** 是否进行数据一致性检查 */
  enableConsistencyCheck?: boolean;
  /** 是否进行参考文献验证 */
  enableReferenceValidation?: boolean;
  /** 是否生成战略建议 */
  enableStrategicRecommendations?: boolean;
  /** 是否生成数据修复建议 */
  enableFixSuggestions?: boolean;
  /** 是否生成评审报告 */
  enableReviewReport?: boolean;
  /** 质量门禁配置 */
  qualityGate?: Partial<QualityGateConfig>;
}

/**
 * 默认配置
 * 注意：已禁用重复功能，因为 Analyzer 阶段已产生这些数据
 */
const DEFAULT_CONFIG: Required<ReportEnhancerConfig> = {
  enableCompetitiveAnalysis: false,  // Analyzer 已产生 competitors 数据
  enableCustomerProfile: false,    // Analyzer 已产生 userPersonaAnalysis 数据
  enableROICalculation: false,
  enableImplementationPlan: false,
  enableConsistencyCheck: true,     // 保留：有价值的质量检查
  enableReferenceValidation: true,  // 保留：有价值的引用验证
  enableStrategicRecommendations: false,  // Analyzer 已产生
  enableFixSuggestions: true,
  enableReviewReport: true,
  qualityGate: undefined,
};

/**
 * 竞品分析结果
 */
export interface CompetitiveAnalysisResult {
  competitors: string[];
  comparisonMatrix?: string;
  differentiators?: string;
  missingBrands?: string[];
  brandIntelligence?: BrandIntelligenceResult[];
}

/**
 * 品牌情报结果
 */
export interface BrandIntelligenceResult {
  brandName: string;
  marketPosition: string;
  keyProducts: string[];
  strengths: string[];
  challenges: string[];
  inferred: boolean;
  confidence: number;
}

/**
 * 客户画像结果
 */
export interface CustomerProfileResult {
  profile?: string;
}

/**
 * 数据一致性检查结果
 */
export interface ConsistencyCheckResult {
  hasIssues: boolean;
  report?: string;
  issues?: string[];
}

/**
 * 参考文献验证结果
 */
export interface ReferenceValidationResult {
  hasIssues: boolean;
  report?: string;
  statistics?: {
    totalReferences: number;
    usedInText: number;
    unused: number;
    duplicates: number;
  };
}

/**
 * 数据来源追溯结果
 */
export interface SourceTracingResult {
  totalDataPoints: number;
  withSource: number;
  withoutSource: number;
  summary: string;
}

/**
 * 战略建议结果
 */
export interface StrategicRecommendationResult {
  generated: boolean;
  section?: string;
  evaluation?: RecommendationEvaluation;
}

/**
 * 战略建议评估结果
 */
export interface RecommendationEvaluation {
  score: number;
  issues: string[];
  suggestions: string[];
}

/**
 * 数据修复建议结果
 */
export interface FixSuggestionsResult {
  hasSuggestions: boolean;
  suggestions?: FixSuggestion[];
}

/**
 * 评审报告结果
 */
export interface ReviewReportResult {
  generated: boolean;
  overallScore?: number;
  dimensions?: Array<{
    dimension: string;
    score: number;
  }>;
  highPriorityIssues?: string[];
  summary?: string;
}

/**
 * 报告增强结果
 */
export interface EnhancementResult {
  success: boolean;
  competitiveAnalysis?: CompetitiveAnalysisResult;
  customerProfile?: CustomerProfileResult;
  consistencyCheck?: ConsistencyCheckResult;
  referenceValidation?: ReferenceValidationResult;
  sourceTracing?: SourceTracingResult;
  strategicRecommendations?: StrategicRecommendationResult;
  fixSuggestions?: FixSuggestionsResult;
  reviewReport?: ReviewReportResult;
  addedSections: string[];
  qualityReport?: string;
  error?: string;
}

/**
 * 创建报告增强器
 */
export function createReportEnhancer(config: Partial<ReportEnhancerConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return {
    config: finalConfig,
    enhance: async (
      report: string,
      industry: string,
      productName?: string,
      productType?: string
    ): Promise<EnhancementResult> => {
      return enhanceReport(report, industry, productName, productType, finalConfig);
    },
  };
}

/**
 * 增强报告内容
 */
async function enhanceReport(
  report: string,
  industry: string,
  productName?: string,
  productType?: string,
  config: Required<ReportEnhancerConfig>
): Promise<EnhancementResult> {
  const result: EnhancementResult = {
    success: true,
    addedSections: [],
  };

  let enhancedReport = report;

  // 0. 数据一致性检查
  if (config.enableConsistencyCheck) {
    try {
      await updateEnhancementProgress('检查数据一致性');
      const checker = createConsistencyChecker(config.qualityGate?.consistency);
      const consistencyReport = await checker.check(report);

      if (consistencyReport.totalIssues > 0) {
        result.consistencyCheck = {
          hasIssues: true,
          report: consistencyReport.summary,
          issues: consistencyReport.issues.map(i => i.title),
        };

        // 生成修复建议
        if (config.enableFixSuggestions && consistencyReport.issues.length > 0) {
          await updateEnhancementProgress('生成修复建议');
          const fixer = createDataFixer();
          const fixSuggestions = await fixer.suggest(consistencyReport.issues, report);

          if (fixSuggestions.length > 0) {
            result.fixSuggestions = {
              hasSuggestions: true,
              suggestions: fixSuggestions,
            };
          }
        }
      } else {
        result.consistencyCheck = { hasIssues: false };
      }
    } catch (error) {
      console.error('[ReportEnhancer] Consistency check failed:', error);
    }
  }

  // 0.5 参考文献验证
  if (config.enableReferenceValidation) {
    try {
      await updateEnhancementProgress('验证参考文献');
      const validator = createReferenceValidator(config.qualityGate?.references);
      const validationReport = await validator.validate(report);

      if (validationReport.totalIssues > 0) {
        result.referenceValidation = {
          hasIssues: true,
          report: validationReport.summary,
          statistics: validationReport.statistics,
        };
      } else {
        result.referenceValidation = {
          hasIssues: false,
          statistics: validationReport.statistics,
        };
      }

      // 0.6 数据来源追溯
      await updateEnhancementProgress('追溯数据来源');
      const sourceTracer = createSourceTracer();
      const sourceReport = await sourceTracer.trace(report);

      result.sourceTracing = {
        totalDataPoints: sourceReport.totalDataPoints,
        withSource: sourceReport.withSource,
        withoutSource: sourceReport.withoutSource,
        summary: sourceReport.summary,
      };
    } catch (error) {
      console.error('[ReportEnhancer] Reference validation failed:', error);
    }
  }

  // 1. 竞品分析
  if (config.enableCompetitiveAnalysis) {
    try {
      await updateEnhancementProgress('分析竞品格局');

      const analyzer = createCompetitiveAnalyzer();
      const competitors = await analyzer.identify(industry);

      if (competitors.length > 0) {
        // 生成对比矩阵
        const comparator = createComparator();
        const matrix = await comparator.compare(competitors);
        const comparisonMarkdown = comparator.toMarkdown(matrix);

        // 检测缺失品牌并补充情报
        const missingBrands = detectMissingBrands(report, industry);
        let brandIntelligence;
        if (missingBrands.length > 0) {
          await updateEnhancementProgress('补充缺失品牌情报');
          brandIntelligence = await supplementBrandIntelligence(missingBrands, industry, report);
        }

        // 添加到报告
        enhancedReport += `\n\n${comparisonMarkdown}`;
        result.competitiveAnalysis = {
          competitors: competitors.map(c => c.name),
          comparisonMatrix: comparisonMarkdown,
          missingBrands: missingBrands.map(b => b.name),
          brandIntelligence: brandIntelligence?.map(bi => ({
            brandName: bi.brandName,
            marketPosition: bi.marketPosition,
            keyProducts: bi.keyProducts,
            strengths: bi.strengths,
            challenges: bi.challenges,
            inferred: bi.inferred,
            confidence: bi.confidence,
          })),
        };
        result.addedSections.push('竞品对比分析');
      }
    } catch (error) {
      console.error('[ReportEnhancer] Competitive analysis failed:', error);
    }
  }

  // 2. 客户画像
  if (config.enableCustomerProfile && productName) {
    try {
      await updateEnhancementProgress('生成客户画像');

      const profiler = createCustomerProfiler();
      const profile = await profiler.generate(
        productName,
        productType || 'SaaS',
        industry
      );
      const profileMarkdown = profiler.toMarkdown(profile);

      // 添加到报告
      enhancedReport += `\n\n${profileMarkdown}`;
      result.customerProfile = {
        profile: profileMarkdown,
      };
      result.addedSections.push('目标客户画像');
    } catch (error) {
      console.error('[ReportEnhancer] Customer profile failed:', error);
    }
  }

  // 3. 战略建议生成
  if (config.enableStrategicRecommendations && productName) {
    try {
      await updateEnhancementProgress('生成战略建议');

      const recommender = createStrategicRecommender();
      const recommendations = await recommender.generate({
        industry,
        productName,
        marketData: report.substring(0, 2000),
      });

      if (recommendations.length > 0) {
        const section = recommender.toMarkdown(recommendations);
        enhancedReport += `\n\n${section}`;

        // 评估战略建议的SMART完整性
        const evaluation = evaluateRecommendationActionability(section);

        result.strategicRecommendations = {
          generated: true,
          section,
          evaluation,
        };
        result.addedSections.push('战略建议');
      }
    } catch (error) {
      console.error('[ReportEnhancer] Strategic recommendations failed:', error);
    }
  }

  // 4. 生成评审报告
  if (config.enableReviewReport) {
    try {
      await updateEnhancementProgress('生成评审报告');

      const reviewGenerator = createReviewReportGenerator();
      const reviewReport = await reviewGenerator.generate({
        report,
        industry,
        productName,
        consistencyReport: result.consistencyCheck ? {
          totalIssues: result.consistencyCheck.issues?.length || 0,
          errors: 0,
          warnings: 0,
          infos: 0,
          issues: [],
          summary: result.consistencyCheck.report || '',
        } : undefined,
        referenceReport: result.referenceValidation ? {
          totalIssues: 0,
          issues: [],
          summary: result.referenceValidation.report || '',
          statistics: result.referenceValidation.statistics,
        } : undefined,
        strategicEvaluation: result.strategicRecommendations?.evaluation,
      });

      result.reviewReport = {
        generated: true,
        overallScore: reviewReport.overallScore,
        dimensions: reviewReport.dimensions.map(d => ({
          dimension: d.dimension,
          score: d.score,
        })),
        highPriorityIssues: reviewReport.highPriorityIssues,
        summary: reviewReport.summary,
      };
    } catch (error) {
      console.error('[ReportEnhancer] Review report generation failed:', error);
    }
  }

  // 生成质量报告
  const qualityIssues: string[] = [];
  if (result.consistencyCheck?.hasIssues) {
    qualityIssues.push(`数据一致性: ${result.consistencyCheck.issues?.length || 0}个问题`);
  }
  if (result.referenceValidation?.hasIssues) {
    qualityIssues.push(`参考文献: ${result.referenceValidation.statistics?.duplicates || 0}个重复`);
  }
  if (result.fixSuggestions?.hasSuggestions) {
    qualityIssues.push(`修复建议: ${result.fixSuggestions.suggestions?.length || 0}条`);
  }
  if (result.strategicRecommendations?.evaluation) {
    const eval = result.strategicRecommendations.evaluation;
    qualityIssues.push(`战略建议SMART评分: ${eval.score}分`);
  }

  if (qualityIssues.length > 0) {
    result.qualityReport = qualityIssues.join('; ');
  }

  return {
    ...result,
    // 返回增强后的报告
    enhancedReport,
    success: result.success,
  };
}

/**
 * 更新增强进度
 */
async function updateEnhancementProgress(step: string): Promise<void> {
  // 可选：集成进度跟踪
  console.log(`[ReportEnhancer] ${step}...`);
}

/**
 * 便捷函数：添加竞品分析到报告
 */
export async function addCompetitiveAnalysis(
  report: string,
  industry: string
): Promise<{ report: string; section: string }> {
  const analyzer = createCompetitiveAnalyzer();
  const competitors = await analyzer.identify(industry);

  if (competitors.length === 0) {
    return { report, section: '' };
  }

  const comparator = createComparator();
  const matrix = await comparator.compare(competitors);
  const section = comparator.toMarkdown(matrix);

  return {
    report: report + '\n\n' + section,
    section,
  };
}

/**
 * 便捷函数：添加客户画像到报告
 */
export async function addCustomerProfile(
  report: string,
  productName: string,
  productType?: string,
  industry?: string
): Promise<{ report: string; section: string }> {
  const profiler = createCustomerProfiler();
  const profile = await profiler.generate(
    productName,
    productType || 'SaaS',
    industry
  );
  const section = profiler.toMarkdown(profile);

  return {
    report: report + '\n\n' + section,
    section,
  };
}

export {
  createCompetitiveAnalyzer,
  createComparator,
  createCustomerProfiler,
  createConsistencyChecker,
  createDataFixer,
  createReferenceValidator,
  createStrategicRecommender,
  createReviewReportGenerator,
  generateComparisonMarkdown,
  generateProfileMarkdown,
};
