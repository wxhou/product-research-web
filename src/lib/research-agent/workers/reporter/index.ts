/**
 * Reporter Agent
 *
 * 负责生成最终报告的 Agent
 *
 * 功能：
 * 1. 收集分析结果
 * 2. 生成 Markdown 报告
 * 3. 添加 Mermaid 图表
 * 4. 生成引用列表
 */

import type { ResearchState } from '../../state';
import type { AnalysisResult, Citation, ReportMetadata } from '../../types';
import {
  REPORT_TEMPLATE,
  generateReportContent,
  generateTitleBlock,
} from './templates';
import { updateProgress } from '../../progress/tracker';
import { createCancelCheck } from '../../cancellation/handler';
import { getFileStorageService } from '@/lib/file-storage';

/**
 * Reporter Agent 配置
 */
export interface ReporterConfig {
  /** 报告标题 */
  title?: string;
  /** 包含的章节 ID 列表 */
  includeSections: string[];
  /** 是否包含 Mermaid 图表 */
  includeCharts: boolean;
  /** 是否包含引用 */
  includeCitations: boolean;
}

/** 默认配置 */
const DEFAULT_CONFIG: ReporterConfig = {
  includeSections: ['abstract', 'overview', 'features', 'competitors', 'swot', 'recommendations', 'sources'],
  includeCharts: true,
  includeCitations: true,
};

/**
 * Reporter Agent 执行结果
 */
export interface ReporterResult {
  success: boolean;
  report?: string;
  reportPath?: string;
  metadata?: ReportMetadata;
  error?: string;
}

/**
 * 创建 Reporter Agent
 */
function createReporterAgent(config: Partial<ReporterConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return {
    config: finalConfig,
    execute: (state: ResearchState) => executeReport(state, finalConfig),
  };
}

/**
 * 主执行函数：生成报告
 */
