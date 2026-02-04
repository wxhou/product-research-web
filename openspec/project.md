# Project Context

## Purpose

**Product Research Web** is a Next.js-based AI-powered product research platform. The system allows users to:

- Create research projects with titles, descriptions, and keywords
- Perform automated web research using multiple data sources (RSS feeds, search engines, GitHub, Reddit)
- Execute AI-driven research workflows using a multi-agent architecture with LangGraph
- Generate comprehensive product analysis reports with LLM-powered insights
- Supports multiple LLM providers (OpenAI, Anthropic, DeepSeek, Google Gemini, Moonshot/Kimi)
- Features a task queue system for background research processing
- Includes authentication with user roles (admin/user)

**Key Features:**
- Project management (create, view, delete projects)
- Multi-agent research workflow (Planner → Searcher → Extractor → Analyzer → Reporter)
- Real-time progress tracking with state persistence
- Report generation with Mermaid charts (SWOT analysis, timelines, radar charts)
- Data source management (RSS feeds, search engines, GitHub, Reddit, Brave Search)
- LLM configuration with role-based model selection (analyzer, extractor, reporter)
- Task cancellation and checkpoint recovery
- File-based state storage for research progress

## Tech Stack

- **Frontend Framework**: Next.js 16.1.4 with App Router (React 19.2.3)
- **Language**: TypeScript 5.9.3
- **Styling**: Tailwind CSS 4 with PostCSS
- **Database**: SQLite (better-sqlite3 12.6.2)
- **LLM Integration**: LangChain core 1.1.17, LangGraph 1.1.2, OpenAI SDK
- **State Management**: LangGraph StateGraph for workflow orchestration
- **Testing**: Jest 30.2.0 with ts-jest
- **Code Quality**: ESLint 9 with Next.js config
- **Icons**: Lucide React 0.563.0
- **Markdown Rendering**: react-markdown, remark-gfm, rehype-highlight
- **Diagrams**: Mermaid.js 11.4.1
- **MCP Integration**: @modelcontextprotocol/sdk 1.25.3 (for web content extraction)

## Project Conventions

### Code Style

**Naming Conventions:**
- **Files**: PascalCase for components (`ProjectViewer.tsx`), camelCase for utilities (`taskQueue.ts`, `db/index.ts`)
- **Variables**: camelCase (`projectId`, `searchResults`, `llmConfig`)
- **Interfaces**: PascalCase with descriptive names (`Project`, `SearchResult`, `TaskStatus`)
- **Constants**: SCREAMING_SCALAR_CASE for config (`DEFAULT_CONFIG`, `PRODUCT_ANALYST_PROMPT`)
- **Database helpers**: Lowercase with camelCase (`projectDb`, `taskDb`, `reportDb`)
- **Table/Column names**: snake_case in database schema (`search_results`, `progress_message`)

**Formatting Style:**
- Uses ESLint with Next.js configuration
- Single quotes for strings (`'use client'`)
- Semicolons at end of statements
- Trailing commas in multi-line objects/arrays
- TypeScript strict mode enabled

**Component Structure:**
- Client components marked with `'use client'` directive
- Props interfaces defined above component
- Hooks organized: `useState`, `useEffect`, `useCallback`, `useRef`

### Architecture Patterns

1. **Multi-Agent Research Architecture**: LangGraph StateGraph-based workflow orchestration
   - **Supervisor Agent**: Routes tasks to specialized worker agents based on state
   - **Worker Agents**: Planner, Searcher, Extractor, Analyzer, Reporter
   - **Graph State**: Shared ResearchState with checkpoint persistence

2. **Quantitative Analysis Pipeline** (最新增强)
   - **MarketDataAnalyzer**: 市场规模估算、增长率趋势预测、市场细分
   - **UserResearchAnalyzer**: 用户画像生成、渗透率分析、NPS分析
   - **CompetitorQuantitativeAnalyzer**: 市场份额、LTV/CAC、营收对比
   - **BusinessModelAnalyzer**: 定价模式、Unit Economics、商业化成熟度
   - **DataVisualizer**: Mermaid图表生成（饼图、折线图、雷达图、甘特图、热力图）

3. **Report Generation Engine**
   - SMART原则战略建议生成
   - 多章节结构模板（执行摘要、市场概览、用户研究、竞品分析、商业模式）
   - Mermaid图表自动嵌入
   - 数据质量评估与来源标注

4. **API Routes**: Next.js App Router route handlers with RESTful endpoints returning `NextResponse.json()`
5. **Database Layer**: SQLite with better-sqlite3, prepared statements, migration support
6. **State Management**: React Context API (`AuthContext`, `ThemeContext`)
7. **Task Queue**: Background job processing with concurrency limit (max 3 active tasks)
8. **LLM Integration**: Multi-provider support with role-based model selection
9. **File-Based Storage**: Research state persisted to Markdown files with Frontmatter

