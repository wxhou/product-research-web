/**
 * 数据一致性检测器
 *
 * 检测报告中的数据一致性问题：
 * - 相同指标的不同数值
 * - 百分比超过 100%
 * - 数值逻辑矛盾
 */

import { generateText } from '@/lib/llm';
import { parseJsonFromLLM } from '@/lib/json-utils';

/**
 * 一致性检测结果
 */
export interface ConsistencyIssue {
  id: string;
  type: 'duplicate_metric' | 'percentage_overflow' | 'logical_contradiction' | 'calculation_error' | 'percentage_sum_error' | 'reference_number_error';
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  location?: string;
  values?: string[];
  suggestion?: string;
}

/**
 * 一致性检测报告
 */
export interface ConsistencyReport {
  totalIssues: number;
  errors: number;
  warnings: number;
  infos: number;
  issues: ConsistencyIssue[];
  summary: string;
}

/**
 * 检测配置
 */
export interface ConsistencyCheckConfig {
  /** 是否检测重复指标 */
  checkDuplicateMetrics?: boolean;
  /** 是否检测百分比溢出 */
  checkPercentageOverflow?: boolean;
  /** 是否检测逻辑矛盾 */
  checkLogicalContradictions?: boolean;
  /** 是否使用 LLM 进行深度检测 */
  enableLLMDetection?: boolean;
  /** 是否检测占比总和超过100% */
  checkPercentageSum?: boolean;
  /** 是否检测ROI/回收期计算错误 */
  checkROICalculation?: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<ConsistencyCheckConfig> = {
  checkDuplicateMetrics: true,
  checkPercentageOverflow: true,
  checkLogicalContradictions: true,
  enableLLMDetection: true,
  checkPercentageSum: true,
  checkROICalculation: true,
};

/**
 * 提取报告中的所有数值和指标
 */
function extractNumbersAndMetrics(content: string): Array<{ value: string; context: string; line: number }> {
  const results: Array<{ value: string; context: string; line: number }> = [];
  const lines = content.split('\n');

  // 匹配各种数值格式
  const patterns = [
    // 百分比: 25.5%, 30%
    /(\d+(?:\.\d+)?)\s*%/g,
    // 金额: ¥100万, $50亿, 100万元
    /(?:¥|\$|人民币)?\s*(\d+(?:\.\d+)?)\s*(?:亿|万|千)?\s*(?:元|美元|人民币)?/g,
    // 倍数: 3.5倍
    /(\d+(?:\.\d+)?)\s*倍/g,
    // 一般数字: 1000, 1,234
    /\b(\d+(?:,\d{3})*(?:\.\d+)?)\b/g,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        results.push({
          value: match[0],
          context: line.trim().substring(0, 100),
          line: lineNum,
        });
      }
      // 重置 lastIndex
      pattern.lastIndex = 0;
    }
  }

  return results;
}

/**
 * 检测百分比超过 100% 的情况
 */
function detectPercentageOverflow(content: string): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const lines = content.split('\n');

  // 匹配百分比
  const percentPattern = /(\d+(?:\.\d+)?)\s*%/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;

    while ((match = percentPattern.exec(line)) !== null) {
      const value = parseFloat(match[1]);
      if (value > 100) {
        issues.push({
          id: `pct-overflow-${i}`,
          type: 'percentage_overflow',
          severity: 'error',
          title: `百分比超过 100%: ${match[0]}`,
          description: `在第 ${i + 1} 行发现百分比值 "${match[0]}" 超过 100%，这在大多数业务场景中是不合理的。`,
          location: `第 ${i + 1} 行`,
          values: [match[0]],
          suggestion: '请检查该百分比是否应为小数（如 25% 而非 0.25），或者数值本身有误。',
        });
      }
    }
  }

  return issues;
}

/**
 * 检测重复指标（相同指标出现不同数值）
 */
