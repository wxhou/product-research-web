/**
 * Reporter Agent 报告模板
 *
 * 定义报告生成的模板和格式
 */

/** 报告模板配置 */
export interface ReportTemplate {
  sections: ReportSectionConfig[];
  mermaidCharts: MermaidChartConfig[];
  metadata: ReportMetadataConfig;
}

/** 报告章节配置 */
export interface ReportSectionConfig {
  id: string;
  title: string;
  required: boolean;
  order: number;
  template: string;
}

/** Mermaid 图表配置 */
export interface MermaidChartConfig {
  id: string;
  type: 'pie' | 'mindmap' | 'timeline' | 'radar' | 'graph' | 'quadrant' | 'journey' | 'stateDiagram';
  title: string;
  required: boolean;
}

/** 报告元数据配置 */
export interface ReportMetadataConfig {
  templateVersion: string;
  generatedAt: string;
}

/** 默认报告模板 */
export const REPORT_TEMPLATE: ReportTemplate = {
  sections: [
    {
      id: 'abstract',
      title: '摘要',
      required: true,
      order: 1,
      template: `## 摘要

本报告通过调研全网产品信息，为您提供关于【{title}】的深度分析报告。基于对{searchResultCount}条搜索结果和{extractionCount}个页面内容的深度分析，我们识别出{featureCount}个核心功能类别、{competitorCount}个主要竞品，并深入分析了市场机会、技术栈、使用场景和战略建议。

**核心发现：**
- 产品定位：{productPositioning}
- 主要竞争优势：{keyStrengths}
- 市场机会：{marketOpportunity}
- 建议关注领域：{recommendationFocus}`,
    },
    {
      id: 'overview',
      title: '调研概览',
      required: true,
      order: 2,
      template: `## 1. 调研概览

| 项目 | 数据 |
|-----|------|
| 调研产品数 | {productCount} |
| 数据来源 | {dataSources} |
| 关键词 | {keywords} |
| 识别功能数 | {featureCount} |
| 识别竞品数 | {competitorCount} |
| 分析置信度 | {confidenceScore}% |
| 数据缺口 | {dataGaps} |`,
    },
    {
      id: 'features',
      title: '功能分析',
      required: true,
      order: 3,
      template: `## 2. 功能分析

### 2.1 核心功能列表

以下是我们识别出的产品核心功能，按出现频率排序：

| 功能 | 出现次数 | 占比 | 详细描述 |
|-----|---------|------|---------|
{featureTableRows}

### 2.2 功能频率分布

功能出现频率反映了产品在各功能上的投入程度和用户关注度。

[PIE_CHART]
{featurePieChart}
[/PIE_CHART]

### 2.3 功能价值分析

基于深度分析，我们识别出以下核心功能及其用户价值：

{featureValueAnalysis}`,
    },
    {
      id: 'competitors',
      title: '竞品分析',
      required: true,
      order: 4,
      template: `## 3. 竞品分析

### 3.1 竞品总览

我们识别出以下主要竞争对手，并对其进行了深度分析：

| 竞品名称 | 行业 | 核心功能 | 市场定位 |
|---------|------|---------|---------|
{competitorTableRows}

### 3.2 竞品深度对比

{competitorAnalysis}

### 3.3 竞品差异化分析

通过对比分析，我们发现各竞品之间的差异化特征：

{competitorDifferentiation}

### 3.4 市场空白点

{marketGaps}

[MINDMAP_CHART]
{competitorMindmap}
[/MINDMAP_CHART]`,
    },
    {
      id: 'swot',
      title: 'SWOT 分析',
      required: true,
      order: 5,
      template: `## 4. SWOT 分析

### 4.1 优势 (Strengths)

{strengths}

### 4.2 劣势 (Weaknesses)

{weaknesses}

### 4.3 机会 (Opportunities)

{opportunities}

### 4.4 威胁 (Threats)

{threats}

### 4.5 SWOT 战略矩阵

基于以上分析，我们提出以下战略建议：

- **SO 策略（优势+机会）**：利用技术优势和品牌影响力，快速占领新兴市场
- **WO 策略（劣势+机会）**：通过合作或并购弥补能力短板，把握市场机遇
- **ST 策略（优势+威胁）**：强化核心竞争壁垒，应对竞争压力
- **WT 策略（劣势+威胁）**：聚焦核心业务，避免多线作战

### 4.6 SWOT 思维导图

[MINDMAP_CHART]
  root((SWOT 分析))
    优势(S)
{strengthsMindmap}
    劣势(W)
{weaknessesMindmap}
    机会(O)
{opportunitiesMindmap}
    威胁(T)
{threatsMindmap}
[/MINDMAP_CHART]`,
    },
    {
      id: 'market',
      title: '市场分析',
      required: false,
      order: 6,
      template: `## 5. 市场分析

### 5.1 市场规模与趋势

| 指标 | 数据 |
|-----|------|
| 市场规模 | {marketSize} |
| 增长率 | {growthRate} |
| 主要玩家 | {keyPlayers} |

### 5.2 市场发展趋势

{marketTrends}

### 5.3 市场机会分析

{marketOpportunities}

### 5.4 市场挑战与风险

{marketChallenges}`,
    },
    {
      id: 'technology',
      title: '技术分析',
      required: false,
      order: 7,
      template: `## 6. 技术分析

### 6.1 技术架构

{architecture}

### 6.2 技术栈

{techStack}

### 6.3 新兴技术应用

{emergingTech}

### 6.4 技术创新点

{innovationPoints}`,
    },
    {
      id: 'usecases',
      title: '使用场景分析',
      required: false,
      order: 8,
      template: `## 7. 使用场景分析

### 7.1 主要使用场景

{useCaseScenarios}

### 7.2 目标用户类型

{userTypes}

### 7.3 用户痛点分析

{painPoints}

### 7.4 产品价值主张

{valuePropositions}`,
    },
    {
      id: 'recommendations',
      title: '战略建议',
      required: true,
      order: 9,
      template: `## 8. 战略建议

基于以上深度分析，我们提出以下战略建议：

### 8.1 短期行动（0-3个月）

{shortTermRecommendations}

**具体行动计划：**
1. 优先聚焦核心场景，打磨产品体验
2. 建立标杆客户案例，验证产品价值
3. 优化定价策略，降低客户尝试门槛

### 8.2 中期规划（3-12个月）

{mediumTermRecommendations}

**关键里程碑：**
1. 扩展功能覆盖，发布正式版本
2. 建立销售渠道和合作伙伴体系
3. 获得首批付费客户，实现商业化

### 8.3 长期愿景（1-3年）

{longTermRecommendations}

**愿景目标：**
1. 成为细分领域领先供应商
2. 建立开放生态系统，吸引第三方开发者
3. 探索国际化机会，拓展海外市场`,
    },
    {
      id: 'sources',
      title: '数据来源说明',
      required: true,
      order: 10,
      template: `## 9. 数据来源说明

本报告数据来源于以下渠道：

{sourceList}

### 数据收集时间
- 调研时间: {generatedAt}

### 方法论
本报告采用以下调研方法：
1. **信息收集**：通过多渠道收集产品相关信息
2. **数据分析**：使用 AI 进行功能、竞品、市场深度分析
3. **洞察生成**：基于数据分析生成战略洞察和建议
4. **可视化呈现**：通过 Mermaid 图表展示分析结果

### 分析置信度说明
- 置信度 {confidenceScore}%：基于数据完整性和来源可靠性计算
- 数据缺口：{dataGaps}`,
    },
  ],
  mermaidCharts: [
    { id: 'feature-frequency', type: 'pie', title: '功能频率分布', required: true },
    { id: 'competitor-mindmap', type: 'mindmap', title: '竞品思维导图', required: false },
    { id: 'swot-mindmap', type: 'mindmap', title: 'SWOT思维导图', required: true },
  ],
  metadata: {
    templateVersion: '2.0.0',
    generatedAt: new Date().toISOString(),
  },
};

