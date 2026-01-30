# Spec: State Storage Format

**Capability**: `state-storage`

**Version**: 1.0.0

**Last Updated**: 2026-01-29

## Overview

Research state is stored as Markdown files with Frontmatter for metadata. This format provides:
- Human-readable content
- Easy version control (Git)
- Direct frontend rendering (react-markdown)
- No serialization overhead

## File Naming

- **Path**: `task-data/{projectId}.md`
- **Example**: `task-data/proj_abc123.md`

## Frontmatter Schema

The Frontmatter section at the top of the file contains all metadata:

```yaml
---
projectId: string           # 唯一项目 ID
title: string              # 项目标题
description: string         # 项目描述
keywords: string[]          # 关键词数组（JSON 字符串）
status: researching | completed | failed
progress: number            # 0-100
progressMessage: string     # 当前进度描述
createdAt: string           # ISO 8601 时间戳
updatedAt: string           # ISO 8601 时间戳
iterationsUsed: number      # 已完成迭代次数
totalSearches: number       # 总搜索次数
currentStep: planning | searching | extracting | analyzing | reporting
errorMessage?: string       # 错误信息（如果有）
---
```

## File Structure

```
task-data/{projectId}.md
│
├── Frontmatter (metadata)
│
├── ## Search Results
│   └── Markdown table with columns
│
├── ## Extracted Content
│   ├── ### {url}
│   │   - Source info
│   │   - Timestamp
│   │   - Content (truncated if needed)
│   │
│   └── ... (more URLs)
│
├── ## Analysis
│   ├── ### Features
│   ├── ### Competitors
│   ├── ### SWOT
│   ├── ### Market Data
│   └── ### Recommendations
│
├── ## Data Quality
│   ├── ### Score
│   ├── ### Coverage
│   └── ### Missing Dimensions
│
└── ## Citations
    └── Numbered list of sources
```

## Section Specifications

### Search Results Table

| Column | Type | Description |
|--------|------|-------------|
| Source | string | 数据源名称 (e.g., "DuckDuckGo", "RSS-HackerNews") |
| Title | string | 结果标题 |
| URL | link | 原始链接 |
| Quality | number | 质量评分 (1-10) |
| Crawled | boolean | 是否已爬取完整内容 |
| Query | string | 触发此结果的搜索查询 |
| Dimension | string | 所属研究维度 |

**Example**:

```markdown
## Search Results

| Source | Title | URL | Quality | Crawled | Query | Dimension |
|--------|-------|-----|---------|---------|-------|-----------|
| DuckDuckGo | 产品 A 介绍 | https://a.com | 8 | true | 预测性维护 AI | 功能特性 |
| RSS-HackerNews | 新产品发布 | https://b.com | 7 | false | 工业物联网 | 市场动态 |
```

### Extracted Content Section

Each URL gets its own subsection with metadata header:

```markdown
### https://example.com/product

**来源**: DuckDuckGo
**爬取时间**: 2026-01-29T10:05:00Z
**内容长度**: 5000 字
**质量评分**: 8

[完整 Markdown 格式的内容]
```

### Analysis Section

```markdown
## Analysis

### Features

| 功能 | 出现次数 | 占比 |
|------|---------|------|
| 实时监测 | 15 | 85% |
| 故障预测 | 12 | 68% |

### Competitors

| 名称 | 行业 | 核心功能 | 描述 |
|------|------|---------|------|
| 产品 A | 制造业 | 实时监测, 故障预测 | 完整解决方案 |

### SWOT

**优势**:
- 技术领先
- 功能完整

**劣势**:
- 价格较高

**机会**:
- 市场需求增长

**威胁**:
- 竞争加剧

### Market Data

- **市场规模**: 百亿级
- **增长率**: 15-20%
- **主要玩家**: 厂商 A, 厂商 B, 厂商 C
```

### Data Quality Section

```markdown
## Data Quality

### Score

当前数据质量评分: 75/100

### Coverage

| 维度 | 覆盖率 |
|------|--------|
| 功能特性 | 90% |
| 竞品信息 | 60% |
| 技术架构 | 75% |

### Missing Dimensions

- 定价信息
- 用户评价
```

### Citations Section

```markdown
## Citations

1. [产品 A](https://a.com) - 相关性: 8 - 2026-01-29
2. [产品 B](https://b.com) - 相关性: 7 - 2026-01-29
```

## Reading the State

To parse the state file:

```typescript
interface ParsedState {
  frontmatter: Frontmatter;
  searchResults: SearchResult[];
  extractedContent: ExtractedContent[];
  analysis: AnalysisSection | null;
  dataQuality: DataQualitySection | null;
  citations: Citation[];
}

function parseStateFile(content: string): ParsedState {
  // 1. Split frontmatter and content
  // 2. Parse YAML frontmatter
  // 3. Parse Markdown tables
  // 4. Extract sections by headers
}
```

## Writing the State

To update the state file:

```typescript
function updateState(
  projectId: string,
  updates: Partial<Frontmatter>,
  newSearchResults?: SearchResult[],
  newAnalysis?: AnalysisSection
): void {
  const filePath = `task-data/${projectId}.md`;
  const content = readFile(filePath);

  // 1. Update frontmatter
  // 2. Append new search results to table
  // 3. Update analysis section

  writeFile(filePath, content);
}
```

## Validation Rules

1. **Frontmatter Required**: File must start with `---`
2. **Valid YAML**: Frontmatter must be parseable
3. **Required Fields**: projectId, title, status
4. **Tables Valid**: Markdown tables must have matching columns
5. **URLs Valid**: All URLs must be valid format

## ADDED Requirements

### Requirement: Frontmatter Schema

The state file SHALL use YAML Frontmatter for metadata.

#### Scenario: Frontmatter contains required fields
- **WHEN** the state file is created
- **THEN** it SHALL start with `---`
- **AND** the Frontmatter SHALL include: projectId, title, status, progress, progressMessage, createdAt, updatedAt

### Requirement: Search Results Table

Search results SHALL be stored in Markdown tables.

#### Scenario: Search results stored in table
- **WHEN** search results are saved
- **THEN** they SHALL be formatted as Markdown tables
- **AND** the table SHALL include columns: Source, Title, URL, Quality, Crawled, Query, Dimension

### Requirement: Extracted Content Sections

Each extracted URL SHALL have its own subsection.

#### Scenario: Extracted content stored by URL
- **WHEN** content is extracted from a URL
- **THEN** it SHALL be stored in a subsection named after the URL
- **AND** the subsection SHALL include metadata: source, timestamp, content length, quality score

### Requirement: Analysis Sections

Analysis results SHALL be stored in structured sections.

#### Scenario: Analysis stored in sections
- **WHEN** analysis is complete
- **THEN** features SHALL be stored in a table
- **AND** competitors SHALL be stored in a table
- **AND** SWOT SHALL be stored in bullet lists with headers
