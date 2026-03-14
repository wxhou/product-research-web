/**
 * 行业关键品牌数据库
 *
 * 用于检测竞争分析中是否包含行业主要品牌
 */

export interface Brand {
  name: string;
  aliases?: string[];
  country?: string;
  category: 'global' | 'china' | 'emerging';
}

export interface IndustryBrands {
  industry: string;
  aliases?: string[];
  majorBrands: Brand[];
}

/**
 * 行业品牌数据库
 */
export const INDUSTRY_BRANDS: IndustryBrands[] = [
  {
    industry: '洗碗机',
    aliases: ['洗碗机', '餐具清洗机', ' dishwasher'],
    majorBrands: [
      { name: '海尔', aliases: ['Haier'], category: 'china' },
      { name: '美的', aliases: ['Midea'], category: 'china' },
      { name: '方太', aliases: ['Fotile'], category: 'china' },
      { name: '老板', aliases: ['Robam'], category: 'china' },
      { name: '西门子', aliases: ['Siemens'], category: 'global' },
      { name: '博世', aliases: ['Bosch'], category: 'global' },
      { name: '松下', aliases: ['Panasonic'], category: 'global' },
      { name: '小米', aliases: ['Xiaomi'], category: 'china' },
    ],
  },
  {
    industry: '智能家居',
    aliases: ['智能家居', '智能家电', 'smart home'],
    majorBrands: [
      { name: '小米', aliases: ['Xiaomi', '米家'], category: 'china' },
      { name: '华为', aliases: ['Huawei', '鸿蒙'], category: 'china' },
      { name: '苹果', aliases: ['Apple', 'HomeKit'], category: 'global' },
      { name: '谷歌', aliases: ['Google', 'Nest'], category: 'global' },
      { name: '亚马逊', aliases: ['Amazon', 'Alexa'], category: 'global' },
      { name: '海尔', aliases: ['Haier', 'U+'], category: 'china' },
      { name: '美的', aliases: ['Midea'], category: 'china' },
    ],
  },
  {
    industry: '电商',
    aliases: ['电商', '电子商务', 'e-commerce'],
    majorBrands: [
      { name: '阿里巴巴', aliases: ['Alibaba', '淘宝', '天猫'], category: 'china' },
      { name: '京东', aliases: ['JD', '京东商城'], category: 'china' },
      { name: '拼多多', aliases: ['Pinduoduo'], category: 'china' },
      { name: '亚马逊', aliases: ['Amazon'], category: 'global' },
      { name: 'eBay', aliases: ['eBay'], category: 'global' },
      { name: 'Shopify', aliases: ['Shopify'], category: 'global' },
    ],
  },
  {
    industry: '新能源汽车',
    aliases: ['新能源汽车', '电动车', 'EV', 'new energy vehicles'],
    majorBrands: [
      { name: '比亚迪', aliases: ['BYD'], category: 'china' },
      { name: '特斯拉', aliases: ['Tesla'], category: 'global' },
      { name: '蔚来', aliases: ['NIO'], category: 'china' },
      { name: '理想', aliases: ['Li Auto'], category: 'china' },
      { name: '小鹏', aliases: ['XPeng'], category: 'china' },
      { name: '吉利', aliases: ['Geely', '极氪'], category: 'china' },
      { name: '大众', aliases: ['Volkswagen', 'ID.4'], category: 'global' },
      { name: '宝马', aliases: ['BMW'], category: 'global' },
    ],
  },
  {
    industry: 'SaaS',
    aliases: ['SaaS', '软件即服务', '云服务'],
    majorBrands: [
      { name: 'Salesforce', aliases: ['Salesforce'], category: 'global' },
      { name: 'Workday', aliases: ['Workday'], category: 'global' },
      { name: 'Slack', aliases: ['Slack'], category: 'global' },
      { name: 'Zoom', aliases: ['Zoom'], category: 'global' },
      { name: '钉钉', aliases: ['DingTalk'], category: 'china' },
      { name: '飞书', aliases: ['Feishu', 'Lark'], category: 'china' },
      { name: '企业微信', aliases: ['WeCom'], category: 'china' },
    ],
  },
  {
    industry: '餐饮',
    aliases: ['餐饮', '餐饮业', 'restaurant'],
    majorBrands: [
      { name: '海底捞', aliases: ['Haidilao'], category: 'china' },
      { name: '西贝', aliases: ['Xibei'], category: 'china' },
      { name: '麦当劳', aliases: ['McDonald'], category: 'global' },
      { name: '肯德基', aliases: ['KFC'], category: 'global' },
      { name: '星巴克', aliases: ['Starbucks'], category: 'global' },
    ],
  },
];

