import { beforeEach, describe, expect, it } from '@jest/globals';
import { PromiseResolver } from './promise-resolver.js';

describe('PromiseResolver', () => {
  let resolver: PromiseResolver<string>;

  beforeEach(() => {
    resolver = new PromiseResolver();
  });

  describe('resolve', () => {
    it('resolves the promise before its construction', async () => {
      resolver.resolve('foo');
      resolver.resolve('bar');

      const promise = resolver.whenDone();

      expect(await promise).toBe('foo');
      expect(promise).toBe(resolver.whenDone());
    });
    it('rejects the promise before its construction', async () => {
      resolver.resolve(Promise.reject('foo'));
      resolver.resolve('bar');

      const promise = resolver.whenDone();

      await expect(promise).rejects.toBe('foo');
      expect(promise).toBe(resolver.whenDone());
    });
    it('resolves the promise after its construction', async () => {
      const promise = resolver.whenDone();

      resolver.resolve('foo');
      resolver.resolve('bar');

      expect(await promise).toBe('foo');
      expect(promise).toBe(resolver.whenDone());
    });
    it('rejects the promise after its construction', async () => {
      const promise = resolver.whenDone();

      resolver.resolve(Promise.reject('foo'));
      resolver.resolve('bar');

      await expect(promise).rejects.toBe('foo');
      expect(promise).toBe(resolver.whenDone());
    });
    it('resolves the promise by another one', async () => {
      const promise = resolver.whenDone();

      resolver.resolve(Promise.resolve('foo'));
      resolver.resolve(Promise.resolve('bar'));

      expect(await promise).toBe('foo');
      expect(promise).toBe(resolver.whenDone());
    });
    it('resolves the void-value promise', async () => {
      const voidResolver = new PromiseResolver<void>();

      voidResolver.resolve();
      voidResolver.resolve(void 0);
      voidResolver.resolve(Promise.resolve());

      const promise = voidResolver.whenDone();

      expect(await promise).toBeUndefined();
      expect(promise).toBe(voidResolver.whenDone());
    });
    it('does not cause unresolved promise rejection before promise construction', async () => {
      resolver.resolve(Promise.reject('foo'));

      expect(await new Promise(resolve => setImmediate(resolve))).toBeUndefined();
      await expect(resolver.whenDone()).rejects.toBe('foo');
    });
    it('does not cause unresolved promise rejection after promise construction', async () => {
      const whenDone = resolver.whenDone();

      resolver.resolve(Promise.reject('foo'));

      await expect(whenDone).rejects.toBe('foo');
      expect(await new Promise(resolve => setImmediate(resolve))).toBeUndefined();
    });
  });

  describe('reject', () => {
    let error1: Error;
    let error2: Error;

    beforeEach(() => {
      error1 = new Error('Error 1');
      error2 = new Error('Error 2');
    });

    it('rejects the promise before its construction', async () => {
      resolver.reject(error1);
      resolver.reject(error2);

      const promise = resolver.whenDone();

      await expect(promise).rejects.toBe(error1);
      expect(promise).toBe(resolver.whenDone());
    });
    it('rejects the promise after its construction', async () => {
      const promise = resolver.whenDone();

      resolver.reject(error1);
      resolver.reject(error2);

      await expect(promise).rejects.toBe(error1);
      expect(promise).toBe(resolver.whenDone());
    });
  });

  describe('whenDone', () => {
    it('builds the promise once', () => {
      const promise = resolver.whenDone();

      expect(resolver.whenDone()).toBe(promise);
      expect(resolver.whenDone()).toBe(promise);
      expect(resolver.whenDone()).toBe(promise);
    });
  });
});
