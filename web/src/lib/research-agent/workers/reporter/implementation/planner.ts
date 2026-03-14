/**
 * 实施计划生成器
 *
 * 生成 MVP 定义、里程碑、验收标准和资源配置建议
 */

import { generateText } from '@/lib/llm';
import { parseJsonFromLLM } from '@/lib/json-utils';

/**
 * 实施计划输入
 */
export interface ImplementationInput {
  /** 产品/解决方案名称 */
  solutionName: string;
  /** 目标客户 */
  targetCustomer?: string;
  /** 行业 */
  industry?: string;
  /** 预算范围 */
  budget?: string;
  /** 团队规模 */
  teamSize?: string;
  /** 实施周期偏好 */
  timeline?: string;
}

/**
 * 实施计划结果
 */
export interface ImplementationPlan {
  /** MVP 定义 */
  mvp: MVPDefinition;
  /** 里程碑 */
  milestones: Milestone[];
  /** 资源配置 */
  resources: ResourceAllocation;
  /** 风险与缓解 */
  risks: RiskMitigation[];
  /** 验收标准 */
  acceptanceCriteria: AcceptanceCriteria[];
}

/**
 * MVP 定义
 */
export interface MVPDefinition {
  name: string;
  description: string;
  scope: string[];
  outOfScope: string[];
  successMetrics: string[];
}

/**
 * 里程碑
 */
export interface Milestone {
  name: string;
  duration: string;
  deliverables: string[];
  dependencies: string[];
  checkpoint: string;
}

/**
 * 资源配置
 */
export interface ResourceAllocation {
  team: TeamMember[];
  budget: BudgetItem[];
  tools: string[];
  external: ExternalResource[];
}

/**
 * 团队成员
 */
export interface TeamMember {
  role: string;
  count: number;
  effort: string;
  skills: string[];
}

/**
 * 预算项
 */
export interface BudgetItem {
  category: string;
  amount: number;
  percentage: number;
  notes?: string;
}

/**
 * 外部资源
 */
export interface ExternalResource {
  type: string;
  provider: string;
  purpose: string;
  cost?: string;
}

/**
 * 风险与缓解
 */
export interface RiskMitigation {
  risk: string;
  impact: 'high' | 'medium' | 'low';
  probability: 'high' | 'medium' | 'low';
  mitigation: string;
  contingency: string;
}

/**
 * 验收标准
 */
export interface AcceptanceCriteria {
  phase: string;
  criteria: string[];
  verification: string[];
}

/**
 * 类型守卫：验证 ImplementationPlan 结构
 */
function isValidImplementationPlan(plan: unknown): plan is ImplementationPlan {
  if (!plan || typeof plan !== 'object') return false;
  const p = plan as Record<string, unknown>;

  // 验证 MVP
  if (!p.mvp || typeof p.mvp !== 'object') return false;
  const mvp = p.mvp as Record<string, unknown>;
  if (!Array.isArray(mvp.scope) || !Array.isArray(mvp.outOfScope) || !Array.isArray(mvp.successMetrics)) {
    return false;
  }

  // 验证 milestones
  if (!Array.isArray(p.milestones)) return false;

  // 验证 acceptanceCriteria
  return isValidAcceptanceCriteria(p.acceptanceCriteria);
}

/**
 * 使用 LLM 生成实施计划
 */
