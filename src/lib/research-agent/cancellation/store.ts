/**
 * 取消状态存储 - 存根
 */

import type { CancellationState } from '../types';

/**
 * 内存存储（存根实现）
 */
const memoryStore = new Map<string, CancellationState>();

/**
 * 设置取消状态
 */
export function setCancellationState(state: CancellationState): void {
  memoryStore.set(state.projectId, state);
}

/**
 * 获取取消状态
 */
export function getCancellationState(projectId: string): CancellationState | undefined {
  return memoryStore.get(projectId);
}

/**
 * 删除取消状态
 */
export function deleteCancellationState(projectId: string): void {
  memoryStore.delete(projectId);
}

/**
 * 检查是否在取消中
 */
export function isCancelling(projectId: string): boolean {
  const state = memoryStore.get(projectId);
  return state?.status === 'pending' || state?.status === 'processing';
}

/**
 * 清除所有取消状态
 */
export function clearAll(): void {
  memoryStore.clear();
}
