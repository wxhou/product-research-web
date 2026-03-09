/**
 * 用户输入解析器
 *
 * 用于分析用户输入的模糊程度，通过 LLM 解析用户真实意图，
 * 提取关键词和核心主题，提升搜索查询质量
 */

import { generateText } from '@/lib/llm';
import { parseJsonFromLLM } from '@/lib/json-utils';

/**
 * 研究意图类型
 */
export type ResearchIntent =
  | 'product'    // 产品调研
  | 'market'      // 市场调研
  | 'technical'   // 技术调研
  | 'comparison'  // 对比分析
  | 'general';    // 一般了解

/**
 * 解析后的用户输入
 */
export interface ParsedInput {
  /** 原始用户输入 */
  originalTitle: string;
  /** 核心主题（精简到3-5个字） */
  coreTheme: string;
  /** 研究意图 */
  intent: ResearchIntent;
  /** 关键词列表 */
  keywords: string[];
  /** 清晰度分数 (0-1)，越高越清晰 */
  clarityScore: number;
  /** 是否需要解析（模糊输入） */
  isFuzzy: boolean;
  /** LLM 判断理由 */
  reasoning?: string;
}

/**
 * 模糊度检测结果
 */
export interface ClarityDetectionResult {
  clarityScore: number;
  isFuzzy: boolean;
  reasons: string[];
}

/**
 * 解析器配置
 */
export interface ParserConfig {
  /** 模糊度阈值，低于此值需要解析 */
  clarityThreshold: number;
  /** 最大关键词数 */
  maxKeywords: number;
  /** 是否启用兜底 */
  enableFallback: boolean;
  /** 解析超时(ms) */
  timeout: number;
}

/**
 * 默认配置
 */
export const DEFAULT_PARSER_CONFIG: ParserConfig = {
  clarityThreshold: 0.6,
  maxKeywords: 5,
  enableFallback: true,
  timeout: 10000,
};

// ============================================================
// 模糊度检测算法
// ============================================================

/**
 * 模糊词汇表
 */
const VAGUE_WORDS = [
  '了解', '看看', '怎么样', '好不好', '是什么',
  '介绍', '认识', '学习', '入门', '求推荐',
  '求助', '求问', '问一下', '咨询', '调研',
];

/**
 * 对比意图词汇
 */
const COMPARISON_WORDS = ['和', '对比', '比较', '差异', '哪个好', '区别'];

/**
 * 问题标记
 */
const QUESTION_MARKERS = ['?', '？', '吗', '呢'];

/**
 * 计算用户输入的清晰度分数
 *
 * @param title 用户输入
 * @returns 清晰度分数 (0-1)
 */
