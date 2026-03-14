/**
 * 竞品分析器
 *
 * 根据行业自动识别主要竞品，收集竞品基本信息
 */

import { generateText } from '@/lib/llm';
import { parseJsonFromLLM } from '@/lib/json-utils';
import type { CompetitorAnalysis } from '../../types';

/**
 * 竞品基本信息
 */
export interface CompetitorInfo {
  name: string;
  /** 竞品简称/别名 */
  alias?: string;
  /** 公司全称 */
  companyName?: string;
  /** 官网 */
  website?: string;
  /** 成立时间 */
  foundedYear?: string;
  /** 总部 */
  headquarters?: string;
  /** 融资阶段 */
  fundingStage?: string;
  /** 核心定位 */
  positioning: string;
  /** 主要产品/服务 */
  products: string[];
  /** 目标用户 */
  targetUsers: string[];
  /** 优势 */
  strengths: string[];
  /** 劣势 */
  weaknesses: string[];
  /** 估值/市值（如有） */
  valuation?: string;
  /** 市场份额预估 */
  marketShare?: string;
}

/**
 * 行业竞品配置
 */
interface IndustryCompetitorConfig {
  industry: string;
  knownCompetitors: string[];
  dataSources: string[];
}

/**
 * 行业竞品配置库
 */
const INDUSTRY_COMPETITOR_CONFIGS: IndustryCompetitorConfig[] = [
  {
    industry: '人工智能',
    knownCompetitors: ['百度', '阿里云', '腾讯云', '华为云', '商汤科技', '旷视科技', '依图科技'],
    dataSources: ['官网', 'IT桔子', 'Crunchbase', '行业报告'],
  },
  {
    industry: 'SaaS',
    knownCompetitors: ['钉钉', '飞书', '企业微信', 'Slack', 'Notion', 'Figma'],
    dataSources: ['官网', 'G2', 'Capterra', '行业报告'],
  },
  {
    industry: '电商',
    knownCompetitors: ['淘宝', '京东', '拼多多', '抖音电商', '快手电商', '小红书'],
    dataSources: ['官网', '艾瑞咨询', '易观分析', '财报'],
  },
  {
    industry: '金融科技',
    knownCompetitors: ['蚂蚁集团', '京东科技', '腾讯金融', '银联', 'Stripe', 'PayPal'],
    dataSources: ['官网', '金融时报', 'Crunchbase', '监管披露'],
  },
  {
    industry: '医疗健康',
    knownCompetitors: ['平安好医生', '丁香园', '微医', '阿里健康', '京东健康'],
    dataSources: ['官网', '卫健委', '动脉网', '行业报告'],
  },
];

/**
 * 根据行业获取已知竞品列表
 */
export function getKnownCompetitors(industry: string): string[] {
  for (const config of INDUSTRY_COMPETITOR_CONFIGS) {
    if (industry.toLowerCase().includes(config.industry) ||
        config.industry.includes(industry)) {
      return config.knownCompetitors;
    }
  }
  return [];
}

/**
 * 使用 LLM 扩展竞品信息
 */
