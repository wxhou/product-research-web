/**
 * 检查点管理器
 *
 * 负责状态的持久化和恢复
 */

import type { ResearchState } from '../state';
import type { BackupManifest, BackupConfig } from '../types';

// ============================================================
// 类型定义
// ============================================================

/**
 * 检查点记录
 */
export interface CheckpointRecord {
  id: string;
  projectId: string;
  state: ResearchState;
  timestamp: string;
  checksum: string;
  size: number;
}

/**
 * 检查点管理器接口
 */
export interface CheckpointManager {
  /** 创建检查点 */
  createCheckpoint(state: ResearchState): Promise<CheckpointRecord>;
  /** 恢复检查点 */
  restoreCheckpoint(checkpointId: string): Promise<ResearchState | null>;
  /** 获取最新检查点 */
  getLatestCheckpoint(projectId: string): Promise<CheckpointRecord | null>;
  /** 列出项目的所有检查点 */
  listCheckpoints(projectId: string): Promise<CheckpointRecord[]>;
  /** 删除检查点 */
  deleteCheckpoint(checkpointId: string): Promise<boolean>;
  /** 删除项目的所有检查点 */
  deleteAllCheckpoints(projectId: string): Promise<number>;
  /** 清理过期检查点 */
  cleanupExpired(maxAge: number): Promise<number>;
}

/**
 * 检查点配置
 */
export interface CheckpointConfig {
  /** 检查点存储目录 */
  checkpointDir: string;
  /** 最大检查点数量 */
  maxCheckpoints: number;
  /** 检查点最大保存时间（毫秒） */
  maxAge: number;
  /** 是否启用压缩 */
  enableCompression: boolean;
}

/**
 * 检查点元数据
 */
export interface CheckpointMetadata {
  id: string;
  projectId: string;
  timestamp: string;
  stateVersion: number;
  nodeId: string;
  checksum: string;
  size: number;
}

// ============================================================
// 默认配置
// ============================================================

const DEFAULT_CONFIG: CheckpointConfig = {
  checkpointDir: '.checkpoints',
  maxCheckpoints: 10,
  maxAge: 24 * 60 * 60 * 1000, // 24 小时
  enableCompression: true,
};

// ============================================================
// 内存存储实现（默认）
// ============================================================

/**
 * 内存检查点存储
 */
class MemoryCheckpointStore implements CheckpointManager {
  private checkpoints: Map<string, CheckpointRecord> = new Map();
  private projectCheckpoints: Map<string, Set<string>> = new Map();
  private config: CheckpointConfig;

