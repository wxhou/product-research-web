import { NextRequest, NextResponse } from 'next/server';
import { projectDb, searchResultDb, reportDb } from '@/lib/db';
import { getSearchServiceManager } from '@/lib/search';
import { analyzeSearchResults, generateFullReport, type AnalysisResult } from '@/lib/analysis';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
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

// POST /api/research
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, keywords } = body;

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

    // 更新项目状态为进行中
    projectDb.update.run({
      id: projectId,
      title: project.title,
      description: project.description,
      keywords: project.keywords,
      status: 'processing',
    });

    // 获取搜索服务管理器
    const searchManager = getSearchServiceManager();
    const enabledSources = searchManager.getEnabledSources();

    // 收集搜索结果
    const allResults: any[] = [];
    for (const source of enabledSources) {
      try {
        const results = await searchManager.search({
          query: project.title,
          source: source as any,
          limit: 8,
        });

        for (const result of results) {
          const searchId = generateId();
          searchResultDb.create.run({
            id: searchId,
            project_id: projectId,
            source,
            query: project.title,
            url: result.url,
            title: result.title,
            content: result.content,
            raw_data: JSON.stringify(result),
          });
          allResults.push({ ...result, source });
        }
      } catch (err) {
        console.error(`Error searching with ${source}:`, err);
      }
    }

    // 分析搜索结果
    const analysis: AnalysisResult = analyzeSearchResults(allResults, project.title);

    // 生成完整报告
    const reportContent = generateFullReport(project, allResults, analysis);
    const reportId = generateId();

    // 保存 Mermaid 图表
    const mermaidCharts = JSON.stringify(analysis.mermaidCharts);

    reportDb.create.run({
      id: reportId,
      project_id: projectId,
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
          features: analysis.features,
          competitors: analysis.competitors,
          swot: analysis.swot,
          marketData: analysis.marketData,
        },
      },
    });
  } catch (error) {
    console.error('Error during research:', error);
    return NextResponse.json(
      { success: false, error: 'Research failed' },
      { status: 500 }
    );
  }
}
