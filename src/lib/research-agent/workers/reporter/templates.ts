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

本报告通过调研全网产品信息，为您提供关于【{title}】的详细分析和机会洞察。基于对{searchResultCount}条搜索结果和{extractionCount}个页面内容的深度分析，我们识别出{featureCount}个核心功能类别、{competitorCount}个主要竞品，并给出了SWOT分析、市场机会和技术路线建议。`,
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
| 分析置信度 | {confidenceScore}% |`,
    },
    {
      id: 'features',
      title: '功能分析',
      required: true,
      order: 3,
      template: `## 2. 功能分析

### 2.1 核心功能列表

| 功能 | 出现次数 | 占比 | 描述 |
|-----|---------|------|------|
{featureTableRows}

### 2.2 功能频率分布

[PIE_CHART]
{featurePieChart}
[/PIE_CHART]`,
    },
    {
      id: 'competitors',
      title: '竞品分析',
      required: true,
      order: 4,
      template: `## 3. 竞品分析

### 3.1 竞品总览

| 竞品名称 | 行业 | 核心功能 | 市场定位 |
|---------|------|---------|---------|
{competitorTableRows}

### 3.2 竞品对比

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

### 4.5 SWOT 思维导图

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

### 5.2 市场趋势

{marketTrends}`,
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

### 6.3 新兴技术

{emergingTech}`,
    },
    {
      id: 'recommendations',
      title: '战略建议',
      required: true,
      order: 8,
      template: `## 7. 战略建议

### 7.1 短期行动（0-3个月）

1. 确定核心目标市场和用户画像
2. 完成MVP产品开发和验证
3. 建立种子用户群体

### 7.2 中期规划（3-12个月）

1. 扩展功能覆盖，发布正式版本
2. 建立销售和渠道体系
3. 获得首批付费客户

### 7.3 长期愿景（1-3年）

1. 成为细分领域领先供应商
2. 建立开放生态系统
3. 探索国际化机会`,
    },
    {
      id: 'sources',
      title: '数据来源说明',
      required: true,
      order: 9,
      template: `## 8. 数据来源说明

本报告数据来源于以下渠道：

{sourceList}

### 数据收集时间
- 调研时间: {generatedAt}

### 方法论
本报告采用以下调研方法：
1. **信息收集**：通过多渠道收集产品相关信息
2. **数据分析**：使用规则引擎和AI进行功能、竞品、市场分析
3. **可视化呈现**：通过Mermaid图表展示分析结果`,
    },
  ],
  mermaidCharts: [
    { id: 'feature-frequency', type: 'pie', title: '功能频率分布', required: true },
    { id: 'competitor-mindmap', type: 'mindmap', title: '竞品思维导图', required: false },
    { id: 'swot-mindmap', type: 'mindmap', title: 'SWOT思维导图', required: true },
  ],
  metadata: {
    templateVersion: '1.0.0',
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
    };
    techAnalysis?: {
      architecture: string[];
      techStack: string[];
      emergingTech: string[];
    };
    confidenceScore: number;
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
    };
    techAnalysis?: {
      architecture: string[];
      techStack: string[];
      emergingTech: string[];
    };
    confidenceScore: number;
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
  // 注意：模板中已有 % 后缀，这里不再添加
  content = content.replace(/{confidenceScore}/g, String((data.analysis.confidenceScore * 100).toFixed(0)));

  // 特殊处理表格和图表
  if (section.id === 'features') {
    content = content.replace('{featureTableRows}', renderFeatureTable(analysis.features));
    content = replaceMermaidChart(content, 'PIE_CHART', 'pie title 功能出现频率统计', renderFeaturePieChart(analysis.features));
  }

  if (section.id === 'competitors') {
    content = content.replace('{competitorTableRows}', renderCompetitorTable(analysis.competitors));
    content = replaceMermaidChart(content, 'MINDMAP_CHART', 'mindmap\n  root((竞品分析))', renderCompetitorMindmap(analysis.competitors));
  }

  if (section.id === 'swot') {
    content = content.replace('{strengths}', renderList(analysis.swot.strengths));
    content = content.replace('{weaknesses}', renderList(analysis.swot.weaknesses));
    content = content.replace('{opportunities}', renderList(analysis.swot.opportunities));
    content = content.replace('{threats}', renderList(analysis.swot.threats));

    const mindmapContent = `  root((SWOT 分析))\n    优势(S)\n${renderMindmapItems(analysis.swot.strengths)}\n    劣势(W)\n${renderMindmapItems(analysis.swot.weaknesses)}\n    机会(O)\n${renderMindmapItems(analysis.swot.opportunities)}\n    威胁(T)\n${renderMindmapItems(analysis.swot.threats)}`;
    content = replaceMermaidChart(content, 'MINDMAP_CHART', 'mindmap', mindmapContent);
  }

  if (section.id === 'market') {
    content = content.replace('{marketSize}', analysis.marketData.marketSize);
    content = content.replace('{growthRate}', analysis.marketData.growthRate);
    content = content.replace('{keyPlayers}', analysis.marketData.keyPlayers.join(', '));
    content = content.replace('{marketTrends}', renderList(analysis.marketData.trends));
  }

  if (section.id === 'technology') {
    const tech = analysis.techAnalysis || { architecture: [], techStack: [], emergingTech: [] };
    content = content.replace('{architecture}', renderList(tech.architecture));
    content = content.replace('{techStack}', renderList(tech.techStack));
    content = content.replace('{emergingTech}', renderList(tech.emergingTech));
  }

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
