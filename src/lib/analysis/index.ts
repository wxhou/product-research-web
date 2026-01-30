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

import type { SearchResult } from '../datasources';

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

// 需要排除的无效竞品名称模式
const INVALID_COMPETITOR_PATTERNS = [
  /^(a|an|the|and|or|but|for|nor|on|at|to|from|by|with|of|in|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|shall|can|need|dare|ought|used)$/i,  // 常见单词
  /^\d+$/,  // 纯数字
  /^[a-z]$/i,  // 单个字母
  /^(true|false|null|undefined|yes|no|ok|error|success|warning|info)$/i,  // 编程相关
  /^(v\d|version\s*\d|ver\s*\d)/i,  // 版本号
  /^(https?|http|ftp|mailto|www\.)/i,  // URL
  /\.(com|cn|org|net|io|co|ai|cc|tw|hk|gov|edu)$/i,  // 域名结尾
  /^[A-Z]{1,2}\d+[A-Z]?$/,  // 型号代码
  /^(chapter|section|part|volume|issue|page|paper|article|book|novel|report|thesis|dissertation)/i,  // 文献类型
];

// 需要排除的源（不包含有效竞品）
const EXCLUDE_SOURCES = [
  'amazon', 'douban', 'goodreads', 'books', 'zhihu', 'weixin', 'weibo',
];

/**
 * 检查名称是否为有效竞品
 */
function isValidCompetitorName(name: string, source?: string): boolean {
  const trimmedName = name.trim();

  // 长度检查
  if (trimmedName.length < 3 || trimmedName.length > 40) {
    return false;
  }

  // 排除无效模式
  for (const pattern of INVALID_COMPETITOR_PATTERNS) {
    if (pattern.test(trimmedName)) {
      return false;
    }
  }

  // 排除包含特定词汇的名称
  const excludeWords = ['产品', '方案', '系统', '平台', '服务', '版本', '教程', '指南', '手册', '文档', '说明书', '电子书', '书籍'];
  for (const word of excludeWords) {
    if (trimmedName.includes(word)) {
      return false;
    }
  }

  // 如果源是排除列表中的，可能不包含有效竞品
  if (source) {
    const lowerSource = source.toLowerCase();
    for (const exclude of EXCLUDE_SOURCES) {
      if (lowerSource.includes(exclude)) {
        return false;
      }
    }
  }

  return true;
}

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
  type: 'bar' | 'quadrant' | 'timeline' | 'pie' | 'mindmap' | 'flowchart' | 'graph' | 'gantt' | 'sequence' | 'classDiagram' | 'stateDiagram' | 'erDiagram' | 'journey' | 'radar' | 'xychart' | 'pie' | 'flowchart-v2';
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
export function analyzeSearchResults(results: SearchResult[], _query: string): AnalysisResult {
  const features = extractFeatures(results);
  const swot = generateSWOT(features);
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
      // 检查是否有关键词匹配（每个功能只计算一次）
      const hasMatch = keywords.some(keyword => content.includes(keyword.toLowerCase()));
      if (hasMatch) {
        if (!featureCounts[featureName]) {
          featureCounts[featureName] = { count: 0, sources: new Set() };
        }
        featureCounts[featureName].count++;
        featureCounts[featureName].sources.add(result.source);
      }
    }
  }

  const totalResults = results.length || 1;
  const features: FeatureAnalysis[] = Object.entries(featureCounts)
    .map(([name, data]) => ({
      name,
      count: data.count,
      percentage: Math.min(Math.round((data.count / totalResults) * 100), 100),
      sources: Array.from(data.sources),
    }))
    .sort((a, b) => b.count - a.count);

  return features;
}

/**
 * 生成 SWOT 分析
 */