  constructor(config?: Partial<CheckpointConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async createCheckpoint(state: ResearchState): Promise<CheckpointRecord> {
    const id = `checkpoint-${state.projectId}-${Date.now()}`;
    const checksum = await computeChecksum(JSON.stringify(state));

    const record: CheckpointRecord = {
      id,
      projectId: state.projectId,
      state: JSON.parse(JSON.stringify(state)), // 深拷贝
      timestamp: new Date().toISOString(),
      checksum,
      size: JSON.stringify(state).length,
    };

    // 存储检查点
    this.checkpoints.set(id, record);

    // 更新项目索引
    if (!this.projectCheckpoints.has(state.projectId)) {
      this.projectCheckpoints.set(state.projectId, new Set());
    }
    this.projectCheckpoints.get(state.projectId)!.add(id);

    // 限制检查点数量
    await this.enforceMaxCheckpoints(state.projectId);

    console.log(`[Checkpoint] Created checkpoint ${id} for project ${state.projectId}`);
    return record;
  }

  async restoreCheckpoint(checkpointId: string): Promise<ResearchState | null> {
    const record = this.checkpoints.get(checkpointId);
    if (!record) {
      console.warn(`[Checkpoint] Checkpoint ${checkpointId} not found`);
      return null;
    }

    // 验证校验和
    const expectedChecksum = await computeChecksum(JSON.stringify(record.state));
    if (record.checksum !== expectedChecksum) {
      console.error(`[Checkpoint] Checksum mismatch for ${checkpointId}`);
      return null;
    }

    console.log(`[Checkpoint] Restored checkpoint ${checkpointId}`);
    return JSON.parse(JSON.stringify(record.state));
  }

  async getLatestCheckpoint(projectId: string): Promise<CheckpointRecord | null> {
    const ids = this.projectCheckpoints.get(projectId);
    if (!ids || ids.size === 0) {
      return null;
    }

    // 按时间戳排序，取最新的
    const checkpoints = Array.from(ids)
      .map((id) => this.checkpoints.get(id)!)
      .filter(Boolean)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return checkpoints[0] || null;
  }

  async listCheckpoints(projectId: string): Promise<CheckpointRecord[]> {
    const ids = this.projectCheckpoints.get(projectId);
    if (!ids) {
      return [];
    }

    return Array.from(ids)
      .map((id) => this.checkpoints.get(id)!)
      .filter(Boolean)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async deleteCheckpoint(checkpointId: string): Promise<boolean> {
    const record = this.checkpoints.get(checkpointId);
    if (!record) {
      return false;
    }

    this.checkpoints.delete(checkpointId);
    this.projectCheckpoints.get(record.projectId)?.delete(checkpointId);

    console.log(`[Checkpoint] Deleted checkpoint ${checkpointId}`);
    return true;
  }

  async deleteAllCheckpoints(projectId: string): Promise<number> {
    const ids = this.projectCheckpoints.get(projectId);
    if (!ids) {
      return 0;
    }

    const count = ids.size;
    for (const id of ids) {
      this.checkpoints.delete(id);
    }
    ids.clear();

    console.log(`[Checkpoint] Deleted ${count} checkpoints for project ${projectId}`);
    return count;
  }

  async cleanupExpired(maxAge?: number): Promise<number> {
    const maxAgeMs = maxAge || this.config.maxAge;
    const cutoff = Date.now() - maxAgeMs;
    let deleted = 0;

    for (const [id, record] of this.checkpoints) {
      if (new Date(record.timestamp).getTime() < cutoff) {
        this.checkpoints.delete(id);
        this.projectCheckpoints.get(record.projectId)?.delete(id);
        deleted++;
      }
    }

    console.log(`[Checkpoint] Cleaned up ${deleted} expired checkpoints`);
    return deleted;
  }

  private async enforceMaxCheckpoints(projectId: string): Promise<void> {
    const ids = this.projectCheckpoints.get(projectId);
    if (!ids || ids.size <= this.config.maxCheckpoints) {
      return;
    }

    // 获取最旧的检查点并删除
    const checkpoints = Array.from(ids)
      .map((id) => this.checkpoints.get(id)!)
      .filter(Boolean)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const toDelete = checkpoints.slice(0, ids.size - this.config.maxCheckpoints);
    for (const record of toDelete) {
      this.checkpoints.delete(record.id);
      ids.delete(record.id);
    }
  }
}

// ============================================================
// 文件存储实现（可选）
// ============================================================

/**
 * 文件检查点存储
 */
class FileCheckpointStore implements CheckpointManager {
  private config: CheckpointConfig;
  private fs: typeof import('fs');
  private path: typeof import('path');

  constructor(config?: Partial<CheckpointConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.fs = require('fs');
    this.path = require('path');
  }

  private getCheckpointPath(projectId: string, checkpointId: string): string {
    return this.path.join(this.config.checkpointDir, projectId, `${checkpointId}.json`);
  }

  private getMetadataPath(projectId: string): string {
    return this.path.join(this.config.checkpointDir, projectId, 'metadata.json');
  }

  async createCheckpoint(state: ResearchState): Promise<CheckpointRecord> {
    // 确保目录存在
    const dir = this.path.join(this.config.checkpointDir, state.projectId);
    if (!this.fs.existsSync(dir)) {
      this.fs.mkdirSync(dir, { recursive: true });
    }

    const id = `checkpoint-${Date.now()}`;
    const checksum = await computeChecksum(JSON.stringify(state));

    const record: CheckpointRecord = {
      id,
      projectId: state.projectId,
      state,
      timestamp: new Date().toISOString(),
      checksum,
      size: JSON.stringify(state).length,
    };

    // 保存检查点文件
    const filePath = this.getCheckpointPath(state.projectId, id);
    this.fs.writeFileSync(filePath, JSON.stringify(record, null, 2));

    // 更新元数据
    await this.updateMetadata(state.projectId, record);

    console.log(`[Checkpoint] Created file checkpoint ${id}`);
    return record;
  }

  async restoreCheckpoint(checkpointId: string): Promise<ResearchState | null> {
    // 查找检查点文件
    const projects = this.fs.readdirSync(this.config.checkpointDir);
    let foundPath: string | null = null;

    for (const projectId of projects) {
      const path = this.getCheckpointPath(projectId, checkpointId);
      if (this.fs.existsSync(path)) {
        foundPath = path;
        break;
      }
    }

    if (!foundPath) {
      console.warn(`[Checkpoint] File checkpoint ${checkpointId} not found`);
      return null;
    }

    const content = this.fs.readFileSync(foundPath, 'utf-8');
    const record: CheckpointRecord = JSON.parse(content);

    // 验证校验和
    const expectedChecksum = await computeChecksum(JSON.stringify(record.state));
    if (record.checksum !== expectedChecksum) {
      console.error(`[Checkpoint] Checksum mismatch for ${checkpointId}`);
      return null;
    }

    return record.state;
  }

  async getLatestCheckpoint(projectId: string): Promise<CheckpointRecord | null> {
    const metadataPath = this.getMetadataPath(projectId);
    if (!this.fs.existsSync(metadataPath)) {
      return null;
    }

    const metadata: CheckpointMetadata[] = JSON.parse(this.fs.readFileSync(metadataPath, 'utf-8'));
    if (metadata.length === 0) {
      return null;
    }

    // 获取最新的检查点
    const latest = metadata.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];

    // 恢复状态并构建 CheckpointRecord
    const state = await this.restoreCheckpoint(latest.id);
    if (!state) {
      return null;
    }

    return {
      id: latest.id,
      projectId: latest.projectId,
      state,
      timestamp: latest.timestamp,
      checksum: latest.checksum,
      size: latest.size,
    };
  }

  async listCheckpoints(projectId: string): Promise<CheckpointRecord[]> {
    const metadataPath = this.getMetadataPath(projectId);
    if (!this.fs.existsSync(metadataPath)) {
      return [];
    }

    const metadata: CheckpointMetadata[] = JSON.parse(this.fs.readFileSync(metadataPath, 'utf-8'));
    const records: CheckpointRecord[] = [];

    for (const meta of metadata) {
      const record = await this.restoreCheckpoint(meta.id);
      if (record) {
        records.push({
          id: meta.id,
          projectId,
          state: record,
          timestamp: meta.timestamp,
          checksum: meta.checksum,
          size: meta.size,
        });
      }
    }

    return records;
  }

  async deleteCheckpoint(checkpointId: string): Promise<boolean> {
    const projects = this.fs.readdirSync(this.config.checkpointDir);
    let found = false;

    for (const projectId of projects) {
      const filePath = this.getCheckpointPath(projectId, checkpointId);
      if (this.fs.existsSync(filePath)) {
        this.fs.unlinkSync(filePath);
        found = true;

        // 更新元数据
        await this.updateMetadata(projectId, undefined, checkpointId);
        break;
      }
    }

    return found;
  }

  async deleteAllCheckpoints(projectId: string): Promise<number> {
    const dir = this.path.join(this.config.checkpointDir, projectId);
    if (!this.fs.existsSync(dir)) {
      return 0;
    }

    const files = this.fs.readdirSync(dir).filter((f) => f !== 'metadata.json');
    for (const file of files) {
      this.fs.unlinkSync(this.path.join(dir, file));
    }

    // 重置元数据
    const metadataPath = this.getMetadataPath(projectId);
    this.fs.writeFileSync(metadataPath, JSON.stringify([], null, 2));

    return files.length;
  }

  async cleanupExpired(maxAge?: number): Promise<number> {
    const maxAgeMs = maxAge || this.config.maxAge;
    const cutoff = Date.now() - maxAgeMs;
    let deleted = 0;

    const projects = this.fs.readdirSync(this.config.checkpointDir);
    for (const projectId of projects) {
      const metadataPath = this.getMetadataPath(projectId);
      if (!this.fs.existsSync(metadataPath)) continue;

      const metadata: CheckpointMetadata[] = JSON.parse(this.fs.readFileSync(metadataPath, 'utf-8'));
      const toDelete = metadata.filter(
        (m) => new Date(m.timestamp).getTime() < cutoff
      );

      for (const meta of toDelete) {
        const filePath = this.getCheckpointPath(projectId, meta.id);
        if (this.fs.existsSync(filePath)) {
          this.fs.unlinkSync(filePath);
          deleted++;
        }
      }

      // 更新元数据
      await this.updateMetadata(
        projectId,
        undefined,
        undefined,
        metadata.filter((m) => new Date(m.timestamp).getTime() >= cutoff)
      );
    }

    return deleted;
  }

  private async updateMetadata(
    projectId: string,
    record?: CheckpointRecord,
    deleteId?: string,
    replaceMetadata?: CheckpointMetadata[]
  ): Promise<void> {
    const metadataPath = this.getMetadataPath(projectId);
    let metadata: CheckpointMetadata[] = [];

    if (this.fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(this.fs.readFileSync(metadataPath, 'utf-8'));
      } catch {
        metadata = [];
      }
    }

    if (replaceMetadata) {
      metadata = replaceMetadata;
    } else if (deleteId) {
      metadata = metadata.filter((m) => m.id !== deleteId);
    } else if (record) {
      metadata.push({
        id: record.id,
        projectId: record.projectId,
        timestamp: record.timestamp,
        stateVersion: record.state.status === 'completed' ? 2 : 1,
        nodeId: record.state.currentStep,
        checksum: record.checksum,
        size: record.size,
      });
    }

    this.fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  }
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 计算校验和
 */
async function computeChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 简单校验和（同步版本）
 */
function simpleChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// ============================================================
// 工厂函数
// ============================================================

/**
 * 创建检查点管理器
 */
export function createCheckpointManager(config?: {
  storage?: 'memory' | 'file';
  checkpointDir?: string;
  maxCheckpoints?: number;
  maxAge?: number;
}): CheckpointManager {
  const storage = config?.storage || 'memory';

  if (storage === 'file') {
    return new FileCheckpointStore(config);
  }

  return new MemoryCheckpointStore(config);
}

// ============================================================
// 导出已在上方通过 `export function` / `export class` / `export const` 完成
// ============================================================
