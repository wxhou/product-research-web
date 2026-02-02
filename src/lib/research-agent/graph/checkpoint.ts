/**
 * 检查点管理器
 *
 * 负责状态的持久化和恢复
 *
 * 支持两种模式：
 * 1. CheckpointManager - 传统检查点管理（按项目组织）
 * 2. CheckpointSaver - LangGraph 风格的检查点存储（支持线程/会话）
 */

import type { ResearchState, Checkpoint } from '../state';
import type { BackupManifest, BackupConfig } from '../types';
import { MarkdownStateManager } from './markdown-state';

// ============================================================
// File Checkpoint Saver (基于 MarkdownStateManager)
// ============================================================

/**
 * 文件检查点保存器
 *
 * 将检查点持久化到文件系统，使用 MarkdownStateManager
 */
export class FileCheckpointer implements CheckpointSaver {
  private stateManager: MarkdownStateManager;
  private memoryCache: Map<string, Checkpoint> = new Map();

  constructor(stateDir: string = 'task-data') {
    this.stateManager = new MarkdownStateManager({
      stateDir,
      enableCompression: true,
      maxFileSize: 10 * 1024 * 1024,
    });
  }

  /**
   * 列出所有状态文件
   */
  listStates(): string[] {
    return this.stateManager.listStates();
  }

  async put(
    state: ResearchState,
    config: LangGraphCheckpointConfig
  ): Promise<Checkpoint> {
    const checkpointId = config.checkpointId || `checkpoint-${Date.now()}`;
    const threadKey = config.threadId;

    // 先写入内存缓存
    const checkpoint: Checkpoint = {
      config: {
        configurable: {
          thread_id: config.threadId,
          checkpoint_id: checkpointId,
        },
      },
      checkpoint: state,
      metadata: {
        source: 'file',
        created_at: new Date().toISOString(),
      },
      parentCheckpointId: this._getLatestCheckpointId(threadKey) || undefined,
    };

    this.memoryCache.set(checkpointId, checkpoint);

    // 同时写入文件（持久化）
    const writeSuccess = await this.stateManager.writeState(state, {
      addTimestamp: true,
      computeChecksum: true,
    });

    if (writeSuccess) {
      console.log(`[FileCheckpointer] Saved checkpoint ${checkpointId} to file for project ${state.projectId}`);
    } else {
      console.warn(`[FileCheckpointer] Failed to save checkpoint to file for project ${state.projectId}, memory only`);
    }

    return checkpoint;
  }

  async get(config: LangGraphCheckpointConfig): Promise<Checkpoint | null> {
    const threadKey = config.threadId;

    // 先尝试从文件读取（最新状态）
    const state = await this.stateManager.readState(threadKey);
    if (state) {
      const checkpoint: Checkpoint = {
        config: {
          configurable: {
            thread_id: config.threadId,
            checkpoint_id: `file-${Date.now()}`,
          },
        },
        checkpoint: state,
        metadata: {
          source: 'file',
          created_at: state.updatedAt,
        },
      };
      return checkpoint;
    }

    // 回退到内存缓存
    const latestId = this._getLatestCheckpointId(threadKey);
    if (latestId) {
      return this.memoryCache.get(latestId) || null;
    }

    return null;
  }

  async getCheckpoint(
    checkpointId: string,
    _config: LangGraphCheckpointConfig
  ): Promise<Checkpoint | null> {
    return this.memoryCache.get(checkpointId) || null;
  }

  async *list(config: LangGraphCheckpointConfig): AsyncGenerator<Checkpoint, void> {
    const threadKey = config.threadId;

    // 从文件恢复
    const state = await this.stateManager.readState(threadKey);
    if (state) {
      const checkpoint: Checkpoint = {
        config: {
          configurable: {
            thread_id: config.threadId,
            checkpoint_id: 'latest',
          },
        },
        checkpoint: state,
        metadata: {
          source: 'file',
          created_at: state.updatedAt,
        },
      };
      yield checkpoint;
    }

    // 内存中的检查点
    for (const checkpoint of this.memoryCache.values()) {
      if (checkpoint.config.configurable.thread_id === threadKey) {
        yield checkpoint;
      }
    }
  }

  async delete(
    checkpointId: string,
    _config: LangGraphCheckpointConfig
  ): Promise<boolean> {
    const checkpoint = this.memoryCache.get(checkpointId);
    if (!checkpoint) {
      return false;
    }

    this.memoryCache.delete(checkpointId);

    // 删除文件
    await this.stateManager.deleteState(checkpoint.checkpoint.projectId);

    console.log(`[FileCheckpointer] Deleted checkpoint ${checkpointId}`);
    return true;
  }

  private _getLatestCheckpointId(threadKey: string): string | null {
    // 找到该线程最新检查点
    let latestId: string | null = null;
    let latestTime = 0;

    for (const [id, checkpoint] of this.memoryCache) {
      if (checkpoint.config.configurable.thread_id === threadKey) {
        const time = new Date(checkpoint.metadata.created_at).getTime();
        if (time > latestTime) {
          latestTime = time;
          latestId = id;
        }
      }
    }

    return latestId;
  }
}

/**
 * 创建文件检查点保存器
 */
export function createFileCheckpointer(stateDir: string = 'task-data'): FileCheckpointer {
  return new FileCheckpointer(stateDir);
}

/**
 * 删除状态文件
 */
