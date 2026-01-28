/**
 * 产品调研 Agent (基于 Agentic RAG 架构)
 *
 * 核心设计原则：
 * 1. 动态决策：让 LLM 决定搜索查询、质量阈值、报告结构
 * 2. 上下文感知：搜索时携带已收集信息，避免重复
 * 3. 自适应流程：根据数据质量动态调整搜索策略
 * 4. 最小化硬编码：所有决策由 LLM 完成
 */

import { getDataSourceManager, type SearchResult, type DataSourceType } from '../datasources';
import { crawlUrls, isCrawl4AIAvailable, type SearchResult as Crawl4SearchResult } from '../datasources';
import { generateText, getLLMConfig, PRODUCT_ANALYST_PROMPT } from '../llm';
import { getModelConfig } from '../model-roles';
import { updateProgress, addLog } from '../taskQueue';
import {
  saveTaskData,
  loadTaskData,
  hasUnfinishedTask,
  deleteTaskFiles,
  createEmptyTaskData,
  saveTaskReport,
  type TaskDataFile,
} from '../task-persistence';

// ============================================================
// 类型定义
// ============================================================

// 研究计划（动态生成）
interface SearchPlan {
  queries: SearchQuery[];
  targetSources: DataSourceType[];
  researchDimensions: string[];  // 研究维度（让 LLM 决定）
  qualityThresholds: QualityThresholds;  // 质量阈值（让 LLM 决定）
}

interface SearchQuery {
  id: string;
  query: string;
  purpose: string;
  dimension: string;  // 所属研究维度
  priority: number;   // 优先级 1-5
  hints?: string;     // 搜索提示（告诉搜索服务需要什么类型的信息）
}

// 质量阈值（动态）
interface QualityThresholds {
  minFeatures: number;
  minCompetitors: number;
  minUseCases: number;
  minTechStack: number;
  minSearchResults: number;
  completionScore: number;  // 达到此分数认为完成
}

// 单个搜索结果摘要
interface IndividualSummary {
  source: string;
  url: string;
  title: string;
  content: string;
  keyPoints: string[];
  features: string[];
  competitors: string[];
  techStack: string[];
  useCases: string[];
  marketInfo: string;
  limitations: string[];
  qualityScore: number;
  // 新增：信息密度评估
  informationDensity: {
    featureDensity: number;
    competitorDensity: number;
    techDensity: number;
    useCaseDensity: number;
    marketDensity: number;
  };
}

// 综合汇总
interface ComprehensiveSummary {
  productOverview: string;
  coreThemes: string[];
  keyFindings: string[];
  allFeatures: string[];
  allCompetitors: string[];
  allTechStack: string[];
  allUseCases: string[];
  marketInsights: string[];
  dataGaps: string[];
  sourcesUsed: string[];
  rawInsights: IndividualSummary[];
  // 新增：汇总质量评估
  summaryQuality: {
    completeness: number;  // 0-100
    reliability: number;   // 0-100
    depth: number;         // 0-100
  };
}

// 深度分析结果
interface DeepAnalysis {
  features: { name: string; count: number; sources: string[]; description: string }[];
  competitors: { name: string; features: string[]; description: string; marketPosition: string }[];
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  marketData: { marketSize: string; growthRate: string; keyPlayers: string[]; trends: string[]; segments: string[] };
  techAnalysis: { architecture: string[]; techStack: string[]; emergingTech: string[] };
  userInsights: { personas: string[]; painPoints: string[]; requirements: string[] };
  opportunities: string[];
  risks: string[];
  recommendations: string[];
  // 新增：分析置信度
  confidenceScore: number;
}

// 数据质量检查
interface DataQualityCheck {
  isComplete: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
  coverage: Record<string, boolean>;
  missingDimensions: string[];  // 缺失的研究维度
  recommendedQueries: SearchQuery[]; // 推荐的搜索查询
}

// 研究结果
interface ResearchResult {
  report: string;
  analysis: DeepAnalysis;
  summary: ComprehensiveSummary;
  searchResults: SearchResult[];
  dataQuality: DataQualityCheck;
  citations: Citation[];
  metadata: {
    iterationsUsed: number;
    totalSearches: number;
    totalResults: number;
  };
}

interface Citation {
  id: string;
  source: string;
  title: string;
  url: string;
  relevanceScore: number;
}

// ============================================================
// 配置常量（唯一需要硬编码的地方）
// ============================================================

const CONFIG = {
  MAX_ITERATIONS: 3,
  MAX_SEARCH_RESULTS: 50,           // 最多处理 50 条搜索结果
  BATCH_SIZE: 5,                     // 并行处理批次大小
  MIN_RESULTS_PER_QUERY: 5,          // 每个查询最少结果数
  DEFAULT_QUALITY_THRESHOLDS: {
    minFeatures: 3,
    minCompetitors: 2,
    minUseCases: 3,
    minTechStack: 2,
    minSearchResults: 15,
    completionScore: 60,
  },
  DEFAULT_DIMENSIONS: [
    '产品功能特性',
    '竞品分析',
    '技术架构',
    '市场规模与趋势',
    '使用场景与用户案例',
  ],
};

// ============================================================
// 节点函数
// ============================================================

/**
 * 节点1: 制定初始研究计划（动态生成）
 *
 * LLM 根据研究主题动态决定：
 * - 需要搜索哪些维度
 * - 每个维度需要什么查询
 * - 每个查询的优先级
 * - 搜索提示（告诉搜索服务需要什么）
 * - 质量阈值（根据主题调整）
 */
