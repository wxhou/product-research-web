import { NextRequest, NextResponse } from 'next/server';
import { projectDb, reportDb, searchResultDb } from '@/lib/db';

interface Report {
  id: string;
  project_id: string;
  title: string;
  content: string;
  mermaid_charts: string;
  version: number;
  created_at: string;
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

interface SearchResult {
  id: string;
  project_id: string;
  source: string;
  query: string;
  url: string;
  title: string;
  content: string;
  raw_data: string;
  created_at: string;
}

// GET /api/reports/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params;

    // 获取报告
    const report = reportDb.getById.get({ id: reportId }) as Report | undefined;
    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    // 获取关联的项目
    const project = projectDb.getById.get({ id: report.project_id }) as Project | undefined;

    // 获取搜索结果数量
    const searchResults = searchResultDb.getByProject.all({ project_id: report.project_id }) as SearchResult[];

    return NextResponse.json({
      success: true,
      data: {
        report,
        project,
        searchResultCount: searchResults.length,
      },
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}