function detectDuplicateMetrics(content: string): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  // 常见指标名称 - 扩展列表
  const metricNames = [
    '市场规模', '市场增长率', '市场渗透率', '市场份额',
    '营收', '收入', '利润', '增长率', '用户数', 'DAU', 'MAU',
    '转化率', '留存率', '毛利率', '净利率', 'ROI', '投资回报率',
    'NPS', '客户推荐意愿', '满意度', '市场占有率', '渗透率',
    'AIoT集成率', '集成率', '识别准确率', '回收周期', '回收期',
  ];

  // 提取所有包含指标的句子
  const lines = content.split('\n');

  for (const metric of metricNames) {
    const metricOccurrences: Array<{ value: string; line: number; context: string }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(metric)) {
        // 提取引号或括号中的数值
        const valueMatch = line.match(/(?:["'']|\(|（)(\d+(?:\.\d+)?)(?:\s*%|倍|亿|万|元|美元|人民币)?(?:["'']|\)|）)/);
        if (valueMatch) {
          metricOccurrences.push({
            value: valueMatch[1],
            line: i + 1,
            context: line.trim().substring(0, 80),
          });
        }
      }
    }

    // 如果同一指标出现多次且数值不同
    if (metricOccurrences.length >= 2) {
      const uniqueValues = [...new Set(metricOccurrences.map(o => o.value))];
      if (uniqueValues.length >= 2) {
        issues.push({
          id: `dup-metric-${metric}`,
          type: 'duplicate_metric',
          severity: 'warning',
          title: `指标 "${metric}" 出现不同数值`,
          description: `在报告中，指标 "${metric}" 出现了 ${metricOccurrences.length} 次，但数值不一致。`,
          values: uniqueValues.map(v => `${v} (出现在 ${metricOccurrences.filter(o => o.value === v).length} 处)`),
          suggestion: '请核实哪个数值是正确的，并统一报告中的数据。',
        });
      }
    }
  }

  return issues;
}

/**
 * 检测占比数据之和超过100%的情况
 * 例如：调研数据中各选项占比加起来超过100%
 */
function detectPercentageSum(content: string): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  // 匹配可能是一组占比数据的模式
  // 例如：青少年（~18%）、中老年（~35%）、高学历（~22%）
  const percentageGroupPattern = /(?:^|[，。、\n])([^，。\n]*?)[（(]?(~?\d+(?:\.\d+)?)\s*%?[）)]?[,，、\n]/g;

  // 按段落分组检测
  const paragraphs = content.split(/\n\n+/);

  for (let p = 0; p < paragraphs.length; p++) {
    const paragraph = paragraphs[p];

    // 跳过非调研数据段落
    if (!paragraph.includes('%') && !paragraph.includes('占比') && !paragraph.includes('比例')) {
      continue;
    }

    // 提取所有百分比
    const percentages: Array<{ value: number; context: string }> = [];
    const match = paragraph.match(/(\d+(?:\.\d+)?)\s*%/g);

    if (match && match.length >= 2) {
      for (const pct of match) {
        const value = parseFloat(pct.replace('%', ''));
        if (value > 0 && value <= 100) {
          percentages.push({ value, context: paragraph.substring(0, 50) });
        }
      }

      if (percentages.length >= 2) {
        const sum = percentages.reduce((acc, p) => acc + p.value, 0);

        // 如果百分比之和超过100%，可能是调研数据
        if (sum > 100 && sum <= 300) { // 放宽到300%以处理一些边缘情况
          issues.push({
            id: `pct-sum-${p}`,
            type: 'percentage_sum_error',
            severity: 'warning',
            title: `占比数据之和超过100%: ${sum.toFixed(1)}%`,
            description: `该段落中多个百分比数值之和为${sum.toFixed(1)}%，超过100%。这可能是多选调研数据，但应标注说明。`,
            location: `第 ${p + 1} 段`,
            values: percentages.map(p => `${p.value}%`),
            suggestion: '如果是多选调研结果，请在数据说明中标注"多选"；如果是单选，请核实数据准确性。',
          });
        }
      }
    }
  }

  return issues;
}

/**
 * 检测市场份额数据之和超过100%的情况
 * 例如：各企业市场份额加起来超过100%
 */
