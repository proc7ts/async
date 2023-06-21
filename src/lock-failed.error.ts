/**
 * An error indicating the lock can not be {@link Semaphore#acquire acquired}.
 */
export class LockFailedError extends Error {

  constructor(message = 'Can not acquire lock', options?: ErrorOptions) {
    super(message, options);
    this.name = 'LockFailedError';
  }

}