async function generatePlanWithLLM(input: ImplementationInput): Promise<ImplementationPlan> {
  const prompt = `你是项目管理专家和解决方案架构师。请为以下解决方案制定详细的实施计划。

## 解决方案信息
- 名称: ${input.solutionName}
- 目标客户: ${input.targetCustomer || '待确定'}
- 行业: ${input.industry || '通用'}
- 预算范围: ${input.budget || '待评估'}
- 团队规模: ${input.teamSize || '待确定'}
- 实施周期: ${input.timeline || '待确定'}

## 计划要求
1. 定义 MVP（最小可行产品）- 核心功能范围
2. 制定里程碑计划 - 阶段划分和交付物
3. 资源配置建议 - 团队、预算、工具
4. 风险识别和缓解措施
5. 验收标准

## 重要约束
- **严格JSON格式**: 只返回纯JSON，不要任何前缀文字、后缀解释或markdown代码块标记
- **所有属性名必须使用双引号包裹**
- **所有字符串值必须使用双引号，不能使用单引号**
- **不能使用尾随逗号**
- **数组字段**: acceptanceCriteria 必须是数组，criteria 和 verification 也必须是数组
- **禁止占位符**: 所有字段必须有实际值，不要使用 "[待确定]" 等占位符
- **不要在 JSON 外面包裹任何文字说明**

## 输出格式
返回 JSON：
{
  "mvp": {
    "name": "MVP名称",
    "description": "一句话描述",
    "scope": ["功能1", "功能2"],
    "outOfScope": ["暂不包含的功能"],
    "successMetrics": ["成功指标1"]
  },
  "milestones": [
    {
      "name": "阶段名称",
      "duration": "2周",
      "deliverables": ["交付物1"],
      "dependencies": ["依赖项"],
      "checkpoint": "检查点"
    }
  ],
  "resources": {
    "team": [
      {"role": "项目经理", "count": 1, "effort": "50%", "skills": ["PMP", "敏捷"]}
    ],
    "budget": [
      {"category": "人力", "amount": 100000, "percentage": 40}
    ],
    "tools": ["工具1"],
    "external": []
  },
  "risks": [
    {
      "risk": "风险描述",
      "impact": "high",
      "probability": "medium",
      " mitigation": "缓解措施",
      "contingency": "应急预案"
    }
  ],
  "acceptanceCriteria": [
    {
      "phase": "阶段名",
      "criteria": ["标准1"],
      "verification": ["验证方法"]
    }
  ]
}`;

  try {
    const result = await generateText(prompt);
    const plan = parseJsonFromLLM<ImplementationPlan>(result);
    if (isValidImplementationPlan(plan)) {
      return plan;
    }
    console.warn('[ImplementationPlanner] LLM returned invalid plan structure, using default');
  } catch (error) {
    console.error('[ImplementationPlanner] LLM planning failed:', error);
  }

  return generateDefaultPlan(input);
}

/**
 * 生成默认实施计划
 */
function generateDefaultPlan(input: ImplementationPlan): ImplementationPlan {
  return {
    mvp: {
      name: `${input.solutionName} MVP`,
      description: '最小可行产品版本',
      scope: [
        '核心业务功能',
        '基础用户界面',
        '数据存储和检索',
        '基本报表功能',
      ],
      outOfScope: [
        '高级分析功能',
        '第三方集成',
        '移动端应用',
        '多语言支持',
      ],
      successMetrics: [
        '系统可用性 > 99%',
        '响应时间 < 3秒',
        '用户满意度 > 4分',
      ],
    },
    milestones: [
      {
        name: '规划与设计',
        duration: '2周',
        deliverables: ['需求文档', '技术方案', '项目计划'],
        dependencies: [],
        checkpoint: '需求评审通过',
      },
      {
        name: 'MVP 开发',
        duration: '6周',
        deliverables: ['MVP 版本', '用户文档', '测试报告'],
        dependencies: ['规划与设计'],
        checkpoint: 'MVP 功能完成',
      },
      {
        name: '测试与优化',
        duration: '2周',
        deliverables: ['测试报告', '性能优化', 'Bug修复'],
        dependencies: ['MVP 开发'],
        checkpoint: '通过验收测试',
      },
      {
        name: '部署与上线',
        duration: '1周',
        deliverables: ['上线报告', '运维文档', '培训材料'],
        dependencies: ['测试与优化'],
        checkpoint: '系统正式上线',
      },
    ],
    resources: {
      team: [
        { role: '项目经理', count: 1, effort: '100%', skills: ['项目管理', '沟通协调'] },
        { role: '开发工程师', count: 2, effort: '100%', skills: ['前端', '后端'] },
        { role: '测试工程师', count: 1, effort: '50%', skills: ['功能测试', '性能测试'] },
        { role: '产品经理', count: 1, effort: '30%', skills: ['需求分析', '产品设计'] },
      ],
      budget: [
        { category: '人力成本', amount: 150000, percentage: 60 },
        { category: '软件许可', amount: 30000, percentage: 12 },
        { category: '基础设施', amount: 25000, percentage: 10 },
        { category: '培训与文档', amount: 15000, percentage: 6 },
        { category: '预留 contingency', amount: 30000, percentage: 12 },
      ],
      tools: [
        '代码管理 (Git)',
        '项目管理 (Jira/Trello)',
        'CI/CD 工具',
        '监控工具',
      ],
      external: [],
    },
    risks: [
      {
        risk: '需求变更',
        impact: 'medium',
        probability: 'high',
        mitigation: '建立变更管理流程',
        contingency: '评估影响后调整计划',
      },
      {
        risk: '技术难题',
        impact: 'high',
        probability: 'medium',
        mitigation: '技术预研和原型验证',
        contingency: '预留技术缓冲时间',
      },
      {
        risk: '资源不足',
        impact: 'high',
        probability: 'low',
        mitigation: '提前确认资源到位',
        contingency: '调整范围或延长时间',
      },
    ],
    acceptanceCriteria: [
      {
        phase: '规划与设计',
        criteria: [
          '需求文档完整',
          '技术方案可行',
          '项目计划详细',
        ],
        verification: [
          '需求评审会议',
          '技术方案评审',
        ],
      },
      {
        phase: 'MVP 开发',
        criteria: [
          '所有 MVP 功能可用',
          '无阻塞性 Bug',
          '文档齐全',
        ],
        verification: [
          '功能测试通过',
          '代码审查通过',
        ],
      },
      {
        phase: '上线',
        criteria: [
          '系统稳定运行',
          '性能达标',
          '用户培训完成',
        ],
        verification: [
          '上线检查清单',
          '用户验收签字',
        ],
      },
    ],
  };
}

