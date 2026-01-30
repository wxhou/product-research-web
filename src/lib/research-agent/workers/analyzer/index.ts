/**
 * Analyzer Agent
 *
 * 负责深度分析的 Agent
 *
 * 功能：
 * 1. 读取爬取的原始 Markdown 文件
 * 2. 使用 LLM 分析内容
 * 3. 生成功能、竞品、SWOT 分析
 * 4. 将分析结果保存到文件
 */

import type { ResearchState } from '../../state';
import type { AnalysisResult } from '../../types';
import { COMPETITOR_ANALYSIS_PROMPT } from '../../prompts/analyzer';
import { generateText, getLLMConfig } from '../../../llm';
import { updateProgress } from '../../progress/tracker';
import { createCancelCheck } from '../../cancellation/handler';
import { getFileStorageService, type FileStorageService } from '@/lib/file-storage';

/**
 * Analyzer Agent 配置
 */
export interface AnalyzerConfig {
  /** 是否使用 LLM 分析 */
  useLLM: boolean;
  /** 内容分块大小 */
  chunkSize: number;
  /** 最小置信度阈值 */
  minConfidenceScore: number;
}

/** 默认配置 */
const DEFAULT_CONFIG: AnalyzerConfig = {
  useLLM: true,
  chunkSize: 15000,  // 每个块 15KB
  minConfidenceScore: 0.5,
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
 * 主执行函数：执行分析
 *
 * 流程：
 * 1. 从文件系统读取原始 Markdown 文件
 * 2. 格式化为分析输入
 * 3. 调用 LLM 进行分析
 * 4. 将分析结果保存到文件
 * 5. 返回结构化分析结果
 */
async function executeAnalysis(
  state: ResearchState,
  config: AnalyzerConfig
): Promise<AnalyzerResult> {
  const { projectId, title, description, projectPath } = state;

  // 如果有项目路径，优先从文件读取
  const fileService = getFileStorageService();

  if (!projectPath) {
    return {
      success: false,
      error: '缺少项目路径，无法读取文件',
    };
  }

  // 创建取消检查
  const isCancelled = createCancelCheck(projectId);

  try {
    // 更新进度
    await updateProgress(projectId, {
      stage: 'analyzing',
      step: '读取原始文件',
      totalItems: 5,
      completedItems: 0,
      currentItem: '加载中...',
    });

    // 读取所有原始文件
    const rawFiles = fileService.readAllRawFiles(projectPath);

    if (rawFiles.length === 0) {
      return {
        success: false,
        error: '没有可分析的文件',
      };
    }

    // 更新进度
    await updateProgress(projectId, {
      stage: 'analyzing',
      step: '准备分析数据',
      totalItems: 5,
      completedItems: 1,
      currentItem: `${rawFiles.length} 个文件`,
    });

    // 检查是否使用 LLM
    const llmConfig = getLLMConfig();
    const hasApiKey = !!llmConfig.apiKey;

    if (!config.useLLM || !hasApiKey) {
      return {
        success: false,
        error: 'LLM 不可用，无法执行分析',
      };
    }

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

    // 更新文件状态
    fileService.updateProjectStatus(projectPath, 'analyzing');

    // 评估数据质量
    const quality = evaluateDataQuality(analysis, rawFiles.length);

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
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '分析执行失败',
    };
  }
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
 * 使用 LLM 生成分析
 */
async function generateAnalysis(
  title: string,
  description: string,
  content: string
): Promise<AnalysisResult> {
  const prompt = COMPETITOR_ANALYSIS_PROMPT
    .replace('{title}', title)
    .replace('{description}', description)
    .replace('{extractedContent}', content);

  // 调用 LLM 生成 JSON 响应
  const responseText = await generateText(prompt);

  // 解析 JSON 响应
  let response: Record<string, unknown>;
  try {
    // 尝试直接解析
    response = JSON.parse(responseText);
  } catch {
    // 如果直接解析失败，尝试提取 JSON 代码块
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

  // 类型安全的响应解析
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
  const dataGaps = (response.dataGaps || []) as string[];

  // 过滤无效的功能名称
  const validFeatures = features
    .filter((f) => {
      const name = f.name?.trim();
      if (!name || name.length < 2 || name.length > 20) return false;
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
