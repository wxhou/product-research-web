/**
 * Graph 模块导出
 *
 * LangGraph 图构建和状态管理
 */

// Types exported from state
export type { ResearchState, Checkpoint } from '../state';
export type { AgentName, ResearchStatus } from '../types';

// Builder
export { createGraphBuilder } from './builder';
export type { GraphBuilder } from './builder';

// StateGraph (LangGraph 风格)
export {
  StateGraph,
  createResearchGraph,
  createDefaultResearchGraph,
  addResearchNodes,
  addResearchEdges,
} from './state-graph';
export type {
  NodeFunction,
  ConditionFunction,
  GraphEdge,
  GraphNode,
  CompiledGraph,
  GraphExecutionResult,
  GraphStreamEvent,
} from './state-graph';

// Checkpoint
export { createCheckpointManager } from './checkpoint';
export { createMemoryCheckpointer, MemoryCheckpointer } from './checkpoint';
export type {
  CheckpointManager,
  CheckpointSaver,
  LangGraphCheckpointConfig as CheckpointConfig,
} from './checkpoint';

// State persistence
export { MarkdownStateManager } from './markdown-state';

// Re-export supervisor for convenience
export type * from '../supervisor';
