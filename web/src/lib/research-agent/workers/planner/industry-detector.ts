/**
 * 行业判断模块
 *
 * 使用 LLM 自动分析产品信息，确定行业方向并生成行业特定搜索维度
 */

import { generateText } from '@/lib/llm';
import { parseJsonFromLLM } from '@/lib/json-utils';
import { calculateClarityScore, type ResearchIntent } from './user-input-parser';

/**
 * 行业判断输入
 */
export interface IndustryDetectionInput {
  title: string;
  description?: string;
  keywords: string[];
}

/**
 * 行业判断输出
 */
export interface IndustryDetectionOutput {
  detectedIndustry: string;
  confidence: number;
  reasoning: string;
  researchDimensions: string[];
  relatedIndustries?: string[];
  /** 是否为用户修正的结果 */
  isUserCorrected?: boolean;
  /** 原始检测结果（如果经过用户修正） */
  originalDetection?: IndustryDetectionOutput;
  /** 意图分析结果 */
  intent?: ResearchIntent;
  /** 关键词列表 */
  keywords?: string[];
  /** 核心主题 */
  coreTheme?: string;
  /** 清晰度分数 */
  clarityScore?: number;
}

/**
 * 行业维度映射表
 */
const INDUSTRY_DIMENSION_MAPPING: Record<string, string[]> = {
  // B2B SaaS
  'B2B SaaS': [
    '市场定位', '核心功能', '定价策略', '客户案例',
    '竞争优势', '技术架构', '商业模式', '行业趋势'
  ],
  // 消费者应用
  '消费者应用': [
    '用户画像', '使用场景', '核心功能', '用户体验',
    '竞品对比', '市场表现', '商业模式', '用户评价'
  ],
  // 硬件产品
  '硬件产品': [
    '技术规格', '供应链', '市场份额', '用户评价',
    '竞品对比', '销售渠道', '定价策略', '技术趋势'
  ],
  // 医疗健康
  '医疗健康': [
    '临床数据', '监管政策', '市场规模', '竞争格局',
    '技术特点', '应用场景', '商业模式', '发展趋势'
  ],
  // 金融服务
  '金融服务': [
    '产品服务', '监管合规', '市场规模', '竞争格局',
    '技术特点', '风险管理', '商业模式', '发展趋势'
  ],
  // 教育科技
  '教育科技': [
    '教学模式', '用户群体', '市场规模', '竞争格局',
    '技术特点', '课程内容', '商业模式', '发展趋势'
  ],
  // 电子商务
  '电子商务': [
    '商业模式', '市场规模', '竞争格局', '用户体验',
    '物流配送', '支付方式', '营销策略', '发展趋势'
  ],
  // 人工智能
  '人工智能': [
    '技术架构', '应用场景', '市场表现', '竞争格局',
    '核心算法', '产品形态', '商业模式', '发展趋势'
  ],
  // 游戏
  '游戏': [
    '游戏类型', '目标用户', '市场表现', '竞品对比',
    '盈利模式', '开发技术', '运营策略', '发展趋势'
  ],
  // 汽车出行
  '汽车出行': [
    '产品定位', '技术特点', '市场表现', '竞争格局',
    '商业模式', '供应链', '政策法规', '发展趋势'
  ],
};

/**
 * 检测行业（包含意图分析 - 合并为单次 LLM 调用）
 */
