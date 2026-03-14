/**
 * ROI 敏感性分析器
 *
 * 生成不同假设下的 ROI 范围，提供最坏情况分析
 */

import { generateText } from '@/lib/llm';
import type { ROIResult } from './calculator';

/**
 * 敏感性分析输入
 */
export interface SensitivityInput {
  baseROI: number;
  /** 关键变量及变化范围 */
  variables: Array<{
    name: string;
    baseValue: number;
    optimisticValue: number;
    pessimisticValue: number;
    unit?: string;
  }>;
  /** 行业背景 */
  industry?: string;
  /** 产品背景 */
  product?: string;
}

/**
 * 敏感性分析结果
 */
export interface SensitivityResult {
  /** 单变量敏感性分析 */
  singleVariable: SingleVariableAnalysis[];
  /** 场景分析 */
  scenarios: ScenarioAnalysis[];
  /** 关键驱动因素 */
  keyDrivers: DriverImpact[];
  /** 风险管理建议 */
  riskMitigation: string[];
}

/**
 * 单变量敏感性分析
 */
export interface SingleVariableAnalysis {
  variable: string;
  baseValue: number;
  optimisticValue: number;
  pessimisticValue: number;
  impact: number;  // 变化对 ROI 的影响百分比
  sensitivity: 'high' | 'medium' | 'low';
}

/**
 * 场景分析
 */
export interface ScenarioAnalysis {
  name: string;
  description: string;
  probability: number;  // 发生概率 0-1
  roi: number;
  netBenefit: number;
  risk: 'low' | 'medium' | 'high';
}

/**
 * 驱动因素影响
 */
export interface DriverImpact {
  driver: string;
  impact: number;  // 对 ROI 的影响百分比
  direction: 'positive' | 'negative';
  description: string;
}

/**
 * 使用 LLM 进行敏感性分析
 */
