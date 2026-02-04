/**
 * Analyzer Agent
 *
 * 负责深度分析的 Agent
 *
 * 功能：
 * 1. 读取爬取的原始 Markdown 文件
 * 2. 使用 LLM 分析内容（增量方式，一次一个文件）
 * 3. 生成功能、竞品、SWOT 分析
 * 4. 将分析结果保存到文件
 */

import type { ResearchState } from '../../state';
import type { AnalysisResult } from '../../types';
import { DETAILED_ANALYSIS_PROMPT, SINGLE_FILE_ANALYSIS_PROMPT } from '../../prompts/analyzer';
import { generateText, getLLMConfig } from '../../../llm';
import { updateProgress } from '../../progress/tracker';
import { createCancelCheck } from '../../cancellation/handler';
import { getFileStorageService, type FileStorageService } from '@/lib/file-storage';
import { jsonrepair } from 'jsonrepair';
import { createQualityAssessor } from '../quantitative/quality-assessor';

/**
 * Analyzer Agent 配置
 */
export interface AnalyzerConfig {
  /** 是否使用 LLM 分析 */
  useLLM: boolean;
  /** 内容分块大小（对于 8b 模型，使用较小的块） */
  chunkSize: number;
  /** 最小置信度阈值 */
  minConfidenceScore: number;
  /** 是否使用增量分析模式 */
  incrementalMode: boolean;
}

/** 默认配置 - 针对 8b 模型优化 */
const DEFAULT_CONFIG: AnalyzerConfig = {
  useLLM: true,
  chunkSize: 8000,  // 8b 模型使用较小的块，避免超出上下文
  minConfidenceScore: 0.5,
  incrementalMode: true,  // 默认启用增量模式
};

/**
 * Analyzer Agent 执行结果
 */
export interface AnalyzerResult {
  success: boolean;
  analysis?: AnalysisResult;
  dataQuality?: {
    isComplete: boolean;
    score: number;
    issues: string[];
    missingDimensions: string[];
  };
  analysisFiles?: string[];
  error?: string;
}

/**
 * 创建 Analyzer Agent
 */
function createAnalyzerAgent(config: Partial<AnalyzerConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return {
    config: finalConfig,
    execute: (state: ResearchState) => executeAnalysis(state, finalConfig),
  };
}

/**
 * 主执行函数：执行分析（增量模式）
 *
 * 流程：
 * 1. 从文件系统读取原始 Markdown 文件
 * 2. 逐个处理文件（增量模式）
 * 3. 每次分析一个文件并合并结果
 * 4. 保存最终分析结果
 */
async function executeAnalysis(
  state: ResearchState,
  config: AnalyzerConfig
): Promise<AnalyzerResult> {
  const { projectId, title, description, projectPath, extractedContent } = state;

  // 创建文件存储服务
  const fileService = getFileStorageService();

  // 创建取消检查
  const isCancelled = createCancelCheck(projectId);

  // 检查 LLM 配置
  const llmConfig = getLLMConfig();
  const hasLLMConfig = !!(llmConfig.baseUrl || llmConfig.apiKey || llmConfig.modelName);

  const isLocalModel = llmConfig.provider === 'ollama' ||
                       llmConfig.baseUrl?.includes('localhost') ||
                       llmConfig.baseUrl?.includes('127.0.0.1');
  const needsApiKey = !isLocalModel;
  const hasApiKey = !!llmConfig.apiKey;

  if (!hasLLMConfig || (needsApiKey && !hasApiKey)) {
    return {
      success: false,
      error: `LLM 不可用，请检查配置。当前 provider: ${llmConfig.provider}, baseUrl: ${llmConfig.baseUrl || '未配置'}`,
    };
  }

  // 读取原始文件
  let rawFiles: Array<{ id: string; content: string; info: { title: string; url: string } }> = [];

  if (projectPath) {
    try {
      rawFiles = fileService.readAllRawFiles(projectPath);
    } catch (error) {
      console.warn(`[Analyzer] 无法读取项目文件 ${projectPath}:`, error);
    }
  }

  // 如果文件系统没有文件，使用 extractedContent
  if (rawFiles.length === 0 && extractedContent.length > 0) {
    console.log(`[Analyzer] 使用 extractedContent 进行分析，共 ${extractedContent.length} 条内容`);
    rawFiles = extractedContent.map((ext, index) => ({
      id: `ext-${index + 1}`,
      content: ext.content,
      info: { title: ext.title, url: ext.url },
    }));
  }

  if (rawFiles.length === 0) {
    return {
      success: false,
      error: '没有可分析的文件内容',
    };
  }

  try {
    // 如果使用增量模式，逐个处理文件
    if (config.incrementalMode && rawFiles.length > 1) {
      return await executeIncrementalAnalysis(
        state,
        config,
        rawFiles,
        fileService,
        isCancelled
      );
    }

    // 否则使用原有的批量分析模式
    return await executeBatchAnalysis(state, config, rawFiles, fileService, isCancelled);

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '分析执行失败',
    };
  }
}

