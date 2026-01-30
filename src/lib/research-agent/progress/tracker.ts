/**
 * 进度追踪器
 *
 * 追踪和更新研究任务的进度
 */

import type { ProgressDetail } from '../types';
import type { ResearchState } from '../state';
import { projectDb } from '@/lib/db';
import { MarkdownStateManager } from '../graph/markdown-state';
import {
  calculateOverallProgress,
  generateProgressDetail,
  STAGE_PROGRESS_CONFIG,
  DEFAULT_QUALITY_THRESHOLDS,
  type ProgressQualityThresholds,
} from './calculator';

// ============================================================
// 内存存储（单例模式）
// ============================================================

/**
 * 内存进度存储
 */
const progressStore: Map<string, ProgressDetail> = new Map();

/**
 * 进度回调函数类型
 */
export type ProgressCallback = (projectId: string, detail: ProgressDetail) => void;

/**
 * 进度回调列表
 */
const progressCallbacks: Map<string, Set<ProgressCallback>> = new Map();

// ============================================================
// 进度更新
// ============================================================

/**
 * 更新进度
 *
 * @param projectId 项目 ID
 * @param update 进度更新参数
 */
export async function updateProgress(
  projectId: string,
  update: Partial<ProgressDetail>
): Promise<void> {
  // 获取当前进度
  const current = progressStore.get(projectId) || {
    stage: 'pending',
    step: '等待开始',
    totalItems: 1,
    completedItems: 0,
    currentItem: '',
    percentage: 0,
  };

  // 合并更新
  const updated: ProgressDetail = {
    stage: update.stage || current.stage,
    step: update.step || current.step,
    totalItems: update.totalItems || current.totalItems,
    completedItems: update.completedItems || current.completedItems,
    currentItem: update.currentItem || current.currentItem,
    percentage: update.percentage ?? Math.round((update.completedItems ?? current.completedItems) / (update.totalItems ?? current.totalItems) * 100),
  };

  // 保存到内存存储
  progressStore.set(projectId, updated);

  // 同步到数据库
  await syncToDatabase(projectId, updated);

  // 同步到 Markdown 状态文件
  await syncToStateFile(projectId, updated);

  // 通知回调
  notifyCallbacks(projectId, updated);

  // 记录日志
  console.log(`[Progress] ${projectId}: ${updated.stage} - ${updated.step} (${updated.completedItems}/${updated.totalItems}) ${updated.percentage}%`);
}

/**
 * 从 ResearchState 更新进度
 */
export async function updateProgressFromState(state: ResearchState): Promise<void> {
  const progress = calculateOverallProgress(state);
  const detail = generateProgressDetail(state);

  await updateProgress(state.projectId, {
    ...detail,
    percentage: progress,
  });
}

/**
 * 同步进度到状态文件
 */
async function syncToStateFile(projectId: string, detail: ProgressDetail): Promise<void> {
  try {
    const stateManager = new MarkdownStateManager({
      stateDir: 'task-data',
    });

    const state = await stateManager.readState(projectId);
    if (state) {
      const updatedState: ResearchState = {
        ...state,
        progress: detail.percentage,
        progressMessage: `${detail.step}: ${detail.currentItem}`,
        progressDetail: detail,
        updatedAt: new Date().toISOString(),
      };
      await stateManager.writeState(updatedState);
    }
  } catch (error) {
    console.warn(`[Progress] Failed to sync to state file: ${error}`);
  }
}

/**
 * 同步进度到数据库
 */
async function syncToDatabase(projectId: string, detail: ProgressDetail): Promise<void> {
  try {
    projectDb.updateProgress.run({
      id: projectId,
      progress: detail.percentage,
      progress_message: `${detail.step}: ${detail.currentItem}`,
    });
  } catch (error) {
    console.warn(`[Progress] Failed to sync to database: ${error}`);
  }
}

// ============================================================
// 进度查询
// ============================================================

/**
 * 获取进度状态
 */
export async function getProgress(projectId: string): Promise<ProgressDetail | null> {
  // 先从内存存储获取
  const memoryProgress = progressStore.get(projectId);
  if (memoryProgress) {
    return memoryProgress;
  }

  // 如果内存中没有，尝试从状态文件获取
  try {
    const stateManager = new MarkdownStateManager({
      stateDir: 'task-data',
    });

    const state = await stateManager.readState(projectId);
    if (state && state.progressDetail) {
      return state.progressDetail;
    }

    if (state) {
      // 从状态构造进度详情
      return generateProgressDetail(state);
    }
  } catch {
    // 忽略错误
  }

  return null;
}

/**
 * 计算进度百分比
 */
export function calculatePercentage(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * 获取所有进度状态
 */
export function getAllProgress(): Map<string, ProgressDetail> {
  return new Map(progressStore);
}

// ============================================================
// 进度回调
// ============================================================

/**
 * 订阅进度更新
 */
export function subscribeProgress(
  projectId: string,
  callback: ProgressCallback
): () => void {
  if (!progressCallbacks.has(projectId)) {
    progressCallbacks.set(projectId, new Set());
  }
  progressCallbacks.get(projectId)!.add(callback);

  // 返回取消订阅函数
  return () => {
    progressCallbacks.get(projectId)?.delete(callback);
  };
}

/**
 * 通知所有回调
 */
function notifyCallbacks(projectId: string, detail: ProgressDetail): void {
  const callbacks = progressCallbacks.get(projectId);
  if (callbacks) {
    for (const callback of callbacks) {
      try {
        callback(projectId, detail);
      } catch (error) {
        console.error(`[Progress] Callback error: ${error}`);
      }
    }
  }
}

// ============================================================
// 清理
// ============================================================

/**
 * 清除进度记录
 */
export function clearProgress(projectId: string): void {
  progressStore.delete(projectId);
  progressCallbacks.delete(projectId);
}

/**
 * 清除所有进度记录
 */
export function clearAllProgress(): void {
  progressStore.clear();
  progressCallbacks.clear();
}
