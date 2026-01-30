/**
 * Supervisor Agent
 *
 * 负责协调各 Worker Agent 的执行
 *
 * 功能：
 * 1. 任务分解和路由
 * 2. 结果合成和质量控制
 * 3. 错误恢复和重试
 */

import type { ResearchState } from '../state';
import type { AgentName, AnalysisResult } from '../types';
import {
  SUPERVISOR_PROMPT,
  TASK_DECOMPOSITION_PROMPT,
  QUALITY_ASSESSMENT_PROMPT,
  RESULT_SYNTHESIS_PROMPT,
} from '../prompts/supervisor';
import { generateText, getLLMConfig } from '../../llm';
import { updateProgress } from '../progress/tracker';
import { createCancelCheck } from '../cancellation/handler';

/**
 * Supervisor Agent 配置
 */
export interface SupervisorConfig {
  /** 是否使用 LLM 做路由决策 */
  useLLMRouting: boolean;
  /** 最大重试次数 */
  maxRetries: number;
  /** 质量阈值 */
  qualityThresholds: {
    minSearchResults: number;
    minExtractions: number;
    minFeatures: number;
    minCompetitors: number;
    completionScore: number;
  };
}

/** 默认配置 */
const DEFAULT_CONFIG: SupervisorConfig = {
  useLLMRouting: true,
  maxRetries: 3,
  qualityThresholds: {
    minSearchResults: 15,
    minExtractions: 5,
    minFeatures: 3,
    minCompetitors: 2,
    completionScore: 60,
  },
};

/**
 * Supervisor 决策结果
 */
export interface SupervisorDecision {
  nextAgent: AgentName | 'done';
  reason: string;
  instructions: string;
  shouldContinue: boolean;
  qualityAssessment?: {
    isComplete: boolean;
    score: number;
    issues: string[];
  };
}

/**
 * Supervisor 执行结果
 */
export interface SupervisorResult {
  success: boolean;
  decision?: SupervisorDecision;
  error?: string;
}

/**
 * 创建 Supervisor Agent
 */
export function createSupervisorAgent(config: Partial<SupervisorConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return {
    config: finalConfig,
    execute: (state: ResearchState) => executeSupervision(state, finalConfig),
    makeDecision: (state: ResearchState) => makeRoutingDecision(state, finalConfig),
    assessQuality: (state: ResearchState) => assessQuality(state, finalConfig),
    synthesize: (state: ResearchState) => synthesizeResults(state, finalConfig),
  };
}

/**
 * 主执行函数：监督执行流程
 */
async function executeSupervision(
  state: ResearchState,
  config: SupervisorConfig
): Promise<SupervisorResult> {
  const { projectId, status, currentStep } = state;

  // 创建取消检查
  const isCancelled = createCancelCheck(projectId);

  try {
    // 更新进度
    await updateProgress(projectId, {
      stage: 'supervising',
      step: '分析当前状态',
      totalItems: 5,
      completedItems: 0,
      currentItem: currentStep,
    });

    // 获取 LLM 配置
    const llmConfig = getLLMConfig();
    const hasApiKey = !!llmConfig.apiKey;

    // 检查是否需要使用 LLM 路由
    if (!config.useLLMRouting || !hasApiKey) {
      // 使用规则引擎做决策
      const decision = ruleBasedDecision(state, config);

      await updateProgress(projectId, {
        stage: 'supervising',
        step: '决策完成',
        totalItems: 5,
        completedItems: 5,
        currentItem: decision.nextAgent,
      });

      return {
        success: true,
        decision,
      };
    }

    // 使用 LLM 做路由决策
    const decision = await makeRoutingDecision(state, config);

    await updateProgress(projectId, {
      stage: 'supervising',
      step: '决策完成',
      totalItems: 5,
      completedItems: 5,
      currentItem: decision.nextAgent,
    });

    return {
      success: true,
      decision,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '监督执行失败',
    };
  }
}

/**
 * 使用 LLM 做路由决策
 */
