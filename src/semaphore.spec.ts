import { describe, expect, it } from '@jest/globals';
import { neverSupply, Supply } from '@proc7ts/supply';
import { Semaphore } from './semaphore';
import { SemaphoreRevokeError } from './semaphore-revoke-error.js';

describe('Semaphore', () => {
  it('provides 1 permit by default', () => {
    const semaphore = new Semaphore(-1);

    expect(semaphore.maxPermits).toBe(1);
    expect(semaphore.permits).toBe(1);
  });
  it('accepts custom number of max permits', () => {
    const semaphore = new Semaphore(3, 2);

    expect(semaphore.maxPermits).toBe(3);
    expect(semaphore.permits).toBe(2);
  });
  it('limits the number of permits', () => {
    const semaphore = new Semaphore(3, 5);

    expect(semaphore.maxPermits).toBe(3);
    expect(semaphore.permits).toBe(3);
  });
  it('allows to acquire max permits', async () => {
    const semaphore = new Semaphore(3);

    expect(await semaphore.acquire()).toBeUndefined();
    expect(await semaphore.acquire()).toBeUndefined();
    expect(await semaphore.acquire()).toBeUndefined();
    expect(semaphore.permits).toBe(0);

    semaphore.release();
    semaphore.release();
    semaphore.release();
    expect(semaphore.permits).toBe(3);

    semaphore.release();
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

    semaphore.release();
    expect(semaphore.permits).toBe(1);
  });
  it('supports multiple waiters', async () => {
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
  it('can be aborted', async () => {
    const semaphore = new Semaphore();

    await semaphore.acquire();

    const supply = new Supply();
    const promise = semaphore.acquire(supply);

    supply.off();

    await expect(promise).rejects.toThrow(new SemaphoreRevokeError());
    expect(semaphore.permits).toBe(0);

    semaphore.release();
    expect(semaphore.permits).toBe(1);
  });
  it('can be aborted with custom reason', async () => {
    const reason = new Error('Test reason');
    const semaphore = new Semaphore();

    await semaphore.acquire();

    const supply = new Supply();
    const promise = semaphore.acquire(supply);

    supply.off(reason);

    await expect(promise).rejects.toThrow(reason);
    expect(semaphore.permits).toBe(0);

    semaphore.release();
    expect(semaphore.permits).toBe(1);
  });
  it('aborted immediately on aborted signal', async () => {
    const semaphore = new Semaphore();
    const supply = neverSupply();

    await expect(semaphore.acquire(supply)).rejects.toThrow(new SemaphoreRevokeError);
    expect(semaphore.permits).toBe(1);
  });
});
