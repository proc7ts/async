import { describe, expect, it } from '@jest/globals';
import { LockFailedError } from './lock-failed.error.js';
import { Semaphore } from './semaphore.js';

describe('Semaphore', () => {
  it('makes the number of max permits at least 1', () => {
    const semaphore = new Semaphore(-1);

    expect(semaphore.maxPermits).toBe(1);
    expect(semaphore.permits).toBe(1);
  });
  it('defaults to 1 max permit', () => {
    const semaphore = new Semaphore({ permits: 3 });

    expect(semaphore.maxPermits).toBe(1);
    expect(semaphore.permits).toBe(1);
  });
  it('accepts custom number of max permits', () => {
    const semaphore = new Semaphore(3);

    expect(semaphore.maxPermits).toBe(3);
    expect(semaphore.permits).toBe(3);
  });
  it('sets initial permits equal to max permits by default', () => {
    const semaphore = new Semaphore({ maxPermits: 3 });

    expect(semaphore.maxPermits).toBe(3);
    expect(semaphore.permits).toBe(3);
  });
  it('accepts custom number of initial permits', () => {
    const semaphore = new Semaphore({ maxPermits: 3, permits: 2 });

    expect(semaphore.maxPermits).toBe(3);
    expect(semaphore.permits).toBe(2);
  });
  it('limits the number of initial permits by max permits', () => {
    const semaphore = new Semaphore({ maxPermits: 3, permits: 5 });

    expect(semaphore.maxPermits).toBe(3);
    expect(semaphore.permits).toBe(3);
  });
  it('makes the number of initial permits at least zero', () => {
    const semaphore = new Semaphore({ maxPermits: -1, permits: -1 });

    expect(semaphore.maxPermits).toBe(1);
    expect(semaphore.permits).toBe(0);
  });

  describe('acquire', () => {
    it('allows to acquire max permits', async () => {
      const semaphore = new Semaphore(3);

      expect(semaphore.maxPermits).toBe(3);
      expect(await semaphore.acquire()).toBeUndefined();
      expect(await semaphore.acquire()).toBeUndefined();
      expect(await semaphore.acquire()).toBeUndefined();
      expect(semaphore.permits).toBe(0);

      semaphore.release();
      semaphore.release();
      semaphore.release();
      expect(semaphore.permits).toBe(3);

      expect(() => semaphore.release()).toThrow(new TypeError('All locks released already'));
      expect(semaphore.permits).toBe(3);
    });
    it('awaits for permit release', async () => {
      const semaphore = new Semaphore();

      expect(await semaphore.acquire()).toBeUndefined();

      let acquired = false;

      semaphore
        .acquire()
        .then(() => (acquired = true))
        .catch(console.error);

      await Promise.resolve();
      expect(acquired).toBe(false);

      semaphore.release();
      await Promise.resolve();
      expect(acquired).toBe(true);
      expect(semaphore.permits).toBe(0);

      semaphore.release();
      expect(semaphore.permits).toBe(1);

      expect(() => semaphore.release()).toThrow(new TypeError('All locks released already'));
      expect(semaphore.permits).toBe(1);
    });
    it('supports multiple acquires', async () => {
      const semaphore = new Semaphore();

      expect(await semaphore.acquire()).toBeUndefined();

      let acquired1 = false;
      let acquired2 = false;
      let acquired3 = false;

      semaphore
        .acquire()
        .then(() => (acquired1 = true))
        .catch(console.error);
      semaphore
        .acquire()
        .then(() => (acquired2 = true))
        .catch(console.error);
      semaphore
        .acquire()
        .then(() => (acquired3 = true))
        .catch(console.error);

      await Promise.resolve();
      expect(acquired1).toBe(false);

      semaphore.release();
      await Promise.resolve();
      expect(acquired1).toBe(true);
      expect(acquired2).toBe(false);
      expect(acquired3).toBe(false);
      expect(semaphore.permits).toBe(0);

      semaphore.release();
      await Promise.resolve();
      expect(acquired1).toBe(true);
      expect(acquired2).toBe(true);
      expect(acquired3).toBe(false);
      expect(semaphore.permits).toBe(0);

      semaphore.release();
      await Promise.resolve();
      expect(acquired1).toBe(true);
      expect(acquired2).toBe(true);
      expect(acquired3).toBe(true);
      expect(semaphore.permits).toBe(0);

      semaphore.release();
      expect(semaphore.permits).toBe(1);
    });

    describe('abort', () => {
      it('can be aborted', async () => {
        const semaphore = new Semaphore();

        await semaphore.acquire();

        const abortCtl = new AbortController();
        const promise = semaphore.acquire(abortCtl.signal);

        abortCtl.abort();

        await expect(promise).rejects.toThrow(new LockFailedError('Lock acquire aborted'));
        expect(semaphore.permits).toBe(0);

        semaphore.release();
        expect(semaphore.permits).toBe(1);
      });
      it('can be aborted with custom reason', async () => {
        const reason = new Error('Test reason');
        const semaphore = new Semaphore();

        await semaphore.acquire();

        const abortCtl = new AbortController();
        const promise = semaphore.acquire(abortCtl.signal);

        abortCtl.abort(reason);

        await expect(promise).rejects.toThrow(
          new LockFailedError('Lock acquire aborted', { cause: reason }),
        );
        expect(semaphore.permits).toBe(0);

        semaphore.release();
        expect(semaphore.permits).toBe(1);
      });
      it('can be aborted with custom lock failure error', async () => {
        const reason = new LockFailedError('Test reason');
        const semaphore = new Semaphore();

        await semaphore.acquire();

        const abortCtl = new AbortController();
        const promise = semaphore.acquire(abortCtl.signal);

        abortCtl.abort(reason);

        await expect(promise).rejects.toThrow(reason);
        expect(semaphore.permits).toBe(0);

        semaphore.release();
        expect(semaphore.permits).toBe(1);
      });
      it('aborts immediately when acquirer already aborted', async () => {
        const semaphore = new Semaphore();
        const abortCtl = new AbortController();

        abortCtl.abort();

        await expect(semaphore.acquire(abortCtl.signal)).rejects.toThrow(
          new LockFailedError('Lock acquire aborted'),
        );
        expect(semaphore.permits).toBe(1);
      });
      it('releases the first lock', async () => {
        const semaphore = new Semaphore({ permits: 0 });
        const abortCtl = new AbortController();

        const first = semaphore.acquire(abortCtl.signal);
        const second = semaphore.acquire();
        const third = semaphore.acquire();

        abortCtl.abort();

        await expect(first).rejects.toThrow();

        semaphore.release();
        await expect(second).resolves.toBeUndefined();

        semaphore.release();
        await expect(third).resolves.toBeUndefined();
        expect(semaphore.permits).toBe(0);

        semaphore.release();
        expect(semaphore.permits).toBe(1);
      });
      it('releases the middle lock', async () => {
        const semaphore = new Semaphore({ permits: 0 });
        const abortCtl = new AbortController();

        const first = semaphore.acquire();
        const second = semaphore.acquire(abortCtl.signal);
        const third = semaphore.acquire();

        abortCtl.abort();

        await expect(second).rejects.toThrow();

        semaphore.release();
        await expect(first).resolves.toBeUndefined();

        semaphore.release();
        await expect(third).resolves.toBeUndefined();
        expect(semaphore.permits).toBe(0);

        semaphore.release();
        expect(semaphore.permits).toBe(1);
      });
      it('releases the last lock', async () => {
        const semaphore = new Semaphore({ permits: 0 });
        const abortCtl = new AbortController();

        const first = semaphore.acquire();
        const second = semaphore.acquire();
        const third = semaphore.acquire(abortCtl.signal);

        abortCtl.abort();

        await expect(third).rejects.toThrow();

        semaphore.release();
        await expect(first).resolves.toBeUndefined();

        semaphore.release();
        await expect(second).resolves.toBeUndefined();
        expect(semaphore.permits).toBe(0);

        semaphore.release();
        expect(semaphore.permits).toBe(1);
      });
    });
  });

  describe('isClosed', () => {
    it('is false initially', () => {
      expect(new Semaphore().isClosed()).toBe(false);
    });
    it('becomes true when closed', () => {
      const semaphore = new Semaphore();

      semaphore.close();

      expect(semaphore.isClosed()).toBe(true);
    });
  });

  describe('close', () => {
    it('aborts lock acquires', async () => {
      const semaphore = new Semaphore();

      await semaphore.acquire();

      const promise = semaphore.acquire();

      semaphore.close();

      await expect(promise).rejects.toThrow(new LockFailedError('Semaphore closed'));
      expect(semaphore.permits).toBe(0);

      semaphore.release();
      expect(semaphore.permits).toBe(1);
    });
    it('aborts the lock acquire with custom reason', async () => {
      const reason = new Error('Test reason');
      const semaphore = new Semaphore();

      await semaphore.acquire();

      const promise = semaphore.acquire();

      semaphore.close(reason);

      await expect(promise).rejects.toThrow(reason);
      expect(semaphore.permits).toBe(0);

      semaphore.release();
      expect(semaphore.permits).toBe(1);
    });
    it('prevents acquiring more locks', async () => {
      const semaphore = new Semaphore();

      semaphore.close();

      await expect(semaphore.acquire()).rejects.toThrow(new LockFailedError('Semaphore closed'));
    });
  });
});
