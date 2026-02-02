/**
 * LangGraph 图构建器
 *
 * 提供两种构建模式：
 * 1. 传统模式 (createGraphBuilder) - 简单的节点和边管理
 * 2. StateGraph 模式 (createDefaultResearchGraph) - 完整的 LangGraph 风格实现
 */

import type { ResearchState } from '../state';
import type { AgentName } from '../types';
import type { SupervisorDecision } from '../supervisor';
import {
  StateGraph,
  createDefaultResearchGraph,
  type NodeFunction,
  type CompiledGraph,
} from './state-graph';
import { createMemoryCheckpointer, createFileCheckpointer, type CheckpointSaver } from './checkpoint';

// ============================================================
// 传统 Builder 模式（保持向后兼容）
// ============================================================

/**
 * 图节点
 */
export interface GraphNode {
  id: string;
  name: string;
  agent: AgentName;
  description: string;
}

/**
 * 图边
 */
export interface GraphEdge {
  from: string;
  to: string;
  condition?: (state: ResearchState) => boolean;
}

/**
 * 图配置
 */
export interface GraphConfig {
  /** 节点超时（毫秒） */
  nodeTimeout: number;
  /** 是否启用检查点 */
  enableCheckpoints: boolean;
  /** 检查点间隔（毫秒） */
  checkpointInterval: number;
}

/**
 * 图构建器接口
 */
export interface GraphBuilder {
  /** 添加节点 */
  addNode(node: GraphNode): GraphBuilder;
  /** 添加边 */
  addEdge(edge: GraphEdge): GraphBuilder;
  /** 添加条件边 */
  addConditionalEdge(from: string, to: string, condition: (state: ResearchState) => boolean): GraphBuilder;
  /** 设置入口点 */
  setEntryPoint(nodeId: string): GraphBuilder;
  /** 设置结束点 */
  setEndPoint(nodeId: string): GraphBuilder;
  /** 构建图 */
  build(): CompiledGraph<ResearchState>;
  /** 编译图 */
  compile(): CompiledGraph<ResearchState>;
}

// ============================================================
// 默认配置
// ============================================================

const DEFAULT_CONFIG: GraphConfig = {
  nodeTimeout: 300000, // 5 分钟
  enableCheckpoints: true,
  checkpointInterval: 30000, // 30 秒
};

// ============================================================
// 默认节点定义
// ============================================================

const DEFAULT_NODES: GraphNode[] = [
  {
    id: 'planner',
    name: 'Planner',
    agent: 'planner',
    description: '生成研究搜索计划',
  },
  {
    id: 'searcher',
    name: 'Searcher',
    agent: 'searcher',
    description: '执行搜索查询',
  },
  {
    id: 'extractor',
    name: 'Extractor',
    agent: 'extractor',
    description: '爬取和提取网页内容',
  },
  {
    id: 'analyzer',
    name: 'Analyzer',
    agent: 'analyzer',
    description: '分析内容并生成竞品报告',
  },
  {
    id: 'reporter',
    name: 'Reporter',
    agent: 'reporter',
    description: '生成最终研究报告',
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    agent: 'planner',
    description: '协调和路由决策',
  },
];

// ============================================================
// 条件判断函数
// ============================================================

/**
 * 检查是否需要更多搜索结果
 */
export function needsMoreSearches(state: ResearchState): boolean {
  return state.searchResults.length < 15;
}

/**
 * 检查是否需要更多提取内容
 */
export function needsMoreExtractions(state: ResearchState): boolean {
  return state.extractedContent.length < 5;
}

/**
 * 检查分析是否完成
 */
export function isAnalysisComplete(state: ResearchState): boolean {
  return !!(
    state.analysis &&
    state.analysis.features.length >= 3 &&
    state.analysis.competitors.length >= 2 &&
    state.analysis.confidenceScore >= 0.5
  );
}

/**
 * 检查是否可以生成报告
 */
export function canGenerateReport(state: ResearchState): boolean {
  return (
    state.analysis !== undefined &&
    state.extractedContent.length > 0 &&
    state.searchResults.length > 0
  );
}

