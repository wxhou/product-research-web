import { NextRequest, NextResponse } from 'next/server';
import { projectDb, searchResultDb, reportDb, settingsDb } from '@/lib/db';
import { getDataSourceManager, type SearchResult } from '@/lib/datasources';
import { analyzeSearchResults, generateFullReport, type AnalysisResult } from '@/lib/analysis';
import { generateText, getLLMConfig, PRODUCT_ANALYST_PROMPT } from '@/lib/llm';

// 获取当前用户信息
function getCurrentUser(request: NextRequest): { id: string; username: string; role: string } | null {
  const sessionToken = request.cookies.get('auth_token')?.value;
  if (!sessionToken) return null;

  try {
    const result = settingsDb.get.get({ key: `session_${sessionToken}` }) as { value: string } | undefined;
    if (result?.value) {
      return JSON.parse(result.value);
    }
  } catch (e) {
    console.error('Failed to get session:', e);
  }
  return null;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 修复LLM输出的markdown内容中的转义字符
 */
function fixMarkdownEscaping(content: string): string {
  // 还原转义的反引号
  let fixed = content.replace(/\\\`\\\`\\\`/g, '```');
  // 还原转义的强调符
  fixed = fixed.replace(/\\\*/g, '*');
  // 还原转义的下划线
  fixed = fixed.replace(/\\_/g, '_');
  // 还原转义的方括号
  fixed = fixed.replace(/\\\[/g, '[');
  fixed = fixed.replace(/\\\]/g, ']');
  // 还原转义的括号
  fixed = fixed.replace(/\\\(/g, '(');
  fixed = fixed.replace(/\\\)/g, ')');
  return fixed;
}

interface Project {
  id: string;
  title: string;
  description: string;
  keywords: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Report {
  id: string;
  project_id: string;
  title: string;
  content: string;
  mermaid_charts: string;
  version: number;
  created_at: string;
}

/**
 * 使用大模型分析搜索结果
 */
async function analyzeWithLLM(results: SearchResult[], projectTitle: string): Promise<{
  features: string[];
  competitors: CompetitorDetail[];
  swot: Record<string, string[]>;
  opportunities: string[];
  techRoadmap: string[];
  marketData: {
    marketSize: string;
    growthRate: string;
    keyPlayers: string[];
    trends: string[];
  };
}> {
  const config = getLLMConfig();

  // 如果没有配置 API Key，跳过 AI 分析
  if (!config.apiKey) {
    console.log('No LLM API key configured, using rule-based analysis');
    return {
      features: [],
      competitors: [],
      swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      opportunities: [],
      techRoadmap: [],
      marketData: {
        marketSize: '数十亿级',
        growthRate: '15-20%',
        keyPlayers: [],
        trends: [],
      },
    };
  }

  const searchContent = results
    .map((r, i) => `[${i + 1}] ${r.title}\n来源: ${r.source}\n${r.content.substring(0, 800)}`)
    .join('\n\n---\n\n');

  const prompt = `请作为专业的产品调研分析师，分析以下关于"${projectTitle}"的搜索结果。

要求：
1. 提取产品核心功能（按重要性排序，至少10个）
2. 识别主要竞品（如果有的话），并提供：
   - 竞品名称
   - 公司/品牌
   - 核心特点/描述
   - 主要功能列表
3. 分析SWOT
4. 识别市场机会
5. 技术发展路线
6. 市场规模和增长率（如有提及）
7. 市场主要玩家
8. 行业发展趋势

请以 JSON 格式输出（只需输出JSON，不要其他内容）：

{
  "features": ["功能1", "功能2", ...],
  "competitors": [
    {
      "name": "竞品名称",
      "company": "公司/品牌",
      "description": "核心特点描述",
      "features": ["功能1", "功能2", ...]
    }
  ],
  "strengths": ["优势1", "优势2", ...],
  "weaknesses": ["劣势1", "劣势2", ...],
  "opportunities": ["机会1", "机会2", ...],
  "threats": ["威胁1", "威胁2", ...],
  "techRoadmap": ["2024: 技术1", "2026: 技术2", ...],
  "marketSize": "市场规模（如：数十亿级、4.05亿美元）",
  "growthRate": "增长率（如：15-20%、46.41%）",
  "keyPlayers": ["主要玩家1", "主要玩家2", ...],
  "trends": ["趋势1", "趋势2", ...]
}

搜索结果：
${searchContent}`;

  try {
    const response = await generateText(prompt, PRODUCT_ANALYST_PROMPT, {
      temperature: 0.5,
      maxTokens: 4000,
    });

    // 解析 JSON 响应
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return {
        features: analysis.features || [],
        competitors: analysis.competitors || [],
        swot: {
          strengths: analysis.strengths || [],
          weaknesses: analysis.weaknesses || [],
          opportunities: analysis.opportunities || [],
          threats: analysis.threats || [],
        },
        opportunities: analysis.opportunities || [],
        techRoadmap: analysis.techRoadmap || [],
        marketData: {
          marketSize: analysis.marketSize || '数十亿级',
          growthRate: analysis.growthRate || '15-20%',
          keyPlayers: analysis.keyPlayers || [],
          trends: analysis.trends || [],
        },
      };
    }
  } catch (error) {
    console.error('LLM analysis failed:', error);
  }

  return {
    features: [],
    competitors: [],
    swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
    opportunities: [],
    techRoadmap: [],
    marketData: {
      marketSize: '数十亿级',
      growthRate: '15-20%',
      keyPlayers: [],
      trends: [],
    },
  };
}

interface CompetitorDetail {
  name: string;
  company: string;
  description: string;
  features: string[];
}

/**
 * 从搜索结果中识别竞品名称（用于第二轮专项搜索）
 */
async function identifyCompetitorsFromResults(results: SearchResult[], projectTitle: string): Promise<string[]> {
  const config = getLLMConfig();

  if (!config.apiKey) {
    // 使用规则引擎识别潜在竞品名称
    const competitors = new Set<string>();
    const productPatterns = [
      /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s*(?:平台|系统|服务|产品|解决方案)/g,
      /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g,
    ];

    for (const result of results) {
      for (const pattern of productPatterns) {
        const matches = result.content.matchAll(pattern);
        for (const match of matches) {
          const name = match[1]?.trim();
          if (name && name.length > 3 && name.length < 50 && !name.includes('http')) {
            competitors.add(name);
          }
        }
      }
    }

    return Array.from(competitors).slice(0, 5);
  }

  const searchContent = results
    .slice(0, 15)
    .map((r, i) => `[${i + 1}] ${r.title}\n来源: ${r.source}\n${r.content.substring(0, 500)}`)
    .join('\n\n---\n\n');

  const prompt = `请从以下关于"${projectTitle}"的搜索结果中，识别出主要的产品/竞品名称。

要求：
1. 只提取具体的产品名称或品牌名称（如：ThingWorx, MindSphere, Predix, IBM Maximo 等）
2. 不要提取通用的技术术语（如：物联网、AI、工业互联网等）
3. 不要提取公司名称（如：西门子、GE、PTC 等）
4. 优先提取在多个搜索结果中出现的名称
5. 提取 3-5 个最主要的竞品

请以 JSON 格式输出：
{
  "competitors": ["竞品1", "竞品2", "竞品3"]
}

搜索结果：
${searchContent}`;

  try {
    const response = await generateText(prompt, PRODUCT_ANALYST_PROMPT, {
      temperature: 0.3,
      maxTokens: 1000,
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.competitors && Array.isArray(parsed.competitors)) {
        return parsed.competitors.slice(0, 5);
      }
    }
  } catch (error) {
    console.error('Failed to identify competitors:', error);
  }

  return [];
}

/**
 * 使用大模型生成完整报告
 */
async function generateReportWithLLM(
  project: Project,
  results: SearchResult[],
  llmAnalysis: {
    features: string[];
    competitors: CompetitorDetail[];
    swot: Record<string, string[]>;
    opportunities: string[];
    techRoadmap: string[];
    marketData: {
      marketSize: string;
      growthRate: string;
      keyPlayers: string[];
      trends: string[];
    };
  }
): Promise<string> {
  const config = getLLMConfig();

  if (!config.apiKey) {
    // 如果没有配置 API Key，使用规则引擎生成报告
    const analysis = analyzeSearchResults(results, project.title);
    return generateFullReport(project, results, analysis);
  }

  const searchContent = results
    .map((r, i) => `## 搜索结果 ${i + 1}\n标题: ${r.title}\n来源: ${r.source}\n内容: ${r.content.substring(0, 400)}`)
    .join('\n\n');

  const llmData = await llmAnalysis;

  // 构建竞品详情表格
  const competitorTable = llmData.competitors.length > 0 ?
    llmData.competitors.map(c =>
      `| ${c.name} | ${c.company} | ${c.description.substring(0, 50)} | ${c.features.slice(0, 3).join(', ')} |`
    ).join('\n') : '';

  // 构建功能对比矩阵
  const featureComparison = llmData.features.slice(0, 8).map(feature => {
    const rows = llmData.competitors.slice(0, 5).map(c => {
      const hasFeature = c.features.some(f =>
        f.toLowerCase().includes(feature.toLowerCase()) ||
        feature.toLowerCase().includes(f.toLowerCase())
      );
      return hasFeature ? '✓' : '✗';
    }).join(' | ');
    return `| ${feature} | ${rows} |`;
  }).join('\n');

  const prompt = `请根据以下信息生成一份详细的产品调研报告：

## 调研主题
${project.title}

## 项目描述
${project.description || '无'}

## 搜索结果分析（共${results.length}条）
${searchContent}

## AI 分析结果

### 核心功能（按重要性排序）
${llmData.features.slice(0, 15).map((f, i) => `${i + 1}. ${f}`).join('\n')}

### 竞品详情
| 竞品名称 | 公司/品牌 | 核心特点 | 主要功能 |
|---------|----------|---------|---------|
${competitorTable || '| 暂无具体竞品信息 | - | - | - |'}

### 功能对比矩阵
| 功能 | ${llmData.competitors.slice(0, 5).map(c => c.name).join(' | ') || '暂无竞品'} |
|------${'------|'.repeat(Math.min(5, llmData.competitors.length))}
${featureComparison}

### SWOT 分析
- **优势**: ${llmData.swot.strengths.join(', ') || '基于搜索结果分析'}
- **劣势**: ${llmData.swot.weaknesses.join(', ') || '基于搜索结果分析'}
- **机会**: ${llmData.swot.opportunities.join(', ') || '基于搜索结果分析'}
- **威胁**: ${llmData.swot.threats.join(', ') || '基于搜索结果分析'}

### 市场数据
- **市场规模**: ${llmData.marketData.marketSize}
- **增长率**: ${llmData.marketData.growthRate}
- **主要玩家**: ${llmData.marketData.keyPlayers.join(', ') || '暂无数据'}
- **市场趋势**: ${llmData.marketData.trends.join(', ') || '暂无数据'}

### 机会清单
${llmData.opportunities.slice(0, 8).map((o, i) => `${i + 1}. ${o}`).join('\n') || '暂无具体机会'}

### 技术路线
${llmData.techRoadmap.join('\n') || '暂无技术路线'}

请生成一份完整、专业的产品调研报告，包含以下部分：
1. 摘要（2-3段话总结核心发现）
2. 调研概览（数据统计表格）
3. 功能分析（功能频率图表）
4. 竞品详情（每个竞品的详细介绍）
5. 功能对比矩阵
6. SWOT 分析
7. 市场数据分析
8. 机会清单
9. 技术路线建议

请使用 Markdown 格式，包含：
- 至少2个 Mermaid 图表（功能频率图、技术路线图）
- 完整的表格
- 清晰的层级结构

报告内容要详细、专业，字数不少于2000字。`;

  try {
    const report = await generateText(prompt, PRODUCT_ANALYST_PROMPT, {
      temperature: 0.7,
      maxTokens: 8000,
    });
    return report;
  } catch (error) {
    console.error('LLM report generation failed:', error);
    // 回退到规则引擎
    const analysis = analyzeSearchResults(results, project.title);
    return generateFullReport(project, results, analysis);
  }
}

// POST /api/research
export async function POST(request: NextRequest) {
  let projectId: string | undefined;

  try {
    const user = getCurrentUser(request);

    // 未登录用户无法执行调研
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId: pid, keywords } = body;
    projectId = pid;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // 获取项目
    const project = projectDb.getById.get({ id: projectId }) as Project | undefined;
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // 检查权限：普通用户只能操作自己的项目
    if (user.role !== 'admin' && project.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    // 重复提交防护：检查项目状态
    if (project.status === 'processing') {
      return NextResponse.json(
        { success: false, error: 'Research already in progress for this project' },
        { status: 400 }
      );
    }

    if (project.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Research already completed for this project. Please create a new project.' },
        { status: 400 }
      );
    }

    // 更新项目状态为进行中
    projectDb.update.run({
      id: projectId,
      title: project.title,
      description: project.description,
      keywords: project.keywords,
      status: 'processing',
    });

    // 获取数据源管理器
    const sourceManager = getDataSourceManager();
    const enabledSources = sourceManager.getEnabledSources();

    // 收集搜索结果（第一轮：主题搜索）
    const allResults: SearchResult[] = [];

    // 第一轮：使用项目标题进行主题搜索
    for (const source of enabledSources) {
      try {
        const results = await sourceManager.search({
          query: project.title,
          source,
          limit: 10,
        });

        for (const result of results) {
          const searchId = generateId();
          searchResultDb.create.run({
            id: searchId,
            project_id: projectId,
            user_id: user.id,
            source,
            query: project.title,
            url: result.url,
            title: result.title,
            content: result.content,
            raw_data: JSON.stringify(result),
          });
          allResults.push(result);
        }
      } catch (err) {
        console.error(`Error searching with ${source}:`, err);
      }
    }

    // 初步分析识别竞品名称（用于第二轮专项搜索）
    const identifiedCompetitors = await identifyCompetitorsFromResults(allResults, project.title);

    // 第二轮：竞品专项搜索（获取更详细的信息）
    const competitorSearchPromises: Promise<void>[] = [];
    for (const competitor of identifiedCompetitors.slice(0, 5)) { // 最多搜索5个竞品
      for (const source of enabledSources) {
        competitorSearchPromises.push(
          (async () => {
            try {
              const results = await sourceManager.search({
                query: competitor,
                source,
                limit: 5,
              });

              for (const result of results) {
                const searchId = generateId();
                searchResultDb.create.run({
                  id: searchId,
                  project_id: projectId,
                  user_id: user.id,
                  source,
                  query: competitor,
                  url: result.url,
                  title: result.title,
                  content: result.content,
                  raw_data: JSON.stringify(result),
                });
                allResults.push(result);
              }
            } catch (err) {
              console.error(`Error searching competitor ${competitor} with ${source}:`, err);
            }
          })()
        );
      }
    }
    await Promise.all(competitorSearchPromises);

    console.log(`Total search results collected: ${allResults.length}`);

    // 使用大模型进行分析
    const llmAnalysis = await analyzeWithLLM(allResults, project.title);

    // 使用大模型生成完整报告
    const reportContentRaw = await generateReportWithLLM(project, allResults, llmAnalysis);
    // 修复markdown转义
    const reportContent = fixMarkdownEscaping(reportContentRaw);
    const reportId = generateId();

    // 生成 Mermaid 图表（基于规则引擎）
    const ruleAnalysis = analyzeSearchResults(allResults, project.title);
    const mermaidCharts = JSON.stringify(ruleAnalysis.mermaidCharts);

    reportDb.create.run({
      id: reportId,
      project_id: projectId,
      user_id: user.id,
      title: `${project.title} - 调研报告`,
      content: reportContent,
      mermaid_charts: mermaidCharts,
    });

    // 更新项目状态为已完成
    projectDb.update.run({
      id: projectId,
      title: project.title,
      description: project.description,
      keywords: project.keywords,
      status: 'completed',
    });

    const finalProject = projectDb.getById.get({ id: projectId }) as Project | undefined;
    const finalReport = reportDb.getByProject.get({ project_id: projectId }) as Report | undefined;

    return NextResponse.json({
      success: true,
      data: {
        project: finalProject,
        report: finalReport,
        searchResults: allResults,
        analysis: {
          features: ruleAnalysis.features,
          competitors: ruleAnalysis.competitors,
          swot: ruleAnalysis.swot,
          marketData: ruleAnalysis.marketData,
        },
      },
    });
  } catch (error) {
    console.error('Error during research:', error);

    // 回滚项目状态为 draft
    if (projectId) {
      try {
        const project = projectDb.getById.get({ id: projectId }) as Project | undefined;
        if (project) {
          projectDb.update.run({
            id: projectId,
            title: project.title,
            description: project.description || '',
            keywords: project.keywords,
            status: 'draft',
          });
        }
      } catch (rollbackError) {
        console.error('Failed to rollback project status:', rollbackError);
      }
    }

    return NextResponse.json(
      { success: false, error: 'Research failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
