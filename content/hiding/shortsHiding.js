import { CSS_CLASSES } from '../utils/constants.js';
import { getShortsState } from '../storage/settings.js';
import { determineYoutubeSection } from '../detection/sectionDetector.js';
import { findShortsContainers } from '../detection/shortsDetector.js';

export function updateClassOnShortsItems() {
  document.querySelectorAll(`.${CSS_CLASSES.SHORTS_DIMMED}`).forEach((el) => el.classList.remove(CSS_CLASSES.SHORTS_DIMMED));
  document.querySelectorAll(`.${CSS_CLASSES.SHORTS_HIDDEN}`).forEach((el) => el.classList.remove(CSS_CLASSES.SHORTS_HIDDEN));

  const section = determineYoutubeSection();
  const state = getShortsState(section) || 'normal';

  if (state === 'normal') return;

  const shortsContainers = findShortsContainers();

  shortsContainers.forEach((item) => {
    if (state === 'dimmed') {
      item.classList.add(CSS_CLASSES.SHORTS_DIMMED);
    } else if (state === 'hidden') {
      item.classList.add(CSS_CLASSES.SHORTS_HIDDEN);
    }
  });
}
