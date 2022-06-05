import { lazyValue, noop } from '@proc7ts/primitives';

/**
 * A resolver of promise that can be created later or not created at all.
 *
 * Creates the promise only on demand.
 *
 * The methods of this object do not require `this` context and can be called as functions.
 */
export class PromiseResolver<in out T = void> {

  /**
   * Resolves the promise.
   *
   * Has no effect when the promised is already settled.
   *
   * Can be called before the promise constructed.
   *
   * @param resolution - Either a promise value, or a promise-like instance resolving to one.
   */
  readonly resolve: (this: void, resolution: T | PromiseLike<T>) => void;

  /**
   * Rejects the promise.
   *
   * Has no effect when the promised is already settled.
   *
   * Can be called before the promise constructed.
   *
   * @param reason - Promise rejection reason.
   */
  readonly reject: (this: void, reason?: unknown) => void;

  /**
   * Creates a promise resolved by {@link resolve}, or rejected by {@link reject}.
   *
   * The subsequent calls to this method return the same promise instance.
   *
   * @returns Created promise.
   */
  readonly promise: (this: void) => Promise<T>;

  constructor() {

    let resolvePromise: (value: T | PromiseLike<T>) => void;
    let rejectPromise: (reason?: unknown) => void;
    let buildPromise = lazyValue(() => new Promise<T>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    }));
    const settle = (resolution: () => Promise<T>): void => {
      buildPromise = lazyValue(resolution);
      resolvePromise = noop;
      rejectPromise = noop;
    };

    resolvePromise = value => {
      settle(() => Promise.resolve(value));
    };
    rejectPromise = error => {
      settle(() => Promise.reject(error));
    };

    this.resolve = value => resolvePromise(value);
    this.reject = reason => rejectPromise(reason);
    this.promise = () => buildPromise();
  }

}
