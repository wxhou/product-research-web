/**
 * LangGraph-Style StateGraph Implementation
 *
 * 实现 LangGraph 的核心模式：
 * 1. StateGraph - 状态图定义
 * 2. 节点(Node) - 执行单元
 * 3. 边(Edge) - 流程控制
 * 4. 条件边(Conditional Edge) - 动态路由
 * 5. Checkpoint - 状态持久化
 *
 * 架构说明：
 * - 每个节点执行后返回 Partial<ResearchState>
 * - Supervisor 节点执行后设置 currentStep 为下一个要执行的节点
 * - _findNextNode 读取 currentStep 来决定下一个节点
 */

import type { ResearchState, Checkpoint as CheckpointType, StateCheckpointConfig } from '../state';
import type { AgentName } from '../types';
import type { LangGraphCheckpointConfig, CheckpointSaver } from './checkpoint';
import { updateProgressFromState } from '../progress/tracker';

// ============================================================
// 类型定义
// ============================================================

/**
 * 节点执行函数
 */
export type NodeFunction<S extends ResearchState = ResearchState> = (
  state: S
) => Promise<Partial<S> | null> | Partial<S> | null;

/**
 * 条件路由函数
 */
export type ConditionFunction<S extends ResearchState = ResearchState> = (
  state: S
) => string;

/**
 * 边类型
 */
export type EdgeType = 'normal' | 'conditional' | 'start' | 'end';

/**
 * 边的定义
 */
export interface GraphEdge {
  from: string;
  to: string;
  type: EdgeType;
  condition?: ConditionFunction<ResearchState>;
}

/**
 * 节点定义
 */
export interface GraphNode<S extends ResearchState = ResearchState> {
  id: string;
  name: string;
  fn: NodeFunction<S>;
  description?: string;
}

/**
 * 图配置
 */
export interface StateGraphConfig {
  /** 节点超时（毫秒） */
  nodeTimeout?: number;
  /** 最大迭代次数 */
  maxIterations?: number;
  /** 检查点保存器 */
  checkpointer?: CheckpointSaver;
}

/**
 * 图执行结果
 */
export interface GraphExecutionResult<S extends ResearchState = ResearchState> {
  success: boolean;
  finalState: S;
  executionPath: string[];
  checkpoints: CheckpointType[];
  lastNode: string;
  iterations: number;
  error?: string;
}

/**
 * 流式事件
 */
export interface GraphStreamEvent<S extends ResearchState = ResearchState> {
  node: string;
  state: S;
  type: 'node_start' | 'node_end' | 'checkpoint';
}

/**
 * 编译后的图
 */
export interface CompiledGraph<S extends ResearchState = ResearchState> {
  id: string;
  nodes: Map<string, GraphNode<S>>;
  edges: GraphEdge[];
  entryPoint: string | null;
  endPoints: Set<string>;
  config: Required<StateGraphConfig>;

  /**
   * 执行图
   */
  invoke(input: S, config?: LangGraphCheckpointConfig): Promise<GraphExecutionResult<S>>;

  /**
   * 流式执行（逐步返回结果）
   */
  stream(input: S, config?: LangGraphCheckpointConfig): AsyncGenerator<GraphStreamEvent<S>, void>;

  /**
   * 获取下一个可能执行的节点
   */
  getNextNode(currentState: S): string | null;

  /**
   * 获取所有检查点
   */
  getCheckpoints(config: LangGraphCheckpointConfig): AsyncGenerator<CheckpointType, void>;
}

/**
 * 路由映射
 */
export type RouterMapping = Record<string, string | '__end__'>;

// ============================================================
// StateGraph 实现
// ============================================================

/**
 * StateGraph 类 - 核心图构建器
 */
export class StateGraph<S extends ResearchState = ResearchState> {
  private nodes: Map<string, GraphNode<S>> = new Map();
  private edges: GraphEdge[] = [];
  private entryPoint: string | null = null;
  private endPoints: Set<string> = new Set();
  private config: Required<StateGraphConfig>;
  private routerMap: Map<string, RouterMapping> = new Map();

  constructor(config: StateGraphConfig = {}) {
    this.config = {
      nodeTimeout: config.nodeTimeout ?? 300000,
      maxIterations: config.maxIterations ?? 20,
      checkpointer: config.checkpointer!,
    };
  }

  /**
   * 添加节点
   */
  addNode(id: string, fn: NodeFunction<S>, description?: string): this {
    this.nodes.set(id, {
      id,
      name: id,
      fn,
      description,
    });
    return this;
  }