/**
 * 增量分析模式：逐个处理文件并合并结果
 */
async function executeIncrementalAnalysis(
  state: ResearchState,
  config: AnalyzerConfig,
  rawFiles: Array<{ id: string; content: string; info: { title: string; url: string } }>,
  fileService: FileStorageService,
  isCancelled: () => boolean
): Promise<AnalyzerResult> {
  const { projectId, title, description, projectPath } = state;

  // 在增量分析模式下，所有爬取的文件都应该参与报告生成
  // 每个文件单独处理并增量合并，确保报告完整性
  const filesToProcess = rawFiles;
  const skippedFiles = 0;

  // 初始化累积分析结果
  let accumulatedAnalysis: Partial<AnalysisResult> = {
    features: [],
    competitors: [],
    swot: {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: [],
    },
    marketData: {
      marketSize: '',
      growthRate: '',
      keyPlayers: [],
      trends: [],
      opportunities: [],
      challenges: [],
    },
    techAnalysis: {
      architecture: [],
      techStack: [],
      emergingTech: [],
      innovationPoints: [],
    },
    confidenceScore: 0,
    dataGaps: [],
  };

  console.log(`[Analyzer] 增量分析模式：共 ${rawFiles.length} 个文件，逐个处理`);

  // 更新进度
  await updateProgress(projectId, {
    stage: 'analyzing',
    step: `开始增量分析`,
    totalItems: filesToProcess.length + 3,
    completedItems: 0,
    currentItem: `处理 1/${filesToProcess.length} 个文件`,
  });

  // 逐个处理文件
  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];

    // 检查取消
    if (isCancelled()) {
      return {
        success: false,
        error: '分析被用户取消',
      };
    }

    // 限制单个文件内容大小（8b 模型需要更小的上下文）
    const maxContentLength = config.chunkSize;
    let content = file.content;
    if (content.length > maxContentLength) {
      content = content.slice(0, maxContentLength * 0.9) + '\n\n[内容已截断]';
    }

    console.log(`[Analyzer] 处理文件 ${i + 1}/${filesToProcess.length}: ${file.info.title}`);

    // 更新进度
    await updateProgress(projectId, {
      stage: 'analyzing',
      step: `分析文件 ${i + 1}/${filesToProcess.length}`,
      totalItems: filesToProcess.length + 3,
      completedItems: i,
      currentItem: file.info.title.substring(0, 30),
    });

    try {
      // 分析单个文件
      const singleAnalysis = await analyzeSingleFile(
        title,
        description || '',
        file.info.title,
        content,
        file.info.url
      );

      // 合并分析结果
      accumulatedAnalysis = mergeAnalysisResults(accumulatedAnalysis, singleAnalysis, file.info.url);

      console.log(`[Analyzer] 文件 ${i + 1} 分析完成，当前累计: ${accumulatedAnalysis.features?.length} 个功能, ${accumulatedAnalysis.competitors?.length} 个竞品`);

    } catch (error) {
      console.warn(`[Analyzer] 文件 ${i + 1} 分析失败:`, error);
      // 继续处理下一个文件
    }
  }

  // 更新进度：开始保存结果
  await updateProgress(projectId, {
    stage: 'analyzing',
    step: '保存分析结果',
    totalItems: filesToProcess.length + 3,
    completedItems: filesToProcess.length,
    currentItem: '保存文件...',
  });

  // 评估置信度（基于处理的文件数量）
  const fileCount = filesToProcess.length;
  const baseConfidence = accumulatedAnalysis.confidenceScore || 0;
  // 文件越多，置信度应该越高（但有上限）
  const adjustedConfidence = Math.min(0.95, baseConfidence + (fileCount > 3 ? 0.1 : 0));
  accumulatedAnalysis.confidenceScore = adjustedConfidence;

  // 将分析结果保存到文件
  const analysisFiles: string[] = [];
  const fullAnalysis = accumulatedAnalysis as AnalysisResult;

  if (projectPath) {
    // 保存功能分析
    const featuresContent = generateFeaturesReport(fullAnalysis.features);
    const featuresResult = fileService.saveAnalysisFile(projectPath, 'features', featuresContent, '功能分析');
    if (featuresResult.success && featuresResult.filePath) {
      analysisFiles.push(featuresResult.filePath);
    }

    // 保存竞品分析
    const competitorsContent = generateCompetitorsReport(fullAnalysis.competitors);
    const competitorsResult = fileService.saveAnalysisFile(projectPath, 'competitors', competitorsContent, '竞品分析');
    if (competitorsResult.success && competitorsResult.filePath) {
      analysisFiles.push(competitorsResult.filePath);
    }

    // 保存 SWOT 分析
    const swotContent = generateSwotReport(fullAnalysis.swot);
    const swotResult = fileService.saveAnalysisFile(projectPath, 'swot', swotContent, 'SWOT 分析');
    if (swotResult.success && swotResult.filePath) {
      analysisFiles.push(swotResult.filePath);
    }

    // 保存完整分析 JSON（包含所有维度）- 使用 summary 类型
    const fullAnalysisContent = generateFullAnalysisReport(fullAnalysis);
    const fullResult = fileService.saveAnalysisFile(projectPath, 'summary', fullAnalysisContent, '完整分析报告');
    if (fullResult.success && fullResult.filePath) {
      analysisFiles.push(fullResult.filePath);
    }

    // 更新文件状态
    fileService.updateProjectStatus(projectPath, 'analyzing');
  }

  // 评估数据质量
  const quality = evaluateDataQuality(fullAnalysis, rawFiles.length);

  // 计算质量评估分数
  const qualityAssessor = createQualityAssessor();
  const qualityAssessment = qualityAssessor.assess(fullAnalysis);

  // 将 qualityAssessment 添加到 fullAnalysis
  fullAnalysis.qualityAssessment = {
    dataCompletenessScore: qualityAssessment.completenessScore,
    sourceCredibilityScore: qualityAssessment.credibilityScore,
    visualizationCoverageScore: qualityAssessment.visualizationScore,
    overallQualityScore: qualityAssessment.overallScore,
    dataGaps: qualityAssessment.dataGaps,
    recommendations: qualityAssessment.recommendations,
  };

  // 更新进度：完成
  await updateProgress(projectId, {
    stage: 'analyzing',
    step: '分析完成',
    totalItems: rawFiles.length + 3,
    completedItems: rawFiles.length + 3,
    currentItem: `置信度: ${(adjustedConfidence * 100).toFixed(0)}%`,
  });

  console.log(`[Analyzer] 增量分析完成: ${fullAnalysis.features?.length} 个功能, ${fullAnalysis.competitors?.length} 个竞品, 置信度: ${(adjustedConfidence * 100).toFixed(0)}%`);

  return {
    success: true,
    analysis: fullAnalysis,
    dataQuality: quality,
    analysisFiles,
  };
}