async function makeRoutingDecision(
  state: ResearchState,
  config: SupervisorConfig
): Promise<SupervisorDecision> {
  const { status, searchResults, extractedContent, analysis, title } = state;

  // 准备上下文
  const context = {
    currentStage: status,
    searchResultsCount: searchResults.length,
    extractedContentCount: extractedContent.length,
    hasAnalysis: !!analysis,
    analysisComplete: analysis?.confidenceScore && analysis.confidenceScore >= 0.5,
    searchQuality: searchResults.filter((r) => r.quality >= 7).length,
    extractionQuality: extractedContent.filter((e) => e.metadata.qualityScore >= 5).length,
  };

  // 构建提示词
  const prompt = `${SUPERVISOR_PROMPT}

当前状态：
- 当前阶段：${status}
- 搜索结果数量：${context.searchResultsCount}
- 已提取内容数量：${context.extractedContentCount}
- 是否有分析结果：${context.hasAnalysis}
- 分析置信度：${analysis?.confidenceScore?.toFixed(2) || 'N/A'}
- 高质量搜索结果：${context.searchQuality}
- 高质量提取内容：${context.extractionQuality}

请根据当前状态决定下一步操作。`;

  // 调用 LLM
  const responseText = await generateText(prompt);

  // 解析响应
  let response: Record<string, unknown>;
  try {
    response = JSON.parse(responseText);
  } catch {
    // 降级到规则引擎
    return ruleBasedDecision(state, config);
  }

  // 验证决策
  const nextAgent = response.nextAgent as string;
  const validAgents = ['planner', 'searcher', 'extractor', 'analyzer', 'reporter', 'done'];

  if (!validAgents.includes(nextAgent)) {
    return ruleBasedDecision(state, config);
  }

  return {
    nextAgent: nextAgent as AgentName | 'done',
    reason: (response.reason as string) || 'LLM 决策',
    instructions: (response.instructions as string) || '',
    shouldContinue: response.shouldContinue as boolean,
  };
}

/**
 * 规则引擎路由决策
 */
function ruleBasedDecision(
  state: ResearchState,
  config: SupervisorConfig
): SupervisorDecision {
  const { status, searchResults, extractedContent, analysis } = state;

  // 根据当前状态决定下一步
  switch (status) {
    case 'pending':
      return {
        nextAgent: 'planner',
        reason: '任务尚未开始，需要先生成研究计划',
        instructions: '创建详细的研究搜索计划',
        shouldContinue: true,
      };

    case 'planning':
      return {
        nextAgent: 'searcher',
        reason: '计划已生成，开始执行搜索',
        instructions: '执行搜索计划中的所有查询',
        shouldContinue: true,
      };

    case 'searching':
      // 检查搜索结果是否足够
      const searchQuality = searchResults.filter((r) => r.quality >= 7).length;
      if (searchResults.length >= config.qualityThresholds.minSearchResults &&
          searchQuality >= config.qualityThresholds.minSearchResults * 0.3) {
        return {
          nextAgent: 'extractor',
          reason: `搜索结果充足 (${searchResults.length} 条)，开始提取内容`,
          instructions: '爬取高质量搜索结果的内容',
          shouldContinue: true,
        };
      } else if (searchResults.length > 0) {
        return {
          nextAgent: 'extractor',
          reason: '有搜索结果，开始提取',
          instructions: '开始提取内容，即使结果不够理想',
          shouldContinue: true,
        };
      } else {
        return {
          nextAgent: 'searcher',
          reason: '搜索结果不足，重新搜索',
          instructions: '补充更多搜索查询',
          shouldContinue: true,
        };
      }

    case 'extracting':
      // 检查提取结果
      const extractionQuality = extractedContent.filter(
        (e) => e.metadata.contentLength > 500
      ).length;
      if (extractedContent.length >= config.qualityThresholds.minExtractions &&
          extractionQuality >= 3) {
        return {
          nextAgent: 'analyzer',
          reason: '内容提取充足，开始分析',
          instructions: '分析提取的内容，生成竞品分析',
          shouldContinue: true,
        };
      } else if (extractedContent.length > 0) {
        return {
          nextAgent: 'analyzer',
          reason: '有提取结果，开始分析',
          instructions: '开始分析，即使内容不够理想',
          shouldContinue: true,
        };
      } else {
        return {
          nextAgent: 'extractor',
          reason: '没有提取到内容，重新提取',
          instructions: '补充提取更多内容',
          shouldContinue: true,
        };
      }

    case 'analyzing':
      // 检查分析结果
      if (analysis &&
          analysis.features.length >= config.qualityThresholds.minFeatures &&
          analysis.competitors.length >= config.qualityThresholds.minCompetitors &&
          analysis.confidenceScore >= 0.5) {
        return {
          nextAgent: 'reporter',
          reason: '分析完成，生成报告',
          instructions: '生成完整的研究报告',
          shouldContinue: true,
        };
      } else {
        return {
          nextAgent: 'analyzer',
          reason: '分析不完整，重新分析',
          instructions: '补充分析或重新分析',
          shouldContinue: true,
        };
      }

    case 'reporting':
      return {
        nextAgent: 'done',
        reason: '报告已生成，任务完成',
        instructions: '任务完成',
        shouldContinue: false,
      };

    default:
      return {
        nextAgent: 'planner',
        reason: '未知状态，重置到初始阶段',
        instructions: '重新开始研究',
        shouldContinue: true,
      };
  }
}

/**
 * 评估研究质量
 */