  /**
   * 添加固定边
   */
  addEdge(from: string, to: string): this {
    if (!this.nodes.has(from)) {
      console.warn(`[StateGraph] Edge from unknown node: ${from}`);
    }
    if (!this.nodes.has(to)) {
      console.warn(`[StateGraph] Edge to unknown node: ${to}`);
    }

    this.edges.push({
      from,
      to,
      type: 'normal',
    });
    return this;
  }

  /**
   * 添加条件边（路由器模式）
   *
   * @param from - 源节点 ID
   * @param router - 路由器函数
   * @param mapping - 路由映射表
   */
  addConditionalEdges(
    from: string,
    router: ConditionFunction<S>,
    mapping: RouterMapping
  ): this {
    if (!this.nodes.has(from)) {
      console.warn(`[StateGraph] Conditional edge from unknown node: ${from}`);
    }

    // 存储路由器和映射
    this.routerMap.set(from, mapping);

    // 添加所有可能的边
    for (const [condition, to] of Object.entries(mapping)) {
      if (condition === '__end__' || to === '__end__') {
        // __end__ 表示结束条件，不需要添加边，也不应该把 from 节点设为结束点
        // 结束的判断应该在路由时动态决定，而不是静态地把节点标记为结束点
        continue;
      }
      if (condition === '__root__') {
        this.entryPoint = to;
        continue;
      }

      this.edges.push({
        from,
        to,
        type: 'conditional',
        condition: ((state: ResearchState) => {
          const route = router(state as S);
          return route === condition ? condition : '';
        }) as ConditionFunction<ResearchState>,
      });
    }

    return this;
  }

  /**
   * 添加入口边
   */
  setEntryPoint(nodeId: string): this {
    if (!this.nodes.has(nodeId)) {
      console.warn(`[StateGraph] Entry point to unknown node: ${nodeId}`);
    }
    this.entryPoint = nodeId;
    return this;
  }

  /**
   * 设置结束点
   */
  setEndPoint(nodeId: string): this {
    this.endPoints.add(nodeId);
    return this;
  }

  /**
   * 编译图为可执行图
   */
  compile(config?: Partial<StateGraphConfig>): CompiledGraph<S> {
    const finalConfig: Required<StateGraphConfig> = {
      nodeTimeout: config?.nodeTimeout ?? this.config.nodeTimeout,
      maxIterations: config?.maxIterations ?? this.config.maxIterations,
      checkpointer: config?.checkpointer ?? this.config.checkpointer,
    };

    // 使用闭包捕获 StateGraph 实例的引用
    const graph = this;

    return {
      id: `state-graph-${Date.now()}`,
      nodes: new Map(this.nodes),
      edges: [...this.edges],
      entryPoint: this.entryPoint,
      endPoints: new Set(this.endPoints),
      config: finalConfig,

      async invoke(input: S, config?: LangGraphCheckpointConfig): Promise<GraphExecutionResult<S>> {
        return graph._executeGraph(input, finalConfig, config);
      },

      async *stream(
        input: S,
        config?: LangGraphCheckpointConfig
      ): AsyncGenerator<GraphStreamEvent<S>, void> {
        yield* graph._streamGraph(input, finalConfig, config);
      },

      getNextNode(currentState: S): string | null {
        return graph._findNextNode(currentState.currentStep, currentState);
      },

      async *getCheckpoints(config: LangGraphCheckpointConfig): AsyncGenerator<CheckpointType, void> {
        if (finalConfig.checkpointer.list) {
          yield* finalConfig.checkpointer.list(config);
        }
      },
    };
  }