/**
 * 批量分析模式（保留原有逻辑）
 */
async function executeBatchAnalysis(
  state: ResearchState,
  config: AnalyzerConfig,
  rawFiles: Array<{ id: string; content: string; info: { title: string; url: string } }>,
  fileService: FileStorageService,
  isCancelled: () => boolean
): Promise<AnalyzerResult> {
  const { projectId, title, description, projectPath } = state;

  // 更新进度
  await updateProgress(projectId, {
    stage: 'analyzing',
    step: '准备分析数据',
    totalItems: 5,
    completedItems: 1,
    currentItem: `${rawFiles.length} 个文件`,
  });

  // 检查取消
  if (isCancelled()) {
    return {
      success: false,
      error: '分析被用户取消',
    };
  }

  // 格式化为分析输入
  const formattedContent = formatFilesForAnalysis(title, description || '', rawFiles);

  // 更新进度
  await updateProgress(projectId, {
    stage: 'analyzing',
    step: '调用 LLM 进行分析',
    totalItems: 5,
    completedItems: 2,
    currentItem: 'LLM 分析中...',
  });

  // 调用 LLM 分析
  const analysis = await generateAnalysis(title, description || '', formattedContent);

  // 更新进度
  await updateProgress(projectId, {
    stage: 'analyzing',
    step: '保存分析结果',
    totalItems: 5,
    completedItems: 3,
    currentItem: '保存文件...',
  });

  // 将分析结果保存到文件
  const analysisFiles: string[] = [];

  if (projectPath) {
    // 保存功能分析
    const featuresContent = generateFeaturesReport(analysis.features);
    const featuresResult = fileService.saveAnalysisFile(projectPath, 'features', featuresContent, '功能分析');
    if (featuresResult.success && featuresResult.filePath) {
      analysisFiles.push(featuresResult.filePath);
    }

    // 保存竞品分析
    const competitorsContent = generateCompetitorsReport(analysis.competitors);
    const competitorsResult = fileService.saveAnalysisFile(projectPath, 'competitors', competitorsContent, '竞品分析');
    if (competitorsResult.success && competitorsResult.filePath) {
      analysisFiles.push(competitorsResult.filePath);
    }

    // 保存 SWOT 分析
    const swotContent = generateSwotReport(analysis.swot);
    const swotResult = fileService.saveAnalysisFile(projectPath, 'swot', swotContent, 'SWOT 分析');
    if (swotResult.success && swotResult.filePath) {
      analysisFiles.push(swotResult.filePath);
    }

    // 保存完整分析 - 使用 summary 类型
    const fullAnalysisContent = generateFullAnalysisReport(analysis);
    const fullResult = fileService.saveAnalysisFile(projectPath, 'summary', fullAnalysisContent, '完整分析报告');
    if (fullResult.success && fullResult.filePath) {
      analysisFiles.push(fullResult.filePath);
    }

    fileService.updateProjectStatus(projectPath, 'analyzing');
  }

  // 评估数据质量
  const quality = evaluateDataQuality(analysis, rawFiles.length);

  // 计算质量评估分数
  const qualityAssessor = createQualityAssessor();
  const qualityAssessment = qualityAssessor.assess(analysis);

  // 将 qualityAssessment 添加到 analysis
  analysis.qualityAssessment = {
    dataCompletenessScore: qualityAssessment.completenessScore,
    sourceCredibilityScore: qualityAssessment.credibilityScore,
    visualizationCoverageScore: qualityAssessment.visualizationScore,
    overallQualityScore: qualityAssessment.overallScore,
    dataGaps: qualityAssessment.dataGaps,
    recommendations: qualityAssessment.recommendations,
  };

  // 更新进度
  await updateProgress(projectId, {
    stage: 'analyzing',
    step: '分析完成',
    totalItems: 5,
    completedItems: 5,
    currentItem: `置信度: ${(analysis.confidenceScore * 100).toFixed(0)}%`,
  });

  return {
    success: true,
    analysis,
    dataQuality: quality,
    analysisFiles,
  };
}

