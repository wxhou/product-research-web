# Project Context

## Purpose

**Product Research Web** is a web application for automated product research and analysis. The system allows users to:

- Create research projects with titles, descriptions, and keywords
- Perform automated web research using multiple data sources (RSS feeds, search engines, GitHub)
- Generate comprehensive product analysis reports using LLM (Large Language Model) or rule-based analysis
- Supports multiple LLM providers (OpenAI, Anthropic, DeepSeek, Google Gemini, Moonshot/Kimi)
- Features a task queue system for background research processing
- Includes authentication with user roles (admin/user)

**Key Features:**
- Project management (create, view, delete projects)
- Research task execution with real-time progress tracking
- Report generation with Mermaid charts (SWOT analysis, timelines, radar charts)
- Data source management (RSS feeds, search engines, GitHub)
- LLM configuration with role-based model selection (analyzer, extractor, reporter)

## Tech Stack
- **Frontend Framework**: Next.js 16.1.4 with App Router (React 19.2.3)
- **Language**: TypeScript 5.9.3
- **Styling**: Tailwind CSS 4 with PostCSS
- **Database**: SQLite (better-sqlite3 12.6.2)
- **LLM Integration**: LangChain core, OpenAI SDK, multi-provider support
- **Testing**: Jest 30.2.0 with ts-jest
- **Code Quality**: ESLint 9 with Next.js config
- **Icons**: Lucide React
- **Markdown Rendering**: react-markdown, remark-gfm, rehype-highlight
- **Diagrams**: Mermaid.js

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

1. **API Routes**: Next.js App Router route handlers with RESTful endpoints returning `NextResponse.json()`
2. **Database Layer**: SQLite with better-sqlite3, prepared statements, migration support
3. **State Management**: React Context API (`AuthContext`, `ThemeContext`)
4. **Task Queue**: Background job processing with concurrency limit (max 3 active tasks)
5. **LLM Integration**: Multi-provider support with role-based model selection

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
│   ├── datasources/      # Data source integrations
│   ├── db/               # Database schema and helpers
│   ├── llm/              # LLM client and providers
│   └── research-agent/   # Research workflow
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
- **LLM Analysis**: Uses large language models for intelligent content analysis and report generation
- **Research Workflow**: Multi-phase research process with progress tracking
- **Report Generation**: Markdown reports with embedded Mermaid diagrams for visualizations

## Important Constraints

- **SQLite Database**: Single-file SQLite database for simplicity (data/research.db)
- **User Concurrency**: Max 3 concurrent research tasks per user
- **Session-based Auth**: Cookie-based authentication (no JWT tokens stored)
- **Server-side Processing**: LLM calls and research tasks execute server-side only

## External Dependencies

- **LLM Providers**: OpenAI, Anthropic, DeepSeek, Google Gemini, Moonshot/Kimi, ModelScope
- **Web Search APIs**: Google, Bing (via search engines)
- **Data Sources**: RSS feeds, GitHub API
- **Font**: Inter (Google Fonts via Next.js)
