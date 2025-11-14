import { SELECTOR_CHAINS } from '../../shared/constants.js';

/**
 * Generate comprehensive DOM diagnostic report
 * @returns {Object} Diagnostic report with element counts
 */
export function generateDOMDiagnosticReport() {
  const report = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    elementCounts: {},
    sampleElements: {}
  };

  // Test each selector chain
  for (const [key, selectors] of Object.entries(SELECTOR_CHAINS)) {
    report.elementCounts[key] = {};
    report.sampleElements[key] = {};

    selectors.forEach((selector, index) => {
      try {
        const elements = document.querySelectorAll(selector);
        report.elementCounts[key][`fallback_${index}`] = elements.length;

        if (elements.length > 0) {
          // Sample first element's structure
          report.sampleElements[key][`fallback_${index}`] = {
            tagName: elements[0].tagName,
            className: elements[0].className,
            attributes: Array.from(elements[0].attributes).map(attr => ({
              name: attr.name,
              value: attr.value.substring(0, 50) // Truncate long values
            }))
          };
        }
      } catch (error) {
        report.elementCounts[key][`fallback_${index}`] = `ERROR: ${error.message}`;
      }
    });
  }

  return report;
}

/**
 * Print DOM diagnostics to console
 * @returns {Object} The diagnostic report
 */
export function printDOMDiagnostics() {
  const report = generateDOMDiagnosticReport();
  console.log('[YT-HWV DOM Diagnostics]', JSON.stringify(report, null, 2));
  return report;
}

/**
 * Export DOM diagnostics as JSON file
 */
export function exportDOMDiagnostics() {
  const report = generateDOMDiagnosticReport();
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `ythwv-dom-diagnostics-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);

  console.log('[YT-HWV] Diagnostics exported');
}

// Expose for debugging
if (typeof window !== 'undefined') {
  window.YTHWV_DOMDiagnostics = {
    print: printDOMDiagnostics,
    export: exportDOMDiagnostics,
    generate: generateDOMDiagnosticReport
  };
}
