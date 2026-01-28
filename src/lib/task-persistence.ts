/**
 * 任务数据持久化管理
 *
 * 为每个调研任务生成两个文件：
 * 1. {projectId}-data.json - 所有原始数据（搜索结果、摘要、分析等）
 * 2. {projectId}-report.md - 最终研究报告（Markdown格式）
 *
 * 支持断点续传，进程崩溃后可恢复
 */

import fs from 'fs';
import path from 'path';

// 任务数据目录
const TASK_DATA_DIR = path.join(process.cwd(), 'task-data');

// 确保目录存在
function ensureDir() {
  if (!fs.existsSync(TASK_DATA_DIR)) {
    fs.mkdirSync(TASK_DATA_DIR, { recursive: true });
  }
}

// 获取数据文件路径
export function getTaskDataFilePath(projectId: string): string {
  ensureDir();
  return path.join(TASK_DATA_DIR, `${projectId}-data.json`);
}

// 获取报告文件路径
export function getTaskReportFilePath(projectId: string): string {
  ensureDir();
  return path.join(TASK_DATA_DIR, `${projectId}-report.md`);
}

// 任务数据文件结构
export interface TaskDataFile {
  projectId: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  status: 'researching' | 'completed' | 'failed';
  progress: number;
  progressMessage: string;

  // 研究数据 - 搜索结果（包含数据源和爬取信息）
  searchResults: Array<{
    // 基本信息
    source: string;              // 数据源名称 (如 'Hacker News', 'Dev.to')
    sourceType: string;          // 数据源类型 (如 'rss', 'api', 'search', 'crawl4ai')
    url: string;
    title: string;
    content: string;
    publishedAt?: string;

    // 搜索元数据
    searchQuery?: string;        // 触发此结果的搜索查询
    searchDimension?: string;    // 所属研究维度
    queryId?: string;            // 查询ID

    // Crawl4AI 爬取数据
    crawl4ai?: {
      crawled: boolean;          // 是否经过 Crawl4AI 爬取
      originalContent?: string;  // 原始简短内容
      enrichedContent?: string;  // 爬取后的完整内容
      crawlTimestamp?: string;   // 爬取时间
      contentLength: number;     // 内容长度
    };

    // 内容质量
    qualityScore?: number;       // 内容质量评分 (1-10)
    informationDensity?: number; // 信息密度
  }>;

  // Crawl4AI 爬取记录（独立存储，方便查看）
  crawl4aiResults: Array<{
    url: string;
    title: string;
    originalContent: string;
    enrichedContent: string;
    crawlTimestamp: string;
    contentLength: number;
    sourceResultUrl?: string;    // 关联的搜索结果 URL
  }>;

  // 数据源统计
  sourceStats: Record<string, {
    count: number;
    totalContentLength: number;
  }>;

  individualSummaries: Array<{
    source: string;
    url: string;
    title: string;
    content: string;
    keyPoints: string[];
    features: string[];
    competitors: string[];
    techStack: string[];
    useCases: string[];
    marketInfo: string;
    limitations: string[];
    qualityScore: number;
  }>;

  comprehensiveSummary: {
    productOverview: string;
    coreThemes: string[];
    allFeatures: string[];
    allCompetitors: string[];
    allTechStack: string[];
    featureFrequency: Record<string, number>;
  } | null;

