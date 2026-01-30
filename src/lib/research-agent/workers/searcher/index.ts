/**
 * Searcher Agent
 *
 * 负责执行搜索的 Agent
 *
 * 功能：
 * 1. 从 ResearchState 获取搜索计划
 * 2. 执行搜索查询
 * 3. 去重和排序结果
 * 4. 更新状态
 */

import type { ResearchState } from '../../state';
import type { SearchResult, SearchQuery } from '../../types';
import { createSearchTools, DEFAULT_SOURCES, type SearchTools } from './tools';
import { updateProgress } from '../../progress/tracker';
import { createCancelCheck } from '../../cancellation/handler';

/**
 * Searcher Agent 配置
 */
export interface SearcherConfig {
  /** 启用的数据源 */
  enabledSources: SearchQuery['dimension'][];
  /** 最大结果数 */
  maxResults: number;
  /** 最小质量分数 */
  minQualityScore: number;
  /** 是否去重 */
  enableDeduplication: boolean;
}

/** 默认配置 */
const DEFAULT_CONFIG: SearcherConfig = {
  enabledSources: DEFAULT_SOURCES,
  maxResults: 50,
  minQualityScore: 3,
  enableDeduplication: true,
};

/**
 * Searcher Agent 执行结果
 */
export interface SearcherResult {
  success: boolean;
  searchResults?: SearchResult[];
  pendingQueries?: SearchQuery[];
  error?: string;
}

/**
 * 创建 Searcher Agent
 */
function createSearcherAgent(config: Partial<SearcherConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const tools = createSearchTools();

  return {
    config: finalConfig,
    execute: (state: ResearchState) => executeSearch(state, finalConfig, tools),
  };
}

/**
 * 主执行函数：执行搜索
 */
async function executeSearch(
  state: ResearchState,
  config: SearcherConfig,
  tools: SearchTools
): Promise<SearcherResult> {
  const { searchPlan, projectId, title } = state;

  // 检查是否有搜索计划
  if (!searchPlan || searchPlan.queries.length === 0) {
    return {
      success: false,
      error: '没有搜索计划',
    };
  }

  // 创建取消检查
  const isCancelled = createCancelCheck(projectId);

  try {
    // 获取待执行的查询
    const pendingQueries = state.pendingQueries.length > 0
      ? state.pendingQueries
      : searchPlan.queries;

    // 更新进度
    await updateProgress(projectId, {
      stage: 'searching',
      step: '开始搜索',
      totalItems: pendingQueries.length,
      completedItems: 0,
      currentItem: pendingQueries[0]?.query || '',
    });

    // 分批执行搜索
    const batchSize = 5;
    const allResults: SearchResult[] = [];
    const failedQueries: SearchQuery[] = [];

    for (let i = 0; i < pendingQueries.length; i += batchSize) {
      // 检查取消
      if (isCancelled()) {
        return {
          success: false,
          error: '搜索被用户取消',
          searchResults: allResults,
          pendingQueries: pendingQueries.slice(i),
        };
      }

      const batch = pendingQueries.slice(i, i + batchSize);

      await updateProgress(projectId, {
        stage: 'searching',
        step: `搜索进度 ${Math.min(i + batchSize, pendingQueries.length)}/${pendingQueries.length}`,
        totalItems: pendingQueries.length,
        completedItems: i,
        currentItem: batch[0]?.query || '',
      });

      // 执行搜索
      const batchResults = await tools.searchAll(
        batch,
        searchPlan.targetSources
      );

      // 过滤低质量结果
      const filteredResults = config.enableDeduplication
        ? tools.deduplicate(batchResults)
        : batchResults;

      allResults.push(...filteredResults);

      // 记录失败的查询
      if (filteredResults.length < config.minQualityScore) {
        failedQueries.push(...batch);
      }
    }

    // 更新进度
    await updateProgress(projectId, {
      stage: 'searching',
      step: '搜索完成',
      totalItems: pendingQueries.length,
      completedItems: pendingQueries.length,
      currentItem: `${allResults.length} 个结果`,
    });

    return {
      success: true,
      searchResults: allResults,
      pendingQueries: failedQueries,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '搜索执行失败',
    };
  }
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 评估搜索完成度
 */
function evaluateSearchCompletion(
  results: SearchResult[],
  qualityThresholds: Record<string, number>
): { isComplete: boolean; score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 100;

  // 检查结果数量
  const resultCount = results.length;
  const minResults = qualityThresholds.minSearchResults || 15;

  if (resultCount < minResults) {
    issues.push(`搜索结果不足: ${resultCount}/${minResults}`);
    score -= (minResults - resultCount) * 2;
  }

  // 检查质量分布
  const highQualityCount = results.filter((r) => r.quality >= 7).length;
  const lowQualityCount = results.filter((r) => r.quality < 4).length;

  if (highQualityCount < resultCount * 0.3) {
    issues.push('高质量结果占比过低');
    score -= 10;
  }

  if (lowQualityCount > resultCount * 0.5) {
    issues.push('低质量结果过多');
    score -= 15;
  }

  // 检查维度覆盖
  const dimensions = new Set(results.map((r) => r.dimension));
  if (dimensions.size < 3) {
    issues.push(`研究维度覆盖不足: ${dimensions.size} 个`);
    score -= 10;
  }

  return {
    isComplete: score >= 60 && issues.length <= 2,
    score: Math.max(0, score),
    issues,
  };
}

/**
 * 建议补充搜索
 */
function suggestAdditionalQueries(
  results: SearchResult[],
  existingQueries: SearchQuery[]
): SearchQuery[] {
  const suggestions: SearchQuery[] = [];
  const dimensions = new Set(results.map((r) => r.dimension));

  // 检查每个维度是否覆盖充分
  const dimensionCounts = new Map<string, number>();
  for (const result of results) {
    dimensionCounts.set(
      result.dimension,
      (dimensionCounts.get(result.dimension) || 0) + 1
    );
  }

  // 为缺少结果的维度建议查询
  const undercoveredDimensions = Array.from(dimensionCounts.entries())
    .filter(([, count]) => count < 5)
    .map(([dimension]) => dimension);

  for (const dimension of undercoveredDimensions.slice(0, 2)) {
    suggestions.push({
      id: `sug-${Date.now()}-${suggestions.length}`,
      query: `more ${dimension} information`,
      purpose: `补充 ${dimension} 维度的搜索结果`,
      dimension,
      priority: 1,
      hints: `请搜索与 ${dimension} 相关的更多信息`,
    });
  }

  return suggestions;
}

// ============================================================
// 导出
// ============================================================

export { executeSearch, createSearcherAgent, evaluateSearchCompletion, suggestAdditionalQueries };
