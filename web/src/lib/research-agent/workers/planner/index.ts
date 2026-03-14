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
import { parseJsonWithRetry } from '@/lib/json-utils';
import { detectIndustry, getIndustryDimensions } from './industry-detector';
import { calculateClarityScore } from './user-input-parser';

/**
 * Planner Agent 配置
 */
export interface PlannerConfig {
  /** 是否使用 LLM 生成计划 */
  useLLM: boolean;
  /** 默认目标数据源 */
  defaultSources: DataSourceType[];
  /** 获取数据源的函数（延迟调用） */
  getSources?: () => DataSourceType[];
}

/** 默认配置 */
// 从 DataSourceManager 动态获取默认数据源 - 改为延迟获取
function getDefaultSourcesFromDb(): DataSourceType[] {
  try {
    const { getDataSourceManager } = require('@/lib/datasources');
    const mgr = getDataSourceManager();
    const sources = mgr.getEnabledSources();
    console.log('[Planner] defaultSources:', sources);
    return sources;
  } catch {
    console.error('[Planner] 获取默认数据源失败，回退到 rss-hackernews');
    return ['rss-hackernews'];
  }
}

const DEFAULT_CONFIG: PlannerConfig = {
  useLLM: true,
  defaultSources: [],  // 延迟初始化
  getSources: getDefaultSourcesFromDb,  // 存储获取函数
};

/**
 * 获取默认数据源（支持延迟加载）
 */
function getSources(config: PlannerConfig): DataSourceType[] {
  if (config.getSources) {
    return config.getSources();
  }
  return config.defaultSources.length > 0 ? config.defaultSources : getDefaultSourcesFromDb();
}

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
    // 判断是否使用 LLM（对于本地模型如 Ollama，apiKey 可以为 null）
    const llmConfig = getLLMConfig();
    const hasLLMConfig = !!(llmConfig.baseUrl || llmConfig.apiKey || llmConfig.modelName);
    const isLocalModel = llmConfig.provider === 'ollama' ||
                         llmConfig.baseUrl?.includes('localhost') ||
                         llmConfig.baseUrl?.includes('127.0.0.1');
    const needsApiKey = !isLocalModel;
    const hasApiKey = !!llmConfig.apiKey;

    if (!config.useLLM || !hasLLMConfig || (needsApiKey && !hasApiKey)) {
      // 使用默认配置
      return buildDefaultPlan(title, description, keywords, getSources(config));
    }

    // 更新进度
    await updateProgress(state.projectId, {
      stage: 'planning',
      step: '调用 LLM 生成研究计划',
      totalItems: 3,
      completedItems: 1,
      currentItem: 'LLM 生成中...',
    });

    // 1. 首先进行行业判断（包含意图分析）
    const industryResult = await detectIndustry({
      title,
      description,
      keywords: keywords || [],
    });

    console.log(`[Planner] 行业判断: ${industryResult.detectedIndustry} (置信度: ${industryResult.confidence})`);

    // 记录意图分析结果
    if (industryResult.intent) {
      console.log(`[Planner] 意图分析: ${industryResult.intent} (清晰度: ${(industryResult.clarityScore || 0).toFixed(2)})`);
    }
    if (industryResult.coreTheme) {
      console.log(`[Planner] 核心主题: ${industryResult.coreTheme}`);
    }
    if (industryResult.keywords && industryResult.keywords.length > 0) {
      console.log(`[Planner] 提取关键词: ${industryResult.keywords.join(', ')}`);
    }

    // 2. 使用 LLM 生成计划（传入行业信息和意图）
    const searchPlan = await generateSearchPlan(
      title,
      description,
      keywords,
      getSources(config),
      industryResult
    );

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
  targetSources?: DataSourceType[],
  industryResult?: {
    detectedIndustry: string;
    confidence: number;
    reasoning: string;
    researchDimensions: string[];
    relatedIndustries?: string[];
    intent?: string;
    coreTheme?: string;
    keywords?: string[];
    clarityScore?: number;
  }
): Promise<SearchPlan> {
  // 延迟获取数据源
  const finalTargetSources = targetSources || getDefaultSourcesFromDb();

  const prompt = formatPrompt(PLAN_RESEARCH_PROMPT, { title, description });

  // 添加关键词上下文（优先使用 LLM 提取的关键词）
  let enhancedPrompt = prompt;
  const mergedKeywords = industryResult?.keywords || keywords;
  if (mergedKeywords && mergedKeywords.length > 0) {
    enhancedPrompt += `\n\n【关键词】\n${mergedKeywords.join(', ')}`;
  }

  // 添加行业判断结果
  if (industryResult) {
    enhancedPrompt += `\n\n【行业判断】\n`;
    enhancedPrompt += `- 行业类别: ${industryResult.detectedIndustry}\n`;
    enhancedPrompt += `- 置信度: ${(industryResult.confidence * 100).toFixed(0)}%\n`;
    enhancedPrompt += `- 判断理由: ${industryResult.reasoning}\n`;
    if (industryResult.researchDimensions.length > 0) {
      enhancedPrompt += `- 研究维度: ${industryResult.researchDimensions.join(', ')}\n`;
    }
    if (industryResult.relatedIndustries && industryResult.relatedIndustries.length > 0) {
      enhancedPrompt += `- 相关行业: ${industryResult.relatedIndustries.join(', ')}\n`;
    }

    // 添加意图分析结果
    if (industryResult.intent) {
      enhancedPrompt += `\n【用户意图】\n`;
      enhancedPrompt += `- 研究类型: ${industryResult.intent}\n`;
      if (industryResult.coreTheme) {
        enhancedPrompt += `- 核心主题: ${industryResult.coreTheme}\n`;
      }
      if (industryResult.clarityScore !== undefined) {
        enhancedPrompt += `- 输入清晰度: ${(industryResult.clarityScore * 100).toFixed(0)}%\n`;
      }
    }
  }

  // 调用 LLM 并统一走共享 JSON 解析/重试链路
  const response = await parseJsonWithRetry<Record<string, unknown>>(
    (p, maxTokens) => generateText(p, undefined, { maxTokens, jsonMode: true }),
    enhancedPrompt,
    3
  );

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
    targetSources: finalTargetSources,
    researchDimensions: (response.researchDimensions as string[]) || DEFAULT_DIMENSIONS,
    qualityThresholds,
  };
}

/**
 * 使用默认计划（无 API Key 或禁用 LLM 时）
 */
function buildDefaultPlan(
  title: string,
  description: string | undefined,
  keywords: string[] | undefined,
  sources?: DataSourceType[]
): PlannerResult {
  // 确保有数据源
  const finalSources = sources && sources.length > 0 ? sources : getDefaultSourcesFromDb();
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
      targetSources: finalSources,
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
