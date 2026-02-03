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
import { jsonrepair } from 'jsonrepair';

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
  defaultSources: ['duckduckgo', 'rss-hackernews', 'rss-techcrunch'],
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
 * 从文本中提取平衡括号包裹的 JSON 对象
 * 使用计数器确保正确匹配嵌套的括号
 */
function extractBalancedJson(text: string): string | null {
  let startIdx = -1;
  let braceCount = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '{' && braceCount === 0) {
      startIdx = i;
      braceCount = 1;
    } else if (char === '{' && braceCount > 0) {
      braceCount++;
    } else if (char === '}' && braceCount > 0) {
      braceCount--;
      if (braceCount === 0 && startIdx !== -1) {
        return text.slice(startIdx, i + 1);
      }
    }
  }

  return null;
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

  // 使用 jsonrepair 解析 JSON（支持 LLM 返回的各种格式）
  let response: Record<string, unknown> = {};
  let parseSuccess = false;

  try {
    // 策略1: 尝试直接解析（处理纯 JSON 响应）
    response = JSON.parse(responseText);
    parseSuccess = true;
  } catch {
    // 策略2: 尝试提取 ```json {...} ``` 格式（JSON 在同一行）
    const jsonOnSameLine = responseText.match(/```json\s+\{[\s\S]*?\}\s*```/);
    if (jsonOnSameLine) {
      try {
        const content = jsonOnSameLine[0].replace(/```json\s+/, '').replace(/\s*```$/, '');
        response = JSON.parse(jsonrepair(content));
        parseSuccess = true;
      } catch {
        // 继续尝试下一个策略
      }
    }

    // 策略3: 尝试提取 ```json 代码块（非贪婪）
    if (!parseSuccess) {
      const codeBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        try {
          response = JSON.parse(jsonrepair(codeBlockMatch[1]));
          parseSuccess = true;
        } catch {
          // 继续尝试下一个策略
        }
      }
    }

    // 策略4: 使用平衡括号算法提取 JSON
    if (!parseSuccess) {
      const braceMatch = extractBalancedJson(responseText);
      if (braceMatch) {
        try {
          response = JSON.parse(jsonrepair(braceMatch));
          parseSuccess = true;
        } catch {
          // 继续尝试下一个策略
        }
      }
    }

    // 如果以上都失败，直接用 jsonrepair 处理
    if (!parseSuccess) {
      try {
        response = JSON.parse(jsonrepair(responseText));
      } catch (finalError) {
        throw new Error(`无法解析 LLM 响应为 JSON: ${(finalError as Error).message}`);
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
