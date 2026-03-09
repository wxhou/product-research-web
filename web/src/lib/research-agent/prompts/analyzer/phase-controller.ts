/**
 * 阶段控制器
 *
 * 管理多个分析阶段的执行和结果合并
 */

import { generateText } from '../../../llm';
import { parseJsonFromLLM } from '@/lib/json-utils';
import type { AnalysisResult } from '../../types';
import {
  PHASE_FEATURE_PROMPT,
  PHASE_COMPETITOR_PROMPT,
  PHASE_SWOT_PROMPT,
  PHASE_MARKET_PROMPT,
  PHASE_USECASE_PROMPT,
  PHASE_TECH_PROMPT,
  PHASE_STRATEGY_PROMPT,
  DEFAULT_PHASES,
  type AnalysisPhaseConfig,
} from './phases';

/**
 * 增强分析指令
 * 在每个分析阶段完成后，额外进行以下分析
 *
 * 【优化说明】：此指令在 Analyzer 初始化时加载，所有阶段都可以访问
 */
export const ENHANCED_ANALYSIS_PROMPT = `
【思维链提示：请先分析常规内容，然后依次进行以下增强分析】

## 增强分析维度（请依次分析）

### 1. 用户画像分析
- 决策者特征：谁是购买决策者？他们关心什么（价格、安全性、易用性）？
- 使用者特征：谁是产品最终用户？他们的使用场景和痛点是什么？
- 受益者价值：产品为最终受益者创造什么价值？如何量化？

### 2. ROI 投资回报分析
- 成本对比：与竞品或传统方案相比的成本优势
- 回报周期：投资回报的典型时间周期
- 投资收益：预期的投资回报率或成本节约

### 3. KPI 指标建议
- 可量化的成功指标：如效率提升百分比、用户满意度、成本降低等
- 衡量标准：如何衡量产品是否成功
- 基准值：行业基准或目标值

### 4. 风险矩阵分析
- 风险识别：产品可能面临的主要风险
- 发生概率：风险发生的可能性（高/中/低）
- 影响程度：风险对业务的影响程度（高/中/低）
- 应对措施：风险缓解措施和预案

### 5. 供应商对比分析
- 主要供应商：市场上主要供应商概览
- 功能对比：各供应商的核心功能对比
- 价格对比：定价模式和价格区间
- 服务能力：技术支持、实施服务等

## 输出要求
请在分析报告中明确包含以上五个维度的内容，使用结构化 JSON 格式输出。
`;

/**
 * 阶段执行上下文
 */
export interface PhaseContext {
  title: string;
  description: string;
  extractedContent: string;
  existingAnalysis?: string;
}

/**
 * 阶段执行结果
 */
export interface PhaseResult {
  phaseId: string;
  success: boolean;
  data?: any;
  error?: string;
  confidenceScore?: number;
}

/**
 * 阶段控制器配置
 */
export interface PhaseControllerConfig {
  phases?: AnalysisPhaseConfig[];
  maxRetries?: number;
}

/**
 * 阶段控制器
 */
export class PhaseController {
  private phases: AnalysisPhaseConfig[];
  private maxRetries: number;

  constructor(config: PhaseControllerConfig = {}) {
    this.phases = config.phases || DEFAULT_PHASES;
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * 执行所有启用的阶段
   */
  async executePhases(context: PhaseContext): Promise<PhaseResult[]> {
    const results: PhaseResult[] = [];
    const enabledPhases = this.phases.filter(p => p.enabled);

    for (const phase of enabledPhases) {
      const result = await this.executePhase(phase.id, context);
      results.push(result);
    }

    return results;
  }

  /**
   * 执行单个阶段
   */
  private async executePhase(phaseId: string, context: PhaseContext): Promise<PhaseResult> {
    const prompt = this.buildPrompt(phaseId, context);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const responseText = await generateText(prompt);
        const data = this.parseResponse(responseText);

        return {
          phaseId,
          success: true,
          data,
          confidenceScore: data.confidenceScore || 0.5,
        };
      } catch (error) {
        console.warn(`[PhaseController] Phase ${phaseId} attempt ${attempt} failed:`, error);
      }
    }

