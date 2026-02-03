# Research Agent 技术文档

## 概述

Research Agent 是一个基于 **Agentic RAG（代理增强检索生成）** 架构的产品调研系统。它能够自动从多个数据源收集信息，进行深度分析，并生成结构化的产品调研报告。

### 核心特性

- **多轮迭代搜索**：基于反思机制，智能识别知识空白并补充搜索
- **混合提取策略**：优先使用 LLM 提取，兜底使用改进的正则提取
- **数据质量评估**：自动评估数据完整性，决定是否需要更多搜索
- **结构化输出**：生成包含引用、图表、数据质量评估的完整报告

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     Research Agent                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   计划阶段   │───>│   搜索阶段   │───>│   汇总与反思阶段     │  │
│  │ Plan        │    │ Search      │    │ Summarize & Reflect │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│         │                  │                     │               │
│         v                  v                     v               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    数据提取层                              │   │
│  │  ┌─────────────────┐    ┌─────────────────────────────┐  │   │
│  │  │  LLM 提取        │    │  基础提取 (正则+语义验证)     │  │   │
│  │  │ (优先)           │    │  (当 LLM 不可用时)          │  │   │
│  │  └─────────────────┘    └─────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              v                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    分析与报告生成                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │ 深度分析      │→│ 数据质量检查  │→│  生成最终报告  │   │   │
│  │  │ Deep Analysis│  │ Quality Check│  │ Generate     │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

数据源层：
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ DuckDuckGo│ │  GitHub  │ │   RSS    │ │  Brave   │ │  ...     │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

---

## 工作流程

### 整体流程（`runResearchAgent`）

```
开始
  │
  ▼
┌─────────────────────────┐
│  迭代搜索 (最多3轮)       │
│  for iteration in 0..2  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│  节点1: 制定研究计划      │     │  退出条件:               │
│  - 首次: 生成初始查询     │     │  - 数据质量分数 >= 60    │
│  - 后续: 根据反思生成补充 │     │  - 达到最大迭代次数      │
└───────────┬─────────────┘     └─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│  节点2: 执行网络搜索      │
│  - 并行执行多个查询       │
│  - 多数据源聚合          │
│  - 去重处理             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  节点3: 汇总结果          │
│  - Map: 并行处理每个结果  │
│  - Reduce: 合并汇总      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  节点4: 深度分析          │
│  - LLM 结构化分析        │
│  - 提取功能/竞品/SWOT等  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  节点5: 数据质量检查       │
│  - 评估覆盖率            │
│  - 识别数据缺口          │
│  - 决定是否继续搜索       │
└───────────┬─────────────┘
            │
            ▼
    ┌───────┴───────┐
    │               │
   继续            退出
    │               │
    ▼               ▼
  下一轮         ┌─────────────────────────┐
                 │  节点6: 生成最终报告      │
                 │  - 渲染 Markdown 报告    │
                 │  - 添加 Mermaid 图表     │
                 │  - 生成引用和附录        │
                 └───────────┬─────────────┘
                             │
                             ▼
                       ┌───────────────────┐
                       │      返回结果       │
                       └───────────────────┘
```

---

## 核心模块详解

### 1. 计划阶段（`planResearch`）

**功能**：根据研究主题生成针对性的搜索查询

**输入**：
- `title`: 研究主题
- `description`: 详细描述

**处理逻辑**：

| 场景 | 处理方式 |
|------|----------|
| 有 LLM API Key | 使用 LLM 生成 3-5 个针对性查询，每个有明确目的 |
| 无 API Key | 使用预设规则生成查询 |

**预设查询模板**：
```typescript
[
  { id: 'q1', query: title, purpose: '基础信息' },
  { id: 'q2', query: `${title} 对比 竞品`, purpose: '竞品分析' },
  { id: 'q3', query: `${title} 技术架构 AI`, purpose: '技术分析' },
  { id: 'q4', query: `${title} 市场 趋势 2024 2025`, purpose: '市场分析' },
  { id: 'q5', query: `${title} 应用案例 用户`, purpose: '使用案例' },
]
```

**数据源选择**：
- 有 API Key：`['brave', 'github']`
- 无 API Key：`['duckduckgo', 'github']`

---

### 2. 搜索阶段（`executeWebResearch`）

**功能**：并行执行多个搜索查询，聚合多数据源结果

**处理流程**：

```typescript
async function executeWebResearch(queries, targetSources) {
  const allResults = [];

  for (const queryInfo of queries) {
    // 对每个查询，遍历所有目标数据源
    for (const source of targetSources) {
      const results = await sourceManager.search({
        query: queryInfo.query,
        source: source,
        limit: 10,
      });
      allResults.push(...results);
    }
  }

  // 去重
  return deduplicateResults(allResults);
}
```

**去重策略**：
- 使用 URL 或标题作为唯一键
- 保留首次出现的结果

---

### 3. 数据提取层（`summarizeSingleResult`）

这是系统的核心创新点，采用**混合提取策略**。

#### 3.1 LLM 提取（优先）

**提示词设计**：

