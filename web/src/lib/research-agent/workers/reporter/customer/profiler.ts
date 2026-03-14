/**
 * 客户画像生成器
 *
 * 根据产品类型生成目标客户画像，包含客户类型、预算、决策流程
 */

import { generateText } from '@/lib/llm';
import { parseJsonFromLLM } from '@/lib/json-utils';

/**
 * 客户画像
 */
export interface CustomerProfile {
  /** 客户类型 */
  type: CustomerType;
  /** 公司规模 */
  companySize: CompanySize;
  /** 行业 */
  industry: string;
  /** 角色 */
  roles: string[];
  /** 痛点 */
  painPoints: string[];
  /** 需求 */
  needs: string[];
  /** 预算范围 */
  budget: BudgetRange;
  /** 决策流程 */
  decisionProcess: DecisionProcess;
  /** 购买动机 */
  purchaseMotivation: string[];
  /** 阻碍因素 */
  blockers: string[];
  /** 典型客户画像 */
  personas: Persona[];
}

/**
 * 客户类型
 */
export type CustomerType =
  | '大型企业'
  | '中型企业'
  | '小型企业'
  | '初创公司'
  | '政府机构'
  | '教育机构'
  | '个人用户';

/**
 * 公司规模
 */
export type CompanySize =
  | '1-10人'
  | '11-50人'
  | '51-200人'
  | '201-500人'
  | '501-1000人'
  | '1000人以上';

/**
 * 预算范围
 */
export interface BudgetRange {
  min: string;
  max: string;
  currency: string;
  description: string;
}

/**
 * 决策流程
 */
export interface DecisionProcess {
  /** 决策角色 */
  decisionMakers: Array<{
    role: string;
    influence: 'high' | 'medium' | 'low';
    concerns: string[];
  }>;
  /** 典型流程 */
  typicalSteps: string[];
  /** 决策周期 */
  cycle: string;
}

/**
 * 典型客户画像
 */
export interface Persona {
  name: string;
  age?: string;
  role: string;
  company: string;
  background: string;
  goals: string[];
  frustrations: string[];
  quote: string;
}

/**
 * 产品类型到目标客户的映射
 */
const PRODUCT_CUSTOMER_MAP: Record<string, Partial<CustomerProfile>> = {
  'SaaS': {
    type: '中型企业',
    companySize: '51-200人',
    budget: {
      min: '10万',
      max: '100万',
      currency: '人民币',
      description: '年度订阅费用',
    },
  },
  '企业软件': {
    type: '大型企业',
    companySize: '500人以上',
    budget: {
      min: '50万',
      max: '500万',
      currency: '人民币',
      description: '包括实施费用',
    },
  },
  '移动应用': {
    type: '小型企业',
    companySize: '11-50人',
    budget: {
      min: '5万',
      max: '30万',
      currency: '人民币',
      description: '开发+维护年度费用',
    },
  },
  'AI/ML': {
    type: '中型企业',
    companySize: '201-500人',
    budget: {
      min: '30万',
      max: '200万',
      currency: '人民币',
      description: '项目制或年度服务',
    },
  },
};

/**
 * 使用 LLM 生成客户画像
 */
async function generateProfileWithLLM(
  productName: string,
  productType: string,
  industry?: string
): Promise<CustomerProfile> {
  const prompt = `你是B2B营销专家和客户分析师。请为产品 "${productName}" 生成详细的目标客户画像。

## 产品类型
${productType}

## 目标行业
${industry || '通用'}

## 要求
1. 确定目标客户类型（大型企业/中型企业/小型企业/初创公司等）
2. 分析目标公司的规模范围
3. 列出关键决策角色和影响力
4. 识别客户痛点和需求
5. 给出预算范围参考
6. 描述典型购买决策流程
7. 创建2-3个典型客户画像(Persona)

## 输出格式
**重要：必须返回严格符合 JSON 规范的输出**
- 所有属性名必须使用双引号包裹
- 所有字符串值必须使用双引号
- 不能使用单引号
- 不能使用尾随逗号
- 不要在 JSON 外面包裹任何文字说明

返回 JSON：
{
  "type": "中型企业",
  "companySize": "51-200人",
  "industry": "行业",
  "roles": ["CTO", "技术负责人"],
  "painPoints": ["痛点1", "痛点2"],
  "needs": ["需求1", "需求2"],
  "budget": {
    "min": "10万",
    "max": "100万",
    "currency": "人民币",
    "description": "描述"
  },
  "decisionProcess": {
    "decisionMakers": [
      {"role": "CTO", "influence": "high", "concerns": ["关注点"]}
    ],
    "typicalSteps": ["步骤1", "步骤2"],
    "cycle": "1-3个月"
  },
  "purchaseMotivation": ["动机1", "动机2"],
  "blockers": ["阻碍1", "阻碍2"],
  "personas": [
    {
      "name": "张三",
      "role": "技术总监",
      "company": "某科技公司",
      "background": "背景描述",
      "goals": ["目标1"],
      "frustrations": ["挫折1"],
      "quote": "引言"
    }
  ]
}

## 示例
输入: 产品"SaaS协作工具", 类型"SaaS", 行业"企业服务"
输出:
{
  "type": "中型企业",
  "companySize": "51-200人",
  "industry": "企业服务",
  "roles": ["CEO", "CTO", "运营负责人"],
  "painPoints": ["团队协作效率低", "信息分散难以追踪", "审批流程繁琐"],
  "needs": ["提升团队效率", "统一信息入口", "流程自动化"],
  "budget": {
    "min": "5万",
    "max": "30万",
    "currency": "人民币",
    "description": "年度订阅费用，含实施培训"
  },
  "decisionProcess": {
    "decisionMakers": [
      {"role": "CEO", "influence": "high", "concerns": ["成本", "ROI"]},
      {"role": "CTO", "influence": "high", "concerns": ["安全性", "集成能力"]},
      {"role": "运营负责人", "influence": "medium", "concerns": ["易用性", "功能完整"]}
    ],
    "typicalSteps": ["需求调研", "产品演示", "POC测试", "商务谈判", "签约"],
    "cycle": "1-2个月"
  },
  "purchaseMotivation": ["提升效率", "降本增效", "数字化转型"],
  "blockers": ["预算审批", "内部利益协调", "数据安全顾虑"],
  "personas": [
    {
      "name": "李总",
      "role": "CEO",
      "company": "某快速成长的科技公司",
      "background": "公司规模50人，近年业务快速增长",
      "goals": ["支撑业务快速增长", "提高团队执行力"],
      "frustrations": ["员工分散各地", "协作效率低"],
      "quote": "需要一个能真正提升效率的工具"
    }
  ]
}`;

  try {
    const result = await generateText(prompt);
    const profile = parseJsonFromLLM<CustomerProfile>(result);
    if (profile && profile.type) {
      return profile;
    }
  } catch (error) {
    console.error('[CustomerProfiler] LLM profile generation failed:', error);
  }

  return generateDefaultProfile(productType);
}

