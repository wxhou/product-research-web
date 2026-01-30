/**
 * Cancellation Module Tests
 */

import {
  requestCancellation,
  isCancelled,
  createCancelCheck,
  getCancellationStatus,
  clearCancellation,
  clearAllCancellations,
  getCancellationTimeout,
  checkTimeout,
} from '../../research-agent/cancellation/handler';
import { setCancellationState, getCancellationState, clearAll } from '../../research-agent/cancellation/store';
import type { CancellationState } from '../../research-agent/types';

describe('Cancellation Module', () => {
  beforeEach(() => {
    // Clean up before each test
    clearAllCancellations();
    clearAll();
  });

  afterAll(() => {
    clearAllCancellations();
    clearAll();
  });

  describe('requestCancellation', () => {
    it('should create a cancellation request', async () => {
      const projectId = 'test-project-1';
      const result = await requestCancellation(projectId, 'user-1');

      expect(result).toBe(true);
      expect(isCancelled(projectId)).toBe(true);
    });

    it('should track who requested cancellation', async () => {
      const projectId = 'test-project-2';
      await requestCancellation(projectId, 'user-2');

      const status = getCancellationStatus(projectId);
      expect(status).toBeDefined();
      expect(status?.requestedBy).toBe('user-2');
    });
  });

  describe('isCancelled', () => {
    it('should return false for non-existent project', () => {
      expect(isCancelled('non-existent')).toBe(false);
    });

    it('should return true after cancellation requested', async () => {
      const projectId = 'test-project-3';
      await requestCancellation(projectId, 'user-1');
      expect(isCancelled(projectId)).toBe(true);
    });
  });

  describe('createCancelCheck', () => {
    it('should return a function', () => {
      const checkFn = createCancelCheck('test-project');
      expect(typeof checkFn).toBe('function');
    });

    it('should return cancellation status', async () => {
      const projectId = 'test-project-4';
      await requestCancellation(projectId, 'user-1');

      const checkFn = createCancelCheck(projectId);
      expect(checkFn()).toBe(true);
    });
  });

  describe('getCancellationStatus', () => {
    it('should return undefined for non-existent project', () => {
      const status = getCancellationStatus('non-existent');
      expect(status).toBeUndefined();
    });

    it('should return cancellation state', async () => {
      const projectId = 'test-project-5';
      await requestCancellation(projectId, 'user-1');

      const status = getCancellationStatus(projectId);
      expect(status).toBeDefined();
      expect(status?.projectId).toBe(projectId);
      // Status can be pending, processing, completed, or timeout
      expect(['pending', 'processing', 'completed', 'timeout']).toContain(status?.status);
    });
  });

  describe('clearCancellation', () => {
    it('should remove cancellation state', async () => {
      const projectId = 'test-project-6';
      await requestCancellation(projectId, 'user-1');
      expect(isCancelled(projectId)).toBe(true);

      clearCancellation(projectId);
      expect(isCancelled(projectId)).toBe(false);
    });
  });

  describe('clearAllCancellations', () => {
    beforeEach(async () => {
      clearAllCancellations();
    });

    it('should remove all cancellation states', async () => {
      await requestCancellation('project-1', 'user-1');
      await requestCancellation('project-2', 'user-2');
      await requestCancellation('project-3', 'user-3');

      expect(isCancelled('project-1')).toBe(true);
      expect(isCancelled('project-2')).toBe(true);
      expect(isCancelled('project-3')).toBe(true);

      clearAllCancellations();

      expect(isCancelled('project-1')).toBe(false);
      expect(isCancelled('project-2')).toBe(false);
      expect(isCancelled('project-3')).toBe(false);
    });
  });

  describe('getCancellationTimeout', () => {
    it('should return timeout value', () => {
      const timeout = getCancellationTimeout();
      expect(timeout).toBe(30000); // 30 seconds
    });
  });

  describe('checkTimeout', () => {
    it('should return false for non-existent project', () => {
      expect(checkTimeout('non-existent')).toBe(false);
    });

    it('should return false for recently created cancellation', async () => {
      const projectId = 'test-project-7';
      await requestCancellation(projectId, 'user-1');
      expect(checkTimeout(projectId)).toBe(false);
    });
  });
});

describe('Cancellation Store', () => {
  beforeEach(() => {
    clearAll();
  });

  afterAll(() => {
    clearAll();
  });

  describe('setCancellationState', () => {
    it('should store cancellation state', () => {
      const state: CancellationState = {
        projectId: 'test-project',
        requestedAt: new Date().toISOString(),
        requestedBy: 'user-1',
        status: 'pending',
        forced: false,
      };

      setCancellationState(state);
      const retrieved = getCancellationState('test-project');

      expect(retrieved).toBeDefined();
      expect(retrieved?.projectId).toBe('test-project');
    });
  });

  describe('getCancellationState', () => {
    it('should return undefined for non-existent project', () => {
      const state = getCancellationState('non-existent');
      expect(state).toBeUndefined();
    });
  });
});
