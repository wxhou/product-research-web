/**
 * Research Agent 主模块导出
 *
 * 提供统一的 API 入口
 */

import { createResearchTaskExecutor } from './service';

// 类型和状态
export * from './types';
export * from './state';

// 子模块
export * from './supervisor';
export * from './workers';
export * from './graph';
export * from './progress';
export * from './cancellation';
export * from './backup';

// 服务模块
export { createResearchTaskExecutor };
export { getResearchTaskStatus, listResearchTasks, deleteResearchTask, researchTaskExists } from './service';

// ============================================================
// 主入口函数
// ============================================================

/**
 * 研究任务配置
 */
export interface RunResearchAgentOptions {
  /** 项目 ID */
  projectId: string;
  /** 项目标题 */
  title: string;
  /** 项目描述 */
  description?: string;
  /** 关键词列表 */
  keywords: string[];
  /** 用户 ID */
  userId: string;
  /** 进度回调 */
  onProgress?: (progress: number, message: string) => void;
  /** 完成回调 */
  onComplete?: (result: { success: boolean; report?: string }) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

/**
 * 运行研究代理
 *
 * 使用多代理架构执行完整的研究流程
 */
export async function runResearchAgent(
  options: RunResearchAgentOptions
): Promise<{ success: boolean; report?: string; reportPath?: string; error?: string }> {
  const { projectId, title, description, keywords, userId, onProgress, onComplete, onError } = options;

  try {
    // 创建研究任务执行器
    const executor = createResearchTaskExecutor({
      projectId,
      title,
      description,
      keywords,
      userId,
    });

    // 发送初始进度（任务还未创建，不能调用 getStatus）
    onProgress?.(0, '正在初始化研究任务...');

    // 开始执行（这会创建初始状态并执行图）
    const finalState = await executor.start();

    // 保存最终进度
    onProgress?.(finalState.progress, finalState.progressMessage);

    if (finalState.status === 'completed') {
      const result = {
        success: true,
        report: finalState.report, // 报告内容
        reportPath: finalState.reportPath, // 报告文件路径
      };
      onComplete?.(result);
      return result;
    } else {
      const error = new Error(finalState.progressMessage || '研究任务失败');
      onError?.(error);
      return { success: false, error: error.message };
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    onError?.(err);
    return { success: false, error: err.message };
  }
}
