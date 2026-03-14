/**
 * Pipeline 编排器
 *
 * 简化版 Plan-and-Execute 架构
 * 固定流程：Planner → Searcher → Extractor → Analyzer → Reporter
 */

export * from './worker-adapter';

import type { ResearchState } from '../state';
import type { AgentName } from '../types';

/**
 * Pipeline 阶段接口
 */
export interface PipelineStage {
  /** 阶段名称 */
  name: AgentName;
  /** 执行阶段 */
  execute(state: ResearchState): Promise<ResearchState>;
  /** 期望的成功状态 */
  successStatus?: ResearchState['status'];
}

/**
 * Pipeline 配置
 */
export interface PipelineConfig {
  /** 阶段列表 */
  stages: PipelineStage[];
  /** 阶段超时时间（毫秒） */
  stageTimeout?: number;
  /** 是否启用检查点 */
  enableCheckpoint?: boolean;
}

/**
 * Pipeline 执行结果
 */
export interface PipelineResult {
  /** 最终状态 */
  finalState: ResearchState;
  /** 执行的阶段数 */
  executedStages: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 创建 Pipeline
 */
export function createPipeline(config: PipelineConfig): {
  execute(state: ResearchState): Promise<PipelineResult>;
} {
  const { stages, stageTimeout = 600000 } = config;

  return {
    /**
     * 执行 Pipeline
     */
    async execute(initialState: ResearchState): Promise<PipelineResult> {
      let currentState = initialState;
      let executedStages = 0;
      let maxRetries = 10; // 最大重试次数
      let retryCount = 0;

      console.log(`[Pipeline] Starting execution with ${stages.length} stages`);

      try {
        // 重试循环
        let stageIndex = 0;
        while (retryCount <= maxRetries && stageIndex < stages.length) {
          const stage = stages[stageIndex];
          console.log(`[Pipeline] Executing stage: ${stage.name}`);

            // 更新当前阶段
            currentState.currentStep = stage.name;
            currentState.progressMessage = `正在执行 ${stage.name}...`;

            // 执行阶段（带超时）
            const stagePromise = stage.execute(currentState);

            if (stageTimeout > 0) {
              const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error(`Stage ${stage.name} timed out`)), stageTimeout);
              });

              currentState = await Promise.race([stagePromise, timeoutPromise]);
            } else {
              currentState = await stagePromise;
            }

            executedStages++;

            // 检查是否完成
            if (currentState.status === 'completed' || currentState.status === 'failed') {
              console.log(`[Pipeline] Early termination at stage ${stage.name}, status: ${currentState.status}`);
              return {
                finalState: currentState,
                executedStages,
                success: currentState.status === 'completed',
              };
            }

            // 检查是否需要重启（pending 状态且 currentStep 为 planner）
            if (currentState.status === 'pending' && currentState.currentStep === 'planner') {
              console.log(`[Pipeline] Restart triggered at stage ${stage.name}, retry count: ${retryCount + 1}`);
              retryCount++;
              // 跳回从头开始
              stageIndex = 0;
              continue;
            }

            // 🔑 动态跳转逻辑：基于 successStatus
            const expectedSuccessStatus = stage.successStatus || 'completed';
            const targetStep = currentState.currentStep;

            // 如果返回的状态与期望的不匹配，需要跳转
            if (targetStep && currentState.status && currentState.status !== expectedSuccessStatus) {
              const targetIndex = stages.findIndex(s => s.name === targetStep);

              // 允许任意方向跳转，通过 maxRetries 防止无限循环
              if (targetIndex !== -1 && targetIndex !== stageIndex) {
                console.log(`[Pipeline] Dynamic routing: ${stage.name} → ${targetStep} (${currentState.status} != ${expectedSuccessStatus})`);
                stageIndex = targetIndex;
                continue;
              }
            }

            // 正常推进到下一个 stage
            stageIndex++;

          // 如果所有 stage 都执行完（stageIndex >= stages.length）
          if (stageIndex >= stages.length) {
            // 检查是否需要重启（pending 状态）
            if (currentState.status === 'pending') {
              if (currentState.currentStep === 'planner') {
                // 重启：回到 planner
                retryCount++;
                stageIndex = 0;
                console.log(`[Pipeline] All stages completed, restarting from planner (retry ${retryCount})`);
                continue;
              } else {
                // 根据 currentStep 跳转
                const targetStep = currentState.currentStep;
                const targetIndex = stages.findIndex(s => s.name === targetStep);
                if (targetIndex !== -1) {
                  stageIndex = targetIndex;
                  console.log(`[Pipeline] All stages completed, jumping to ${targetStep}`);
                  continue;
                }
              }
            }

            // 正常结束
            if (currentState.status !== 'pending') {
              break;
            }
          }

          // 防止无限循环
          if (retryCount >= maxRetries) {
            console.warn(`[Pipeline] Max retries (${maxRetries}) reached`);
            currentState.status = 'failed';
            currentState.progressMessage = `超过最大重试次数 (${maxRetries})`;
            break;
          }
        }

        console.log(`[Pipeline] Execution completed, executed ${executedStages} stages`);

        return {
          finalState: currentState,
          executedStages,
          success: currentState.status === 'completed',
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Pipeline] Execution failed: ${errorMessage}`);

        // 更新状态为失败
        currentState.status = 'failed';
        currentState.progressMessage = `Pipeline 执行失败: ${errorMessage}`;

        return {
          finalState: currentState,
          executedStages,
          success: false,
          error: errorMessage,
        };
      }
    },
  };
}

/**
 * 默认阶段超时时间（10分钟）
 */
export const DEFAULT_STAGE_TIMEOUT = 600000;

/**
 * 创建默认 Pipeline 配置
 */
export function createDefaultPipeline(
  workers: {
    planner: PipelineStage;
    searcher: PipelineStage;
    extractor: PipelineStage;
    analyzer: PipelineStage;
    reporter: PipelineStage;
  },
  config?: { stageTimeout?: number }
): ReturnType<typeof createPipeline> {
  return createPipeline({
    stages: [
      workers.planner,
      workers.searcher,
      workers.extractor,
      workers.analyzer,
      workers.reporter,
    ],
    stageTimeout: config?.stageTimeout ?? DEFAULT_STAGE_TIMEOUT,
  });
}
