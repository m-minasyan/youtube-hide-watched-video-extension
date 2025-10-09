import { CSS_CLASSES } from '../utils/constants.js';

export function handleAriaHiddenConflicts() {
  const eyeButtons = document.querySelectorAll(`.${CSS_CLASSES.EYE_BUTTON}`);
  eyeButtons.forEach(button => {
    const ariaHiddenParent = button.closest('[aria-hidden="true"]');
    if (ariaHiddenParent) {
      ariaHiddenParent.removeAttribute('aria-hidden');
    }
  });
}
