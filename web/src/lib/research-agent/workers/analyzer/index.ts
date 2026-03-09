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
import type { AnalysisResult, QualityMetrics } from '../../types';
import { createPhaseController } from '../../prompts/analyzer/phase-controller';
import { getLLMConfig } from '../../../llm';
import { updateProgress } from '../../progress/tracker';
import { createCancelCheck } from '../../cancellation/handler';
import { getFileStorageService, type FileStorageService } from '@/lib/file-storage';
import { createQualityAssessor } from './quantitative/quality-assessor';
import { evaluateQuality, qualityGateDecision } from '../../quality/scorer';

/**
 * 安全地将 LLM 返回的值转换为字符串
 * LLM 有时会返回对象（如 { value: "16%", period: "2024-2031" }）而非字符串
 */
function safeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    // 尝试从常见属性中提取有意义的值
    const obj = value as Record<string, unknown>;
    if (typeof obj.value === 'string') return obj.value;
    if (typeof obj.rate === 'string') return obj.rate;
    if (typeof obj.amount === 'string') return obj.amount;
    if (typeof obj.size === 'string') return obj.size;
    if (typeof obj.description === 'string') return obj.description;
    if (typeof obj.text === 'string') return obj.text;
    if (typeof obj.name === 'string') return obj.name;
    // 最后尝试 JSON 序列化（截断过长的内容）
    try {
      const json = JSON.stringify(value);
      return json.length > 200 ? json.substring(0, 200) + '...' : json;
    } catch {
      return '';
    }
  }
  return String(value);
}

/**
 * 安全地将 LLM 返回的数组元素转换为字符串数组
 */
function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => safeString(item)).filter(s => s.length > 0);
}

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
  /** 是否使用多阶段分析模式 */
  usePhaseMode: boolean;
}

/** 默认配置 - 多阶段分析模式 */
const DEFAULT_CONFIG: AnalyzerConfig = {
  useLLM: true,
  chunkSize: 8000,
  minConfidenceScore: 0.5,
  usePhaseMode: true,
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
  qualityMetrics?: QualityMetrics;
  shouldRestart?: boolean;
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
    // 使用多阶段分析模式
    return await executePhaseAnalysis(state, config, rawFiles, fileService, isCancelled);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '分析执行失败',
    };
  }
}



/**
 * 多阶段分析模式
 * 使用 Phase Controller 分别执行各个分析维度
 */
async function executePhaseAnalysis(
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
    step: '多阶段分析',
    totalItems: 5,
    completedItems: 2,
    currentItem: 'LLM 多阶段分析...',
  });

  // 创建阶段控制器
  const phaseController = createPhaseController({
    maxRetries: 3,
  });

  // 执行阶段分析
  const phaseContext = {
    title,
    description: description || '',
    extractedContent: formattedContent,
  };

  const phaseResults = await phaseController.executePhases(phaseContext);

  // 检查取消
  if (isCancelled()) {
    return {
      success: false,
      error: '分析被用户取消',
    };
  }

  // 合并结果
  const analysis = phaseController.mergeResults(phaseResults) as AnalysisResult;

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
    if (analysis.features && analysis.features.length > 0) {
      const featuresContent = generateFeaturesReport(analysis.features);
      const featuresResult = fileService.saveAnalysisFile(projectPath, 'features', featuresContent, '功能分析');
      if (featuresResult.success && featuresResult.filePath) {
        analysisFiles.push(featuresResult.filePath);
      }
    }

    // 保存竞品分析
    if (analysis.competitors && analysis.competitors.length > 0) {
      const competitorsContent = generateCompetitorsReport(analysis.competitors);
      const competitorsResult = fileService.saveAnalysisFile(projectPath, 'competitors', competitorsContent, '竞品分析');
      if (competitorsResult.success && competitorsResult.filePath) {
        analysisFiles.push(competitorsResult.filePath);
      }
    }

    // 保存 SWOT 分析
    if (analysis.swot) {
      const swotContent = generateSwotReport(analysis.swot);
      const swotResult = fileService.saveAnalysisFile(projectPath, 'swot', swotContent, 'SWOT 分析');
      if (swotResult.success && swotResult.filePath) {
        analysisFiles.push(swotResult.filePath);
      }
    }

    // 保存完整分析
    const fullAnalysis = generateFullAnalysisReport(analysis);
    const fullResult = fileService.saveAnalysisFile(projectPath, 'summary', fullAnalysis, '完整分析');
    if (fullResult.success && fullResult.filePath) {
      analysisFiles.push(fullResult.filePath);
    }
  }

  // 更新进度
  await updateProgress(projectId, {
    stage: 'analyzing',
    step: '分析完成',
    totalItems: 5,
    completedItems: 5,
    currentItem: '完成',
  });

  // 执行质量门禁检查
  const qualityMetrics = evaluateQuality(
    state.searchResults || [],
    state.extractedContent || [],
    analysis,
    state.title,
    state.searchPlan?.researchDimensions || []
  );

  const gateResult = qualityGateDecision(qualityMetrics.overallScore);

  console.log(`[Analyzer] 质量门禁结果: ${gateResult.action} (评分: ${qualityMetrics.overallScore})`);

  if (gateResult.shouldWarn) {
    console.warn(`[Analyzer] 质量警告: ${gateResult.reason}`);
  }

  // 将质量指标保存到状态
  (state as any).qualityMetrics = qualityMetrics;

  return {
    success: true,
    analysis,
    analysisFiles,
    qualityMetrics,
    shouldRestart: gateResult.action === 'restart',
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
