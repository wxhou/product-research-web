/**
 * LangGraph 图构建器
 *
 * 使用 LangGraph 构建研究工作流图
 *
 * 注意：此模块需要 langgraph 包，该包将在完整实现时安装
 * 当前版本使用存根实现作为占位符
 */

import type { ResearchState } from '../state';
import type { AgentName } from '../types';
import type { SupervisorDecision } from '../supervisor';

// ============================================================
// 类型定义
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
  build(): Promise<CompiledGraph>;
  /** 编译图 */
  compile(): Promise<CompiledGraph>;
}

/**
 * 编译后的图接口
 */
export interface CompiledGraph {
  /** 图 ID */
  id: string;
  /** 节点列表 */
  nodes: GraphNode[];
  /** 边列表 */
  edges: GraphEdge[];
  /** 执行图 */
  execute(input: ResearchState): Promise<GraphExecutionResult>;
  /** 获取下一个节点 */
  getNextNode(currentState: ResearchState): string | null;
}

/**
 * 图执行结果
 */
export interface GraphExecutionResult {
  success: boolean;
  finalState: ResearchState;
  executionPath: string[];
  checkpoints: CheckpointRecord[];
  error?: string;
}

/**
 * 检查点记录
 */
export interface CheckpointRecord {
  id: string;
  state: ResearchState;
  timestamp: string;
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
    agent: 'planner', // Supervisor 使用 planner 类型的 Agent
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

/**
 * 检查是否应该回退到搜索
 */
export function shouldFallbackToSearch(state: ResearchState): boolean {
  return (
    state.searchResults.length === 0 ||
    (state.iterationsUsed > 0 && state.searchResults.length < 5)
  );
}

/**
 * 检查是否应该回退到提取
 */
export function shouldFallbackToExtraction(state: ResearchState): boolean {
  return (
    state.extractedContent.length === 0 ||
    (state.iterationsUsed > 0 && state.extractedContent.length < 3)
  );
}

// ============================================================
// 图构建器实现
// ============================================================

/**
 * 创建图构建器
 */
export function createGraphBuilder(config?: Partial<GraphConfig>): GraphBuilder {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const nodes: Map<string, GraphNode> = new Map();
  const edges: GraphEdge[] = [];
  let entryPoint: string | null = null;
  let endPoint: string | null = null;

  return {
    addNode(node: GraphNode) {
      nodes.set(node.id, node);
      return this;
    },

    addEdge(edge: GraphEdge) {
      edges.push(edge);
      return this;
    },

    addConditionalEdge(from: string, to: string, condition: (state: ResearchState) => boolean) {
      edges.push({ from, to, condition });
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

    async build() {
      // 验证配置
      if (!entryPoint) {
        throw new Error('Entry point not set');
      }

      // 创建节点列表
      const nodeList = Array.from(nodes.values());

      // 返回编译后的图
      return createCompiledGraph({
        id: `research-graph-${Date.now()}`,
        nodes: nodeList,
        edges,
        entryPoint: entryPoint!,
        endPoint: endPoint || 'reporter',
        config: finalConfig,
      });
    },

    async compile() {
      return this.build();
    },
  };
}

/**
 * 创建编译后的图
 */
function createCompiledGraph(params: {
  id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  entryPoint: string;
  endPoint: string;
  config: GraphConfig;
}): CompiledGraph {
  const { id, nodes, edges, entryPoint, endPoint, config } = params;

  // 创建节点映射
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return {
    id,
    nodes,
    edges,

    async execute(input: ResearchState): Promise<GraphExecutionResult> {
      // 注意：实际执行需要 langgraph 包
      // 这里返回存根结果
      console.warn('[GraphBuilder] execute() 需要 langgraph 包才能运行');

      return {
        success: false,
        finalState: input,
        executionPath: [],
        checkpoints: [],
        error: 'Graph execution requires langgraph package',
      };
    },

    getNextNode(currentState: ResearchState): string | null {
      // 根据当前状态和边条件确定下一个节点
      for (const edge of edges) {
        if (edge.from === currentState.currentStep) {
          if (!edge.condition) {
            return edge.to;
          }
          if (edge.condition(currentState)) {
            return edge.to;
          }
        }
      }
      return null;
    },
  };
}

// ============================================================
// 便捷函数
// ============================================================

/**
 * 创建默认研究图
 */
export function createDefaultResearchGraph(config?: Partial<GraphConfig>): GraphBuilder {
  const builder = createGraphBuilder(config);

  // 添加默认节点
  for (const node of DEFAULT_NODES) {
    builder.addNode(node);
  }

  // 设置入口和结束点
  builder.setEntryPoint('planner');
  builder.setEndPoint('reporter');

  // 添加边
  builder.addEdge({ from: 'planner', to: 'supervisor' });
  builder.addEdge({ from: 'searcher', to: 'supervisor' });
  builder.addEdge({ from: 'extractor', to: 'supervisor' });
  builder.addEdge({ from: 'analyzer', to: 'supervisor' });
  builder.addEdge({ from: 'reporter', to: 'completed' });

  // 添加条件边
  builder.addConditionalEdge('supervisor', 'searcher', needsMoreSearches);
  builder.addConditionalEdge('supervisor', 'extractor', (s) => !needsMoreSearches(s) && needsMoreExtractions(s));
  builder.addConditionalEdge('supervisor', 'analyzer', (s) => !needsMoreSearches(s) && !needsMoreExtractions(s) && !isAnalysisComplete(s));
  builder.addConditionalEdge('supervisor', 'reporter', canGenerateReport);
  builder.addConditionalEdge('supervisor', 'completed', (s) => s.status === 'completed');

  return builder;
}

/**
 * 从研究状态创建执行图
 */
export async function createResearchExecutionGraph(
  state: ResearchState,
  config?: Partial<GraphConfig>
): Promise<CompiledGraph> {
  const builder = createDefaultResearchGraph(config);

  // 根据当前状态调整入口点
  const entryMap: Record<string, string> = {
    pending: 'planner',
    planning: 'planner',
    searching: 'searcher',
    extracting: 'extractor',
    analyzing: 'analyzer',
    reporting: 'reporter',
  };

  builder.setEntryPoint(entryMap[state.status] || 'planner');

  return await builder.build();
}

// ============================================================
// 导出已在上方通过 `export function` 完成
// ============================================================