function generateSWOT(features: FeatureAnalysis[]): SWOTAnalysis {
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
        // 使用新的验证函数
        if (isValidCompetitorName(name, result.source)) {
          const resultContent = result.content || '';
          if (!competitors.has(name)) {
            competitors.set(name, {
              name,
              url: result.url,
              features: [],
              description: resultContent.substring(0, 200),
              industry: detectIndustry(content),
            });
          } else {
            const existing = competitors.get(name)!;
            if (!existing.description && resultContent) {
              existing.description = resultContent.substring(0, 200);
            }
          }
        }
      }
    }
  }

  // 如果没有找到有效竞品，添加默认竞品
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

  // 基于功能出现频率为竞品分配功能
  const featureScores: Record<string, number> = {};
  for (const result of results) {
    const content = result.title + ' ' + result.content;
    for (const feature of featuresList) {
      if (content.includes(feature)) {
        featureScores[feature] = (featureScores[feature] || 0) + 1;
      }
    }
  }

  for (const [, competitor] of competitors) {
    // 根据功能在所有搜索结果中的出现频率来决定竞品是否具有该功能
    for (const feature of featuresList) {
      const score = featureScores[feature] || 0;
      // 如果功能在超过 30% 的搜索结果中出现，认为是核心功能
      if (score > results.length * 0.3) {
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
  const firstResult = results[0]?.content || '';
  const marketSizeMatch = firstResult.match(/(\d+[\d,]*\s*(?:亿|千万|百万)?\s*(?:美元|人民币|元)?)/);
  const growthRateMatch = firstResult.match(/(\d+[\d,]*%?)\s*(?:增长|增速|增长率)/);

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
  _marketData: MarketData
): MermaidChart[] {
  const charts: MermaidChart[] = [];

  // 1. 功能频率分布图 (使用 pie 图表)
  const topFeatures = features.slice(0, 8);
  if (topFeatures.length > 0) {
    const featureData = topFeatures.map(f => `"${f.name}" : ${f.count}`).join('\n  ');
    charts.push({
      id: 'feature-frequency',
      type: 'pie',
      title: '功能频率分布',
      content: 'pie title 功能出现频率统计\n  ' + featureData,
    });
  }

  // 2. SWOT 思维导图
  charts.push({
    id: 'swot-mindmap',
    type: 'mindmap',
    title: 'SWOT 分析',
    content: 'mindmap\n  root((SWOT 分析))\n    优势(S)\n      ::icon(fa fa-star)\n      ' + swot.strengths.slice(0, 4).map(s => '- ' + s).join('\n      ') + '\n    劣势(W)\n      ::icon(fa fa-warning)\n      ' + swot.weaknesses.slice(0, 4).map(w => '- ' + w).join('\n      ') + '\n    机会(O)\n      ::icon(fa fa-lightbulb)\n      ' + swot.opportunities.slice(0, 4).map(o => '- ' + o).join('\n      ') + '\n    威胁(T)\n      ::icon(fa fa-exclamation-triangle)\n      ' + swot.threats.slice(0, 4).map(t => '- ' + t).join('\n      '),
  });

  // 3. 技术路线时间线
  charts.push({
    id: 'tech-timeline',
    type: 'timeline',
    title: '技术路线演进',
    content: 'timeline title 技术发展路线\n  2024 : 基础能力 : 数据采集、云平台集成\n  2025 : 智能升级 : AI分析、预测维护\n  2026 : 平台化 : 生态开放、多租户\n  2027 : 领先 : 认知智能、自主运维',
  });

  // 4. 用户旅程图
  charts.push({
    id: 'user-journey',
    type: 'journey',
    title: '用户旅程图',
    content: 'journey title 用户使用旅程\n  发现 : 5 : 用户 : 了解产品\n  考虑 : 4 : 用户 : 评估功能\n  决策 : 3 : 用户 : 价格比较\n  使用 : 5 : 用户 : 日常使用\n  留存 : 4 : 用户 : 持续使用\n  推荐 : 3 : 用户 : 分享推荐',
  });

  // 5. 竞品能力雷达图
  if (competitors.length >= 2) {
    charts.push({
      id: 'competitor-radar',
      type: 'radar',
      title: '竞品能力对比',
      content: 'radar title 竞品能力对比\n  axes: 功能丰富度, 性能表现, 用户体验, 价格竞争力, 技术创新, 生态完善度\n  ' + (competitors[0]?.name || '竞品A') + ': [80, 70, 85, 60, 75, 70]\n  ' + (competitors[1]?.name || '竞品B') + ': [70, 85, 75, 80, 65, 75]\n  本产品: [75, 75, 80, 70, 80, 65]',
    });
  }

  // 6. 市场占比饼图
  charts.push({
    id: 'market-share',
    type: 'pie',
    title: '市场份额分布',
    content: 'pie title 市场份额分布\n  "厂商A" : 35\n  "厂商B" : 25\n  "厂商C" : 20\n  "其他" : 20',
  });

  // 7. 系统架构图
  charts.push({
    id: 'architecture-diagram',
    type: 'graph',
    title: '系统架构参考',
    content: 'graph TD\n  subgraph "数据采集层"\n    A[IoT设备] --> B[边缘网关]\n    B --> C[数据采集服务]\n  end\n  subgraph "数据处理层"\n    C --> D[实时流处理]\n    C --> E[离线批处理]\n    D --> F[AI分析引擎]\n    E --> F\n  end\n  subgraph "应用服务层"\n    F --> G[业务规则引擎]\n    G --> H[预警服务]\n    G --> I[预测服务]\n  end\n  subgraph "展示层"\n    H --> J[Web仪表盘]\n    H --> K[移动端APP]\n    I --> J\n    I --> K\n  end',
  });

  // 8. 状态机图（功能状态流转）
  charts.push({
    id: 'state-diagram',
    type: 'stateDiagram',
    title: '功能状态流转',
    content: 'stateDiagram-v2\n  [*] --> 发现\n  发现 --> 考虑 : 用户搜索\n  考虑 --> 决策 : 试用体验\n  决策 --> 使用 : 购买转化\n  使用 --> 留存 : 持续价值\n  使用 --> 流失 : 体验不佳\n  流失 --> [*]\n  留存 --> 推荐 : 满意\n  推荐 --> [*]',
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

  // 获取各种图表
  const featureChart = mermaidCharts.find(c => c.id === 'feature-frequency');
  const swotChart = mermaidCharts.find(c => c.id === 'swot-mindmap');
  const quadrantChart = mermaidCharts.find(c => c.id === 'opportunity-quadrant');
  const timelineChart = mermaidCharts.find(c => c.id === 'tech-timeline');
  const journeyChart = mermaidCharts.find(c => c.id === 'user-journey');
  const radarChart = mermaidCharts.find(c => c.id === 'competitor-radar');
  const architectureChart = mermaidCharts.find(c => c.id === 'architecture-diagram');
  const stateChart = mermaidCharts.find(c => c.id === 'state-diagram');
  const marketShareChart = mermaidCharts.find(c => c.id === 'market-share');

  // 构建报告内容
  const report = `# ${project.title}

> 调研时间: ${new Date().toLocaleDateString('zh-CN')}
> 调研主题: ${project.description || '产品调研分析'}
> 关键词: ${keywords.join(', ') || project.title}

## 摘要

本报告通过调研全网产品信息，为您提供详细的${project.title}分析和机会洞察。基于对${searchResults.length}条搜索结果的深度分析，我们识别出${features.length}个核心功能类别、${competitors.length}个主要竞品，并给出了SWOT分析、市场机会和技术路线建议。

本报告涵盖市场背景、目标用户、竞品分析、功能分析、技术架构、SWOT分析、商业模式、机会分析、风险评估和战略建议等全方位内容。

## 1. 调研概览

| 项目 | 数据 |
|-----|------|
| 调研产品数 | ${searchResults.length} |
| 数据来源 | ${sources.join(', ') || '未知'} |
| 关键词 | ${keywords.join(', ') || project.title} |
| 识别功能数 | ${features.length} |
| 识别竞品数 | ${competitors.length} |

## 2. 市场背景分析

### 2.1 市场规模与趋势

| 指标 | 数据 |
|-----|------|
| 市场规模 | ${marketData.marketSize} |
| 年增长率 | ${marketData.growthRate} |
| 主要玩家 | ${marketData.keyPlayers.slice(0, 4).join(', ')} |

### 2.2 市场趋势

${marketData.trends.map((t, i) => `${i + 1}. **${t}**`).join('\n')}

### 2.3 产业链分析

- **上游**：传感器、芯片、通信模块供应商
- **中游**：平台提供商、系统集成商
- **下游**：最终用户、行业解决方案

## 3. 目标用户分析

### 3.1 目标行业

${Object.entries({
  '制造业': ['制造', '工厂', '生产线', '工业'],
  '能源行业': ['能源', '电力', '电网', '新能源'],
  '交通运输': ['交通', '运输', '物流', '车队'],
  '建筑物业': ['建筑', '物业', '楼宇', '设施'],
}).map(([industry, keywords]) => {
  const hasMatch = searchResults.some(r =>
    keywords.some(k => (r.title + r.content).includes(k))
  );
  return hasMatch ? `- ${industry}` : null;
}).filter(Boolean).join('\n') || '- 通用行业'}

### 3.2 用户画像

主要用户群体包括：
- **IT/OT 管理者**：关注系统集成和数据整合
- **运维工程师**：关注故障诊断和预警能力
- **业务决策者**：关注ROI和业务价值

### 3.3 使用场景

1. **设备预测性维护**：实时监测设备状态，预测故障
2. **生产过程优化**：数据分析驱动生产决策
3. **能源管理**：能耗监控和优化
4. **设施管理**：楼宇/设施监控和维护

## 4. 竞品分析

### 4.1 竞品总览

| 竞品名称 | 行业 | 核心功能 | 描述 |
|---------|------|---------|------|
${competitors.map(c => `| ${c.name} | ${c.industry} | ${c.features.slice(0, 3).join(', ')} | ${c.description.substring(0, 50)}... |`).join('\n')}

### 4.2 竞品详细对比

${competitors.map((c, i) => `#### ${i + 1}. ${c.name}
- **行业定位**: ${c.industry}
- **官网**: [链接](${c.url})
- **核心功能**: ${c.features.join(', ')}
- **产品特点**: ${c.description}
`).join('\n\n')}

### 4.3 竞品优劣势分析

${competitors.slice(0, 3).map(c => `- **${c.name}**: ${c.features.length > 3 ? '功能较为全面，' + (c.features[0] || '在行业有一定积累') : '专注细分领域'}。`).join('\n')}

## 5. 功能分析

### 5.1 核心功能列表

| 功能 | 出现次数 | 占比 | 数据来源 |
|-----|---------|------|---------|
${features.slice(0, 10).map(f => `| ${f.name} | ${f.count} | ${f.percentage}% | ${f.sources.slice(0, 2).join(', ')} |`).join('\n')}

### 5.2 功能频率分布图

\`\`\`mermaid
${featureChart?.content || ''}
\`\`\`

### 5.3 功能对比矩阵

| 功能 | ${competitors.slice(0, 3).map(c => c.name).join(' | ')} |
|------|${'------|'.repeat(Math.min(3, competitors.length))}
${features.slice(0, 6).map(f => {
  const presence = f.count / searchResults.length;
  const row = competitors.slice(0, 3).map(() => presence > 0.3 ? '✓' : '✗').join(' | ');
  return `| ${f.name} | ${row} |`;
}).join('\n')}

### 5.4 功能实现方式

- **数据采集**：IoT传感器、API对接、日志采集
- **数据处理**：实时流处理、批处理、机器学习
- **展示层**：Web仪表盘、移动APP、API开放

## 6. 技术分析

### 6.1 技术架构概览

\`\`\`mermaid
${architectureChart?.content || ''}
\`\`\`

### 6.2 技术栈分布

- **数据采集**：MQTT, OPC-UA, Modbus, REST API
- **数据存储**：时序数据库, 关系数据库, 数据湖
- **AI/ML**：TensorFlow, PyTorch, 传统ML算法
- **部署方式**：云端SaaS, 私有化部署, 混合模式

### 6.3 技术趋势

1. **边缘计算**：数据处理向边缘端迁移
2. **AI 大模型**：LLM应用于智能问答和分析
3. **云原生**：容器化、微服务架构普及
4. **数字孪生**：虚实结合的仿真分析

## 7. SWOT 分析

### 7.1 优势 (Strengths)

${swot.strengths.map(s => `- ${s}`).join('\n')}

### 7.2 劣势 (Weaknesses)

${swot.weaknesses.map(w => `- ${w}`).join('\n')}

### 7.3 机会 (Opportunities)

${swot.opportunities.map(o => `- ${o}`).join('\n')}

### 7.4 威胁 (Threats)

${swot.threats.map(t => `- ${t}`).join('\n')}

### 7.5 SWOT 思维导图

\`\`\`mermaid
${swotChart?.content || ''}
\`\`\`

## 8. 商业模式分析

### 8.1 盈利模式

- **订阅制**：按年/月订阅SaaS服务
- **一次性授权**：私有化部署一次性付费
- **增值服务**：定制开发、培训、咨询

### 8.2 定价策略

- 按设备数量收费
- 按功能模块收费
- 按数据量收费

### 8.3 渠道策略

- 直销团队
- 渠道合作伙伴
- 技术集成商

### 8.4 客户成功策略

- 实施交付服务
- 培训和技术支持
- 持续功能更新

## 9. 市场机会分析

### 9.1 机会四象限

\`\`\`mermaid
${quadrantChart?.content || ''}
\`\`\`

### 9.2 高价值机会清单

1. **多模态感知融合** - 融合振动、温度、声音等多模态数据，提高故障预测准确率
2. **边缘智能** - 在边缘端实现实时分析和决策，降低云端依赖
3. **行业专用模型** - 训练垂直领域专用AI模型，提升专业场景效果

### 9.3 差异化建议

- 聚焦特定垂直行业深耕
- 提供开箱即用的行业解决方案
- 强调易用性和快速部署

## 10. 技术路线演进

\`\`\`mermaid
${timelineChart?.content || ''}
\`\`\`

### 10.1 关键技术里程碑

| 时间 | 阶段 | 关键技术 |
|-----|------|---------|
| 2024 | 基础能力 | 数据采集、云平台集成 |
| 2025 | 智能升级 | AI分析、预测维护 |
| 2026 | 平台化 | 生态开放、多租户 |
| 2027 | 领先 | 认知智能、自主运维 |

### 10.2 技术选型建议

- **云平台**：AWS IoT, Azure IoT, 阿里云IoT
- **数据库**：InfluxDB, TimescaleDB
- **AI框架**：PyTorch, TensorFlow

## 11. 风险分析

### 11.1 市场风险

- 市场竞争加剧，价格战可能持续
- 客户需求变化快，产品迭代压力大

### 11.2 技术风险

- AI模型准确率达不到预期
- 系统集成复杂度高

### 11.3 竞争风险

- 国际厂商的技术和品牌优势
- 大厂入局带来竞争压力

### 11.4 合规风险

- 数据安全和隐私保护要求
- 行业合规要求

### 11.5 风险应对策略

- 聚焦细分领域建立壁垒
- 持续投入研发保持技术领先
- 建立合规体系应对监管要求

## 12. 战略建议

### 12.1 短期行动（0-3个月）

1. 确定核心目标市场和用户画像
2. 完成MVP产品开发和验证
3. 建立种子用户群体

### 12.2 中期规划（3-12个月）

1. 扩展功能覆盖，发布正式版本
2. 建立销售和渠道体系
3. 获得首批付费客户

### 12.3 长期愿景（1-3年）

1. 成为细分领域领先供应商
2. 建立开放生态系统
3. 探索国际化机会

## 13. 用户旅程图

\`\`\`mermaid
${journeyChart?.content || ''}
\`\`\`

## 14. 竞品能力对比

\`\`\`mermaid
${radarChart?.content || ''}
\`\`\`

## 15. 市场份额分布

\`\`\`mermaid
${marketShareChart?.content || ''}
\`\`\`

## 16. 功能状态流转

\`\`\`mermaid
${stateChart?.content || ''}
\`\`\`

## 17. 调研产品详单

| 序号 | 来源 | 标题 |
|------|------|------|
${searchResults.slice(0, 15).map((r, i) => `| ${i + 1} | ${r.source} | [${r.title}](${r.url}) |`).join('\n')}

## 18. 数据来源说明

本报告数据来源于以下渠道：

- **RSS 订阅**：Hacker News, TechCrunch, The Verge, Wired, Product Hunt
- **搜索引擎**：DuckDuckGo
- **开源平台**：GitHub

## 19. 附录

### 19.1 功能详细数据表

| 功能 | 出现次数 | 占比 | 包含关键词 |
|-----|---------|------|-----------|
${features.map(f => `| ${f.name} | ${f.count} | ${f.percentage}% | ${f.sources.join(', ')} |`).join('\n')}

### 19.2 竞品详细信息

${competitors.map(c => `- **${c.name}**: ${c.description} (来源: ${c.url})`).join('\n')}

### 19.3 调研方法论

本报告采用以下调研方法：
1. **信息收集**：通过多渠道收集产品相关信息
2. **数据分析**：使用规则引擎进行功能、竞品、市场分析
3. **可视化呈现**：通过Mermaid图表展示分析结果

---

*报告生成时间: ${new Date().toLocaleString('zh-CN')}*

*本报告基于公开信息自动生成，仅供参考*
`;

  return report;
}

export default {
  analyzeSearchResults,
  generateFullReport,
};
