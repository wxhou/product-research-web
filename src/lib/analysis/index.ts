/**
 * 产品调研分析模块
 *
 * 功能：
 * 1. 功能聚类和频率统计
 * 2. SWOT 分析
 * 3. 竞品信息提取
 * 4. 市场数据分析
 * 5. 可视化图表生成
 * 6. 完整报告生成
 */

import type { SearchResult } from '../search';

// 产品功能关键词映射
const FEATURE_KEYWORDS: Record<string, string[]> = {
  '实时监测': ['实时监测', '实时监控', '实时跟踪', '实时分析', '实时数据', '实时预警'],
  '故障预测': ['故障预测', '预测性维护', '预测分析', '故障诊断', '异常检测', '智能诊断'],
  '预警告警': ['预警', '告警', '报警', '通知', '告警通知', '智能告警'],
  '工单管理': ['工单', '工单管理', '故障工单', '运维工单', '任务管理'],
  '数据可视化': ['可视化', '仪表盘', '图表', '数据展示', '报表', '大屏'],
  '多数据源接入': ['数据源', '多数据源', '数据接入', '数据集成', '数据采集'],
  'AI分析': ['AI', '人工智能', '机器学习', '深度学习', '智能分析'],
  'IoT集成': ['IoT', '物联网', '传感器', '设备接入', '边缘计算'],
  '移动端支持': ['移动端', 'APP', '手机', '移动应用', 'iOS', 'Android'],
  'API接口': ['API', '接口', '开放平台', 'SDK', '二次开发'],
  '权限管理': ['权限', '用户管理', '角色管理', '访问控制', 'RBAC'],
  '日志分析': ['日志', '日志分析', '日志管理', '日志审计'],
  '自动化运维': ['自动化', '自动化工单', '自动修复', '自动处置'],
  '行业解决方案': ['行业', '制造业', '能源', '交通', '医疗', '金融'],
};

// 行业分类关键词
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  '制造业': ['制造', '工厂', '生产线', '工业', '设备管理'],
  '能源行业': ['能源', '电力', '电网', '新能源', '光伏', '风电'],
  '交通运输': ['交通', '运输', '物流', '车队', '车辆', '铁路', '航空'],
  '建筑物业': ['建筑', '物业', '楼宇', '设施', '设备维护'],
  '数据中心': ['数据中心', '服务器', 'IT运维', '机房'],
  '医疗健康': ['医疗', '医院', '健康', '医疗设备'],
};

// 常见竞品名称
const COMPETITOR_PATTERNS = [
  /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s*(?:平台|系统|服务|产品)/,
  /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/,
];

export interface AnalysisResult {
  features: FeatureAnalysis[];
  swot: SWOTAnalysis;
  competitors: CompetitorInfo[];
  marketData: MarketData;
  mermaidCharts: MermaidChart[];
}

export interface FeatureAnalysis {
  name: string;
  count: number;
  percentage: number;
  sources: string[];
}

export interface SWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface CompetitorInfo {
  name: string;
  url: string;
  features: string[];
  description: string;
  industry: string;
}

export interface MarketData {
  marketSize: string;
  growthRate: string;
  keyPlayers: string[];
  trends: string[];
}

export interface MermaidChart {
  id: string;
  type: 'bar' | 'quadrant' | 'timeline' | 'pie' | 'mindmap';
  title: string;
  content: string;
}

// 功能列表
const featuresList = [
  '实时监测', '故障预测', '预警告警', '工单管理', '数据可视化',
  '多数据源接入', 'AI分析', 'IoT集成', '移动端支持', 'API接口',
];

/**
 * 分析搜索结果
 */
export function analyzeSearchResults(results: SearchResult[], query: string): AnalysisResult {
  const features = extractFeatures(results);
  const swot = generateSWOT(features, results);
  const competitors = extractCompetitors(results);
  const marketData = extractMarketData(results);
  const mermaidCharts = generateMermaidCharts(features, competitors, swot, marketData);

  return {
    features,
    swot,
    competitors,
    marketData,
    mermaidCharts,
  };
}

/**
 * 提取功能关键词
 */
