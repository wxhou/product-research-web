/**
 * MCP Fetch Service
 *
 * 使用 zcaceres/fetch-mcp 的 fetch_markdown 工具获取网页内容
 */

import type { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { mcpClient, McpClientManager } from './client';

/**
 * MCP Fetch 配置接口
 */
export interface McpFetchConfig {
  enabled: boolean;
  maxLength: number;
}

/**
 * MCP Fetch 内容结果
 */
export interface McpFetchContent {
  original: string;
  enriched: string;
  timestamp: string;
  contentLength: number;
}

/**
 * SearchResult 扩展（MCP Fetch 版本）
 */
export interface McpFetchSearchResult {
  title: string;
  url: string;
  content: string;
  source: string;
  publishedAt?: string;
  author?: string;
  mcpFetchContent?: McpFetchContent;
}

/**
 * MCP Fetch 服务
 *
 * 实现 SearchService 接口，提供基于 MCP 的网页内容提取
 */
export class McpFetchService {
  name = 'MCP Fetch';
  type = 'mcp-fetch' as const;

  private mcpManager: McpClientManager;
  private enabled!: boolean;
  private maxLength!: number;

  constructor(mcpManager: McpClientManager) {
    this.mcpManager = mcpManager;
    // 优先从数据库读取配置，如果没有则使用环境变量
    this.loadConfig();
  }

  /**
   * 从数据库加载配置
   */
  private loadConfig(): void {
    try {
      const { settingsDb } = require('@/lib/db');
      const result = settingsDb.get.get({ key: 'mcp_fetch_config' }) as { value: string } | undefined;

      if (result?.value) {
        const config = JSON.parse(result.value) as McpFetchConfig;
        this.enabled = config.enabled;
        this.maxLength = config.maxLength || 50000;
      } else {
        // 回退到环境变量
        this.enabled = process.env.ENABLE_MCP_FETCH === 'true';
        this.maxLength = parseInt(process.env.MCP_FETCH_MAX_LENGTH || '50000', 10);
      }
    } catch (error) {
      console.error('[MCP Fetch] Failed to load config from database:', error);
      // 回退到环境变量
      this.enabled = process.env.ENABLE_MCP_FETCH === 'true';
      this.maxLength = parseInt(process.env.MCP_FETCH_MAX_LENGTH || '50000', 10);
    }

    if (this.enabled) {
      console.log(`[MCP Fetch] Enabled, maxLength: ${this.maxLength}`);
    } else {
      console.log('[MCP Fetch] Disabled');
    }
  }

  /**
   * 刷新配置（从数据库重新加载）
   */
  refreshConfig(): void {
    this.loadConfig();
  }

  /**
   * 更新配置并保存到数据库
   */
  async updateConfig(config: McpFetchConfig): Promise<void> {
    try {
      const { settingsDb } = require('@/lib/db');
      settingsDb.set.run({
        key: 'mcp_fetch_config',
        value: JSON.stringify(config),
      });
      // 更新内存中的配置
      this.enabled = config.enabled;
      this.maxLength = config.maxLength;
      console.log('[MCP Fetch] Config updated and saved to database');
    } catch (error) {
      console.error('[MCP Fetch] Failed to save config to database:', error);
      throw error;
    }
  }

  /**
   * 搜索方法（MCP Fetch 不支持搜索，返回空数组）
   */
  async search(_query: string, _limit = 10): Promise<McpFetchSearchResult[]> {
    console.log('[MCP Fetch] Direct search not supported, use crawl() method instead');
    return [];
  }

  /**
   * 使用 fetch_markdown 工具获取网页 Markdown 内容
   *
   * @param url 目标 URL
   * @param originalContent 原始内容（用于记录爬取前后对比）
   * @param options 可选配置
   * @returns 爬取结果
   */
  async crawl(
    url: string,
    originalContent?: string,
    options?: { timeout?: number; maxLength?: number }
  ): Promise<McpFetchSearchResult | null> {
    if (!this.enabled || !this.mcpManager.isConnected()) {
      return null;
    }

    const timeout = options?.timeout || 30000;
    const maxLength = options?.maxLength || this.maxLength;

    try {
      console.log(`[MCP Fetch] Crawling: ${url}`);

      const result = await Promise.race([
        this.mcpManager.callTool<CallToolResult>('fetch_markdown', {
          url,
          max_length: maxLength,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('MCP fetch timeout')), timeout)
        ),
      ]);

      // 解析返回结果
      const textContent = this.extractTextContent(result);

      if (!textContent || textContent.length < 100) {
        console.log(`[MCP Fetch] Content too short or empty for ${url}`);
        return null;
      }

      // 尝试从 Markdown 中提取标题（第一行 # 标题）
      const titleMatch = textContent.match(/^# (.+)$/m);
      const title = titleMatch?.[1] || url;

      const truncatedContent = textContent.substring(0, 5000);

      return {
        title,
        url,
        content: truncatedContent,
        source: 'mcp-fetch',
        mcpFetchContent: {
          original: originalContent || '',
          enriched: truncatedContent,
          timestamp: new Date().toISOString(),
          contentLength: truncatedContent.length,
        },
      };
    } catch (error) {
      console.error(`[MCP Fetch] Failed to fetch ${url}:`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * 批量爬取多个 URL
   *
   * @param urls URL 列表
   * @param originalContents 原始内容映射
   * @param options 可选配置
   * @returns 爬取结果数组
   */
  async crawlMultiple(
    urls: string[],
    originalContents?: Map<string, string>,
    options?: { timeout?: number; maxLength?: number }
  ): Promise<McpFetchSearchResult[]> {
    if (urls.length === 0) return [];
    if (!this.enabled || !this.mcpManager.isConnected()) {
      return [];
    }

    const results: McpFetchSearchResult[] = [];
    const timeout = options?.timeout || 30000;

    // 并行爬取（限制并发数）
    const concurrency = 3;
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(url => this.crawl(url, originalContents?.get(url), options))
      );

      for (const result of batchResults) {
        if (result) {
          results.push(result);
        }
      }
    }

    console.log(`[MCP Fetch] Crawled ${results.length}/${urls.length} URLs`);
    return results;
  }

  /**
   * 检查 MCP Fetch 服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    return this.enabled && this.mcpManager.isConnected();
  }

  /**
   * 从 MCP 工具结果中提取文本内容
   */
  private extractTextContent(result: CallToolResult): string {
    if (!result?.content || !Array.isArray(result.content)) {
      return '';
    }

    return result.content
      .filter((c): c is TextContent & { type: 'text' } => c.type === 'text')
      .map((c) => (c as TextContent & { type: 'text' }).text)
      .join('\n');
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// 单例实例
let fetchService: McpFetchService | null = null;

/**
 * 获取 MCP Fetch 服务实例
 */
export function getMcpFetchService(): McpFetchService | null {
  return fetchService;
}

/**
 * 创建并初始化 MCP Fetch 服务
 */
export function createMcpFetchService(manager: McpClientManager): McpFetchService {
  fetchService = new McpFetchService(manager);
  return fetchService;
}
