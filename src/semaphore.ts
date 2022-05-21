import { type Supply, type SupplyPeer } from '@proc7ts/supply';
import { SemaphoreRevokeError } from './semaphore-revoke-error.js';

/**
 * [Semaphore](https://en.wikipedia.org/wiki/Semaphore_(programming)) instance.
 *
 * Permits preconfigured maximum simultaneous acquires.
 *
 * It is expected that each {@link acquire} is followed by corresponding {@link release}.
 */
export class Semaphore {

  readonly #maxPermits: number;
  #permits: number;
  #head: Semaphore$User | undefined;
  #tail: Semaphore$User | undefined;

  /**
   * Constructs a semaphore.
   *
   * @param maxPermits - The maximum simultaneous {@link acquire acquires} permitted. `1` by default.
   * @param permits - The number of initially available permits. Defaults to `maxPermits`.
   */
  constructor(maxPermits = 1, permits?: number) {
    this.#maxPermits = Math.max(1, maxPermits);
    this.#permits
        = permits == null ? this.#maxPermits : Math.min(Math.max(0, permits), this.#maxPermits);
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
   * Acquires lock.
   *
   * Decreases the number of available {@link permits} when available, or blocks until one available.
   *
   * @params acquirer - Semaphore acquirer supply. The returned promise would be rejected once this supply cut off.
   *
   * @returns A promise resolved immediately if permit available, or one resolved once permit becomes available after
   * {@link release} call.
   */
  acquire(acquirer?: SupplyPeer): Promise<void> {
    const supply = acquirer?.supply;

    if (supply?.isOff) {
      return new Promise<void>((_, reject) => supply.whenOff(
          (reason: unknown = new SemaphoreRevokeError()) => reject(reason),
      ));
    }

    if (this.#permits > 0) {
      --this.#permits;

      return Promise.resolve();
    }

    return new Promise<void>((give, reject) => {
      const user = this.#use(give, reject, supply);

      this.#tail = this.#tail?.add(user) || (this.#head = user);
    });
  }

  #use(
      grant: () => void,
      revoke: (reason?: unknown) => void,
      supply: Supply | undefined,
  ): Semaphore$User {
    if (supply) {
      const whenRevoked = (reason: unknown = new SemaphoreRevokeError()): void => {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        this.#setHead(user.revoke(reason));
      };

      supply.whenOff(whenRevoked);
    }

    const user = new Semaphore$User(grant, revoke);

    return user;
  }

  /**
   * Releases lock.
   *
   * Increases the number of available {@link permits}. If there are promises await for lock, the very first one
   * receives it, while the rest continue to wait.
   */
  release(): void {
    if (this.#head) {
      this.#setHead(this.#head.grant());
    } else {
      this.#permits = Math.min(this.#permits + 1, this.#maxPermits);
    }
  }

  #setHead(head: Semaphore$User | undefined): void {
    this.#head = head;

    if (!head) {
      this.#tail = undefined;
    }
  }

}

class Semaphore$User {

  readonly #grant: () => void;
  readonly #revoke: (reason: unknown) => void;
  #next: Semaphore$User | undefined;

  constructor(grant: () => void, revoke: (reason: unknown) => void) {
    this.#grant = grant;
    this.#revoke = revoke;
  }

  add(next: Semaphore$User): Semaphore$User {
    return this.#next?.add(next) || (this.#next = next);
  }

  grant(): Semaphore$User | undefined {
    this.#grant();

    return this.#next;
  }

  revoke(reason: unknown): Semaphore$User | undefined {
    this.#revoke(reason);

    return this.#next;
  }

}
