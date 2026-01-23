import { NextRequest, NextResponse } from 'next/server';
import { projectDb } from '@/lib/db';

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
export async function GET() {
  try {
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
    const { title, description, keywords } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    const id = generateId();
    projectDb.create.run({
      id,
      title,
      description: description || '',
      keywords: keywords ? JSON.stringify(keywords) : '[]',
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