export function calculateClarityScore(title: string): number {
  if (!title || title.trim().length === 0) {
    return 0.1;
  }

  const trimmed = title.trim();
  let score = 0.8; // 基础分数

  // 1. 长度检测
  if (trimmed.length < 3) {
    score = Math.min(score, 0.2);
  } else if (trimmed.length > 50) {
    score = Math.min(score, 0.6);
  } else if (trimmed.length >= 5 && trimmed.length <= 30) {
    score = Math.max(score, 0.85);
  }

  // 2. 模糊词检测
  const hasVagueWord = VAGUE_WORDS.some(w => trimmed.includes(w));
  if (hasVagueWord) {
    score = Math.min(score, 0.4);
  }

  // 3. 对比意图检测
  const hasComparisonWord = COMPARISON_WORDS.some(w => trimmed.includes(w));
  if (hasComparisonWord) {
    score = Math.max(score, 0.7);
  }

  // 4. 问题检测
  const isQuestion = QUESTION_MARKERS.some(m => trimmed.includes(m));
  if (isQuestion) {
    score = Math.min(score, 0.5);
  }

  // 5. 具体产品/技术词汇检测（增加清晰度）
  const specificIndicators = [
    // 产品/公司名称特征
    /^[A-Z][a-zA-Z]/,  // 英文大写开头
    /\d+版本/,          // 版本号
    /v\d+/,             // v1.0
    // 具体技术词汇
    /框架/, /语言/, /库/, /工具/,
    // 具体动作
    /开发/, /实现/, /部署/, /集成/,
  ];

  const hasSpecificIndicator = specificIndicators.some(r => r.test(trimmed));
  if (hasSpecificIndicator) {
    score = Math.min(score + 0.1, 1.0);
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * 检测模糊度（返回详细结果）
 */
export function detectClarity(title: string, threshold: number = DEFAULT_PARSER_CONFIG.clarityThreshold): ClarityDetectionResult {
  const clarityScore = calculateClarityScore(title);
  const reasons: string[] = [];

  const trimmed = title.trim();

  // 收集原因
  if (trimmed.length < 3) {
    reasons.push('输入过短');
  } else if (trimmed.length > 50) {
    reasons.push('输入过长');
  }

  if (VAGUE_WORDS.some(w => trimmed.includes(w))) {
    reasons.push('包含模糊词汇');
  }

  if (QUESTION_MARKERS.some(m => trimmed.includes(m))) {
    reasons.push('为疑问句');
  }

  if (COMPARISON_WORDS.some(w => trimmed.includes(w))) {
    reasons.push('包含对比意图');
  }

  return {
    clarityScore,
    isFuzzy: clarityScore < threshold,
    reasons,
  };
}

// ============================================================
// LLM 解析
// ============================================================

/**
 * 解析用户输入的 Prompt
 */
const PARSE_USER_INPUT_PROMPT = `你是一个用户意图分析专家。请分析以下用户输入：

用户输入: {title}

请返回 JSON 格式的分析结果：
{
  "coreTheme": "核心主题（精简到3-5个字）",
  "intent": "product|market|technical|comparison|general",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "reasoning": "判断理由"
}

要求：
1. coreTheme 提取核心主题，去除修饰词
2. intent 选择最接近的研究意图：
   - product: 产品调研（了解产品功能、特性、使用方法）
   - market: 市场调研（了解市场规模、趋势、竞争格局）
   - technical: 技术调研（了解技术原理、实现方案、架构）
   - comparison: 对比分析（对比多个产品/方案的优劣）
   - general: 一般了解（泛泛了解基本信息）
3. keywords 提取关键实体（人名、产品名、技术名等），最多5个
4. 只输出 JSON，不要有其他文字`;

/**
 * 用户输入解析器类
 */
export class UserInputParser {
  private config: ParserConfig;

  constructor(config: Partial<ParserConfig> = {}) {
    this.config = { ...DEFAULT_PARSER_CONFIG, ...config };
  }

  /**
   * 解析用户输入
   *
   * @param title 用户输入
   * @returns 解析结果
   */
  async parse(title: string): Promise<ParsedInput> {
    // 1. 首先进行模糊度检测
    const clarityResult = detectClarity(title, this.config.clarityThreshold);

    // 2. 如果输入清晰，直接返回
    if (!clarityResult.isFuzzy) {
      return {
        originalTitle: title,
        coreTheme: title.trim(),
        intent: 'general',
        keywords: [],
        clarityScore: clarityResult.clarityScore,
        isFuzzy: false,
        reasoning: '输入清晰，无需解析',
      };
    }

    // 3. 模糊输入，使用 LLM 解析
    try {
      const parsed = await this.parseWithLLM(title);
      return {
        ...parsed,
        originalTitle: title,
        clarityScore: clarityResult.clarityScore,
        isFuzzy: true,
      };
    } catch (error) {
      console.error('[UserInputParser] LLM 解析失败:', error);

      // 4. 兜底处理
      if (this.config.enableFallback) {
        return this.fallbackParse(title, clarityResult.clarityScore);
      }

      throw error;
    }
  }

  /**
   * 使用 LLM 解析用户输入
   */
  private async parseWithLLM(title: string): Promise<Omit<ParsedInput, 'originalTitle' | 'clarityScore' | 'isFuzzy'>> {
    const prompt = PARSE_USER_INPUT_PROMPT.replace('{title}', title);

    const responseText = await generateText(prompt);

    const result = parseJsonFromLLM<{
      coreTheme: string;
      intent: string;
      keywords: string[];
      reasoning: string;
    }>(responseText);

    // 验证并规范化 intent
    const validIntents: ResearchIntent[] = ['product', 'market', 'technical', 'comparison', 'general'];
    const intent = validIntents.includes(result.intent as ResearchIntent)
      ? result.intent as ResearchIntent
      : 'general';

    // 限制关键词数量
    const keywords = (result.keywords || []).slice(0, this.config.maxKeywords);

    return {
      coreTheme: result.coreTheme || title,
      intent,
      keywords,
      reasoning: result.reasoning,
    };
  }

  /**
   * 兜底解析
   */
  private fallbackParse(title: string, clarityScore: number): ParsedInput {
    // 简单提取关键词：按空格分词，筛选有意义的词
    const words = title.split(/[\s,，、]+/).filter(w => w.length > 1);

    // 简单判断意图
    let intent: ResearchIntent = 'general';
    if (title.includes('市场') || title.includes('行业') || title.includes('趋势')) {
      intent = 'market';
    } else if (title.includes('技术') || title.includes('原理') || title.includes('架构')) {
      intent = 'technical';
    } else if (COMPARISON_WORDS.some(w => title.includes(w))) {
      intent = 'comparison';
    } else if (title.includes('产品') || title.includes('功能')) {
      intent = 'product';
    }

    return {
      originalTitle: title,
      coreTheme: title.trim(),
      intent,
      keywords: words.slice(0, this.config.maxKeywords),
      clarityScore,
      isFuzzy: true,
      reasoning: '兜底解析结果',
    };
  }

  /**
   * 快速检测（仅返回是否需要解析）
   */
  isFuzzyInput(title: string): boolean {
    return detectClarity(title, this.config.clarityThreshold).isFuzzy;
  }
}

// ============================================================
// 便捷函数
// ============================================================

let defaultParser: UserInputParser | null = null;

/**
 * 获取默认解析器实例
 */
export function getDefaultParser(): UserInputParser {
  if (!defaultParser) {
    defaultParser = new UserInputParser();
  }
  return defaultParser;
}

/**
 * 快速解析用户输入（使用默认配置）
 */
export async function parseUserInput(title: string): Promise<ParsedInput> {
  const parser = getDefaultParser();
  return parser.parse(title);
}

/**
 * 快速检测模糊度
 */
export function isFuzzyInput(title: string): boolean {
  return calculateClarityScore(title) < DEFAULT_PARSER_CONFIG.clarityThreshold;
}