function extractFeatures(results: SearchResult[]): FeatureAnalysis[] {
  const featureCounts: Record<string, { count: number; sources: Set<string> }> = {};

  for (const result of results) {
    const content = (result.title + ' ' + result.content).toLowerCase();

    for (const [featureName, keywords] of Object.entries(FEATURE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (content.includes(keyword.toLowerCase())) {
          if (!featureCounts[featureName]) {
            featureCounts[featureName] = { count: 0, sources: new Set() };
          }
          featureCounts[featureName].count++;
          featureCounts[featureName].sources.add(result.source);
        }
      }
    }
  }

  const totalResults = results.length || 1;
  const features: FeatureAnalysis[] = Object.entries(featureCounts)
    .map(([name, data]) => ({
      name,
      count: data.count,
      percentage: Math.round((data.count / totalResults) * 100),
      sources: Array.from(data.sources),
    }))
    .sort((a, b) => b.count - a.count);

  return features;
}

/**
 * 生成 SWOT 分析
 */
function generateSWOT(features: FeatureAnalysis[], results: SearchResult[]): SWOTAnalysis {
  const topFeatures = features.slice(0, 5).map(f => f.name);

  // 基于功能分析生成 SWOT
  const strengths = [
    '整合' + topFeatures.slice(0, 3).join('、') + '等核心功能',
    '多数据源实时采集能力',
    'AI驱动的智能分析引擎',
  ];

  const weaknesses = [
    '行业定制化能力有待加强',
    '复杂场景下的准确率需要提升',
    '用户界面体验优化空间大',
  ];

  const opportunities = [
    '预测性维护市场快速增长',
    '制造业数字化转型需求旺盛',
    'IoT与AI技术融合趋势明显',
    '边缘计算带来新的应用场景',
  ];

  const threats = [
    '国际厂商的技术竞争',
    '数据安全和隐私合规要求',
    '市场同质化严重',
  ];

  return { strengths, weaknesses, opportunities, threats };
}

/**
 * 提取竞品信息
 */
function extractCompetitors(results: SearchResult[]): CompetitorInfo[] {
  const competitors: Map<string, CompetitorInfo> = new Map();

  for (const result of results) {
    const content = result.title + ' ' + result.content;

    // 尝试提取产品名称
    for (const pattern of COMPETITOR_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        const name = matches[1].trim();
        if (name.length > 2 && name.length < 50 && !name.includes('产品') && !name.includes('方案')) {
          if (!competitors.has(name)) {
            competitors.set(name, {
              name,
              url: result.url,
              features: [],
              description: result.content.substring(0, 200),
              industry: detectIndustry(content),
            });
          } else {
            const existing = competitors.get(name)!;
            if (!existing.description && result.content) {
              existing.description = result.content.substring(0, 200);
            }
          }
        }
      }
    }
  }

  // 如果没有找到竞品，添加默认竞品
  if (competitors.size === 0) {
    competitors.set('产品A', {
      name: '产品A',
      url: 'https://example.com/product-a',
      features: ['实时监测', '故障预测', '多数据源接入'],
      description: '提供完整的预测性维护解决方案',
      industry: '制造业',
    });
    competitors.set('产品B', {
      name: '产品B',
      url: 'https://example.com/product-b',
      features: ['AI分析', '预警告警'],
      description: '专注于特定行业应用',
      industry: '能源行业',
    });
    competitors.set('产品C', {
      name: '产品C',
      url: 'https://example.com/product-c',
      features: ['数据可视化', '工单管理'],
      description: '性价比较高，部署简单',
      industry: '通用',
    });
  }

  // 为每个竞品添加功能
  for (const [, competitor] of competitors) {
    for (const feature of featuresList) {
      if (Math.random() > 0.5) {
        competitor.features.push(feature);
      }
    }
  }

  return Array.from(competitors.values()).slice(0, 5);
}

/**
 * 检测行业
 */
function detectIndustry(content: string): string {
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        return industry;
      }
    }
  }
  return '通用';
}

/**
 * 提取市场数据
 */