```markdown
你是一个专业的产品调研分析师。请从以下搜索结果中提取关键信息。

【搜索结果】
来源: {result.source}
标题: {result.title}
链接: {result.url}
内容摘要: {result.content}

【任务】
请提取以下信息（如果搜索结果中未提及，请明确标注"未提及"，不要编造）：

1. **核心功能特性**（3-5个）：产品/服务的核心功能，用简洁的中文描述
2. **主要竞品/替代方案**（2-5个）：明确提到的竞争对手或替代产品名称
3. **技术栈/实现方式**（2-5个）：提到的技术、框架、算法等
4. **使用场景/应用案例**（2-5个）：产品的主要使用场景
5. **市场信息**（100字以内）：提到的市场规模、增长率、用户群体等
6. **局限性/不足**（1-3个）：产品/方案的已知缺点

【重要规则】
- 只提取搜索结果中明确提到的信息
- 不要从标题或 URL 推断信息
- 如果某项信息未提及，设置为空数组或空字符串
- 竞品名称必须是完整的产品/公司名，不要提取 GitHub 仓库名
```

**输出格式**：
```json
{
  "keyPoints": ["核心要点1", "核心要点2", "核心要点3"],
  "features": ["功能1（简洁描述）", "功能2"],
  "competitors": ["竞品A", "竞品B"],
  "techStack": ["技术A", "技术B"],
  "useCases": ["场景1", "场景2"],
  "marketInfo": "市场相关信息",
  "limitations": ["局限性1"]
}
```

#### 3.2 基础提取（兜底）

当 LLM 不可用时，使用改进的正则提取。

**提取函数清单**：

| 函数名 | 提取内容 | 关键改进 |
|--------|----------|----------|
| `extractFeaturesImproved()` | 功能特性 | 标题分析 + 内容语义验证 |
| `extractCompetitorsImproved()` | 竞品名称 | 已知公司列表 + 格式验证 |
| `extractTechStack()` | 技术栈 | 关键词匹配 |
| `extractUseCasesImproved()` | 使用案例 | 场景模式匹配 + 噪声过滤 |
| `extractMarketInfo()` | 市场信息 | 规模/增长率模式匹配 |
| `extractKeyPoints()` | 关键点 | 有价值句子识别 |

**竞品提取示例**：

```typescript
function extractCompetitorsImproved(title, content) {
  const competitors = new Set();

  // 步骤1: 提取已知科技公司
  const knownCompanies = extractKnownCompanies(fullText);
  // 例如匹配: Google, Microsoft, OpenAI, 腾讯, 阿里等

  // 步骤2: 查找明确提及
  const explicitMentions = extractExplicitCompetitorMentions(content);
  // 例如匹配: "vs", "竞品", "替代品" 等

  // 步骤3: 验证和过滤
  return [...competitors]
    .filter(c => validateCompetitor(c, context))
    .slice(0, 5);
}
```

**验证规则**：
```typescript
function validateCompetitor(name, context) {
  // 排除 GitHub 仓库格式 (user/repo)
  if (githubRepoPattern.test(name)) return false;

  // 排除随机单词
  if (randomPattern.test(name)) return false;

  // 排除常见无效词
  if (excludePatterns.some(p => p.test(name))) return false;

  // 检查上下文相关性
  return contextPatterns.some(p => p.test(context));
}
```

---

### 4. 汇总阶段（`summarizeResults`）

采用 **Map-Reduce** 策略：

```typescript
async function summarizeResults(results, projectTitle) {
  // Map 阶段：并行处理每个搜索结果
  const individualSummaries = [];
  const batchSize = 5;

  for (let i = 0; i < Math.min(results.length, 50); i += batchSize) {
    const batch = results.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(r => summarizeSingleResult(r, projectTitle, hasApiKey))
    );
    individualSummaries.push(...batchResults);
  }

  // Reduce 阶段：合并汇总
  const allFeatures = [...new Set(individualSummaries.flatMap(s => s.features))];
  const allCompetitors = [...new Set(individualSummaries.flatMap(s => s.competitors))];
  // ...

  return { individualSummaries, comprehensiveSummary };
}
```

---

### 5. 反思阶段（`reflection`）

**功能**：分析已收集信息，识别知识空白，决定是否需要更多搜索

**评估维度**：
```typescript
const coverage = {
  features: new Set(summaries.flatMap(s => s.features)).size,
  competitors: new Set(summaries.flatMap(s => s.competitors)).size,
  techStack: new Set(summaries.flatMap(s => s.techStack)).size,
  useCases: new Set(summaries.flatMap(s => s.useCases)).size,
  marketInfo: summaries.filter(s => s.marketInfo && s.marketInfo.length > 10).length,
};
```

**判断逻辑**：
```typescript
if (!hasApiKey) {
  // 无 API Key 时使用简单规则
  const needsMore = coverage.features < 3 || coverage.competitors < 2;
  return { needsMoreResearch: needsMore };
}

// 有 API Key 时使用 LLM 分析
const prompt = `请分析当前收集的信息覆盖率...`;
```

---

### 6. 深度分析（`analyzeData`）

**功能**：对汇总数据进行深度结构化分析

