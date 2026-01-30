/**
 * MCP Client Manager
 *
 * 负责管理与 MCP Server 的连接（通过 stdio 传输）
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Tool, TextContent, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

interface McpToolResult {
  content: TextContent[];
}

/**
 * MCP 客户端管理器
 *
 * 管理与 MCP Server 的生命周期连接
 */
export class McpClientManager {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private connected = false;
  private tools: Map<string, Tool> = new Map();

  /**
   * 连接到 MCP Server
   *
   * @param command 启动命令（如 'npx'）
   * @param args 命令参数（如 ['mcp-fetch-server']）
   * @param env 环境变量
   */
  async connect(command: string, args: string[], env?: Record<string, string>): Promise<void> {
    if (this.connected) {
      await this.disconnect();
    }

    this.transport = new StdioClientTransport({
      command,
      args,
      env: {
        ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined)) as Record<string, string>,
        ...Object.fromEntries(Object.entries(env || {}).filter(([, v]) => v !== undefined)) as Record<string, string>,
      },
    });

    this.client = new Client({
      name: 'product-research-web',
      version: '1.0.0',
    });

    await this.client.connect(this.transport);
    this.connected = true;

    // 获取可用工具列表
    const { tools } = await this.client.listTools();
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }

    console.log(`[MCP] Connected to fetch-mcp, tools: ${Array.from(this.tools.keys()).join(', ')}`);
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this.client = null;
    this.connected = false;
    this.tools.clear();
    console.log('[MCP] Disconnected from MCP server');
  }

  /**
   * 调用 MCP 工具
   *
   * @param name 工具名称
   * @param args 工具参数
   * @returns 工具调用结果
   */
  async callTool<T = McpToolResult>(name: string, args: Record<string, unknown>): Promise<T> {
    if (!this.client || !this.connected) {
      throw new Error('MCP client not connected');
    }

    const result = await this.client.callTool({
      name,
      arguments: args,
    });

    return result as T;
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 获取工具列表
   */
  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * 检查指定工具是否可用
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }
}

// 单例实例
export const mcpClient = new McpClientManager();