  deepAnalysis: {
    features: Array<{ name: string; description: string; frequency: number }>;
    competitors: Array<{ name: string; type: string; description: string; url?: string }>;
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
      segments: string[];
    };
    techAnalysis: {
      architecture: string[];
      techStack: string[];
      emergingTech: string[];
    };
    userInsights: {
      personas: string[];
      painPoints: string[];
      requirements: string[];
    };
    opportunities: string[];
    risks: string[];
    recommendations: string[];
  } | null;

  dataQuality: {
    isComplete: boolean;
    score: number;
    issues: string[];
    suggestions: string[];
    coverage: Record<string, number>;
    missingDimensions: string[];
    recommendedQueries: string[];
  };

  iterationsUsed: number;
  totalSearches: number;

  // 原始计划
  researchPlan: {
    queries: Array<{
      id: string;
      query: string;
      purpose: string;
      dimension: string;
      priority: number;
      hints?: string;
    }>;
    targetSources: string[];
    researchDimensions: string[];
    qualityThresholds: {
      minFeatures: number;
      minCompetitors: number;
      minUseCases: number;
      minTechStack: number;
      minSearchResults: number;
      minIterations: number;
    };
  } | null;

  citations: Array<{
    id: string;
    source: string;
    title: string;
    url: string;
    relevanceScore: number;
  }>;
}

// 创建空的持久化数据
export function createEmptyTaskData(
  projectId: string,
  title: string,
  description: string
): TaskDataFile {
  const now = new Date().toISOString();
  return {
    projectId,
    title,
    description,
    createdAt: now,
    updatedAt: now,
    status: 'researching',
    progress: 0,
    progressMessage: '正在初始化...',
    searchResults: [],
    crawl4aiResults: [],
    sourceStats: {},
    individualSummaries: [],
    comprehensiveSummary: null,
    deepAnalysis: null,
    dataQuality: {
      isComplete: false,
      score: 0,
      issues: [],
      suggestions: [],
      coverage: {},
      missingDimensions: [],
      recommendedQueries: [],
    },
    iterationsUsed: 0,
    totalSearches: 0,
    researchPlan: null,
    citations: [],
  };
}

// 保存任务数据文件
export function saveTaskData(data: TaskDataFile): void {
  const filePath = getTaskDataFilePath(data.projectId);
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[TaskPersistence] Saved data to ${filePath}`);
}

// 加载任务数据文件
export function loadTaskData(projectId: string): TaskDataFile | null {
  const filePath = getTaskDataFilePath(projectId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as TaskDataFile;
  } catch (error) {
    console.error(`[TaskPersistence] Failed to load ${filePath}:`, error);
    return null;
  }
}

// 保存报告文件
export function saveTaskReport(projectId: string, report: string): void {
  const filePath = getTaskReportFilePath(projectId);
  fs.writeFileSync(filePath, report, 'utf-8');
  console.log(`[TaskPersistence] Saved report to ${filePath}`);
}

// 检查是否有未完成的任务数据
export function hasUnfinishedTask(projectId: string): boolean {
  const data = loadTaskData(projectId);
  return data !== null && data.status === 'researching';
}

// 删除任务相关文件
export function deleteTaskFiles(projectId: string): void {
  const dataFile = getTaskDataFilePath(projectId);
  const reportFile = getTaskReportFilePath(projectId);

  if (fs.existsSync(dataFile)) {
    fs.unlinkSync(dataFile);
    console.log(`[TaskPersistence] Deleted ${dataFile}`);
  }
  if (fs.existsSync(reportFile)) {
    fs.unlinkSync(reportFile);
    console.log(`[TaskPersistence] Deleted ${reportFile}`);
  }
}

// 格式化数据用于报告生成
export function formatDataForReport(data: TaskDataFile): {
  searchResults: any[];
  individualSummaries: any[];
  comprehensiveSummary: any;
  analysis: any;
  dataQuality: any;
  citations: any[];
  iterationsUsed: number;
  totalSearches: number;
} {
  return {
    searchResults: data.searchResults,
    individualSummaries: data.individualSummaries,
    comprehensiveSummary: data.comprehensiveSummary,
    analysis: data.deepAnalysis,
    dataQuality: data.dataQuality,
    citations: data.citations,
    iterationsUsed: data.iterationsUsed,
    totalSearches: data.totalSearches,
  };
}

// 获取所有任务数据文件
export function listTaskFiles(): string[] {
  ensureDir();
  return fs.readdirSync(TASK_DATA_DIR)
    .filter(f => f.endsWith('-data.json'))
    .map(f => f.replace('-data.json', ''));
}
