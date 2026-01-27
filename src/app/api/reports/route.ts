import { NextRequest, NextResponse } from 'next/server';
import db, { reportDb, projectDb, searchResultDb, settingsDb } from '@/lib/db';

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

// GET /api/reports
export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    // 未登录用户无法获取数据
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (id) {
      // single report
      const report = reportDb.getById.get({ id }) as Report | undefined;
      if (!report) {
        return NextResponse.json(
          { success: false, error: 'Report not found' },
          { status: 404 }
        );
      }

      // 获取关联项目
      const project = projectDb.getById.get({ id: report.project_id }) as Project | undefined;

      // 检查权限：普通用户只能看自己项目的报告
      if (user.role !== 'admin' && project) {
        const projectWithUser = projectDb.getById.get({ id: report.project_id }) as { user_id: string } | undefined;
        if (projectWithUser?.user_id !== user.id) {
          return NextResponse.json(
            { success: false, error: 'Permission denied' },
            { status: 403 }
          );
        }
      }

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

    // 获取报告列表，管理员看所有，普通用户只看自己的
    let reportsWithProject: Array<Report & { project_title: string | null; user_id: string | null }>;

    if (user.role === 'admin') {
      reportsWithProject = db.prepare(`
        SELECT
          r.id,
          r.project_id,
          r.title,
          r.content,
          r.mermaid_charts,
          r.version,
          r.created_at,
          p.title as project_title,
          p.user_id
        FROM reports r
        LEFT JOIN projects p ON r.project_id = p.id
        ORDER BY r.created_at DESC
      `).all() as Array<Report & { project_title: string | null; user_id: string | null }>;
    } else {
      reportsWithProject = db.prepare(`
        SELECT
          r.id,
          r.project_id,
          r.title,
          r.content,
          r.mermaid_charts,
          r.version,
          r.created_at,
          p.title as project_title,
          p.user_id
        FROM reports r
        LEFT JOIN projects p ON r.project_id = p.id
        WHERE p.user_id = ?
        ORDER BY r.created_at DESC
      `).all(user.id) as Array<Report & { project_title: string | null; user_id: string | null }>;
    }

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
