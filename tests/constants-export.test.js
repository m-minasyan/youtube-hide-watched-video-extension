describe('Content Constants Re-export', () => {
  test('should export CACHE_CONFIG from content utils constants', () => {
    const constants = require('../content/utils/constants.js');
    expect(constants.CACHE_CONFIG).toBeDefined();
    expect(constants.CACHE_CONFIG.PROGRESS_BAR_TTL).toBe(500);
    expect(constants.CACHE_CONFIG.DOCUMENT_QUERY_TTL).toBe(1000);
    expect(constants.CACHE_CONFIG.STATS_LOG_INTERVAL).toBe(30000);
  });

  test('should have all required CACHE_CONFIG properties', () => {
    const constants = require('../content/utils/constants.js');
    const requiredProps = [
      'DOCUMENT_QUERY_TTL',
      'PROGRESS_BAR_TTL',
      'STATS_LOG_INTERVAL',
      'ENABLE_PERFORMANCE_MONITORING'
    ];

    requiredProps.forEach(prop => {
      expect(constants.CACHE_CONFIG).toHaveProperty(prop);
    });
  });

  test('should export all required constants from shared', () => {
    const constants = require('../content/utils/constants.js');

    // Check all expected exports
    expect(constants.DEBUG).toBeDefined();
    expect(constants.STORAGE_KEYS).toBeDefined();
    expect(constants.HIDDEN_VIDEO_MESSAGES).toBeDefined();
    expect(constants.CSS_CLASSES).toBeDefined();
    expect(constants.SELECTORS).toBeDefined();
    expect(constants.SELECTOR_STRINGS).toBeDefined();
    expect(constants.ERROR_CONFIG).toBeDefined();
    expect(constants.CACHE_CONFIG).toBeDefined();
  });

  test('CACHE_CONFIG values should be numbers and booleans', () => {
    const constants = require('../content/utils/constants.js');

    expect(typeof constants.CACHE_CONFIG.PROGRESS_BAR_TTL).toBe('number');
    expect(typeof constants.CACHE_CONFIG.DOCUMENT_QUERY_TTL).toBe('number');
    expect(typeof constants.CACHE_CONFIG.STATS_LOG_INTERVAL).toBe('number');
    expect(typeof constants.CACHE_CONFIG.ENABLE_PERFORMANCE_MONITORING).toBe('boolean');
  });

  test('CACHE_CONFIG TTL values should be positive', () => {
    const constants = require('../content/utils/constants.js');

    expect(constants.CACHE_CONFIG.PROGRESS_BAR_TTL).toBeGreaterThan(0);
    expect(constants.CACHE_CONFIG.DOCUMENT_QUERY_TTL).toBeGreaterThan(0);
    expect(constants.CACHE_CONFIG.STATS_LOG_INTERVAL).toBeGreaterThan(0);
  });
});