/**
 * 获取行业的关键品牌
 */
export function getIndustryBrands(industry: string): IndustryBrands | undefined {
  const lowerIndustry = industry.toLowerCase();

  for (const ib of INDUSTRY_BRANDS) {
    if (lowerIndustry.includes(ib.industry.toLowerCase())) {
      return ib;
    }
    if (ib.aliases?.some(a => lowerIndustry.includes(a.toLowerCase()))) {
      return ib;
    }
  }

  return undefined;
}

/**
 * 检测报告中缺少哪些关键品牌
 */
export function detectMissingBrands(report: string, industry: string): Brand[] {
  const industryBrands = getIndustryBrands(industry);
  if (!industryBrands) {
    return [];
  }

  const missing: Brand[] = [];
  const lowerReport = report.toLowerCase();

  for (const brand of industryBrands.majorBrands) {
    const found = brand.name.toLowerCase().includes(lowerReport) ||
      brand.aliases?.some(a => lowerReport.includes(a.toLowerCase()));

    if (!found) {
      missing.push(brand);
    }
  }

  return missing;
}

/**
 * 品牌情报信息
 */
export interface BrandIntelligence {
  brandName: string;
  marketPosition: string;
  keyProducts: string[];
  strengths: string[];
  challenges: string[];
  inferred: boolean;
  confidence: number;
}

/**
 * 使用LLM补充缺失品牌的情报信息
 */
export async function supplementBrandIntelligence(
  missingBrands: Brand[],
  industry: string,
  existingReport: string
): Promise<BrandIntelligence[]> {
  if (missingBrands.length === 0) {
    return [];
  }

  const brandNames = missingBrands.map(b => b.name).join('、');

  const prompt = `你是行业分析专家。请为以下缺失的品牌提供简要情报信息。

## 行业: ${industry}

## 缺失品牌: ${brandNames}

## 已有报告摘要:
${existingReport.substring(0, 2000)}

## 输出要求
请为每个品牌生成以下信息（返回JSON数组）：
- brandName: 品牌名称
- marketPosition: 市场定位（一句话）
- keyProducts: 主要产品线（数组，2-3个）
- strengths: 品牌优势（数组，2-3个）
- challenges: 面临的挑战（数组，2-3个）

## 重要提示
- 这是基于行业知识的推断，请标注 inferred: true
- 如果不确定的信息，confidence 设置较低（0.3-0.5）
- 已有信息明确的部分，confidence 设置较高（0.7-0.9）

## 输出格式
返回JSON数组：
[
  {
    "brandName": "品牌名",
    "marketPosition": "市场定位描述",
    "keyProducts": ["产品1", "产品2"],
    "strengths": ["优势1", "优势2"],
    "challenges": ["挑战1", "挑战2"],
    "inferred": true,
    "confidence": 0.6
  }
]`;

  try {
    const { generateText } = await import('@/lib/llm');
    const { parseJsonFromLLM } = await import('@/lib/json-utils');

    const result = await generateText(prompt);
    const intelligence = parseJsonFromLLM<BrandIntelligence[]>(result, []);

    if (Array.isArray(intelligence) && intelligence.length > 0) {
      return intelligence.map(i => ({
        ...i,
        inferred: true,
      }));
    }
  } catch (error) {
    console.error('[BrandDatabase] LLM supplement failed:', error);
  }

  // 如果LLM失败，返回空数组
  return [];
}
