/**
 * 动态关键词生成器
 *
 * 从产品名称自动生成多种搜索变体
 */

export interface KeywordVariant {
  query: string;
  dimension: string;
  priority: number;
}

/**
 * 从产品名生成关键词变体
 * 通用设计：不依赖特定领域
 */
export function generateKeywordVariants(
  productName: string,
  industry?: string
): KeywordVariant[] {
  const variants: KeywordVariant[] = [];

  // 基础变体
  const baseVariants = [
    { query: productName, dimension: 'general', priority: 10 },
    { query: `${productName} 产品`, dimension: 'product', priority: 9 },
    { query: `${productName} 服务`, dimension: 'service', priority: 9 },
  ];

  // 竞品分析变体
  const competitorVariants = [
    { query: `${productName} 竞品`, dimension: 'competitor', priority: 8 },
    { query: `${productName} 对比`, dimension: 'comparison', priority: 8 },
    { query: `${productName} 替代`, dimension: 'alternative', priority: 7 },
    { query: `best ${productName} alternatives`, dimension: 'alternative', priority: 7 },
  ];

  // 市场分析变体
  const marketVariants = [
    { query: `${productName} 市场`, dimension: 'market', priority: 8 },
    { query: `${productName} 行业报告`, dimension: 'market', priority: 8 },
    { query: `${productName} 市场规模`, dimension: 'market', priority: 8 },
    { query: `${productName} 趋势`, dimension: 'trend', priority: 7 },
  ];

  // 用户分析变体
  const userVariants = [
    { query: `${productName} 用户`, dimension: 'user', priority: 7 },
    { query: `${productName} 评价`, dimension: 'review', priority: 7 },
    { query: `${productName} 体验`, dimension: 'review', priority: 6 },
    { query: `${productName} 口碑`, dimension: 'review', priority: 6 },
  ];

  // 技术分析变体
  const techVariants = [
    { query: `${productName} 技术`, dimension: 'technology', priority: 7 },
    { query: `${productName} 架构`, dimension: 'technology', priority: 6 },
    { query: `${productName} 功能`, dimension: 'feature', priority: 7 },
  ];

  // 商业分析变体
  const businessVariants = [
    { query: `${productName} 定价`, dimension: 'pricing', priority: 7 },
    { query: `${productName} 收费`, dimension: 'pricing', priority: 6 },
    { query: `${productName} 商业模式`, dimension: 'business', priority: 7 },
  ];

  // 如果提供了行业，增加行业特定变体
  if (industry) {
    marketVariants.push(
      { query: `${industry} 市场分析`, dimension: 'market', priority: 8 },
      { query: `${industry} 行业报告`, dimension: 'market', priority: 8 },
      { query: `${industry} 发展趋势`, dimension: 'trend', priority: 7 }
    );
  }

  // 合并所有变体
  variants.push(
    ...baseVariants,
    ...competitorVariants,
    ...marketVariants,
    ...userVariants,
    ...techVariants,
    ...businessVariants
  );

  return variants;
}

/**
 * 生成多轮搜索计划
 * 通用设计：适用于任意产品
 */
export function generateSearchPlan(
  productName: string,
  industry?: string,
  options?: {
    rounds?: number;
    maxQueriesPerRound?: number;
  }
): KeywordVariant[] {
  const rounds = options?.rounds ?? 10;
  const maxPerRound = options?.maxQueriesPerRound ?? 10;

  const allVariants = generateKeywordVariants(productName, industry);

  // 按优先级排序
  const sorted = [...allVariants].sort((a, b) => b.priority - a.priority);

  // 分成多轮
  const plan: KeywordVariant[] = [];
  for (let i = 0; i < rounds && plan.length < rounds * maxPerRound; i++) {
    // 每轮选择不同维度的关键词，保证多样性
    const dimensions = ['general', 'competitor', 'market', 'user', 'technology', 'pricing'];
    const roundDim = dimensions[i % dimensions.length];

    const roundQueries = sorted
      .filter(v => v.dimension === roundDim || v.priority >= 7)
      .slice(0, maxPerRound);

    plan.push(...roundQueries);
  }

  // 去重
  const seen = new Set<string>();
  const unique: KeywordVariant[] = [];
  for (const v of plan) {
    if (!seen.has(v.query)) {
      seen.add(v.query);
      unique.push(v);
    }
  }

  return unique.slice(0, 100); // 最多100个
}
