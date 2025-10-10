/**
 * Remove a CSS class from all elements that have it
 */
export function removeClassFromAll(className) {
  document.querySelectorAll(`.${className}`).forEach((el) => {
    el.classList.remove(className);
  });
}

/**
 * Remove multiple CSS classes from all elements
 */
export function removeClassesFromAll(...classNames) {
  classNames.forEach((className) => {
    removeClassFromAll(className);
  });
}
