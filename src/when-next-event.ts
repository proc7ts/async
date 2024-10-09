/* istanbul ignore next */
const setImmediate = globalThis.setImmediate ?? globalThis.setTimeout;

/**
 * Awaits for the next event.
 *
 * Utilizes [setImmediate] function when available (e.g. in Node.js). Falls back to [setTimeout] otherwise.
 *
 * @returns A promise resolved when the next event cycle starts.
 *
 * [setImmediate]: https://developer.mozilla.org/docs/Web/API/Window/setImmediate
 * [setTimeout]: https://developer.mozilla.org/docs/Web/API/setTimeout
 */
export function whenNextEvent(): Promise<void> {
  return new Promise(resolve =>
    setImmediate(() => {
      resolve();
    }),
  );
}
