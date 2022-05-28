import { noop } from '@proc7ts/primitives';
import { Supply, type SupplyPeer } from '@proc7ts/supply';
import { SemaphoreRevokeError } from './semaphore-revoke-error.js';

/**
 * [Semaphore](https://en.wikipedia.org/wiki/Semaphore_(programming)) instance.
 *
 * Permits preconfigured maximum simultaneous acquires.
 *
 * It is expected that each {@link acquire} is followed by corresponding {@link release}.
 */
export class Semaphore implements SupplyPeer {

  readonly #maxPermits: number;
  readonly #supply: Supply;
  #permits: number;
  #head: Semaphore$User | undefined;
  #tail: Semaphore$User | undefined;

  /**
   * Constructs a semaphore.
   *
   * @param init - Either the maximum simultaneous {@link acquire acquires} permitted, or semaphore
   * {@link SemaphoreInit initialization parameters}. `1` by default.
   */
  constructor(init: number | SemaphoreInit = 1) {
    if (typeof init === 'number') {
      this.#permits = this.#maxPermits = Math.max(1, init);
      this.#supply = new Supply;
    } else {

      const { maxPermits = 1, permits, supply = new Supply } = init;

      this.#maxPermits = Math.max(1, maxPermits);
      this.#permits = permits == null
          ? this.#maxPermits
          : Math.min(Math.max(0, permits), this.#maxPermits);
      this.#supply = supply;
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
   * Semaphore supply.
   *
   * No more locks can not be acquired one this supply cut off. All {@link Semaphore.acquire} method calls would
   * result to an error after that.
   */
  get supply(): Supply {
    return this.#supply;
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

    const supply = acquirer ? acquirer.supply.needs(this) : this.supply;

    if (supply.isOff) {

      const { reason = new SemaphoreRevokeError } = supply;

      return Promise.reject(reason);
    }

    if (this.#permits > 0) {
      --this.#permits;

      return Promise.resolve();
    }

    return new Promise<void>((give, revoke) => {
      this.#use(give, revoke, supply);
    });
  }

  #use(
      grant: () => void,
      revoke: (reason?: unknown) => void,
      supply: Supply,
  ): void {

    const user = new Semaphore$User(grant, revoke, user => {
      this.#remove(user);
      done();
    });

    if (this.#tail) {
      user.prev = this.#tail;
      this.#tail.next = user;
      this.#tail = user;
    } else {
      this.#head = this.#tail = user;
    }

    const supplyReceiver = {
      isOff: false,
      off: (reason: unknown = new SemaphoreRevokeError()) => user.revoke(reason),
    };

    supply.to(supplyReceiver);

    function done(): void {
      supplyReceiver.isOff = true;
      supplyReceiver.off = noop;
    }
  }

  /**
   * Releases lock.
   *
   * Increases the number of available {@link permits}. If there are promises await for lock, the very first one
   * receives it, while the rest continue to wait.
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

  #remove(user: Semaphore$User): void {

    const { prev, next } = user;

    if (prev) {
      prev.next = next;
      delete user.prev;
    } else {
      this.#head = next;
    }
    if (next) {
      next.prev = prev;
      delete user.next;
    } else {
      this.#tail = prev;
    }
  }

}

/**
 * Semaphore initialization parameters.
 */
export interface SemaphoreInit {

  /**
   * The maximum simultaneous {@link Semaphore.acquire acquires} permitted. `1` by default.
   */
  readonly maxPermits?: number | undefined;

  /**
   * The number of initially available permits. Defaults to {@link maxPermits}.
   */
  readonly permits?: number | undefined;

  /**
   * Explicit semaphore supply.
   *
   * No more locks can not be acquired one this supply cut off. All {@link Semaphore.acquire} method calls would
   * result to an error after that.
   */
  readonly supply?: Supply | undefined;

}

class Semaphore$User {

  #grant: () => void;
  #revoke: (reason: unknown) => void;
  #drop: (user: Semaphore$User) => void;
  prev?: Semaphore$User;
  next?: Semaphore$User;

  constructor(grant: () => void, revoke: (reason: unknown) => void, drop: (user: Semaphore$User) => void) {
    this.#grant = grant;
    this.#revoke = revoke;
    this.#drop = drop;
  }

  grant(): void {
    this.#drop(this);
    this.#grant();
    this.#drop = this.#grant = this.#revoke = noop;
  }

  revoke(reason: unknown): void {
    this.#drop(this);
    this.#revoke(reason);
    this.#drop = this.#grant = this.#revoke = noop;
  }

}
