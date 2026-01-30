/**
 * 备份管理器
 *
 * 提供状态备份和恢复功能，支持：
 * - 定时自动备份（30秒间隔）
 * - 检查点备份
 * - 手动备份
 * - SHA-256 完整性校验
 * - 备份轮转（最多5个）
 */

import * as crypto from 'crypto';
import type { BackupConfig, BackupManifest } from '../types';
import type { ResearchState } from '../state';
import { MarkdownStateManager } from '../graph/markdown-state';

// ============================================================
// 类型定义
// ============================================================

/**
 * 备份管理器接口
 */
export interface BackupManager {
  /** 创建备份 */
  createBackup(projectId: string): Promise<BackupManifest | null>;
  /** 恢复备份 */
  restoreBackup(backupId: string): Promise<ResearchState | null>;
  /** 列出项目所有备份 */
  listBackups(projectId: string): BackupManifest[];
  /** 删除备份 */
  deleteBackup(backupId: string): boolean;
  /** 获取备份目录 */
  getBackupDir(): string;
}

// ============================================================
// 常量配置
// ============================================================

/**
 * 默认备份配置
 */
export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  trigger: 'interval',
  intervalMs: 30000, // 30 秒
  checkpointBackup: true,
  maxBackups: 5,
  backupDir: 'task-backups',
};

/**
 * SHA-256 哈希长度
 */
const CHECKSUM_LENGTH = 64;

// ============================================================
// 备份管理器实现
// ============================================================

/**
 * 创建备份管理器
 */
export function createBackupManager(config: BackupConfig): BackupManager {
  const backupDir = config.backupDir || DEFAULT_BACKUP_CONFIG.backupDir;
  const maxBackups = config.maxBackups || DEFAULT_BACKUP_CONFIG.maxBackups;

  return {
    async createBackup(projectId: string): Promise<BackupManifest | null> {
      try {
        // 读取当前状态
        const stateManager = new MarkdownStateManager({ stateDir: 'task-data' });
        const state = await stateManager.readState(projectId);

        if (!state) {
          console.warn(`[Backup] No state found for project: ${projectId}`);
          return null;
        }

        // 创建备份
        const manifest = await createBackupWithState(projectId, state, backupDir, maxBackups);
        return manifest;
      } catch (error) {
        console.error(`[Backup] Failed to create backup: ${error}`);
        return null;
      }
    },

    async restoreBackup(backupId: string): Promise<ResearchState | null> {
      try {
        const backupPath = getBackupPath(backupId, backupDir);
        const content = await loadBackupFile(backupPath);

        if (!content) {
          return null;
        }

        // 验证校验和
        const storedChecksum = content.slice(0, CHECKSUM_LENGTH);
        const data = content.slice(CHECKSUM_LENGTH);

        if (!verifyChecksum(data, storedChecksum)) {
          console.error(`[Backup] Checksum verification failed for: ${backupId}`);
          return null;
        }

        // 解析状态
        const state = parseStateFromBackup(data);
        return state;
      } catch (error) {
        console.error(`[Backup] Failed to restore backup: ${error}`);
        return null;
      }
    },

    listBackups(projectId: string): BackupManifest[] {
      return listProjectBackups(projectId, backupDir);
    },

    deleteBackup(backupId: string): boolean {
      return deleteBackupFile(backupId, backupDir);
    },

    getBackupDir(): string {
      return backupDir;
    },
  };
}

/**
 * 创建备份（内部函数）
 */
async function createBackupWithState(
  projectId: string,
  state: ResearchState,
  backupDir: string,
  maxBackups: number
): Promise<BackupManifest> {
  // 序列化状态
  const stateData = serializeState(state);
  const data = JSON.stringify(stateData, null, 2);

  // 生成校验和
  const checksum = computeSHA256(data);

  // 构建备份内容
  const backupContent = checksum + data;

  // 生成备份 ID
  const backupId = generateBackupId(projectId);

  // 保存备份文件
  const backupPath = getBackupPath(backupId, backupDir);
  await saveBackupFile(backupPath, backupContent);

  // 获取文件大小
  const size = Buffer.byteLength(backupContent, 'utf8');

  // 创建清单
  const manifest: BackupManifest = {
    backupId,
    projectId,
    createdAt: new Date().toISOString(),
    stateSnapshot: stateData.status as string,
    checksum,
    size,
  };

  // 执行备份轮转
  await rotateBackups(projectId, backupDir, maxBackups);

  console.log(`[Backup] Created backup: ${backupId}`);
  return manifest;
}

// ============================================================
// 便捷函数
// ============================================================

/**
 * 创建备份
 */
export async function createBackup(
  projectId: string,
  state: ResearchState
): Promise<BackupManifest | null> {
  const config = DEFAULT_BACKUP_CONFIG;
  const manager = createBackupManager(config);
  return manager.createBackup(projectId);
}

/**
 * 恢复备份
 */
export async function restoreFromBackup(backupId: string): Promise<ResearchState | null> {
  const config = DEFAULT_BACKUP_CONFIG;
  const manager = createBackupManager(config);
  return manager.restoreBackup(backupId);
}

