import { debounce } from '../utils/debounce.js';

export function setupUrlObserver(applyHiding) {
  const debouncedApplyHiding = debounce(applyHiding, 100);

  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
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
