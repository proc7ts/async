import { lazyValue, noop } from '@proc7ts/primitives';

/**
 * A resolver of every input promise that can be created later or not created at all.
 *
 * Promises to resolve can be passed to constructor, or {@link add added} later, but not before the resulting
 * promise {@link whenDone created}.
 *
 * Creates the resulting promise only on demand.
 *
 * The methods of this object do not require `this` context and can be called as functions.
 *
 * @typeParam T - The type of value the input promises resolve to.
 */
export class EveryPromiseResolver<in out T = void> {

  /**
   * Adds promise(s) to resolve.
   *
   * Has no effect when the resulting promise already settled.
   *
   * Can be called before the promise created.
   *
   * Calling without arguments causes the {@link whenDone resulting promise} to resolve.
   *
   * @param promises - Promises to add to resolution.
   */
  readonly add: (this: void, ...promises: (T | PromiseLike<T>)[]) => this;

  /**
   * Rejects the resulting promise.
   *
   * Has no effect when the {@link whenDone resulting} promise already settled.
   *
   * Can be called before the resulting promise {@link whenDone created}.
   *
   * @param reason - Promise rejection reason.
   */
  readonly reject: (this: void, reason?: unknown) => void;

  /**
   * Creates a promise resolved when every {@link add added} promise resolved, or rejected when any of them rejected.
   *
   * The subsequent calls to this method return the same promise instance.
   *
   * @returns Resulting promise resolved to array of added promise resolutions.
   */
  readonly whenDone: (this: void) => Promise<T[]>;

  /**
   * Constructs every promise resolver.
   *
   * If no `promises` passed to constructor, then no promises to resolve will be added. This means that the
   * {@link whenDone resulting promise} won't be settled until either {@link add}, or {@link reject} method called.
   *
   * @param promises - Promises to add to resolution initially.
   */
  constructor(...promises: (T | PromiseLike<T>)[]) {
    let added: Promise<Awaited<T>[]> = Promise.resolve([]);
    let done = false;
    let addPromises = (promises: (T | PromiseLike<T>)[]): void => {
      if (promises.length) {
        added = Promise.all([added, Promise.all(promises)]).then(
          (arrays: Awaited<T>[][]): Awaited<T>[] => arrays.flat(),
        );
      }
      resolvePromise(added);
      if (done) {
        addPromises = noop;
      }
    };
    let resolvePromise = (value: T[] | PromiseLike<T[]>): void => {
      const promise = Promise.resolve(value);

      promise.catch(noop);
      buildPromise = () => promise;
    };
    let rejectPromise = (reason?: unknown): void => {
      buildPromise = lazyValue(() => Promise.reject(reason));
      addPromises = noop;
      resolvePromise = noop;
      rejectPromise = noop;
    };
    let buildPromise = lazyValue(
      () => new Promise<T[]>((resolve, reject) => {
          done = true;
          resolvePromise = resolve;
          rejectPromise = reject;
        }),
    );

    this.add = (...promises) => {
      addPromises(promises);

      return this;
    };
    this.reject = reason => rejectPromise(reason);
    this.whenDone = () => buildPromise();

    if (promises.length) {
      addPromises(promises);
    }
  }

}
