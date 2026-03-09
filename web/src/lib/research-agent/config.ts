/**
 * Research Agent 环境配置
 *
 * 从环境变量读取配置
 */

/**
 * 研究代理配置
 */
export interface ResearchAgentEnvConfig {
  /** 是否启用迭代优化 */
  enableIteration: boolean;
  /** 最大迭代次数 */
  maxIterations: number;
  /** 通过阈值 */
  passThreshold: number;
  /** 警告阈值 */
  warnThreshold: number;
  /** 最小收益 */
  minImprovement: number;
}

/**
 * 获取研究代理配置
 */
export function getResearchAgentConfig(): ResearchAgentEnvConfig {
  return {
    enableIteration: process.env.REPORTER_ENABLE_ITERATION === 'true',
    maxIterations: parseInt(process.env.REPORTER_MAX_ITERATIONS || '3', 10),
    passThreshold: parseInt(process.env.REPORTER_PASS_THRESHOLD || '75', 10),
    warnThreshold: parseInt(process.env.REPORTER_WARN_THRESHOLD || '60', 10),
    minImprovement: parseInt(process.env.REPORTER_MIN_IMPROVEMENT || '5', 10),
  };
}
