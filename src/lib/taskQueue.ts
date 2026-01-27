import db, { taskDb, projectDb, searchResultDb, reportDb } from './db';
import { getDataSourceManager, type SearchResult } from './datasources';
import { analyzeSearchResults, generateFullReport } from './analysis';
import { generateText, getLLMConfig, PRODUCT_ANALYST_PROMPT } from './llm';
import crypto from 'crypto';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Task {
  id: string;
  project_id: string;
  user_id: string;
  status: TaskStatus;
  priority: number;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface ProjectProgress {
  progress: number;
  message: string;
}

// Project type for generateFullReport function
interface ProjectForReport {
  id: string;
  title: string;
  description: string;
  keywords: string;
}

// 生成唯一ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 修复LLM输出的markdown内容中的转义字符
function fixMarkdownEscaping(content: string): string {
  let fixed = content.replace(/\\\`\\\`\\\`/g, '```');
  fixed = fixed.replace(/\\\*/g, '*');
  fixed = fixed.replace(/\\_/g, '_');
  fixed = fixed.replace(/\\\[/g, '[');
  fixed = fixed.replace(/\\\]/g, ']');
  fixed = fixed.replace(/\\\(/g, '(');
  fixed = fixed.replace(/\\\)/g, ')');
  return fixed;
}

// 更新项目进度
export function updateProgress(projectId: string, progress: number, message: string) {
  projectDb.updateProgress.run({ id: projectId, progress, progress_message: message });
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
      marketData: { marketSize: '数十亿级', growthRate: '15-20%', keyPlayers: [], trends: [] },
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

// 生成完整报告
async function generateReport(project: ProjectForReport, results: SearchResult[]): Promise<{ content: string; used_llm: number }> {
  const config = getLLMConfig();
  const hasApiKey = !!config.apiKey;

  const prompt = `请为以下产品调研生成一份详细的产品分析报告。

产品主题：${project.title}

调研结果数量：${results.length} 条

${hasApiKey ? '基于AI智能分析的结果，请生成一份专业的产品功能推荐和机会分析报告。' : '请根据收集到的资料，生成一份详细的产品功能分析和竞品对比报告。'}

报告要求包含以下内容：

1. 产品概述
2. 核心功能分析（列出主要功能点及其实现方式）
3. 竞品对比分析（至少对比3个竞品）
4. SWOT分析
5. 市场机会洞察
6. 技术发展路线建议

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
    return { content: report, used_llm: hasApiKey ? 1 : 0 };
  } catch (error) {
    console.error('LLM report generation failed:', error);
    const analysis = analyzeSearchResults(results, project.title);
    return { content: generateFullReport(project, results, analysis), used_llm: 0 };
  }
}

// 执行单个调研任务
export async function processTask(taskId: string): Promise<boolean> {
  const task = taskDb.getById.get({ id: taskId }) as Task | undefined;
  if (!task) {
    console.error('Task not found:', taskId);
    return false;
  }

  const project = projectDb.getById.get({ id: task.project_id }) as ProjectForReport | undefined;
  if (!project) {
    console.error('Project not found:', task.project_id);
    taskDb.markFailed.run({ id: taskId, error: 'Project not found' });
    return false;
  }

  try {
    // 标记任务开始
    taskDb.markProcessing.run({ id: taskId });
    projectDb.updateStatus.run({ id: task.project_id, status: 'processing' });
    updateProgress(task.project_id, 5, '正在初始化调研任务...');

    // 清理旧的搜索结果和报告（如果有）
    searchResultDb.deleteByProject.run({ project_id: task.project_id });
    reportDb.deleteByProject.run({ project_id: task.project_id });

    const sourceManager = getDataSourceManager();
    const enabledSources = sourceManager.getEnabledSources();
    const allResults: SearchResult[] = [];

    // 第一轮：使用项目标题进行主题搜索
    updateProgress(task.project_id, 10, `正在搜索 "${project.title}" 相关资料...`);

    const totalSources = enabledSources.length;
    for (let i = 0; i < enabledSources.length; i++) {
      const source = enabledSources[i];
      updateProgress(
        task.project_id,
        10 + Math.floor((i / totalSources) * 30),
        `正在搜索 ${source}（${i + 1}/${totalSources}）...`
      );

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
            project_id: task.project_id,
            user_id: task.user_id,
            source,
            query: project.title,
            url: result.url,
            title: result.title,
            content: result.content,
            raw_data: JSON.stringify(result),
          });
          allResults.push(result);
        }
      } catch (error) {
        console.error(`Error searching with ${source}:`, error);
      }
    }

    // 第二轮：竞品搜索
    updateProgress(task.project_id, 45, '正在搜索竞品信息...');

    const competitors = ['竞品1', '竞品2', '竞品3'];
    const competitorResults: SearchResult[] = [];

    for (const competitor of competitors) {
      updateProgress(
        task.project_id,
        45 + Math.floor((competitors.indexOf(competitor) / competitors.length) * 20),
        `正在搜索 ${competitor}...`
      );

      try {
        const results = await sourceManager.search({
          query: `${project.title} ${competitor}`,
          source: 'duckduckgo',
          limit: 5,
        });

        for (const result of results) {
          const searchId = generateId();
          searchResultDb.create.run({
            id: searchId,
            project_id: task.project_id,
            user_id: task.user_id,
            source: 'competitor',
            query: competitor,
            url: result.url,
            title: result.title,
            content: result.content,
            raw_data: JSON.stringify(result),
          });
          allResults.push(result);
          competitorResults.push(result);
        }
      } catch (error) {
        console.error(`Error searching competitor ${competitor}:`, error);
      }
    }

    // 分析阶段
    updateProgress(task.project_id, 70, '正在进行智能分析...');
    await analyzeWithLLM(allResults, project.title);

    // 生成报告
    updateProgress(task.project_id, 85, '正在生成调研报告...');
    const reportResult = await generateReport(project, allResults);

    // 修复 markdown 转义
    const fixedReport = fixMarkdownEscaping(reportResult.content);

    // 先删除已存在的报告（如果有）
    reportDb.deleteByProject.run({ project_id: task.project_id });

    // 保存报告
    const reportId = generateId();
    reportDb.create.run({
      id: reportId,
      project_id: task.project_id,
      user_id: task.user_id,
      title: `${project.title} - 产品调研报告`,
      content: fixedReport,
      mermaid_charts: '',
      used_llm: reportResult.used_llm,
    });

    // 完成任务
    taskDb.markCompleted.run({ id: taskId });
    projectDb.update.run({
      id: task.project_id,
      title: project.title,
      description: project.description || '',
      keywords: project.keywords || '',
      status: 'completed',
      progress: 100,
      progress_message: '调研完成！',
    });
    updateProgress(task.project_id, 100, '调研完成！');

    console.log(`Research task completed: ${taskId}`);
    return true;
  } catch (error) {
    console.error('Task failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    taskDb.markFailed.run({ id: taskId, error: errorMessage });
    projectDb.updateStatus.run({ id: task.project_id, status: 'failed' });
    updateProgress(task.project_id, 0, `调研失败: ${errorMessage}`);
    return false;
  }
}

// 获取下一个待处理的任务
export function getNextTask(): Task | null {
  const task = taskDb.getPending.get() as Task | undefined;
  return task || null;
}

// 检查用户是否有进行中的任务
export function userHasActiveTasks(userId: string): boolean {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM research_tasks
    WHERE user_id = @user_id AND status IN ('pending', 'processing')
  `).get({ user_id: userId }) as { count: number };
  return result.count >= 3;
}

// 获取用户活跃任务数量
export function getUserActiveTaskCount(userId: string): number {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM research_tasks
    WHERE user_id = @user_id AND status IN ('pending', 'processing')
  `).get({ user_id: userId }) as { count: number };
  return result.count;
}

// 创建调研任务（不执行，只入队）
export function createResearchTask(projectId: string, userId: string): Task {
  const taskId = generateId();

  // 如果已存在该项目的任务，先删除（旧任务可能是失败或未完成的）
  const existingTask = taskDb.getByProject.get({ project_id: projectId }) as Task | undefined;
  if (existingTask) {
    taskDb.deleteByProject.run({ project_id: projectId });
  }

  taskDb.create.run({
    id: taskId,
    project_id: projectId,
    user_id: userId,
    status: 'pending',
  });

  return {
    id: taskId,
    project_id: projectId,
    user_id: userId,
    status: 'pending',
    priority: 0,
    created_at: new Date().toISOString(),
  };
}

// 任务队列类
export class TaskQueue {
  private isProcessing = false;
  private pollInterval: NodeJS.Timeout | null = null;

  // 启动队列处理器
  start(pollIntervalMs = 5000) {
    if (this.isProcessing) return;

    this.isProcessing = true;
    console.log('Task queue started, polling every', pollIntervalMs, 'ms');

    // 立即执行一次
    this.processNext();

    // 设置轮询
    this.pollInterval = setInterval(() => {
      this.processNext();
    }, pollIntervalMs);
  }

  // 停止队列处理器
  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isProcessing = false;
    console.log('Task queue stopped');
  }

  // 处理下一个任务
  private async processNext() {
    const task = getNextTask();
    if (!task) return;

    console.log('Processing task:', task.id, 'for project:', task.project_id);
    await processTask(task.id);
  }

  // 手动触发任务处理
  async trigger() {
    await this.processNext();
  }
}

// 导出单例任务队列
export const taskQueue = new TaskQueue();
