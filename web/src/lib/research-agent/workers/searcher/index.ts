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
import type { SearchResult, SearchQuery, RoundResult } from '../../types';
import type { DataSourceType } from '../../../datasources';
import { createSearchTools, getDefaultSources, type SearchTools } from './tools';
import { updateProgress } from '../../progress/tracker';
import { createCancelCheck } from '../../cancellation/handler';
import { SEARCHER_DEFAULTS } from '../../config/defaults';
import { generateText } from '@/lib/llm';
import { parseJsonWithRetry } from '@/lib/json-utils';
import { calculateCredibility, calculateRelevance } from '../../quality/scorer';
import { estimateQuality, shouldContinueSearch } from './quality-estimator';
import { evaluateSearchResults, shouldResearch } from './result-evaluator';

/**
 * 带超时的 Promise 执行
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Searcher Agent 配置
 */
export interface SearcherConfig {
  /** 启用的数据源 */
  enabledSources: DataSourceType[];
  /** 最大结果数 (目标: 100+) */
  maxResults: number;
  /** 最小质量分数 */
  minQualityScore: number;
  /** 是否去重 */
  enableDeduplication: boolean;
  /** 搜索轮次数 (目标: 10+) */
  searchRounds: number;
  /** 目标数据点数 */
  targetDataPoints: number;

  // 多轮迭代配置
  /** 最大迭代轮次 */
  maxIterations: number;
  /** 质量阈值 */
  qualityThreshold: {
    minResults: number;
    minHighQualityRatio: number;
    maxLowQualityRatio: number;
    minDimensionCoverage: number;
    minDeduplicationRate: number;
  };
  /** 最大总查询数 */
  maxTotalQueries: number;
  /** 单轮超时（毫秒） */
  roundTimeout: number;
  /** 总超时（毫秒） */
  totalTimeout: number;
}

