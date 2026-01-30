/**
 * Supervisor Agent
 *
 * 负责协调各 Worker Agent 的执行
 *
 * 功能：
 * 1. 使用 LLM 进行任务分解和路由
 * 2. 结果合成和质量控制
 * 3. 错误恢复和重试
 *
 * 注意：不再使用规则引擎，全部使用 LLM 做路由决策
 */

import type { ResearchState } from '../state';
import type { AgentName, AnalysisResult } from '../types';
import { SUPERVISOR_PROMPT } from '../prompts/supervisor';
import { generateText, getLLMConfig } from '../../llm';
import { updateProgress } from '../progress/tracker';
import { createCancelCheck } from '../cancellation/handler';

/**
 * Supervisor Agent 配置
 */
export interface SupervisorConfig {
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
 *
 * 全部使用 LLM 做路由决策，不再有规则引擎分支
 */
async function executeSupervision(
  state: ResearchState,
  config: SupervisorConfig
): Promise<SupervisorResult> {
  const { projectId, currentStep } = state;

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

    if (!hasApiKey) {
      return {
        success: false,
        error: 'LLM 不可用，无法进行路由决策',
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
 *
 * 接收完整的 ResearchState，生成下一步操作决策
 */
async function makeRoutingDecision(
  state: ResearchState,
  config: SupervisorConfig
): Promise<SupervisorDecision> {
  const { status, searchResults, extractedContent, analysis, projectPath, rawFileCount, retryCount = 0 } = state;
  const maxRetries = state.maxRetries || 3;

  // 构建详细的状态描述
  const statusDescription = getStatusDescription(status, searchResults.length, extractedContent.length, rawFileCount);

  // 构建提示词
  const prompt = `${SUPERVISOR_PROMPT}

${statusDescription}

当前状态详情：
- 当前阶段：${status}
- 搜索结果数量：${searchResults.length}
- 已提取内容数量：${extractedContent.length}
- 原始文件数量：${rawFileCount || 'N/A'}
- 是否有分析结果：${!!analysis}
- 分析置信度：${analysis?.confidenceScore?.toFixed(2) || 'N/A'}
- 识别功能数：${analysis?.features?.length || 0}
- 识别竞品数：${analysis?.competitors?.length || 0}
- 已重试次数：${retryCount}/${maxRetries}
- 质量阈值要求：搜索结果≥${config.qualityThresholds.minSearchResults}, 提取≥${config.qualityThresholds.minExtractions}

请根据当前状态决定下一步操作，确保研究流程完整进行。如果重试次数已达上限，强制完成任务。`;

  // 调用 LLM
  const responseText = await generateText(prompt);

  // 解析响应
  let response: Record<string, unknown>;
  try {
    response = JSON.parse(responseText);
  } catch {
    // 解析失败时使用默认决策
    return getDefaultDecision(status, searchResults.length, extractedContent.length, !!analysis, retryCount, maxRetries);
  }

  // 验证决策
  const nextAgent = response.nextAgent as string;
  const validAgents = ['planner', 'searcher', 'extractor', 'analyzer', 'reporter', 'done'];

  if (!validAgents.includes(nextAgent)) {
    return getDefaultDecision(status, searchResults.length, extractedContent.length, !!analysis, retryCount, maxRetries);
  }

  return {
    nextAgent: nextAgent as AgentName | 'done',
    reason: (response.reason as string) || `${status} → ${nextAgent}`,
    instructions: (response.instructions as string) || '',
    shouldContinue: response.shouldContinue !== undefined
      ? Boolean(response.shouldContinue)
      : nextAgent !== 'done',
  };
}

/**
 * 获取状态描述
 */
function getStatusDescription(
  status: string,
  searchCount: number,
  extractionCount: number,
  fileCount: number | undefined
): string {
  const descriptions: Record<string, string> = {
    pending: '任务尚未开始执行',
    planning: '正在生成研究计划',
    searching: '正在搜索相关信息',
    extracting: '正在提取网页内容',
    analyzing: '正在分析提取的内容',
    reporting: '正在生成研究报告',
    completed: '研究任务已完成',
    failed: '研究任务失败',
    cancelled: '研究任务已取消',
  };

  let desc = descriptions[status] || '未知状态';

  // 添加进度信息
  if (status === 'searching' && searchCount > 0) {
    desc += `，已获取 ${searchCount} 条搜索结果`;
  }
  if (status === 'extracting' && extractionCount > 0) {
    desc += `，已提取 ${extractionCount} 个页面`;
  }
  if (status === 'extracting' && fileCount) {
    desc += `，保存了 ${fileCount} 个原始文件`;
  }
  if (status === 'analyzing') {
    desc += '，正在分析文件内容';
  }

  return desc;
}

/**
 * 获取默认决策（当 LLM 解析失败时使用）
 */
function getDefaultDecision(
  status: string,
  searchCount: number,
  extractionCount: number,
  hasAnalysis: boolean,
  retryCount: number = 0,
  maxRetries: number = 3
): SupervisorDecision {
  // 如果达到最大重试次数，强制完成任务
  if (retryCount >= maxRetries) {
    if (status === 'searching' && searchCount > 0) {
      return {
        nextAgent: 'extractor',
        reason: `重试次数达上限 (${retryCount})，已有 ${searchCount} 条搜索结果，继续提取`,
        instructions: '继续执行，即使数据不理想',
        shouldContinue: true,
      };
    }
    if (status === 'analyzing' && hasAnalysis) {
      return {
        nextAgent: 'reporter',
        reason: `重试次数达上限 (${retryCount})，分析已完成，生成报告`,
        instructions: '生成报告，即使分析可能不完整',
        shouldContinue: true,
      };
    }
    return {
      nextAgent: 'done',
      reason: `重试次数达上限 (${retryCount})，任务强制完成`,
      instructions: '任务完成',
      shouldContinue: false,
    };
  }

  // 基于状态机的确定性决策
  switch (status) {
    case 'pending':
      return {
        nextAgent: 'planner',
        reason: '任务尚未开始，需要生成研究计划',
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
      if (searchCount >= 15) {
        return {
          nextAgent: 'extractor',
          reason: `搜索结果充足 (${searchCount} 条)，开始提取内容`,
          instructions: '爬取高质量搜索结果的内容',
          shouldContinue: true,
        };
      }
      return {
        nextAgent: 'searcher',
        reason: `搜索结果不足 (${searchCount}/15)，继续搜索 (${retryCount + 1}/${maxRetries})`,
        instructions: '补充更多搜索查询',
        shouldContinue: true,
      };

    case 'extracting':
      if (extractionCount >= 5) {
        return {
          nextAgent: 'analyzer',
          reason: `内容提取充足 (${extractionCount} 个)，开始分析`,
          instructions: '分析提取的内容，生成竞品分析',
          shouldContinue: true,
        };
      }
      return {
        nextAgent: 'analyzer',
        reason: '有提取结果，开始分析',
        instructions: '开始分析，即使内容不够理想',
        shouldContinue: true,
      };

    case 'analyzing':
      if (hasAnalysis) {
        return {
          nextAgent: 'reporter',
          reason: '分析完成，生成报告',
          instructions: '生成完整的研究报告',
          shouldContinue: true,
        };
      }
      return {
        nextAgent: 'analyzer',
        reason: `分析不完整，重新分析 (${retryCount + 1}/${maxRetries})`,
        instructions: '补充分析或重新分析',
        shouldContinue: true,
      };

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
): SupervisorDecision & { dataGaps: string[]; score: number; issues: string[]; isComplete: boolean } {
  const { searchResults, extractedContent, analysis } = state;
  const issues: string[] = [];
  let score = 100;
  const dataGaps: string[] = [];

  // 搜索结果评估
  const searchCount = searchResults.length;
  if (searchCount < config.qualityThresholds.minSearchResults) {
    issues.push(`搜索结果不足: ${searchCount}/${config.qualityThresholds.minSearchResults}`);
    dataGaps.push('search_results');
    score -= 20;
  }

  // 提取结果评估
  const extractionCount = extractedContent.length;
  if (extractionCount < config.qualityThresholds.minExtractions) {
    issues.push(`提取内容不足: ${extractionCount}/${config.qualityThresholds.minExtractions}`);
    dataGaps.push('extracted_content');
    score -= 15;
  }

  // 分析结果评估
  if (analysis) {
    const featureCount = analysis.features.length;
    const competitorCount = analysis.competitors.length;

    if (featureCount < config.qualityThresholds.minFeatures) {
      issues.push(`功能分析不足: ${featureCount}/${config.qualityThresholds.minFeatures}`);
      dataGaps.push('features');
      score -= 15;
    }

    if (competitorCount < config.qualityThresholds.minCompetitors) {
      issues.push(`竞品分析不足: ${competitorCount}/${config.qualityThresholds.minCompetitors}`);
      dataGaps.push('competitors');
      score -= 15;
    }

    if (analysis.confidenceScore < 0.5) {
      issues.push(`置信度过低: ${(analysis.confidenceScore * 100).toFixed(0)}%`);
      dataGaps.push('confidence');
      score -= 10;
    }
  } else {
    issues.push('缺少分析结果');
    dataGaps.push('analysis');
    score -= 25;
  }

  const isComplete = score >= config.qualityThresholds.completionScore;

  return {
    nextAgent: isComplete ? 'reporter' : 'analyzer',
    reason: isComplete ? '质量评估通过' : '需要更多分析',
    instructions: isComplete ? '生成报告' : '补充分析',
    shouldContinue: true,
    isComplete,
    score: Math.max(0, score),
    issues,
    dataGaps,
  };
}

/**
 * 合成结果
 */
async function synthesizeResults(
  state: ResearchState,
  config: SupervisorConfig
): Promise<{ success: boolean; summary: string; recommendations: string[] }> {
  const { analysis, searchResults, extractedContent } = state;

  if (!analysis) {
    return {
      success: false,
      summary: '没有可合成的分析结果',
      recommendations: [],
    };
  }

  const summary = `
研究主题: ${state.title}
搜索结果: ${searchResults.length} 条
提取内容: ${extractedContent.length} 个页面
识别功能: ${analysis.features.length} 个
识别竞品: ${analysis.competitors.length} 个
分析置信度: ${(analysis.confidenceScore * 100).toFixed(0)}%

功能摘要:
${analysis.features.slice(0, 5).map(f => `- ${f.name}`).join('\n')}

竞品摘要:
${analysis.competitors.slice(0, 3).map(c => `- ${c.name}: ${c.marketPosition}`).join('\n')}
`.trim();

  const recommendations: string[] = [];

  // 基于 SWOT 生成建议
  if (analysis.swot.opportunities.length > 0) {
    recommendations.push(`抓住市场机会: ${analysis.swot.opportunities[0]}`);
  }
  if (analysis.swot.strengths.length > 0) {
    recommendations.push(`发挥优势: ${analysis.swot.strengths[0]}`);
  }
  if (analysis.swot.weaknesses.length > 0) {
    recommendations.push(`改进劣势: ${analysis.swot.weaknesses[0]}`);
  }
  if (analysis.swot.threats.length > 0) {
    recommendations.push(`关注威胁: ${analysis.swot.threats[0]}`);
  }

  return {
    success: true,
    summary,
    recommendations,
  };
}
