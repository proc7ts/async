import { isPromiseLike, lazyValue, noop } from '@proc7ts/primitives';

/**
 * A resolver of promise that can be created later or not created at all.
 *
 * Creates the promise only on demand.
 *
 * The methods of this object do not require `this` context and can be called as functions.
 *
 * @typeParam T - The type of value the promise resolves to.
 */
export class PromiseResolver<in out T = void> {
  /**
   * Resolves the promise.
   *
   * Has no effect when the {@link whenDone resulting} promise already settled.
   *
   * Can be called before the resulting promise {@link whenDone created}.
   *
   * @param resolution - Either a promise value, or a promise-like instance resolving to one.
   */
  readonly resolve: (this: void, resolution: T | PromiseLike<T>) => void;

  /**
   * Rejects the promise.
   *
   * Has no effect when the {@link whenDone resulting} promise already settled.
   *
   * Can be called before the resulting promise {@link whenDone created}.
   *
   * @param reason - Promise rejection reason.
   */
  readonly reject: (this: void, reason?: unknown) => void;

  /**
   * Creates a promise resolved by {@link resolve}, or rejected by {@link reject}.
   *
   * The subsequent calls to this method return the same promise instance.
   *
   * @returns Resulting promise.
   */
  readonly whenDone: (this: void) => Promise<T>;

  /**
   * Construct promise resolver.
   */
  constructor() {
    const settle = (resolution: () => Promise<T>): void => {
      buildPromise = lazyValue(resolution);
      resolvePromise = noop;
      rejectPromise = noop;
    };

    let resolvePromise = (value: T | PromiseLike<T>): void => {
      if (isPromiseLike(value)) {
        const promise = Promise.resolve(value);

        promise.catch(noop);
        settle(() => promise);
      } else {
        settle(() => Promise.resolve(value));
      }
    };
    let rejectPromise = (reason?: unknown): void => {
      settle(() => Promise.reject(reason));
    };
    let buildPromise = lazyValue(
      () =>
        new Promise<T>((resolve, reject) => {
          resolvePromise = resolve;
          rejectPromise = reject;
        }),
    );

    this.resolve = value => resolvePromise(value);
    this.reject = reason => rejectPromise(reason);
    this.whenDone = () => buildPromise();
  }
}