function detectMarketShareSum(content: string): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  // 查找可能包含市场份额信息的段落
  const paragraphs = content.split(/\n\n+/);

  for (let p = 0; p < paragraphs.length; p++) {
    const paragraph = paragraphs[p];

    // 跳过不包含市场份额关键词的段落
    if (!paragraph.includes('市场份额') && !paragraph.includes('市场占有率') && !paragraph.includes('份额')) {
      continue;
    }

    // 提取所有百分比（通常是公司名 + 百分比）
    const marketSharePattern = /([^\s，。、%(]{2,10})\s*[：:]\s*(\d+(?:\.\d+)?)\s*%?/g;
    const shares: Array<{ company: string; value: number }> = [];

    let match;
    while ((match = marketSharePattern.exec(paragraph)) !== null) {
      const value = parseFloat(match[2]);
      // 合理的份额范围是 0.1-100
      if (value > 0.1 && value < 100) {
        shares.push({ company: match[1], value });
      }
    }

    // 如果找到多个市场份额数据，检查总和
    if (shares.length >= 2) {
      const sum = shares.reduce((acc, s) => acc + s.value, 0);

      // 如果总和超过100%
      if (sum > 100) {
        issues.push({
          id: `market-share-sum-${p}`,
          type: 'percentage_sum_error',
          severity: 'error',
          title: `市场份额总和超过100%: ${sum.toFixed(1)}%`,
          description: `该段落中各企业市场份额之和为${sum.toFixed(1)}%，超过100%。这可能是数据错误，需要核实。`,
          location: `第 ${p + 1} 段`,
          values: shares.map(s => `${s.company}: ${s.value}%`),
          suggestion: `请核实各企业市场份额数据，确保总和不超过100%。建议调整为：${shares.map(s => `${s.company}: ${(s.value / sum * 100).toFixed(1)}%`).join(', ')}`,
        });
      }
    }
  }

  return issues;
}

/**
 * 检测ROI/回收期计算错误
 * 例如：投资1000万/年省300万，回收期应为3.3年而非1.5年
 */
function detectROICalculation(content: string): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  // 匹配投资额和年度节省的模式
  const roiPattern = /(?:投资|投入|花费|成本)[^\d]*(\d+(?:\.\d+)?)\s*(?:万|亿|元|美元)?(?:[^\d]{0,10})(?:年度)?(?:节省|节约|收益|利润|回报)[^\d]*(\d+(?:\.\d+)?)\s*(?:万|亿|元|美元)?/gi;

  let match;
  while ((match = roiPattern.exec(content)) !== null) {
    const investment = parseFloat(match[1]);
    const annualSaving = parseFloat(match[2]);

    // 统一单位（简化为万元）
    let investmentYuan = investment;
    let savingYuan = annualSaving;

    // 处理亿
    if (content.toLowerCase().includes('亿元')) {
      investmentYuan = investment * 10000;
      savingYuan = annualSaving * 10000;
    }

    if (savingYuan > 0) {
      const correctPeriod = investmentYuan / savingYuan;

      // 查找回收期
      const periodPattern = /(?:回收期|投资回收|返本)[^\d]*(\d+(?:\.\d+)?)\s*(?:年|个月)/i;
      const periodMatch = periodPattern.exec(content.substring(Math.max(0, match.index - 100), match.index + 200));

      if (periodMatch) {
        const statedPeriod = parseFloat(periodMatch[1]);
        const unit = periodMatch[2];

        // 统一为年数比较
        const statedYears = unit.includes('月') ? statedPeriod / 12 : statedPeriod;

        // 如果差异超过20%，可能是计算错误
        if (Math.abs(statedYears - correctPeriod) > 0.5 && statedYears < correctPeriod * 0.8) {
          issues.push({
            id: `roi-calc-${issues.length}`,
            type: 'calculation_error',
            severity: 'error',
            title: `ROI回收期计算错误`,
            description: `投资${investmentYuan >= 10000 ? investmentYuan / 10000 + '亿' : investmentYuan + '万元'}，年省${savingYuan >= 10000 ? savingYuan / 10000 + '亿' : savingYuan + '万元'}，正确回收期应为${correctPeriod.toFixed(1)}年，而非${statedPeriod}${unit}。`,
            location: `约在第${Math.ceil(match.index / 50)}段`,
            values: [`投资: ${investment}万`, `年省: ${annualSaving}万`, `声称回收期: ${statedPeriod}${unit}`, `正确回收期: ${correctPeriod.toFixed(1)}年`],
            suggestion: `请将回收期修正为${correctPeriod.toFixed(1)}年，或调整投资额/年度节省金额。`,
          });
        }
      }
    }
  }

  return issues;
}

/**
 * 使用 LLM 进行深度一致性检测
 */
