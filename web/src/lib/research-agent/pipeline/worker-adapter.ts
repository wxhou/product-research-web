/**
 * Pipeline Worker 适配器
 *
 * 将现有 Worker 函数适配为 Pipeline 阶段
 */

import type { ResearchState } from '../state';
import type { AgentName } from '../types';
import type { PipelineStage } from './index';

/**
 * Worker 函数类型（与现有节点函数兼容）
 */
export type WorkerFunction = (state: ResearchState) => Promise<Partial<ResearchState>>;

/**
 * Worker 配置
 */
export interface WorkerConfig {
  /** 阶段名称 */
  name: AgentName;
  /** Worker 函数 */
  worker: WorkerFunction;
  /** 成功状态 */
  successStatus?: ResearchState['status'];
  /** 失败状态 */
  failureStatus?: ResearchState['status'];
  /** 进度值 */
  progress?: number;
  /** 进度消息模板 */
  progressMessage?: string;
}

/**
 * 创建 Pipeline 阶段
 */
export function createWorkerStage(config: WorkerConfig): PipelineStage {
  const {
    name,
    worker,
    successStatus = 'completed',
    failureStatus = 'failed',
    progress,
    progressMessage,
  } = config;

  return {
    name,
    async execute(state: ResearchState): Promise<ResearchState> {
      console.log(`[Worker:${name}] Starting execution`);

      try {
        // 执行 worker
        const result = await worker(state);

        // 合并结果到状态
        const newState: ResearchState = {
          ...state,
          ...result,
        };

        // 更新进度
        if (progress !== undefined) {
          newState.progress = progress;
        }

        // 更新进度消息
        if (progressMessage) {
          newState.progressMessage = progressMessage;
        }

        // 如果 worker 返回失败状态
        if (result.status === failureStatus) {
          newState.status = failureStatus;
          console.log(`[Worker:${name}] Failed: ${result.progressMessage || 'Unknown error'}`);
          return newState;
        }

        // 如果没有明确返回状态，保持当前状态或设置为下一阶段
        if (!result.status) {
          newState.status = successStatus;
        }

        newState.currentStep = name;
        newState.updatedAt = new Date().toISOString();

        console.log(`[Worker:${name}] Completed successfully`);
        return newState;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Worker:${name}] Error: ${errorMessage}`);

        // 返回失败状态
        return {
          ...state,
          status: failureStatus,
          progressMessage: `${name} 执行失败: ${errorMessage}`,
          currentStep: name,
          updatedAt: new Date().toISOString(),
        };
      }
    },
  };
}
