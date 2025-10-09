import { injectStyles } from './ui/styles.js';
import { loadSettings } from './storage/settings.js';
import { applyHiding, setupMessageListener } from './events/eventHandler.js';
import { setupMutationObserver } from './observers/mutationObserver.js';
import { setupUrlObserver } from './observers/urlObserver.js';
import { setupXhrObserver } from './observers/xhrObserver.js';
import { logDebug } from './utils/logger.js';

async function init() {
  injectStyles();
  await loadSettings();
  applyHiding();

  setupMutationObserver(applyHiding);
  setupXhrObserver(applyHiding);
  setupUrlObserver(applyHiding);
  setupMessageListener();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

logDebug('YouTube Hide Watched Videos extension loaded');