/**
 * 分析单个文件（增量模式使用）
 */
async function analyzeSingleFile(
  title: string,
  description: string,
  fileTitle: string,
  content: string,
  sourceUrl: string
): Promise<Partial<AnalysisResult>> {
  const prompt = SINGLE_FILE_ANALYSIS_PROMPT
    .replace('{title}', title)
    .replace('{description}', description)
    .replace('{fileTitle}', fileTitle)
    .replace('{content}', content);

  // 调用 LLM 生成 JSON 响应
  const responseText = await generateText(prompt);

  // 解析 JSON（带更详细的错误处理）
  let response: Record<string, unknown>;
  try {
    const jsonContent = responseText
      .match(/```json\s*([\s\S]*?)\s*```/)?.[1]
      || responseText.match(/\{[\s\S]*\}/)?.[0]
      || responseText;

    if (!jsonContent || jsonContent.trim().length < 10) {
      throw new Error('LLM 返回内容为空或过短');
    }

    response = JSON.parse(jsonrepair(jsonContent));
  } catch (parseError) {
    // 如果 JSON 解析失败，记录错误并返回空结果
    // 注意：不尝试正则提取，因为不可靠
    const errorMsg = parseError instanceof Error ? parseError.message : '未知错误';
    console.warn(`[Analyzer] JSON 解析失败: ${errorMsg}`);

    // 返回空结果，让增量模式继续处理下一个文件
    return {
      features: [],
      competitors: [],
      swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      marketData: { marketSize: '', growthRate: '', keyPlayers: [], trends: [], opportunities: [], challenges: [] },
      techAnalysis: { architecture: [], techStack: [], emergingTech: [], innovationPoints: [] },
      confidenceScore: 0.2,
      dataGaps: [`文件分析失败: ${errorMsg.substring(0, 50)}`],
    };
  }

  // 提取结果
  const features = (response.features || []) as Array<{ name: string; description?: string }>;
  const competitors = (response.competitors || []) as Array<{ name: string; industry?: string; features?: string[]; description?: string; marketPosition?: string }>;
  const swot = (response.swot || {}) as Record<string, unknown[]>;
  const marketData = (response.marketData || {}) as Record<string, unknown>;
  const techStack = (response.techStack || {}) as Record<string, unknown[]>;

  // 过滤并格式化功能
  const validFeatures = features
    .filter((f) => {
      const name = f.name?.trim();
      return name && name.length >= 2 && name.length <= 30 && !name.includes('|');
    })
    .map((f) => ({
      name: f.name.replace(/^[\*\s]+/, '').trim(),
      count: 1,
      sources: [sourceUrl],
      description: f.description || '',
    }));

  // 过滤并格式化竞品
  const validCompetitors = competitors
    .filter((c) => {
      const name = c.name?.trim();
      return name && name.length >= 2 && name.length <= 30 && !name.includes('|');
    })
    .map((c) => ({
      name: c.name.replace(/^[\*\s]+/, '').trim(),
      industry: c.industry || '',
      features: c.features || [],
      description: c.description || '',
      marketPosition: c.marketPosition || '',
    }));

  return {
    features: validFeatures,
    competitors: validCompetitors,
    swot: {
      strengths: ((swot.strengths as string[]) || []),
      weaknesses: ((swot.weaknesses as string[]) || []),
      opportunities: ((swot.opportunities as string[]) || []),
      threats: ((swot.threats as string[]) || []),
    },
    marketData: {
      marketSize: ((marketData.marketSize as string) || ''),
      growthRate: ((marketData.growthRate as string) || ''),
      keyPlayers: ((marketData.keyPlayers as string[]) || []),
      trends: ((marketData.trends as string[]) || []),
      opportunities: ((marketData.opportunities as string[]) || []),
      challenges: ((marketData.challenges as string[]) || []),
    },
    techAnalysis: {
      architecture: ((techStack.architecture as string[]) || []),
      techStack: ((techStack.techStack as string[]) || []),
      emergingTech: ((techStack.emergingTech as string[]) || []),
      innovationPoints: ((techStack.innovationPoints as string[]) || []),
    },
    confidenceScore: (response.confidenceScore as number) || 0.6,
    dataGaps: (response.dataGaps as string[]) || [],
  };
}