/**
 * 列出备份
 */
export function listBackups(projectId: string): BackupManifest[] {
  const config = DEFAULT_BACKUP_CONFIG;
  const manager = createBackupManager(config);
  return manager.listBackups(projectId);
}

/**
 * 删除备份
 */
export function deleteBackup(backupId: string): boolean {
  const config = DEFAULT_BACKUP_CONFIG;
  const manager = createBackupManager(config);
  return manager.deleteBackup(backupId);
}

// ============================================================
// SHA-256 校验和
// ============================================================

/**
 * 计算 SHA-256 校验和
 */
export function computeSHA256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * 验证校验和
 */
export function verifyChecksum(data: string, expectedChecksum: string): boolean {
  const actualChecksum = computeSHA256(data);
  return crypto.timingSafeEqual(
    Buffer.from(actualChecksum, 'hex'),
    Buffer.from(expectedChecksum, 'hex')
  );
}

/**
 * 简单校验和（向后兼容）
 */
export function computeChecksum(data: string): string {
  return computeSHA256(data);
}

// ============================================================
// 文件操作
// ============================================================

/**
 * 生成备份 ID
 */
function generateBackupId(projectId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${projectId}_${timestamp}_${random}`;
}

/**
 * 获取备份文件路径
 */
function getBackupPath(backupId: string, backupDir: string): string {
  return `${backupDir}/${backupId}.backup`;
}

/**
 * 保存备份文件
 */
async function saveBackupFile(path: string, content: string): Promise<void> {
  const fs = await import('fs/promises');
  await fs.mkdir(require('path').dirname(path), { recursive: true });
  await fs.writeFile(path, content, 'utf8');
}

/**
 * 加载备份文件
 */
async function loadBackupFile(path: string): Promise<string | null> {
  const fs = await import('fs/promises');
  try {
    const content = await fs.readFile(path, 'utf8');
    return content;
  } catch {
    return null;
  }
}

/**
 * 删除备份文件
 */
function deleteBackupFile(backupId: string, backupDir: string): boolean {
  const path = getBackupPath(backupId, backupDir);
  try {
    const fs = require('fs/promises');
    fs.unlink(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 列出项目的所有备份
 */
function listProjectBackups(projectId: string, backupDir: string): BackupManifest[] {
  const fs = require('fs');
  try {
    const files = fs.readdirSync(backupDir);
    const backups: BackupManifest[] = [];

    for (const file of files) {
      if (!file.endsWith('.backup') || !file.startsWith(projectId)) {
        continue;
      }

      const backupId = file.replace('.backup', '');
      const path = `${backupDir}/${file}`;
      const content = fs.readFileSync(path, 'utf8');

      // 解析清单
      const manifest = parseManifestFromBackup(content, backupId);
      if (manifest) {
        backups.push(manifest);
      }
    }

    // 按时间排序
    return backups.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

/**
 * 备份轮转
 */
async function rotateBackups(
  projectId: string,
  backupDir: string,
  maxBackups: number
): Promise<void> {
  const backups = listProjectBackups(projectId, backupDir);

  if (backups.length <= maxBackups) {
    return;
  }

  // 删除最旧的备份
  const toDelete = backups.slice(maxBackups);
  for (const backup of toDelete) {
    deleteBackupFile(backup.backupId, backupDir);
    console.log(`[Backup] Rotated out old backup: ${backup.backupId}`);
  }
}

// ============================================================
// 状态序列化
// ============================================================

/**
 * 序列化状态
 */
function serializeState(state: ResearchState): Record<string, unknown> {
  return {
    projectId: state.projectId,
    title: state.title,
    description: state.description,
    status: state.status,
    currentStep: state.currentStep,
    progress: state.progress,
    progressMessage: state.progressMessage,
    keywords: state.keywords,
    iterationsUsed: state.iterationsUsed,
    totalSearches: state.totalSearches,
    totalResults: state.totalResults,
    retryCount: state.retryCount,
    startedAt: state.startedAt,
    updatedAt: state.updatedAt,
    completedAt: state.completedAt,
  };
}

/**
 * 从备份解析状态
 */
function parseStateFromBackup(data: string): ResearchState {
  return JSON.parse(data) as ResearchState;
}

/**
 * 从备份内容解析清单
 */
function parseManifestFromBackup(content: string, backupId: string): BackupManifest | null {
  try {
    const checksum = content.slice(0, CHECKSUM_LENGTH);
    const data = content.slice(CHECKSUM_LENGTH);
    const state = JSON.parse(data) as ResearchState;

    return {
      backupId,
      projectId: state.projectId,
      createdAt: (() => {
        try {
          const timestamp = parseInt(backupId.split('_')[1], 36);
          return isNaN(timestamp) ? new Date().toISOString() : new Date(timestamp).toISOString();
        } catch {
          return new Date().toISOString();
        }
      })(),
      stateSnapshot: state.status,
      checksum,
      size: Buffer.byteLength(content, 'utf8'),
    };
  } catch {
    return null;
  }
}
