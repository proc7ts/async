import { describe, expect, it } from '@jest/globals';
import { whenNextEvent } from './when-next-event.js';

describe('whenNextEvent', () => {
  it('is resolved on next event', async () => {
    let resolved1 = false;
    let resolved2 = false;

    const promise1 = Promise.resolve().then(() => {
      resolved1 = true;
    });
    const promise2 = whenNextEvent().then(() => {
      resolved2 = true;
    });

    expect(resolved1).toBe(false);
    expect(resolved2).toBe(false);

    await promise1;
    expect(resolved1).toBe(true);
    expect(resolved2).toBe(false);

    await promise2;
    expect(resolved1).toBe(true);
    expect(resolved2).toBe(true);
  });
});