    return {
      phaseId,
      success: false,
      error: `Phase ${phaseId} failed after ${this.maxRetries} attempts`,
    };
  }

  /**
   * 构建阶段提示词
   *
   * 【优化说明】：增强指令在所有阶段开始时注入，而非仅在 strategy 阶段
   */
  private buildPrompt(phaseId: string, context: PhaseContext): string {
    const prompts: Record<string, string> = {
      feature: PHASE_FEATURE_PROMPT,
      competitor: PHASE_COMPETITOR_PROMPT,
      swot: PHASE_SWOT_PROMPT,
      market: PHASE_MARKET_PROMPT,
      usecase: PHASE_USECASE_PROMPT,
      tech: PHASE_TECH_PROMPT,
      strategy: PHASE_STRATEGY_PROMPT,
    };

    let prompt = prompts[phaseId] || '';

    // 替换占位符
    prompt = prompt.replace('{title}', context.title);
    prompt = prompt.replace('{description}', context.description);
    prompt = prompt.replace('{extractedContent}', context.extractedContent);
    prompt = prompt.replace('{existingAnalysis}', context.existingAnalysis || '无');

    // 【优化】：在所有分析阶段添加增强分析指令
    // strategy 阶段进行最终整合
    prompt = prompt + '\n\n' + ENHANCED_ANALYSIS_PROMPT;

    return prompt;
  }

  /**
   * 解析 LLM 响应
   */
  private parseResponse(responseText: string): any {
    // 使用健壮的 JSON 解析
    const result = parseJsonFromLLM(responseText);
    if (result) {
      return result;
    }
    return {};
  }

  /**
   * 合并阶段结果
   */
  mergeResults(phaseResults: PhaseResult[]): Partial<AnalysisResult> {
    const merged: Partial<AnalysisResult> = {
      features: [],
      competitors: [],
      swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      marketData: { marketSize: '', growthRate: '', keyPlayers: [], trends: [], opportunities: [], challenges: [] },
      techAnalysis: { architecture: [], techStack: [], emergingTech: [], innovationPoints: [] },
      confidenceScore: 0,
      dataGaps: [],
      // 新增增强分析字段
      userPersonaAnalysis: {
        decisionMakers: [],
        users: [],
        beneficiaries: [],
      },
      roiAnalysis: {
        costComparison: '',
        paybackPeriod: '',
        roi: '',
      },
      kpiMetrics: [],
      riskMatrix: [],
      vendorComparison: [],
    };

    let totalConfidence = 0;
    let successCount = 0;

    for (const result of phaseResults) {
      if (!result.success) {
        merged.dataGaps?.push(`阶段 ${result.phaseId} 执行失败`);
        continue;
      }

      const data = result.data || {};
      totalConfidence += result.confidenceScore || 0.5;
      successCount++;

      // 合并功能数据
      if (data.features) {
        merged.features = [...(merged.features || []), ...data.features];
      }

      // 合并竞品数据
      if (data.competitors) {
        merged.competitors = [...(merged.competitors || []), ...data.competitors];
      }

      // 合并 SWOT
      if (data.swot) {
        const swot = merged.swot!;
        swot.strengths = [...swot.strengths, ...(data.swot.strengths || [])];
        swot.weaknesses = [...swot.weaknesses, ...(data.swot.weaknesses || [])];
        swot.opportunities = [...swot.opportunities, ...(data.swot.opportunities || [])];
        swot.threats = [...swot.threats, ...(data.swot.threats || [])];
      }

      // 合并市场数据
      if (data.marketData) {
        const marketData = merged.marketData!;
        marketData.marketSize = data.marketData.marketSize || marketData.marketSize;
        marketData.growthRate = data.marketData.growthRate || marketData.growthRate;
        marketData.keyPlayers = [...(marketData.keyPlayers || []), ...(data.marketData.keyPlayers || [])];
        marketData.trends = [...(marketData.trends || []), ...(data.marketData.trends || [])];
        marketData.opportunities = [...(marketData.opportunities || []), ...(data.marketData.opportunities || [])];
        marketData.challenges = [...(marketData.challenges || []), ...(data.marketData.challenges || [])];
      }

      // 合并技术栈
      if (data.techStack) {
        const tech = merged.techAnalysis!;
        tech.architecture = [...(tech.architecture || []), ...(data.techStack.architecture || [])];
        tech.techStack = [...(tech.techStack || []), ...(data.techStack.techStack || [])];
        tech.emergingTech = [...(tech.emergingTech || []), ...(data.techStack.emergingTech || [])];
        tech.innovationPoints = [...(tech.innovationPoints || []), ...(data.techStack.innovationPoints || [])];
      }

      // 合并增强分析数据（用户画像、ROI、KPI、风险矩阵、供应商对比）
      if (data.userPersonaAnalysis) {
        const upa = merged.userPersonaAnalysis!;
        upa.decisionMakers = [...(upa.decisionMakers || []), ...(data.userPersonaAnalysis.decisionMakers || [])];
        upa.users = [...(upa.users || []), ...(data.userPersonaAnalysis.users || [])];
        upa.beneficiaries = [...(upa.beneficiaries || []), ...(data.userPersonaAnalysis.beneficiaries || [])];
      }

      if (data.roiAnalysis) {
        merged.roiAnalysis = {
          costComparison: data.roiAnalysis.costComparison || merged.roiAnalysis?.costComparison || '',
          paybackPeriod: data.roiAnalysis.paybackPeriod || merged.roiAnalysis?.paybackPeriod || '',
          roi: data.roiAnalysis.roi || merged.roiAnalysis?.roi || '',
        };
      }

      if (data.kpiMetrics) {
        merged.kpiMetrics = [...(merged.kpiMetrics || []), ...data.kpiMetrics];
      }

      if (data.riskMatrix) {
        merged.riskMatrix = [...(merged.riskMatrix || []), ...data.riskMatrix];
      }

      if (data.vendorComparison) {
        merged.vendorComparison = [...(merged.vendorComparison || []), ...data.vendorComparison];
      }
    }

    merged.confidenceScore = successCount > 0 ? totalConfidence / successCount : 0;

    return merged;
  }

  /**
   * 启用/禁用阶段
   */
  setPhaseEnabled(phaseId: string, enabled: boolean): void {
    const phase = this.phases.find(p => p.id === phaseId);
    if (phase) {
      phase.enabled = enabled;
    }
  }
}

/**
 * 创建阶段控制器
 */
export function createPhaseController(config?: PhaseControllerConfig): PhaseController {
  return new PhaseController(config);
}