/**
 * 生成默认客户画像
 */
function generateDefaultProfile(productType: string): CustomerProfile {
  const baseProfile = PRODUCT_CUSTOMER_MAP[productType] || {};

  return {
    type: baseProfile.type || '中型企业',
    companySize: baseProfile.companySize || '51-200人',
    industry: '通用',
    roles: ['决策者', '技术负责人', '业务负责人'],
    painPoints: ['需要进一步分析'],
    needs: ['需要进一步分析'],
    budget: baseProfile.budget || {
      min: '待定',
      max: '待定',
      currency: '人民币',
      description: '需要根据具体方案确定',
    },
    decisionProcess: {
      decisionMakers: [
        { role: 'CEO', influence: 'high', concerns: ['成本', '效果'] },
        { role: '技术负责人', influence: 'medium', concerns: ['技术可行性'] },
      ],
      typicalSteps: ['需求调研', '方案评估', 'POC测试', '商务谈判', '签约'],
      cycle: '1-3个月',
    },
    purchaseMotivation: ['业务需求', '降本增效', '竞争优势'],
    blockers: ['预算不足', '内部决策周期长', '技术团队能力有限'],
    personas: [
      {
        name: '典型客户',
        role: '技术负责人',
        company: '某中型企业',
        background: '负责公司技术选型和数字化转型',
        goals: ['提升效率', '降低成本'],
        frustrations: ['现有方案成本高', '效果不理想'],
        quote: '我们正在寻找更好的解决方案',
      },
    ],
  };
}

/**
 * 生成 Markdown 格式的客户画像
 */
export function generateProfileMarkdown(profile: CustomerProfile): string {
  let md = `## 目标客户画像\n\n`;

  md += `### 客户概况\n\n`;
  md += `- **客户类型**: ${profile.type}\n`;
  md += `- **公司规模**: ${profile.companySize}\n`;
  md += `- **目标行业**: ${profile.industry}\n`;
  md += `- **关键角色**: ${profile.roles.join(', ')}\n`;

  md += `\n### 痛点与需求\n\n`;
  md += `**痛点**\n`;
  for (const p of profile.painPoints) {
    md += `- ${p}\n`;
  }
  md += `\n**需求**\n`;
  for (const n of profile.needs) {
    md += `- ${n}\n`;
  }

  md += `\n### 预算与决策\n\n`;
  md += `- **预算范围**: ${profile.budget.min} - ${profile.budget.max} ${profile.budget.currency}\n`;
  md += `- **预算说明**: ${profile.budget.description}\n`;
  md += `- **决策周期**: ${profile.decisionProcess.cycle}\n`;

  md += `\n**决策角色**\n`;
  for (const dm of profile.decisionProcess.decisionMakers) {
    const influenceIcon = dm.influence === 'high' ? '⭐' : dm.influence === 'medium' ? '★' : '☆';
    md += `- ${dm.role} (${influenceIcon}): ${dm.concerns.join(', ')}\n`;
  }

  md += `\n### 购买动机与阻碍\n\n`;
  md += `**动机**\n`;
  for (const m of profile.purchaseMotivation) {
    md += `- ${m}\n`;
  }
  md += `\n**阻碍因素**\n`;
  for (const b of profile.blockers) {
    md += `- ${b}\n`;
  }

  if (profile.personas.length > 0) {
    md += `\n### 典型客户画像\n\n`;
    for (const persona of profile.personas) {
      md += `#### ${persona.name}\n\n`;
      md += `- **角色**: ${persona.role}\n`;
      md += `- **公司**: ${persona.company}\n`;
      md += `- **背景**: ${persona.background}\n`;
      md += `- **目标**: ${persona.goals.join(', ')}\n`;
      md += `- **痛点**: ${persona.frustrations.join(', ')}\n`;
      md += `- **引言**: "${persona.quote}"\n\n`;
    }
  }

  return md;
}

/**
 * 创建客户画像生成器
 */
export function createCustomerProfiler() {
  return {
    generate: async (
      productName: string,
      productType: string,
      industry?: string
    ): Promise<CustomerProfile> => {
      return generateProfileWithLLM(productName, productType, industry);
    },
    toMarkdown: generateProfileMarkdown,
  };
}

export { generateProfileWithLLM, generateProfileMarkdown };
