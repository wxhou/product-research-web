import { NextRequest, NextResponse } from 'next/server';
import { projectDb, searchResultDb, reportDb, settingsDb, taskDb } from '@/lib/db';
import { getDataSourceManager, type SearchResult } from '@/lib/datasources';
import { analyzeSearchResults, generateFullReport, type AnalysisResult } from '@/lib/analysis';
import { generateText, getLLMConfig, PRODUCT_ANALYST_PROMPT } from '@/lib/llm';
import { createResearchTask, getUserActiveTaskCount, getProjectLogs } from '@/lib/taskQueue';
import { MarkdownStateManager } from '@/lib/research-agent/graph/markdown-state';
import type { ProgressDetail } from '@/lib/research-agent/types';

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
    content: (r.content || '').substring(0, 500),
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
    const content = (result.content || '').toLowerCase();

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
  const sources = [...new Set(results.map(r => r.source))].join(', ') || '未知';

  const prompt = `请为以下产品调研生成一份完整、专业的 Markdown 格式产品分析报告。

产品主题：${project.title}
描述：${project.description || '无'}
关键词：${project.keywords || project.title}

已完成的AI分析结果：
${JSON.stringify(llmAnalysis, null, 2)}

调研结果摘要（共 ${results.length} 条）：
${results.slice(0, 10).map((r, i) => `${i + 1}. [${r.source}] ${r.title}`).join('\n')}

请生成一份完整的产品调研报告，包含以下所有部分（严格按照此编号顺序）：

## 1. 摘要
（调研目的、关键发现、核心建议 - 200-300字）

## 2. 调研概览
| 项目 | 数据 |
|-----|------|
| 调研产品数 | ${results.length} |
| 数据来源 | ${sources} |
| 关键词 | ${project.keywords || project.title} |
| 识别功能数 | ${llmAnalysis.features?.length || '待分析'} |
| 识别竞品数 | ${llmAnalysis.competitors?.length || '待分析'} |

## 3. 市场背景分析
### 3.1 市场规模与趋势
### 3.2 产业链分析
### 3.3 政策法规环境

## 4. 目标用户分析
### 4.1 用户画像
### 4.2 使用场景
### 4.3 用户痛点
### 4.4 需求优先级

## 5. 竞品分析
### 5.1 竞品总览（表格，包含竞品名称、特点、市场定位）
### 5.2 竞品详细对比
### 5.3 定价策略分析
### 5.4 竞品优劣势

## 6. 功能分析
### 6.1 核心功能列表（基于调研资料识别）
### 6.2 功能对比矩阵
### 6.3 功能实现方式

## 7. 技术分析
### 7.1 技术架构概览
### 7.2 技术栈分布
### 7.3 技术趋势

## 8. SWOT 分析
### 8.1 优势 (Strengths)
### 8.2 劣势 (Weaknesses)
### 8.3 机会 (Opportunities)
### 8.4 威胁 (Threats)

## 9. 商业模式分析
### 9.1 盈利模式
### 9.2 定价策略
### 9.3 渠道策略
### 9.4 客户成功策略

## 10. 市场机会分析
### 10.1 高价值机会清单
### 10.2 次要机会清单
### 10.3 差异化建议

## 11. 技术路线演进
### 11.1 关键技术里程碑
### 11.2 技术选型建议

## 12. 风险分析
### 12.1 市场风险
### 12.2 技术风险
### 12.3 竞争风险
### 12.4 合规风险
### 12.5 风险应对策略

## 13. 战略建议
### 13.1 短期行动（0-3个月）
### 13.2 中期规划（3-12个月）
### 13.3 长期愿景（1-3年）

## 14. 用户旅程图

\`\`\`mermaid
journey
    title 用户使用旅程
    发现 : 5 : 用户 : 了解产品 : 搜索对比
    考虑 : 4 : 用户 : 评估功能 : 试用体验
    决策 : 3 : 用户 : 价格比较 : 口碑查询
    使用 : 5 : 用户 : 日常使用 : 问题反馈
    留存 : 4 : 用户 : 持续使用 : 功能更新
    推荐 : 3 : 用户 : 分享推荐 : 社区讨论
\`\`\`

## 15. 竞品能力对比

\`\`\`mermaid
radar
    title 竞品能力对比雷达图
    axes: 功能丰富度, 性能表现, 用户体验, 价格竞争力, 技术创新, 生态完善度
    ${(llmAnalysis.competitors?.[0]?.name as string) || '竞品A'}: [80, 70, 85, 60, 75, 70]
    ${(llmAnalysis.competitors?.[1]?.name as string) || '竞品B'}: [70, 85, 75, 80, 65, 75]
    本产品定位: [75, 75, 80, 70, 80, 65]
\`\`\`

## 16. 市场份额分布

\`\`\`mermaid
pie
    title 市场份额分布
    "厂商A" : 35
    "厂商B" : 25
    "厂商C" : 20
    "其他" : 20
\`\`\`

## 17. 功能状态流转

\`\`\`mermaid
stateDiagram-v2
    [*] --> 发现
    发现 --> 考虑 : 用户搜索
    考虑 --> 决策 : 试用体验
    决策 --> 使用 : 购买转化
    使用 --> 留存 : 持续价值
    使用 --> 流失 : 体验不佳
    流失 --> [*]
    留存 --> 推荐 : 满意
    推荐 --> [*]
\`\`\`

## 18. 调研产品详单
| 序号 | 来源 | 标题 |
|------|------|------|
${results.slice(0, 10).map((r, i) => `| ${i + 1} | ${r.source} | [${r.title}](${r.url}) |`).join('\n')}

## 19. 数据来源说明
- RSS 订阅：Hacker News, TechCrunch, The Verge, Wired, Product Hunt
- 搜索引擎：DuckDuckGo
- 开源平台：GitHub

## 20. 附录
### 20.1 功能详细数据表
### 20.2 竞品详细信息
### 20.3 调研方法论

---

## 必须在报告中包含的 Mermaid 图表（复制以下代码块到报告中）：

1. **SWOT 思维导图**（放在第8节 SWOT分析中）：
\`\`\`mermaid
mindmap
  root((SWOT分析))
    优势
      ::icon(fa fa-star)
      ${(llmAnalysis.swot?.strengths || []).slice(0, 3).map((s: string) => `● ${s}`).join('\n      ') || '● 核心优势1\n      ● 核心优势2\n      ● 核心优势3'}
    劣势
      ::icon(fa fa-warning)
      ${(llmAnalysis.swot?.weaknesses || []).slice(0, 3).map((w: string) => `● ${w}`).join('\n      ') || '● 主要劣势1\n      ● 主要劣势2\n      ● 主要劣势3'}
    机会
      ::icon(fa fa-lightbulb)
      ${(llmAnalysis.swot?.opportunities || []).slice(0, 3).map((o: string) => `● ${o}`).join('\n      ') || '● 市场机会1\n      ● 市场机会2\n      ● 市场机会3'}
    威胁
      ::icon(fa fa-exclamation-triangle)
      ${(llmAnalysis.swot?.threats || []).slice(0, 3).map((t: string) => `● ${t}`).join('\n      ') || '● 外部威胁1\n      ● 外部威胁2\n      ● 外部威胁3'}
\`\`\`

2. **技术路线时间线**（放在第11节 技术路线演进中）：
\`\`\`mermaid
timeline
    title 技术发展路线演进
    2024 : 技术启动期 : 原型验证
    2025 : 快速发展期 : 功能完善 : 用户增长
    2026 : 成熟期 : 规模化 : 生态建设
    2027 : 领先期 : 创新突破 : 市场主导
    2028 : 转型期 : 技术升级 : 新领域探索
\`\`\`

3. **机会四象限**（放在第10节 市场机会分析中）：
\`\`\`mermaid
quadrantChart
    title 市场机会四象限分析
    x-axis 低投入 --> 高投入
    y-axis 低价值 --> 高价值
    quadrant 重点投入
    quadrant 先观望
    quadrant 维持现状
    quadrant 低成本试错
    ${((llmAnalysis.opportunities || []).slice(0, 8) as string[]).map((o: string, i: number) => {
      const x = i % 2 === 0 ? '低投入' : '高投入';
      const y = i < 4 ? '低价值' : '高价值';
      return `    [${i + 1}] ${o} : ${x}, ${y}`;
    }).join('\n') || '    机会1 : 高投入, 高价值\n    机会2 : 低投入, 高价值\n    机会3 : 低投入, 低价值\n    机会4 : 高投入, 低价值'}
\`\`\`

4. **功能频率分布（甘特图）**（放在第6节 功能分析中）：
\`\`\`mermaid
gantt
    title 功能实现频率分布
    dateFormat X
    axisFormat %s
    section 高频功能
    核心功能A : 0, 85
    核心功能B : 0, 70
    核心功能C : 0, 65
    section 中频功能
    扩展功能A : 0, 45
    扩展功能B : 0, 35
    扩展功能C : 0, 30
    section 低频功能
    辅助功能A : 0, 15
    辅助功能B : 0, 10
\`\`\`

请使用 Markdown 格式，确保：
- 严格按照上述 20 节编号顺序
- 清晰的层级结构（##, ### 等标题）
- 完整的表格
- 报告内容详细、专业，字数不少于 3000 字`;

  try {
    const report = await generateText(prompt, PRODUCT_ANALYST_PROMPT, {
      temperature: 0.7,
      maxTokens: 12000,
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

  // 获取项目日志
  const logs = getProjectLogs(projectId, 30);

  // 获取详细进度信息（从状态文件读取）
  let progressDetail: ProgressDetail | null = null;
  try {
    const stateManager = new MarkdownStateManager({
      stateDir: 'task-data',
    });
    const state = await stateManager.readState(projectId);
    if (state?.progressDetail) {
      progressDetail = state.progressDetail as ProgressDetail;
    } else {
      // 从状态构造默认进度详情
      progressDetail = {
        stage: project.status || 'pending',
        step: project.progress_message || '等待开始',
        totalItems: 10,
        completedItems: Math.round((project.progress || 0) / 10),
        currentItem: '',
        percentage: project.progress || 0,
      };
    }
  } catch {
    // 使用默认进度
    progressDetail = {
      stage: project.status || 'pending',
      step: project.progress_message || '等待开始',
      totalItems: 10,
      completedItems: Math.round((project.progress || 0) / 10),
      currentItem: '',
      percentage: project.progress || 0,
    };
  }

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
      logs: logs,
      progressDetail: progressDetail,
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