async function llmDetectConsistency(content: string): Promise<ConsistencyIssue[]> {
  const prompt = `你是数据一致性分析专家。请分析以下报告内容，检测可能存在的数据一致性问题。

## 检测类型
1. **重复指标**: 同一指标在不同位置出现不同数值（如市场规模在某处说1284亿，另一处说1000亿）
2. **逻辑矛盾**: 前后数据相互矛盾（如说增长但数字下降）
3. **计算错误**: 数值计算明显错误（如 投资1000万/年省300万，回收期写1.5年，实际应为3.3年）
4. **百分比问题**: 百分比超过 100%、各部分之和超过整体等（如调研数据48%+55%=103%）
5. **占比数据**: 同一类别下各子类占比之和应为100%，超过说明有误

## 要求
1. 仔细阅读报告中的所有数据和数值
2. 识别可能存在问题的数据点
3. 对每个问题给出：问题描述、严重程度、修改建议

## 输出格式
**重要：必须返回严格符合 JSON 规范的输出**
- 所有属性名必须使用双引号包裹
- 所有字符串值必须使用双引号
- 不能使用单引号
- 不能使用尾随逗号
- 不要在 JSON 外面包裹任何文字说明

返回 JSON 数组，每个元素格式：
{
  "id": "唯一标识",
  "type": "duplicate_metric|logical_contradiction|calculation_error|percentage_overflow|percentage_sum_error",
  "severity": "error|warning|info",
  "title": "问题标题",
  "description": "详细描述",
  "values": ["相关数值"],
  "suggestion": "修改建议"
}

## 示例
输入片段: "根据IDC报告，2023年市场规模达到250亿元，增长率达25%。同时，另一处提到市场规模为200亿元，增速为30%。"

输出:
[{
  "id": "dup-mkt-size",
  "type": "duplicate_metric",
  "severity": "error",
  "title": "市场规模出现不同数值",
  "description": "报告中市场规模出现250亿和200亿两个不同数值",
  "values": ["250亿元", "200亿元"],
  "suggestion": "核实数据来源，确认正确的市场规模数值"
}]

如果未发现问题，返回空数组 []。

## 报告内容
${content.substring(0, 10000)}`;

  try {
    const result = await generateText(prompt);
    const issues = parseJsonFromLLM<ConsistencyIssue[]>(result, []);
    return Array.isArray(issues) ? issues : [];
  } catch (error) {
    console.error('[ConsistencyDetector] LLM detection failed:', error);
    return [];
  }
}

/**
 * 创建数据一致性检测器
 */
export function createConsistencyChecker(config: Partial<ConsistencyCheckConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return {
    config: finalConfig,
    check: (content: string): Promise<ConsistencyReport> => {
      return detectConsistency(content, finalConfig);
    },
  };
}

/**
 * 执行一致性检测
 */
async function detectConsistency(
  content: string,
  config: Required<ConsistencyCheckConfig>
): Promise<ConsistencyReport> {
  const allIssues: ConsistencyIssue[] = [];

  // 1. 检测百分比溢出（单个百分比>100%）
  if (config.checkPercentageOverflow) {
    const pctIssues = detectPercentageOverflow(content);
    allIssues.push(...pctIssues);
  }

  // 2. 检测重复指标
  if (config.checkDuplicateMetrics) {
    const dupIssues = detectDuplicateMetrics(content);
    allIssues.push(...dupIssues);
  }

  // 3. 检测占比数据之和超过100%
  if (config.checkPercentageSum) {
    const sumIssues = detectPercentageSum(content);
    allIssues.push(...sumIssues);

    // 额外检测市场份额总和
    const marketShareIssues = detectMarketShareSum(content);
    allIssues.push(...marketShareIssues);
  }

  // 4. 检测ROI计算错误
  if (config.checkROICalculation) {
    const roiIssues = detectROICalculation(content);
    allIssues.push(...roiIssues);
  }

  // 5. LLM 深度检测
  if (config.enableLLMDetection) {
    const llmIssues = await llmDetectConsistency(content);
    // 避免重复添加相同类型的问题
    const existingIds = new Set(allIssues.map(i => i.id));
    for (const issue of llmIssues) {
      if (!existingIds.has(issue.id)) {
        allIssues.push(issue);
      }
    }
  }

  // 统计
  const errors = allIssues.filter(i => i.severity === 'error').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;
  const infos = allIssues.filter(i => i.severity === 'info').length;

  // 生成摘要
  let summary = '';
  if (allIssues.length === 0) {
    summary = '未检测到数据一致性问题';
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
  };
}

/**
 * 导出一致性检测器工厂
 */
export { detectConsistency, createConsistencyChecker };
