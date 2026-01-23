import { NextRequest, NextResponse } from 'next/server';
import { projectDb, reportDb, searchResultDb } from '@/lib/db';

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

// GET /api/projects/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = projectDb.getById.get({ id }) as Project | undefined;

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // 获取关联的搜索结果和报告
    const searchResults = searchResultDb.getByProject.all({ project_id: id }) as SearchResult[];
    const report = reportDb.getByProject.get({ project_id: id }) as Report | undefined;

    return NextResponse.json({
      success: true,
      data: {
        ...project,
        keywords: JSON.parse(project.keywords || '[]'),
        searchResults,
        report,
      },
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, keywords, status } = body;

    const existing = projectDb.getById.get({ id }) as Project | undefined;
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    projectDb.update.run({
      id,
      title: title || existing.title,
      description: description || existing.description || '',
      keywords: keywords ? JSON.stringify(keywords) : existing.keywords,
      status: status || existing.status,
    });

    const updated = projectDb.getById.get({ id }) as Project | undefined;

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = projectDb.getById.get({ id }) as Project | undefined;
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // 删除关联数据（通过级联删除）
    projectDb.delete.run({ id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