/**
 * 从分析结果生成报告内容
 */
export function generateReportContent(
  title: string,
  keywords: string[],
  searchResultCount: number,
  extractionCount: number,
  analysis: {
    features: Array<{ name: string; count: number; description: string }>;
    competitors: Array<{ name: string; industry: string; features: string[]; description: string; marketPosition: string }>;
    swot: {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    };
    marketData: {
      marketSize: string;
      growthRate: string;
      keyPlayers: string[];
      trends: string[];
      opportunities: string[];
      challenges: string[];
    };
    techAnalysis?: {
      architecture: string[];
      techStack: string[];
      emergingTech: string[];
      innovationPoints: string[];
    };
    confidenceScore: number;
    dataGaps: string[];
  },
  dataSources: string[]
): string {
  const template = REPORT_TEMPLATE.sections;

  // 生成各章节内容
  let report = '';

  for (const section of template.sort((a, b) => a.order - b.order)) {
    report += renderSection(section, {
      title,
      keywords: keywords.join(', '),
      searchResultCount,
      extractionCount,
      analysis,
      dataSources: dataSources.join(', '),
    });
    report += '\n\n';
  }

  return report.trim();
}

/**
 * 报告渲染数据接口
 */
interface ReportRenderData {
  title: string;
  keywords: string;
  searchResultCount: number;
  extractionCount: number;
  analysis: {
    features: Array<{ name: string; count: number; description: string }>;
    competitors: Array<{ name: string; industry: string; features: string[]; description: string; marketPosition: string }>;
    swot: {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    };
    marketData: {
      marketSize: string;
      growthRate: string;
      keyPlayers: string[];
      trends: string[];
      opportunities: string[];
      challenges: string[];
    };
    techAnalysis?: {
      architecture: string[];
      techStack: string[];
      emergingTech: string[];
      innovationPoints: string[];
    };
    confidenceScore: number;
    dataGaps: string[];
  };
  dataSources: string;
}

