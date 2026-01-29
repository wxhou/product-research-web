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
  minIterations: number;
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
  informationDensity?: {
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
  // 功能出现频率统计
  featureFrequency?: Record<string, number>;
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
  coverage: Record<string, number>;
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
    minIterations: 3,
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

// 缓存 model-roles 模块的导入，避免重复动态导入
let cachedModelRoles: any = null;
async function getModelRolesConfig() {
  if (!cachedModelRoles) {
    cachedModelRoles = await import('@/lib/model-roles');
  }
  return cachedModelRoles;
}

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
      targetSources: ['duckduckgo'],
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
  "targetSources": ["duckduckgo"]
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
        targetSources: plan.targetSources || ['duckduckgo'],
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
    targetSources: ['duckduckgo'],
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
  title: string,
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

  // GitHub 过滤器已禁用（数据源已移除）
  // 注释掉：const filteredResults = await filterGitHubNoiseWithLLM(enrichedResults, title);
  // return filteredResults.filter(r => !previousResults.some(pr => pr.url === r.url));

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
      // 使用更长的超时时间（60秒）处理批量爬取
      let batchResults: Crawl4SearchResult[] = [];
      try {
        batchResults = await crawlUrls(batch, originalContents, 60000);
      } catch (batchError) {
        console.error(`[Crawl4AI] Batch ${i}-${i + batch.length} failed, falling back to individual crawl:`, batchError);
        // 降级：逐个爬取
        for (const url of batch) {
          try {
            const singleResult = await crawlUrls([url], originalContents, 30000);
            if (singleResult.length > 0) {
              batchResults.push(...singleResult);
            }
          } catch (singleError) {
            console.error(`[Crawl4AI] Failed to crawl ${url}:`, singleError);
          }
          // 每个 URL 之间增加延迟
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 添加延迟避免请求过快
      if (i + maxConcurrent < urlsToCrawl.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      enrichedResults.push(...batchResults);
    }

    // 用爬取的内容替换原有结果
    // 注意：Crawl4AI 返回的是真实 URL，而原始结果是 DuckDuckGo 重定向链接
    const resultMap = new Map<string, SearchResult>();
    for (const r of results) {
      // 尝试使用原始 URL 作为 key
      resultMap.set(r.url, r);
    }

    // 构建 URL 反向映射（真实 URL -> 重定向 URL）
    const reverseUrlMap = new Map<string, string>();
    for (const r of results) {
      if (r.url.includes('duckduckgo.com/l/') && r.url.includes('uddg=')) {
        try {
          const urlObj = new URL(r.url.startsWith('http') ? r.url : 'https:' + r.url);
          const realUrl = urlObj.searchParams.get('uddg');
          if (realUrl) {
            reverseUrlMap.set(decodeURIComponent(realUrl), r.url);
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    for (const enriched of enrichedResults) {
      if (enriched && enriched.url) {
        // 优先使用真实 URL 匹配
        if (resultMap.has(enriched.url)) {
          const original = resultMap.get(enriched.url)!;
          // 保留原始的搜索维度信息，但使用完整内容
          (enriched as SearchResult & { searchPurpose: string }).searchPurpose = (original as any).searchPurpose;
          (enriched as SearchResult & { searchDimension: string }).searchDimension = (original as any).searchDimension;
          (enriched as SearchResult & { queryId: string }).queryId = (original as any).queryId;
          (enriched as any).crawled = true;

          // 更新结果
          resultMap.set(enriched.url, enriched);
        }
        // 尝试使用重定向 URL 匹配
        else if (reverseUrlMap.has(enriched.url)) {
          const original = resultMap.get(reverseUrlMap.get(enriched.url)!)!;
          // 保留原始的搜索维度信息，但使用完整内容
          (enriched as SearchResult & { searchPurpose: string }).searchPurpose = (original as any).searchPurpose;
          (enriched as SearchResult & { searchDimension: string }).searchDimension = (original as any).searchDimension;
          (enriched as SearchResult & { queryId: string }).queryId = (original as any).queryId;
          (enriched as any).crawled = true;

          // 使用真实 URL 作为 key
          resultMap.set(enriched.url, enriched);
        }
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
 * 使用 LLM 智能过滤 GitHub 噪音数据
 *
 * 对于 GitHub 搜索结果，LLM 判断仓库是否与研究主题相关
 * 如果不相关，标记为噪音，在后续处理中降低优先级或排除
 */
async function filterGitHubNoiseWithLLM(
  results: SearchResult[],
  projectTitle: string
): Promise<SearchResult[]> {
  // 只处理 GitHub 来源的结果
  const githubResults = results.filter(r =>
    r.source.toLowerCase().includes('github') ||
    r.url.toLowerCase().includes('github.com')
  );

  if (githubResults.length === 0) {
    return results; // 没有 GitHub 结果，直接返回
  }

  console.log(`[LLM Filter] Analyzing ${githubResults.length} GitHub results for relevance...`);

  const config = getLLMConfig();
  const modelRoles = await getModelRolesConfig();
  const hasApiKey = !!(config.apiKey || modelRoles.getModelConfig('extractor')?.apiKey);

  // 如果没有 API Key，使用简单的规则过滤
  if (!hasApiKey) {
    console.log(`[LLM Filter] No API key, using simple rule-based filter`);
    // 简单规则：排除包含特定噪音关键词的仓库
    const noisePatterns = [
      /books?/i,
      /tutorial/i,
      /example[sz]?/i,
      /sample[sz]?/i,
      /learn/i,
      /study/i,
      /course/i,
      /awesome-list/i,
      /x86.*bare.*metal/i,
    ];

    return results.filter(r => {
      const isGithub = r.source.toLowerCase().includes('github') || r.url.toLowerCase().includes('github.com');
      if (!isGithub) return true; // 非 GitHub 结果保留

      // 检查标题是否匹配噪音模式
      const title = r.title || '';
      const isNoise = noisePatterns.some(pattern => pattern.test(title));
      if (isNoise) {
        console.log(`[LLM Filter] Filtered noise: ${title.substring(0, 50)}...`);
        return false; // 排除噪音
      }
      return true; // 保留
    });
  }

  // 使用 LLM 判断相关性
  const repoList = githubResults.map((r, i) => {
    const url = r.url || '';
    const title = r.title || '';
    // 提取仓库路径
    const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
    const repoPath = match ? match[1] : title;
    return `${i + 1}. ${repoPath}`;
  }).join('\n');

  const prompt = `请判断以下 GitHub 仓库是否与"${projectTitle}"相关。

【任务】
逐个分析仓库，判断是否与研究主题相关。相关指：
- 仓库是关于轨道巡检/轨道交通/智能运维的产品、项目或代码
- 包含实际的巡检机器人、检测系统、监控系统等

不相关指：
- 只是提到轨道巡检的文档、书籍列表、教程
- 与轨道巡检完全无关的项目（x86 汇编示例、书籍列表等）

【GitHub 仓库列表】
${repoList}

【研究主题】
${projectTitle}

【输出格式】
请返回 JSON 数组，只包含相关仓库的序号：
[1, 3, 5]  // 表示第1、3、5个仓库相关

【注意】
- 严格判断，只标记明确相关的仓库
- 如果某个仓库与研究主题无关或无法确定， 不要包含其序号`;

  try {
    const response = await generateText(prompt, undefined, {
      role: 'extractor',
      temperature: 0.1,
      maxTokens: 500,
    });

    // 解析响应，提取相关仓库序号
    const jsonMatch = response.match(/\[[\s\S]*?\]/);
    let relevantIndices: number[] = [];

    if (jsonMatch) {
      try {
        relevantIndices = JSON.parse(jsonMatch[0]);
        console.log(`[LLM Filter] LLM identified ${relevantIndices.length} relevant GitHub repos`);
      } catch {
        // 解析失败，尝试其他方式
        const numbers = response.match(/\d+/g);
        if (numbers) {
          relevantIndices = numbers.map(Number).filter(n => n > 0 && n <= githubResults.length);
        }
      }
    }

    // 构建相关索引集合
    const relevantSet = new Set(relevantIndices.map(i => i - 1)); // 转为 0-based

    // 过滤结果
    const filteredResults = results.filter((r, index) => {
      const isGithub = r.source.toLowerCase().includes('github') || r.url.toLowerCase().includes('github.com');
      if (!isGithub) return true; // 非 GitHub 结果保留

      const githubIndex = githubResults.findIndex(gr => gr.url === r.url);
      if (githubIndex === -1) return true; // 找不到对应关系，保留

      const isRelevant = relevantSet.has(githubIndex);
      if (!isRelevant) {
        console.log(`[LLM Filter] Filtered irrelevant GitHub repo: ${r.title.substring(0, 50)}...`);
      }
      return isRelevant;
    });

    const removedCount = results.length - filteredResults.length;
    console.log(`[LLM Filter] Filtered ${removedCount} noise results from GitHub`);
    return filteredResults;

  } catch (error) {
    console.error(`[LLM Filter] Failed to filter GitHub noise:`, error);
    return results; // 如果失败，返回原始结果
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

  // 检查是否有摘要数据
  if (summaries.length === 0) {
    return {
      needsMoreResearch: true,
      newQueries: [],
      coverage: overallCoverage.counts,
      analysis: '无摘要数据，LLM提取可能失败，需要检查API配置',
    };
  }

  // 检查竞品和市场数据是否足够（优先检查）
  const allCompetitors = new Set<string>();
  const allMarketInfo: string[] = [];
  for (const summary of summaries) {
    for (const comp of summary.competitors || []) {
      allCompetitors.add(comp);
    }
    // 市场信息去重后再添加
    if (summary.marketInfo && !allMarketInfo.includes(summary.marketInfo)) {
      allMarketInfo.push(summary.marketInfo);
    }
  }

  // 生成竞品和市场补充查询
  const supplementalQueries: SearchQuery[] = [];
  let queryId = 1;

  // 如果竞品不足，生成竞品搜索查询
  if (allCompetitors.size < 3) {
    supplementalQueries.push({
      id: `qs${queryId++}`,
      query: `${projectTitle} 主要厂商 公司 品牌 竞品`,
      purpose: '搜索竞品和主要厂商信息',
      dimension: '竞品分析',
      priority: 1,
      hints: `请重点搜索轨道巡检领域的主要厂商、公司和品牌。目前只找到 ${allCompetitors.size} 个竞品，请补充更多厂商信息。`,
    });
  }

  // 如果市场信息不足，生成市场搜索查询
  if (allMarketInfo.length < 3) {
    supplementalQueries.push({
      id: `qs${queryId++}`,
      query: `${projectTitle} 市场规模 增长率 竞争格局 2024 2025`,
      purpose: '搜索市场规模和趋势数据',
      dimension: '市场规模与趋势',
      priority: 2,
      hints: `请重点搜索轨道巡检行业的市场规模、增长率、市场份额和竞争格局等数据。`,
    });
  }

  if (!hasApiKey) {
    const needsMore = overallCoverage.score < plan.qualityThresholds.completionScore || allCompetitors.size < 3;
    return {
      needsMoreResearch: needsMore,
      newQueries: [...supplementalQueries, ...(needsMore ? generateSupplementalQueries(plan, dimensionCoverage) : [])],
      coverage: overallCoverage.counts,
      analysis: `基于规则的分析：竞品${allCompetitors.size}个，市场信息${allMarketInfo.length}条，信息覆盖率${overallCoverage.score.toFixed(0)}%`,
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

// ============================================================
// 多步骤深度分析（逐步完成，确保完整性）
// ============================================================

interface AnalysisStepResult<T> {
  data: T;
  quality: number;
  issues: string[];
  supplementalQueries: SearchQuery[];
}

// 定义各步骤的数据类型
interface FeaturesStepData {
  features: Array<{ name: string; count: number; sources: string[]; description: string }>;
}

interface CompetitorsStepData {
  competitors: Array<{ name: string; features: string[]; description: string; marketPosition: string }>;
}

interface MarketStepData {
  marketData: { marketSize: string; growthRate: string; keyPlayers: string[]; trends: string[]; segments: string[] };
}

interface TechStepData {
  techAnalysis: { architecture: string[]; techStack: string[]; emergingTech: string[] };
}

interface UseCasesStepData {
  useCases: string[];
}

/**
 * 步骤1: 分析产品功能特性
 * 直接使用原始内容进行分析，不依赖名称列表
 */
async function analyzeFeaturesStep(
  summary: ComprehensiveSummary,
  projectTitle: string
): Promise<AnalysisStepResult<FeaturesStepData>> {
  const config = getLLMConfig();
  const hasApiKey = !!config.apiKey;

  const rawInsights = summary.rawInsights;

  // 无 API Key 时，基于原始内容提取功能
  if (!hasApiKey || rawInsights.length === 0) {
    const features = extractFeaturesFromContent(rawInsights, projectTitle);
    return {
      data: { features },
      quality: features.length >= 5 ? 80 : 40,
      issues: features.length < 5 ? ['功能数量不足'] : [],
      supplementalQueries: features.length < 5 ? [{
        id: 'sq-feature-1',
        query: `${projectTitle} 核心功能 主要特性 产品能力`,
        purpose: '搜索产品功能特性',
        dimension: '产品功能特性',
        priority: 1,
        hints: '请列出产品的所有核心功能点',
      }] : [],
    };
  }

  // 直接使用原始内容进行分析，而不是依赖名称列表
  const contentContext = rawInsights
    .slice(0, 15)
    .map((r, i) => `[来源${i + 1}] ${r.source}\n标题: ${r.title}\n内容: ${r.content.substring(0, 800)}`)
    .join('\n\n');

  const prompt = `请根据以下原始内容，详细分析产品功能特性。

【研究主题】
${projectTitle}

【原始内容来源】
${contentContext}

【任务】
请进行详细的功能分析，返回 JSON 格式：

{
  "features": [
    {
      "name": "功能名称（简洁的中文名称）",
      "count": 在多少个来源中被提及,
      "sources": ["来源1", "来源2"],
      "description": "功能的具体描述、能力、使用方式和价值（至少80字）"
    }
  ]
}

要求：
1. 仔细阅读每个来源的内容，提取产品功能
2. 每个功能需要详细的描述，说明是什么、做什么用、有什么价值
3. 统计每个功能在多少个来源中被提及
4. 按功能重要性和出现频率排序
5. 至少提取 8-15 个功能
6. 如果某个功能在多个来源中都有详细描述，说明其重要性`;

  try {
    const result = await generateText(prompt, undefined, {
      temperature: 0.3,
      maxTokens: 5000,
      role: 'analyzer',
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const features = (parsed.features || []).map((f: any) => ({
        name: f.name || '',
        count: f.count || 1,
        sources: f.sources || [],
        description: f.description || '',
      }));

      const issues: string[] = [];
      const featuresWithDesc = features.filter((f: { description: string }) => f.description && f.description.length > 50);
      if (featuresWithDesc.length < 8) {
        issues.push('部分功能描述不足');
      }

      return {
        data: { features },
        quality: featuresWithDesc.length >= 8 ? 90 : 60,
        issues,
        supplementalQueries: featuresWithDesc.length < 8 ? [{
          id: 'sq-feature-1',
          query: `${projectTitle} 核心功能 产品特性 能力清单`,
          purpose: '补充功能特性详情',
          dimension: '产品功能特性',
          priority: 1,
          hints: '请详细描述每个功能的具体能力、使用方式和商业价值',
        }] : [],
      };
    }
  } catch (error) {
    console.error('功能分析失败:', error);
  }

  // Fallback: 基于原始内容提取
  const features = extractFeaturesFromContent(rawInsights, projectTitle);
  return {
    data: { features },
    quality: features.length >= 5 ? 70 : 40,
    issues: ['功能分析失败，使用回退逻辑'],
    supplementalQueries: features.length < 5 ? [{
      id: 'sq-feature-1',
      query: `${projectTitle} 核心功能`,
      purpose: '补充功能信息',
      dimension: '产品功能特性',
      priority: 1,
    }] : [],
  };
}

/**
 * 从原始内容中提取功能（无 LLM 时使用）
 */
function extractFeaturesFromContent(rawInsights: IndividualSummary[], projectTitle: string) {
  const featureMap = new Map<string, { count: number; sources: Set<string>; description: string }>();

  for (const insight of rawInsights) {
    // 从 keyPoints 提取潜在功能
    for (const point of insight.keyPoints || []) {
      if (point.length > 10 && point.length < 100) {
        const name = point.split(' ').slice(0, 6).join(' ');
        if (!featureMap.has(name)) {
          featureMap.set(name, { count: 0, sources: new Set(), description: point });
        }
        featureMap.get(name)!.count++;
        featureMap.get(name)!.sources.add(insight.source);
      }
    }
  }

  return Array.from(featureMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      sources: Array.from(data.sources),
      description: data.description,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

/**
 * 步骤2: 分析竞品和替代方案
 * 直接使用原始内容进行分析，不依赖名称列表
 */
async function analyzeCompetitorsStep(
  summary: ComprehensiveSummary,
  projectTitle: string
): Promise<AnalysisStepResult<CompetitorsStepData>> {
  const config = getLLMConfig();
  const hasApiKey = !!config.apiKey;

  const rawInsights = summary.rawInsights;

  // 无 API Key 时，基于原始内容提取竞品
  if (!hasApiKey || rawInsights.length === 0) {
    const competitors = extractCompetitorsFromContent(rawInsights, projectTitle);
    return {
      data: { competitors },
      quality: competitors.length >= 3 ? 70 : 30,
      issues: competitors.length < 3 ? ['竞品数量不足'] : [],
      supplementalQueries: competitors.length < 3 ? [{
        id: 'sq-comp-1',
        query: `${projectTitle} 主要厂商 竞争对手 品牌 公司`,
        purpose: '搜索竞品和主要厂商',
        dimension: '竞品分析',
        priority: 1,
        hints: '请列出该领域的主要公司和品牌',
      }] : [],
    };
  }

  // 直接使用原始内容进行分析
  const contentContext = rawInsights
    .slice(0, 15)
    .map((r, i) => `[来源${i + 1}] ${r.source}\n标题: ${r.title}\n内容: ${r.content.substring(0, 800)}`)
    .join('\n\n');

  const prompt = `请根据以下原始内容，详细分析产品的竞品和替代方案。

【研究主题】
${projectTitle}

【原始内容来源】
${contentContext}

【任务】
请进行详细的竞品分析，返回 JSON 格式：

{
  "competitors": [
    {
      "name": "竞品名称（公司名或产品名）",
      "features": ["主要功能1", "主要功能2"],
      "description": "竞品的详细介绍：是什么公司/产品、主要做什么、有什么特点、面向哪些用户（至少100字）",
      "marketPosition": "市场定位描述：如高端/中端/低端、企业级/消费级等"
    }
  ]
}

要求：
1. 仔细阅读每个来源的内容，识别竞品和替代方案
2. 每个竞品需要有详细的描述（至少100字）
3. 列出竞品的主要功能（如果有提及）
4. 说明竞品的市场定位
5. 区分直接竞品（做同样产品）和间接竞品（满足同样需求）
6. 至少提取 5-10 个竞品`;

  try {
    const result = await generateText(prompt, undefined, {
      temperature: 0.3,
      maxTokens: 5000,
      role: 'analyzer',
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const competitors = (parsed.competitors || []).map((c: any) => ({
        name: c.name || '',
        features: c.features || [],
        description: c.description || '',
        marketPosition: c.marketPosition || '',
      }));

      const issues: string[] = [];
      const competitorsWithDesc = competitors.filter((c: { description: string }) => c.description && c.description.length > 80);
      if (competitorsWithDesc.length < 5) {
        issues.push('竞品描述不足');
      }

      return {
        data: { competitors },
        quality: competitorsWithDesc.length >= 5 ? 85 : 50,
        issues,
        supplementalQueries: competitorsWithDesc.length < 5 ? [{
          id: 'sq-comp-1',
          query: `${projectTitle} 竞争对手 竞品对比 主要厂商`,
          purpose: '补充竞品详细信息',
          dimension: '竞品分析',
          priority: 1,
          hints: '请提供竞品的详细介绍、公司背景和市场份额信息',
        }] : [],
      };
    }
  } catch (error) {
    console.error('竞品分析失败:', error);
  }

  // Fallback: 基于原始内容提取
  const competitors = extractCompetitorsFromContent(rawInsights, projectTitle);
  return {
    data: { competitors },
    quality: competitors.length >= 3 ? 60 : 30,
    issues: ['竞品分析失败，使用回退逻辑'],
    supplementalQueries: competitors.length < 3 ? [{
      id: 'sq-comp-1',
      query: `${projectTitle} 竞争对手`,
      purpose: '补充竞品信息',
      dimension: '竞品分析',
      priority: 1,
    }] : [],
  };
}

/**
 * 从原始内容中提取竞品（无 LLM 时使用）
 */
function extractCompetitorsFromContent(rawInsights: IndividualSummary[], projectTitle: string) {
  const competitorMap = new Map<string, { features: Set<string>; sources: Set<string>; description: string }>();

  for (const insight of rawInsights) {
    for (const comp of insight.competitors || []) {
      if (comp.length > 2 && comp.length < 50) {
        if (!competitorMap.has(comp)) {
          competitorMap.set(comp, { features: new Set(), sources: new Set(), description: '' });
        }
        competitorMap.get(comp)!.sources.add(insight.source);
      }
    }
  }

  return Array.from(competitorMap.entries())
    .map(([name, data]) => ({
      name,
      features: Array.from(data.features).slice(0, 5),
      description: '',
      marketPosition: '',
    }))
    .slice(0, 10);
  }

/**
 * 步骤3: 分析市场规模和趋势
 * 直接使用原始内容进行分析
 */
async function analyzeMarketStep(
  summary: ComprehensiveSummary,
  projectTitle: string
): Promise<AnalysisStepResult<MarketStepData>> {
  const config = getLLMConfig();
  const hasApiKey = !!config.apiKey;

  const rawInsights = summary.rawInsights;

  // 无 API Key 时
  if (!hasApiKey || rawInsights.length === 0) {
    const marketData = {
      marketSize: '',
      growthRate: '',
      keyPlayers: [],
      trends: [],
      segments: [],
    };
    return {
      data: { marketData },
      quality: 30,
      issues: ['无市场数据'],
      supplementalQueries: [{
        id: 'sq-market-1',
        query: `${projectTitle} 市场规模 增长率 市场趋势`,
        purpose: '搜索市场规模和趋势数据',
        dimension: '市场规模与趋势',
        priority: 1,
        hints: '请提供市场规模和发展趋势数据',
      }],
    };
  }

  // 直接使用原始内容进行分析
  const contentContext = rawInsights
    .slice(0, 15)
    .map((r, i) => `[来源${i + 1}] ${r.source}\n标题: ${r.title}\n内容: ${r.content.substring(0, 800)}`)
    .join('\n\n');

  const prompt = `请根据以下原始内容，分析市场规模、增长趋势和主要参与者。

【研究主题】
${projectTitle}

【原始内容来源】
${contentContext}

【任务】
请进行详细的市场分析，返回 JSON 格式：

{
  "marketData": {
    "marketSize": "市场规模描述（如：全球市场规模约XX亿美元，中国市场XX亿元）",
    "growthRate": "增长率描述（如：年复合增长率XX%，快速增长/稳定增长）",
    "keyPlayers": ["主要厂商1", "主要厂商2", "主要厂商3"],
    "trends": ["趋势1", "趋势2", "趋势3", "趋势4"],
    "segments": ["细分市场1", "细分市场2"]
  }
}

要求：
1. 仔细阅读每个来源的市场相关信息
2. 如果有具体的市场规模数据，尽量给出数字
3. 识别主要的市场参与者（公司）
4. 分析市场发展趋势（如：AI 驱动、云端化、自动化等）
5. 识别不同的细分市场
6. 如果某个信息在多个来源中一致，说明其可靠性`;

  try {
    const result = await generateText(prompt, undefined, {
      temperature: 0.3,
      maxTokens: 4000,
      role: 'analyzer',
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const marketData = {
        marketSize: parsed.marketData?.marketSize || '',
        growthRate: parsed.marketData?.growthRate || '',
        keyPlayers: parsed.marketData?.keyPlayers || [],
        trends: parsed.marketData?.trends || [],
        segments: parsed.marketData?.segments || [],
      };

      const issues: string[] = [];
      if (!marketData.marketSize) issues.push('缺乏市场规模数据');
      if (!marketData.growthRate) issues.push('缺乏增长率数据');
      if (marketData.keyPlayers.length < 3) issues.push('主要参与者识别不足');

      const quality = (marketData.marketSize ? 30 : 0) +
                      (marketData.growthRate ? 20 : 0) +
                      (marketData.keyPlayers.length >= 3 ? 20 : 0) +
                      (marketData.trends.length >= 3 ? 20 : 0) +
                      (marketData.segments.length >= 2 ? 10 : 0);

      return {
        data: { marketData },
        quality,
        issues,
        supplementalQueries: issues.length > 0 ? [{
          id: 'sq-market-1',
          query: `${projectTitle} 市场规模 增长率 市场趋势 主要厂商 2024 2025`,
          purpose: '补充市场规模和趋势数据',
          dimension: '市场规模与趋势',
          priority: 1,
          hints: '请提供具体的市场数据、数字和发展趋势',
        }] : [],
      };
    }
  } catch (error) {
    console.error('市场分析失败:', error);
  }

  return {
    data: { marketData: { marketSize: '', growthRate: '', keyPlayers: [], trends: [], segments: [] } },
    quality: 20,
    issues: ['市场分析失败'],
    supplementalQueries: [{
      id: 'sq-market-1',
      query: `${projectTitle} 市场规模 市场趋势`,
      purpose: '搜索市场数据',
      dimension: '市场规模与趋势',
      priority: 1,
    }],
  };
}

/**
 * 步骤4: 分析技术架构和栈
 * 直接使用原始内容进行分析
 */
async function analyzeTechStackStep(
  summary: ComprehensiveSummary,
  projectTitle: string
): Promise<AnalysisStepResult<TechStepData>> {
  const config = getLLMConfig();
  const hasApiKey = !!config.apiKey;

  const rawInsights = summary.rawInsights;

  // 无 API Key 时
  if (!hasApiKey || rawInsights.length === 0) {
    const techAnalysis = {
      architecture: [],
      techStack: [],
      emergingTech: [],
    };
    return {
      data: { techAnalysis },
      quality: 30,
      issues: ['无技术数据'],
      supplementalQueries: [{
        id: 'sq-tech-1',
        query: `${projectTitle} 技术架构 技术栈 技术方案`,
        purpose: '搜索技术架构信息',
        dimension: '技术架构',
        priority: 1,
        hints: '请列出产品使用的核心技术栈和架构方案',
      }],
    };
  }

  // 直接使用原始内容进行分析
  const contentContext = rawInsights
    .slice(0, 15)
    .map((r, i) => `[来源${i + 1}] ${r.source}\n标题: ${r.title}\n内容: ${r.content.substring(0, 800)}`)
    .join('\n\n');

  const prompt = `请根据以下原始内容，分析产品的技术架构和技术栈。

【研究主题】
${projectTitle}

【原始内容来源】
${contentContext}

【任务】
请进行详细的技术分析，返回 JSON 格式：

{
  "techAnalysis": {
    "architecture": ["架构特点1：描述...", "架构特点2：描述..."],
    "techStack": ["技术1（前端/后端/数据库/云服务）", "技术2", "技术3"],
    "emergingTech": ["新兴或前沿技术1", "新兴技术2"]
  }
}

要求：
1. 仔细阅读每个来源的技术相关信息
2. 分析产品的整体架构特点（如：微服务、云原生、分布式等）
3. 列出使用的核心技术栈（前端框架、后端语言、数据库、云服务等）
4. 识别采用的新兴或前沿技术
5. 说明技术的使用场景和优势
6. 按技术重要性和出现频率排序`;

  try {
    const result = await generateText(prompt, undefined, {
      temperature: 0.3,
      maxTokens: 4000,
      role: 'analyzer',
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const techAnalysis = {
        architecture: parsed.techAnalysis?.architecture || [],
        techStack: parsed.techAnalysis?.techStack || [],
        emergingTech: parsed.techAnalysis?.emergingTech || [],
      };

      const issues: string[] = [];
      if (techAnalysis.techStack.length < 3) issues.push('技术栈信息不足');
      if (techAnalysis.architecture.length < 2) issues.push('架构分析不足');

      const quality = (techAnalysis.techStack.length >= 3 ? 30 : 0) +
                      (techAnalysis.architecture.length >= 2 ? 30 : 0) +
                      (techAnalysis.emergingTech.length >= 1 ? 20 : 0) +
                      20; // 基础分

      return {
        data: { techAnalysis },
        quality,
        issues,
        supplementalQueries: issues.length > 0 ? [{
          id: 'sq-tech-1',
          query: `${projectTitle} 技术架构 技术选型 核心能力`,
          purpose: '补充技术架构信息',
          dimension: '技术架构',
          priority: 1,
          hints: '请详细描述产品的技术架构、核心能力和技术选型理由',
        }] : [],
      };
    }
  } catch (error) {
    console.error('技术分析失败:', error);
  }

  return {
    data: { techAnalysis: { architecture: [], techStack: [], emergingTech: [] } },
    quality: 20,
    issues: ['技术分析失败'],
    supplementalQueries: [{
      id: 'sq-tech-1',
      query: `${projectTitle} 技术架构 技术栈`,
      purpose: '搜索技术信息',
      dimension: '技术架构',
      priority: 1,
    }],
  };
}

/**
 * 步骤5: 收集使用场景和案例
 * 直接使用原始内容进行分析
 */
async function analyzeUseCasesStep(
  summary: ComprehensiveSummary,
  projectTitle: string
): Promise<AnalysisStepResult<UseCasesStepData>> {
  const config = getLLMConfig();
  const hasApiKey = !!config.apiKey;

  const rawInsights = summary.rawInsights;

  // 无 API Key 时
  if (!hasApiKey || rawInsights.length === 0) {
    const useCases: string[] = [];
    return {
      data: { useCases },
      quality: 30,
      issues: ['无使用场景数据'],
      supplementalQueries: [{
        id: 'sq-usecase-1',
        query: `${projectTitle} 使用场景 应用案例 典型方案`,
        purpose: '搜索使用场景和案例',
        dimension: '使用场景与用户案例',
        priority: 1,
        hints: '请提供产品的典型使用场景和应用案例',
      }],
    };
  }

  // 直接使用原始内容进行分析
  const contentContext = rawInsights
    .slice(0, 15)
    .map((r, i) => `[来源${i + 1}] ${r.source}\n标题: ${r.title}\n内容: ${r.content.substring(0, 800)}`)
    .join('\n\n');

  const prompt = `请根据以下原始内容，分析产品的使用场景和用户案例。

【研究主题】
${projectTitle}

【原始内容来源】
${contentContext}

【任务】
请进行详细的使用场景分析，返回 JSON 格式：

{
  "useCases": [
    "使用场景1：详细描述用户如何使用产品解决实际问题",
    "使用场景2：说明具体的应用场景和解决方案",
    "使用场景3：描述用户类型和使用情境"
  ],
  "analysis": "使用场景分析总结，包括主要用户群体和典型使用模式"
}

要求：
1. 仔细阅读每个来源中提到的使用场景
2. 识别不同类型的用户及其使用需求
3. 分析产品如何满足这些使用场景
4. 描述具体的使用案例和实际效果
5. 至少收集 5 个使用场景，每个场景至少30字描述`;

  try {
    const result = await generateText(prompt, undefined, {
      temperature: 0.3,
      maxTokens: 3000,
      role: 'analyzer',
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const useCases = (parsed.useCases || []).filter((u: string) => u && u.length > 20);

      const issues: string[] = [];
      if (useCases.length < 5) issues.push('使用场景数量不足');

      const quality = (useCases.length >= 5 ? 40 : 0) +
                      (useCases.length >= 8 ? 20 : 0) +
                      (parsed.analysis && parsed.analysis.length > 50 ? 20 : 0) +
                      20; // 基础分

      return {
        data: { useCases },
        quality,
        issues,
        supplementalQueries: useCases.length < 5 ? [{
          id: 'sq-usecase-1',
          query: `${projectTitle} 应用场景 典型案例 使用方式`,
          purpose: '补充使用场景',
          dimension: '使用场景与用户案例',
          priority: 1,
          hints: '请提供具体的使用场景和实际案例',
        }] : [],
      };
    }
  } catch (error) {
    console.error('使用场景分析失败:', error);
  }

  return {
    data: { useCases: [] },
    quality: 20,
    issues: ['使用场景分析失败'],
    supplementalQueries: [{
      id: 'sq-usecase-1',
      query: `${projectTitle} 使用场景 典型案例`,
      purpose: '搜索使用场景',
      dimension: '使用场景与用户案例',
      priority: 1,
    }],
  };
}

/**
 * 步骤6: 生成 SWOT 分析
 */
async function generateSWOTStep(
  features: any[],
  competitors: any[],
  marketData: any,
  projectTitle: string
): Promise<AnalysisStepResult<{ swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] } }>> {
  const config = getLLMConfig();
  const hasApiKey = !!config.apiKey;

  if (!hasApiKey) {
    const swot = {
      strengths: features.slice(0, 3).map(f => f.name),
      weaknesses: ['信息收集不完整'],
      opportunities: marketData.trends || [],
      threats: ['市场竞争加剧'],
    };
    return {
      data: { swot },
      quality: 40,
      issues: ['缺少API Key，使用基础SWOT'],
      supplementalQueries: [],
    };
  }

  const prompt = `请基于以下产品调研数据生成 SWOT 分析。

【研究主题】
${projectTitle}

【功能特性】
${features.slice(0, 10).map(f => `- ${f.name}: ${f.description || '无描述'}`).join('\n') || '无'}

【竞品信息】
${competitors.slice(0, 5).map(c => `- ${c.name}: ${c.description || '无描述'}`).join('\n') || '无'}

【市场数据】
- 市场规模: ${marketData.marketSize || '未知'}
- 增长率: ${marketData.growthRate || '未知'}
- 主要趋势: ${(marketData.trends || []).join(', ') || '未知'}

【任务】
请生成详细的 SWOT 分析，返回 JSON 格式：

{
  "swot": {
    "strengths": ["优势1", "优势2", "优势3"],
    "weaknesses": ["劣势1", "劣势2", "劣势3"],
    "opportunities": ["机会1", "机会2", "机会3"],
    "threats": ["威胁1", "威胁2", "威胁3"]
  },
  "analysis": "SWOT分析总结（100字以上）"
}

要求：
1. 每个维度至少列出 3 个条目
2. 每个条目需要具体且有分析价值
3. 结合功能、竞品和市场数据综合分析
4. 每个条目至少 20 字`;

  try {
    const result = await generateText(prompt, undefined, {
      temperature: 0.4,
      maxTokens: 3000,
      role: 'analyzer',
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const swot = parsed.swot || {};

      // Validate
      const issues: string[] = [];
      const totalItems = (swot.strengths?.length || 0) + (swot.weaknesses?.length || 0) +
                        (swot.opportunities?.length || 0) + (swot.threats?.length || 0);

      if (totalItems < 8) issues.push('SWOT分析不够完整');

      return {
        data: { swot },
        quality: totalItems >= 12 ? 85 : (totalItems >= 8 ? 70 : 50),
        issues,
        supplementalQueries: totalItems < 8 ? [{
          id: 'sq-swot-1',
          query: `${projectTitle} 优势 劣势 机会 威胁 SWOT分析`,
          purpose: '补充SWOT分析',
          dimension: 'SWOT分析',
          priority: 2,
          hints: '请提供更详细的优势、劣势、机会和威胁分析',
        }] : [],
      };
    }
  } catch (error) {
    console.error('SWOT分析失败:', error);
  }

  return {
    data: {
      swot: {
        strengths: features.slice(0, 3).map(f => f.name),
        weaknesses: ['信息收集不完整'],
        opportunities: marketData.trends || [],
        threats: [],
      },
    },
    quality: 30,
    issues: ['SWOT分析失败'],
    supplementalQueries: [],
  };
}

/**
 * 步骤7: 识别机会和风险
 */
async function analyzeOpportunitiesRisksStep(
  swot: any,
  marketData: any,
  projectTitle: string
): Promise<AnalysisStepResult<{ opportunities: string[]; risks: string[] }>> {
  const config = getLLMConfig();
  const hasApiKey = !!config.apiKey;

  if (!hasApiKey) {
    return {
      data: {
        opportunities: swot.opportunities || [],
        risks: swot.threats || ['市场竞争风险'],
      },
      quality: 50,
      issues: ['缺少API Key，使用基础分析'],
      supplementalQueries: [],
    };
  }

  const prompt = `请基于 SWOT 分析识别市场机会和潜在风险。

【研究主题】
${projectTitle}

【SWOT分析结果】
- 优势: ${(swot.strengths || []).join('; ')}
- 劣势: ${(swot.weaknesses || []).join('; ')}
- 机会: ${(swot.opportunities || []).join('; ')}
- 威胁: ${(swot.threats || []).join('; ')}

【市场趋势】
${(marketData.trends || []).join('\n- ') || '无'}

【任务】
请深入分析机会和风险，返回 JSON 格式：

{
  "opportunities": [
    "机会1（详细描述，至少40字）",
    "机会2（详细描述，至少40字）",
    "机会3（详细描述，至少40字）"
  ],
  "risks": [
    "风险1（详细描述，至少40字）",
    "风险2（详细描述，至少40字）",
    "风险3（详细描述，至少40字）"
  ],
  "analysis": "机会与风险分析总结（150字以上）"
}

要求：
1. 机会需要结合优势和趋势，具有前瞻性
2. 风险需要结合劣势和威胁，具有预警性
3. 每个机会和风险需要有具体场景和原因说明
4. 至少 3 个机会和 3 个风险`;

  try {
    const result = await generateText(prompt, undefined, {
      temperature: 0.4,
      maxTokens: 3000,
      role: 'analyzer',
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const opportunities = (parsed.opportunities || []).filter((o: string) => o && o.length > 30);
      const risks = (parsed.risks || []).filter((r: string) => r && r.length > 30);

      const issues: string[] = [];
      if (opportunities.length < 3) issues.push('机会分析不足');
      if (risks.length < 3) issues.push('风险分析不足');

      return {
        data: { opportunities, risks },
        quality: (opportunities.length >= 3 ? 40 : 0) + (risks.length >= 3 ? 40 : 0) + 20,
        issues,
        supplementalQueries: issues.length > 0 ? [{
          id: 'sq-or-1',
          query: `${projectTitle} 市场机会 发展前景 风险挑战`,
          purpose: '补充机会和风险分析',
          dimension: '机会与风险',
          priority: 2,
          hints: '请提供详细的市场机会和潜在风险分析',
        }] : [],
      };
    }
  } catch (error) {
    console.error('机会风险分析失败:', error);
  }

  return {
    data: {
      opportunities: swot.opportunities || [],
      risks: swot.threats || ['市场竞争风险'],
    },
    quality: 30,
    issues: ['机会风险分析失败'],
    supplementalQueries: [],
  };
}

/**
 * 步骤8: 生成建议
 */
async function generateRecommendationsStep(
  swot: any,
  opportunities: string[],
  risks: string[],
  projectTitle: string
): Promise<AnalysisStepResult<{ recommendations: string[] }>> {
  const config = getLLMConfig();
  const hasApiKey = !!config.apiKey;

  if (!hasApiKey) {
    return {
      data: {
        recommendations: [
          '建议1: 持续关注市场趋势变化',
          '建议2: 加强技术研发投入',
          '建议3: 拓展市场份额',
        ],
      },
      quality: 40,
      issues: ['缺少API Key，使用基础建议'],
      supplementalQueries: [],
    };
  }

  const prompt = `请基于以下分析结果生成具体可行的建议。

【研究主题】
${projectTitle}

【SWOT分析】
- 优势: ${(swot.strengths || []).slice(0, 3).join('; ')}
- 劣势: ${(swot.weaknesses || []).slice(0, 3).join('; ')}
- 机会: ${(swot.opportunities || []).slice(0, 3).join('; ')}
- 威胁: ${(swot.threats || []).slice(0, 3).join('; ')}

【主要机会】
${opportunities.slice(0, 3).join('\n- ') || '无'}

【主要风险】
${risks.slice(0, 3).join('\n- ') || '无'}

【任务】
请生成具体可行的建议，返回 JSON 格式：

{
  "recommendations": [
    "建议1（详细描述，至少50字，包含具体行动建议）",
    "建议2（详细描述，至少50字，包含具体行动建议）",
    "建议3（详细描述，至少50字，包含具体行动建议）",
    "建议4（详细描述，至少50字，包含具体行动建议）",
    "建议5（详细描述，至少50字，包含具体行动建议）"
  ],
  "analysis": "建议总结（100字以上）"
}

要求：
1. 建议需要结合机会和风险，具有可操作性
2. 每个建议需要有具体的行动步骤
3. 建议需要考虑资源投入和时间规划
4. 至少 5 条建议`;

  try {
    const result = await generateText(prompt, undefined, {
      temperature: 0.4,
      maxTokens: 3000,
      role: 'analyzer',
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const recommendations = (parsed.recommendations || []).filter((r: string) => r && r.length > 40);

      const issues: string[] = [];
      if (recommendations.length < 5) issues.push('建议数量不足');

      return {
        data: { recommendations },
        quality: recommendations.length >= 5 ? 85 : 60,
        issues,
        supplementalQueries: recommendations.length < 5 ? [{
          id: 'sq-rec-1',
          query: `${projectTitle} 发展建议 战略规划 行动方案`,
          purpose: '补充建议',
          dimension: '建议',
          priority: 2,
          hints: '请提供具体可行的发展建议和行动方案',
        }] : [],
      };
    }
  } catch (error) {
    console.error('建议生成失败:', error);
  }

  return {
    data: {
      recommendations: [
        '建议持续关注市场变化，把握发展机遇',
        '建议加强技术研发，提升核心竞争力',
        '建议拓展用户群体，扩大市场份额',
      ],
    },
    quality: 30,
    issues: ['建议生成失败'],
    supplementalQueries: [],
  };
}

/**
 * 主函数: 多步骤深度分析
 * 逐步完成分析，支持在每一步进行数据补充
 */
async function multiStepAnalyze(
  summary: ComprehensiveSummary,
  projectTitle: string,
  searchResults: SearchResult[],
  plan: SearchPlan | undefined,
  onProgress: (step: number, stepName: string, progress: number, message: string) => void
): Promise<DeepAnalysis> {
  let finalAnalysis: DeepAnalysis = {
    features: [],
    competitors: [],
    swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
    marketData: { marketSize: '', growthRate: '', keyPlayers: [], trends: [], segments: [] },
    techAnalysis: { architecture: [], techStack: [], emergingTech: [] },
    userInsights: { personas: [], painPoints: [], requirements: [] },
    opportunities: [],
    risks: [],
    recommendations: [],
    confidenceScore: 50,
  };

  const STEPS: Array<{
    name: string;
    fn: (s: ComprehensiveSummary, projectTitle: string) => Promise<AnalysisStepResult<any>>;
  }> = [
    { name: '功能分析', fn: analyzeFeaturesStep },
    { name: '竞品分析', fn: analyzeCompetitorsStep },
    { name: '市场分析', fn: analyzeMarketStep },
    { name: '技术分析', fn: analyzeTechStackStep },
    { name: '使用场景', fn: analyzeUseCasesStep },
  ];

  let currentSummary = summary;

  // 执行前5个分析步骤
  for (let i = 0; i < STEPS.length; i++) {
    onProgress(i + 1, STEPS[i].name, 0, `正在进行${STEPS[i].name}...`);

    const result = await STEPS[i].fn(currentSummary, projectTitle);

    onProgress(i + 1, STEPS[i].name, 50, `${STEPS[i].name}完成，质量:${result.quality}%`);

    // 如果发现问题且有补充查询，执行补充搜索
    if (result.issues.length > 0 && result.supplementalQueries.length > 0) {
      console.log(`[MultiStep] ${STEPS[i].name} 发现问题: ${result.issues.join(', ')}，执行补充搜索`);

      // 执行补充查询
      for (const query of result.supplementalQueries) {
        try {
          const sourceManager = getDataSourceManager();
          const newResults = await sourceManager.searchAll(query.query, 5);
          if (newResults.length > 0) {
            // 爬取完整内容
            const enrichedResults = await enrichResultsWithCrawl4AI(newResults);
            // 汇总新结果
            const newSummaries = await summarizeSingleResults(enrichedResults, projectTitle);
            // 合并到当前摘要
            currentSummary = await mergeSummaries(currentSummary, newSummaries);
            console.log(`[MultiStep] 补充搜索完成，新增 ${newResults.length} 条结果`);
          }
        } catch (e) {
          console.error(`[MultiStep] 补充搜索失败:`, e);
        }
      }

      // 重新执行分析
      onProgress(i + 1, STEPS[i].name, 80, `正在重新分析...`);
      const retryResult = await STEPS[i].fn(currentSummary, projectTitle);
      result.data = retryResult.data;
      result.quality = retryResult.quality;
    }

    // 保存步骤结果
    const stepProgress = ((i + 1) / STEPS.length) * 50;
    onProgress(i + 1, STEPS[i].name, 100, `${STEPS[i].name}完成，质量:${result.quality}%`);

    // 合并结果到最终分析（使用类型断言）
    const data = result.data as FeaturesStepData & CompetitorsStepData & MarketStepData & TechStepData & UseCasesStepData;
    if (data.features) finalAnalysis.features = data.features;
    if (data.competitors) finalAnalysis.competitors = data.competitors;
    if (data.marketData) finalAnalysis.marketData = data.marketData;
    if (data.techAnalysis) finalAnalysis.techAnalysis = data.techAnalysis;
    if (data.useCases) {
      finalAnalysis.userInsights = {
        personas: [],
        painPoints: [],
        requirements: data.useCases,
      };
    }
  }

  // 步骤6: SWOT 分析
  onProgress(6, 'SWOT分析', 0, '正在进行SWOT分析...');
  const swotResult = await generateSWOTStep(
    finalAnalysis.features,
    finalAnalysis.competitors,
    finalAnalysis.marketData,
    projectTitle
  );
  finalAnalysis.swot = swotResult.data.swot;
  onProgress(6, 'SWOT分析', 100, `SWOT分析完成，质量:${swotResult.quality}%`);

  // 步骤7: 机会与风险
  onProgress(7, '机会与风险', 0, '正在分析机会与风险...');
  const orResult = await analyzeOpportunitiesRisksStep(
    finalAnalysis.swot,
    finalAnalysis.marketData,
    projectTitle
  );
  finalAnalysis.opportunities = orResult.data.opportunities;
  finalAnalysis.risks = orResult.data.risks;
  onProgress(7, '机会与风险', 100, `机会与风险分析完成，质量:${orResult.quality}%`);

  // 步骤8: 建议
  onProgress(8, '建议生成', 0, '正在生成建议...');
  const recResult = await generateRecommendationsStep(
    finalAnalysis.swot,
    finalAnalysis.opportunities,
    finalAnalysis.risks,
    projectTitle
  );
  finalAnalysis.recommendations = recResult.data.recommendations;
  onProgress(8, '建议生成', 100, `建议生成完成，质量:${recResult.quality}%`);

  // 计算总体置信度
  const overallQuality = (
    (finalAnalysis.features.length >= 5 ? 20 : 0) +
    (finalAnalysis.competitors.length >= 3 ? 15 : 0) +
    (finalAnalysis.marketData.marketSize ? 15 : 0) +
    (finalAnalysis.techAnalysis.techStack.length >= 3 ? 10 : 0) +
    (finalAnalysis.userInsights.requirements.length >= 5 ? 10 : 0) +
    (finalAnalysis.swot.strengths.length >= 2 ? 5 : 0) +
    (finalAnalysis.opportunities.length >= 2 ? 10 : 0) +
    (finalAnalysis.risks.length >= 2 ? 5 : 0) +
    (finalAnalysis.recommendations.length >= 3 ? 10 : 0)
  );
  finalAnalysis.confidenceScore = overallQuality;

  return finalAnalysis;
}

/**
 * 辅助函数: 合并两个摘要
 */
async function mergeSummaries(
  summary1: ComprehensiveSummary,
  summary2: ComprehensiveSummary
): Promise<ComprehensiveSummary> {
  // 合并去重
  const allFeatures = [...new Set([...summary1.allFeatures, ...summary2.allFeatures])];
  const allCompetitors = [...new Set([...summary1.allCompetitors, ...summary2.allCompetitors])];
  const allTechStack = [...new Set([...summary1.allTechStack, ...summary2.allTechStack])];
  const allUseCases = [...new Set([...summary1.allUseCases, ...summary2.allUseCases])];
  const allMarketInsights = [...new Set([...summary1.marketInsights, ...summary2.marketInsights])];
  const allKeyFindings = [...new Set([...summary1.keyFindings, ...summary2.keyFindings])];
  const allSourcesUsed = [...new Set([...summary1.sourcesUsed, ...summary2.sourcesUsed])];
  const rawInsights = [...summary1.rawInsights, ...summary2.rawInsights];

  return {
    productOverview: summary1.productOverview || summary2.productOverview || '',
    coreThemes: [...new Set([...summary1.coreThemes, ...summary2.coreThemes])],
    allFeatures,
    allCompetitors,
    allTechStack,
    allUseCases,
    marketInsights: allMarketInsights,
    dataGaps: [...new Set([...summary1.dataGaps, ...summary2.dataGaps])],
    sourcesUsed: allSourcesUsed,
    keyFindings: allKeyFindings,
    rawInsights,
    summaryQuality: {
      completeness: Math.min(100, (summary1.summaryQuality?.completeness || 0) + (summary2.summaryQuality?.completeness || 0)),
      reliability: Math.max(summary1.summaryQuality?.reliability || 0, summary2.summaryQuality?.reliability || 0),
      depth: Math.max(summary1.summaryQuality?.depth || 0, summary2.summaryQuality?.depth || 0),
    },
  };
}

/**
 * 辅助函数: 汇总单个结果（用于补充搜索）
 */
async function summarizeSingleResults(
  results: SearchResult[],
  projectTitle: string
): Promise<ComprehensiveSummary> {
  const config = getLLMConfig();
  const hasApiKey = !!config.apiKey;

  const allFeatures = new Set<string>();
  const allCompetitors = new Set<string>();
  const allTechStack = new Set<string>();
  const allUseCases = new Set<string>();
  const marketInsights: string[] = [];
  const keyFindings: string[] = [];
  const rawInsights: IndividualSummary[] = [];
  const sourcesUsed: string[] = [];

  for (const result of results) {
    const summary = await summarizeSingleResult(result, projectTitle, hasApiKey);
    summary.features.forEach(f => allFeatures.add(f));
    summary.competitors.forEach(c => allCompetitors.add(c));
    summary.techStack.forEach(t => allTechStack.add(t));
    summary.useCases.forEach(u => allUseCases.add(u));
    if (summary.marketInfo) marketInsights.push(summary.marketInfo);
    keyFindings.push(...summary.keyPoints.slice(0, 2));
    rawInsights.push(summary);
    if (result.source && !sourcesUsed.includes(result.source)) {
      sourcesUsed.push(result.source);
    }
  }

  return {
    productOverview: '',
    coreThemes: [],
    allFeatures: Array.from(allFeatures),
    allCompetitors: Array.from(allCompetitors),
    allTechStack: Array.from(allTechStack),
    allUseCases: Array.from(allUseCases),
    marketInsights,
    dataGaps: [],
    sourcesUsed,
    keyFindings: [...new Set(keyFindings)],
    rawInsights,
    summaryQuality: {
      completeness: 50,
      reliability: 60,
      depth: 40,
    },
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
  const featuresCount = analysis.features?.length || 0;
  const competitorsCount = analysis.competitors?.length || 0;
  const useCasesCount = summary.allUseCases?.length || 0;
  const techStackCount = analysis.techAnalysis?.techStack?.length || 0;
  const hasMarketData = !!analysis.marketData?.marketSize || !!analysis.marketData?.growthRate;

  const coverage: Record<string, number> = {
    features: Math.min(1, featuresCount / thresholds.minFeatures),
    competitors: Math.min(1, competitorsCount / thresholds.minCompetitors),
    useCases: Math.min(1, useCasesCount / thresholds.minUseCases),
    technology: Math.min(1, techStackCount / thresholds.minTechStack),
    market: hasMarketData ? 1 : 0,
  };

  // 评分
  score += coverage.features * 25;
  score += coverage.competitors * 20;
  score += coverage.useCases * 20;
  score += coverage.technology * 15;
  score += coverage.market * 20;

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
  if (coverage.features < 1) {
    issues.push(`功能信息不足 (${featuresCount}/${thresholds.minFeatures})`);
    suggestions.push('搜索产品核心功能和特性');
  }
  if (coverage.competitors < 1) {
    issues.push(`竞品信息不足 (${competitorsCount}/${thresholds.minCompetitors})`);
    suggestions.push('搜索竞争对手和替代产品');
  }
  if (coverage.useCases < 1) {
    issues.push(`使用案例不足 (${useCasesCount}/${thresholds.minUseCases})`);
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

  let plan: SearchPlan | null = taskData.researchPlan as SearchPlan | null;
  let allSummaries: IndividualSummary[] = taskData.individualSummaries as IndividualSummary[];
  let comprehensiveSummary: ComprehensiveSummary | null = taskData.comprehensiveSummary as ComprehensiveSummary | null;
  let analysis: DeepAnalysis | null = taskData.deepAnalysis as DeepAnalysis | null;
  let dataQuality: DataQualityCheck = taskData.dataQuality as unknown as DataQualityCheck;
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
    const newResults = await executeWebResearch(title, plan, searchResults);
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
    taskData.sourceStats = calculateSourceStats(
      taskData.searchResults.map(r => ({
        source: r.source,
        sourceType: r.sourceType,
        contentLength: r.content?.length || 0,
      }))
    );

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
    updateProgress(projectId, Math.round(baseProgress + 20), `已完成 ${allSummaries.length} 条结果摘要，正在多步骤深度分析...`);

    // 保存汇总结果
    taskData.individualSummaries = allSummaries as any;
    taskData.comprehensiveSummary = comprehensiveSummary as any;
    saveTaskData(taskData);

    // 节点4: 多步骤深度分析
    analysis = await multiStepAnalyze(
      comprehensiveSummary,
      title,
      searchResults,
      plan || undefined,
      (step, stepName, progress, message) => {
        const overallProgress = Math.round(baseProgress + 30 + (progress * 0.15));
        updateProgress(projectId, overallProgress, `[${step}/8] ${message}`);
      }
    );
    updateProgress(projectId, Math.round(baseProgress + 45), '深度分析完成，正在检查数据质量...');

    // 保存分析结果
    taskData.deepAnalysis = analysis as any;
    saveTaskData(taskData);

    // 节点5: 数据质量检查
    if (plan) {
      dataQuality = await checkDataQuality(searchResults, analysis, comprehensiveSummary, plan, iteration, maxIterations);
      console.log(`Data quality score: ${dataQuality.score}/100`);
      console.log(`Issues: ${dataQuality.issues.join(', ') || 'None'}`);

      // 保存质量检查结果
      taskData.dataQuality = dataQuality as any;
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