export async function detectIndustry(
  input: IndustryDetectionInput
): Promise<IndustryDetectionOutput> {
  const { title, description, keywords } = input;

  // 进行模糊度检测
  const clarityScore = calculateClarityScore(title);
  const isFuzzy = clarityScore < 0.6;

  // 构建合并的 Prompt（意图分析 + 行业判断）
  const needsIntentAnalysis = isFuzzy || !keywords || keywords.length === 0;

  let intentSection = '';
  if (needsIntentAnalysis) {
    intentSection = `
## 意图分析要求
请同时分析用户的研究意图：
- product: 产品调研（了解产品功能、特性、使用方法）
- market: 市场调研（了解市场规模、趋势、竞争格局）
- technical: 技术调研（了解技术原理、实现方案、架构）
- comparison: 对比分析（对比多个产品/方案的优劣）
- general: 一般了解（泛泛了解基本信息）

请在返回的 JSON 中添加以下字段：
- "coreTheme": 核心主题（精简到3-5个字）
- "intent": 研究意图
- "keywords": 提取的关键词（最多5个）`;
  }

  const prompt = `你是行业分析专家。根据以下产品信息，判断其所属的行业类别：

## 产品名称
${title}

## 产品描述
${description || '无'}

## 关键词
${keywords?.join(', ') || '无'}
${intentSection}

请分析并返回纯 JSON 格式的结果，不要包含任何解释性文字或 Markdown 标记：
{
  "detectedIndustry": "主要行业类别",
  "confidence": 0-1 之间的置信度,
  "reasoning": "判断理由",
  "researchDimensions": ["维度1", "维度2", ...],
  "relatedIndustries": ["相关行业1", "相关行业2"] (可选)
  ${needsIntentAnalysis ? ',\n  "coreTheme": "核心主题",\n  "intent": "intent值",\n  "keywords": ["关键词1", "关键词2"]' : ''}
}

请确保：
1. 只输出 JSON，不要有其他文字
2. 行业类别使用通用名称（如：B2B SaaS、消费者应用、硬件产品、医疗健康、金融服务、教育科技、电子商务、人工智能、游戏、汽车出行等）
3. 研究维度应该与行业相关且有实际研究价值
4. 如果产品跨多个行业，在 relatedIndustries 中列出
5. JSON 字符串中不要包含换行符、制表符等特殊字符，只使用纯文本`;

  try {
    const responseText = await generateText(prompt);

    // 提取并解析 JSON
    interface IndustryDetectionResult {
      detectedIndustry?: string;
      confidence?: number;
      reasoning?: string;
      researchDimensions?: string[];
      relatedIndustries?: string[];
      coreTheme?: string;
      intent?: string;
      keywords?: string[];
    }

    const result = parseJsonFromLLM<IndustryDetectionResult>(responseText);

    // 提取意图信息
    let intent: ResearchIntent | undefined;
    let coreTheme: string | undefined;
    let extractedKeywords: string[] | undefined;

    if (needsIntentAnalysis) {
      const validIntents: ResearchIntent[] = ['product', 'market', 'technical', 'comparison', 'general'];
      if (result.intent && validIntents.includes(result.intent as ResearchIntent)) {
        intent = result.intent as ResearchIntent;
      }
      coreTheme = result.coreTheme;
      extractedKeywords = (result.keywords || []).slice(0, 5);
    }

    // 合并关键词
    const mergedKeywords = keywords && keywords.length > 0
      ? [...new Set([...keywords, ...(extractedKeywords || [])])]
      : extractedKeywords || keywords || [];

    return {
      detectedIndustry: result.detectedIndustry || '通用',
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || '',
      researchDimensions: result.researchDimensions || getDefaultDimensions(),
      relatedIndustries: result.relatedIndustries,
      intent,
      keywords: mergedKeywords,
      coreTheme,
      clarityScore,
    };
  } catch (error) {
    console.error('[IndustryDetector] 行业判断失败:', error);
    // 返回默认行业
    return {
      detectedIndustry: '通用',
      confidence: 0.3,
      reasoning: '行业判断失败，使用默认维度',
      researchDimensions: getDefaultDimensions(),
      clarityScore,
    };
  }
}

/**
 * 获取默认维度
 */
function getDefaultDimensions(): string[] {
  return [
    '市场定位', '核心功能', '竞争优势', '商业模式',
    '技术特点', '用户群体', '竞争格局', '发展趋势'
  ];
}

/**
 * 获取行业对应的研究维度
 */
export function getIndustryDimensions(industry: string): string[] {
  // 精确匹配
  if (INDUSTRY_DIMENSION_MAPPING[industry]) {
    return INDUSTRY_DIMENSION_MAPPING[industry];
  }

  // 模糊匹配
  const lowerIndustry = industry.toLowerCase();
  for (const [key, dims] of Object.entries(INDUSTRY_DIMENSION_MAPPING)) {
    if (lowerIndustry.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerIndustry)) {
      return dims;
    }
  }

  // 返回默认维度
  return getDefaultDimensions();
}

