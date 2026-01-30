# Design: 用 zcaceres/fetch-mcp 替换 Crawl4AI

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                    Product Research Web                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Extractor Agent (Worker)                     │  │
│  │  ┌────────────────┐    ┌─────────────────────────────┐   │  │
│  │  │ tools.ts       │───>│ createCrawlTools()          │   │  │
│  │  └────────────────┘    └─────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              McpFetchService                              │  │
│  │  ┌────────────────┐    ┌─────────────────────────────┐   │  │
│  │  │ MCP SDK Client │───>│ - callTool('fetch_markdown')│   │  │
│  │  └────────────────┘    └─────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              StdioClientTransport                         │  │
│  │         (子进程通信: npx mcp-fetch-server)                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## zcaceres/fetch-mcp 工具

| 工具名 | 用途 | 返回格式 |
|--------|------|----------|
| `fetch_html` | 获取原始 HTML | HTML 字符串 |
| `fetch_json` | 获取 JSON 数据 | JSON 对象 |
| `fetch_txt` | 获取纯文本 | 纯文本 |
| `fetch_markdown` | 获取 Markdown | Markdown 字符串 |

## MCP 客户端实现

### 1. McpClientManager 类

```typescript
// src/lib/mcp/client.ts

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Tool, TextContent } from '@modelcontextprotocol/sdk/types.js';

interface McpToolResult {
  content: TextContent[];
}

class McpClientManager {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private connected = false;
  private tools: Map<string, Tool> = new Map();

  /**
   * 连接到 MCP Server
   */
  async connect(command: string, args: string[], env?: Record<string, string>): Promise<void> {
    if (this.connected) {
      await this.disconnect();
    }

    this.transport = new StdioClientTransport({
      command,
      args,
      env: {
        ...process.env,
        ...env,
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
  }

  /**
   * 调用工具
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
}

export const mcpClient = new McpClientManager();
```

### 2. McpFetchService 类

```typescript
// src/lib/mcp/fetch.ts

import type { SearchResult } from '../datasources';

interface FetchArgs {
  url: string;
  max_length?: number;
  headers?: Record<string, string>;
  start_index?: number;
}

class McpFetchService implements SearchService {
  name = 'MCP Fetch';
  type = 'mcp-fetch' as DataSourceType;

  private mcpManager: McpClientManager;
  private enabled: boolean;
  private maxLength: number;

  constructor(mcpManager: McpClientManager) {
    this.mcpManager = mcpManager;
    this.enabled = !!process.env.ENABLE_MCP_FETCH;
    this.maxLength = parseInt(process.env.MCP_FETCH_MAX_LENGTH || '50000', 10);
  }

  /**
   * 单个 URL 爬取（通过 MCP 工具调用）
   */
  async crawl(
    url: string,
    originalContent?: string,
    options?: { timeout?: number; maxLength?: number }
  ): Promise<SearchResult | null> {
    if (!this.enabled || !this.mcpManager.isConnected()) {
      return null;
    }

    try {
      const result = await this.mcpManager.callTool<{
        content: Array<{ type: string; text: string }>;
      }>('fetch_markdown', {
        url,
        max_length: options?.maxLength || this.maxLength,
      } as FetchArgs);

      // 解析返回结果
      const textContent = result.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('\n');

      // 尝试从 Markdown 中提取标题（第一行 # 标题）
      const titleMatch = textContent.match(/^# (.+)$/m);
      const title = titleMatch?.[1] || url;

      return {
        title,
        url,
        content: textContent,
        source: 'mcp-fetch',
        mcpFetchContent: {
          original: originalContent || '',
          enriched: textContent,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error(`[MCP Fetch] Failed to fetch ${url}:`, error);
      return null;
    }
  }

  /**
   * 批量爬取
   */
  async crawlMultiple(
    urls: string[],
    originalContents?: Map<string, string>,
    options?: { timeout?: number; maxLength?: number }
  ): Promise<SearchResult[]> {
    const results = await Promise.all(
      urls.map((url) => this.crawl(url, originalContents?.get(url), options))
    );
    return results.filter((r): r is SearchResult => r !== null);
  }

  /**
   * 健康检查
   */
  async isAvailable(): Promise<boolean> {
    return this.mcpManager.isConnected();
  }
}

let fetchService: McpFetchService | null = null;

export function getMcpFetchService(): McpFetchService | null {
  return fetchService;
}

export function createMcpFetchService(manager: McpClientManager): McpFetchService {
  fetchService = new McpFetchService(manager);
  return fetchService;
}
```

### 3. MCP 模块初始化

```typescript
// src/lib/mcp/index.ts

import { mcpClient, McpClientManager } from './client';
import { createMcpFetchService } from './fetch';

let initialized = false;

export async function initializeMcpClient(): Promise<void> {
  if (initialized) return;
  if (!process.env.ENABLE_MCP_FETCH) {
    console.log('[MCP] MCP Fetch disabled');
    return;
  }

  const command = process.env.MCP_FETCH_COMMAND || 'npx';
  const args = (process.env.MCP_FETCH_ARGS || 'mcp-fetch-server').split(',');
  const env = {
    DEFAULT_LIMIT: process.env.MCP_FETCH_MAX_LENGTH || '50000',
  };

  try {
    await mcpClient.connect(command, args, env);
    createMcpFetchService(mcpClient);
    initialized = true;
    console.log('[MCP] MCP Fetch service initialized');
  } catch (error) {
    console.error('[MCP] Failed to initialize MCP Fetch:', error);
  }
}

export async function shutdownMcpClient(): Promise<void> {
  await mcpClient.disconnect();
  initialized = false;
}

export { McpClientManager, mcpClient };
```

## 配置方式

### 环境变量

```bash
# 启用 MCP Fetch
export ENABLE_MCP_FETCH=true

# MCP Server 启动命令
export MCP_FETCH_COMMAND=npx
export MCP_FETCH_ARGS=mcp-fetch-server

# 最大内容长度（字符）
export MCP_FETCH_MAX_LENGTH=50000
```

### Claude Desktop 配置参考

```json
{
  "mcpServers": {
    "fetch": {
      "command": "npx",
      "args": ["mcp-fetch-server"],
      "env": { "DEFAULT_LIMIT": "50000" }
    }
  }
}
```

## 数据流

```
1. Extractor Agent 获取待爬取 URL 列表
2. 调用 tools.crawlAll(results)
3. tools.ts 调用 mcpFetchService.crawlMultiple(urls)
4. McpFetchService 调用 mcpManager.callTool('fetch_markdown', { url, max_length })
5. MCP Client 发送 JSON-RPC 请求到 MCP Server
6. MCP Server 执行 fetch_markdown，返回 Markdown 内容
7. 提取 entities（features, competitors, techStack）
8. 返回 ExtractionResult[] 更新状态
```

## 错误处理

```typescript
async function safeFetch(url: string): Promise<SearchResult | null> {
  try {
    return await mcpFetchService.crawl(url);
  } catch (error) {
    console.error(`Fetch failed for ${url}:`, error);
    // 返回降级结果，使用原始搜索结果
    return null;
  }
}
```
