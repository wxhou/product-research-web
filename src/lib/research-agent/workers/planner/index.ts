/**
 * Planner Agent
 *
 * 负责生成研究计划的 Agent
 *
 * 功能：
 * 1. 分析研究主题，确定研究维度
 * 2. 生成搜索查询列表
 * 3. 设置质量阈值
 */

import type { ResearchState } from '../../state';
import type { SearchPlan, SearchQuery, DataSourceType } from '../../types';
import {
  PLAN_RESEARCH_PROMPT,
  DEFAULT_QUALITY_THRESHOLDS,
  DEFAULT_DIMENSIONS,
  SIMPLE_DIMENSIONS,
  generateDefaultQueries,
  formatPrompt,
} from '../../prompts/planner';
import { generateText, getLLMConfig } from '../../../llm';
import { updateProgress } from '../../progress/tracker';

/**
 * Planner Agent 配置
 */
export interface PlannerConfig {
  /** 是否使用 LLM 生成计划 */
  useLLM: boolean;
  /** 默认目标数据源 */
  defaultSources: DataSourceType[];
}

/** 默认配置 */
const DEFAULT_CONFIG: PlannerConfig = {
  useLLM: true,
  defaultSources: ['duckduckgo', 'rss-hackernews', 'devto'],
};

/**
 * Planner Agent 执行结果
 */
export interface PlannerResult {
  success: boolean;
  searchPlan?: SearchPlan;
  error?: string;
}

/**
 * 创建 Planner Agent
 */
function createPlannerAgent(config: Partial<PlannerConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return {
    config: finalConfig,
    execute: (state: ResearchState) => planResearch(state, finalConfig),
  };
}

/**
 * 主执行函数：生成研究计划
 */
async function planResearch(
  state: ResearchState,
  config: PlannerConfig
): Promise<PlannerResult> {
  const { title, description, keywords } = state;

  // 更新进度
  await updateProgress(state.projectId, {
    stage: 'planning',
    step: '分析研究主题',
    totalItems: 3,
    completedItems: 0,
    currentItem: title,
  });

  try {
    // 判断是否使用 LLM
    const llmConfig = getLLMConfig();
    const hasApiKey = !!llmConfig.apiKey;

    if (!config.useLLM || !hasApiKey) {
      // 使用默认配置
      return useDefaultPlan(title, description, keywords, config.defaultSources);
    }

    // 更新进度
    await updateProgress(state.projectId, {
      stage: 'planning',
      step: '调用 LLM 生成研究计划',
      totalItems: 3,
      completedItems: 1,
      currentItem: 'LLM 生成中...',
    });

    // 使用 LLM 生成计划
    const searchPlan = await generateSearchPlan(title, description, keywords, config.defaultSources);

    // 更新进度
    await updateProgress(state.projectId, {
      stage: 'planning',
      step: '研究计划生成完成',
      totalItems: 3,
      completedItems: 3,
      currentItem: `${searchPlan.queries.length} 个查询`,
    });

    return {
      success: true,
      searchPlan,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '生成研究计划失败',
    };
  }
}

/**
 * 使用 LLM 生成搜索计划
 */
