import { noop } from '@proc7ts/primitives';
import { LockFailedError } from './lock-failed.error.js';

/**
 * [Semaphore](https://en.wikipedia.org/wiki/Semaphore_(programming)) instance.
 *
 * Permits pre-configured maximum simultaneous acquires.
 *
 * It is expected that each {@link acquire} is followed by corresponding {@link release}.
 */
export class Semaphore {

  readonly #maxPermits: number;
  #permits: number;
  #head: Semaphore$PendingAcquire | undefined;
  #tail: Semaphore$PendingAcquire | undefined;
  #closed: [reason: unknown] | undefined;

  /**
   * Constructs a semaphore.
   *
   * @param init - Either the maximum simultaneous {@link acquire acquires} permitted, or semaphore
   * {@link SemaphoreInit initialization parameters}. `1` by default.
   */
  constructor(init: number | SemaphoreInit = 1) {
    if (typeof init === 'number') {
      this.#permits = this.#maxPermits = Math.max(1, init);
    } else {
      const { maxPermits = 1, permits } = init;

      this.#maxPermits = Math.max(1, maxPermits);
      this.#permits =
        permits == null ? this.#maxPermits : Math.min(Math.max(0, permits), this.#maxPermits);
    }
  }

  /**
   * The maximum simultaneous {@link acquire acquires} permitted.
   */
  get maxPermits(): number {
    return this.#maxPermits;
  }

  /**
   * Simultaneous {@link acquire acquires} permitted at the moment.
   *
   * Decreased with each {@link acquire}, and increased with each {@link release}. When dropped to zero, the next
   * call to {@link acquire} would block.
   */
  get permits(): number {
    return this.#permits;
  }

  /**
   * Informs whether this semaphore is {@link close closed}.
   *
   * @returns `true` after the {@link close} method has been called, or `false` otherwise.
   */
  isClosed(): boolean {
    return !!this.#closed;
  }

  /**
   * Acquires lock.
   *
   * Decreases the number of available {@link permits} when available, or blocks until one available.
   *
   * @params acquirer - Semaphore acquire abort signal. The returned promise would be rejected once the acquire aborted.
   *
   * @returns A promise resolved either immediately if permit available, or once permit becomes available after
   * {@link release} call. This promise may be rejected with {@link LockFailedError} when semaphore
   * {@link close closed}, or when the lock acquire aborted.
   */
  acquire(acquirer?: AbortSignal): Promise<void> {
    const closed = this.#closed;

    if (closed) {
      return Promise.reject(closed[0]);
    }
    if (acquirer?.aborted) {
      return Promise.reject(this.#acquireAborted(acquirer));
    }

    if (this.#permits > 0) {
      --this.#permits;

      return Promise.resolve();
    }

    return new Promise<void>((give, abort) => {
      this.#waitForLock(give, abort, acquirer);
    });
  }

  #waitForLock(grant: () => void, abort: (reason?: unknown) => void, acquirer?: AbortSignal): void {
    const acquire = new Semaphore$PendingAcquire(grant, abort, acquire => {
      this.#remove(acquire);
    });

    if (this.#tail) {
      acquire.prev = this.#tail;
      this.#tail.next = acquire;
      this.#tail = acquire;
    } else {
      this.#head = this.#tail = acquire;
    }

    acquirer?.addEventListener('abort', () => {
      const { reason } = acquirer;

      acquire.abort(reason instanceof LockFailedError ? reason : this.#acquireAborted(acquirer));
    });
  }

  #acquireAborted({ reason }: AbortSignal): LockFailedError {
    return new LockFailedError('Lock acquire aborted', { cause: reason });
  }

  /**
   * Releases previously {@link acquire acquired} lock.
   *
   * Increases the number of available {@link permits}. If there are pending acquires awaiting for the lock, the very
   * first one receives it, while the rest continue to wait.
   */
  release(): void {
    const head = this.#head;

    if (head) {
      head.grant();
    } else if (this.#permits < this.#maxPermits) {
      ++this.#permits;
    } else {
      throw new TypeError('All locks released already');
    }
  }

  #remove(acquire: Semaphore$PendingAcquire): void {
    const { prev, next } = acquire;

    if (prev) {
      prev.next = next;
      delete acquire.prev;
    } else {
      this.#head = next;
    }
    if (next) {
      next.prev = prev;
      delete acquire.next;
    } else {
      this.#tail = prev;
    }
  }

  /**
   * Closes semaphore and aborts all pending lock {@link acquire acquires} with the given `reason`.
   *
   * Locks can not be acquired once semaphore closed. All {@link acquire} method calls would result to an
   * error after that.
   *
   * @param reason - Optional acquire abort reason. Defaults to {@link LockFailedError} with appropriate message.
   */
  close(reason = new LockFailedError('Semaphore closed')): void {
    if (!this.#closed) {
      this.#closed = [reason];
      this.#abortAll(reason);
    }
  }

  #abortAll(reason: unknown): void {
    let acquire = this.#head;

    while (acquire) {
      acquire.abort(reason);
      acquire = acquire.next;
    }
  }

}

/**
 * Semaphore initialization parameters.
 */
export interface SemaphoreInit {
  /**
   * The maximum simultaneous {@link Semaphore#acquire acquires} permitted. `1` by default.
   */
  readonly maxPermits?: number | undefined;

  /**
   * The number of initially available permits. Defaults to {@link maxPermits}.
   */
  readonly permits?: number | undefined;
}

class Semaphore$PendingAcquire {

  #grant: () => void;
  #abort: (reason: unknown) => void;
  #drop: (acquire: Semaphore$PendingAcquire) => void;
  prev?: Semaphore$PendingAcquire;
  next?: Semaphore$PendingAcquire;

  constructor(
    grant: () => void,
    abort: (reason: unknown) => void,
    drop: (acquire: Semaphore$PendingAcquire) => void,
  ) {
    this.#grant = grant;
    this.#abort = abort;
    this.#drop = drop;
  }

  grant(): void {
    this.#drop(this);
    this.#grant();
    this.#drop = this.#grant = this.#abort = noop;
  }

  abort(reason: unknown): void {
    this.#drop(this);
    this.#abort(reason);
    this.#drop = this.#grant = this.#abort = noop;
  }

}
