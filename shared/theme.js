import { STORAGE_KEYS } from './constants.js';

/**
 * Initialize theme based on storage or system preference
 */
export async function initTheme() {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.THEME);
  let theme = result[STORAGE_KEYS.THEME];

  if (!theme || theme === 'auto') {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = isDarkMode ? 'dark' : 'light';

    if (!result[STORAGE_KEYS.THEME]) {
      await chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: theme });
    }
  }

  applyTheme(theme);
}

/**
 * Toggle between light and dark themes
 */
export async function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  applyTheme(newTheme);
  await chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: newTheme });
}

/**
 * Apply theme to document
 */
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}