export async function deleteStateFile(projectId: string, stateDir: string = 'task-data'): Promise<boolean> {
  const stateManager = new MarkdownStateManager({
    stateDir,
    enableCompression: true,
    maxFileSize: 10 * 1024 * 1024,
  });
  return stateManager.deleteState(projectId);
}

/**
 * 检查点配置（LangGraph 风格）
 */
export interface LangGraphCheckpointConfig {
  /** 线程 ID（用于区分不同的执行会话） */
  threadId: string;
  /** 检查点 ID（可选，用于恢复到特定检查点） */
  checkpointId?: string;
}

/**
 * 检查点保存器接口
 *
 * 对应 LangGraph 的 CheckpointSaver
 */
export interface CheckpointSaver {
  /**
   * 保存检查点
   */
  put(
    state: ResearchState,
    config: LangGraphCheckpointConfig
  ): Promise<Checkpoint>;

  /**
   * 获取最新检查点
   */
  get(config: LangGraphCheckpointConfig): Promise<Checkpoint | null>;

  /**
   * 获取特定检查点
   */
  getCheckpoint(checkpointId: string, config: LangGraphCheckpointConfig): Promise<Checkpoint | null>;

  /**
   * 列出所有检查点
   */
  list(config: LangGraphCheckpointConfig): AsyncGenerator<Checkpoint, void>;

  /**
   * 删除检查点
   */
  delete(checkpointId: string, config: LangGraphCheckpointConfig): Promise<boolean>;
}

/**
 * 内存检查点保存器
 */
export class MemoryCheckpointer implements CheckpointSaver {
  private checkpoints: Map<string, Checkpoint> = new Map();
  private threadCheckpoints: Map<string, string[]> = new Map();

  async put(
    state: ResearchState,
    config: LangGraphCheckpointConfig
  ): Promise<Checkpoint> {
    const checkpointId = config.checkpointId || `checkpoint-${Date.now()}`;
    const threadKey = this._getThreadKey(config);

    const checkpoint: Checkpoint = {
      config: {
        configurable: {
          thread_id: config.threadId,
          checkpoint_id: checkpointId,
        },
      },
      checkpoint: state,
      metadata: {
        source: 'memory',
        created_at: new Date().toISOString(),
      },
      parentCheckpointId: this._getLatestCheckpointId(threadKey) || undefined,
    };

    // 保存检查点
    this.checkpoints.set(checkpointId, checkpoint);

    // 更新线程索引
    if (!this.threadCheckpoints.has(threadKey)) {
      this.threadCheckpoints.set(threadKey, []);
    }
    const threadCheckpoints = this.threadCheckpoints.get(threadKey)!;
    threadCheckpoints.push(checkpointId);

    console.log(`[Checkpointer] Saved checkpoint ${checkpointId} for thread ${config.threadId}`);
    return checkpoint;
  }

  async get(config: LangGraphCheckpointConfig): Promise<Checkpoint | null> {
    const threadKey = this._getThreadKey(config);
    const threadCheckpoints = this.threadCheckpoints.get(threadKey);

    if (!threadCheckpoints || threadCheckpoints.length === 0) {
      return null;
    }

    const latestId = threadCheckpoints[threadCheckpoints.length - 1];
    return this.checkpoints.get(latestId) || null;
  }

  async getCheckpoint(
    checkpointId: string,
    _config: LangGraphCheckpointConfig
  ): Promise<Checkpoint | null> {
    return this.checkpoints.get(checkpointId) || null;
  }

  async *list(config: LangGraphCheckpointConfig): AsyncGenerator<Checkpoint, void> {
    const threadKey = this._getThreadKey(config);
    const threadCheckpoints = this.threadCheckpoints.get(threadKey) || [];

    for (const checkpointId of threadCheckpoints) {
      const checkpoint = this.checkpoints.get(checkpointId);
      if (checkpoint) {
        yield checkpoint;
      }
    }
  }

  async delete(
    checkpointId: string,
    _config: LangGraphCheckpointConfig
  ): Promise<boolean> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      return false;
    }

    this.checkpoints.delete(checkpointId);

    // 从线程索引中移除
    for (const [threadKey, checkpoints] of this.threadCheckpoints) {
      const index = checkpoints.indexOf(checkpointId);
      if (index !== -1) {
        checkpoints.splice(index, 1);
        break;
      }
    }

    console.log(`[Checkpointer] Deleted checkpoint ${checkpointId}`);
    return true;
  }

  private _getThreadKey(config: LangGraphCheckpointConfig): string {
    return config.threadId;
  }

  private _getLatestCheckpointId(threadKey: string): string | null {
    const checkpoints = this.threadCheckpoints.get(threadKey);
    if (!checkpoints || checkpoints.length === 0) {
      return null;
    }
    return checkpoints[checkpoints.length - 1];
  }
}

/**
 * 创建内存检查点保存器
 */
export function createMemoryCheckpointer(): MemoryCheckpointer {
  return new MemoryCheckpointer();
}

// ============================================================
// 传统 CheckpointManager 接口
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
 * 创建检查点管理器（使用内存存储）
 */
export function createCheckpointManager(config?: {
  maxCheckpoints?: number;
  maxAge?: number;
}): CheckpointManager {
  return new MemoryCheckpointStore({
    maxCheckpoints: config?.maxCheckpoints || 10,
    maxAge: config?.maxAge || 24 * 60 * 60 * 1000,
  });
}

// ============================================================
// 导出已在上方通过 `export function` / `export class` / `export const` 完成
// ============================================================