  /**
   * 查找下一个节点（核心路由逻辑）
   */
  private _findNextNode(
    currentStep: string,
    state: S
  ): string | null {
    // 1. 检查当前节点是否在路由器映射中
    const routerMapping = this.routerMap.get(currentStep);
    if (routerMapping) {
      // 使用路由器来决定下一个节点
      const nextNode = this._route(currentStep, state);
      // 如果 router 返回空或 '__end__'，使用路由器映射
      if (nextNode && nextNode !== '__end__') {
        return nextNode;
      }
      if (nextNode === '__end__') {
        return null; // 结束
      }
      // router 没有明确返回，使用路由器映射作为后备
      const mappedNode = routerMapping[state.currentStep as string];
      if (mappedNode && mappedNode !== '__end__') {
        return mappedNode;
      }
    }

    // 2. 标准步骤映射（后备）- 根据当前状态映射到下一个要执行的节点
    const stepToNodeMap: Record<string, string> = {
      // 当前在哪个节点，就去 supervisor 决定下一步
      supervisor: 'supervisor',
      planner: 'searcher',  // planning 完成后去 searcher
      searcher: 'extractor', // searching 完成后去 extractor
      extractor: 'analyzer', // extracting 完成后去 analyzer
      analyzer: 'reporter',  // analyzing 完成后去 reporter
      reporter: 'completed', // reporting 完成后结束
    };

    const nextNode = stepToNodeMap[currentStep];
    if (nextNode && this.nodes.has(nextNode)) {
      return nextNode;
    }

    // 3. 遍历边找匹配
    for (const edge of this.edges) {
      // 对于 supervisor 的条件边，使用条件函数判断
      if (edge.from === 'supervisor' && edge.type === 'conditional' && edge.condition) {
        const route = edge.condition(state);
        if (route && route !== '__end__') {
          return edge.to;
        }
        continue;
      }

      // 其他边按正常逻辑处理
      if (edge.from === currentStep) {
        if (edge.type === 'normal') {
          return edge.to;
        }
        // 条件边
        if (edge.condition && edge.type === 'conditional') {
          const route = edge.condition(state);
          if (route) {
            return edge.to;
          }
        }
      }
    }

    // 4. 使用入口点
    if (this.entryPoint && this.nodes.has(this.entryPoint)) {
      return this.entryPoint;
    }

    return null;
  }

  /**
   * 路由决策
   */
  private _route(
    currentStep: string,
    state: S
  ): string | '__end__' | null {
    const routerMapping = this.routerMap.get(currentStep);
    if (!routerMapping) {
      return null;
    }

    // 查找当前节点的路由器函数
    const node = this.nodes.get(currentStep);
    if (!node) {
      return null;
    }

    // 假设节点函数在执行后会更新 currentStep 来指示下一步
    // 这是最简单的模式：节点返回 { currentStep: 'next-node' }
    const nextStep = (state.currentStep as string);

    // 检查 nextStep 是否在映射中
    if (routerMapping[nextStep]) {
      return routerMapping[nextStep];
    }

    // 如果当前状态显示应该结束
    if (state.status === 'completed' || state.status === 'failed') {
      return '__end__';
    }

    return null;
  }

  /**
   * 执行图
   */
  private async _executeGraph(
    input: S,
    config: Required<StateGraphConfig>,
    checkpointConfig?: LangGraphCheckpointConfig
  ): Promise<GraphExecutionResult<S>> {
    let currentState = { ...input };
    const executionPath: string[] = [];
    const checkpoints: CheckpointType[] = [];
    let iterations = 0;
    let lastNode = '';

    console.log(`[StateGraph] Starting graph execution: currentStep=${currentState.currentStep}, status=${currentState.status}`);

    try {
      while (iterations < config.maxIterations) {
        // 1. 保存检查点（执行前）
        if (config.checkpointer && iterations > 0) {
          const checkpoint = await config.checkpointer.put(currentState, {
            threadId: checkpointConfig?.threadId || 'default',
            checkpointId: `iter-${iterations}`,
          });
          checkpoints.push(checkpoint);
        }

        // 2. 查找下一个节点
        let nextNodeId: string | null;
        
        // 优先使用状态中的 currentStep（如果它是有效的节点）
        // 这适用于 supervisor 和其他 worker 节点指定下一步的情况
        if (lastNode && currentState.currentStep && this.nodes.has(currentState.currentStep) && currentState.currentStep !== lastNode) {
          // currentStep 是一个有效节点且不是刚执行的节点，直接使用
          nextNodeId = currentState.currentStep;
          console.log(`[StateGraph] Using currentStep as next node: ${nextNodeId} (directed by ${lastNode})`);
        } else if (!lastNode && this.entryPoint) {
          // 第一次迭代，使用入口点
          nextNodeId = this.entryPoint;
          console.log(`[StateGraph] Using entry point: ${nextNodeId}`);
        } else {
          // 后备：使用路由逻辑
          nextNodeId = this._findNextNode(lastNode || currentState.currentStep, currentState);
          console.log(`[StateGraph] Using routing logic, found: ${nextNodeId}`);
        }
        
        console.log(`[StateGraph] Iteration ${iterations}: lastNode=${lastNode}, currentStep=${currentState.currentStep}, nextNodeId=${nextNodeId}`);

        if (!nextNodeId) {
          // 没有更多节点，结束
          console.log(`[StateGraph] No next node found, ending execution`);
          break;
        }

        // 3. 检查是否到达结束点
        if (this.endPoints.has(nextNodeId)) {
          console.log(`[StateGraph] Reached endpoint: ${nextNodeId}`);
          currentState = {
            ...currentState,
            status: 'completed',
            progress: 100,
            progressMessage: '研究任务已完成',
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          lastNode = nextNodeId;
          executionPath.push(nextNodeId);
          break;
        }

        // 4. 获取并执行节点
        const node = this.nodes.get(nextNodeId);
        if (!node) {
          throw new Error(`Node not found: ${nextNodeId}`);
        }

        // 执行节点（带超时）
        let nodeResult: Partial<S> | null = null;
        const nodePromise = Promise.resolve(node.fn(currentState));
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error(`Node timeout: ${nextNodeId}`)), config.nodeTimeout)
        );

        try {
          nodeResult = await Promise.race([nodePromise, timeoutPromise]);
        } catch (error) {
          console.error(`[StateGraph] Node execution failed: ${nextNodeId}`, error);
          nodeResult = {
            status: 'failed',
            progressMessage: `执行失败: ${(error as Error).message}`,
          } as Partial<S>;
        }

        // 5. 更新状态
        if (nodeResult) {
          currentState = {
            ...currentState,
            ...nodeResult,
            updatedAt: new Date().toISOString(),
          } as S;
        }

        // 6. 更新进度追踪器
        await updateProgressFromState(currentState);

        lastNode = nextNodeId;
        executionPath.push(nextNodeId);
        iterations++;

        // 7. 检查是否完成
        if (currentState.status === 'completed' || currentState.status === 'failed') {
          break;
        }
      }

