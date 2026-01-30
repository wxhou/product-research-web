import { NextRequest, NextResponse } from 'next/server';
import { projectDb, taskDb, settingsDb } from '@/lib/db';
import { requestCancellation, getCancellationStatus } from '@/lib/research-agent/cancellation/handler';

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

interface Project {
  id: string;
  user_id: string;
  title: string;
  status: string;
  progress: number;
}

// POST /api/research/cancel - 取消调研任务
export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request);

    // 未登录用户无法取消任务
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId } = body;

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

    // 检查权限：普通用户只能操作自己的项目
    if (user.role !== 'admin' && project.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    // 检查项目状态
    if (project.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Research already completed, cannot cancel' },
        { status: 400 }
      );
    }

    if (project.status === 'draft') {
      return NextResponse.json(
        { success: false, error: 'Research not started, no need to cancel' },
        { status: 400 }
      );
    }

    // 取消项目关联的任务
    const task = taskDb.getByProject.get({ project_id: projectId }) as { id: string; status: string } | undefined;
    if (task && task.status !== 'completed' && task.status !== 'failed') {
      // 标记任务为失败
      taskDb.markFailed.run({ id: task.id, error: 'User cancelled' });
    }

    // 使用新的取消机制
    const cancelled = await requestCancellation(projectId, user.id);

    if (!cancelled) {
      return NextResponse.json(
        { success: false, error: 'Failed to initiate cancellation' },
        { status: 500 }
      );
    }

    // 更新项目状态
    projectDb.updateStatus.run({ id: projectId, status: 'failed' });
    projectDb.updateProgress.run({
      id: projectId,
      progress: project.progress,
      progress_message: '任务已取消',
    });

    // 获取取消状态
    const cancellationStatus = getCancellationStatus(projectId);

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        status: 'cancelled',
        cancellationStatus: {
          requestedAt: cancellationStatus?.requestedAt,
          status: cancellationStatus?.status,
          forced: cancellationStatus?.forced,
        },
        message: 'Research task has been cancelled',
      },
    });
  } catch (error) {
    console.error('Error cancelling research task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel research task: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

// GET /api/research/cancel - 查询取消状态
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json(
      { success: false, error: 'Project ID is required' },
      { status: 400 }
    );
  }

  const cancellationStatus = getCancellationStatus(projectId);

  if (!cancellationStatus) {
    return NextResponse.json({
      success: true,
      data: {
        projectId,
        isCancelled: false,
        message: 'No cancellation request found for this project',
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      projectId,
      isCancelled: true,
      cancellationStatus: {
        requestedAt: cancellationStatus.requestedAt,
        requestedBy: cancellationStatus.requestedBy,
        status: cancellationStatus.status,
        forced: cancellationStatus.forced,
      },
    },
  });
}