/**
 * 渲染单个章节
 */
function renderSection(
  section: ReportSectionConfig,
  data: ReportRenderData
): string {
  let content = section.template;
  const analysis = data.analysis;

  // 计算统计数据
  const featureCount = analysis.features.length;
  const competitorCount = analysis.competitors.length;
  const productCount = competitorCount + 1; // 包括目标产品本身

  // 替换简单占位符
  content = content.replace(/{title}/g, data.title);
  content = content.replace(/{keywords}/g, data.keywords || '无关键词');
  content = content.replace(/{searchResultCount}/g, String(data.searchResultCount));
  content = content.replace(/{extractionCount}/g, String(data.extractionCount));
  content = content.replace(/{dataSources}/g, data.dataSources);
  content = content.replace(/{featureCount}/g, String(featureCount));
  content = content.replace(/{competitorCount}/g, String(competitorCount));
  content = content.replace(/{productCount}/g, String(productCount));
  content = content.replace(/{dataGaps}/g, analysis.dataGaps.length > 0 ? analysis.dataGaps.join('、') : '无');
  // 注意：模板中已有 % 后缀，这里不再添加
  content = content.replace(/{confidenceScore}/g, String((data.analysis.confidenceScore * 100).toFixed(0)));

  // 特殊处理摘要章节
  if (section.id === 'abstract') {
    content = content.replace(/{productPositioning}/g, analysis.competitors.length > 0 ?
      `聚焦${analysis.competitors[0].industry || '目标'}市场，提供${analysis.features.slice(0, 3).map(f => f.name).join('、')}等核心功能` : '待分析');
    content = content.replace(/{keyStrengths}/g, analysis.swot.strengths.slice(0, 2).join('，') || '待分析');
    content = content.replace(/{marketOpportunity}/g, analysis.marketData.opportunities[0] || analysis.marketData.trends[0] || '待分析');
    content = content.replace(/{recommendationFocus}/g, analysis.swot.opportunities.slice(0, 2).join('，') || '待分析');
  }

  // 特殊处理功能章节
  if (section.id === 'features') {
    content = content.replace('{featureTableRows}', renderFeatureTable(analysis.features));
    content = content.replace('{featureValueAnalysis}', renderFeatureValueAnalysis(analysis.features));
    content = replaceMermaidChart(content, 'PIE_CHART', 'pie title 功能出现频率统计', renderFeaturePieChart(analysis.features));
  }

  // 特殊处理竞品章节
  if (section.id === 'competitors') {
    content = content.replace('{competitorTableRows}', renderCompetitorTable(analysis.competitors));
    content = content.replace('{competitorAnalysis}', renderCompetitorAnalysis(analysis.competitors));
    content = content.replace('{competitorDifferentiation}', renderCompetitorDifferentiation(analysis.competitors));
    content = content.replace('{marketGaps}', renderMarketGaps(analysis.competitors, analysis.features));
    content = replaceMermaidChart(content, 'MINDMAP_CHART', 'mindmap\n  root((竞品分析))', renderCompetitorMindmap(analysis.competitors));
  }

  // 特殊处理 SWOT 章节
  if (section.id === 'swot') {
    content = content.replace('{strengths}', renderList(analysis.swot.strengths));
    content = content.replace('{weaknesses}', renderList(analysis.swot.weaknesses));
    content = content.replace('{opportunities}', renderList(analysis.swot.opportunities));
    content = content.replace('{threats}', renderList(analysis.swot.threats));

    const mindmapContent = `  root((SWOT 分析))\n    优势(S)\n${renderMindmapItems(analysis.swot.strengths)}\n    劣势(W)\n${renderMindmapItems(analysis.swot.weaknesses)}\n    机会(O)\n${renderMindmapItems(analysis.swot.opportunities)}\n    威胁(T)\n${renderMindmapItems(analysis.swot.threats)}`;
    content = replaceMermaidChart(content, 'MINDMAP_CHART', 'mindmap', mindmapContent);
  }

  // 特殊处理市场章节
  if (section.id === 'market') {
    content = content.replace('{marketSize}', analysis.marketData.marketSize || '待分析');
    content = content.replace('{growthRate}', analysis.marketData.growthRate || '待分析');
    content = content.replace('{keyPlayers}', analysis.marketData.keyPlayers.join(', ') || '待分析');
    content = content.replace('{marketTrends}', renderList(analysis.marketData.trends));
    content = content.replace('{marketOpportunities}', renderList(analysis.marketData.opportunities));
    content = content.replace('{marketChallenges}', renderList(analysis.marketData.challenges));
  }

  // 特殊处理技术章节
  if (section.id === 'technology') {
    const tech = analysis.techAnalysis || { architecture: [], techStack: [], emergingTech: [], innovationPoints: [] };
    content = content.replace('{architecture}', renderList(tech.architecture) || '暂无技术架构信息');
    content = content.replace('{techStack}', renderList(tech.techStack) || '暂无技术栈信息');
    content = content.replace('{emergingTech}', renderList(tech.emergingTech) || '暂无新兴技术信息');
    content = content.replace('{innovationPoints}', renderList(tech.innovationPoints) || '暂无技术创新点信息');
  }

  // 特殊处理使用场景章节
  if (section.id === 'usecases') {
    content = content.replace('{useCaseScenarios}', renderUseCaseScenarios(analysis.features));
    content = content.replace('{userTypes}', renderUserTypes(analysis.competitors));
    content = content.replace('{painPoints}', renderPainPoints(analysis.swot.weaknesses));
    content = content.replace('{valuePropositions}', renderValuePropositions(analysis.swot.strengths, analysis.features));
  }

  // 特殊处理建议章节
  if (section.id === 'recommendations') {
    content = content.replace('{shortTermRecommendations}', renderShortTermRecommendations(analysis));
    content = content.replace('{mediumTermRecommendations}', renderMediumTermRecommendations(analysis));
    content = content.replace('{longTermRecommendations}', renderLongTermRecommendations(analysis));
  }

  // 特殊处理来源章节
  if (section.id === 'sources') {
    content = content.replace('{sourceList}', renderSourceList(data.dataSources));
    content = content.replace('{generatedAt}', new Date().toLocaleString('zh-CN'));
  }

  return content;
}