/**
 * 类型守卫：验证 acceptanceCriteria 是否为有效数组
 */
function isValidAcceptanceCriteria(criteria: unknown): criteria is AcceptanceCriteria[] {
  if (!Array.isArray(criteria)) return false;
  return criteria.every((item): item is AcceptanceCriteria => {
    return (
      typeof item === 'object' &&
      item !== null &&
      typeof item.phase === 'string' &&
      Array.isArray(item.criteria) &&
      Array.isArray(item.verification)
    );
  });
}

/**
 * 生成实施计划报告章节
 */
export function generatePlanReport(plan: ImplementationPlan): string {
  let report = `## 实施计划\n\n`;

  // MVP 定义
  report += `### MVP 定义\n\n`;
  report += `**${plan.mvp.name}**: ${plan.mvp.description}\n\n`;
  report += `**功能范围**\n`;
  for (const s of plan.mvp.scope) {
    report += `- ${s}\n`;
  }
  report += `\n**暂不包含**\n`;
  for (const s of plan.mvp.outOfScope) {
    report += `- ${s}\n`;
  }
  report += `\n**成功指标**\n`;
  for (const s of plan.mvp.successMetrics) {
    report += `- ${s}\n`;
  }

  // 里程碑
  report += `\n### 里程碑计划\n\n`;
  for (let i = 0; i < plan.milestones.length; i++) {
    const m = plan.milestones[i];
    report += `**${i + 1}. ${m.name}** (${m.duration})\n`;
    report += `- 检查点: ${m.checkpoint}\n`;
    report += `- 交付物:\n`;
    for (const d of m.deliverables) {
      report += `  - ${d}\n`;
    }
    if (m.dependencies.length > 0) {
      report += `- 依赖: ${m.dependencies.join(', ')}\n`;
    }
    report += '\n';
  }

  // 资源配置
  report += `### 资源配置\n\n`;
  report += `**团队**\n`;
  report += `| 角色 | 人数 | 工作量 | 技能 |\n`;
  report += `|------|------|--------|------|\n`;
  for (const t of plan.resources.team) {
    report += `| ${t.role} | ${t.count} | ${t.effort} | ${t.skills.join(', ')} |\n`;
  }

  report += `\n**预算**\n`;
  report += `| 类别 | 金额 | 占比 |\n`;
  report += `|------|------|------|\n`;
  for (const b of plan.resources.budget) {
    report += `| ${b.category} | ¥${b.amount.toLocaleString()} | ${b.percentage}% |\n`;
  }

  // 风险
  report += `\n### 风险与缓解\n\n`;
  report += `| 风险 | 影响 | 概率 | 缓解措施 |\n`;
  report += `|------|------|------|----------|\n`;
  for (const r of plan.risks) {
    report += `| ${r.risk} | ${r.impact} | ${r.probability} | ${r.mitigation} |\n`;
  }

  // 验收标准
  report += `\n### 验收标准\n\n`;
  const criteriaList = isValidAcceptanceCriteria(plan.acceptanceCriteria)
    ? plan.acceptanceCriteria
    : [];

  if (criteriaList.length === 0) {
    report += `暂无明确验收标准\n`;
  } else {
    for (const a of criteriaList) {
      report += `**${a.phase}**\n`;
      report += `- 标准: ${a.criteria.join(', ')}\n`;
      report += `- 验证: ${a.verification.join(', ')}\n\n`;
    }
  }

  return report;
}

/**
 * 创建实施计划生成器
 */
export function createImplementationPlanner() {
  return {
    generate: async (input: ImplementationInput): Promise<ImplementationPlan> => {
      return generatePlanWithLLM(input);
    },
    generateReport: generatePlanReport,
  };
}

export { generatePlanWithLLM, generatePlanReport };