/**
 * 合并两个分析结果（增量模式使用）
 */
function mergeAnalysisResults(
  existing: Partial<AnalysisResult>,
  newResult: Partial<AnalysisResult>,
  _sourceUrl: string
): Partial<AnalysisResult> {
  // 合并功能（按名称去重，合并来源）
  const featureMap = new Map<string, AnalysisResult['features'][0]>();

  // 添加现有功能
  const existingFeatures = existing.features || [];
  for (const f of existingFeatures) {
    featureMap.set(f.name.toLowerCase(), f);
  }

  // 添加新功能
  const newFeatures = newResult.features || [];
  for (const f of newFeatures) {
    const key = f.name.toLowerCase();
    if (featureMap.has(key)) {
      // 已存在，合并来源并增加计数
      const existingFeature = featureMap.get(key)!;
      existingFeature.count = (existingFeature.count || 1) + 1;
      // 合并来源 URL
      const existingSources = new Set(existingFeature.sources || []);
      for (const src of (f.sources || [])) {
        existingSources.add(src);
      }
      existingFeature.sources = Array.from(existingSources);
    } else {
      // 新功能
      featureMap.set(key, f);
    }
  }

  // 合并竞品（按名称去重）
  const competitorMap = new Map<string, AnalysisResult['competitors'][0]>();

  const existingCompetitors = existing.competitors || [];
  for (const c of existingCompetitors) {
    competitorMap.set(c.name.toLowerCase(), c);
  }

  const newCompetitors = newResult.competitors || [];
  for (const c of newCompetitors) {
    const key = c.name.toLowerCase();
    if (!competitorMap.has(key)) {
      competitorMap.set(key, c);
    }
  }

  // 合并 SWOT（直接追加）
  const existingSwot = existing.swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] };
  const newSwot = newResult.swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] };

  const mergedSwot = {
    strengths: [...new Set([...(existingSwot.strengths || []), ...(newSwot.strengths || [])])],
    weaknesses: [...new Set([...(existingSwot.weaknesses || []), ...(newSwot.weaknesses || [])])],
    opportunities: [...new Set([...(existingSwot.opportunities || []), ...(newSwot.opportunities || [])])],
    threats: [...new Set([...(existingSwot.threats || []), ...(newSwot.threats || [])])],
  };

  // 合并市场数据
  const emptyMarketData: AnalysisResult['marketData'] = {
    marketSize: '',
    growthRate: '',
    keyPlayers: [],
    trends: [],
    opportunities: [],
    challenges: [],
  };
  const existingMarket = (existing.marketData || emptyMarketData);
  const newMarket = (newResult.marketData || emptyMarketData);

  return {
    features: Array.from(featureMap.values()),
    competitors: Array.from(competitorMap.values()),
    swot: mergedSwot,
    marketData: {
      marketSize: existingMarket.marketSize || newMarket.marketSize || '',
      growthRate: existingMarket.growthRate || newMarket.growthRate || '',
      keyPlayers: [...new Set([...(existingMarket.keyPlayers || []), ...(newMarket.keyPlayers || [])])],
      trends: [...new Set([...(existingMarket.trends || []), ...(newMarket.trends || [])])],
      opportunities: [...new Set([...(existingMarket.opportunities || []), ...(newMarket.opportunities || [])])],
      challenges: [...new Set([...(existingMarket.challenges || []), ...(newMarket.challenges || [])])],
    },
    techAnalysis: {
      architecture: [...new Set([...(existing.techAnalysis?.architecture || []), ...(newResult.techAnalysis?.architecture || [])])],
      techStack: [...new Set([...(existing.techAnalysis?.techStack || []), ...(newResult.techAnalysis?.techStack || [])])],
      emergingTech: [...new Set([...(existing.techAnalysis?.emergingTech || []), ...(newResult.techAnalysis?.emergingTech || [])])],
      innovationPoints: [...new Set([...(existing.techAnalysis?.innovationPoints || []), ...(newResult.techAnalysis?.innovationPoints || [])])],
    },
    confidenceScore: ((existing.confidenceScore || 0) + (newResult.confidenceScore || 0)) / 2,
    dataGaps: [...new Set([...(existing.dataGaps || []), ...(newResult.dataGaps || [])])],
  };
}