**分析维度**：
```typescript
interface DeepAnalysis {
  features: {
    name: string;        // 功能名称
    count: number;       // 出现次数
    sources: string[];   // 来源
    description: string; // 描述
  }[];
  competitors: {
    name: string;
    features: string[];
    description: string;
    marketPosition: string;
  }[];
  swot: { strengths, weaknesses, opportunities, threats };
  marketData: { marketSize, growthRate, keyPlayers, trends, segments };
  techAnalysis: { architecture, techStack, emergingTech };
  userInsights: { personas, painPoints, requirements };
  opportunities: string[];
  risks: string[];
  recommendations: string[];
}
```

---

### 7. 数据质量检查（`checkDataQuality`）

**评分体系**（满分100）：

| 维度 | 权重 | 达标条件 |
|------|------|----------|
| 功能分析 | 25分 | >= 3 个功能 |
| 竞品分析 | 20分 | >= 2 个竞品 |
| 市场数据 | 20分 | 有市场规模或增长率 |
| 技术分析 | 15分 | >= 3 项技术 |
| 使用案例 | 20分 | >= 3 个场景 |

**完成条件**：
```typescript
const isComplete = score >= 60 || iterationCount >= maxIterations;
```

---

### 8. 报告生成（`generateReport`）

**报告结构**：

```
# {标题} - 产品深度调研报告

## 摘要
## 1. 调研方法论
## 2. 产品概述与核心功能
## 3. 竞品分析
## 4. 市场分析
## 5. 技术深度分析
## 6. SWOT 分析（含 Mermaid 思维导图）
## 7. 使用场景与用户洞察
## 8. 市场机会与风险
## 9. 调研产品详单
## 10. 引用来源
## 附录
  - A. 数据质量评估
  - B. 数据局限性说明
```

**Mermaid 图表**：
- SWOT 思维导图
- 用户旅程图
- 竞品雷达图
- 市场份额饼图

---

## 数据流

```
用户输入
    │
    ▼
┌─────────────────┐
│  runResearchAgent│
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  planResearch   │────>│ executeWebResearch──>│ summarizeResults │
│  生成搜索计划    │     │ 执行多源搜索     │     │ Map-Reduce 汇总  │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                          │
         ┌────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  reflection     │────>│  analyzeData    │────>│ checkDataQuality│
│  反思 & 补充    │     │  深度结构化分析  │     │  数据质量评估    │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                          │
         ┌────────────────────────────────────────────────┤
         │                                                │
         ▼                                                ▼
   需要更多搜索?                                     ┌─────────────────┐
         │                                            │ generateReport  │
         ▼                                            │  生成最终报告    │
   返回搜索阶段                                      └────────┬────────┘
         │                                                    │
         └────────────────────────────────────────►  ┌─────────────────┐
                                                      │   ResearchResult │
                                                      └─────────────────┘
```

---

## 返回结果

```typescript
interface ResearchResult {
  report: string;                    // Markdown 格式报告
  analysis: DeepAnalysis;            // 深度分析结果
  summary: ComprehensiveSummary;     // 综合汇总
  searchResults: SearchResult[];     // 搜索结果列表
  dataQuality: DataQualityCheck;     // 数据质量评估
  citations: Citation[];             // 引用列表
}

interface DataQualityCheck {
  isComplete: boolean;   // 是否完成
  score: number;         // 质量分数 (0-100)
  issues: string[];      // 问题列表
  suggestions: string[]; // 建议列表
  coverage: {
    features: boolean;
    competitors: boolean;
    market: boolean;
    technology: boolean;
    useCases: boolean;
  };
}
```

---

## 依赖关系

```
src/lib/research-agent/index.ts
├── src/lib/datasources/index.ts
│   └── SearchService 接口
├── src/lib/llm/index.ts
│   └── generateText(), getLLMConfig()
└── src/lib/analysis/index.ts (可选)
```

---

## 配置参数

```typescript
runResearchAgent(
  projectId: string,      // 项目ID
  userId: string,         // 用户ID
  title: string,          // 研究主题
  description: string = '', // 详细描述
  maxIterations: number = 3 // 最大迭代次数
)
```

---

## 性能优化

1. **并行处理**：搜索和汇总阶段使用 Promise.all 并行执行
2. **批量处理**：每批处理 5 个搜索结果，避免内存溢出
3. **结果限制**：单次研究最多处理 50 个搜索结果
4. **提前退出**：当数据质量达到阈值时提前结束迭代

---

## 扩展指南

### 添加新的数据源

1. 在 `src/lib/datasources/index.ts` 中实现 `SearchService` 接口
2. 在 `DataSourceType` 类型中添加新类型
3. 在 `DataSourceManager` 中注册新服务

### 添加新的分析维度

1. 在 `DeepAnalysis` 接口中添加新字段
2. 修改 `analyzeData` 函数生成新维度数据
3. 修改 `generateReport` 函数渲染新维度

### 改进提取质量

1. 修改 `summarizeSingleResult` 中的 LLM 提示词
2. 添加新的基础提取函数到 "改进版基础提取函数" 区域
3. 在 `validateFeature` / `validateCompetitor` 中添加新的验证规则
