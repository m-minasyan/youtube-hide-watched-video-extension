import { DEBUG } from './constants.js';

export function logDebug(...msgs) {
  if (DEBUG) console.log('[YT-HWV]', ...msgs);
}
