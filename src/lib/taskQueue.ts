import db, { taskDb, projectDb, searchResultDb, reportDb, researchPhaseDb } from './db';
import type { SearchResult } from './datasources';
import { runResearchAgent, getResearchTaskStatus } from './research-agent';
import { MarkdownStateManager } from './research-agent/graph/markdown-state';

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
  completed_at: string;
}

export interface ProjectProgress {
  progress: number;
  message: string;
}

// ==================== 日志存储 ====================

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  tag: string;
  message: string;
  projectId?: string;
}

// 内存日志缓冲区（按项目ID存储）
const projectLogs: Map<string, LogEntry[]> = new Map();
const MAX_LOGS_PER_PROJECT = 100;

// 过滤敏感信息的函数
function sanitizeLogMessage(message: string): string {
  return message
    // 隐藏 API Key (sk- 开头的密钥)
    .replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-***')
    // 隐藏 ModelScope API Key (ms- 开头的密钥)
    .replace(/ms-[a-zA-Z0-9-]{20,}/g, 'ms-***')
    // 隐藏 URL 中的敏感参数
    .replace(/([?&])api[_-]?key=([^&]*)/gi, '$1api_key=***')
    .replace(/([?&])key=([^&]*)/gi, '$1key=***')
    .replace(/([?&])token=([^&]*)/gi, '$1token=***')
    // 隐藏完整 URL（只保留域名）
    .replace(/https?:\/\/[^\/]+/g, (match) => {
      try {
        const url = new URL(match);
        return url.hostname;
      } catch {
        return match;
      }
    });
}

// 记录日志
export function addLog(projectId: string, tag: string, message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const sanitizedMessage = sanitizeLogMessage(message);

  if (!projectLogs.has(projectId)) {
    projectLogs.set(projectId, []);
  }

  const logs = projectLogs.get(projectId)!;
  logs.push({
    timestamp: new Date().toISOString(),
    level,
    tag,
    message: sanitizedMessage,
    projectId,
  });

  // 保留最近的日志
  if (logs.length > MAX_LOGS_PER_PROJECT) {
    logs.shift();
  }
}

// 获取项目的日志
export function getProjectLogs(projectId: string, limit = 50): LogEntry[] {
  const logs = projectLogs.get(projectId) || [];
  return logs.slice(-limit);
}

// 清除项目的日志
export function clearProjectLogs(projectId: string) {
  projectLogs.delete(projectId);
}

// 获取所有活跃项目的日志数量（用于监控）
export function getActiveLogCount(): number {
  return projectLogs.size;
}

// 调研阶段定义
export type ResearchPhase =
  | 'data_collection'
  | 'summarization'
  | 'deep_analysis'
  | 'report_generation'
  | 'completed';

// 阶段状态
export interface ResearchPhaseState {
  id: string;
  project_id: string;
  phase: ResearchPhase;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  data: string;
  created_at: string;
  updated_at: string;
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

// 更新阶段状态
function updatePhaseState(projectId: string, phase: ResearchPhase, status: 'pending' | 'processing' | 'completed' | 'failed', progress: number, message: string, data: object = {}) {
  const existing = researchPhaseDb.getByProjectAndPhase.get({ project_id: projectId, phase }) as ResearchPhaseState | undefined;

  if (existing) {
    researchPhaseDb.update.run({
      id: existing.id,
      project_id: projectId,
      phase,
      status,
      progress,
      message,
      data: JSON.stringify(data),
    });
  } else {
    const id = generateId();
    researchPhaseDb.create.run({
      id,
      project_id: projectId,
      phase,
      status,
      progress,
      message,
      data: JSON.stringify(data),
    });
  }
}

// 获取阶段状态
export function getPhaseState(projectId: string, phase: ResearchPhase): ResearchPhaseState | null {
  return researchPhaseDb.getByProjectAndPhase.get({ project_id: projectId, phase }) as ResearchPhaseState | null;
}

// 获取所有阶段状态
export function getAllPhaseStates(projectId: string): ResearchPhaseState[] {
  return researchPhaseDb.getByProject.all({ project_id: projectId }) as ResearchPhaseState[];
}

// ==================== 主处理流程 (使用 LangGraph 风格的 Research Agent) ====================

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
    updateProgress(task.project_id, 0, '正在初始化调研任务...');