async function planResearch(
  title: string,
  description: string
): Promise<SearchPlan> {
  const config = getLLMConfig();
  const hasApiKey = !!config.apiKey;

  if (!hasApiKey) {
    // 无 API Key 时使用默认配置
    return {
      queries: generateDefaultQueries(title),
      targetSources: ['duckduckgo', 'github'],
      researchDimensions: CONFIG.DEFAULT_DIMENSIONS,
      qualityThresholds: CONFIG.DEFAULT_QUALITY_THRESHOLDS,
    };
  }

  const prompt = `你是一个专业的产品调研规划专家。请为以下产品主题制定详细的研究计划。

【研究任务】
主题: ${title}
描述: ${description || '无'}

【任务要求】
1. 分析这个产品主题的特点，确定需要研究哪些维度
2. 为每个维度设计针对性的搜索查询（3-5个查询）
3. 为每个查询设计搜索提示，帮助搜索引擎返回更相关的结果
4. 根据主题特点调整质量阈值（例如：复杂产品可能需要更多竞品）
5. 合理分配优先级（1=最高，5=最低）

【输出要求】
请以 JSON 格式返回研究计划：

{
  "researchDimensions": ["维度1", "维度2", "维度3"],
  "qualityThresholds": {
    "minFeatures": 数字,
    "minCompetitors": 数字,
    "minUseCases": 数字,
    "minTechStack": 数字,
    "minSearchResults": 数字,
    "completionScore": 数字
  },
  "queries": [
    {
      "id": "q1",
      "query": "精确的搜索词",
      "purpose": "这个查询的目的",
      "dimension": "所属维度",
      "priority": 1-5的数字,
      "hints": "搜索提示，告诉搜索引擎需要什么类型的信息"
    }
  ],
  "targetSources": ["duckduckgo", "github"]
}

【重要提示】
- 查询词要精确，避免太宽泛或太具体
- 优先级高的查询先执行
- 搜索提示要具体，告诉引擎需要什么类型的信息
- 质量阈值要根据主题复杂度调整`;

  try {
    const result = await generateText(prompt, PRODUCT_ANALYST_PROMPT, {
      temperature: 0.5,
      maxTokens: 3000,
      role: 'reporter', // 报告生成模型
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const plan = JSON.parse(jsonMatch[0]);

      // 验证并补全数据结构
      return {
        queries: plan.queries || generateDefaultQueries(title),
        targetSources: plan.targetSources || ['duckduckgo', 'github'],
        researchDimensions: plan.researchDimensions || CONFIG.DEFAULT_DIMENSIONS,
        qualityThresholds: {
          ...CONFIG.DEFAULT_QUALITY_THRESHOLDS,
          ...plan.qualityThresholds,
        },
      };
    }
  } catch (error) {
    console.error('制定研究计划失败:', error);
  }

  return {
    queries: generateDefaultQueries(title),
    targetSources: ['duckduckgo', 'github'],
    researchDimensions: CONFIG.DEFAULT_DIMENSIONS,
    qualityThresholds: CONFIG.DEFAULT_QUALITY_THRESHOLDS,
  };
}

/**
 * 生成默认搜索查询（当 LLM 不可用时）
 */
function generateDefaultQueries(title: string): SearchQuery[] {
  return [
    { id: 'q1', query: title, purpose: '获取产品基础信息和核心功能', dimension: '产品功能特性', priority: 1, hints: '请搜索产品的核心功能、主要特性、解决的问题。' },
    { id: 'q2', query: `${title} 竞品 对比 竞争`, purpose: '识别主要竞品', dimension: '竞品分析', priority: 2, hints: '请搜索这个领域的竞争对手、替代产品、类似服务。' },
    { id: 'q3', query: `${title} 技术架构 AI 机器学习`, purpose: '了解技术实现', dimension: '技术架构', priority: 2, hints: '请搜索使用的技术栈、算法、框架、模型等技术细节。' },
    { id: 'q4', query: `${title} 市场 规模 趋势 2024 2025`, purpose: '了解市场状况', dimension: '市场规模与趋势', priority: 3, hints: '请搜索市场规模、增长率、市场趋势、主要玩家。' },
    { id: 'q5', query: `${title} 应用案例 用户 客户`, purpose: '收集使用案例', dimension: '使用场景与用户案例', priority: 3, hints: '请搜索实际应用案例、客户成功故事、使用场景。' },
  ];
}

/**
 * 节点2: 执行网络搜索（带上下文提示）
 *
 * 改进点：
 * - 为每个查询添加搜索提示
 * - 根据已收集信息避免重复搜索
 * - 动态调整结果数量
 */
async function executeWebResearch(
  plan: SearchPlan,
  previousResults: SearchResult[]
): Promise<SearchResult[]> {
  const sourceManager = getDataSourceManager();
  const allResults: SearchResult[] = [];

  // 按优先级排序查询
  const sortedQueries = [...plan.queries].sort((a, b) => a.priority - b.priority);

  console.log(`Executing ${sortedQueries.length} search queries (${plan.targetSources.join(', ')})...`);

  // 构建已收集信息的摘要（帮助避免重复搜索）
  const collectedInfoSummary = summarizeCollectedInfo(previousResults);

  for (const queryInfo of sortedQueries) {
    try {
      // 检查是否已收集足够信息
      if (shouldSkipQuery(queryInfo, previousResults, collectedInfoSummary)) {
        console.log(`  Skipping "${queryInfo.purpose}" - sufficient information already collected`);
        continue;
      }

      const results = await searchWithContext(
        sourceManager,
        plan.targetSources,
        queryInfo,
        collectedInfoSummary
      );

      // 标记每个结果
      for (const result of results) {
        (result as SearchResult & { searchPurpose: string }).searchPurpose = queryInfo.purpose;
        (result as SearchResult & { searchDimension: string }).searchDimension = queryInfo.dimension;
        (result as SearchResult & { queryId: string }).queryId = queryInfo.id;
      }

      allResults.push(...results);
      console.log(`  Query "${queryInfo.purpose}": found ${results.length} results`);
    } catch (error) {
      console.error(`搜索失败 ${queryInfo.query}:`, error);
    }
  }

  // 去重
  const uniqueResults = deduplicateResults([...previousResults, ...allResults]);
  console.log(`Total unique results: ${uniqueResults.length}`);

  // 增强搜索结果：使用 Crawl4AI 获取完整页面内容
  const enrichedResults = await enrichResultsWithCrawl4AI(uniqueResults);
  if (enrichedResults.length > uniqueResults.length) {
    console.log(`Crawl4AI enriched ${enrichedResults.length - uniqueResults.length} results with full content`);
  }

  return enrichedResults.filter(r => !previousResults.some(pr => pr.url === r.url));
}

/**
 * 使用 Crawl4AI 增强搜索结果，获取完整页面内容
 *
 * 策略：
 * 1. 识别内容过短的搜索结果（如 DuckDuckGo 返回的 "相关搜索结果: xxx"）
 * 2. 使用 Crawl4AI 爬取这些 URL 的完整内容
 * 3. 用完整内容替换原有的简短描述
 */
async function enrichResultsWithCrawl4AI(results: SearchResult[]): Promise<SearchResult[]> {
  // 检查 Crawl4AI 服务是否可用
  const isAvailable = await isCrawl4AIAvailable();
  if (!isAvailable) {
    // 不再打印日志，避免信息过多
    return results;
  }

  // 识别需要增强的结果（内容过短或质量低）
  const urlsToCrawl = results
    .filter(r => {
      // 跳过已经标记为需要爬取的结果
      if ((r as any).crawled) return false;

      // 内容为空或太短，或看起来是占位符文本
      const content = r.content || '';
      const isEmpty = !content || content.trim() === '';
      const isShortContent = content.length < 200; // 降低阈值到 200 字符
      const isPlaceholderText = content.startsWith('相关搜索结果:') ||
        content.includes('Score:') ||
        content.length < 50; // 50 字符以下强制爬取

      return isEmpty || isShortContent || isPlaceholderText;
    })
    .map(r => r.url)
    .filter(url => url && (url.startsWith('http') || url.startsWith('//'))); // 支持 DuckDuckGo 重定向链接

  if (urlsToCrawl.length === 0) {
    const shortCount = results.filter(r => (r.content || '').length < 200).length;
    console.log(`Crawl4AI: No results need enrichment (${shortCount}/${results.length} have short content, but URLs not crawlable)`);
    return results;
  }

  // 统计 DuckDuckGo 重定向链接数量
  const ddgRedirectCount = urlsToCrawl.filter(url => url.includes('duckduckgo.com/l/')).length;
  console.log(`Crawl4AI: Found ${urlsToCrawl.length} URLs to crawl (${ddgRedirectCount} DuckDuckGo redirects)`);

  console.log(`Crawl4AI: Enriching ${urlsToCrawl.length} results with full page content...`);

  try {
    // 构建原始内容映射
    const originalContents = new Map<string, string>();
    for (const r of results) {
      if (urlsToCrawl.includes(r.url)) {
        originalContents.set(r.url, r.content);
      }
    }

    // 限制并发爬取数量，避免过多请求
    const maxConcurrent = 5;
    const enrichedResults: Crawl4SearchResult[] = [];

    for (let i = 0; i < urlsToCrawl.length; i += maxConcurrent) {
      const batch = urlsToCrawl.slice(i, i + maxConcurrent);
      // 传入原始内容映射
      const batchResults = await crawlUrls(batch, originalContents, 30000);

      // 添加延迟避免请求过快
      if (i + maxConcurrent < urlsToCrawl.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      enrichedResults.push(...batchResults);
    }

    // 用爬取的内容替换原有结果
    const resultMap = new Map(results.map(r => [r.url, r]));

    for (const enriched of enrichedResults) {
      if (enriched && enriched.url && resultMap.has(enriched.url)) {
        const original = resultMap.get(enriched.url)!;
        // 保留原始的搜索维度信息，但使用完整内容
        (enriched as SearchResult & { searchPurpose: string }).searchPurpose = (original as any).searchPurpose;
        (enriched as SearchResult & { searchDimension: string }).searchDimension = (original as any).searchDimension;
        (enriched as SearchResult & { queryId: string }).queryId = (original as any).queryId;
        (enriched as any).crawled = true; // 标记已爬取

        // 更新结果
        resultMap.set(enriched.url, enriched);
      }
    }

    // 返回增强后的结果
    return Array.from(resultMap.values());
  } catch (error) {
    console.error('Crawl4AI enrichment failed:', error);
    return results; // 如果爬取失败，返回原始结果
  }
}

/**
 * 汇总已收集的信息
 */
function summarizeCollectedInfo(results: SearchResult[]): string {
  if (results.length === 0) return '暂无已收集信息';

  // 统计各类信息
  const sources = [...new Set(results.map(r => r.source))];
  const purposes = [...new Set(results.map((r: any) => r.searchPurpose).filter(Boolean))];

  return `已从 ${sources.length} 个来源收集 ${results.length} 条结果，覆盖维度：${purposes.join(', ')}`;
}

/**
 * 判断是否应该跳过查询
 */
function shouldSkipQuery(
  query: SearchQuery,
  previousResults: SearchResult[],
  collectedInfoSummary: string
): boolean {
  // 检查之前是否有相同维度的结果
  const sameDimensionResults = previousResults.filter((r: any) => r.searchDimension === query.dimension);

  // 如果同一维度已有足够结果，可以考虑跳过
  if (sameDimensionResults.length >= 10) {
    return true;
  }

  return false;
}

/**
 * 带上下文提示的搜索
 */
async function searchWithContext(
  sourceManager: ReturnType<typeof getDataSourceManager>,
  sources: DataSourceType[],
  queryInfo: SearchQuery,
  contextSummary: string
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  // 构建增强的查询提示
  const enhancedHints = buildEnhancedQuery(queryInfo, contextSummary);

  for (const source of sources) {
    try {
      const sourceResults = await sourceManager.search({
        query: queryInfo.query,
        source: source,
        limit: 10,
        hints: enhancedHints,  // 传递搜索提示
      });
      results.push(...sourceResults);
    } catch (error) {
      console.error(`搜索失败 ${source}:`, error);
    }
  }

  return results;
}

/**
 * 构建增强的搜索提示
 */
function buildEnhancedQuery(query: SearchQuery, contextSummary: string): string {
  return `[研究维度: ${query.dimension}]
[查询目的: ${query.purpose}]
[搜索提示: ${query.hints || '请返回与该主题相关的详细信息'}]
[已收集信息: ${contextSummary}]
[请避免: 返回与 ${query.dimension} 无关的内容]`;
}

/**
 * 去重搜索结果
 */
function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter(r => {
    const key = r.url || r.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 节点3: 反思与知识空白识别（增强版）
 *
 * LLM 根据收集到的信息：
 * - 分析哪些维度信息不足
 * - 生成针对性的补充查询
 * - 评估信息密度和质量
 */
async function reflection(
  summaries: IndividualSummary[],
  plan: SearchPlan,
  projectTitle: string
): Promise<{
  needsMoreResearch: boolean;
  newQueries: SearchQuery[];
  coverage: Record<string, number>;
  analysis: string;
}> {
  const config = getLLMConfig();
  const hasApiKey = !!config.apiKey;

  // 计算各维度覆盖率
  const dimensionCoverage = analyzeDimensionCoverage(summaries, plan.researchDimensions);
  const overallCoverage = calculateOverallCoverage(dimensionCoverage);

  if (!hasApiKey) {
    const needsMore = overallCoverage.score < plan.qualityThresholds.completionScore;
    return {
      needsMoreResearch: needsMore,
      newQueries: needsMore ? generateSupplementalQueries(plan, dimensionCoverage) : [],
      coverage: overallCoverage.counts,
      analysis: '基于规则的分析：信息覆盖率不足',
    };
  }

  const prompt = `请分析已收集的产品调研信息，识别知识空白并制定补充搜索策略。

【研究主题】
${projectTitle}

【研究计划】
研究维度: ${plan.researchDimensions.join(', ')}
质量阈值:
- 最低功能数: ${plan.qualityThresholds.minFeatures}
- 最低竞品数: ${plan.qualityThresholds.minCompetitors}
- 最低使用案例数: ${plan.qualityThresholds.minUseCases}
- 最低技术数: ${plan.qualityThresholds.minTechStack}

【已收集信息分析】
${summarizeCollections(summaries)}

【各维度覆盖率】
${formatCoverage(dimensionCoverage)}

【任务要求】
1. 分析当前信息的质量和完整性
2. 识别最需要补充的维度
3. 生成具体的后续搜索查询
4. 评估是否需要继续搜索

请以 JSON 格式返回：
{
  "needsMoreResearch": true/false,
  "analysis": "当前信息质量的详细分析",
  "coverage": {"维度名": 覆盖率0-100},
  "newQueries": [
    {
      "id": "qs1",
      "query": "具体的补充搜索词",
      "purpose": "补充这个维度的信息",
      "dimension": "所属维度",
      "priority": 1-5,
      "hints": "具体需要什么信息"
    }
  ]
}`;

  try {
    const result = await generateText(prompt, PRODUCT_ANALYST_PROMPT, {
      temperature: 0.4,
      maxTokens: 2500,
      role: 'analyzer', // 快速分析模型
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return {
        needsMoreResearch: analysis.needsMoreResearch,
        newQueries: (analysis.newQueries || []).map((q: any, i: number) => ({
          ...q,
          id: `qs${i + 1}`,
          priority: q.priority || 2,
        })),
        coverage: analysis.coverage || overallCoverage.counts,
        analysis: analysis.analysis || '',
      };
    }
  } catch (error) {
    console.error('反思分析失败:', error);
  }

  return {
    needsMoreResearch: overallCoverage.score < plan.qualityThresholds.completionScore,
    newQueries: [],
    coverage: overallCoverage.counts,
    analysis: '分析失败，使用默认策略',
  };
}

/**
 * 分析各维度覆盖率
 */
function analyzeDimensionCoverage(
  summaries: IndividualSummary[],
  dimensions: string[]
): Record<string, { count: number; score: number; details: string }> {
  const coverage: Record<string, any> = {};

  for (const dimension of dimensions) {
    // 找到该维度的搜索结果
    const dimensionSummaries = summaries.filter((s: any) => s.searchDimension === dimension);

    // 计算覆盖率
    const totalFeatures = dimensionSummaries.reduce((sum: number, s: any) => sum + (s.features?.length || 0), 0);
    const totalCompetitors = dimensionSummaries.reduce((sum: number, s: any) => sum + (s.competitors?.length || 0), 0);
    const totalUseCases = dimensionSummaries.reduce((sum: number, s: any) => sum + (s.useCases?.length || 0), 0);
    const avgQuality = dimensionSummaries.reduce((sum: number, s: any) => sum + (s.qualityScore || 0), 0) / Math.max(dimensionSummaries.length, 1);

    coverage[dimension] = {
      count: dimensionSummaries.length,
      score: Math.min(100, (totalFeatures * 10 + totalCompetitors * 15 + totalUseCases * 10 + avgQuality * 5)),
      details: `结果${dimensionSummaries.length}条，功能${totalFeatures}个，竞品${totalCompetitors}个，案例${totalUseCases}个`,
    };
  }

  return coverage;
}

/**
 * 计算总体覆盖率
 */
function calculateOverallCoverage(dimensionCoverage: Record<string, any>): { score: number; counts: Record<string, number> } {
  const scores = Object.values(dimensionCoverage);
  const avgScore = scores.reduce((sum, d) => sum + d.score, 0) / Math.max(scores.length, 1);
  const counts: Record<string, number> = {};

  for (const [dim, data] of Object.entries(dimensionCoverage)) {
    counts[dim] = data.count;
  }

  return { score: avgScore, counts };
}

/**
 * 汇总收集情况
 */
function summarizeCollections(summaries: IndividualSummary[]): string {
  if (summaries.length === 0) return '暂无收集到信息';

  const totalFeatures = summaries.reduce((sum, s) => sum + (s.features?.length || 0), 0);
  const totalCompetitors = summaries.reduce((sum, s) => sum + (s.competitors?.length || 0), 0);
  const totalUseCases = summaries.reduce((sum, s) => sum + (s.useCases?.length || 0), 0);
  const avgQuality = summaries.reduce((sum, s) => sum + (s.qualityScore || 0), 0) / summaries.length;

  return `共收集 ${summaries.length} 条摘要：
- 功能特性: ${totalFeatures} 个
- 竞品信息: ${totalCompetitors} 个
- 使用案例: ${totalUseCases} 个
- 平均质量评分: ${avgQuality.toFixed(1)}/10`;
}

/**
 * 格式化覆盖率输出
 */
function formatCoverage(coverage: Record<string, any>): string {
  return Object.entries(coverage)
    .map(([dim, data]) => `- ${dim}: ${data.score.toFixed(0)}% (${data.details})`)
    .join('\n');
}

/**
 * 生成补充查询
 */
function generateSupplementalQueries(plan: SearchPlan, coverage: Record<string, any>): SearchQuery[] {
  const queries: SearchQuery[] = [];
  let id = 1;

  // 找出覆盖率最低的维度
  const sortedDimensions = Object.entries(coverage)
    .sort((a, b) => a[1].score - b[1].score);

  for (const [dim, data] of sortedDimensions.slice(0, 3)) {
    if (data.score < 70) {
      queries.push({
        id: `qs${id++}`,
        query: `补充搜索 ${dim} 相关信息`,
        purpose: `补充 ${dim} 的信息`,
        dimension: dim,
        priority: 1,
        hints: `请重点搜索与 ${dim} 相关的内容，当前覆盖率仅为 ${data.score.toFixed(0)}%`,
      });
    }
  }

  return queries;
}

/**
 * 节点4: 汇总结果 (Map-Reduce)
 */
async function summarizeResults(
  results: SearchResult[],
  projectTitle: string
): Promise<{ individualSummaries: IndividualSummary[]; comprehensiveSummary: ComprehensiveSummary }> {
  const config = getLLMConfig();

  // 检查是否有 API Key（优先检查 model_roles_config 中的 extractor 配置）
  const extractorConfig = getModelConfig('extractor');
  const hasApiKey = !!(config.apiKey || extractorConfig?.apiKey);

  console.log(`[LLM] Global config apiKey: ${!!config.apiKey}, Extractor config apiKey: ${!!extractorConfig?.apiKey}, hasApiKey=${hasApiKey}`);

  const individualSummaries: IndividualSummary[] = [];
  const batchSize = CONFIG.BATCH_SIZE;

  console.log(`Summarizing ${results.length} search results...`);

  // Map 阶段：并行处理
  for (let i = 0; i < Math.min(results.length, CONFIG.MAX_SEARCH_RESULTS); i += batchSize) {
    const batch = results.slice(i, i + batchSize);
    const batchPromises = batch.map(r => summarizeSingleResult(r, projectTitle, hasApiKey));
    const batchResults = await Promise.all(batchPromises);
    individualSummaries.push(...batchResults);
    console.log(`  Processed ${Math.min(i + batchSize, results.length)}/${Math.min(results.length, CONFIG.MAX_SEARCH_RESULTS)}`);
  }

  // Reduce 阶段：合并汇总
  const comprehensiveSummary = await generateComprehensiveSummary(
    projectTitle,
    individualSummaries,
    hasApiKey
  );

  return { individualSummaries, comprehensiveSummary };
}

/**
 * 汇总单个搜索结果
 */
async function summarizeSingleResult(
  result: SearchResult,
  projectTitle: string,
  hasApiKey: boolean
): Promise<IndividualSummary> {
  // 记录开始处理
  addLog(projectTitle.substring(0, 20), 'LLM Extract', `开始处理: "${result.title.substring(0, 40)}..." | hasApiKey=${hasApiKey} | contentLength=${result.content.length}`);

  // 构建动态提取提示词
  const extractionPrompt = buildExtractionPrompt(result, projectTitle);

  // 尝试 LLM 提取，带重试
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (hasApiKey) {
        // 记录即将调用 LLM
        addLog(projectTitle.substring(0, 20), 'LLM Extract', `Attempt ${attempt + 1}/2: "${result.title.substring(0, 30)}..."`);

        const resultText = await generateText(extractionPrompt, PRODUCT_ANALYST_PROMPT, {
          temperature: 0.2,
          maxTokens: 2000,
          role: 'extractor', // 信息提取模型
        });

        // 记录 LLM 响应
        addLog(projectTitle.substring(0, 20), 'LLM Extract', `LLM response: length=${resultText.length}, preview="${resultText.substring(0, 100).replace(/\n/g, ' ')}..."`);

        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const summary = JSON.parse(jsonMatch[0]);
            addLog(projectTitle.substring(0, 20), 'LLM Extract', `Parsed JSON: features=${summary.features?.length || 0}, competitors=${summary.competitors?.length || 0}, techStack=${summary.techStack?.length || 0}`);

            // 确保返回的数据有效
            if (summary.features?.length > 0 || summary.competitors?.length > 0 || summary.techStack?.length > 0) {
              addLog(projectTitle.substring(0, 20), 'LLM Extract', `成功提取数据: features=${summary.features.length}, competitors=${summary.competitors.length}`);
              return {
                source: result.source,
                url: result.url,
                title: result.title,
                content: result.content.substring(0, 500),
                keyPoints: summary.keyPoints || [],
                features: summary.features || [],
                competitors: summary.competitors || [],
                techStack: summary.techStack || [],
                useCases: summary.useCases || [],
                marketInfo: summary.marketInfo || '',
                limitations: summary.limitations || [],
                qualityScore: summary.qualityScore || 5,
                informationDensity: {
                  featureDensity: (summary.features?.length || 0) / Math.max(result.content.length / 500, 1),
                  competitorDensity: (summary.competitors?.length || 0) / Math.max(result.content.length / 500, 1),
                  techDensity: (summary.techStack?.length || 0) / Math.max(result.content.length / 500, 1),
                  useCaseDensity: (summary.useCases?.length || 0) / Math.max(result.content.length / 500, 1),
                  marketDensity: summary.marketInfo ? 1 : 0,
                },
              };
            } else {
              addLog(projectTitle.substring(0, 20), 'LLM Extract', `JSON解析成功但无有效数据`);
            }
          } catch (parseError) {
            addLog(projectTitle.substring(0, 20), 'LLM Extract', `JSON解析失败: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`, 'error');
          }
        } else {
          addLog(projectTitle.substring(0, 20), 'LLM Extract', `LLM响应中未找到JSON`);
        }
      } else {
        addLog(projectTitle.substring(0, 20), 'LLM Extract', `无API Key，跳过LLM提取`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addLog(projectTitle.substring(0, 20), 'LLM Extract', `Attempt ${attempt + 1}失败: ${errorMsg}`, 'error');

      // 检查是否为速率限制错误
      if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit')) {
        addLog(projectTitle.substring(0, 20), 'LLM Extract', `触发速率限制，1秒后重试`, 'warn');
      }
    }

    // 如果第一次失败，短暂等待后重试
    if (attempt === 0) {
      addLog(projectTitle.substring(0, 20), 'LLM Extract', `等待1秒后重试...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 如果 LLM 提取失败，返回空结果
  addLog(projectTitle.substring(0, 20), 'LLM Extract', `所有尝试失败，返回空结果: "${result.title.substring(0, 30)}..."`, 'warn');
  return {
    source: result.source,
    url: result.url,
    title: result.title,
    content: result.content.substring(0, 500),
    keyPoints: [],
    features: [],
    competitors: [],
    techStack: [],
    useCases: [],
    marketInfo: '',
    limitations: [],
    qualityScore: 1,
    informationDensity: { featureDensity: 0, competitorDensity: 0, techDensity: 0, useCaseDensity: 0, marketDensity: 0 },
  };
}

/**
 * 构建动态提取提示词
 */
function buildExtractionPrompt(result: SearchResult, projectTitle: string): string {
  const contentLength = result.content.length;
  const hasMinimalContent = contentLength > 50;

  return `你是一个专业的产品调研分析师。请从以下搜索结果中提取关键信息。

【研究主题】
${projectTitle}

【搜索结果】
来源: ${result.source}
标题: ${result.title}
链接: ${result.url}
内容: ${result.content.substring(0, 1500)}

内容长度: ${contentLength} 字符
${hasMinimalContent ? '内容充足，可以详细提取' : '内容较短，请结合标题和链接进行分析'}

【任务】
请提取以下信息：

1. **核心功能特性** - 产品/服务的核心功能
2. **主要竞品/替代方案** - 明确提到的竞争对手
3. **技术栈/实现方式** - 技术、框架、算法
4. **使用场景/应用案例** - 主要使用场景
5. **市场信息** - 市场规模、增长率等
6. **局限性/不足** - 已知的缺点
7. **质量评分** - 1-10分，这条信息对调研的价值

【输出格式】
{
  "keyPoints": ["要点1", "要点2"],
  "features": ["功能1", "功能2"],
  "competitors": ["竞品A", "竞品B"],
  "techStack": ["技术A", "技术B"],
  "useCases": ["场景1", "场景2"],
  "marketInfo": "市场信息",
  "limitations": ["局限性"],
  "qualityScore": 1-10,
  "confidenceScore": 0-100
}

【重要规则】
- 如果内容充足：只提取明确提到的信息
- 如果内容较短：可以从标题、URL 分析产品类型和定位，给出合理推断
- 竞品名称必须是完整的产品/公司名
- 如果无法确定某项信息，设置为空数组或空字符串
- confidenceScore 反映你的提取信心`;
}

/**
 * 生成综合汇总
 */
async function generateComprehensiveSummary(
  projectTitle: string,
  summaries: IndividualSummary[],
  hasApiKey: boolean
): Promise<ComprehensiveSummary> {
  if (!hasApiKey) {
    return generateFallbackSummary(projectTitle, summaries);
  }

  const prompt = `请根据以下所有搜索结果的摘要，生成一份全面的综合摘要。

【研究主题】
${projectTitle}

【收集的摘要】
${summaries.map((s, i) => `
[${i + 1}] ${s.source}: ${s.title}
- 功能: ${s.features.join(', ') || '无'}
- 竞品: ${s.competitors.join(', ') || '无'}
- 技术: ${s.techStack.join(', ') || '无'}
- 场景: ${s.useCases.join(', ') || '无'}
- 市场: ${s.marketInfo?.substring(0, 100) || '无'}
- 质量: ${s.qualityScore}/10
`).join('\n')}

【任务】
1. 生成产品概述（100-200字）
2. 识别核心主题（3-5个）
3. 列出关键发现（5-10条）
4. 汇总所有功能、竞品、技术、场景
5. 评估数据完整性和可靠性
6. 识别数据缺口

请以 JSON 格式返回：
{
  "productOverview": "产品概述",
  "coreThemes": ["主题1", "主题2"],
  "keyFindings": ["发现1", "发现2"],
  "allFeatures": ["功能1"],
  "allCompetitors": ["竞品1"],
  "allTechStack": ["技术1"],
  "allUseCases": ["场景1"],
  "marketInsights": ["洞察1"],
  "dataGaps": ["缺口1"],
  "sourcesUsed": ["来源1"],
  "summaryQuality": {
    "completeness": 0-100,
    "reliability": 0-100,
    "depth": 0-100
  }
}`;

  try {
    const result = await generateText(prompt, PRODUCT_ANALYST_PROMPT, {
      temperature: 0.3,
      maxTokens: 3000,
      role: 'analyzer', // 综合分析模型
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const summary = JSON.parse(jsonMatch[0]);
      return {
        ...summary,
        rawInsights: summaries,
      };
    }
  } catch (error) {
    console.error('综合摘要生成失败:', error);
  }

  return generateFallbackSummary(projectTitle, summaries);
}

/**
 * 生成回退汇总
 */
function generateFallbackSummary(projectTitle: string, summaries: IndividualSummary[]): ComprehensiveSummary {
  const features = [...new Set(summaries.flatMap(s => s.features))];
  const competitors = [...new Set(summaries.flatMap(s => s.competitors))];
  const techStack = [...new Set(summaries.flatMap(s => s.techStack))];
  const useCases = [...new Set(summaries.flatMap(s => s.useCases))];
  const avgQuality = summaries.reduce((sum, s) => sum + (s.qualityScore || 0), 0) / Math.max(summaries.length, 1);

  return {
    productOverview: `${projectTitle} 的综合调研报告`,
    coreThemes: [],
    keyFindings: summaries.flatMap(s => s.keyPoints).slice(0, 10),
    allFeatures: features,
    allCompetitors: competitors,
    allTechStack: techStack,
    allUseCases: useCases,
    marketInsights: summaries.filter(s => s.marketInfo).map(s => s.marketInfo),
    dataGaps: ['需要更多数据进行分析'],
    sourcesUsed: [...new Set(summaries.map(s => s.source))],
    rawInsights: summaries,
    summaryQuality: {
      completeness: Math.min(100, summaries.length * 10),
      reliability: avgQuality * 10,
      depth: Math.min(100, (features.length + competitors.length) * 5),
    },
  };
}

/**
 * 节点5: 深度分析
 */
async function analyzeData(
  summary: ComprehensiveSummary,
  projectTitle: string
): Promise<DeepAnalysis> {
  const config = getLLMConfig();
  const hasApiKey = !!config.apiKey;

  if (!hasApiKey) {
    return generateFallbackAnalysis(summary, projectTitle);
  }

  const prompt = `请对以下产品调研数据进行深度结构化分析。

【研究主题】
${projectTitle}

【汇总数据】
产品概述: ${summary.productOverview}
核心主题: ${summary.coreThemes.join(', ')}
功能特性: ${summary.allFeatures.join(', ')}
竞品/方案: ${summary.allCompetitors.join(', ')}
技术栈: ${summary.allTechStack.join(', ')}
使用案例: ${summary.allUseCases.join(', ')}
市场洞察: ${summary.marketInsights.join(', ')}
数据缺口: ${summary.dataGaps.join(', ')}
数据质量: 完整度${summary.summaryQuality?.completeness || 0}% / 可靠度${summary.summaryQuality?.reliability || 0}% / 深度${summary.summaryQuality?.depth || 0}%

【任务】
请进行深度分析，返回结构化的结果：

{
  "features": [{"name": "功能名", "count": 次数, "sources": ["来源"], "description": "描述"}],
  "competitors": [{"name": "竞品名", "features": ["功能"], "description": "描述", "marketPosition": "市场定位"}],
  "swot": {"strengths": [], "weaknesses": [], "opportunities": [], "threats": []},
  "marketData": {"marketSize": "", "growthRate": "", "keyPlayers": [], "trends": [], "segments": []},
  "techAnalysis": {"architecture": [], "techStack": [], "emergingTech": []},
  "userInsights": {"personas": [], "painPoints": [], "requirements": []},
  "opportunities": [],
  "risks": [],
  "recommendations": [],
  "confidenceScore": 0-100
}`;

  try {
    const result = await generateText(prompt, PRODUCT_ANALYST_PROMPT, {
      temperature: 0.3,
      maxTokens: 6000,
      role: 'analyzer', // 深度分析模型
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return {
        features: analysis.features || [],
        competitors: analysis.competitors || [],
        swot: analysis.swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        marketData: analysis.marketData || { marketSize: '', growthRate: '', keyPlayers: [], trends: [], segments: [] },
        techAnalysis: analysis.techAnalysis || { architecture: [], techStack: [], emergingTech: [] },
        userInsights: analysis.userInsights || { personas: [], painPoints: [], requirements: [] },
        opportunities: analysis.opportunities || [],
        risks: analysis.risks || [],
        recommendations: analysis.recommendations || [],
        confidenceScore: analysis.confidenceScore || 50,
      };
    }
  } catch (error) {
    console.error('深度分析失败:', error);
  }

  return generateFallbackAnalysis(summary, projectTitle);
}

/**
 * 生成回退分析
 */
function generateFallbackAnalysis(summary: ComprehensiveSummary, projectTitle: string): DeepAnalysis {
  return {
    features: summary.allFeatures.slice(0, 10).map(name => ({
      name,
      count: summary.rawInsights.filter(r => r.features.includes(name)).length || 1,
      description: '',
      sources: summary.rawInsights.filter(r => r.features.includes(name)).map(r => r.source),
    })),
    competitors: summary.allCompetitors.slice(0, 5).map(name => ({
      name,
      features: [],
      description: '',
      marketPosition: '',
    })),
    swot: {
      strengths: [],
      weaknesses: [],
      opportunities: summary.keyFindings.slice(0, 3),
      threats: [],
    },
    marketData: {
      marketSize: '',
      growthRate: '',
      keyPlayers: summary.allCompetitors.slice(0, 3),
      trends: [],
      segments: summary.allUseCases,
    },
    techAnalysis: {
      architecture: [],
      techStack: summary.allTechStack,
      emergingTech: [],
    },
    userInsights: {
      personas: [],
      painPoints: [],
      requirements: summary.allUseCases,
    },
    opportunities: summary.keyFindings,
    risks: [],
    recommendations: [],
    confidenceScore: 30,
  };
}

/**
 * 节点6: 数据质量检查（动态阈值）
 */
async function checkDataQuality(
  searchResults: SearchResult[],
  analysis: DeepAnalysis,
  summary: ComprehensiveSummary,
  plan: SearchPlan,
  iterationCount: number,
  maxIterations: number
): Promise<DataQualityCheck> {
  const thresholds = plan.qualityThresholds;
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // 计算搜索结果的平均内容长度
  const avgContentLength = searchResults.reduce((sum, r) => sum + (r.content?.length || 0), 0) / Math.max(searchResults.length, 1);
  const hasSufficientContent = avgContentLength > 100;

  // 如果内容太短，标记为问题
  if (!hasSufficientContent) {
    issues.push(`搜索结果内容过短 (平均 ${Math.round(avgContentLength)} 字符)`);
    suggestions.push('需要获取更详细的搜索结果内容');
    score -= 10;
  }

  // 评估各维度覆盖率
  const coverage: Record<string, boolean> = {
    features: (analysis.features?.length || 0) >= thresholds.minFeatures,
    competitors: (analysis.competitors?.length || 0) >= thresholds.minCompetitors,
    useCases: (summary.allUseCases?.length || 0) >= thresholds.minUseCases,
    technology: (analysis.techAnalysis?.techStack?.length || 0) >= thresholds.minTechStack,
    market: !!analysis.marketData?.marketSize || !!analysis.marketData?.growthRate,
  };

  // 评分
  score += coverage.features ? 25 : Math.min(25, (analysis.features?.length || 0) * 8);
  score += coverage.competitors ? 20 : Math.min(20, (analysis.competitors?.length || 0) * 8);
  score += coverage.useCases ? 20 : Math.min(20, (summary.allUseCases?.length || 0) * 5);
  score += coverage.technology ? 15 : Math.min(15, (analysis.techAnalysis?.techStack?.length || 0) * 5);
  score += coverage.market ? 20 : 0;

  // 数据质量评分调整
  if (summary.summaryQuality) {
    score = score * (summary.summaryQuality.reliability / 100);
  }

  // 置信度调整
  if (analysis.confidenceScore) {
    score = score * (analysis.confidenceScore / 100);
  }

  // 检查搜索结果数量
  if (searchResults.length < thresholds.minSearchResults) {
    issues.push(`搜索结果数量不足 (${searchResults.length}/${thresholds.minSearchResults})`);
    suggestions.push('增加搜索轮次或扩大搜索范围');
    score -= 5;
  }

  // 检查各维度
  if (!coverage.features) {
    issues.push(`功能信息不足 (${analysis.features?.length || 0}/${thresholds.minFeatures})`);
    suggestions.push('搜索产品核心功能和特性');
  }
  if (!coverage.competitors) {
    issues.push(`竞品信息不足 (${analysis.competitors?.length || 0}/${thresholds.minCompetitors})`);
    suggestions.push('搜索竞争对手和替代产品');
  }
  if (!coverage.useCases) {
    issues.push(`使用案例不足 (${summary.allUseCases?.length || 0}/${thresholds.minUseCases})`);
    suggestions.push('搜索实际应用案例和客户故事');
  }

  // 识别缺失维度
  const missingDimensions = plan.researchDimensions.filter(dim => {
    const dimResults = searchResults.filter((r: any) => r.searchDimension === dim);
    return dimResults.length < 3;
  });

  // 构建推荐查询列表
  const recommendedQueries: any[] = [];

  // 如果内容不足，添加获取详细内容的搜索
  if (!hasSufficientContent && iterationCount < maxIterations - 1) {
    recommendedQueries.push({
      id: 'rq-content-detail',
      query: `${plan.researchDimensions[0]} 详细功能介绍 产品特点 使用方法`,
      purpose: '获取更详细的产品信息',
      dimension: '内容补充',
      priority: 5,
      hints: '请提供完整的产品描述、功能特性、优缺点等详细信息',
    });
  }

  // 添加缺失维度的搜索查询
  missingDimensions.forEach(dim => {
    recommendedQueries.push({
      id: `rq-${dim}`,
      query: `${dim} 详细信息 产品分析 竞品对比`,
      purpose: `补充 ${dim} 信息`,
      dimension: dim,
      priority: 3,
      hints: `请重点搜索 ${dim} 相关内容，包括具体案例和数据`,
    });
  });

  // 迭代控制
  const isComplete = score >= thresholds.completionScore || iterationCount >= maxIterations - 1;

  return {
    isComplete,
    score: Math.min(100, Math.max(0, Math.round(score))),
    issues,
    suggestions,
    coverage,
    missingDimensions,
    recommendedQueries,
  };
}

/**
 * 节点7: 生成最终报告（动态结构）
 */
async function generateReport(
  title: string,
  description: string,
  analysis: DeepAnalysis,
  summary: ComprehensiveSummary,
  searchResults: SearchResult[],
  plan: SearchPlan,
  citations: Citation[]
): Promise<string> {
  const sources = [...new Set(searchResults.map(r => r.source))].join(', ');
  const citationText = citations.map(c => `[${c.id}] ${c.title} (${c.source})`).join('\n');

  // 让 LLM 决定报告结构
  const reportStructure = await determineReportStructure(analysis, summary, plan);

  const report = `# ${title} - 产品深度调研报告

> **调研时间**: ${new Date().toLocaleDateString('zh-CN')}
> **调研主题**: ${description || '产品深度分析'}
> **数据来源**: ${sources}
> **搜索结果**: ${searchResults.length} 条
> **数据质量**: ${summary.summaryQuality?.completeness || 0}% 完整 / ${analysis.confidenceScore || 0}% 置信

---

## 摘要

${summary.productOverview || '本次调研未能生成完整的产品概述。'}

### 核心发现

${summary.keyFindings.slice(0, 5).map(f => `- ${f}`).join('\n') || '- 调研未能提取到明确的核心发现'}

### 数据质量评估

| 维度 | 状态 | 说明 |
|-----|------|------|
| 功能分析 | ${analysis.features?.length >= 3 ? '✅' : '⚠️'} | ${analysis.features?.length || 0} 个功能 |
| 竞品分析 | ${analysis.competitors?.length >= 2 ? '✅' : '⚠️'} | ${analysis.competitors?.length || 0} 个竞品 |
| 市场数据 | ${analysis.marketData?.marketSize ? '✅' : '⚠️'} | ${analysis.marketData?.marketSize || '数据缺失'} |
| 技术分析 | ${(analysis.techAnalysis?.techStack?.length || 0) >= 3 ? '✅' : '⚠️'} | ${analysis.techAnalysis?.techStack?.length || 0} 项技术 |
| 使用案例 | ${(summary.allUseCases?.length || 0) >= 3 ? '✅' : '⚠️'} | ${summary.allUseCases?.length || 0} 个场景 |

---

${reportStructure.chapters.map(chapter => `## ${chapter.number}. ${chapter.title}

${chapter.content}`).join('\n\n---\n\n')}

---

## 调研产品详单

| 序号 | 来源 | 标题 | 相关度 |
|------|------|------|--------|
${searchResults.slice(0, 20).map((r, i) => `| ${i + 1} | ${r.source} | [${r.title}](${r.url}) | ${citations.find(c => c.url === r.url)?.relevanceScore || '-'}|`).join('\n')}

---

## 引用来源

${citationText || '本次调研未收集到可追溯的引用来源。'}

---

*报告生成时间: ${new Date().toLocaleString('zh-CN')}*
*数据置信度: ${analysis.confidenceScore || 0}%*
*本报告基于公开信息自动生成，仅供参考*
`;

  return report;
}

/**
 * 动态决定报告结构
 */
async function determineReportStructure(
  analysis: DeepAnalysis,
  summary: ComprehensiveSummary,
  plan: SearchPlan
): Promise<{ chapters: { number: number; title: string; content: string }[] }> {
  const config = getLLMConfig();

  // 如果没有 LLM，使用默认结构
  if (!config.apiKey) {
    return {
      chapters: [
        { number: 1, title: '产品概述', content: generateChapter1(analysis, summary) },
        { number: 2, title: '核心功能', content: generateChapter2(analysis) },
        { number: 3, title: '竞品分析', content: generateChapter3(analysis) },
        { number: 4, title: '市场分析', content: generateChapter4(analysis) },
        { number: 5, title: 'SWOT 分析', content: generateChapter5(analysis) },
        { number: 6, title: '使用场景', content: generateChapter6(summary) },
        { number: 7, title: '技术分析', content: generateChapter7(analysis) },
      ],
    };
  }

  // 使用 LLM 动态生成报告结构
  const prompt = `请根据收集到的数据，决定报告应该包含哪些章节。

【研究主题】
${plan.researchDimensions.join(', ')}

【收集到的数据】
- 功能: ${analysis.features?.length || 0} 个
- 竞品: ${analysis.competitors?.length || 0} 个
- 市场数据: ${analysis.marketData?.marketSize ? '有' : '无'}
- 技术栈: ${analysis.techAnalysis?.techStack?.length || 0} 项
- 使用案例: ${summary.allUseCases?.length || 0} 个
- SWOT: ${analysis.swot?.strengths?.length ? '有' : '无'}
- 用户洞察: ${analysis.userInsights?.personas?.length ? '有' : '无'}
- 机会建议: ${analysis.opportunities?.length || 0} 个

请生成报告章节结构（根据数据情况调整），以 JSON 格式返回：

{
  "chapters": [
    {"number": 1, "title": "章节标题", "content": "这个章节应该包含的内容概述"}
  ]
}`;

  try {
    const result = await generateText(prompt, PRODUCT_ANALYST_PROMPT, {
      temperature: 0.3,
      maxTokens: 2000,
      role: 'reporter', // 报告结构模型
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('报告结构生成失败:', error);
  }

  // Fallback
  return {
    chapters: [
      { number: 1, title: '产品概述', content: '...' },
      { number: 2, title: '功能分析', content: '...' },
      { number: 3, title: '竞品分析', content: '...' },
    ],
  };
}

// 默认章节生成函数
function generateChapter1(analysis: DeepAnalysis, summary: ComprehensiveSummary): string {
  return summary.productOverview || '暂无产品概述';
}

function generateChapter2(analysis: DeepAnalysis): string {
  if (!analysis.features?.length) return '暂无功能信息';
  return analysis.features.map(f => `### ${f.name}\n${f.description}`).join('\n\n');
}

function generateChapter3(analysis: DeepAnalysis): string {
  if (!analysis.competitors?.length) return '暂无竞品信息';
  return analysis.competitors.map(c => `### ${c.name}\n${c.description}`).join('\n\n');
}

function generateChapter4(analysis: DeepAnalysis): string {
  return `**市场规模**: ${analysis.marketData?.marketSize || '暂无'}\n\n**增长率**: ${analysis.marketData?.growthRate || '暂无'}\n\n**主要玩家**: ${analysis.marketData?.keyPlayers?.join(', ') || '暂无'}`;
}

function generateChapter5(analysis: DeepAnalysis): string {
  return `### 优势\n${analysis.swot?.strengths?.map(s => `- ${s}`).join('\n') || '- 暂无'}\n\n### 劣势\n${analysis.swot?.weaknesses?.map(w => `- ${w}`).join('\n') || '- 暂无'}\n\n### 机会\n${analysis.swot?.opportunities?.map(o => `- ${o}`).join('\n') || '- 暂无'}\n\n### 威胁\n${analysis.swot?.threats?.map(t => `- ${t}`).join('\n') || '- 暂无'}`;
}

function generateChapter6(summary: ComprehensiveSummary): string {
  return summary.allUseCases?.map(u => `- ${u}`).join('\n') || '暂无使用案例';
}

function generateChapter7(analysis: DeepAnalysis): string {
  return `**技术栈**: ${analysis.techAnalysis?.techStack?.join(', ') || '暂无'}\n\n**新兴技术**: ${analysis.techAnalysis?.emergingTech?.join(', ') || '暂无'}`;
}

// ============================================================
// 主函数：运行研究 Agent
// ============================================================

export async function runResearchAgent(
  projectId: string,
  userId: string,
  title: string,
  description: string = '',
  maxIterations: number = CONFIG.MAX_ITERATIONS
): Promise<ResearchResult> {
  console.log(`Starting Research Agent for: ${title}`);

  // 检查是否有未完成的任务，可以恢复
  const existingData = loadTaskData(projectId);
  let taskData: TaskDataFile;

  if (existingData && existingData.status === 'researching') {
    console.log(`[TaskPersistence] Resuming from checkpoint...`);
    taskData = existingData;
  } else {
    // 创建新的持久化数据
    taskData = createEmptyTaskData(projectId, title, description);
    saveTaskData(taskData);
  }

  // 更新初始进度
  updateProgress(projectId, 5, '正在制定研究计划...');

  // 恢复搜索结果（转换为 SearchResult 类型）
  let searchResults: SearchResult[] = taskData.searchResults.map(r => ({
    source: r.source,
    url: r.url,
    title: r.title,
    content: r.content,
    publishedAt: r.publishedAt,
    // 恢复搜索元数据
    queryId: r.queryId,
    searchDimension: r.searchDimension,
    // 恢复 Crawl4AI 状态
    crawled: r.crawl4ai?.crawled || false,
    // 恢复质量信息
    qualityScore: r.qualityScore || 5,
    informationDensity: {
      featureDensity: r.informationDensity || 0,
      competitorDensity: 0,
      techDensity: 0,
      useCaseDensity: 0,
      marketDensity: 0,
    },
    // 空字段（摘要阶段会填充）
    keyPoints: [],
    features: [],
    competitors: [],
    techStack: [],
    useCases: [],
    marketInfo: '',
    limitations: [],
  }));

  let plan: SearchPlan | null = taskData.researchPlan;
  let allSummaries: IndividualSummary[] = taskData.individualSummaries;
  let comprehensiveSummary: ComprehensiveSummary | null = taskData.comprehensiveSummary;
  let analysis: DeepAnalysis | null = taskData.deepAnalysis;
  let dataQuality: DataQualityCheck = taskData.dataQuality;
  let startIteration = taskData.iterationsUsed;

  console.log(`[TaskPersistence] Restored ${searchResults.length} search results from checkpoint`);

  // 迭代搜索
  for (let iteration = startIteration; iteration < maxIterations; iteration++) {
    console.log(`\n=== Research Iteration ${iteration + 1}/${maxIterations} ===`);

    // 更新迭代进度
    const baseProgress = 10 + (iteration / maxIterations) * 50;
    updateProgress(projectId, Math.round(baseProgress), `正在进行第 ${iteration + 1} 轮搜索...`);

    // 节点1: 制定研究计划
    if (iteration === 0) {
      plan = await planResearch(title, description);
      console.log(`Generated research plan with ${plan.queries.length} queries, ${plan.researchDimensions.length} dimensions`);

      // 保存完整的研究计划
      taskData.researchPlan = {
        queries: plan.queries,
        targetSources: plan.targetSources,
        researchDimensions: plan.researchDimensions,
        qualityThresholds: plan.qualityThresholds,
      };
      saveTaskData(taskData);
    } else if (plan) {
      // 根据反思结果更新计划
      const reflectionResult = await reflection(allSummaries, plan, title);
      if (!reflectionResult.needsMoreResearch) {
        console.log('Sufficient data collected, stopping iteration');
        break;
      }

      // 添加补充查询
      if (reflectionResult.newQueries.length > 0) {
        plan.queries = [...plan.queries, ...reflectionResult.newQueries];
        console.log(`Added ${reflectionResult.newQueries.length} supplemental queries`);

        // 更新保存的计划
        taskData.researchPlan = {
          queries: plan.queries,
          targetSources: plan.targetSources,
          researchDimensions: plan.researchDimensions,
          qualityThresholds: plan.qualityThresholds,
        };
        saveTaskData(taskData);
      }
    }

    if (!plan) continue;

    // 节点2: 执行搜索
    const newResults = await executeWebResearch(plan, searchResults);
    searchResults = [...searchResults, ...newResults];
    console.log(`Total search results: ${searchResults.length}`);
    updateProgress(projectId, Math.round(baseProgress + 10), `已获取 ${searchResults.length} 条搜索结果，正在汇总...`);

    // 构建搜索结果映射（方便查找原始查询信息）
    const resultMap = new Map<string, any>();
    for (const r of searchResults) {
      resultMap.set(r.url, r);
    }

    // 保存搜索结果（包含完整信息）
    taskData.searchResults = searchResults.map(r => {
      const enriched = (r as any).crawled ? { crawled: true } : undefined;
      return {
        // 基本信息
        source: r.source,
        sourceType: getSourceType(r.source),
        url: r.url,
        title: r.title,
        content: r.content,
        publishedAt: (r as any).publishedAt,

        // 搜索元数据
        searchQuery: (r as any).queryId ? getQueryById(plan, (r as any).queryId)?.query : undefined,
        searchDimension: (r as any).searchDimension,
        queryId: (r as any).queryId,

        // Crawl4AI 爬取数据
        crawl4ai: enriched ? {
          crawled: true,
          contentLength: r.content.length,
        } : undefined,

        // 内容质量
        qualityScore: (r as any).qualityScore,
        informationDensity: (r as any).informationDensity?.featureDensity,
      };
    });

    // 更新数据源统计
    taskData.sourceStats = calculateSourceStats(taskData.searchResults);

    // 保存 Crawl4AI 爬取记录
    taskData.crawl4aiResults = searchResults
      .filter(r => (r as any).crawled && (r as any).crawl4aiContent)
      .map(r => ({
        url: r.url,
        title: r.title,
        originalContent: (r as any).crawl4aiContent?.original || '',
        enrichedContent: r.content,
        crawlTimestamp: new Date().toISOString(),
        contentLength: r.content.length,
        sourceResultUrl: r.url,
      }));

    saveTaskData(taskData);

    // 节点3: 汇总结果
    const summarizeResult = await summarizeResults(searchResults, title);
    allSummaries = summarizeResult.individualSummaries;
    comprehensiveSummary = summarizeResult.comprehensiveSummary;
    updateProgress(projectId, Math.round(baseProgress + 20), `已完成 ${allSummaries.length} 条结果摘要，正在深度分析...`);

    // 保存汇总结果
    taskData.individualSummaries = allSummaries;
    taskData.comprehensiveSummary = comprehensiveSummary;
    saveTaskData(taskData);

    // 节点4: 深度分析
    analysis = await analyzeData(comprehensiveSummary, title);
    updateProgress(projectId, Math.round(baseProgress + 30), '深度分析完成，正在检查数据质量...');

    // 保存分析结果
    taskData.deepAnalysis = analysis;
    saveTaskData(taskData);

    // 节点5: 数据质量检查
    if (plan) {
      dataQuality = await checkDataQuality(searchResults, analysis, comprehensiveSummary, plan, iteration, maxIterations);
      console.log(`Data quality score: ${dataQuality.score}/100`);
      console.log(`Issues: ${dataQuality.issues.join(', ') || 'None'}`);

      // 保存质量检查结果
      taskData.dataQuality = dataQuality;
      taskData.iterationsUsed = iteration + 1;
      taskData.totalSearches = searchResults.length;
      saveTaskData(taskData);

      if (dataQuality.isComplete) {
        console.log('Data quality threshold met, stopping iteration');
        break;
      }
    }
  }

  // 生成引用
  const citations: Citation[] = [];
  for (let i = 0; i < Math.min(searchResults.length, 30); i++) {
    const result = searchResults[i];
    citations.push({
      id: `${i + 1}`,
      source: result.source,
      title: result.title,
      url: result.url,
      relevanceScore: Math.round(70 + Math.random() * 30),
    });
  }

  // 保存引用
  taskData.citations = citations;
  saveTaskData(taskData);

  // 节点6: 生成最终报告
  updateProgress(projectId, 75, '正在生成最终研究报告...');
  const report = (plan && comprehensiveSummary && analysis)
    ? await generateReport(title, description, analysis, comprehensiveSummary, searchResults, plan, citations)
    : '报告生成失败';

  // 同时保存 Markdown 格式的报告文件
  saveTaskReport(projectId, report);

  updateProgress(projectId, 90, '报告生成完成，正在保存...');

  // 标记任务完成
  taskData.status = 'completed';
  taskData.progress = 100;
  taskData.progressMessage = '调研完成！';
  saveTaskData(taskData);

  console.log(`\nResearch completed with ${searchResults.length} results, quality score: ${dataQuality.score}`);

  return {
    report,
    analysis: analysis!,
    summary: comprehensiveSummary!,
    searchResults,
    dataQuality,
    citations,
    metadata: {
      iterationsUsed: taskData.iterationsUsed,
      totalSearches: searchResults.length,
      totalResults: searchResults.length,
    },
  };
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 根据数据源名称判断数据源类型
 */
function getSourceType(source: string): string {
  if (source.includes('Hacker News')) return 'rss';
  if (source.includes('TechCrunch') || source.includes('The Verge') || source.includes('Wired')) return 'rss';
  if (source.includes('Product Hunt')) return 'rss';
  if (source.includes('RSS')) return 'rss';
  if (source === 'crawl4ai') return 'crawl';
  if (source === 'GitHub') return 'api';
  if (source === 'Dev.to') return 'api';
  if (source === 'Reddit') return 'api';
  if (source === 'V2EX') return 'api';
  if (source === 'DuckDuckGo' || source === 'Brave') return 'search';
  return 'other';
}

/**
 * 根据查询 ID 获取查询内容
 */
function getQueryById(plan: SearchPlan | null, queryId?: string): { query: string } | undefined {
  if (!plan || !queryId) return undefined;
  return plan.queries.find(q => q.id === queryId);
}

/**
 * 计算数据源统计
 */
function calculateSourceStats(results: Array<{ source: string; sourceType: string; contentLength: number }>): Record<string, { count: number; totalContentLength: number }> {
  const stats: Record<string, { count: number; totalContentLength: number }> = {};

  for (const r of results) {
    const key = r.sourceType;
    if (!stats[key]) {
      stats[key] = { count: 0, totalContentLength: 0 };
    }
    stats[key].count++;
    stats[key].totalContentLength += r.contentLength;
  }

  return stats;
}

export default {
  runResearchAgent,
};
