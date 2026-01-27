import { NextRequest, NextResponse } from 'next/server';
import { projectDb, searchResultDb, reportDb, settingsDb, taskDb } from '@/lib/db';
import { getDataSourceManager, type SearchResult } from '@/lib/datasources';
import { analyzeSearchResults, generateFullReport, type AnalysisResult } from '@/lib/analysis';
import { generateText, getLLMConfig, PRODUCT_ANALYST_PROMPT } from '@/lib/llm';
import { createResearchTask, getUserActiveTaskCount } from '@/lib/taskQueue';

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
  user_id: string;
  title: string;
  description: string;
  keywords: string;
  status: string;
  progress: number;
  progress_message: string;
  created_at: string;
  updated_at: string;
}

interface Report {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  content: string;
  mermaid_charts: string;
  version: number;
  created_at: string;
}

// 使用大模型分析搜索结果
async function analyzeWithLLM(results: SearchResult[], projectTitle: string) {
  const config = getLLMConfig();

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

  const summary = results.slice(0, 10).map(r => ({
    title: r.title,
    content: r.content.substring(0, 500),
  }));

  const prompt = `请分析以下产品调研资料，总结关键功能特性、竞争对手、SWOT分析和市场机会。

产品主题：${projectTitle}

资料内容：
${JSON.stringify(summary, null, 2)}

请提供JSON格式的分析结果，包含：
1. 关键功能特性列表
2. 主要竞争对手及其特点
3. SWOT分析
4. 市场机会点
5. 技术发展路线建议
6. 市场规模和增长趋势数据`;

  try {
    const result = await generateText(prompt, PRODUCT_ANALYST_PROMPT, {
      temperature: 0.3,
      maxTokens: 4000,
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse LLM response');
  } catch (error) {
    console.error('LLM analysis failed:', error);
    return analyzeSearchResults(results, projectTitle);
  }
}

// 从搜索结果中识别竞品
async function identifyCompetitorsFromResults(results: SearchResult[], projectTitle: string): Promise<string[]> {
  // 简单的规则：查找包含 "竞品"、"competitor"、"vs"、"对比" 等关键词的结果
  const competitors = new Set<string>();

  for (const result of results) {
    const title = result.title.toLowerCase();
    const content = result.content.toLowerCase();

    // 提取可能的公司名/产品名（这里用简单规则，实际应使用 NLP）
    const patterns = [
      /([A-Z][a-zA-Z\s]+?)(?:\s+vs|\s+对比|\s+compared)/gi,
      /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g,
    ];

    for (const pattern of patterns) {
      const matches = result.title.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleaned = match.replace(/vs|对比|compared/gi, '').trim();
          if (cleaned.length > 2 && cleaned.length < 30) {
            competitors.add(cleaned);
          }
        }
      }
    }
  }

  // 限制竞品数量
  return Array.from(competitors).slice(0, 5);
}

// 使用 LLM 生成完整报告
async function generateReportWithLLM(project: Project, results: SearchResult[], llmAnalysis: any): Promise<string> {
  const config = getLLMConfig();
  const hasApiKey = !!config.apiKey;

  const prompt = `请为以下产品调研生成一份详细的产品分析报告。

产品主题：${project.title}

已完成的AI分析结果：
${JSON.stringify(llmAnalysis, null, 2)}

调研结果摘要：
${results.slice(0, 10).map((r, i) => `${i + 1}. ${r.title}`).join('\n')}

请生成一份完整的产品调研报告，包括以下部分：

1. 执行摘要
2. 产品概述
3. 核心功能分析（基于调研资料）
4. 竞品对比分析（基于AI识别的竞品）
5. SWOT分析（基于AI分析结果）
6. 市场洞察与发展趋势
7. 建议与机会

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
    const analysis = analyzeSearchResults(results, project.title);
    return generateFullReport(project, results, analysis);
  }
}

// GET /api/research - 获取项目进度
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json(
      { success: false, error: 'Project ID is required' },
      { status: 400 }
    );
  }

  const project = projectDb.getById.get({ id: projectId }) as Project | undefined;
  if (!project) {
    return NextResponse.json(
      { success: false, error: 'Project not found' },
      { status: 404 }
    );
  }

  // 获取关联的任务
  const task = taskDb.getByProject.get({ project_id: projectId }) as { id: string; status: string; error?: string } | undefined;

  return NextResponse.json({
    success: true,
    data: {
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
        progress: project.progress || 0,
        progress_message: project.progress_message || '',
      },
      task: task ? {
        id: task.id,
        status: task.status,
        error: task.error,
      } : null,
    },
  });
}

// POST /api/research - 创建调研任务（异步）
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

    // 检查项目状态
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

    // 检查用户活跃任务数量（最多3个）
    const activeTaskCount = getUserActiveTaskCount(user.id);
    if (activeTaskCount >= 3) {
      return NextResponse.json(
        { success: false, error: 'You have too many active research tasks. Please wait for them to complete.' },
        { status: 429 }
      );
    }

    // 更新项目状态为等待中
    projectDb.update.run({
      id: projectId,
      title: project.title,
      description: project.description,
      keywords: project.keywords,
      status: 'pending',
      progress: 0,
      progress_message: '等待调研任务开始...',
    });

    // 创建调研任务
    const task = createResearchTask(projectId, user.id);

    // 触发任务队列处理
    // 注意：在生产环境中，应该有独立的工作进程处理任务
    // 这里我们通过 API 调用触发一次处理
    try {
      const { taskQueue } = await import('@/lib/taskQueue');
      taskQueue.trigger();
    } catch (e) {
      console.log('Task queued, will be processed by background worker');
    }

    return NextResponse.json({
      success: true,
      data: {
        project: {
          id: project.id,
          title: project.title,
          status: 'pending',
          progress: 0,
          progress_message: '等待调研任务开始...',
        },
        task: {
          id: task.id,
          status: task.status,
        },
        message: 'Research task has been queued. Please check back later for progress.',
      },
    });
  } catch (error) {
    console.error('Error creating research task:', error);

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
            progress: 0,
            progress_message: '',
          });
        }
      } catch (rollbackError) {
        console.error('Failed to rollback project status:', rollbackError);
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create research task: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