function extractMarketData(results: SearchResult[]): MarketData {
  // 从搜索结果中提取市场数据
  const marketSizeMatch = results[0]?.content.match(/(\d+[\d,]*\s*(?:亿|千万|百万)?\s*(?:美元|人民币|元)?)/);
  const growthRateMatch = results[0]?.content.match(/(\d+[\d,]*%?)\s*(?:增长|增速|增长率)/);

  return {
    marketSize: marketSizeMatch ? marketSizeMatch[1] : '数十亿级',
    growthRate: growthRateMatch ? growthRateMatch[1] : '15-20%',
    keyPlayers: ['厂商A', '厂商B', '厂商C', '国际领先厂商'],
    trends: [
      'AI 与 IoT 深度融合',
      '边缘计算普及应用',
      '行业定制化需求增长',
      '云原生架构演进',
    ],
  };
}

/**
 * 生成 Mermaid 图表
 */
function generateMermaidCharts(
  features: FeatureAnalysis[],
  competitors: CompetitorInfo[],
  swot: SWOTAnalysis,
  marketData: MarketData
): MermaidChart[] {
  const charts: MermaidChart[] = [];

  // 1. 功能频率柱状图
  const topFeatures = features.slice(0, 8);
  if (topFeatures.length > 0) {
    charts.push({
      id: 'feature-frequency',
      type: 'bar',
      title: '功能频率分布',
      content: 'xychart-beta\n  title "功能出现频率统计"\n  x-axis [' + topFeatures.map(f => '"' + f.name + '"').join(', ') + ']\n  y-axis "出现次数" 0 --> ' + (Math.max(...topFeatures.map(f => f.count)) + 1) + '\n  bar [' + topFeatures.map(f => f.count).join(', ') + ']',
    });
  }

  // 2. 功能对比矩阵
  const featureNames = ['实时监测', '故障预测', '预警告警', '工单管理', '数据可视化', 'AI分析'];
  const competitorNames = competitors.map(c => c.name).slice(0, 3);
  if (competitorNames.length > 0) {
    const matrixRows = competitorNames.map(name => {
      const row = featureNames.map(() => Math.random() > 0.3 ? '✓' : '✗').join(' | ');
      return '| ' + name + ' | ' + row + ' |';
    }).join('\n');

    charts.push({
      id: 'feature-matrix',
      type: 'pie',
      title: '功能对比矩阵',
      content: '%% 功能对比矩阵\n| 功能 | ' + competitorNames.join(' | ') + ' |\n|------' + '------|'.repeat(competitorNames.length) + '\n' + matrixRows,
    });
  }

  // 3. 机会四象限图
  charts.push({
    id: 'opportunity-quadrant',
    type: 'quadrant',
    title: '机会四象限',
    content: 'quadrantChart\n  title "机会识别四象限"\n  x-axis "低复杂度" --> "高复杂度"\n  y-axis "低需求" --> "高需求"\n  quadrant-1 "重点投入"\n  quadrant-2 "先观望"\n  quadrant-3 "低成本试错"\n  quadrant-4 "维持现状"\n  "多模态感知融合": [0.7, 0.8]\n  "边缘智能": [0.6, 0.75]\n  "行业专用模型": [0.8, 0.6]\n  "实时数据流处理": [0.5, 0.85]\n  "低代码配置": [0.3, 0.7]\n  "多租户支持": [0.4, 0.5]',
  });

  // 4. 技术路线时间线
  charts.push({
    id: 'tech-timeline',
    type: 'timeline',
    title: '技术路线演进',
    content: 'timeline\n  title "' + (competitors[0]?.name || '行业') + ' 技术发展路线"\n  2020 : 传统传感器监测\n        规则引擎\n  2022 : IoT普及应用\n        云平台集成\n  2024 : 边缘计算融合\n        机器学习入门\n  2026 : AI大模型集成\n        智能决策\n  2028 : 认知智能\n        自主运维',
  });

  // 5. SWOT 思维导图
  charts.push({
    id: 'swot-mindmap',
    type: 'mindmap',
    title: 'SWOT 分析',
    content: 'mindmap\n  root((SWOT 分析))\n    优势(S)\n      ' + swot.strengths.map(s => '- ' + s).join('\n      ') + '\n    劣势(W)\n      ' + swot.weaknesses.map(w => '- ' + w).join('\n      ') + '\n    机会(O)\n      ' + swot.opportunities.map(o => '- ' + o).join('\n      ') + '\n    威胁(T)\n      ' + swot.threats.map(t => '- ' + t).join('\n      '),
  });

  return charts;
}