/**
 * 替换 Mermaid 图表占位符
 */
function replaceMermaidChart(
  content: string,
  placeholder: string,
  header: string,
  body: string
): string {
  const pattern = new RegExp(`\\[${placeholder}\\]([\\s\\S]*?)\\[\\/${placeholder}\\]`, 'g');
  return content.replace(pattern, `\`\`\`mermaid\n${header}\n${body}\n\`\`\``);
}

/**
 * 渲染功能表格
 */
function renderFeatureTable(features: Array<{ name: string; count: number; description: string }>): string {
  if (features.length === 0) {
    return '| 暂无功能数据 | - | - | - |';
  }

  const total = features.reduce((sum, f) => sum + f.count, 0);

  return features
    .slice(0, 15)
    .map((f) => `| ${f.name} | ${f.count} | ${((f.count / total) * 100).toFixed(0)}% | ${f.description || '-'} |`)
    .join('\n');
}

/**
 * 渲染竞品表格
 */
function renderCompetitorTable(competitors: Array<{ name: string; industry: string; features: string[]; description: string; marketPosition: string }>): string {
  return competitors
    .slice(0, 10)
    .map((c) => `| ${c.name} | ${c.industry || '-'} | ${c.features.slice(0, 3).join(', ')} | ${c.marketPosition || '-'} |`)
    .join('\n');
}

