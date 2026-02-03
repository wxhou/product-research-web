# Change: 用 zcaceres/fetch-mcp 替换 Crawl4AI

## Why

当前系统使用 Crawl4AI 作为网页内容提取工具，需要额外部署独立服务（Docker 或本地服务）。这导致：

1. **部署复杂** - 需要额外的 Docker 容器或本地服务进程
2. **运维成本** - 需要监控和管理 Crawl4AI 服务的可用性和健康状态
3. **资源占用** - 独立服务占用额外系统资源
4. **配置繁琐** - 用户需要在设置页面配置 Crawl4AI 的 URL

**解决方案**：使用 zcaceres/fetch-mcp MCP Server

## What Changes

- **移除 Crawl4AI 依赖**：
  - 删除 `Crawl4AIService` 类
  - 删除 `crawl4ai_config` 数据库配置
  - 删除相关的数据源类型 `'crawl4ai'`

- **新增 MCP Fetch 集成**：
  - 创建 `src/lib/mcp/fetch.ts` 封装 MCP 客户端
  - 使用 `fetch_markdown` 工具获取 Markdown 内容
  - 通过 stdio 传输与 MCP Server 通信

- **修改 Extractor Agent**：
  - 更新 `extractor/tools.ts` 使用新的 MCP 提取服务
  - 保持原有的 `compress()` 和 `extractEntities()` 功能

- **更新配置和文档**：
  - 更新设置页面，移除 Crawl4AI 配置项
  - 添加 MCP Server 启动说明

## Impact

### Affected Code

- `src/lib/datasources/index.ts` - 重构内容提取服务
- `src/lib/research-agent/workers/extractor/tools.ts` - 更新爬取工具
- `src/lib/mcp/` - 新增 MCP 客户端模块
- `src/app/settings/page.tsx` - 移除 Crawl4AI 配置 UI

### 新增依赖

- `@modelcontextprotocol/sdk` - MCP 协议 SDK

### Breaking Changes

- 移除 `crawl4ai` 数据源类型
- 移除 `crawl4ai_config` 数据库配置

## Why zcaceres/fetch-mcp

| 方案 | 优势 | 劣势 |
|------|------|------|
| **zcaceres/fetch-mcp** | 代码简洁、4 种工具、无图片处理依赖 | 需启动子进程 |
| 直接 HTTP + Turndown | 无需额外进程 | 需要自己实现 HTML 转换 |
| firecrawl | 功能强大、API 成熟 | 需要 API Key、付费服务 |

**选择 zcaceres/fetch-mcp 的理由**：
1. **4 种工具** - html/json/txt/markdown，灵活选择
2. **代码简洁** - 更容易理解和维护
3. **自带 Turndown** - 无需额外安装 turndown/jsdom
4. **可配置字符限制** - DEFAULT_LIMIT 环境变量
5. **支持自定义头** - 更灵活的请求控制

## MCP Server 启动方式

### 子进程模式（推荐）

```bash
# 启动 MCP Fetch Server 作为子进程
npx mcp-fetch-server
```

应用通过 stdio 与 MCP Server 通信：

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

await mcpManager.connect('npx', ['mcp-fetch-server']);
```

### 环境变量配置

```bash
# 设置默认字符限制
export DEFAULT_LIMIT=50000
```

## Assumptions

1. 可以接受启动 MCP 子进程
2. 目标网站大多不需要 JavaScript 渲染即可获取内容
3. 50000 字符限制对于产品调研场景基本够用