async function executeReport(
  state: ResearchState,
  config: ReporterConfig
): Promise<ReporterResult> {
  const {
    projectId,
    title,
    keywords,
    analysis,
    searchResults,
    citations,
  } = state;

  if (!analysis) {
    return {
      success: false,
      error: '没有可生成报告的分析结果',
    };
  }

  // 创建取消检查
  const isCancelled = createCancelCheck(projectId);

  try {
    // 更新进度
    await updateProgress(projectId, {
      stage: 'reporting',
      step: '准备报告数据',
      totalItems: 4,
      completedItems: 0,
      currentItem: '整理分析结果',
    });

    // 检查取消
    if (isCancelled()) {
      return {
        success: false,
        error: '报告生成被用户取消',
      };
    }

    // 更新进度
    await updateProgress(projectId, {
      stage: 'reporting',
      step: '生成报告内容',
      totalItems: 4,
      completedItems: 1,
      currentItem: '渲染模板中',
    });

    // 收集数据源信息
    const dataSources = [...new Set(searchResults.map((r) => r.source))];
    const sourceNames = dataSources.map((s) => formatSourceName(s));

    // 生成报告内容
    const reportContent = generateReportContent(
      title,
      keywords,
      searchResults.length,
      state.extractedContent.length,
      analysis as any,
      sourceNames
    );

    // 生成标题块
    const titleBlock = generateTitleBlock(title, keywords);

    // 组合完整报告
    const fullReport = `${titleBlock}

---

${reportContent}

---

## 附录：数据详情

### 搜索结果统计

| 数据源 | 结果数 |
|-------|-------|
${sourceStats(searchResults, dataSources)}

### 引用来源

${renderCitations(citations)}
`;

    // 更新进度
    await updateProgress(projectId, {
      stage: 'reporting',
      step: '保存报告文件',
      totalItems: 4,
      completedItems: 2,
      currentItem: '写入文件',
    });

    // 检查取消
    if (isCancelled()) {
      return {
        success: false,
        error: '报告生成被用户取消',
      };
    }

    // 使用 FileStorageService 保存报告
    const fileService = getFileStorageService();
    let reportPath: string | undefined;

    if (state.projectPath) {
      // 保存到项目目录
      const saveResult = fileService.saveReport(state.projectPath, fullReport);
      if (saveResult.success && saveResult.filePath) {
        reportPath = saveResult.filePath;
      }
    }

    // 如果没有项目路径，使用旧路径作为回退
    if (!reportPath) {
      reportPath = `task-data/project-${projectId}/report.md`;
    }

    // 更新进度
    await updateProgress(projectId, {
      stage: 'reporting',
      step: '报告生成完成',
      totalItems: 4,
      completedItems: 4,
      currentItem: '完成',
    });

    return {
      success: true,
      report: fullReport,
      reportPath,
      metadata: {
        reportId: `report-${projectId}`,
        projectId,
        title,
        generatedAt: new Date().toISOString(),
        keywords,
        summary: generateSummary(fullReport),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '报告生成失败',
    };
  }
}

/**
 * 格式化数据源名称
 */
function formatSourceName(source: string): string {
  const names: Record<string, string> = {
    'rss-hackernews': 'Hacker News',
    'rss-techcrunch': 'TechCrunch',
    'rss-theverge': 'The Verge',
    'rss-wired': 'Wired',
    'rss-producthunt': 'Product Hunt',
    'duckduckgo': 'DuckDuckGo',
    'devto': 'Dev.to',
    'reddit': 'Reddit',
    'v2ex': 'V2EX',
  };
  return names[source] || source;
}

/**
 * 生成来源统计
 */
function sourceStats(
  results: Array<{ source: string }>,
  sources: string[]
): string {
  const counts = new Map<string, number>();

  for (const source of sources) {
    counts.set(source, results.filter((r) => r.source === source).length);
  }

  return sources
    .map((s) => `| ${formatSourceName(s)} | ${counts.get(s) || 0} |`)
    .join('\n');
}

/**
 * 渲染引用列表
 */
function renderCitations(citations: Citation[]): string {
  if (citations.length === 0) {
    return '暂无引用';
  }

  return citations
    .map((c, i) => `${i + 1}. [${c.title}](${c.url}) - 相关性: ${c.relevanceScore}`)
    .join('\n');
}

/**
 * 生成报告摘要
 */
function generateSummary(report: string): string {
  // 提取摘要章节
  const abstractMatch = report.match(/## 摘要\n\n([\s\S]*?)\n\n##/);
  if (abstractMatch) {
    let summary = abstractMatch[1].trim();
    // 截取前 200 字
    if (summary.length > 200) {
      summary = summary.slice(0, 200) + '...';
    }
    return summary;
  }
  return '暂无摘要';
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 生成报告摘要（供外部使用）
 */
function generateReportSummary(
  analysis: AnalysisResult
): string {
  const featureCount = analysis.features.length;
  const competitorCount = analysis.competitors.length;

  let summary = `本次调研识别出 ${featureCount} 个核心功能和 ${competitorCount} 个主要竞品。`;

  if (analysis.swot.strengths.length > 0) {
    summary += ` 主要优势包括：${analysis.swot.strengths.slice(0, 3).join('、')}。`;
  }

  if (analysis.confidenceScore > 0.7) {
    summary += ` 分析置信度较高（${(analysis.confidenceScore * 100).toFixed(0)}%）。`;
  }

  return summary;
}

/**
 * 计算功能覆盖率
 */
function calculateFeatureCoverage(
  features: AnalysisResult['features']
): Record<string, number> {
  const total = features.reduce((sum, f) => sum + f.count, 0);

  return features.reduce((acc, f) => {
    acc[f.name] = total > 0 ? Math.round((f.count / total) * 100) : 0;
    return acc;
  }, {} as Record<string, number>);
}

// ============================================================
// 导出
// ============================================================

export { executeReport, createReporterAgent, generateReportSummary, calculateFeatureCoverage };