      // 保存最终检查点
      if (config.checkpointer && currentState) {
        const checkpoint = await config.checkpointer.put(currentState, {
          threadId: checkpointConfig?.threadId || 'default',
          checkpointId: `final-${iterations}`,
        });
        checkpoints.push(checkpoint);
      }

      return {
        success: currentState.status === 'completed',
        finalState: currentState,
        executionPath,
        checkpoints,
        lastNode,
        iterations,
      };
    } catch (error) {
      return {
        success: false,
        finalState: currentState,
        executionPath,
        checkpoints,
        lastNode,
        iterations,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 流式执行
   */
  private async *_streamGraph(
    input: S,
    config: Required<StateGraphConfig>,
    checkpointConfig?: LangGraphCheckpointConfig
  ): AsyncGenerator<GraphStreamEvent<S>, void> {
    let currentState = { ...input };
    let iterations = 0;
    const threadId = checkpointConfig?.threadId || 'default';

    // 保存初始检查点
    if (config.checkpointer) {
      await config.checkpointer.put(currentState, {
        threadId,
        checkpointId: 'initial',
      });
    }

    while (iterations < config.maxIterations) {
      // 1. 保存检查点
      if (config.checkpointer && iterations > 0) {
        await config.checkpointer.put(currentState, {
          threadId,
          checkpointId: `iter-${iterations}`,
        });
      }

      // 2. 发送检查点事件
      yield {
        node: currentState.currentStep,
        state: currentState,
        type: 'checkpoint',
      };

      // 3. 查找下一个节点
      const nextNodeId = this._findNextNode(currentState.currentStep, currentState);

      if (!nextNodeId || this.endPoints.has(nextNodeId)) {
        // 保存最终检查点
        if (config.checkpointer) {
          await config.checkpointer.put(currentState, {
            threadId,
            checkpointId: `final-${iterations}`,
          });
        }
        break;
      }

      const node = this.nodes.get(nextNodeId);
      if (!node) break;

      // 4. 发送节点开始事件
      yield {
        node: nextNodeId,
        state: currentState,
        type: 'node_start',
      };

      // 5. 执行节点（带超时）
      let nodeResult: Partial<S> | null = null;
      const nodePromise = Promise.resolve(node.fn(currentState));
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error(`Node timeout: ${nextNodeId}`)), config.nodeTimeout)
      );

      try {
        nodeResult = await Promise.race([nodePromise, timeoutPromise]) as Partial<S>;
      } catch (error) {
        console.error(`[StateGraph] Node execution failed: ${nextNodeId}`, error);
        nodeResult = {
          status: 'failed',
          progressMessage: `执行失败: ${(error as Error).message}`,
        } as Partial<S>;
      }

      if (nodeResult) {
        currentState = {
          ...currentState,
          ...nodeResult,
          updatedAt: new Date().toISOString(),
        } as S;
      }

      // 6. 更新进度追踪器
      await updateProgressFromState(currentState);

      // 7. 发送节点结束事件
      yield {
        node: nextNodeId,
        state: currentState,
        type: 'node_end',
      };

      iterations++;

      // 8. 检查完成状态
      if (currentState.status === 'completed' || currentState.status === 'failed') {
        // 保存最终检查点
        if (config.checkpointer) {
          await config.checkpointer.put(currentState, {
            threadId,
            checkpointId: `final-${iterations}`,
          });
        }
        break;
      }
    }
  }
}

