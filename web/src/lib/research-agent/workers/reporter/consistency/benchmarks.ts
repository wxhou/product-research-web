/**
 * 行业基准数据
 *
 * 用于验证报告中数值的合理性
 */

export interface IndustryBenchmark {
  industry: string;
  /** 常见的CAGR范围 (年复合增长率) */
  cagrRange: { min: number; max: number };
  /** 常见的市场规模单位 */
  typicalScale: string;
  /** 常见的毛利率范围 (%) */
  marginRange: { min: number; max: number };
}

/**
 * 行业基准数据库
 */
export const INDUSTRY_BENCHMARKS: Record<string, IndustryBenchmark> = {
  '洗碗机': {
    cagrRange: { min: 3, max: 15 },
    typicalScale: '亿元/百亿元',
    marginRange: { min: 20, max: 45 },
  },
  '智能家居': {
    cagrRange: { min: 10, max: 25 },
    typicalScale: '亿元/百亿元',
    marginRange: { min: 25, max: 50 },
  },
  'SaaS': {
    cagrRange: { min: 15, max: 40 },
    typicalScale: '亿元',
    marginRange: { min: 60, max: 85 },
  },
  '新能源汽车': {
    cagrRange: { min: 15, max: 35 },
    typicalScale: '亿元/万亿元',
    marginRange: { min: 10, max: 30 },
  },
  '电商': {
    cagrRange: { min: 5, max: 20 },
    typicalScale: '亿元/万亿元',
    marginRange: { min: 1, max: 15 },
  },
  '餐饮': {
    cagrRange: { min: 3, max: 15 },
    typicalScale: '亿元/万亿元',
    marginRange: { min: 30, max: 70 },
  },
  '教育': {
    cagrRange: { min: 5, max: 20 },
    typicalScale: '亿元',
    marginRange: { min: 20, max: 55 },
  },
  '医疗': {
    cagrRange: { min: 5, max: 18 },
    typicalScale: '亿元/万亿元',
    marginRange: { min: 15, max: 40 },
  },
  '制造业': {
    cagrRange: { min: 2, max: 12 },
    typicalScale: '亿元/万亿元',
    marginRange: { min: 10, max: 35 },
  },
  '软件': {
    cagrRange: { min: 8, max: 30 },
    typicalScale: '亿元',
    marginRange: { min: 50, max: 80 },
  },
};

/**
 * 获取行业基准数据
 */
export function getIndustryBenchmark(industry: string): IndustryBenchmark | undefined {
  // 尝试精确匹配
  if (INDUSTRY_BENCHMARKS[industry]) {
    return INDUSTRY_BENCHMARKS[industry];
  }

  // 尝试模糊匹配
  const lowerIndustry = industry.toLowerCase();
  for (const [key, benchmark] of Object.entries(INDUSTRY_BENCHMARKS)) {
    if (lowerIndustry.includes(key.toLowerCase()) || key.includes(lowerIndustry)) {
      return benchmark;
    }
  }

  return undefined;
}

/**
 * 验证CAGR是否在合理范围内
 */
export function validateCAGR(cagr: number, industry: string): {
  isValid: boolean;
  range?: { min: number; max: number };
  message?: string;
} {
  const benchmark = getIndustryBenchmark(industry);

  if (!benchmark) {
    return { isValid: true }; // 未知行业，不验证
  }

  if (cagr < benchmark.cagrRange.min) {
    return {
      isValid: false,
      range: benchmark.cagrRange,
      message: `${industry}行业的CAGR通常在${benchmark.cagrRange.min}%-${benchmark.cagrRange.max}%之间，当前值${cagr}%偏低`,
    };
  }

  if (cagr > benchmark.cagrRange.max) {
    return {
      isValid: false,
      range: benchmark.cagrRange,
      message: `${industry}行业的CAGR通常在${benchmark.cagrRange.min}%-${benchmark.cagrRange.max}%之间，当前值${cagr}%偏高`,
    };
  }

  return { isValid: true, range: benchmark.cagrRange };
}

/**
 * 验证市场规模是否合理
 */
export function validateMarketSize(size: number, unit: string, industry: string): {
  isValid: boolean;
  message?: string;
} {
  const benchmark = getIndustryBenchmark(industry);

  if (!benchmark) {
    return { isValid: true };
  }

  // 基本范围检查
  if (benchmark.typicalScale.includes('万亿元')) {
    if (size > 100) {
      return { isValid: false, message: '市场规模数值过大' };
    }
  } else if (benchmark.typicalScale.includes('亿元')) {
    if (size > 10000) {
      return { isValid: false, message: '市场规模数值过大' };
    }
  }

  return { isValid: true };
}
