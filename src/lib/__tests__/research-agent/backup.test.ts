/**
 * Backup Module Tests
 */

import { computeSHA256, verifyChecksum, createBackupManager, DEFAULT_BACKUP_CONFIG } from '../../research-agent/backup';
import type { ResearchState } from '../../research-agent/state';

describe('Backup Module', () => {
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
      const checksum = computeSHA256(originalData);

      const tamperedData = 'tampered data';
      expect(verifyChecksum(tamperedData, checksum)).toBe(false);
    });
  });

  describe('createBackupManager', () => {
    it('should create a manager with required methods', () => {
      const manager = createBackupManager(DEFAULT_BACKUP_CONFIG);
      expect(typeof manager.createBackup).toBe('function');
      expect(typeof manager.restoreBackup).toBe('function');
      expect(typeof manager.listBackups).toBe('function');
      expect(typeof manager.deleteBackup).toBe('function');
      expect(typeof manager.getBackupDir).toBe('function');
    });

    it('should return correct backup directory', () => {
      const manager = createBackupManager(DEFAULT_BACKUP_CONFIG);
      expect(manager.getBackupDir()).toBe(DEFAULT_BACKUP_CONFIG.backupDir);
    });

    it('should use custom backup directory', () => {
      const customConfig = { ...DEFAULT_BACKUP_CONFIG, backupDir: 'custom-backups' };
      const manager = createBackupManager(customConfig);
      expect(manager.getBackupDir()).toBe('custom-backups');
    });
  });

  describe('DEFAULT_BACKUP_CONFIG', () => {
    it('should have valid configuration values', () => {
      expect(DEFAULT_BACKUP_CONFIG.trigger).toBe('interval');
      expect(DEFAULT_BACKUP_CONFIG.intervalMs).toBe(30000);
      expect(DEFAULT_BACKUP_CONFIG.checkpointBackup).toBe(true);
      expect(DEFAULT_BACKUP_CONFIG.maxBackups).toBeGreaterThan(0);
      expect(typeof DEFAULT_BACKUP_CONFIG.backupDir).toBe('string');
    });

    it('should have reasonable interval', () => {
      // 30 seconds in milliseconds
      expect(DEFAULT_BACKUP_CONFIG.intervalMs).toBe(30 * 1000);
    });
  });
});

describe('Backup Manager Integration', () => {
  // These tests verify the backup manager interface
  // Full integration tests would require file system access

  it('should handle createBackup for non-existent project', async () => {
    const manager = createBackupManager(DEFAULT_BACKUP_CONFIG);
    const result = await manager.createBackup('non-existent-project');
    expect(result).toBeNull();
  });
});
