/**
 * 检查点持久化模块
 *
 * 将检查点保存到数据库，实现跨进程/重启后的状态恢复
 */

import type { QualityCheckpoint } from '../types';
import { checkpointDb } from '@/lib/db';

/**
 * 检查点持久化输入
 */
export interface CheckpointPersistenceInput {
  projectId: string;
  checkpoint: QualityCheckpoint;
}

/**
 * 检查点持久化输出
 */
export interface CheckpointPersistenceOutput {
  success: boolean;
  checkpointId?: string;
  error?: string;
}

/**
 * 将检查点保存到数据库
 */
export async function saveCheckpointToDb(
  input: CheckpointPersistenceInput
): Promise<CheckpointPersistenceOutput> {
  const { projectId, checkpoint } = input;

  try {
    // 将检查点序列化为 JSON
    const stateSnapshotJson = JSON.stringify(checkpoint.stateSnapshot);
    const qualityMetricsJson = JSON.stringify(checkpoint.qualityMetrics);

    // 保存到数据库
    checkpointDb.saveCheckpoint.run({
      id: checkpoint.id,
      project_id: projectId,
      retry_count: checkpoint.retryCount,
      reason: checkpoint.reason || '',
      state_snapshot: stateSnapshotJson,
      quality_metrics: qualityMetricsJson,
      created_at: checkpoint.timestamp,
    });

    console.log(`[CheckpointPersistence] 保存检查点到数据库: ${checkpoint.id}`);

    return {
      success: true,
      checkpointId: checkpoint.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CheckpointPersistence] 保存检查点失败: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 从数据库加载检查点
 */
export async function loadCheckpointsFromDb(
  projectId: string
): Promise<QualityCheckpoint[]> {
  try {
    const rows = checkpointDb.getCheckpoints.all({ project_id: projectId }) as Array<{
      id: string;
      retry_count: number;
      reason: string;
      state_snapshot: string;
      quality_metrics: string;
      created_at: string;
    }>;

    if (!rows || rows.length === 0) {
      return [];
    }

    const checkpoints: QualityCheckpoint[] = rows.map(row => ({
      id: row.id,
      timestamp: row.created_at,
      stateSnapshot: JSON.parse(row.state_snapshot),
      qualityMetrics: JSON.parse(row.quality_metrics),
      retryCount: row.retry_count,
      reason: row.reason,
    }));

    // 按时间戳排序（最新的在前）
    checkpoints.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    console.log(`[CheckpointPersistence] 从数据库加载 ${checkpoints.length} 个检查点`);

    return checkpoints;
  } catch (error) {
    console.error(`[CheckpointPersistence] 加载检查点失败:`, error);
    return [];
  }
}

/**
 * 从数据库获取最新的检查点
 */
export async function getLatestCheckpointFromDb(
  projectId: string
): Promise<QualityCheckpoint | null> {
  const checkpoints = await loadCheckpointsFromDb(projectId);
  return checkpoints[0] || null;
}

/**
 * 删除项目的所有检查点
 */
export async function deleteCheckpointsFromDb(
  projectId: string
): Promise<boolean> {
  try {
    checkpointDb.deleteCheckpoints.run({ project_id: projectId });
    console.log(`[CheckpointPersistence] 删除项目检查点: ${projectId}`);
    return true;
  } catch (error) {
    console.error(`[CheckpointPersistence] 删除检查点失败:`, error);
    return false;
  }
}
