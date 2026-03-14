/**
 * 参考文献验证器
 *
 * 验证参考文献的格式规范性、编号连续性、重复检测和引用匹配
 * 以及数据来源追溯：无来源数据检测
 */

import { generateText } from '@/lib/llm';
import { parseJsonFromLLM } from '@/lib/json-utils';

/**
 * 数据来源追溯结果
 */
export interface SourceTrace {
  dataPoint: string;
  hasSource: boolean;
  sourceReference?: string;
  suggestion?: string;
}

/**
 * 数据来源追溯报告
 */
export interface SourceTracingReport {
  totalDataPoints: number;
  withSource: number;
  withoutSource: number;
  tracedData: SourceTrace[];
  summary: string;
}

/**
 * 参考文献验证问题
 */
export interface ReferenceIssue {
  id: string;
  type: 'duplicate' | 'number_missing' | 'number_unused' | 'invalid_reference' | 'incomplete_info' | 'format_error';
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  location?: string;
  references?: string[];
  suggestion?: string;
}

/**
 * 参考文献验证报告
 */
export interface ReferenceValidationReport {
  totalIssues: number;
  errors: number;
  warnings: number;
  infos: number;
  issues: ReferenceIssue[];
  summary: string;
  statistics: {
    totalReferences: number;
    usedInText: number;
    unused: number;
    duplicates: number;
  };
}

/**
 * 验证配置
 */
