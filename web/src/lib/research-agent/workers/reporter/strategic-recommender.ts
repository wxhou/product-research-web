/**
 * 战略建议生成器
 *
 * 基于SMART原则生成可执行的战略建议
 */

import { generateText } from '@/lib/llm';
import { parseJsonFromLLM } from '@/lib/json-utils';

/**
 * 战略建议
 */
export interface StrategicRecommendation {
  id: string;
  title: string;
  description: string;
  timeline: string;
  milestones: Milestone[];
  resources: string[];
  kpis: string[];
  risks: string[];
  owner?: string;
}

/**
 * 里程碑
 */
export interface Milestone {
  name: string;
  duration: string;
  deliverables: string[];
  checkpoint: string;
}

/**
 * 建议生成输入
 */
export interface RecommendationInput {
  industry: string;
  productName?: string;
  marketData?: string;
  competitorAnalysis?: string;
  existingRecommendations?: string;
  targetTimeline?: string;
}

/**
 * 使用LLM生成SMART战略建议
 */
async function generateStrategicRecommendationsWithLLM(input: RecommendationInput): Promise<StrategicRecommendation[]> {
  const prompt = `你是战略规划专家。请基于以下信息，为产品生成符合SMART原则的可执行战略建议。

## 行业/产品信息
- 行业: ${input.industry}
- 产品: ${input.productName || '待确定'}
- 目标时间线: ${input.targetTimeline || '1-3年'}

## 市场数据
${input.marketData || '无具体数据'}

## 竞争分析
${input.competitorAnalysis || '无竞争分析数据'}

## 现有建议
${input.existingRecommendations || '无'}

## SMART原则要求
每个建议必须包含：
1. **S**pecific（具体）- 明确要做什么
2. **M**easurable（可衡量）- 有量化目标
3. **A**chievable（可达成）- 目标合理可实现
4. **R**elevant（相关）- 与业务目标相关
5. **T**ime-bound（有时限）- 有明确时间节点

## 输出要求
生成3-5条战略建议，每条包含：
- 标题（一句话概括）
- 详细描述
- 时间周期
- 关键里程碑（2-4个）
- 所需资源
- KPI指标
- 主要风险
- 建议负责人

## 输出格式
返回JSON数组：
[
  {
    "id": "rec-1",
    "title": "建议标题",
    "description": "详细描述",
    "timeline": "Q1-Q2 2026",
    "milestones": [
      {"name": "里程碑1", "duration": "2周", "deliverables": ["交付物1"], "checkpoint": "检查点"}
    ],
    "resources": ["资源1", "资源2"],
    "kpis": ["KPI1", "KPI2"],
    "risks": ["风险1"],
    "owner": "建议负责人"
  }
]

如果无法生成，返回空数组 []。

## 重要提示
- 建议必须基于提供的市场数据和竞争分析
- 量化目标要具体（如：市场占有率从5%提升到15%）
- 里程碑要有明确的交付物和检查点
- 风险要真实且有缓解措施`;

  try {
    const result = await generateText(prompt);
    const recommendations = parseJsonFromLLM<StrategicRecommendation[]>(result, []);

    if (Array.isArray(recommendations) && recommendations.length > 0) {
      return recommendations;
    }
  } catch (error) {
    console.error('[StrategicRecommender] LLM generation failed:', error);
  }

  return [];
}

/**
 * 生成Markdown格式的战略建议
 */
export function generateRecommendationsMarkdown(recommendations: StrategicRecommendation[]): string {
  if (recommendations.length === 0) {
    return '暂无战略建议';
  }

  let md = '## 战略建议\n\n';

  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    md += `### ${i + 1}. ${rec.title}\n\n`;
    md += `**时间周期**: ${rec.timeline}\n\n`;
    md += `**详细描述**: ${rec.description}\n\n`;

    if (rec.milestones && rec.milestones.length > 0) {
      md += `**关键里程碑**\n\n`;
      for (const m of rec.milestones) {
        md += `- ${m.name} (${m.duration}): ${m.checkpoint}\n`;
      }
      md += '\n';
    }

    if (rec.kpis && rec.kpis.length > 0) {
      md += `**KPI指标**\n`;
      for (const kpi of rec.kpis) {
        md += `- ${kpi}\n`;
      }
      md += '\n';
    }

    if (rec.resources && rec.resources.length > 0) {
      md += `**所需资源**: ${rec.resources.join(', ')}\n\n`;
    }

    if (rec.risks && rec.risks.length > 0) {
      md += `**主要风险**\n`;
      for (const risk of rec.risks) {
        md += `- ${risk}\n`;
      }
      md += '\n';
    }

    if (rec.owner) {
      md += `**建议负责人**: ${rec.owner}\n\n`;
    }

    md += '---\n\n';
  }

  return md;
}

/**
 * 创建战略建议生成器
 */
export function createStrategicRecommender() {
  return {
    generate: async (input: RecommendationInput): Promise<StrategicRecommendation[]> => {
      return generateStrategicRecommendationsWithLLM(input);
    },
    toMarkdown: generateRecommendationsMarkdown,
  };
}

/**
 * 评估现有建议的可操作性
 */
export function evaluateRecommendationActionability(recommendations: string): {
  score: number;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // 1. 检查是否有明确的标题
  const hasTitle = /#{1,3}\s+/.test(recommendations);
  if (hasTitle) {
    score += 20;
  } else {
    issues.push('缺少明确的建议标题');
    suggestions.push('使用Markdown标题格式（## 建议标题）');
  }

  // 2. 检查是否有量化目标
  const hasQuantified = /\d+(?:\.\d+)?%|\d+(?:\.\d+)?倍|¥\d+|市场占有率|提升\d+%|增长\d+%/i.test(recommendations);
  if (hasQuantified) {
    score += 25;
  } else {
    issues.push('缺少量化目标');
    suggestions.push('添加具体的数字目标（如：市场占有率达到15%）');
  }

  // 3. 检查是否有时间表
  const hasTimeline = /Q[1-4]|\d{4}年|\d+月|第[一二三四]季度|\d+-\d+个月/i.test(recommendations);
  if (hasTimeline) {
    score += 25;
  } else {
    issues.push('缺少实施时间表');
    suggestions.push('添加具体的时间节点（如：Q1 2026完成）');
  }

  // 4. 检查是否有里程碑
  const hasMilestones = /里程碑|阶段|步骤| deliverables?|交付物/i.test(recommendations);
  if (hasMilestones) {
    score += 15;
  } else {
    issues.push('缺少关键里程碑');
    suggestions.push('将建议拆解为2-4个关键里程碑');
  }

  // 5. 检查是否有风险评估
  const hasRisk = /风险|挑战|问题|应对|缓解/i.test(recommendations);
  if (hasRisk) {
    score += 15;
  } else {
    issues.push('缺少风险评估');
    suggestions.push('为每条建议添加风险识别和缓解措施');
  }

  return { score, issues, suggestions };
}

export { generateStrategicRecommendationsWithLLM, generateRecommendationsMarkdown };