/**
 * 渲染列表
 */
function renderList(items: string[]): string {
  if (items.length === 0) return '暂无数据';
  return items.map((i) => `- ${i}`).join('\n');
}

/**
 * 渲染思维导图项
 */
function renderMindmapItems(items: string[]): string {
  return items.slice(0, 5).map((i) => `      - ${i}`).join('\n');
}

/**
 * 渲染功能饼图
 */
function renderFeaturePieChart(features: Array<{ name: string; count: number }>): string {
  if (features.length === 0) {
    return '    "暂无数据" : 1';
  }

  return features.slice(0, 8).map((f) => {
    // 清理名称中可能导致 mermaid 语法错误的字符
    const safeName = f.name.replace(/"/g, "'").replace(/[\n\r]/g, ' ');
    return `    "${safeName}" : ${f.count}`;
  }).join('\n');
}

/**
 * 渲染竞品思维导图
 */
function renderCompetitorMindmap(competitors: Array<{ name: string; industry: string; features: string[]; description: string; marketPosition: string }>): string {
  // 注意：root 节点由 replaceMermaidChart 的 header 参数提供，这里只返回子节点
  if (competitors.length === 0) {
    return '    暂无竞品数据';
  }
  let result = '';
  for (const c of competitors.slice(0, 5)) {
    // 清理竞品名称，移除可能导致 mermaid 语法错误的字符
    const safeName = c.name.replace(/[()[\]{}]/g, '').trim();
    if (!safeName) continue;
    result += `    ${safeName}\n`;
    if (c.industry) {
      result += `      行业: ${c.industry}\n`;
    }
    if (c.marketPosition) {
      result += `      定位: ${c.marketPosition}\n`;
    }
    if (c.features && c.features.length > 0) {
      result += `      特点: ${c.features.slice(0, 2).join(', ')}\n`;
    }
  }
  return result || '    暂无竞品数据';
}

/**
 * 渲染来源列表
 */
function renderSourceList(sources: string): string {
  const sourceList = sources.split(',').map((s) => s.trim()).filter(Boolean);
  return sourceList.map((s) => `- ${s}`).join('\n');
}

/**
 * 渲染功能价值分析
 */
function renderFeatureValueAnalysis(features: Array<{ name: string; count: number; description: string }>): string {
  if (features.length === 0) return '暂无功能价值分析数据';

  // 取前5个功能进行价值分析
  const topFeatures = features.slice(0, 5);
  return topFeatures.map((f) => {
    const valueLevel = f.count >= 5 ? '核心功能' : f.count >= 3 ? '重要功能' : '辅助功能';
    return `- **${f.name}**（${valueLevel}）：${f.description || '功能价值待分析'}`;
  }).join('\n');
}

/**
 * 渲染竞品深度分析
 */
function renderCompetitorAnalysis(competitors: Array<{ name: string; industry: string; features: string[]; description: string; marketPosition: string }>): string {
  if (competitors.length === 0) return '暂无竞品深度分析数据';

  return competitors.map((c) => {
    return `### ${c.name}

**行业定位**：${c.industry || '待分析'}

**市场定位**：${c.marketPosition || '待分析'}

**核心功能**：${c.features.length > 0 ? c.features.join('、') : '待分析'}

**产品描述**：${c.description || '暂无详细描述'}`;
  }).join('\n\n');
}

/**
 * 渲染竞品差异化分析
 */
function renderCompetitorDifferentiation(competitors: Array<{ name: string; industry: string; features: string[]; description: string; marketPosition: string }>): string {
  if (competitors.length < 2) return '竞品数量不足，无法进行差异化对比分析';

  const differentiations: string[] = [];

  for (const c of competitors) {
    const otherFeatures = new Set<string>();
    competitors.forEach(other => {
      if (other.name !== c.name) {
        other.features.forEach(f => otherFeatures.add(f));
      }
    });

    const uniqueFeatures = c.features.filter(f => !otherFeatures.has(f));
    if (uniqueFeatures.length > 0) {
      differentiations.push(`- **${c.name}** 的独特优势：${uniqueFeatures.join('、')}`);
    } else {
      differentiations.push(`- **${c.name}**：功能覆盖与竞品相似，需要寻找差异化突破口`);
    }
  }

  return differentiations.join('\n');
}

/**
 * 渲染市场空白点
 */
function renderMarketGaps(
  competitors: Array<{ name: string; industry: string; features: string[] }>,
  features: Array<{ name: string; count: number }>
): string {
  // 收集所有竞品的功能
  const allCompetitorFeatures = new Set<string>();
  competitors.forEach(c => c.features.forEach(f => allCompetitorFeatures.add(f)));

  // 找出产品有但竞品可能没有的功能
  const productFeatures = new Set(features.map(f => f.name));
  const gaps: string[] = [];

  // 常见市场空白点
  if (competitors.length > 0) {
    gaps.push('1. **垂直行业深耕**：针对特定行业的定制化解决方案');
    gaps.push('2. **中小企业市场**：性价比更高的入门级产品');
    gaps.push('3. **私有化部署**：满足数据安全要求的企业级方案');
  }

  // 基于功能分析的市场空白
  if (features.length > 0) {
    gaps.push(`4. **功能扩展方向**：${features.slice(0, 3).map(f => f.name).join('、')}的深度应用场景`);
  }

  return gaps.join('\n');
}

/**
 * 渲染使用场景
 */
function renderUseCaseScenarios(features: Array<{ name: string; count: number; description: string }>): string {
  if (features.length === 0) return '暂无使用场景数据';

  const scenarios: string[] = [];

  // 基于功能自动生成使用场景
  for (const f of features.slice(0, 5)) {
    const scenarioName = f.name;
    const scenarioDesc = f.description || `${f.name}相关应用场景`;
    scenarios.push(`### ${scenarioName}

${scenarioDesc}`);
  }

  return scenarios.join('\n\n');
}

/**
 * 渲染目标用户类型
 */
function renderUserTypes(competitors: Array<{ name: string; industry: string }>): string {
  const userTypes = new Set<string>();

  // 从竞品行业推断目标用户
  competitors.forEach(c => {
    if (c.industry) {
      userTypes.add(`从事${c.industry}相关工作的专业人员`);
    }
  });

  // 添加常见用户类型
  userTypes.add('产品经理');
  userTypes.add('技术负责人');
  userTypes.add('企业决策者');

  if (userTypes.size === 0) return '暂无目标用户类型数据';

  return Array.from(userTypes).slice(0, 5).map(u => `- ${u}`).join('\n');
}

/**
 * 渲染用户痛点
 */
function renderPainPoints(weaknesses: string[]): string {
  if (weaknesses.length === 0) return '暂无用户痛点数据';

  // 将 SWOT 的劣势转化为用户痛点
  const painPoints = weaknesses.map((w, i) => {
    const painPointDescriptions: Record<number, string> = {
      0: '现有解决方案无法满足需求',
      1: '使用成本过高',
      2: '操作复杂，学习成本高',
      3: '性能和稳定性不足',
      4: '缺乏定制化能力',
    };
    return `- ${painPointDescriptions[i] || w}：${w}`;
  });

  return painPoints.join('\n');
}

/**
 * 渲染产品价值主张
 */
function renderValuePropositions(
  strengths: string[],
  features: Array<{ name: string; description: string }>
): string {
  const propositions: string[] = [];

  // 基于优势生成价值主张
  strengths.forEach((s, i) => {
    propositions.push(`- **价值${i + 1}**：${s}`);
  });

  // 基于功能生成价值主张
  features.slice(0, 3).forEach((f, i) => {
    propositions.push(`- **功能价值${i + 1}**：${f.name} - ${f.description || '提升用户效率'}`);
  });

  return propositions.length > 0 ? propositions.join('\n') : '暂无价值主张数据';
}

/**
 * 渲染短期建议
 */
function renderShortTermRecommendations(analysis: ReportRenderData['analysis']): string {
  const recommendations: string[] = [];

  // 基于竞品分析
  if (analysis.competitors.length > 0) {
    recommendations.push(`1. **差异化定位**：与${analysis.competitors[0].name}相比，突出自身在${analysis.features[0]?.name || '核心功能'}方面的优势`);
  }

  // 基于功能分析
  if (analysis.features.length > 0) {
    recommendations.push(`2. **功能优化**：优先完善${analysis.features[0].name}等高频功能`);
  }

  // 基于 SWOT
  if (analysis.swot.strengths.length > 0) {
    recommendations.push(`3. **优势强化**：充分利用${analysis.swot.strengths[0]}等优势`);
  }

  return recommendations.length > 0 ? recommendations.join('\n') : '暂无短期建议';
}

/**
 * 渲染中期建议
 */
function renderMediumTermRecommendations(analysis: ReportRenderData['analysis']): string {
  const recommendations: string[] = [];

  // 基于市场数据
  if (analysis.marketData.trends.length > 0) {
    recommendations.push(`1. **趋势把握**：关注${analysis.marketData.trends[0]}等市场趋势`);
  }

  // 基于机会
  if (analysis.marketData.opportunities.length > 0) {
    recommendations.push(`2. **机会把握**：重点布局${analysis.marketData.opportunities[0]}`);
  }

  // 基于技术分析
  if (analysis.techAnalysis?.techStack) {
    recommendations.push(`3. **技术升级**：引入${analysis.techAnalysis.emergingTech[0] || '新技术'}提升竞争力`);
  }

  return recommendations.length > 0 ? recommendations.join('\n') : '暂无中期建议';
}

/**
 * 渲染长期建议
 */
function renderLongTermRecommendations(analysis: ReportRenderData['analysis']): string {
  const recommendations: string[] = [];

  // 基于威胁
  if (analysis.swot.threats.length > 0) {
    recommendations.push(`1. **风险应对**：制定应对${analysis.swot.threats[0]}的长期策略`);
  }

  // 基于挑战
  if (analysis.marketData.challenges.length > 0) {
    recommendations.push(`2. **挑战突破**：持续投入解决${analysis.marketData.challenges[0]}`);
  }

  // 基于技术创新点
  if (analysis.techAnalysis?.innovationPoints) {
    recommendations.push(`3. **创新驱动**：围绕${analysis.techAnalysis.innovationPoints[0] || '核心技术创新'}建立壁垒`);
  }

  // 愿景性建议
  recommendations.push('4. **生态建设**：构建开放平台，吸引第三方开发者');
  recommendations.push('5. **国际化**：探索海外市场机会');

  return recommendations.length > 0 ? recommendations.join('\n') : '暂无长期建议';
}

/**
 * 生成报告标题块
 */
export function generateTitleBlock(
  title: string,
  keywords: string[]
): string {
  return `# ${title}

> 调研时间: ${new Date().toLocaleString('zh-CN')}
> 调研主题: ${title}
> 关键词: ${keywords.join(', ')}`;
}
