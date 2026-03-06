/**
 * 阶段控制器
 *
 * 管理多个分析阶段的执行和结果合并
 */

import { generateText } from '../../../llm';
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

    return prompt;
  }

  /**
   * 解析 LLM 响应
   */
  private parseResponse(responseText: string): any {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('[PhaseController] Failed to parse response:', error);
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
