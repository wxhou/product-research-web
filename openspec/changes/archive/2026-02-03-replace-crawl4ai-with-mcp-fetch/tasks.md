# Tasks: 用 zcaceres/fetch-mcp 替换 Crawl4AI

## 1. 准备阶段

- [ ] 1.1 安装 MCP SDK 依赖 `@modelcontextprotocol/sdk`
- [ ] 1.2 测试 mcp-fetch-server 安装 (`npx mcp-fetch-server`)
- [ ] 1.3 验证 `fetch_markdown` 工具调用效果
- [ ] 1.4 确定配置参数（DEFAULT_LIMIT 字符限制）

## 2. 新增 MCP 客户端模块

### 2.1 创建 MCP 客户端管理器

- [ ] 2.1.1 创建 `src/lib/mcp/client.ts` 文件
- [ ] 2.1.2 实现 `McpClientManager` 类
- [ ] 2.1.3 实现 `connect()` 方法（支持 stdio 传输）
- [ ] 2.1.4 实现 `disconnect()` 方法
- [ ] 2.1.5 实现 `callTool()` 方法调用 MCP 工具
- [ ] 2.1.6 实现 `listTools()` 方法获取可用工具

### 2.2 创建 McpFetchService

- [ ] 2.2.1 创建 `src/lib/mcp/fetch.ts` 文件
- [ ] 2.2.2 实现 `McpFetchService` 类（实现 `SearchService` 接口）
- [ ] 2.2.3 实现 `crawl()` 方法（调用 fetch_markdown）
- [ ] 2.2.4 实现 `crawlMultiple()` 方法
- [ ] 2.2.5 实现 `isAvailable()` 健康检查
- [ ] 2.2.6 实现服务初始化和关闭函数

### 2.3 创建 MCP 模块导出

- [ ] 2.3.1 创建 `src/lib/mcp/index.ts` 导出文件
- [ ] 2.3.2 导出 `initializeMcpClient()`
- [ ] 2.3.3 导出 `shutdownMcpClient()`
- [ ] 2.3.4 导出 `getMcpFetchService()`

## 3. 代码修改

### 3.1 重构 datasources/index.ts

- [ ] 3.1.1 移除 `Crawl4AIService` 类
- [ ] 3.1.2 导入 `getMcpFetchService()` 从新 MCP 模块
- [ ] 3.1.3 更新 `getCrawl4AIService()` 为 `getMcpFetchService()`
- [ ] 3.1.4 更新 `crawlUrl()` 和 `crawlUrls()` 函数使用 MCP
- [ ] 3.1.5 移除 `crawl4ai` 类型相关代码

### 3.2 更新 Extractor 工具

- [ ] 3.2.1 修改 `src/lib/research-agent/workers/extractor/tools.ts`
- [ ] 3.2.2 将 `crawlUrls` 导入改为使用 `getMcpFetchService()`
- [ ] 3.2.3 验证 `compress()` 和 `extractEntities()` 功能正常

### 3.3 更新类型定义

- [ ] 3.3.1 在 `types.ts` 添加 `mcp-fetch` 数据源类型
- [ ] 3.3.2 添加 `McpFetchContent` 类型（用于存储提取信息）

## 4. 服务集成

### 4.1 Next.js 应用集成

- [ ] 4.1.1 在应用启动时调用 `initializeMcpClient()`
- [ ] 4.1.2 在应用关闭时调用 `shutdownMcpClient()`
- [ ] 4.1.3 处理 MCP 客户端生命周期（开发/生产环境）

### 4.2 环境变量配置

- [ ] 4.2.1 添加 `ENABLE_MCP_FETCH` 环境变量
- [ ] 4.2.2 添加 `MCP_FETCH_COMMAND`（默认: npx）
- [ ] 4.2.3 添加 `MCP_FETCH_ARGS`（默认: mcp-fetch-server）
- [ ] 4.2.4 添加 `MCP_FETCH_MAX_LENGTH`（默认: 50000）
- [ ] 4.2.5 更新 `.env.example` 文件

## 5. 数据库迁移

- [ ] 5.1 创建数据库迁移脚本（移除 `crawl4ai_config`）
- [ ] 5.2 更新数据源配置表（移除 crawl4ai）

## 6. 测试

- [ ] 6.1 编写 `McpClientManager` 单元测试
- [ ] 6.2 编写 `McpFetchService` 单元测试
- [ ] 6.3 验证 MCP 工具调用（模拟 fetch_markdown 响应）
- [ ] 6.4 测试批量提取并发控制
- [ ] 6.5 测试服务器不可用时的降级处理
- [ ] 6.6 端到端测试完整研究流程

## 7. 文档和清理

- [ ] 7.1 更新 README 添加 MCP Fetch Server 启动说明
- [ ] 7.2 清理未使用的导入和类型定义
- [ ] 7.3 验证 TypeScript 编译通过
- [ ] 7.4 运行 ESLint 检查

## 依赖关系

```
1. 准备阶段
   │
   ▼
2.1 McpClientManager ───────┐
   │                        │
   ▼                        │
2.2 McpFetchService ────────┼──> 2.3 MCP 模块导出
   │                        │
   ▼                        ▼
3.1 datasources 重构 ────> 3.2 Extractor 更新 ──> 4. 服务集成
   │                        │                          │
   ▼                        ▼                          ▼
5. 数据库迁移 ──────────> 6. 测试 ─────────────> 7. 文档
```