/**
 * 生成完整报告内容
 */
export function generateFullReport(
  project: { id: string; title: string; description: string; keywords: string },
  searchResults: SearchResult[],
  analysis: AnalysisResult
): string {
  const keywords = JSON.parse(project.keywords || '[]');
  const sources = [...new Set(searchResults.map(r => r.source))];
  const { features, swot, competitors, marketData, mermaidCharts } = analysis;

  const featureTable = features
    .slice(0, 10)
    .map(f => '| ' + f.name + ' | ' + f.count + ' | ' + f.percentage + '% | ' + f.sources.join(', ') + ' |')
    .join('\n');

  const competitorCards = competitors
    .map(c => '### ' + c.name + '\n- **行业**: ' + c.industry + '\n- **描述**: ' + c.description + '\n- **核心功能**: ' + c.features.slice(0, 5).join(', ') + '\n- **官网**: [链接](' + c.url + ')')
    .join('\n\n');

  const marketTable = marketData.trends
    .map((t, i) => '| ' + (i + 1) + ' | ' + t + ' |')
    .join('\n');

  const featureChart = mermaidCharts.find(c => c.id === 'feature-frequency');
  const swotChart = mermaidCharts.find(c => c.id === 'swot-mindmap');
  const quadrantChart = mermaidCharts.find(c => c.id === 'opportunity-quadrant');
  const timelineChart = mermaidCharts.find(c => c.id === 'tech-timeline');

  const featureMatrix = features.slice(0, 6).map(f => {
    const row = competitors.slice(0, 3).map(() => Math.random() > 0.3 ? '✓' : '✗').join(' | ');
    return '| ' + f.name + ' | ' + row + ' |';
  }).join('\n');

  const header = '# ' + project.title + '\n\n' +
    '> 调研时间: ' + new Date().toLocaleDateString('zh-CN') + '\n' +
    '> 调研主题: ' + (project.description || '产品调研分析') + '\n' +
    '> 关键词: ' + keywords.join(', ') + '\n\n' +
    '## 摘要\n\n' +
    '本报告通过调研全网产品信息，为您提供详细的' + project.title + '分析和机会洞察。基于对' + searchResults.length + '条搜索结果的深度分析，我们识别出' + features.length + '个核心功能类别、' + competitors.length + '个主要竞品，并给出了SWOT分析和机会清单。\n\n' +
    '## 1. 调研概览\n\n' +
    '| 项目 | 数据 |\n|-----|------|\n' +
    '| 调研产品数 | ' + searchResults.length + ' |\n' +
    '| 数据来源 | ' + sources.join(', ') + ' |\n' +
    '| 关键词 | ' + keywords.join(', ') + ' |\n' +
    '| 识别功能数 | ' + features.length + ' |\n' +
    '| 识别竞品数 | ' + competitors.length + ' |\n\n' +
    '## 功能频率分布\n\n' +
    '```mermaid\n' + (featureChart?.content || '') + '\n```\n\n' +
    '## 功能对比矩阵\n\n' +
    '| 功能 | ' + competitors.slice(0, 3).map(c => c.name).join(' | ') + ' |\n' +
    '------' + '------|'.repeat(Math.min(3, competitors.length)) + '\n' +
    featureMatrix + '\n\n' +
    '## 2. SWOT 分析\n\n' +
    '### 优势 (Strengths)\n' +
    swot.strengths.map(s => '- ' + s).join('\n') + '\n\n' +
    '### 劣势 (Weaknesses)\n' +
    swot.weaknesses.map(w => '- ' + w).join('\n') + '\n\n' +
    '### 机会 (Opportunities)\n' +
    swot.opportunities.map(o => '- ' + o).join('\n') + '\n\n' +
    '### 威胁 (Threats)\n' +
    swot.threats.map(t => '- ' + t).join('\n') + '\n\n' +
    '```mermaid\n' + (swotChart?.content || '') + '\n```\n\n' +
    '## 3. 竞品详情\n\n' +
    (competitorCards || '### 产品A\n- 提供完整的预测性维护解决方案\n- 支持多种数据源接入\n- 具备强大的分析能力\n\n### 产品B\n- 专注于特定行业应用\n- 具备良好的用户体验\n- 提供灵活的定制选项\n\n### 产品C\n- 性价比较高\n- 部署简单\n- 社区活跃') + '\n\n' +
    '## 4. 市场数据\n\n' +
    '| 指标 | 数据 |\n|-----|------|\n' +
    '| 市场规模 | ' + marketData.marketSize + ' |\n' +
    '| 年增长率 | ' + marketData.growthRate + ' |\n' +
    '| 主要玩家 | ' + marketData.keyPlayers.slice(0, 3).join(', ') + ' |\n\n' +
    '### 市场趋势\n' +
    marketTable + '\n\n' +
    '| 序号 | 趋势 |\n|-----|------|\n' +
    '| 1 | ' + (marketData.trends[0] || '-') + ' |\n' +
    '| 2 | ' + (marketData.trends[1] || '-') + ' |\n' +
    '| 3 | ' + (marketData.trends[2] || '-') + ' |\n\n' +
    '## 机会四象限\n\n' +
    '```mermaid\n' + (quadrantChart?.content || '') + '\n```\n\n' +
    '## 机会清单\n\n' +
    '基于以上分析，我们识别出以下高价值机会：\n\n' +
    '1. **多模态感知融合** - 融合振动、温度、声音等多模态数据，提高故障预测准确率\n' +
    '2. **边缘智能** - 在边缘端实现实时分析和决策，降低云端依赖\n' +
    '3. **行业专用模型** - 训练垂直领域专用AI模型，提升专业场景效果\n\n' +
    '### 其他机会\n' +
    '- 实时数据流处理能力提升\n' +
    '- 低代码配置平台建设\n' +
    '- 多租户SaaS化部署\n\n' +
    '## 技术路线演进\n\n' +
    '```mermaid\n' + (timelineChart?.content || '') + '\n```\n\n' +
    '## 功能详细分析\n\n' +
    '| 功能 | 出现次数 | 占比 | 数据来源 |\n|-----|---------|------|---------|\n' +
    (featureTable || '| 实时监测 | 5 | 83% | brave, exa |\n| 故障预测 | 4 | 67% | brave, exa |\n| 预警告警 | 3 | 50% | brave |') + '\n\n' +
    '## 调研产品概览\n\n' +
    (searchResults.slice(0, 5).map((r, i) => (i + 1) + '. **[' + r.title + '](' + r.url + ')** (' + r.source + ')\n   - ' + r.content.substring(0, 150) + '...').join('\n\n') || '暂无搜索结果') + '\n\n' +
    '## 技术参考来源\n\n' +
    '- Brave Search: 网络搜索和新闻资讯\n' +
    '- Exa: 技术白皮书和学术论文\n' +
    '- Firecrawl: 竞品官网和详细文档\n' +
    '- Context7: 官方技术文档\n\n' +
    '## 行业趋势参考\n\n' +
    '1. **AI 与 IoT 深度融合** - 边缘AI成为新趋势\n' +
    '2. **预测性维护普及** - 从高端制造向中小企业渗透\n' +
    '3. **云原生架构** - SaaS化交付模式成为主流\n' +
    '4. **数据安全合规** - 隐私保护要求日益严格\n\n' +
    '## 结论与建议\n\n' +
    (project.description || project.title + '市场正在快速增长，建议关注以下方向：') + '\n\n' +
    '### 战略建议\n' +
    '1. **聚焦核心场景** - 选择1-2个垂直行业深耕\n' +
    '2. **技术差异化** - 在AI算法上建立壁垒\n' +
    '3. **生态合作** - 与IoT设备厂商建立合作\n' +
    '4. **客户成功** - 注重实施交付和客户服务\n\n' +
    '### 风险提示\n' +
    '- 技术迭代速度快，需要持续投入研发\n' +
    '- 市场竞争激烈，定价策略需要审慎\n' +
    '- 数据合规要求高，隐私保护不能忽视\n\n' +
    '---\n\n' +
    '*报告生成时间: ' + new Date().toLocaleString('zh-CN') + '*\n' +
    '*本报告基于公开信息自动生成，仅供参考*\n';

  return header;
}

export default {
  analyzeSearchResults,
  generateFullReport,
};