/**
 * 生成行业特定的初始查询
 */
export async function generateIndustryQueries(
  title: string,
  industry: string,
  dimensions: string[]
): Promise<{ query: string; dimension: string; purpose: string }[]> {
  const prompt = `你是研究查询规划专家。基于以下信息，生成适合行业的初始搜索查询：

## 产品名称
${title}

## 行业
${industry}

## 研究维度
${dimensions.join(', ')}

请生成 5-8 个高质量搜索查询，每个查询应该：
1. 聚焦于获取特定维度的信息
2. 与行业高度相关
3. 查询意图明确

返回 JSON 数组格式：
[{"query": "搜索查询", "dimension": "对应维度", "purpose": "查询目的"}]`;

  try {
    const responseText = await generateText(prompt);

    // 使用健壮的 JSON 解析
    const result = parseJsonFromLLM<Array<{query: string; dimension: string; purpose: string}>>(responseText);

    if (!result || !Array.isArray(result)) {
      return generateFallbackQueries(title, dimensions);
    }

    return result;
  } catch (error) {
    console.error('[IndustryDetector] 生成行业查询失败:', error);
    return generateFallbackQueries(title, dimensions);
  }
}

/**
 * 生成后备查询
 */
function generateFallbackQueries(
  title: string,
  dimensions: string[]
): { query: string; dimension: string; purpose: string }[] {
  return dimensions.slice(0, 5).map((dim) => ({
    query: `${title} ${dim}`,
    dimension: dim,
    purpose: `获取${dim}信息`,
  }));
}

// ============================================================
// 用户修正功能
// ============================================================

/**
 * 用户修正行业输入
 */
export interface IndustryCorrectionInput {
  originalDetection: IndustryDetectionOutput;
  correctedIndustry: string;
  correctedDimensions?: string[];
  correctedRelatedIndustries?: string[];
  correctionReason?: string;
}

/**
 * 用户修正输出
 */
export interface IndustryCorrectionOutput {
  success: boolean;
  correctedDetection: IndustryDetectionOutput;
}

/**
 * 应用用户修正的行业判断结果
 *
 * 允许用户手动修正 LLM 判断的行业，并自动调整相关参数
 */
export function applyIndustryCorrection(
  input: IndustryCorrectionInput
): IndustryCorrectionOutput {
  const { originalDetection, correctedIndustry, correctedDimensions, correctedRelatedIndustries, correctionReason } = input;

  // 获取修正后行业的维度
  const dimensions = correctedDimensions || getIndustryDimensions(correctedIndustry);

  const correctedDetection: IndustryDetectionOutput = {
    detectedIndustry: correctedIndustry,
    confidence: 1.0, // 用户确认的修正，置信度为 100%
    reasoning: correctionReason || `用户修正: ${originalDetection.detectedIndustry} -> ${correctedIndustry}`,
    researchDimensions: dimensions,
    relatedIndustries: correctedRelatedIndustries || originalDetection.relatedIndustries,
    isUserCorrected: true, // 标记为用户修正
    originalDetection: originalDetection, // 保留原始检测结果
  };

  console.log(`[IndustryDetector] 用户修正行业: ${originalDetection.detectedIndustry} -> ${correctedIndustry}`);

  return {
    success: true,
    correctedDetection,
  };
}

/**
 * 验证行业是否有效
 */
export function validateIndustry(industry: string): boolean {
  const validIndustries = Object.keys(INDUSTRY_DIMENSION_MAPPING);
  return validIndustries.some(valid =>
    industry.toLowerCase().includes(valid.toLowerCase()) ||
    valid.toLowerCase().includes(industry.toLowerCase())
  );
}

/**
 * 获取建议的行业列表
 */
export function getSuggestedIndustries(): string[] {
  return Object.keys(INDUSTRY_DIMENSION_MAPPING);
}
