/**
 * MCP Module
 *
 * 封装 MCP 客户端和 Fetch 服务的初始化和管理
 */

import { mcpClient, McpClientManager } from './client';
import { createMcpFetchService, getMcpFetchService, McpFetchService } from './fetch';

let initialized = false;

/**
 * 初始化 MCP 客户端
 *
 * @param command 启动命令（默认: npx）
 * @param args 命令参数（默认: mcp-fetch-server）
 * @param env 环境变量
 */
export async function initializeMcpClient(
  command?: string,
  args?: string[],
  env?: Record<string, string>
): Promise<void> {
  if (initialized) {
    console.log('[MCP] Already initialized, skipping...');
    return;
  }

  // 检查是否启用
  if (process.env.ENABLE_MCP_FETCH !== 'true') {
    console.log('[MCP] MCP Fetch disabled (ENABLE_MCP_FETCH != true)');
    return;
  }

  const cmd = command || process.env.MCP_FETCH_COMMAND || 'npx';
  const serverArgs = args || (process.env.MCP_FETCH_ARGS || 'mcp-fetch-server').split(',');

  const serverEnv: Record<string, string> = {
    DEFAULT_LIMIT: process.env.MCP_FETCH_MAX_LENGTH || '50000',
    ...env,
  };

  try {
    console.log(`[MCP] Connecting to MCP server: ${cmd} ${serverArgs.join(' ')}`);
    await mcpClient.connect(cmd, serverArgs, serverEnv);
    createMcpFetchService(mcpClient);
    initialized = true;
    console.log('[MCP] MCP Fetch service initialized successfully');
  } catch (error) {
    console.error('[MCP] Failed to initialize MCP client:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * 关闭 MCP 客户端连接
 */
export async function shutdownMcpClient(): Promise<void> {
  if (!initialized) {
    return;
  }

  await mcpClient.disconnect();
  initialized = false;
  console.log('[MCP] MCP client shutdown complete');
}

/**
 * 检查 MCP 客户端是否已初始化
 */
export function isMcpInitialized(): boolean {
  return initialized;
}

/**
 * 获取 MCP 客户端管理器
 */
export function getMcpClient(): McpClientManager {
  return mcpClient;
}

/**
 * 获取 MCP Fetch 服务
 */
export function getFetchService(): McpFetchService | null {
  return getMcpFetchService();
}

// 导出类型
export type { McpFetchContent, McpFetchSearchResult } from './fetch';
