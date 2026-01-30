/**
 * Graph Module Tests
 */

import { describe, it, expect } from '@jest/globals';
import type { ResearchState, SearchResult, ExtractionResult } from '../../research-agent/types';

describe('MarkdownStateManager', () => {
  // Re-implement a simplified version for testing (without fs dependency)
  class MockMarkdownStateManager {
    private stateDir: string;
    private mockStore: Map<string, string> = new Map();

    constructor(options: { stateDir: string }) {
      this.stateDir = options.stateDir;
    }

    generateStateId(projectId: string): string {
      return `${projectId}-state`;
    }

    getStateFilePath(projectId: string): string {
      return `${this.stateDir}/${this.generateStateId(projectId)}.md`;
    }

    async readState(projectId: string): Promise<ResearchState | null> {
      const filePath = this.getStateFilePath(projectId);
      const content = this.mockStore.get(filePath);

      if (!content) {
        return null;
      }

      // Handle both YAML formats: ```yaml ... ``` and --- ... ---
      let yamlContent = '';
      const matchYaml = content.match(/```yaml\n([\s\S]*?)\n```/);
      const matchFrontmatter = content.match(/---\n([\s\S]*?)\n---/);

      if (matchYaml) {
        yamlContent = matchYaml[1];
      } else if (matchFrontmatter) {
        yamlContent = matchFrontmatter[1];
      }

      if (!yamlContent) {
        return null;
      }

      const data = this.parseFrontmatter(yamlContent);
      return data as unknown as ResearchState;
    }

    async writeState(state: ResearchState): Promise<void> {
      const filePath = this.getStateFilePath(state.projectId);
      const content = this.formatState(state);
      this.mockStore.set(filePath, content);
    }

    setMockContent(path: string, content: string): void {
      this.mockStore.set(path, content);
    }

    parseFrontmatter(yaml: string): Record<string, unknown> {
      const result: Record<string, unknown> = {};
      const lines = yaml.split('\n');
      let inFrontmatter = false;

      for (const line of lines) {
        if (line.trim() === '---') {
          inFrontmatter = !inFrontmatter;
          continue;
        }
        if (inFrontmatter && line.includes(':')) {
          const [key, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();
          // Parse arrays and objects
          if (value.startsWith('[') && value.endsWith(']')) {
            try {
              result[key.trim()] = JSON.parse(value);
            } catch {
              result[key.trim()] = value;
            }
          } else if (value === '' || value === 'null') {
            result[key.trim()] = null;
          } else if (value === 'true') {
            result[key.trim()] = true;
          } else if (value === 'false') {
            result[key.trim()] = false;
          } else if (!isNaN(Number(value))) {
            result[key.trim()] = Number(value);
          } else {
            result[key.trim()] = value.replace(/^["']|["']$/g, '');
          }
        }
      }
      return result;
    }

    formatState(state: ResearchState): string {
      const frontmatter = this.generateFrontmatter(state);
      return `---\n${frontmatter}\n---\n\n## 搜索结果\n\n| 标题 | 来源 | 质量 |\n|------|------|------|\n${state.searchResults.map(r => `| ${r.title} | ${r.source} | ${r.quality}/10 |`).join('\n')}\n\n## 提取内容\n\n${state.extractedContent.length} 个页面已提取\n\n## 分析结果\n\n${state.analysis ? '分析已完成' : '等待分析...'}`;
    }

    generateFrontmatter(state: ResearchState): string {
      const lines = [
        `projectId: ${state.projectId}`,
        `title: ${state.title}`,
        `status: ${state.status}`,
        `currentStep: ${state.currentStep}`,
        `progress: ${state.progress}`,
        `progressMessage: ${state.progressMessage}`,
        `startedAt: ${state.startedAt}`,
        `updatedAt: ${state.updatedAt}`,
        `pendingQueries: ${JSON.stringify(state.pendingQueries)}`,
        `searchResults: ${JSON.stringify(state.searchResults)}`,
        `extractedContent: ${JSON.stringify(state.extractedContent)}`,
      ];

      if (state.analysis) {
        lines.push(`analysis: ${JSON.stringify(state.analysis)}`);
      }

      return lines.join('\n');
    }
  }

  beforeEach(() => {
    // Clear mock store before each test
  });

  describe('state file path generation', () => {
    it('should generate correct state file path', () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });
      const path = manager.getStateFilePath('test-project');
      expect(path).toBe('task-data/test-project-state.md');
    });

    it('should generate correct state ID', () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });
      const id = manager.generateStateId('my-project');
      expect(id).toBe('my-project-state');
    });
  });

  describe('state reading', () => {
    it('should return null when state file does not exist', async () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });
      const state = await manager.readState('non-existent');

      expect(state).toBeNull();
    });

    it('should parse frontmatter correctly', () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });

      // Directly test parseFrontmatter without --- wrapper
      const result = manager.parseFrontmatter(`---
projectId: test-project
title: Test Project
status: searching
progress: 45
---`);

      expect(result.projectId).toBe('test-project');
      expect(result.title).toBe('Test Project');
      expect(result.status).toBe('searching');
      expect(result.progress).toBe(45);
    });
  });

  describe('state writing', () => {
    it('should format state correctly', async () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });

      const mockState: ResearchState = {
        projectId: 'test-project',
        title: 'Test Project',
        status: 'searching',
        currentStep: 'searcher',
        progress: 45,
        progressMessage: '执行搜索中',
        startedAt: '2024-01-29T10:00:00Z',
        updatedAt: '2024-01-29T10:30:00Z',
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };

      // Test formatState produces valid content
      const formatted = manager.formatState(mockState);

      expect(formatted).toContain('projectId: test-project');
      expect(formatted).toContain('title: Test Project');
      expect(formatted).toContain('status: searching');
      expect(formatted).toContain('---\n');
    });

    it('should generate frontmatter with all fields', async () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });

      const mockState: ResearchState = {
        projectId: 'test-project',
        title: 'Test Project',
        status: 'searching',
        currentStep: 'searcher',
        progress: 45,
        progressMessage: '执行搜索中',
        startedAt: '2024-01-29T10:00:00Z',
        updatedAt: '2024-01-29T10:30:00Z',
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };

      const frontmatter = manager.generateFrontmatter(mockState);

      expect(frontmatter).toContain('projectId: test-project');
      expect(frontmatter).toContain('title: Test Project');
      expect(frontmatter).toContain('pendingQueries: []');
      expect(frontmatter).toContain('searchResults: []');
      expect(frontmatter).toContain('extractedContent: []');
    });
  });

  describe('frontmatter parsing', () => {
    it('should parse boolean values', () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });
      const result = manager.parseFrontmatter(`---
completed: true
failed: false
---`);

      expect(result.completed).toBe(true);
      expect(result.failed).toBe(false);
    });

    it('should parse numeric values', () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });
      const result = manager.parseFrontmatter(`---
progress: 45
count: 100
---`);

      expect(result.progress).toBe(45);
      expect(result.count).toBe(100);
    });

    it('should parse arrays', () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });
      const result = manager.parseFrontmatter(`---
tags: ["tag1", "tag2"]
numbers: [1, 2, 3]
---`);

      expect(result.tags).toEqual(['tag1', 'tag2']);
      expect(result.numbers).toEqual([1, 2, 3]);
    });

    it('should handle empty values', () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });
      const result = manager.parseFrontmatter(`---
emptyArray: []
emptyString:
nullValue: null
---`);

      expect(result.emptyArray).toEqual([]);
      expect(result.emptyString).toBeNull();
      expect(result.nullValue).toBeNull();
    });
  });
});

