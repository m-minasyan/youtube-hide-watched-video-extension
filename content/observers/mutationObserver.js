import { debounce } from '../utils/debounce.js';
import { CSS_CLASSES } from '../utils/constants.js';

export function setupMutationObserver(applyHiding) {
  const debouncedApplyHiding = debounce(applyHiding, 250);

  const observer = new MutationObserver((mutations) => {
    let shouldApplyHiding = false;

    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
        const target = mutation.target;
        if (target.getAttribute('aria-hidden') === 'true' &&
            target.querySelector(`.${CSS_CLASSES.EYE_BUTTON}`)) {
          target.removeAttribute('aria-hidden');
        }
      } else if (mutation.type === 'childList') {
        shouldApplyHiding = true;
      }
    });

    if (shouldApplyHiding) {
      if (mutations.length === 1 &&
          (mutations[0].target.classList?.contains(CSS_CLASSES.WATCHED_DIMMED) ||
           mutations[0].target.classList?.contains(CSS_CLASSES.WATCHED_HIDDEN) ||
           mutations[0].target.classList?.contains(CSS_CLASSES.SHORTS_DIMMED) ||
           mutations[0].target.classList?.contains(CSS_CLASSES.SHORTS_HIDDEN))) {
        return;
      }
      debouncedApplyHiding();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-hidden']
  });

  return observer;
}
