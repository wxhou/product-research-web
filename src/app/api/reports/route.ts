import { NextRequest, NextResponse } from 'next/server';
import db, { reportDb, projectDb, searchResultDb } from '@/lib/db';

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
}

// GET /api/reports
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
      // single report (previously at /api/reports/[id])
      const report = reportDb.getById.get({ id }) as Report | undefined;
      if (!report) {
        return NextResponse.json(
          { success: false, error: 'Report not found' },
          { status: 404 }
        );
      }

      const project = projectDb.getById.get({ id: report.project_id }) as Project | undefined;
      const searchResults = searchResultDb.getByProject.all({ project_id: report.project_id }) as Array<any>;

      return NextResponse.json({
        success: true,
        data: {
          report,
          project,
          searchResultCount: searchResults.length,
        },
      });
    }

    // collection: 使用 JOIN 查询一次性获取所有报告和项目信息，避免 N+1 查询
    const reportsWithProject = db.prepare(`
      SELECT
        r.id,
        r.project_id,
        r.title,
        r.content,
        r.mermaid_charts,
        r.version,
        r.created_at,
        p.title as project_title
      FROM reports r
      LEFT JOIN projects p ON r.project_id = p.id
      ORDER BY r.created_at DESC
    `).all() as Array<Report & { project_title: string | null }>;

    const result = reportsWithProject.map(report => ({
      ...report,
      project: report.project_title ? { id: report.project_id, title: report.project_title } : null,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
