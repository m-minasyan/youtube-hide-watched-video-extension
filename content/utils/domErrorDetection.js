import { checkCriticalSelectorsHealth, getSelectorHealth } from './domSelectorHealth.js';
import { showNotification, NotificationType } from '../../shared/notifications.js';
import { SELECTOR_HEALTH_CONFIG } from '../../shared/constants.js';

// Track notification timestamps to prevent spam
const lastNotifications = new Map();

/**
 * Setup periodic DOM health monitoring
 */
export function setupDOMHealthMonitoring() {
  // Check selector health periodically
  setInterval(() => {
    performHealthCheck();
  }, SELECTOR_HEALTH_CONFIG.HEALTH_CHECK_INTERVAL);
}

/**
 * Perform health check on critical selectors
 * @private
 */
function performHealthCheck() {
  const unhealthySelectors = checkCriticalSelectorsHealth();

  if (unhealthySelectors.length > 0) {
    handleUnhealthySelectors(unhealthySelectors);
  }
}

/**
 * Handle unhealthy selectors by notifying users
 * @private
 * @param {Array} unhealthySelectors - Array of unhealthy selector data
 */
function handleUnhealthySelectors(unhealthySelectors) {
  for (const { key, health } of unhealthySelectors) {
    const lastNotification = lastNotifications.get(key);
    const now = Date.now();

    // Check cooldown
    if (lastNotification && (now - lastNotification) < SELECTOR_HEALTH_CONFIG.NOTIFICATION_COOLDOWN) {
      continue;
    }

    // Determine severity
    const severity = getSeverity(health.successRate);

    if (severity === 'critical') {
      showCriticalSelectorFailure(key, health);
      lastNotifications.set(key, now);
    } else if (severity === 'warning') {
      showSelectorWarning(key, health);
      lastNotifications.set(key, now);
    }
  }
}

/**
 * Get severity level based on success rate
 * @private
 * @param {number} successRate - Success rate (0-1)
 * @returns {string} Severity level
 */
function getSeverity(successRate) {
  if (successRate < 0.3) return 'critical';
  if (successRate < 0.7) return 'warning';
  return 'ok';
}

/**
 * Show critical selector failure notification
 * @private
 * @param {string} selectorKey - Selector identifier
 * @param {Object} health - Health statistics
 */
function showCriticalSelectorFailure(selectorKey, health) {
  const message = 'YouTube structure changed. Some videos may not be detected. Please report this issue.';

  console.error('[YT-HWV] Critical selector failure:',
    'selector:', selectorKey,
    'successRate:', health.successRate,
    'queries:', health.queries
  );

  showNotification(message, NotificationType.ERROR, 8000);
}

/**
 * Show selector warning notification
 * @private
 * @param {string} selectorKey - Selector identifier
 * @param {Object} health - Health statistics
 */
function showSelectorWarning(selectorKey, health) {
  const message = 'Extension may not detect all videos. YouTube might have changed their layout.';

  console.warn('[YT-HWV] Selector degradation:',
    'selector:', selectorKey,
    'successRate:', health.successRate
  );

  showNotification(message, NotificationType.WARNING, 5000);
}

/**
 * Manual trigger for testing DOM health
 * @returns {boolean} True if all selectors are healthy
 */
export function testDOMHealth() {
  const unhealthySelectors = checkCriticalSelectorsHealth();

  if (unhealthySelectors.length === 0) {
    showNotification('All DOM selectors are healthy', NotificationType.SUCCESS, 3000);
    return true;
  }

  handleUnhealthySelectors(unhealthySelectors);
  return false;
}

// Expose for debugging
if (typeof window !== 'undefined') {
  window.YTHWV_TestDOMHealth = testDOMHealth;
}
