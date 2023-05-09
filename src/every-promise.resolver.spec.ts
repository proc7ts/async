import { beforeEach, describe, expect, it } from '@jest/globals';
import { EveryPromiseResolver } from './every-promise-resolver.js';

describe('EveryPromiseResolver', () => {
  let resolver: EveryPromiseResolver<string>;

  beforeEach(() => {
    resolver = new EveryPromiseResolver();
  });

  describe('add', () => {
    it('resolves resulting promise before its construction', async () => {
      resolver.add('foo');
      resolver.add('bar');

      const promise = resolver.whenDone();

      expect(await promise).toEqual(['foo', 'bar']);
      expect(promise).toBe(resolver.whenDone());
    });
    it('rejects resulting promise before its construction', async () => {
      resolver.add(Promise.reject('foo'));
      resolver.add('bar');

      const promise = resolver.whenDone();

      await expect(promise).rejects.toBe('foo');
      expect(promise).toBe(resolver.whenDone());
    });
    it('resolves resulting promise after its construction', async () => {
      const promise = resolver.whenDone();

      resolver.add('foo', 'bar');
      resolver.add('baz');

      expect(await promise).toEqual(['foo', 'bar']);
      expect(promise).toBe(resolver.whenDone());
    });
    it('rejects resulting promise after its construction', async () => {
      const promise = resolver.whenDone();

      resolver.add(Promise.reject('foo'));
      resolver.add('bar');

      await expect(promise).rejects.toBe('foo');
      expect(promise).toBe(resolver.whenDone());
    });
    it('resolves resulting promise by another one', async () => {
      const promise = resolver.whenDone();

      resolver.add(Promise.resolve('foo'), Promise.resolve('bar'));
      resolver.add(Promise.resolve('baz'));

      expect(await promise).toEqual(['foo', 'bar']);
      expect(promise).toBe(resolver.whenDone());
    });
    it('resolves resulting promise to empty array when called without parameters', async () => {
      const promise = resolver.whenDone();

      resolver.add();
      expect(await promise).toEqual([]);
      expect(promise).toBe(resolver.whenDone());
    });
    it('does not cause unresolved promise rejection before promise construction', async () => {
      resolver.add(Promise.reject('foo'));

      expect(await new Promise(resolve => setImmediate(resolve))).toBeUndefined();
      await expect(resolver.whenDone()).rejects.toBe('foo');
    });
    it('does not cause unresolved promise rejection after promise construction', async () => {
      const whenDone = resolver.whenDone();

      resolver.add(Promise.reject('foo'));

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
    it('resolves resulting promise when resolver constructed with parameters', async () => {
      resolver = new EveryPromiseResolver('foo', 'bar');

      const promise = resolver.whenDone();

      expect(await promise).toEqual(['foo', 'bar']);
      expect(promise).toBe(resolver.whenDone());
    });
  });
});
