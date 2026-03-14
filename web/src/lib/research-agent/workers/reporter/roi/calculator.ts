/**
 * ROI 计算器
 *
 * 计算投资回报率，包含完整 TCO 计算
 */

import { generateText } from '@/lib/llm';
import { parseJsonFromLLM } from '@/lib/json-utils';

/**
 * ROI 计算输入
 */
export interface ROIInput {
  /** 产品/解决方案名称 */
  solutionName: string;
  /** 预期收益（年） */
  expectedBenefit?: {
    revenue?: string;    // 预期增加收入
    costSaving?: string; // 预期节省成本
    efficiency?: string; // 效率提升比例
  };
  /** 实施方案 */
  implementation?: {
    duration?: string;      // 实施周期
    teamSize?: string;      // 团队规模
    resources?: string;     // 所需资源
  };
  /** 行业 */
  industry?: string;
}

/**
 * ROI 计算结果
 */
export interface ROIResult {
  /** ROI 百分比 */
  roi: number;
  /** 投资回报期（月） */
  paybackPeriod: number;
  /** 总投资成本 */
  totalInvestment: {
    explicit: ExplicitCost[];
    implicit: ImplicitCost[];
  };
  /** 收益明细 */
  benefits: Benefit[];
  /** 净收益 */
  netBenefit: number;
  /** 敏感性分析数据 */
  sensitivity: SensitivityAnalysis;
}

/**
 * 显性成本
 */
export interface ExplicitCost {
  name: string;
  amount: number;
  unit: string;
  category: 'software' | 'hardware' | 'labor' | 'training' | 'integration' | 'maintenance' | 'other';
  description?: string;
}

/**
 * 隐性成本
 */
export interface ImplicitCost {
  name: string;
  amount: number;
  unit: string;
  category: 'productivity' | 'resistance' | 'opportunity' | 'risk' | 'other';
  description?: string;
}

/**
 * 收益
 */
export interface Benefit {
  name: string;
  amount: number;
  unit: string;
  category: 'revenue' | 'cost_saving' | 'efficiency' | 'risk_reduction' | 'other';
  description?: string;
  timeframe?: string;
}

/**
 * 敏感性分析
 */
export interface SensitivityAnalysis {
  optimistic: number;   // 乐观情况 ROI
  base: number;         // 基准 ROI
  pessimistic: number;  // 悲观情况 ROI
  keyFactors: string[];
}

/**
 * TCO 计算模板
 */
const TCO_TEMPLATE = {
  software: [
    { name: '软件许可费', defaultAmount: 50000, unit: '年' },
    { name: '订阅费用', defaultAmount: 30000, unit: '年' },
    { name: '实施费', defaultAmount: 20000, unit: '次' },
  ],
  hardware: [
    { name: '服务器/云资源', defaultAmount: 15000, unit: '年' },
    { name: '网络设备', defaultAmount: 10000, unit: '次' },
  ],
  labor: [
    { name: '项目团队人力', defaultAmount: 100000, unit: '项目' },
    { name: '内部协调成本', defaultAmount: 20000, unit: '项目' },
  ],
  training: [
    { name: '培训费用', defaultAmount: 15000, unit: '次' },
    { name: '学习曲线成本', defaultAmount: 10000, unit: '次' },
  ],
  integration: [
    { name: '系统集成费', defaultAmount: 25000, unit: '次' },
    { name: '数据迁移费', defaultAmount: 15000, unit: '次' },
  ],
  maintenance: [
    { name: '维护费用', defaultAmount: 20000, unit: '年' },
    { name: '技术支持', defaultAmount: 15000, unit: '年' },
  ],
};

/**
 * 使用 LLM 计算 ROI
 */
async function calculateROIWithLLM(input: ROIInput): Promise<ROIResult> {
  const prompt = `你是财务分析师和ROI计算专家。请为以下解决方案计算投资回报率(ROI)和总拥有成本(TCO)。

## 解决方案信息
- 名称: ${input.solutionName}
- 行业: ${input.industry || '通用'}
- 预期收益:
  - 增加收入: ${input.expectedBenefit?.revenue || '待评估'}
  - 节省成本: ${input.expectedBenefit?.costSaving || '待评估'}
  - 效率提升: ${input.expectedBenefit?.efficiency || '待评估'}
- 实施方案:
  - 周期: ${input.implementation?.duration || '待评估'}
  - 团队: ${input.implementation?.teamSize || '待评估'}

## 计算要求
1. 列出所有显性成本（软件、硬件、人力、培训、集成、维护等）
2. 列出所有隐性成本（生产力损失、内部阻力、机会成本等）
3. 计算预期收益（量化）
4. 计算 ROI 公式: (收益 - 成本) / 成本 × 100%
5. 计算投资回收期

## 输出格式
**重要：必须返回严格符合 JSON 规范的输出**
- 所有属性名必须使用双引号包裹
- 所有字符串值必须使用双引号
- 不能使用单引号
- 不能使用尾随逗号
- 不要在 JSON 外面包裹任何文字说明

返回 JSON：
{
  "roi": 150,  // ROI百分比
  "paybackPeriod": 12,  // 回收期（月）
  "totalInvestment": {
    "explicit": [
      {"name": "软件许可", "amount": 50000, "unit": "年", "category": "software"}
    ],
    "implicit": [
      {"name": "学习曲线", "amount": 10000, "unit": "次", "category": "productivity"}
    ]
  },
  "benefits": [
    {"name": "效率提升", "amount": 80000, "unit": "年", "category": "efficiency"}
  ],
  "netBenefit": 150000,
  "sensitivity": {
    "optimistic": 200,
    "base": 150,
    "pessimistic": 80,
    "keyFactors": ["收入增长", "实施周期", "用户采用率"]
  }
}`;

  try {
    const result = await generateText(prompt);
    const roi = parseJsonFromLLM<ROIResult>(result);
    if (roi && roi.roi !== undefined) {
      return roi;
    }
  } catch (error) {
    console.error('[ROICalculator] LLM calculation failed:', error);
  }

  return calculateDefaultROI();
}

