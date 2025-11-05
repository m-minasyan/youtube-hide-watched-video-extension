import { debounce } from '../utils/debounce.js';
import { clearAllCaches, logCacheStats } from '../utils/domCache.js';
import { DEBUG } from '../utils/constants.js';
import { reconnectIntersectionObserver } from './intersectionObserver.js';
import { debug } from '../utils/logger.js';

export function setupUrlObserver(applyHiding) {
  const debouncedApplyHiding = debounce(applyHiding, 100);

  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      if (DEBUG) {
        debug('[YT-HWV] URL changed, clearing DOM cache and reconnecting IntersectionObserver');
        logCacheStats();
      }

      clearAllCaches();
      reconnectIntersectionObserver();
      lastUrl = url;
      setTimeout(debouncedApplyHiding, 100);
    }
  });

  observer.observe(document, {
    subtree: true,
    childList: true
  });

  return observer;
}