function assessQuality(
  state: ResearchState,
  config: SupervisorConfig
): SupervisorDecision & { dataGaps: string[]; score: number; issues: string[] } {
  const { searchResults, extractedContent, analysis } = state;
  const issues: string[] = [];
  let score = 100;

  // 搜索结果评估
  const searchCount = searchResults.length;
  if (searchCount < config.qualityThresholds.minSearchResults) {
    issues.push(`搜索结果不足: ${searchCount}/${config.qualityThresholds.minSearchResults}`);
    score -= 20;
  }

  // 提取结果评估
  const extractionCount = extractedContent.length;
  if (extractionCount < config.qualityThresholds.minExtractions) {
    issues.push(`提取内容不足: ${extractionCount}/${config.qualityThresholds.minExtractions}`);
    score -= 15;
  }

  // 分析结果评估
  if (analysis) {
    const featureCount = analysis.features.length;
    const competitorCount = analysis.competitors.length;

    if (featureCount < config.qualityThresholds.minFeatures) {
      issues.push(`功能分析不足: ${featureCount}/${config.qualityThresholds.minFeatures}`);
      score -= 15;
    }

    if (competitorCount < config.qualityThresholds.minCompetitors) {
      issues.push(`竞品分析不足: ${competitorCount}/${config.qualityThresholds.minCompetitors}`);
      score -= 15;
    }

    if (analysis.confidenceScore < 0.5) {
      issues.push(`置信度过低: ${(analysis.confidenceScore * 100).toFixed(0)}%`);
      score -= 10;
    }
  } else {
    issues.push('缺少分析结果');
    score -= 25;
  }

  // 计算数据缺口
  const dataGaps = [
    searchCount < config.qualityThresholds.minSearchResults ? '更多搜索结果' : null,
    extractionCount < config.qualityThresholds.minExtractions ? '更多提取内容' : null,
    !analysis ? '完整分析' : null,
    (analysis?.features.length ?? 0) < config.qualityThresholds.minFeatures ? '功能详细分析' : null,
    (analysis?.competitors.length ?? 0) < config.qualityThresholds.minCompetitors ? '竞品对比分析' : null,
  ].filter(Boolean) as string[];

  return {
    nextAgent: issues.length === 0 ? 'done' : 'analyzer',
    reason: issues.length === 0 ? '质量达标' : `发现 ${issues.length} 个问题`,
    instructions: '',
    shouldContinue: issues.length > 0,
    score: Math.max(0, score),
    issues,
    dataGaps,
  };
}

/**
 * 合成最终结果
 */
async function synthesizeResults(
  state: ResearchState,
  config: SupervisorConfig
): Promise<{ summary: string; quality: string; dataGaps: string[] }> {
  const { title, searchResults, extractedContent, analysis } = state;

  // 统计信息
  const searchStats = {
    total: searchResults.length,
    highQuality: searchResults.filter((r) => r.quality >= 7).length,
    sources: [...new Set(searchResults.map((r) => r.source))].length,
  };

  const extractionSummary = {
    total: extractedContent.length,
    avgLength: extractedContent.length > 0
      ? Math.round(extractedContent.reduce((sum, e) => sum + e.content.length, 0) / extractedContent.length)
      : 0,
  };

  // 使用 LLM 合成结果
  const llmConfig = getLLMConfig();
  const hasApiKey = !!llmConfig.apiKey;

  if (hasApiKey && analysis) {
    const prompt = RESULT_SYNTHESIS_PROMPT
      .replace('{title}', title)
      .replace('{analysisResult}', JSON.stringify(analysis, null, 2))
      .replace('{searchStats}', JSON.stringify(searchStats, null, 2))
      .replace('{extractionSummary}', JSON.stringify(extractionSummary, null, 2));

    const responseText = await generateText(prompt);

    try {
      const response = JSON.parse(responseText);
      return {
        summary: response.summary as string,
        quality: response.dataQuality as string,
        dataGaps: (response.dataGaps as string[]) || [],
      };
    } catch {
      // 降级到手动合成
    }
  }

  // 手动合成
  const quality = searchStats.total >= 15 && extractedContent.length >= 5
    ? '优秀'
    : searchStats.total >= 10 && extractedContent.length >= 3
    ? '良好'
    : searchStats.total >= 5
    ? '一般'
    : '不足';

  const summary = `本次研究共收集 ${searchStats.total} 条搜索结果，从 ${extractionSummary.total} 个页面提取内容，识别出 ${analysis?.features.length || 0} 个核心功能和 ${analysis?.competitors.length || 0} 个竞品。`;

  const dataGaps: string[] = [];
  if (searchStats.total < 15) dataGaps.push('搜索结果不足');
  if (extractionSummary.total < 5) dataGaps.push('提取内容不足');
  if (!analysis) dataGaps.push('缺少深度分析');

  return { summary, quality, dataGaps };
}

// ============================================================
// 导出
// ============================================================

export {
  executeSupervision,
  makeRoutingDecision,
  ruleBasedDecision,
  assessQuality,
  synthesizeResults,
};