export interface ReferenceValidationConfig {
  /** 是否检测重复引用 */
  checkDuplicates?: boolean;
  /** 是否检测编号连续性 */
  checkNumbering?: boolean;
  /** 是否检测引用匹配 */
  checkMatching?: boolean;
  /** 是否使用LLM补充信息 */
  enableLLMCompletion?: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<ReferenceValidationConfig> = {
  checkDuplicates: true,
  checkNumbering: true,
  checkMatching: true,
  enableLLMCompletion: true,
};

/**
 * 提取正文中的引用编号
 */
function extractTextReferences(content: string): number[] {
  const references: number[] = [];

  // 匹配 [1], [1,2], [1-3] 等格式
  const bracketPattern = /\[(\d+(?:,\s*\d+)*|\d+\s*-\s*\d+)\]/g;
  let match;

  while ((match = bracketPattern.exec(content)) !== null) {
    const numStr = match[1];

    // 处理范围，如 [1-3]
    if (numStr.includes('-')) {
      const [start, end] = numStr.split('-').map(s => parseInt(s.trim()));
      for (let i = start; i <= end; i++) {
        references.push(i);
      }
    }
    // 处理列表，如 [1,2,3]
    else if (numStr.includes(',')) {
      numStr.split(',').forEach(s => {
        const n = parseInt(s.trim());
        if (!isNaN(n)) references.push(n);
      });
    }
    // 单个数字
    else {
      const n = parseInt(numStr);
      if (!isNaN(n)) references.push(n);
    }
  }

  // 匹配脚注格式，如 [^1]
  const footnotePattern = /\[\^(\d+)\]/g;
  while ((match = footnotePattern.exec(content)) !== null) {
    const n = parseInt(match[1]);
    if (!isNaN(n)) references.push(n);
  }

  return [...new Set(references)].sort((a, b) => a - b);
}

/**
 * 提取参考文献列表
 */
function extractReferenceList(content: string): Array<{ number: number; text: string; line: number }> {
  const references: Array<{ number: number; text: string; line: number }> = [];

  // 查找参考文献章节
  const refSectionMatch = content.match(/(?:参考文献|References|资料来源)[^#]*\n#{1,3}\s*[\s\S]*/i);
  if (!refSectionMatch) {
    return references;
  }

  const refSection = refSectionMatch[0];
  const lines = refSection.split('\n');

  // 匹配参考文献格式：[1] xxx 或 1. xxx
  const refPattern = /(?:\[[\s\d]*\]|(\d+)[\.、]\s*)(.+)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;

    while ((match = refPattern.exec(line)) !== null) {
      const number = match[1] ? parseInt(match[1]) : references.length + 1;
      const text = match[2].trim();

      if (text.length > 0) {
        references.push({
          number,
          text,
          line: i + 1,
        });
      }
    }
  }

  return references;
}

/**
 * 检测重复引用
 */
function detectDuplicateReferences(references: Array<{ number: number; text: string }>): ReferenceIssue[] {
  const issues: ReferenceIssue[] = [];
  const seen = new Map<string, number[]>();

  for (const ref of references) {
    // 简化文本用于比较（去除特殊字符）
    const normalizedText = ref.text.replace(/\[.*?\]/g, '').replace(/[★☆●○]/g, '').trim().toLowerCase();

    if (normalizedText.length < 10) continue; // 太短的不比较

    if (seen.has(normalizedText)) {
      seen.get(normalizedText)!.push(ref.number);
    } else {
      seen.set(normalizedText, [ref.number]);
    }
  }

  for (const [text, numbers] of seen) {
    if (numbers.length > 1) {
      issues.push({
        id: `dup-ref-${numbers[0]}`,
        type: 'duplicate',
        severity: 'warning',
        title: `参考文献重复: ${numbers.join(', ')}`,
        description: `参考文献编号 ${numbers.join(', ')} 内容相同或高度相似。`,
        references: numbers.map(n => `[${n}]`),
        suggestion: '请核实并合并重复引用，或保留最准确的来源。',
      });
    }
  }

  return issues;
}

/**
 * 检测编号连续性
 */
function detectNumberingIssues(references: Array<{ number: number; text: string }>): ReferenceIssue[] {
  const issues: ReferenceIssue[] = [];

  if (references.length === 0) return issues;

  const numbers = references.map(r => r.number).sort((a, b) => a - b);
  const min = numbers[0];
  const max = numbers[numbers.length - 1];
  const expectedCount = max - min + 1;

  // 检查是否有缺失编号
  if (numbers.length < expectedCount) {
    const missing: number[] = [];
    for (let i = min; i <= max; i++) {
      if (!numbers.includes(i)) {
        missing.push(i);
      }
    }

    if (missing.length > 0) {
      issues.push({
        id: 'missing-num',
        type: 'number_missing',
        severity: 'warning',
        title: `参考文献编号缺失: ${missing.join(', ')}`,
        description: `参考文献编号不连续，缺少: ${missing.join(', ')}`,
        references: missing.map(n => `[${n}]`),
        suggestion: '请补充缺失的编号或调整编号顺序。',
      });
    }
  }

  return issues;
}

/**
 * 检测引用匹配
 */
function detectMatchingIssues(
  references: Array<{ number: number; text: string }>,
  textReferences: number[]
): ReferenceIssue[] {
  const issues: ReferenceIssue[] = [];

  const refNumbers = new Set(references.map(r => r.number));
  const textRefs = new Set(textReferences);

  // 检测正文引用但参考文献中不存在
  const invalidRefs: number[] = [];
  for (const num of textRefs) {
    if (!refNumbers.has(num)) {
      invalidRefs.push(num);
    }
  }

  if (invalidRefs.length > 0) {
    issues.push({
      id: 'invalid-ref',
      type: 'invalid_reference',
      severity: 'error',
      title: `无效引用: ${invalidRefs.join(', ')}`,
      description: `正文中引用了 [${invalidRefs.join(', ')}]，但参考文献列表中不存在这些编号。`,
      references: invalidRefs.map(n => `[${n}]`),
      suggestion: '请核实引用编号，或在参考文献中添加相应条目。',
    });
  }

  // 检测参考文献未被使用
  const unusedRefs: number[] = [];
  for (const num of refNumbers) {
    if (!textRefs.has(num)) {
      unusedRefs.push(num);
    }
  }

  if (unusedRefs.length > 0 && unusedRefs.length < refNumbers.size) {
    issues.push({
      id: 'unused-ref',
      type: 'number_unused',
      severity: 'info',
      title: `未使用的参考文献: ${unusedRefs.join(', ')}`,
      description: `以下参考文献在正文中未被引用: ${unusedRefs.join(', ')}`,
      references: unusedRefs.map(n => `[${n}]`),
      suggestion: '请在正文中添加对这些参考文献的引用，或考虑删除未使用的条目。',
    });
  }

  return issues;
}

/**
 * 检测参考文献信息完整性
 */
function detectIncompleteInfo(references: Array<{ number: number; text: string }>): ReferenceIssue[] {
  const issues: ReferenceIssue[] = [];

  for (const ref of references) {
    // 检查是否信息过少
    if (ref.text.length < 15) {
      issues.push({
        id: `incomplete-${ref.number}`,
        type: 'incomplete_info',
        severity: 'warning',
        title: `参考文献信息不完整: [${ref.number}]`,
        description: `参考文献 "${ref.text}" 信息过于简略，缺少完整的来源信息。`,
        references: [`[${ref.number}]`],
        suggestion: '请补充完整的来源信息，包括机构名称、报告标题、发布时间等。',
      });
      continue;
    }

    // 检查是否缺少关键信息（机构、年份等）
    const hasOrg = /^[【\[]?[A-Z]|公司|研究院|研究所|大学|委员会|协会|联盟/i.test(ref.text);
    const hasYear = /\d{4}|202\d|201\d/.test(ref.text);
    const hasReportType = /报告|白皮书|研究|分析|调研|论文|文章/i.test(ref.text);

    if (!hasOrg || !hasYear) {
      issues.push({
        id: `incomplete-detail-${ref.number}`,
        type: 'incomplete_info',
        severity: 'info',
        title: `参考文献缺少详细信息: [${ref.number}]`,
        description: `参考文献 "${ref.text}" 可能缺少发布机构或年份信息。`,
        references: [`[${ref.number}]`],
        suggestion: `建议添加: ${!hasOrg ? '发布机构' : ''} ${!hasYear ? '发布时间' : ''}`,
      });
    }
  }

  return issues;
}

/**
 * 使用LLM补充参考文献信息
 */
async function llmCompleteReferenceInfo(
  references: Array<{ number: number; text: string }>,
  content: string
): Promise<Map<number, string>> {
  const completed = new Map<number, string>();

  // 找出需要补充的参考文献
  const incomplete = references.filter(ref =>
    ref.text.length < 30 || !/\d{4}|202\d/.test(ref.text)
  );

  if (incomplete.length === 0) return completed;

  const prompt = `以下是一份报告的参考文献列表，部分信息不完整。请根据报告上下文推断可能的完整信息。

## 参考文献列表
${incomplete.map(r => `[${r.number}] ${r.text}`).join('\n')}

## 报告上下文
${content.substring(0, 5000)}

## 要求
1. 为每个不完整的参考文献补充可能的完整信息
2. 保持原文不变，只补充缺失的信息
3. 如果无法推断，请标注"无法推断"

## 输出格式
返回JSON数组：
[
  {"number": 1, "completed": "完整信息或'无法推断'"},
  ...
]`;

  try {
    const result = await generateText(prompt);
    const parsed = parseJsonFromLLM<Array<{ number: number; completed: string }>>(result, []);

    for (const item of parsed) {
      if (item.completed && item.completed !== '无法推断') {
        completed.set(item.number, item.completed);
      }
    }
  } catch (error) {
    console.error('[ReferenceValidator] LLM completion failed:', error);
  }

  return completed;
}

/**
 * 检测数据来源追溯 - 识别没有引用来源的关键数据点
 */
async function detectUnsourceDataPoints(content: string): Promise<SourceTrace[]> {
  const traces: SourceTrace[] = [];

  // 提取参考文献列表
  const references = extractReferenceList(content);

  // 使用 LLM 识别没有来源的关键数据点
  const prompt = `请分析以下报告内容，识别出所有关键数据点（如市场规模、增长率、百分比等），
并判断每个数据点是否有引用来源。

## 报告内容
${content.substring(0, 8000)}

## 参考文献列表
${references.map(r => `[${r.number}] ${r.text}`).join('\n')}

## 要求
1. 识别所有关键定量数据（市场规模、增长率、百分比、预测数据等）
2. 判断每个数据点是否有引用来源（检查是否标注了 [^n] 或 [n]）
3. 如果有来源，标注来源编号；如果没有，标注"待核实"

## 输出格式
返回JSON数组：
[
  {"dataPoint": "2023年中国扫地机器人市场规模为150亿元", "hasSource": true, "sourceReference": "[1]"},
  {"dataPoint": "预计2025年CAGR达到20%", "hasSource": false, "suggestion": "建议添加数据来源"}
]`;

  try {
    const result = await generateText(prompt);
    const parsed = parseJsonFromLLM<Array<{
      dataPoint: string;
      hasSource: boolean;
      sourceReference?: string;
      suggestion?: string;
    }>>(result, []);

    for (const item of parsed) {
      traces.push({
        dataPoint: item.dataPoint,
        hasSource: item.hasSource,
        sourceReference: item.sourceReference,
        suggestion: item.suggestion,
      });
    }
  } catch (error) {
    console.error('[ReferenceValidator] Source tracing failed:', error);
  }

  return traces;
}

/**
 * 创建数据来源追溯报告
 */
export function createSourceTracer() {
  return {
    trace: async (content: string): Promise<SourceTracingReport> => {
      const tracedData = await detectUnsourceDataPoints(content);

      const withSource = tracedData.filter(t => t.hasSource).length;
      const withoutSource = tracedData.filter(t => !t.hasSource).length;

      const summary = `共识别 ${tracedData.length} 个关键数据点，${withSource} 个有来源，${withoutSource} 个待核实`;

      return {
        totalDataPoints: tracedData.length,
        withSource,
        withoutSource,
        tracedData,
        summary,
      };
    },
  };
}

/**
 * 创建参考文献验证器
 */
export function createReferenceValidator(config: Partial<ReferenceValidationConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return {
    config: finalConfig,
    validate: (content: string): Promise<ReferenceValidationReport> => {
      return validateReferences(content, finalConfig);
    },
  };
}

/**
 * 执行参考文献验证
 */
async function validateReferences(
  content: string,
  config: Required<ReferenceValidationConfig>
): Promise<ReferenceValidationReport> {
  const allIssues: ReferenceIssue[] = [];

  // 1. 提取正文引用
  const textReferences = extractTextReferences(content);

  // 2. 提取参考文献列表
  const references = extractReferenceList(content);

  // 3. 检测重复引用
  if (config.checkDuplicates && references.length > 0) {
    const dupIssues = detectDuplicateReferences(references);
    allIssues.push(...dupIssues);
  }

  // 4. 检测编号连续性
  if (config.checkNumbering && references.length > 0) {
    const numIssues = detectNumberingIssues(references);
    allIssues.push(...numIssues);
  }

  // 5. 检测引用匹配
  if (config.checkMatching && references.length > 0) {
    const matchIssues = detectMatchingIssues(references, textReferences);
    allIssues.push(...matchIssues);
  }

  // 6. 检测信息完整性
  if (references.length > 0) {
    const infoIssues = detectIncompleteInfo(references);
    allIssues.push(...infoIssues);
  }

  // 7. LLM补充信息（可选）
  let completedReferences: Map<number, string> = new Map();
  if (config.enableLLMCompletion && references.length > 0) {
    completedReferences = await llmCompleteReferenceInfo(references, content);
  }

  // 统计
  const errors = allIssues.filter(i => i.severity === 'error').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;
  const infos = allIssues.filter(i => i.severity === 'info').length;

  // 统计信息
  const usedInText = textReferences.filter(n =>
    references.some(r => r.number === n)
  ).length;

  const unused = references.filter(r =>
    !textReferences.includes(r.number)
  ).length;

  const duplicates = allIssues.filter(i => i.type === 'duplicate').length;

  // 生成摘要
  let summary = '';
  if (allIssues.length === 0) {
    summary = '参考文献验证通过，未发现问题';
  } else {
    summary = `检测到 ${allIssues.length} 个问题：${errors} 个错误，${warnings} 个警告，${infos} 个提示`;
  }

  return {
    totalIssues: allIssues.length,
    errors,
    warnings,
    infos,
    issues: allIssues,
    summary,
    statistics: {
      totalReferences: references.length,
      usedInText,
      unused,
      duplicates,
    },
  };
}

/**
 * 导出验证器工厂
 */
export { validateReferences, createReferenceValidator, createSourceTracer };
