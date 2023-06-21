import { describe, expect, it } from '@jest/globals';
import { LockFailedError } from './lock-failed.error.js';

describe('LockError', () => {
  describe('name', () => {
    it('equals to class name', () => {
      expect(new LockFailedError().name).toBe('LockFailedError');
      expect(new LockFailedError().name).toBe(LockFailedError.name);
    });
  });

  describe('message', () => {
    it('has default value', () => {
      expect(new LockFailedError().message).toBe('Can not acquire lock');
    });
  });
});