async function analyzeSensitivityWithLLM(input: SensitivityInput): Promise<SensitivityResult> {
  const prompt = `你是财务敏感性分析专家。请分析以下ROI的关键驱动因素和敏感性。

## 基准数据
- 基准 ROI: ${input.baseROI}%
- 行业: ${input.industry || '通用'}
- 产品: ${input.product || '待评估'}

## 关键变量
${input.variables.map(v => `- ${v.name}: 基准值=${v.baseValue}, 乐观值=${v.optimisticValue}, 悲观值=${v.pessimisticValue}${v.unit || ''}`).join('\n')}

## 分析要求
1. 对每个变量进行单变量敏感性分析
2. 生成场景分析（乐观、基准、悲观、最坏情况）
3. 识别关键驱动因素
4. 提供风险管理建议

## 输出格式
**重要：必须返回严格符合 JSON 规范的输出**
- 所有属性名必须使用双引号包裹
- 所有字符串值必须使用双引号
- 不能使用单引号
- 不能使用尾随逗号
- 不要在 JSON 外面包裹任何文字说明

返回 JSON：
{
  "singleVariable": [
    {
      "variable": "变量名",
      "baseValue": 100,
      "optimisticValue": 150,
      "pessimisticValue": 50,
      "impact": 30,
      "sensitivity": "high"
    }
  ],
  "scenarios": [
    {
      "name": "乐观情景",
      "description": "所有变量向有利方向发展",
      "probability": 0.2,
      "roi": 200,
      "netBenefit": 500000,
      "risk": "low"
    }
  ],
  "keyDrivers": [
    {
      "driver": "关键因素",
      "impact": 25,
      "direction": "positive",
      "description": "影响描述"
    }
  ],
  "riskMitigation": ["建议1", "建议2"]
}`;

  try {
    const result = await generateText(prompt);
    const match = result.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch (error) {
    console.error('[SensitivityAnalyzer] LLM analysis failed:', error);
  }

  return generateDefaultSensitivity(input);
}

/**
 * 生成默认敏感性分析
 */
function generateDefaultSensitivity(input: SensitivityInput): SensitivityResult {
  const singleVariable: SingleVariableAnalysis[] = [];
  const drivers: DriverImpact[] = [];

  for (const variable of input.variables) {
    const change = Math.abs(variable.optimisticValue - variable.pessimisticValue);
    const avgValue = (variable.optimisticValue + variable.pessimisticValue) / 2;
    const impact = avgValue > 0 ? (change / avgValue) * (input.baseROI / 100) : 0;

    singleVariable.push({
      variable: variable.name,
      baseValue: variable.baseValue,
      optimisticValue: variable.optimisticValue,
      pessimisticValue: variable.pessimisticValue,
      impact: Math.round(impact * 100),
      sensitivity: impact > 0.3 ? 'high' : impact > 0.15 ? 'medium' : 'low',
    });

    drivers.push({
      driver: variable.name,
      impact: Math.round(impact * 100),
      direction: variable.optimisticValue > variable.pessimisticValue ? 'positive' : 'negative',
      description: `变化范围: ${variable.pessimisticValue} - ${variable.optimisticValue}`,
    });
  }

  // 按影响排序
  drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  const scenarios: ScenarioAnalysis[] = [
    {
      name: '乐观情景',
      description: '所有变量取最优值',
      probability: 0.2,
      roi: Math.round(input.baseROI * 1.5),
      netBenefit: Math.round(input.baseROI * 150000),
      risk: 'low',
    },
    {
      name: '基准情景',
      description: '变量取基准值',
      probability: 0.5,
      roi: input.baseROI,
      netBenefit: Math.round(input.baseROI * 100000),
      risk: 'medium',
    },
    {
      name: '悲观情景',
      description: '部分变量取悲观值',
      probability: 0.25,
      roi: Math.round(input.baseROI * 0.6),
      netBenefit: Math.round(input.baseROI * 60000),
      risk: 'high',
    },
    {
      name: '最坏情景',
      description: '所有变量取最差值',
      probability: 0.05,
      roi: Math.round(input.baseROI * 0.2),
      netBenefit: Math.round(input.baseROI * 20000),
      risk: 'high',
    },
  ];

  return {
    singleVariable,
    scenarios,
    keyDrivers: drivers.slice(0, 5),
    riskMitigation: [
      '建立定期评估机制，及时调整策略',
      '设置关键里程碑，进行阶段性ROI复核',
      '制定应对预案，应对悲观情景',
      '关注关键驱动因素，重点管理',
    ],
  };
}

/**
 * 生成敏感性分析报告章节
 */
export function generateSensitivityReport(result: SensitivityResult): string {
  let report = `## 敏感性分析\n\n`;

  // 单变量分析
  report += `### 单变量敏感性分析\n\n`;
  report += `| 变量 | 基准值 | 乐观值 | 悲观值 | 影响 | 敏感度 |\n`;
  report += `|------|--------|--------|--------|------|--------|\n`;
  for (const v of result.singleVariable) {
    report += `| ${v.variable} | ${v.baseValue} | ${v.optimisticValue} | ${v.pessimisticValue} | ${v.impact}% | ${v.sensitivity} |\n`;
  }

  // 场景分析
  report += `\n### 场景分析\n\n`;
  report += `| 情景 | 描述 | 概率 | ROI | 风险等级 |\n`;
  report += `|------|------|------|-----|----------|\n`;
  for (const s of result.scenarios) {
    const prob = `${(s.probability * 100).toFixed(0)}%`;
    report += `| ${s.name} | ${s.description} | ${prob} | ${s.roi}% | ${s.risk} |\n`;
  }

  // 关键驱动因素
  report += `\n### 关键驱动因素\n\n`;
  for (const d of result.keyDrivers) {
    const icon = d.direction === 'positive' ? '↑' : '↓';
    report += `- **${d.driver}**: ${icon} ${d.impact}% - ${d.description}\n`;
  }

  // 风险管理
  report += `\n### 风险管理建议\n\n`;
  for (const r of result.riskMitigation) {
    report += `- ${r}\n`;
  }

  return report;
}

/**
 * 创建敏感性分析器
 */
export function createSensitivityAnalyzer() {
  return {
    analyze: async (input: SensitivityInput): Promise<SensitivityResult> => {
      return analyzeSensitivityWithLLM(input);
    },
    generateReport: generateSensitivityReport,
  };
}

export { analyzeSensitivityWithLLM, generateSensitivityReport };