/**
 * 计算默认 ROI（基于模板）
 */
function calculateDefaultROI(): ROIResult {
  // 计算总显性成本
  const explicitCosts: ExplicitCost[] = [];
  let totalExplicit = 0;

  for (const category of Object.values(TCO_TEMPLATE)) {
    for (const item of category) {
      explicitCosts.push({
        name: item.name,
        amount: item.defaultAmount,
        unit: item.unit,
        category: item.category as any,
      });
      totalExplicit += item.defaultAmount;
    }
  }

  // 默认隐性成本为显性的 20%
  const implicitCosts: ImplicitCost[] = [
    {
      name: '学习曲线成本',
      amount: Math.round(totalExplicit * 0.1),
      unit: '次',
      category: 'productivity',
    },
    {
      name: '内部阻力成本',
      amount: Math.round(totalExplicit * 0.1),
      unit: '次',
      category: 'resistance',
    },
  ];
  const totalImplicit = totalExplicit * 0.2;

  // 默认收益为总成本的 1.5 倍
  const totalCost = totalExplicit + totalImplicit;
  const totalBenefit = totalCost * 1.5;

  const benefits: Benefit[] = [
    {
      name: '效率提升',
      amount: Math.round(totalBenefit * 0.4),
      unit: '年',
      category: 'efficiency',
    },
    {
      name: '成本节省',
      amount: Math.round(totalBenefit * 0.3),
      unit: '年',
      category: 'cost_saving',
    },
    {
      name: '收入增长',
      amount: Math.round(totalBenefit * 0.3),
      unit: '年',
      category: 'revenue',
    },
  ];

  const roi = ((totalBenefit - totalCost) / totalCost) * 100;

  return {
    roi: Math.round(roi),
    paybackPeriod: 12,
    totalInvestment: {
      explicit: explicitCosts,
      implicit: implicitCosts,
    },
    benefits,
    netBenefit: totalBenefit - totalCost,
    sensitivity: {
      optimistic: Math.round(roi * 1.5),
      base: Math.round(roi),
      pessimistic: Math.round(roi * 0.5),
      keyFactors: ['市场表现', '实施效果', '用户采用率'],
    },
  };
}

/**
 * 生成 ROI 报告章节
 */
export function generateROIReport(result: ROIResult): string {
  let report = `## ROI 分析\n\n`;

  // 执行摘要
  report += `### 执行摘要\n\n`;
  report += `- **投资回报率 (ROI)**: ${result.roi}%\n`;
  report += `- **投资回收期**: ${result.paybackPeriod} 个月\n`;
  report += `- **净收益**: ¥${result.netBenefit.toLocaleString()}\n`;

  // 成本明细
  report += `\n### 投资成本明细\n\n`;

  report += `#### 显性成本\n\n`;
  report += `| 成本项 | 金额 | 单位 | 类别 |\n`;
  report += `|--------|------|------|------|\n`;
  for (const cost of result.totalInvestment.explicit) {
    report += `| ${cost.name} | ¥${cost.amount.toLocaleString()} | ${cost.unit} | ${cost.category} |\n`;
  }

  const totalExplicit = result.totalInvestment.explicit.reduce((sum, c) => sum + c.amount, 0);
  report += `| **合计** | **¥${totalExplicit.toLocaleString()}** | | |\n`;

  report += `\n#### 隐性成本\n\n`;
  report += `| 成本项 | 金额 | 单位 | 类别 |\n`;
  report += `|--------|------|------|------|\n`;
  for (const cost of result.totalInvestment.implicit) {
    report += `| ${cost.name} | ¥${cost.amount.toLocaleString()} | ${cost.unit} | ${cost.category} |\n`;
  }

  const totalImplicit = result.totalInvestment.implicit.reduce((sum, c) => sum + c.amount, 0);
  report += `| **合计** | **¥${totalImplicit.toLocaleString()}** | | |\n`;

  // 收益明细
  report += `\n### 预期收益\n\n`;
  report += `| 收益项 | 金额 | 单位 | 类别 |\n`;
  report += `|--------|------|------|------|\n`;
  for (const benefit of result.benefits) {
    report += `| ${benefit.name} | ¥${benefit.amount.toLocaleString()} | ${benefit.unit} | ${benefit.category} |\n`;
  }

  const totalBenefit = result.benefits.reduce((sum, b) => sum + b.amount, 0);
  report += `| **合计** | **¥${totalBenefit.toLocaleString()}** | | |\n`;

  // 敏感性分析
  report += `\n### 敏感性分析\n\n`;
  report += `| 情景 | ROI |\n`;
  report += `|------|-----|\n`;
  report += `| 乐观 | ${result.sensitivity.optimistic}% |\n`;
  report += `| 基准 | ${result.sensitivity.base}% |\n`;
  report += `| 悲观 | ${result.sensitivity.pessimistic}% |\n`;

  report += `\n**关键影响因素**: ${result.sensitivity.keyFactors.join(', ')}\n`;

  return report;
}

/**
 * 创建 ROI 计算器
 */
export function createROICalculator() {
  return {
    calculate: async (input: ROIInput): Promise<ROIResult> => {
      if (input.solutionName) {
        return calculateROIWithLLM(input);
      }
      return calculateDefaultROI();
    },
    generateReport: generateROIReport,
  };
}

export {
  calculateROIWithLLM,
  calculateDefaultROI,
  generateROIReport,
  TCO_TEMPLATE,
};
