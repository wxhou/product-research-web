# Spec: Content Extraction with zcaceres/fetch-mcp

## Overview

定义使用 zcaceres/fetch-mcp MCP Server 作为网页内容提取工具的规范，替换原有的 Crawl4AI 实现。

---

## ADDED Requirements

### Requirement: 使用 MCP fetch_markdown 工具提取内容

系统 SHALL 通过 MCP 协议调用 zcaceres/fetch-mcp 的 `fetch_markdown` 工具获取网页 Markdown 内容。

#### Scenario: 使用 fetch_markdown 提取单个 URL

**Given** 用户启用了 MCP Fetch 模式
**When** Extractor Agent 调用 `mcpFetch.crawl(url)` 方法
**Then** 系统应通过 MCP Client 调用 `fetch_markdown` 工具
**And** 返回结果包含 Markdown 格式内容
**And** 返回结果包含 `title`、`url`、`content`、`source` 字段
**And** 返回的 `content` 长度不超过配置的 `max_length`（默认 50000 字符）

### Requirement: 批量提取多个 URL 内容

系统 SHALL 支持并行批量提取多个 URL，提高内容采集效率。单个 URL 的提取失败 SHALL NOT 影响其他 URL 的提取。

#### Scenario: 批量提取多个 URL 内容

**Given** Extractor Agent 需要爬取 N 个 URL
**When** 调用 `mcpFetch.crawlMultiple(urls)` 方法
**Then** 系统应并行调用 MCP fetch_markdown 工具获取所有 URL 内容
**And** 返回结果按输入顺序排列
**And** 单个 URL 提取失败不应影响其他 URL

### Requirement: MCP Server 不可用时的降级处理

当 MCP Server 不可用时，系统 SHALL 优雅降级，避免中断整个研究流程。

#### Scenario: MCP Server 不可用

**Given** MCP Server 无法连接或返回错误
**When** 调用内容提取方法
**Then** 系统应返回降级结果（空内容或原始搜索结果）
**And** 应记录错误日志便于排查
**And** 不应抛出异常中断研究流程

### Requirement: 内容提取质量检查

系统 SHALL 对提取的内容进行质量检查，确保获取到有效的页面内容。

#### Scenario: 内容提取质量检查

**Given** 成功提取的网页内容
**When** 检查内容质量
**Then** 应验证 `content.length > 100`（避免空页面）
**And** 应尝试从 Markdown 中提取标题（第一行 # 标题）
**And** 应保留原始 URL 作为来源标识

### Requirement: MCP Fetch Server 配置

系统 SHALL 支持通过环境变量配置 MCP Fetch Server 的启用状态和参数。

#### Scenario: 配置 MCP Fetch Server

**Given** 系统启动
**When** 读取环境变量 `ENABLE_MCP_FETCH`、`MCP_FETCH_COMMAND`、`MCP_FETCH_ARGS`
**Then** 如果 `ENABLE_MCP_FETCH=true`，启动 MCP Fetch Server 子进程
**And** 使用 `MCP_FETCH_COMMAND` 和 `MCP_FETCH_ARGS` 作为启动命令
**And** 使用 `DEFAULT_LIMIT` 环境变量配置最大内容长度

---

## MODIFIED Requirements

### Requirement: 移除 crawl4ai 数据源类型

系统 SHALL 移除原有的 `crawl4ai` 数据源类型，改为使用 `mcp-fetch`。升级过程 SHALL 确保已有项目的兼容性。

#### Scenario: 移除 crawl4ai 数据源

**Given** 现有项目使用 `crawl4ai` 数据源
**When** 升级到新版本
**Then** 应在迁移过程中移除 `crawl4ai` 类型
**And** 配置界面不再显示 Crawl4AI 配置选项
**And** 已有项目应能正常运行（使用备用的简单爬取）

### Requirement: Extractor Agent 使用 MCP 提取工具

Extractor Agent SHALL 使用新的 `McpFetchService` 进行网页内容提取，同时保持原有的压缩和实体提取功能。

#### Scenario: 使用 MCP 提取工具

**Given** Extractor Agent 需要爬取网页内容
**When** 调用 `createCrawlTools()` 创建爬取工具
**Then** 应使用 `McpFetchService` 进行内容提取
**And** 保持原有的 `compress()` 和 `extractEntities()` 功能
**And** 保持原有的并发控制（maxConcurrency: 3）

---

## REMOVED Requirements

### Requirement: 移除 Crawl4AI 相关实现

以下 Crawl4AI 相关的实现 SHALL 被移除：

- `Crawl4AIService` 类实现
- `crawl4ai` 数据源类型
- `crawl4ai_config` 数据库配置项
- 设置页面的 Crawl4AI 配置 UI

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @modelcontextprotocol/sdk | ^1.0.0 | MCP 协议 SDK |

## MCP Server

| Tool | Purpose | Parameters |
|------|---------|------------|
| fetch_markdown | 获取 Markdown 内容 | url, max_length, headers, start_index |
| fetch_html | 获取原始 HTML | url, max_length, headers, start_index |
| fetch_json | 获取 JSON 数据 | url, max_length, headers |
| fetch_txt | 获取纯文本 | url, max_length, headers |

---

## Cross-References

- Related: `specs/research-agent/extractor` - Extractor Agent 规范
- Related: `specs/datasources/search` - 搜索数据源规范