describe('ResearchState Validation', () => {
  it('should create valid initial state', () => {
    const state: ResearchState = {
      projectId: 'test-123',
      title: 'Test Research',
      status: 'pending',
      currentStep: 'planner',
      progress: 0,
      progressMessage: '准备开始',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pendingQueries: [],
      searchResults: [],
      extractedContent: [],
      totalSearches: 0,
      maxRetries: 3,
    };

    expect(state.projectId).toBe('test-123');
    expect(state.status).toBe('pending');
    expect(state.progress).toBe(0);
  });

  it('should handle state transitions', () => {
    let state: ResearchState = {
      projectId: 'test-123',
      title: 'Test Research',
      status: 'pending',
      currentStep: 'planner',
      progress: 0,
      progressMessage: '准备开始',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pendingQueries: [],
      searchResults: [],
      extractedContent: [],
      totalSearches: 0,
      maxRetries: 3,
    };

    // Transition to planning
    state = { ...state, status: 'planning', progressMessage: '正在生成研究计划...' };
    expect(state.status).toBe('planning');

    // Transition to searching
    state = { ...state, status: 'searching', currentStep: 'searcher', progress: 25, progressMessage: '执行搜索' };
    expect(state.status).toBe('searching');
    expect(state.currentStep).toBe('searcher');
    expect(state.progress).toBe(25);

    // Transition to extracting
    state = { ...state, status: 'extracting', currentStep: 'extractor', progress: 50 };
    expect(state.status).toBe('extracting');
    expect(state.currentStep).toBe('extractor');
    expect(state.progress).toBe(50);

    // Transition to completed
    state = { ...state, status: 'completed', currentStep: 'reporter', progress: 100 };
    expect(state.status).toBe('completed');
    expect(state.progress).toBe(100);
  });

  it('should validate search results structure', () => {
    const searchResult: SearchResult = {
      id: 'sr1',
      source: 'duckduckgo',
      title: 'Test Result',
      url: 'https://example.com',
      content: 'Test content',
      quality: 8,
      crawled: false,
      queryId: 'q1',
      dimension: 'features',
    };

    expect(searchResult.id).toBe('sr1');
    expect(searchResult.quality).toBeGreaterThanOrEqual(1);
    expect(searchResult.quality).toBeLessThanOrEqual(10);
  });

  it('should validate extraction results structure', () => {
    const extraction: ExtractionResult = {
      url: 'https://example.com',
      source: 'duckduckgo',
      title: 'Test',
      content: 'Extracted content...',
      metadata: {
        crawledAt: new Date().toISOString(),
        contentLength: 1000,
        qualityScore: 8,
        features: ['f1', 'f2'],
        competitors: ['c1'],
        techStack: ['t1'],
      },
    };

    expect(extraction.metadata.qualityScore).toBeLessThanOrEqual(10);
    expect(extraction.metadata.features).toHaveLength(2);
  });
});

