/**
 * Analyzer Agent
 *
 * 负责深度分析的 Agent
 *
 * 功能：
 * 1. 分析提取的内容
 * 2. 识别功能和竞品
 * 3. 生成 SWOT 分析
 * 4. 评估数据质量
 */

import type { ResearchState } from '../../state';
import type { AnalysisResult, ExtractionResult } from '../../types';
import {
  COMPETITOR_ANALYSIS_PROMPT,
  compressExtractedContent,
  formatContentForAnalysis,
} from '../../prompts/analyzer';
import { generateText, getLLMConfig } from '../../../llm';
import { updateProgress } from '../../progress/tracker';
import { createCancelCheck } from '../../cancellation/handler';

/**
 * Analyzer Agent 配置
 */
export interface AnalyzerConfig {
  /** 是否使用 LLM 分析 */
  useLLM: boolean;
  /** 内容压缩最大长度 */
  maxCompressedLength: number;
  /** 最小置信度阈值 */
  minConfidenceScore: number;
}

/** 默认配置 */
const DEFAULT_CONFIG: AnalyzerConfig = {
  useLLM: true,
  maxCompressedLength: 30000,
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
 */
async function executeAnalysis(
  state: ResearchState,
  config: AnalyzerConfig
): Promise<AnalyzerResult> {
  const { projectId, title, description, extractedContent } = state;

  if (extractedContent.length === 0) {
    return {
      success: false,
      error: '没有可分析的内容',
    };
  }

  // 创建取消检查
  const isCancelled = createCancelCheck(projectId);

  try {
    // 更新进度
    await updateProgress(projectId, {
      stage: 'analyzing',
      step: '准备分析数据',
      totalItems: 4,
      completedItems: 0,
      currentItem: `${extractedContent.length} 个页面`,
    });

    // 检查是否使用 LLM
    const llmConfig = getLLMConfig();
    const hasApiKey = !!llmConfig.apiKey;

    if (!config.useLLM || !hasApiKey) {
      // 使用规则引擎分析
      const result = ruleBasedAnalysis(extractedContent);

      await updateProgress(projectId, {
        stage: 'analyzing',
        step: '分析完成',
        totalItems: 4,
        completedItems: 4,
        currentItem: '规则引擎分析',
      });

      return {
        success: true,
        analysis: result.analysis,
        dataQuality: result.dataQuality,
      };
    }

    // 更新进度
    await updateProgress(projectId, {
      stage: 'analyzing',
      step: '压缩和整理内容',
      totalItems: 4,
      completedItems: 1,
      currentItem: '压缩中...',
    });

    // 检查取消
    if (isCancelled()) {
      return {
        success: false,
        error: '分析被用户取消',
      };
    }

    // 压缩内容
    const formattedContent = formatContentForAnalysis(
      title,
      description,
      extractedContent.map((e) => ({
        ...e,
        content: compressExtractedContent(e.content, config.maxCompressedLength),
      }))
    );

    // 更新进度
    await updateProgress(projectId, {
      stage: 'analyzing',
      step: '调用 LLM 进行分析',
      totalItems: 4,
      completedItems: 2,
      currentItem: 'LLM 分析中...',
    });

    // 检查取消
    if (isCancelled()) {
      return {
        success: false,
        error: '分析被用户取消',
      };
    }

    // 调用 LLM 分析
    const analysis = await generateAnalysis(title, description || '', formattedContent);

    // 更新进度
    await updateProgress(projectId, {
      stage: 'analyzing',
      step: '分析完成',
      totalItems: 4,
      completedItems: 4,
      currentItem: `置信度: ${(analysis.confidenceScore * 100).toFixed(0)}%`,
    });

    // 评估数据质量
    const quality = evaluateDataQuality(analysis, extractedContent.length);

    return {
      success: true,
      analysis,
      dataQuality: quality,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '分析执行失败',
    };
  }
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

  // 过滤无效的功能名称：
  // - 长度在 2-20 字符之间
  // - 不是表格分隔符（含有 |、---）
  // - 不以特殊符号开头
  // - 不是纯符号或数字
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
 * 规则引擎分析（无 LLM 时使用）
 */
function ruleBasedAnalysis(
  extractions: ExtractionResult[]
): { analysis: AnalysisResult; dataQuality: AnalyzerResult['dataQuality'] } {
  // 合并所有提取的实体
  const allFeatures = new Map<string, number>();
  const allCompetitors = new Map<string, string>();
  const allTechStack = new Set<string>();

  for (const ext of extractions) {
    for (const feature of ext.metadata.features) {
      allFeatures.set(feature, (allFeatures.get(feature) || 0) + 1);
    }

    for (const comp of ext.metadata.competitors) {
      if (!allCompetitors.has(comp)) {
        allCompetitors.set(comp, ext.url);
      }
    }

    for (const tech of ext.metadata.techStack) {
      allTechStack.add(tech);
    }
  }

  // 构建功能列表
  const features = Array.from(allFeatures.entries())
    .map(([name, count]) => ({
      name,
      count,
      sources: [] as string[],
      description: '',
    }))
    .sort((a, b) => b.count - a.count);

  // 构建竞品列表
  const competitors = Array.from(allCompetitors.entries()).map(([name, url]) => ({
    name,
    industry: '',
    features: [],
    description: '',
    marketPosition: '',
  }));

  const analysis: AnalysisResult = {
    features,
    competitors,
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
    },
    confidenceScore: 0.3,
    dataGaps: ['需要 LLM 进行深度分析'],
  };

  const dataQuality: AnalyzerResult['dataQuality'] = {
    isComplete: features.length >= 3 && competitors.length >= 2,
    score: Math.min(50, features.length * 5 + competitors.length * 10),
    issues: features.length < 3 ? ['功能提取不足'] : [],
    missingDimensions: ['SWOT 分析', '市场数据', '技术分析'],
  };

  return { analysis, dataQuality };
}

/**
 * 评估数据质量
 */
function evaluateDataQuality(
  analysis: AnalysisResult,
  contentCount: number
): AnalyzerResult['dataQuality'] {
  const issues: string[] = [];
  let score = 100;

  // 检查功能数量
  if (analysis.features.length < 3) {
    issues.push('功能分析不足');
    score -= 15;
  }

  // 检查竞品数量
  if (analysis.competitors.length < 2) {
    issues.push('竞品分析不足');
    score -= 15;
  }

  // 检查 SWOT 完整性
  const swotCount =
    analysis.swot.strengths.length +
    analysis.swot.weaknesses.length +
    analysis.swot.opportunities.length +
    analysis.swot.threats.length;

  if (swotCount < 4) {
    issues.push('SWOT 分析不完整');
    score -= 10;
  }

  // 检查置信度
  if (analysis.confidenceScore < 0.5) {
    issues.push('分析置信度过低');
    score -= 20;
  }

  // 检查数据缺口
  const missingCount = analysis.dataGaps.length;
  if (missingCount > 0) {
    score -= missingCount * 5;
  }

  return {
    isComplete: score >= 60 && issues.length <= 2,
    score: Math.max(0, score),
    issues,
    missingDimensions: analysis.dataGaps,
  };
}

// ============================================================
// 导出
// ============================================================

export { executeAnalysis, createAnalyzerAgent };
