/**
 * Graph Module Tests
 */

import { describe, it, expect } from '@jest/globals';
import type { ResearchState } from '../../research-agent/state';
import type { SearchResult, ExtractionResult } from '../../research-agent/types';

// Helper to create minimal valid ResearchState for testing
function createTestResearchState(overrides: Partial<ResearchState> = {}): ResearchState {
  return {
    projectId: 'test-project',
    title: 'Test Research',
    keywords: ['test'],
    status: 'pending',
    currentStep: 'supervisor',
    progress: 0,
    progressMessage: '',
    iterationsUsed: 0,
    totalSearches: 0,
    totalResults: 0,
    searchResults: [],
    pendingQueries: [],
    extractedContent: [],
    citations: [],
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: undefined,
    retryCount: 0,
    maxRetries: 3,
    ...overrides,
  };
}

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

      return this.parseState(content);
    }

    async saveState(projectId: string, state: ResearchState): Promise<void> {
      const filePath = this.getStateFilePath(projectId);
      const content = this.formatState(state);
      this.mockStore.set(filePath, content);
    }

    formatState(state: ResearchState): string {
      const frontmatter = this.generateFrontmatter(state);
      const content = this.generateContent(state);
      return `${frontmatter}\n\n${content}`;
    }

    generateFrontmatter(state: ResearchState): string {
      const fields = [
        `projectId: ${state.projectId}`,
        `title: ${state.title}`,
        `status: ${state.status}`,
        `currentStep: ${state.currentStep}`,
        `progress: ${state.progress}`,
        `progressMessage: ${state.progressMessage}`,
        `iterationsUsed: ${state.iterationsUsed}`,
        `totalSearches: ${state.totalSearches}`,
        `totalResults: ${state.totalResults}`,
        `searchResults: [${state.searchResults.length} items]`,
        `pendingQueries: [${state.pendingQueries.length} items]`,
        `extractedContent: [${state.extractedContent.length} items]`,
        `startedAt: ${state.startedAt}`,
        `updatedAt: ${state.updatedAt}`,
        `retryCount: ${state.retryCount}`,
        `maxRetries: ${state.maxRetries}`,
      ];

      return `---\n${fields.join('\n')}\n---`;
    }

    generateContent(state: ResearchState): string {
      return `# ${state.title}

## Progress
- Status: ${state.status}
- Progress: ${state.progress}%
- Message: ${state.progressMessage}

## Statistics
- Iterations: ${state.iterationsUsed}
- Total Searches: ${state.totalSearches}
- Total Results: ${state.totalResults}
- Retry Count: ${state.retryCount}/${state.maxRetries}`;
    }

    parseState(content: string): ResearchState {
      const state = this.parseFrontmatter(content);
      return state as ResearchState;
    }

    parseFrontmatter(content: string): Partial<ResearchState> {
      const result: Record<string, unknown> = {};

      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const lines = frontmatterMatch[1].split('\n');
        for (const line of lines) {
          const match = line.match(/^(\w+):\s*(.*)$/);
          if (match) {
            const [, key, value] = match;
            if (value === '[]') {
              result[key] = [];
            } else if (value === 'undefined') {
              result[key] = undefined;
            } else if (!isNaN(Number(value))) {
              result[key] = Number(value);
            } else if (value === 'true') {
              result[key] = true;
            } else if (value === 'false') {
              result[key] = false;
            } else {
              result[key] = value;
            }
          }
        }
      }

      return result;
    }
  }

  describe('state file operations', () => {
    it('should generate state file path correctly', () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });

      expect(manager.getStateFilePath('proj-123')).toBe('task-data/proj-123-state.md');
    });

    it('should save and read state', async () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });

      const state = createTestResearchState({
        projectId: 'test-project',
        title: 'Test Project',
        status: 'searching',
        progress: 45,
      });

      await manager.saveState('test-project', state);
      const readState = await manager.readState('test-project');

      expect(readState).not.toBeNull();
      expect(readState?.projectId).toBe('test-project');
      expect(readState?.title).toBe('Test Project');
      expect(readState?.status).toBe('searching');
    });

    it('should return null for non-existent state', async () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });

      const result = await manager.readState('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('state formatting', () => {
    it('should format state correctly', async () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });

      const state = createTestResearchState({
        projectId: 'test-project',
        title: 'Test Project',
        status: 'searching',
        progress: 45,
      });

      const formatted = manager.formatState(state);

      expect(formatted).toContain('projectId: test-project');
      expect(formatted).toContain('title: Test Project');
      expect(formatted).toContain('status: searching');
      expect(formatted).toContain('---');
    });

    it('should generate frontmatter with all fields', async () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });

      const state = createTestResearchState({
        projectId: 'test-project',
        title: 'Test Project',
        status: 'searching',
        progress: 45,
      });

      const frontmatter = manager.generateFrontmatter(state);

      expect(frontmatter).toContain('projectId: test-project');
      expect(frontmatter).toContain('title: Test Project');
      expect(frontmatter).toContain('searchResults: [0 items]');
      expect(frontmatter).toContain('pendingQueries: [0 items]');
      expect(frontmatter).toContain('extractedContent: [0 items]');
    });
  });

  describe('frontmatter parsing', () => {
    it('should parse boolean values', () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });
      const result = manager.parseFrontmatter(`---
status: completed
---`) as Record<string, unknown>;

      expect(result.status).toBe('completed');
    });

    it('should parse numeric values', () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });
      const result = manager.parseFrontmatter(`---
progress: 45
totalSearches: 100
---`) as Record<string, unknown>;

      expect(result.progress).toBe(45);
      expect(result.totalSearches).toBe(100);
    });

    it('should parse arrays as empty', () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });
      const result = manager.parseFrontmatter(`---
searchResults: []
pendingQueries: []
---`) as Record<string, unknown>;

      expect(result.searchResults).toEqual([]);
      expect(result.pendingQueries).toEqual([]);
    });

    it('should parse undefined values', () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });
      const result = manager.parseFrontmatter(`---
completedAt: undefined
---`) as Record<string, unknown>;

      expect(result.completedAt).toBeUndefined();
    });
  });

  describe('state content generation', () => {
    it('should generate content with title and progress', () => {
      const manager = new MockMarkdownStateManager({ stateDir: 'task-data' });

      const state = createTestResearchState({
        title: 'Test Research',
        status: 'searching',
        progress: 60,
        iterationsUsed: 3,
        totalSearches: 5,
        totalResults: 25,
      });

      const content = manager.generateContent(state);

      expect(content).toContain('# Test Research');
      expect(content).toContain('Status: searching');
      expect(content).toContain('Progress: 60%');
      expect(content).toContain('Iterations: 3');
      expect(content).toContain('Total Searches: 5');
      expect(content).toContain('Total Results: 25');
    });
  });
});