async function enrichCompetitorInfo(
  competitor: string,
  industry: string,
  existingInfo?: Partial<CompetitorInfo>
): Promise<CompetitorInfo> {
  const prompt = `你是行业研究专家。请为竞品 "${competitor}" 补充详细信息。

## 行业背景
${industry}

## 已知信息
${JSON.stringify(existingInfo || {}, null, 2)}

## 要求
请根据你的知识库，补充以下信息（如果无法确定请标注"未知"）：
1. 公司全称
2. 官网（如有）
3. 成立时间
4. 总部所在地
5. 融资阶段（如已上市则标注"上市公司"）
6. 核心定位（一句话描述）
7. 主要产品/服务（列出2-4个）
8. 目标用户群体
9. 主要优势（2-3点）
10. 主要劣势（2-3点）

## 输出格式
**重要：必须返回严格符合 JSON 规范的输出**
- 所有属性名必须使用双引号包裹
- 所有字符串值必须使用双引号
- 不能使用单引号
- 不能使用尾随逗号
- 不要在 JSON 外面包裹任何文字说明

返回 JSON：
{
  "name": "竞品简称",
  "companyName": "公司全称",
  "website": "官网",
  "foundedYear": "成立年份",
  "headquarters": "总部",
  "fundingStage": "融资阶段",
  "positioning": "核心定位",
  "products": ["产品1", "产品2"],
  "targetUsers": ["用户1", "用户2"],
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["劣势1", "劣势2"]
}

## 示例
输入: 竞品 "商汤科技", 行业 "人工智能"
输出:
{
  "name": "商汤科技",
  "companyName": "北京市商汤科技开发有限公司",
  "website": "https://www.sensetime.com",
  "foundedYear": "2014",
  "headquarters": "北京",
  "fundingStage": "上市公司",
  "positioning": "专注于计算机视觉和深度学习技术的人工智能平台公司",
  "products": ["SenseME", "SenseFoundry", "SenseDrive", "SenseArcface"],
  "targetUsers": ["政府", "大型企业", "金融机构"],
  "strengths": ["技术研发实力强", "专利数量多", "学术成就突出"],
  "weaknesses": ["商业化落地慢", "盈利压力大"]
}`;

  try {
    const result = await generateText(prompt);
    const enriched = parseJsonFromLLM<CompetitorInfo>(result);
    if (enriched && enriched.name) {
      return {
        name: competitor,
        positioning: enriched.positioning || '未知',
        products: enriched.products || [],
        targetUsers: enriched.targetUsers || [],
        strengths: enriched.strengths || [],
        weaknesses: enriched.weaknesses || [],
        ...enriched,
      };
    }
  } catch (error) {
    console.error('[CompetitiveAnalyzer] Failed to enrich competitor info:', error);
  }

  // 返回基本信息
  return {
    name: competitor,
    positioning: '待分析',
    products: [],
    targetUsers: [],
    strengths: [],
    weaknesses: [],
  };
}

/**
 * 创建竞品分析器
 */
export function createCompetitiveAnalyzer() {
  return {
    identify: async (industry: string, existingCompetitors?: string[]): Promise<CompetitorInfo[]> => {
      return identifyCompetitors(industry, existingCompetitors);
    },
    enrich: async (competitor: string, industry: string): Promise<CompetitorInfo> => {
      return enrichCompetitorInfo(competitor, industry);
    },
  };
}

/**
 * 识别竞品
 */
async function identifyCompetitors(
  industry: string,
  existingCompetitors?: string[]
): Promise<CompetitorInfo[]> {
  // 1. 获取已知竞品
  const knownCompetitors = getKnownCompetitors(industry);

  // 2. 合并已识别的竞品
  const allCompetitors = new Set<string>([
    ...knownCompetitors,
    ...(existingCompetitors || []),
  ]);

  // 3. 如果需要，使用 LLM 扩展
  if (allCompetitors.size < 3) {
    const prompt = `你是行业研究专家。请根据行业 "${industry}" 识别出 5-8 个主要竞争对手。

已知竞品：${Array.from(allCompetitors).join(', ') || '无'}

请列出你认为的主要竞品，按市场份额/知名度排序。
只返回竞品名称，用逗号分隔。`;

    try {
      const result = await generateText(prompt);
      const found = result.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
      found.forEach(c => allCompetitors.add(c));
    } catch (error) {
      console.error('[CompetitiveAnalyzer] Failed to identify competitors:', error);
    }
  }

  // 4. 转换为 CompetitorInfo 格式
  const competitors: CompetitorInfo[] = [];
  for (const name of Array.from(allCompetitors).slice(0, 8)) {
    competitors.push({
      name,
      positioning: '待分析',
      products: [],
      targetUsers: [],
      strengths: [],
      weaknesses: [],
    });
  }

  return competitors;
}

export { identifyCompetitors, enrichCompetitorInfo };
