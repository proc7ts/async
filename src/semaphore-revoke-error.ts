/**
 * An error indicating the lock can not be {@link Semaphore#acquire acquired}, unless explicit reason specified.
 */
export class SemaphoreRevokeError extends Error {

  constructor(message = 'Semaphore revoked', options?: ErrorOptions) {
    super(message, options);
  }

  get name(): string {
    return 'SemaphoreRevokeError';
  }

}