**Research Agent Directory Structure:**
```
src/lib/research-agent/
├── index.ts              # Main entry point
├── service.ts            # API bridge layer
├── state.ts              # ResearchState type definition
├── types.ts              # Shared types (AgentName, etc.)
├── supervisor/           # Supervisor agent with routing logic
│   ├── index.ts
│   └── prompts.ts
├── workers/              # Specialized worker agents
│   ├── planner/          # Research planning
│   ├── searcher/         # Web search execution
│   ├── extractor/        # Content extraction
│   ├── analyzer/         # Data analysis
│   └── reporter/         # Report generation
├── graph/                # LangGraph workflow orchestration
│   ├── builder.ts        # Graph construction
│   ├── state-graph.ts    # StateGraph wrapper
│   ├── checkpoint.ts     # Checkpoint persistence
│   └── markdown-state.ts # Markdown state serialization
├── progress/             # Progress tracking
├── cancellation/         # Task cancellation
└── backup/               # State backup/restore
```

**Directory Structure:**
```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/             # Auth page
│   ├── projects/         # Projects listing page
│   ├── reports/          # Reports listing page
│   └── settings/         # Settings page
├── components/            # React components
├── contexts/              # React Context
├── hooks/                 # Custom hooks
├── lib/                   # Core logic modules
│   ├── __tests__/        # Unit tests
│   ├── analysis/         # Search result analysis
│   ├── datasources/      # Data source integrations (RSS, search, GitHub, etc.)
│   ├── db/               # Database schema and helpers
│   ├── llm/              # LLM client and providers
│   ├── file-storage/     # File-based state storage
│   └── research-agent/   # Multi-agent research workflow
└── middleware.ts          # Auth middleware
```

### Testing Strategy

**Testing Framework**: Jest 30.2.0 with ts-jest

**Test Pattern**: `**/__tests__/**/*.test.ts`

**Test Setup**:
- Test environment: jsdom
- Path aliases: `@/*` maps to `src/*`
- Coverage collection from `src/lib/**/*.ts`

**Example Test Files:**
- `/src/lib/__tests__/llm.test.ts` - LLM constants and types validation
- `/src/lib/__tests__/analysis.test.ts` - Analysis module tests

### Git Workflow

**Branch Strategy:**
- Main branch: `main`
- Feature branches for new development

**Commit Convention:**
```
<type>: <subject>
- feat: New feature
- fix: Bug fix
- refactor: Code restructuring
- docs: Documentation updates
- chore: Maintenance tasks
```

**Gitignore Excludes:**
- Dependencies: `/node_modules`
- Build outputs: `.next/`, `build/`
- Environment files: `.env*`
- Coverage: `/coverage`

## Domain Context

- **Product Research**: Automated collection and analysis of product information from web sources
- **Multi-Agent AI System**: LangGraph-based supervisor-worker architecture for research automation
- **LLM Analysis**: Uses large language models for intelligent content analysis and report generation
- **Research Workflow**: Multi-phase research process (Plan → Search → Extract → Analyze → Report)
- **Report Generation**: Markdown reports with embedded Mermaid diagrams for visualizations
- **State Persistence**: File-based checkpoint system with SHA-256 integrity verification

## Important Constraints

- **SQLite Database**: Single-file SQLite database for simplicity (data/research.db)
- **User Concurrency**: Max 3 concurrent research tasks per user
- **Session-based Auth**: Cookie-based authentication (no JWT tokens stored)
- **Server-side Processing**: LLM calls and research tasks execute server-side only
- **File State Storage**: Research state saved to `task-data/{projectId}/state.md`
- **Checkpoint Interval**: State backed up every 30 seconds during research execution

## External Dependencies

- **LLM Providers**: OpenAI, Anthropic, DeepSeek, Google Gemini, Moonshot/Kimi, ModelScope
- **Web Search APIs**: Brave Search (primary), DuckDuckGo, Bing
- **Data Sources**:
  - RSS Feeds: Hacker News, TechCrunch, The Verge, Wired, Product Hunt, 36Kr, etc.
  - GitHub API: Repository search and content extraction
  - Reddit: Subreddit search and post extraction
- **MCP Server**: zcaceres/fetch-mcp for full-page content extraction
- **Font**: Inter (Google Fonts via Next.js)

## OpenSpec Change Management

This project uses OpenSpec for tracking architectural changes and proposals.

### Change Categories
- **feat**: New feature implementations
- **refactor**: Architectural refactoring
- **enhance**: Quality improvements and optimizations

### Change Process
1. Create proposal in `openspec/changes/{category}-{description}/`
2. Define tasks in `tasks.md`
3. Implement changes following the spec
4. Run `openspec validate --all` before committing
5. Archive completed changes with `openspec archive <id>`

### Archived Changes
All completed changes are moved to `openspec/changes/archive/` with timestamps:
- `2026-02-03-refactor-agent-architecture` - LangGraph StateGraph refactor
- `2026-02-03-replace-crawl4ai-with-mcp-fetch` - Content extraction migration
- `2026-02-03-enhance-report-quality` - Quantitative analysis and SMART recommendations
- `2026-02-04-enhance-report-executability` - Report executability improvements for business decision makers

### Active Changes

- (No active changes)

### Active Specs
- `specs/research-report/spec.md` - Market research report format and quality standards