/**
 * 检查是否应该继续迭代
 */
export function shouldContinue(state: ResearchState): boolean {
  return state.status !== 'completed' && state.status !== 'failed';
}

// ============================================================
// 传统 Builder 实现
// ============================================================

/**
 * 创建图构建器
 */
export function createGraphBuilder(config?: Partial<GraphConfig>): GraphBuilder {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const nodes: Map<string, GraphNode> = new Map();
  let entryPoint: string | null = null;
  let endPoint: string | null = null;

  return {
    addNode(node: GraphNode) {
      nodes.set(node.id, node);
      return this;
    },

    addEdge(edge: GraphEdge) {
      // 忽略，直接返回
      return this;
    },

    addConditionalEdge(
      _from: string,
      _to: string,
      _condition: (state: ResearchState) => boolean
    ) {
      // 忽略，直接返回
      return this;
    },

    setEntryPoint(nodeId: string) {
      entryPoint = nodeId;
      return this;
    },

    setEndPoint(nodeId: string) {
      endPoint = nodeId;
      return this;
    },

    build() {
      if (!entryPoint) {
        throw new Error('Entry point not set');
      }

      // 返回空的编译图
      return createDefaultResearchGraph(
        {
          planner: async (state) => ({ currentStep: 'planner' as AgentName, status: 'planning' as const }),
          searcher: async (state) => ({ currentStep: 'searcher' as AgentName, status: 'searching' as const }),
          extractor: async (state) => ({ currentStep: 'extractor' as AgentName, status: 'extracting' as const }),
          analyzer: async (state) => ({ currentStep: 'analyzer' as AgentName, status: 'analyzing' as const }),
          reporter: async (state) => ({ currentStep: 'reporter' as AgentName, status: 'reporting' as const }),
          supervisor: async (state) => ({ currentStep: 'planner' as AgentName, status: 'planning' as const }),
        },
        { nodeTimeout: finalConfig.nodeTimeout, maxIterations: 20 }
      );
    },

    compile() {
      return this.build();
    },
  };
}

// ============================================================
// 创建默认研究图
// ============================================================

/**
 * 创建默认研究图（推荐使用此方法）
 */
export function createResearchGraph(
  agentNodes: {
    planner: NodeFunction<ResearchState>;
    searcher: NodeFunction<ResearchState>;
    extractor: NodeFunction<ResearchState>;
    analyzer: NodeFunction<ResearchState>;
    reporter: NodeFunction<ResearchState>;
    supervisor: NodeFunction<ResearchState>;
  },
  config?: {
    nodeTimeout?: number;
    maxIterations?: number;
    checkpointer?: CheckpointSaver;
  }
): CompiledGraph<ResearchState> {
  return createDefaultResearchGraph(agentNodes, {
    nodeTimeout: config?.nodeTimeout ?? 300000,
    maxIterations: config?.maxIterations ?? 20,
    checkpointer: config?.checkpointer ?? createFileCheckpointer(),
  });
}

/**
 * 创建简单研究图
 */
export function createSimpleResearchGraph(
  _supervisorFn: (state: ResearchState) => Promise<SupervisorDecision>
): CompiledGraph<ResearchState> {
  // 返回默认编译图
  return createResearchGraph({
    planner: async (state) => ({ currentStep: 'planner' as AgentName, status: 'planning' as const }),
    searcher: async (state) => ({ currentStep: 'searcher' as AgentName, status: 'searching' as const }),
    extractor: async (state) => ({ currentStep: 'extractor' as AgentName, status: 'extracting' as const }),
    analyzer: async (state) => ({ currentStep: 'analyzer' as AgentName, status: 'analyzing' as const }),
    reporter: async (state) => ({ currentStep: 'reporter' as AgentName, status: 'reporting' as const }),
    supervisor: async (state) => ({ currentStep: 'planner' as AgentName, status: 'planning' as const }),
  });
}

// ============================================================
// 导出
// ============================================================

export {
  DEFAULT_NODES,
  DEFAULT_CONFIG,
};