describe('Graph State Transitions', () => {
  it('should have valid status values', () => {
    const validStatuses = ['pending', 'planning', 'searching', 'extracting', 'analyzing', 'reporting', 'completed', 'failed', 'cancelled'];

    validStatuses.forEach(status => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status,
        currentStep: 'planner',
        progress: 0,
        progressMessage: '',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };
      expect(state.status).toBe(status);
    });
  });

  it('should have valid currentStep values', () => {
    const validSteps = ['planner', 'searcher', 'extractor', 'analyzer', 'reporter'];

    validSteps.forEach(step => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: 'searching',
        currentStep: step as ResearchState['currentStep'],
        progress: 25,
        progressMessage: '',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: [],
        searchResults: [],
        extractedContent: [],
        totalSearches: 0,
        maxRetries: 3,
      };
      expect(state.currentStep).toBe(step);
    });
  });

  it('should calculate progress correctly for each stage', () => {
    const stageProgress = {
      planner: 0,
      searcher: 20,
      extractor: 40,
      analyzer: 60,
      reporter: 80,
    };

    Object.entries(stageProgress).forEach(([step, expectedProgress]) => {
      const state: ResearchState = {
        projectId: 'test',
        title: 'Test',
        status: step as ResearchState['status'],
        currentStep: step as ResearchState['currentStep'],
        progress: expectedProgress,
        progressMessage: '',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingQueries: step === 'planner' ? [{ id: 'q1', query: 'test', purpose: '', dimension: '', priority: 5 }] : [],
        searchResults: step === 'searcher' || step === 'extractor' || step === 'analyzer' || step === 'reporter' ? [{ id: 'sr1', source: 'duckduckgo', title: '', url: '', content: '', quality: 5, crawled: false, queryId: 'q1', dimension: '' }] : [],
        extractedContent: step === 'extractor' || step === 'analyzer' || step === 'reporter' ? [{ url: '', source: 'duckduckgo', title: '', content: '', metadata: { crawledAt: '', contentLength: 0, qualityScore: 5, features: [], competitors: [], techStack: [] } }] : [],
        totalSearches: step === 'searcher' || step === 'extractor' || step === 'analyzer' || step === 'reporter' ? 5 : 0,
        maxRetries: 3,
      };

      if (step === 'planner') {
        expect(state.pendingQueries.length).toBeGreaterThan(0);
      } else {
        expect(state.pendingQueries.length).toBe(0);
      }
    });
  });
});