/** 默认配置 - 针对90分报告质量 */
const DEFAULT_CONFIG: SearcherConfig = {
  enabledSources: getDefaultSources(),
  maxResults: SEARCHER_DEFAULTS.maxResults,
  minQualityScore: SEARCHER_DEFAULTS.minQualityScore,
  enableDeduplication: true,
  searchRounds: SEARCHER_DEFAULTS.searchRounds,
  targetDataPoints: SEARCHER_DEFAULTS.targetDataPoints,
  // 多轮迭代配置
  maxIterations: SEARCHER_DEFAULTS.maxIterations,
  qualityThreshold: SEARCHER_DEFAULTS.qualityThreshold,
  maxTotalQueries: SEARCHER_DEFAULTS.maxTotalQueries,
  roundTimeout: SEARCHER_DEFAULTS.roundTimeout,
  totalTimeout: SEARCHER_DEFAULTS.totalTimeout,
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
 * 主执行函数：执行搜索（支持多轮迭代）
 */
async function executeSearch(
  state: ResearchState,
  config: SearcherConfig,
  tools: SearchTools
): Promise<SearcherResult> {
  const { searchPlan, projectId, title, keywords, searchIteration } = state;

  // 检查是否有搜索计划
  if (!searchPlan || searchPlan.queries.length === 0) {
    return {
      success: false,
      error: '没有搜索计划',
    };
  }

  // 创建取消检查
  const isCancelled = createCancelCheck(projectId);

  // 初始化迭代状态
  const iteration = searchIteration || {
    currentRound: 1,
    maxRounds: config.maxIterations,
    coveredDimensions: [],
    missingDimensions: [],
    roundResults: [],
    totalQueries: 0,
    totalResults: 0,
  };

  // 获取研究维度
  const researchDimensions = searchPlan.researchDimensions || [];

  try {
    // ==================== 第 1 轮：执行初始查询 ====================
    let pendingQueries = state.pendingQueries.length > 0
      ? state.pendingQueries
      : searchPlan.queries;

    let allResults: SearchResult[] = [...state.searchResults];
    let currentRound = iteration.currentRound;
    let roundResults: RoundResult[] = [...iteration.roundResults];

    // 迭代搜索
    while (currentRound <= iteration.maxRounds) {
      const totalInRound = pendingQueries.length;
      console.log(`[Searcher] 第 ${currentRound} 轮搜索，待查询: ${totalInRound}`);

      // 更新进度
      await updateProgress(projectId, {
        stage: 'searching',
        step: `第 ${currentRound} 轮搜索`,
        totalItems: totalInRound,
        completedItems: 0,
        currentItem: pendingQueries[0]?.query || '',
      });

      // 分批执行搜索
      const batchSize = 5;

      // 调试日志：显示数据源
      console.log('[Searcher] 使用的目标数据源:', searchPlan.targetSources);
      const roundResultsList: SearchResult[] = [];
      const failedQueries: SearchQuery[] = [];

      for (let i = 0; i < totalInRound; i += batchSize) {
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
          step: `第 ${currentRound} 轮: ${Math.min(i + batchSize, totalInRound)}/${totalInRound}`,
          totalItems: totalInRound,
          completedItems: Math.min(i, totalInRound),
          currentItem: batch[0]?.query || '',
        });

        // 执行搜索（带超时保护）
        let batchResults: SearchResult[];
        try {
          batchResults = await withTimeout(
            tools.searchAll(batch, searchPlan.targetSources),
            config.roundTimeout / 10, // 每批超时 = 单轮超时 / 10
            `搜索超时 (批次 ${i / batchSize + 1})`
          );
        } catch (error) {
          console.warn(`[Searcher] 批次搜索失败: ${error instanceof Error ? error.message : '未知错误'}`);
          // 超时或失败时跳过此批次，继续下一批次
          failedQueries.push(...batch);
          continue;
        }

        // 过滤低质量结果
        const filteredResults = config.enableDeduplication
          ? tools.deduplicate(batchResults)
          : batchResults;

        roundResultsList.push(...filteredResults);
        iteration.totalQueries += batch.length;

        // 记录失败的查询
        if (filteredResults.length === 0) {
          failedQueries.push(...batch);
        }
      }

      // 累计结果
      allResults = [...allResults, ...roundResultsList];
      iteration.totalResults = allResults.length;

      // 记录本轮结果
      const highQualityCount = roundResultsList.filter((r) => r.quality >= 7).length;
      const lowQualityCount = roundResultsList.filter((r) => r.quality < 4).length;
      const coveredDimensions = Array.from(new Set(roundResultsList.map((r) => r.dimension).filter(Boolean)));

      roundResults.push({
        round: currentRound,
        queryCount: pendingQueries.length,
        resultCount: roundResultsList.length,
        highQualityCount,
        lowQualityCount,
        dimensionsCovered: coveredDimensions,
        qualityScore: roundResultsList.length > 0
          ? roundResultsList.reduce((sum, r) => sum + r.quality, 0) / roundResultsList.length
          : 0,
      });

      // ==================== 评估质量 ====================
      const quality = evaluateSearchCompletion(
        allResults,
        config.qualityThreshold,
        researchDimensions
      );

      console.log(`[Searcher] 第 ${currentRound} 轮完成: ${allResults.length} 结果, 质量评分: ${quality.score}`);

      // ==================== 预估提取产出数量 ====================
      // 使用质量预估器预估 extractor 过滤后的产出数量
      const qualityEstimate = estimateQuality(
        { searchResults: allResults },
        researchDimensions
      );
      console.log(`[Searcher] 预估产出: ${qualityEstimate.estimatedOutputCount} 个, 建议: ${qualityEstimate.recommendation}`);

      // ==================== LLM 质量门禁评估 ====================
      // 使用 LLM 评估搜索结果质量
      try {
        const llmEvaluation = await evaluateSearchResults({ searchResults: allResults });
        console.log(`[Searcher] LLM质量评估: 高质量${llmEvaluation.summary.highQuality.length}个, 中质量${llmEvaluation.summary.mediumQuality.length}个, 低质量${llmEvaluation.summary.lowQuality.length}个`);
        console.log(`[Searcher] LLM建议: ${llmEvaluation.summary.action}`);

        // 如果 LLM 认为需要重做搜索，且还未达到最大轮次，则继续搜索
        if (shouldResearch(llmEvaluation) && currentRound < iteration.maxRounds) {
          console.log(`[Searcher] LLM质量门禁触发：需要重新搜索`);
        }
      } catch (error) {
        console.warn(`[Searcher] LLM质量评估失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }

      // 检查是否完成
      if (quality.isComplete || currentRound >= iteration.maxRounds) {
        console.log(`[Searcher] 搜索完成: ${quality.isComplete ? '质量达标' : '已达最大轮次'}`);

        // 更新最终进度
        await updateProgress(projectId, {
          stage: 'searching',
          step: `搜索完成 (${currentRound} 轮)`,
          totalItems: pendingQueries.length,
          completedItems: pendingQueries.length,
          currentItem: `${allResults.length} 个结果`,
        });

        // 返回结果
        return {
          success: true,
          searchResults: allResults,
          pendingQueries: failedQueries,
        };
      }

      // ==================== 需要继续迭代 ====================
      // 检查是否还有查询配额
      if (iteration.totalQueries >= config.maxTotalQueries) {
        console.log(`[Searcher] 达到最大查询数 ${config.maxTotalQueries}，结束搜索`);
        break;
      }

      // 生成缺失维度的查询
      const newQueries = await generateMissingDimensionQueries(
        title,
        keywords,
        quality.missingDimensions
      );

      if (newQueries.length === 0) {
        console.log(`[Searcher] 无法生成更多查询，结束搜索`);
        break;
      }

      console.log(`[Searcher] 触发第 ${currentRound + 1} 轮搜索，生成 ${newQueries.length} 个新查询`);

      // 更新迭代状态
      currentRound++;
      pendingQueries = newQueries;
      iteration.currentRound = currentRound;
      iteration.roundResults = roundResults;
    }

    // 达到最大轮次
    // 记录最终统计（监控埋点）
    const finalQuality = evaluateSearchCompletion(
      allResults,
      config.qualityThreshold,
      researchDimensions
    );

    console.log(`[Searcher] 搜索完成统计:
  - 总轮次: ${currentRound}
  - 总查询数: ${iteration.totalQueries}
  - 总结果数: ${allResults.length}
  - 高质量结果: ${finalQuality.highQualityCount}
  - 维度覆盖: ${finalQuality.coveredDimensions.length}/${researchDimensions.length}
  - 质量评分: ${finalQuality.score}`);

    return {
      success: true,
      searchResults: allResults,
      pendingQueries: [],
    };
  } catch (error) {
    console.error('[Searcher] 搜索执行失败:', error);
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
 * 评估搜索完成度（多轮迭代版本）
 */
function evaluateSearchCompletion(
  results: SearchResult[],
  qualityThresholds: SearcherConfig['qualityThreshold'],
  researchDimensions: string[] = []
): {
  isComplete: boolean;
  score: number;
  issues: string[];
  highQualityCount: number;
  lowQualityCount: number;
  coveredDimensions: string[];
  missingDimensions: string[];
} {
  const issues: string[] = [];
  let score = 100;

  // 1. 检查结果数量
  const resultCount = results.length;
  if (resultCount < qualityThresholds.minResults) {
    issues.push(`搜索结果不足: ${resultCount}/${qualityThresholds.minResults}`);
    score -= (qualityThresholds.minResults - resultCount) * 2;
  }

  // 2. 检查质量分布
  const highQualityCount = results.filter((r) => r.quality >= 7).length;
  const lowQualityCount = results.filter((r) => r.quality < 4).length;
  const highQualityRatio = resultCount > 0 ? highQualityCount / resultCount : 0;
  const lowQualityRatio = resultCount > 0 ? lowQualityCount / resultCount : 0;

  if (highQualityRatio < qualityThresholds.minHighQualityRatio) {
    issues.push(`高质量结果占比过低: ${(highQualityRatio * 100).toFixed(1)}%/${(qualityThresholds.minHighQualityRatio * 100).toFixed(0)}%`);
    score -= 15;
  }

  if (lowQualityRatio > qualityThresholds.maxLowQualityRatio) {
    issues.push(`低质量结果过多: ${(lowQualityRatio * 100).toFixed(1)}%/${(qualityThresholds.maxLowQualityRatio * 100).toFixed(0)}%`);
    score -= 15;
  }

  // 3. 检查维度覆盖
  const coveredDimensions = Array.from(new Set(results.map((r) => r.dimension).filter(Boolean)));
  const missingDimensions = researchDimensions.filter((d) => !coveredDimensions.includes(d));
  const dimensionCoverage = researchDimensions.length > 0
    ? coveredDimensions.length / researchDimensions.length
    : coveredDimensions.length / 8; // 默认 8 个维度

  if (dimensionCoverage < qualityThresholds.minDimensionCoverage) {
    issues.push(`维度覆盖不足: ${coveredDimensions.length}/${researchDimensions.length || 8} (${(dimensionCoverage * 100).toFixed(0)}%)`);
    score -= 10;
  }

  // 4. 检查去重率（简单检查重复标题）
  const titles = results.map((r) => r.title.toLowerCase());
  const uniqueTitles = new Set(titles);
  const deduplicationRate = resultCount > 0 ? uniqueTitles.size / resultCount : 1;

  if (deduplicationRate < qualityThresholds.minDeduplicationRate) {
    issues.push(`去重率过低: ${(deduplicationRate * 100).toFixed(0)}%`);
    score -= 10;
  }

  // 5. 来源可信度评估（新增）
  const credibilityScore = calculateCredibility(results, []);
  if (credibilityScore < 50) {
    issues.push(`来源可信度低: ${credibilityScore.toFixed(0)}%`);
    score -= 15;
  }

  // 6. 内容相关性评估（新增）
  const relevanceScore = calculateRelevance(results, '', researchDimensions);
  if (relevanceScore < 50) {
    issues.push(`内容相关性不足: ${relevanceScore.toFixed(0)}%`);
    score -= 15;
  }

  const isComplete = score >= 60 && issues.length <= 2;

  return {
    isComplete,
    score: Math.max(0, score),
    issues,
    highQualityCount,
    lowQualityCount,
    coveredDimensions,
    missingDimensions,
  };
}

/**
 * 生成缺失维度的查询
 */
async function generateMissingDimensionQueries(
  title: string,
  keywords: string[],
  missingDimensions: string[]
): Promise<SearchQuery[]> {
  if (missingDimensions.length === 0) return [];

  // 增强的查询生成提示词
  const prompt = `你是研究查询规划专家。基于以下信息，为缺失维度生成新的搜索查询：

## 产品信息
- 标题：${title}
- 关键词：${keywords.join(', ')}

## 缺失维度
${missingDimensions.map((d) => `- ${d}`).join('\n')}

## 增强要求
除常规产品信息外，请同时生成以下类型的查询：

1. 竞品评价查询：搜索竞品的用户评价、优缺点分析
   - 例如："{竞品} 用户评价 优缺点"
   - 例如："{竞品} vs {产品} 对比评测"

2. 成本数据查询：搜索产品价格、成本相关数据
   - 例如："{行业} {产品} 价格 报价 成本"
   - 例如："{产品} 收费标准 定价策略"

3. 实施案例查询：搜索实际落地案例和效果数据
   - 例如："{行业} {产品} 实施案例 效果 数据"
   - 例如："{产品} 成功案例 客户案例"

4. 风险信息查询：搜索潜在风险和问题
   - 例如："{产品} 问题 风险 事故 投诉"
   - 例如："{产品} 缺点 不足 失败案例"

## 要求
1. 为每个缺失维度生成 1-2 个搜索查询
2. 同时为上述四类增强查询各生成 1-2 个查询
3. 查询应聚焦于获取缺失维度的信息
4. 查询应与产品高度相关

请返回 JSON 数组，格式：
[{"query": "搜索查询内容", "dimension": "维度名称", "purpose": "查询目的", "priority": 1-5}]`;

  try {
    const queries = await parseJsonWithRetry<unknown>(
      (p, maxTokens) => generateText(p, undefined, { maxTokens, jsonMode: true }),
      prompt,
      3,
      8192
    );

    // 兼容模型返回对象包裹数组，如 { "xxx_queries": [ ... ] }
    let queryItems: Array<{
      query: string;
      dimension: string;
      purpose: string;
      priority: number | string;
    }> = [];

    if (Array.isArray(queries)) {
      queryItems = queries as Array<{ query: string; dimension: string; purpose: string; priority: number | string }>;
    } else if (queries && typeof queries === 'object') {
      const obj = queries as Record<string, unknown>;
      if (Array.isArray(obj.queries)) {
        queryItems = obj.queries as Array<{ query: string; dimension: string; purpose: string; priority: number | string }>;
      } else {
        const firstArrayValue = Object.values(obj).find(v => Array.isArray(v)) as unknown[] | undefined;
        if (firstArrayValue) {
          queryItems = firstArrayValue as Array<{ query: string; dimension: string; purpose: string; priority: number | string }>;
        }
      }
    }

    if (queryItems.length === 0) {
      throw new Error('LLM 未返回可识别的查询数组');
    }

    // 将字符串优先级转换为数字
    const priorityMap: Record<string, number> = { high: 1, medium: 2, low: 3 };

    return queryItems.map((q, idx) => ({
      id: `iter-${Date.now()}-${idx}`,
      query: String(q.query || ''),
      dimension: String(q.dimension || missingDimensions[idx % missingDimensions.length]),
      purpose: String(q.purpose || `补充 ${q.dimension} 维度`),
      priority: typeof q.priority === 'number' ? q.priority : (priorityMap[String(q.priority)] || 2),
    }));
  } catch (error) {
    console.error('生成缺失维度查询失败:', error);
    // 降级：返回简单的查询
    return missingDimensions.slice(0, 2).map((d, idx) => ({
      id: `iter-${Date.now()}-${idx}`,
      query: `${title} ${d}`,
      dimension: d,
      purpose: `补充 ${d} 维度`,
      priority: 2,
    }));
  }
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