    // 清理旧的搜索结果和报告
    searchResultDb.deleteByProject.run({ project_id: task.project_id });
    reportDb.deleteByProject.run({ project_id: task.project_id });
    researchPhaseDb.deleteByProject.run({ project_id: task.project_id });

    // 解析关键词
    const keywords = (project.keywords || '').split(',').map(k => k.trim()).filter(Boolean);

    // 使用 Research Agent 执行完整的研究工作流 (LangGraph 风格)
    const result = await runResearchAgent({
      projectId: task.project_id,
      title: project.title,
      description: project.description || '',
      keywords,
      userId: task.user_id,
      onProgress: (progress, message) => {
        updateProgress(task.project_id, progress, message);
      },
      onComplete: (result) => {
        console.log(`Research completed for project: ${task.project_id}, success: ${result.success}`);
      },
      onError: (error) => {
        console.error(`Research error for project: ${task.project_id}`, error.message);
      },
    });

    // 获取最终状态
    const status = await getResearchTaskStatus(task.project_id);

    // 获取报告内容
    let reportContent = result.report || '';
    let dataQualityScore = 0;
    if (status) {
      dataQualityScore = status.confidenceScore ? status.confidenceScore * 100 : 0;
    }

    // 保存搜索结果（如果 Agent 有返回结果）
    // 注意：新架构使用 Markdown 文件存储，此处可省略

    // 保存报告（如果成功）
    if (result.success && reportContent) {
      const reportId = generateId();
      // 新路径格式: task-data/project-{id}/report.md
      const reportPath = result.reportPath || `task-data/project-${task.project_id}/report.md`;

      // 保存到数据库
      reportDb.create.run({
        id: reportId,
        project_id: task.project_id,
        user_id: task.user_id,
        title: `${project.title} - 产品调研报告`,
        content: reportContent,
        mermaid_charts: '',
        used_llm: 1,
      });

      // 保存到 Markdown 文件
      try {
        const fs = require('fs');
        const path = require('path');
        const dir = path.dirname(reportPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(reportPath, reportContent, 'utf-8');
        console.log(`Report saved to: ${reportPath}`);
      } catch (fileError) {
        console.warn(`Failed to save report file: ${fileError}`);
      }
    }

    // 完成任务
    if (result.success) {
      taskDb.markCompleted.run({ id: taskId });
      projectDb.update.run({
        id: task.project_id,
        title: project.title,
        description: project.description || '',
        keywords: project.keywords || '',
        status: 'completed',
        progress: 100,
        progress_message: `调研完成！数据质量评分: ${dataQualityScore}/100`,
      });
      updateProgress(task.project_id, 100, '调研完成！');
    } else {
      taskDb.markFailed.run({ id: taskId, error: result.error || '未知错误' });
      projectDb.update.run({
        id: task.project_id,
        title: project.title,
        description: project.description || '',
        keywords: project.keywords || '',
        status: 'failed',
        progress: 0,
        progress_message: `调研失败: ${result.error}`,
      });
      updateProgress(task.project_id, 0, `调研失败: ${result.error}`);
    }

    console.log(`Research task completed: ${taskId}, success: ${result.success}, quality score: ${dataQualityScore}`);
    return result.success;
  } catch (error) {
    console.error('Task failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    taskDb.markFailed.run({ id: taskId, error: errorMessage });
    projectDb.updateStatus.run({ id: task.project_id, status: 'failed' });
    updateProgress(task.project_id, 0, `调研失败: ${errorMessage}`);
    return false;
  }
}

// ==================== 任务队列管理 ====================

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

  // 如果已存在该项目的任务，先删除
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
    completed_at: new Date().toISOString(),
  };
}

// 任务队列类
export class TaskQueue {
  private isProcessing = false;
  private pollInterval: NodeJS.Timeout | null = null;

  start(pollIntervalMs = 5000) {
    if (this.isProcessing) return;

    this.isProcessing = true;
    console.log('Task queue started, polling every', pollIntervalMs, 'ms');

    this.processNext();
    this.pollInterval = setInterval(() => {
      this.processNext();
    }, pollIntervalMs);
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isProcessing = false;
    console.log('Task queue stopped');
  }

  private async processNext() {
    const task = getNextTask();
    if (!task) return;

    console.log('Processing task:', task.id, 'for project:', task.project_id);
    await processTask(task.id);
  }

  async trigger() {
    await this.processNext();
  }
}

export const taskQueue = new TaskQueue();
