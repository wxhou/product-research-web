/**
 * 取消处理逻辑
 *
 * 提供任务取消功能，包括超时控制和状态管理
 */

import type { CancellationState } from '../types';
import { ResearchState } from '../state';
import { MarkdownStateManager } from '../graph/markdown-state';
import { getCancellationState, setCancellationState, isCancelling } from './store';

// ============================================================
// 内存存储
// ============================================================

const cancellationRequests: Map<string, CancellationState> = new Map();

/**
 * 超时配置（毫秒）
 */
const CANCELLATION_TIMEOUT = 30000; // 30 seconds

/**
 * 轮询间隔（毫秒）
 */
const POLL_INTERVAL = 1000; // 1 second

// ============================================================
// 取消请求
// ============================================================

/**
 * 请求取消任务
 *
 * @param projectId 项目 ID
 * @param requestedBy 请求用户
 * @returns 是否成功创建取消请求
 */
export async function requestCancellation(
  projectId: string,
  requestedBy: string
): Promise<boolean> {
  console.log(`[Cancellation] 收到取消请求: ${projectId} by ${requestedBy}`);

  // 创建取消状态
  const cancellationState: CancellationState = {
    projectId,
    requestedAt: new Date().toISOString(),
    requestedBy,
    status: 'pending',
    forced: false,
  };

  // 保存到内存存储
  cancellationRequests.set(projectId, cancellationState);
  setCancellationState(cancellationState);

  // 异步处理取消（设置超时）
  void handleCancellationAsync(projectId);

  return true;
}

/**
 * 异步处理取消（带超时）
 */
async function handleCancellationAsync(projectId: string): Promise<void> {
  const startTime = Date.now();

  // 轮询检查直到任务被标记为取消或超时
  while (Date.now() - startTime < CANCELLATION_TIMEOUT) {
    const state = cancellationRequests.get(projectId);

    // 如果已经完成或失败，停止处理
    if (state?.status === 'completed' || state?.status === 'timeout') {
      return;
    }

    // 检查任务状态
    try {
      const stateManager = new MarkdownStateManager({ stateDir: 'task-data' });
      const taskState = await stateManager.readState(projectId);

      if (!taskState) {
        // 任务不存在，标记为完成
        updateCancellationStatus(projectId, 'completed');
        return;
      }

      if (taskState.status === 'cancelled' || taskState.status === 'failed') {
        // 任务已经被取消
        updateCancellationStatus(projectId, 'completed');
        return;
      }

      // 任务仍在运行，尝试友好取消
      if (state?.status === 'pending') {
        // 尝试友好取消
        const cancelled = await performGracefulCancellation(projectId);
        if (cancelled) {
          updateCancellationStatus(projectId, 'completed');
          return;
        }
        // 标记为处理中
        updateCancellationStatus(projectId, 'processing');
      }
    } catch {
      // 忽略错误，继续轮询
    }

    // 等待轮询间隔
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }

  // 超时，强制取消
  console.log(`[Cancellation] 取消超时，强制终止: ${projectId}`);
  await performForcedCancellation(projectId);
  updateCancellationStatus(projectId, 'timeout');
}

/**
 * 执行友好取消
 */
async function performGracefulCancellation(projectId: string): Promise<boolean> {
  try {
    const stateManager = new MarkdownStateManager({ stateDir: 'task-data' });
    const state = await stateManager.readState(projectId);

    if (!state) return true;

    // 如果任务已完成，不需要取消
    if (state.status === 'completed') {
      return true;
    }

    // 标记任务为已取消
    const cancelledState: ResearchState = {
      ...state,
      status: 'cancelled',
      progress: state.progress,
      progressMessage: '任务已取消',
      updatedAt: new Date().toISOString(),
    };

    await stateManager.writeState(cancelledState);
    console.log(`[Cancellation] 任务已友好取消: ${projectId}`);
    return true;
  } catch (error) {
    console.error(`[Cancellation] 友好取消失败: ${error}`);
    return false;
  }
}

/**
 * 执行强制取消
 */
async function performForcedCancellation(projectId: string): Promise<void> {
  try {
    const stateManager = new MarkdownStateManager({ stateDir: 'task-data' });
    const state = await stateManager.readState(projectId);

    if (!state) return;

    // 标记任务为失败
    const failedState: ResearchState = {
      ...state,
      status: 'failed',
      progress: state.progress,
      progressMessage: '任务已强制终止（超时）',
      updatedAt: new Date().toISOString(),
    };

    await stateManager.writeState(failedState);
    console.log(`[Cancellation] 任务已强制终止: ${projectId}`);
  } catch (error) {
    console.error(`[Cancellation] 强制取消失败: ${error}`);
  }
}

/**
 * 更新取消状态
 */
function updateCancellationStatus(projectId: string, status: CancellationState['status']): void {
  const state = cancellationRequests.get(projectId);
  if (state) {
    state.status = status;
    cancellationRequests.set(projectId, state);
    setCancellationState(state);
  }
}

// ============================================================
// 取消检查
// ============================================================

/**
 * 创建取消检查函数
 *
 * @param projectId 项目 ID
 * @returns 检查函数，调用返回是否应该取消
 */
export function createCancelCheck(projectId: string): () => boolean {
  return () => isCancelled(projectId);
}

/**
 * 检查任务是否已取消
 */
export function isCancelled(projectId: string): boolean {
  const state = cancellationRequests.get(projectId);
  return state?.status === 'completed' || isCancelling(projectId);
}

/**
 * 检查是否正在取消过程中
 */
export function checkCancellation(projectId: string): boolean {
  return isCancelled(projectId);
}

// ============================================================
// 状态查询
// ============================================================

/**
 * 获取取消状态
 */
export function getCancellationStatus(projectId: string): CancellationState | undefined {
  return cancellationRequests.get(projectId);
}

/**
 * 清除取消状态
 */
export function clearCancellation(projectId: string): void {
  cancellationRequests.delete(projectId);
}

/**
 * 清除所有取消状态
 */
export function clearAllCancellations(): void {
  cancellationRequests.clear();
}

// ============================================================
// 超时检查
// ============================================================

/**
 * 获取取消超时时间
 */
export function getCancellationTimeout(): number {
  return CANCELLATION_TIMEOUT;
}

/**
 * 检查任务是否可能已超时
 */
export function checkTimeout(projectId: string): boolean {
  const state = cancellationRequests.get(projectId);
  if (!state) return false;

  const elapsed = Date.now() - new Date(state.requestedAt).getTime();
  return elapsed >= CANCELLATION_TIMEOUT;
}