async function generateSearchPlan(
  title: string,
  description?: string,
  keywords?: string[],
  targetSources: DataSourceType[] = DEFAULT_CONFIG.defaultSources
): Promise<SearchPlan> {
  const prompt = formatPrompt(PLAN_RESEARCH_PROMPT, { title, description });

  // 添加关键词上下文
  let enhancedPrompt = prompt;
  if (keywords && keywords.length > 0) {
    enhancedPrompt += `\n\n【关键词】\n${keywords.join(', ')}`;
  }

  // 调用 LLM 生成 JSON 响应
  const responseText = await generateText(enhancedPrompt);

  // 解析 JSON 响应
  let response: Record<string, unknown>;
  try {
    response = JSON.parse(responseText);
  } catch {
    // 尝试提取 JSON 代码块
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      response = JSON.parse(jsonMatch[1]);
    } else {
      // 尝试提取 {...} 格式的内容
      const braceMatch = responseText.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        response = JSON.parse(braceMatch[0]);
      } else {
        throw new Error('无法解析 LLM 响应');
      }
    }
  }

  // 验证响应
  const queriesRaw = response.queries as unknown[] | undefined;
  if (!queriesRaw || queriesRaw.length === 0) {
    throw new Error('LLM 未返回有效的搜索查询');
  }

  // 确保查询有 ID
  const queries: SearchQuery[] = queriesRaw.map((q: unknown, index: number) => {
    const queryObj = q as Record<string, unknown>;
    return {
      id: (queryObj.id as string) || `q${index + 1}`,
      query: queryObj.query as string,
      purpose: queryObj.purpose as string,
      dimension: queryObj.dimension as string,
      priority: (queryObj.priority as number) || 3,
      hints: queryObj.hints as string | undefined,
    };
  });

  // 处理质量阈值，确保包含 minIterations
  const qualityThresholdsRaw = response.qualityThresholds as Record<string, unknown> | undefined;
  const qualityThresholds = {
    minFeatures: (qualityThresholdsRaw?.minFeatures as number) || DEFAULT_QUALITY_THRESHOLDS.minFeatures,
    minCompetitors: (qualityThresholdsRaw?.minCompetitors as number) || DEFAULT_QUALITY_THRESHOLDS.minCompetitors,
    minUseCases: (qualityThresholdsRaw?.minUseCases as number) || DEFAULT_QUALITY_THRESHOLDS.minUseCases,
    minTechStack: (qualityThresholdsRaw?.minTechStack as number) || DEFAULT_QUALITY_THRESHOLDS.minTechStack,
    minSearchResults: (qualityThresholdsRaw?.minSearchResults as number) || DEFAULT_QUALITY_THRESHOLDS.minSearchResults,
    minIterations: (qualityThresholdsRaw?.minIterations as number) || DEFAULT_QUALITY_THRESHOLDS.minIterations,
    completionScore: (qualityThresholdsRaw?.completionScore as number) || DEFAULT_QUALITY_THRESHOLDS.completionScore,
  };

  return {
    queries,
    targetSources,
    researchDimensions: (response.researchDimensions as string[]) || DEFAULT_DIMENSIONS,
    qualityThresholds,
  };
}

/**
 * 使用默认计划（无 API Key 或禁用 LLM 时）
 */
function useDefaultPlan(
  title: string,
  description: string | undefined,
  keywords: string[] | undefined,
  sources: DataSourceType[] = DEFAULT_CONFIG.defaultSources
): PlannerResult {
  const queries = generateDefaultQueries(title);

  // 根据关键词扩展查询
  if (keywords && keywords.length > 0) {
    keywords.slice(0, 3).forEach((keyword, index) => {
      queries.push({
        id: `q${queries.length + 1}`,
        query: `${title} ${keyword}`,
        purpose: `搜索 ${keyword} 相关信息`,
        dimension: '产品功能特性',
        priority: 3 + index,
        hints: `请关注与 ${keyword} 相关的内容`,
      });
    });
  }

  return {
    success: true,
    searchPlan: {
      queries,
      targetSources: sources,
      researchDimensions: DEFAULT_DIMENSIONS,
      qualityThresholds: DEFAULT_QUALITY_THRESHOLDS,
    },
  };
}

// ============================================================
// 辅助函数：判断主题复杂度
// ============================================================

/**
 * 判断主题是否简单（使用精简维度）
 */
function isSimpleTopic(title: string, description?: string): boolean {
  const text = `${title} ${description || ''}`.toLowerCase();

  // 简单主题的特征词
  const simpleIndicators = [
    '是什么',
    '介绍',
    '入门',
    '初学者',
    '基础',
    '快速',
    '教程',
    '怎么用',
  ];

  // 复杂主题的特征词
  const complexIndicators = [
    '系统',
    '平台',
    '架构',
    '企业级',
    '大规模',
    '分布式',
    '微服务',
  ];

  const hasSimpleIndicator = simpleIndicators.some((ind) => text.includes(ind));
  const hasComplexIndicator = complexIndicators.some((ind) => text.includes(ind));

  return hasSimpleIndicator && !hasComplexIndicator;
}

// ============================================================
// 导出
// ============================================================

export { planResearch, createPlannerAgent, isSimpleTopic };
