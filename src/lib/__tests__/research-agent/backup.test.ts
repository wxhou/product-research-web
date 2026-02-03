/**
 * Backup Module Tests
 *
 * Type validation tests for Backup module
 */

import { describe, it, expect } from '@jest/globals';
import { computeSHA256, verifyChecksum, createBackupManager, DEFAULT_BACKUP_CONFIG } from '../../research-agent/backup';

describe('Backup Module Types', () => {
  describe('computeSHA256', () => {
    it('should compute consistent hash for same input', () => {
      const data = 'test data';
      const hash1 = computeSHA256(data);
      const hash2 = computeSHA256(data);
      expect(hash1).toBe(hash2);
    });

    it('should produce 64-character hex string', () => {
      const hash = computeSHA256('test');
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = computeSHA256('data1');
      const hash2 = computeSHA256('data2');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = computeSHA256('');
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should handle long strings', () => {
      const longData = 'a'.repeat(10000);
      const hash = computeSHA256(longData);
      expect(hash).toHaveLength(64);
    });
  });

  describe('verifyChecksum', () => {
    it('should return true for valid checksum', () => {
      const data = 'test data';
      const checksum = computeSHA256(data);
      expect(verifyChecksum(data, checksum)).toBe(true);
    });

    it('should return false for invalid checksum', () => {
      const data = 'test data';
      const invalidChecksum = 'a'.repeat(64);
      expect(verifyChecksum(data, invalidChecksum)).toBe(false);
    });

    it('should return false for tampered data', () => {
      const originalData = 'original data';
      const tamperedData = 'tampered data';
      const checksum = computeSHA256(originalData);

      expect(verifyChecksum(tamperedData, checksum)).toBe(false);
    });

    it('should be case-insensitive for hex characters', () => {
      const data = 'test data';
      const checksum = computeSHA256(data);
      const upperCaseChecksum = checksum.toUpperCase();

      expect(verifyChecksum(data, upperCaseChecksum)).toBe(true);
    });
  });

  describe('DEFAULT_BACKUP_CONFIG', () => {
    it('should have required configuration properties', () => {
      expect(DEFAULT_BACKUP_CONFIG.backupDir).toBeDefined();
      expect(typeof DEFAULT_BACKUP_CONFIG.maxBackups).toBe('number');
      expect(typeof DEFAULT_BACKUP_CONFIG.intervalMs).toBe('number');
      expect(DEFAULT_BACKUP_CONFIG.maxBackups).toBeGreaterThan(0);
      expect(DEFAULT_BACKUP_CONFIG.intervalMs).toBeGreaterThan(0);
    });

    it('should have valid intervalMs value', () => {
      expect(DEFAULT_BACKUP_CONFIG.intervalMs).toBe(30000);
    });

    it('should have valid max backups value', () => {
      expect(DEFAULT_BACKUP_CONFIG.maxBackups).toBe(5);
    });
  });

  describe('createBackupManager', () => {
    it('should create backup manager with valid config', () => {
      const customConfig = {
        backupDir: '/custom/backup',
        maxBackups: 10,
        intervalMs: 60000,
      };

      const manager = createBackupManager(customConfig);

      expect(manager).toBeDefined();
      expect(typeof manager.createBackup).toBe('function');
      expect(typeof manager.listBackups).toBe('function');
      expect(typeof manager.restoreBackup).toBe('function');
      expect(typeof manager.deleteBackup).toBe('function');
    });

    it('should handle partial config', () => {
      const partialConfig = {
        backupDir: '/backup',
      };

      const manager = createBackupManager(partialConfig);

      expect(manager).toBeDefined();
    });
  });
});
