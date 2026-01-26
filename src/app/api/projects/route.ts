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

// GET /api/projects - 获取所有项目
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
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
    }

    const projects = projectDb.getAll.all() as Project[];
    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - 创建新项目
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { title, description, keywords } = body;

    // 输入验证
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Title is required and must be a string' },
        { status: 400 }
      );
    }

    // 限制 title 长度
    title = title.trim().slice(0, 500);
    if (title.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Title must be at least 2 characters' },
        { status: 400 }
      );
    }

    // 验证 description
    if (description && typeof description !== 'string') {
      description = '';
    } else {
      description = (description || '').trim().slice(0, 2000);
    }

    // 验证 keywords
    if (keywords) {
      if (!Array.isArray(keywords)) {
        keywords = [];
      } else {
        keywords = keywords.filter(k => typeof k === 'string').slice(0, 20);
      }
    } else {
      keywords = [];
    }

    const id = generateId();
    projectDb.create.run({
      id,
      title,
      description,
      keywords: JSON.stringify(keywords),
      status: 'draft',
    });

    const project = projectDb.getById.get({ id }) as Project | undefined;

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

// PUT /api/projects?id=...  更新项目（原来在 /api/projects/[id]）
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    }

    const body = await request.json();
    let { title, description, keywords, status } = body;

    const existing = projectDb.getById.get({ id }) as Project | undefined;
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // 验证并清理 title
    if (title !== undefined) {
      if (typeof title !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Title must be a string' },
          { status: 400 }
        );
      }
      title = title.trim().slice(0, 500);
      if (title.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Title must be at least 2 characters' },
          { status: 400 }
        );
      }
    }

    // 验证并清理 description
    if (description !== undefined) {
      if (description && typeof description !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Description must be a string' },
          { status: 400 }
        );
      }
      description = (description || '').trim().slice(0, 2000);
    }

    // 验证 status
    const validStatuses = ['draft', 'processing', 'completed'];
    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be one of: draft, processing, completed' },
        { status: 400 }
      );
    }

    // 验证并清理 keywords
    if (keywords !== undefined) {
      if (!Array.isArray(keywords)) {
        return NextResponse.json(
          { success: false, error: 'Keywords must be an array' },
          { status: 400 }
        );
      }
      keywords = keywords.filter(k => typeof k === 'string').slice(0, 20);
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

// DELETE /api/projects?id=...
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    }

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