/**
 * 将文件格式化为分析输入
 */
function formatFilesForAnalysis(
  title: string,
  description: string,
  files: Array<{ id: string; content: string; info: { title: string; url: string } }>
): string {
  let content = `# 研究主题: ${title}\n`;
  content += `> 描述: ${description}\n\n`;
  content += `---\n\n`;
  content += `## 原始文件内容\n\n`;

  for (const file of files) {
    content += `### [${file.id}] ${file.info.title}\n`;
    content += `> 来源: ${file.info.url}\n\n`;
    content += `${file.content}\n\n`;
    content += `---\n\n`;
  }

  return content;
}

/**
 * 使用 LLM 生成深度分析
 */
async function generateAnalysis(
  title: string,
  description: string,
  content: string
): Promise<AnalysisResult> {
  const prompt = DETAILED_ANALYSIS_PROMPT
    .replace('{title}', title)
    .replace('{description}', description || '无产品描述')
    .replace('{extractedContent}', content);

  // 调用 LLM 生成 JSON 响应
  const responseText = await generateText(prompt);

  // 使用 jsonrepair 解析 JSON（支持 LLM 返回的各种格式）
  let response: Record<string, unknown>;
  try {
    const jsonContent = responseText
      .match(/```json\s*([\s\S]*?)\s*```/)?.[1]
      || responseText.match(/\{[\s\S]*\}/)?.[0]
      || responseText;
    response = JSON.parse(jsonrepair(jsonContent));
  } catch (parseError) {
    throw new Error(`无法解析 LLM 响应为 JSON: ${(parseError as Error).message}`);
  }

  // 类型安全的响应解析 - 深度分析版本
  const features = (response.features || []) as Array<{
    name: string;
    count?: number;
    sources?: string[];
    description?: string;
  }>;
  const competitors = (response.competitors || []) as Array<{
    name: string;
    industry?: string;
    features?: string[];
    description?: string;
    marketPosition?: string;
  }>;
  const swot = (response.swot || {}) as Record<string, unknown>;
  const marketData = (response.marketData || {}) as Record<string, unknown>;
  const useCases = (response.useCases || {}) as Record<string, unknown>;
  const techStack = (response.techStack || {}) as Record<string, unknown>;
  const recommendations = (response.recommendations || {}) as Record<string, unknown>;
  const dataGaps = (response.dataGaps || []) as string[];

  // 过滤无效的功能名称
  const validFeatures = features
    .filter((f) => {
      const name = f.name?.trim();
      if (!name || name.length < 2 || name.length > 30) return false;
      if (name.includes('|') || name.includes('---')) return false;
      if (/^[*#\-|\s\d]+$/.test(name)) return false;
      return true;
    })
    .map((f) => ({
      name: f.name.replace(/^[\*\s]+/, '').trim(),
      count: f.count || 1,
      sources: f.sources || [],
      description: f.description || '',
    }));

  // 过滤无效的竞品名称
  const validCompetitors = competitors
    .filter((c) => {
      const name = c.name?.trim();
      if (!name || name.length < 2 || name.length > 30) return false;
      if (name.includes('|') || name.includes('---')) return false;
      if (/^[*#\-|\s\d]+$/.test(name)) return false;
      return true;
    })
    .map((c) => ({
      name: c.name.replace(/^[\*\s]+/, '').trim(),
      industry: c.industry || '',
      features: c.features || [],
      description: c.description || '',
      marketPosition: c.marketPosition || '',
    }));

  return {
    features: validFeatures,
    competitors: validCompetitors,
    swot: {
      strengths: (swot.strengths as string[]) || [],
      weaknesses: (swot.weaknesses as string[]) || [],
      opportunities: (swot.opportunities as string[]) || [],
      threats: (swot.threats as string[]) || [],
    },
    marketData: {
      marketSize: (marketData.marketSize as string) || '',
      growthRate: (marketData.growthRate as string) || '',
      keyPlayers: (marketData.keyPlayers as string[]) || [],
      trends: (marketData.trends as string[]) || [],
      opportunities: (marketData.opportunities as string[]) || [],
      challenges: (marketData.challenges as string[]) || [],
    },
    techAnalysis: {
      architecture: ((techStack.architecture as string[]) || []),
      techStack: ((techStack.techStack as string[]) || []),
      emergingTech: ((techStack.emergingTech as string[]) || []),
      innovationPoints: ((techStack.innovationPoints as string[]) || []),
    },
    confidenceScore: (response.confidenceScore as number) || 0.5,
    dataGaps,
  };
}

/**
 * 生成功能分析报告
 */
function generateFeaturesReport(features: AnalysisResult['features']): string {
  let content = `# 功能分析报告\n\n`;
  content += `共识别出 ${features.length} 个核心功能\n\n`;

  content += `| 功能 | 出现次数 | 描述 |\n`;
  content += `|------|---------|------|\n`;
  for (const feature of features) {
    content += `| ${feature.name} | ${feature.count} | ${feature.description || '-'} |\n`;
  }

  return content;
}

/**
 * 生成竞品分析报告
 */
function generateCompetitorsReport(competitors: AnalysisResult['competitors']): string {
  let content = `# 竞品分析报告\n\n`;
  content += `共识别出 ${competitors.length} 个主要竞品\n\n`;

  content += `| 竞品 | 行业 | 核心功能 | 市场定位 |\n`;
  content += `|------|------|---------|---------|\n`;
  for (const comp of competitors) {
    content += `| ${comp.name} | ${comp.industry || '-'} | ${comp.features.slice(0, 3).join(', ')} | ${comp.marketPosition || '-'} |\n`;
  }

  return content;
}

/**
 * 生成 SWOT 分析报告
 */
function generateSwotReport(swot: AnalysisResult['swot']): string {
  let content = `# SWOT 分析报告\n\n`;

  content += `## 优势 (Strengths)\n\n`;
  for (const item of swot.strengths) {
    content += `- ${item}\n`;
  }

  content += `\n## 劣势 (Weaknesses)\n\n`;
  for (const item of swot.weaknesses) {
    content += `- ${item}\n`;
  }

  content += `\n## 机会 (Opportunities)\n\n`;
  for (const item of swot.opportunities) {
    content += `- ${item}\n`;
  }

  content += `\n## 威胁 (Threats)\n\n`;
  for (const item of swot.threats) {
    content += `- ${item}\n`;
  }

  return content;
}

/**
 * 生成完整分析报告
 */
function generateFullAnalysisReport(analysis: AnalysisResult): string {
  let content = `# 完整分析报告\n\n`;

  content += `## 数据概览\n\n`;
  content += `- 功能数量: ${analysis.features.length}\n`;
  content += `- 竞品数量: ${analysis.competitors.length}\n`;
  content += `- 置信度: ${(analysis.confidenceScore * 100).toFixed(0)}%\n\n`;

  content += `## 核心功能\n\n`;
  content += `| 功能 | 出现次数 | 描述 | 来源 |\n`;
  content += `|------|---------|------|------|\n`;
  for (const feature of analysis.features) {
    const sources = feature.sources?.slice(0, 2).join(', ') || '-';
    content += `| ${feature.name} | ${feature.count} | ${feature.description || '-'} | ${sources} |\n`;
  }

  content += `\n## 竞品分析\n\n`;
  content += `| 竞品 | 行业 | 核心功能 | 市场定位 |\n`;
  content += `|------|------|---------|---------|\n`;
  for (const comp of analysis.competitors) {
    content += `| ${comp.name} | ${comp.industry || '-'} | ${comp.features.slice(0, 3).join(', ')} | ${comp.marketPosition || '-'} |\n`;
  }

  content += `\n## SWOT 分析\n\n`;
  content += `### 优势 (Strengths)\n`;
  for (const item of analysis.swot.strengths) {
    content += `- ${item}\n`;
  }

  content += `\n### 劣势 (Weaknesses)\n`;
  for (const item of analysis.swot.weaknesses) {
    content += `- ${item}\n`;
  }

  content += `\n### 机会 (Opportunities)\n`;
  for (const item of analysis.swot.opportunities) {
    content += `- ${item}\n`;
  }

  content += `\n### 威胁 (Threats)\n`;
  for (const item of analysis.swot.threats) {
    content += `- ${item}\n`;
  }

  content += `\n## 市场数据\n\n`;
  if (analysis.marketData.marketSize) {
    content += `- 市场规模: ${analysis.marketData.marketSize}\n`;
  }
  if (analysis.marketData.growthRate) {
    content += `- 增长率: ${analysis.marketData.growthRate}\n`;
  }
  if (analysis.marketData.keyPlayers.length > 0) {
    content += `- 主要玩家: ${analysis.marketData.keyPlayers.join(', ')}\n`;
  }
  if (analysis.marketData.trends.length > 0) {
    content += `- 发展趋势: ${analysis.marketData.trends.join(', ')}\n`;
  }
  if (analysis.marketData.opportunities.length > 0) {
    content += `- 市场机会: ${analysis.marketData.opportunities.join(', ')}\n`;
  }
  if (analysis.marketData.challenges.length > 0) {
    content += `- 市场挑战: ${analysis.marketData.challenges.join(', ')}\n`;
  }

  content += `\n## 技术栈\n\n`;
  const tech = analysis.techAnalysis || { architecture: [], techStack: [], emergingTech: [], innovationPoints: [] };
  if (tech.architecture.length > 0) {
    content += `- 架构: ${tech.architecture.join(', ')}\n`;
  }
  if (tech.techStack.length > 0) {
    content += `- 技术栈: ${tech.techStack.join(', ')}\n`;
  }
  if (tech.emergingTech.length > 0) {
    content += `- 新兴技术: ${tech.emergingTech.join(', ')}\n`;
  }
  if (tech.innovationPoints.length > 0) {
    content += `- 创新点: ${tech.innovationPoints.join(', ')}\n`;
  }

  if (analysis.dataGaps.length > 0) {
    content += `\n## 数据缺口\n\n`;
    for (const gap of analysis.dataGaps) {
      content += `- ${gap}\n`;
    }
  }

  return content;
}

/**
 * 评估数据质量
 */
function evaluateDataQuality(
  analysis: AnalysisResult,
  fileCount: number
): AnalyzerResult['dataQuality'] {
  const issues: string[] = [];
  const missingDimensions: string[] = [];
  let score = 100;

  // 检查功能数量
  if (analysis.features.length < 3) {
    issues.push(`功能识别不足: ${analysis.features.length}/3`);
    missingDimensions.push('features');
    score -= 15;
  }

  // 检查竞品数量
  if (analysis.competitors.length < 2) {
    issues.push(`竞品识别不足: ${analysis.competitors.length}/2`);
    missingDimensions.push('competitors');
    score -= 15;
  }

  // 检查 SWOT 完整性
  if (analysis.swot.strengths.length === 0) {
    issues.push('SWOT 优势为空');
    missingDimensions.push('swot_strengths');
    score -= 10;
  }
  if (analysis.swot.opportunities.length === 0) {
    issues.push('SWOT 机会为空');
    missingDimensions.push('swot_opportunities');
    score -= 10;
  }

  // 检查置信度
  if (analysis.confidenceScore < 0.5) {
    issues.push(`置信度过低: ${(analysis.confidenceScore * 100).toFixed(0)}%`);
    score -= 20;
  }

  return {
    isComplete: score >= 60,
    score: Math.max(0, score),
    issues,
    missingDimensions,
  };
}

// ============================================================
// 导出
// ============================================================

export { executeAnalysis, createAnalyzerAgent };