// ============================================================
// 便捷工厂函数
// ============================================================

/**
 * 创建研究图
 */
export function createResearchGraph<S extends ResearchState = ResearchState>(
  config?: StateGraphConfig
): StateGraph<S> {
  return new StateGraph<S>({
    nodeTimeout: 300000,
    maxIterations: 20,
    ...config,
  });
}

/**
 * 添加所有研究节点
 */
export function addResearchNodes<S extends ResearchState>(
  graph: StateGraph<S>,
  nodes: {
    planner: NodeFunction<S>;
    searcher: NodeFunction<S>;
    extractor: NodeFunction<S>;
    analyzer: NodeFunction<S>;
    reporter: NodeFunction<S>;
    supervisor: NodeFunction<S>;
  }
): void {
  graph.addNode('planner', nodes.planner, '生成研究计划');
  graph.addNode('searcher', nodes.searcher, '执行搜索');
  graph.addNode('extractor', nodes.extractor, '提取内容');
  graph.addNode('analyzer', nodes.analyzer, '分析内容');
  graph.addNode('reporter', nodes.reporter, '生成报告');
  graph.addNode('supervisor', nodes.supervisor, '监督协调');
}

/**
 * 添加所有研究边（使用条件路由）
 *
 * 关键：Supervisor 节点执行后，通过 currentStep 返回下一个节点
 * 我们使用条件边来根据 currentStep 的值路由到对应的节点
 */
export function addResearchEdges<S extends ResearchState>(
  graph: StateGraph<S>
): void {
  // 设置入口点
  graph.setEntryPoint('supervisor');

  // 所有工作节点完成后回到 supervisor
  graph.addEdge('planner', 'supervisor');
  graph.addEdge('searcher', 'supervisor');
  graph.addEdge('extractor', 'supervisor');
  graph.addEdge('analyzer', 'supervisor');
  graph.addEdge('reporter', 'completed');

  // Supervisor 的条件路由：根据 currentStep 决定下一步
  // Supervisor 执行时会设置 currentStep 为下一个要执行的节点
  // 初始状态 currentStep = 'supervisor' 时，默认返回 'planner'
  graph.addConditionalEdges(
    'supervisor',
    (state: ResearchState) => {
      if (state.currentStep === 'supervisor') {
        return 'planner';  // 初始状态默认去 planner
      }
      if (state.currentStep === 'done') {
        return '__end__';  // 任务完成
      }
      return state.currentStep;
    },
    {
      'planner': 'planner',
      'searcher': 'searcher',
      'extractor': 'extractor',
      'analyzer': 'analyzer',
      'reporter': 'reporter',
      '__end__': '__end__',
    }
  );

  // 设置结束点
  graph.setEndPoint('completed');
  graph.setEndPoint('failed');
}

/**
 * 创建默认研究图（完整配置）
 */
export function createDefaultResearchGraph<S extends ResearchState = ResearchState>(
  nodes: {
    planner: NodeFunction<S>;
    searcher: NodeFunction<S>;
    extractor: NodeFunction<S>;
    analyzer: NodeFunction<S>;
    reporter: NodeFunction<S>;
    supervisor: NodeFunction<S>;
  },
  config?: StateGraphConfig
): CompiledGraph<S> {
  const graph = createResearchGraph<S>(config);
  addResearchNodes(graph, nodes);
  addResearchEdges(graph);
  return graph.compile();
}

/**
 * 路由器工厂 - 创建 supervisor 路由器
 */
export function createSupervisorRouter(
  routes: Record<string, string | '__end__'>
): ConditionFunction<ResearchState> {
  return (state: ResearchState): string => {
    // Supervisor 返回的 currentStep 就是下一个节点
    const nextStep = state.currentStep;
    if (routes[nextStep]) {
      return routes[nextStep] === '__end__' ? '__end__' : routes[nextStep];
    }
    // 默认：如果状态是 completed，结束
    if (state.status === 'completed') {
      return '__end__';
    }
    return 'planner'; // 默认回到 planner
  };
}
