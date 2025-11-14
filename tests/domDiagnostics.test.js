import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  generateDOMDiagnosticReport,
  printDOMDiagnostics,
  exportDOMDiagnostics
} from '../content/utils/domDiagnostics.js';
import { SELECTOR_CHAINS } from '../shared/constants.js';

describe('DOM Diagnostics', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('Diagnostic Report Generation', () => {
    it('should generate complete diagnostic report', () => {
      const report = generateDOMDiagnosticReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('userAgent');
      expect(report).toHaveProperty('url');
      expect(report).toHaveProperty('elementCounts');
      expect(report).toHaveProperty('sampleElements');
    });

    it('should include timestamp in ISO format', () => {
      const report = generateDOMDiagnosticReport();

      expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include user agent string', () => {
      const report = generateDOMDiagnosticReport();

      expect(report.userAgent).toBe(navigator.userAgent);
      expect(typeof report.userAgent).toBe('string');
      expect(report.userAgent.length).toBeGreaterThan(0);
    });

    it('should include current URL', () => {
      const report = generateDOMDiagnosticReport();

      expect(report.url).toBe(window.location.href);
      expect(typeof report.url).toBe('string');
    });
  });

  describe('Element Count Testing', () => {
    it('should test all selector chains', () => {
      const report = generateDOMDiagnosticReport();

      const chainKeys = Object.keys(SELECTOR_CHAINS);
      chainKeys.forEach(key => {
        expect(report.elementCounts).toHaveProperty(key);
      });
    });

    it('should count elements for each fallback', () => {
      document.body.innerHTML = `
        <div class="ytd-thumbnail-overlay-resume-playback-renderer">Test 1</div>
        <div class="ytd-thumbnail-overlay-resume-playback-renderer">Test 2</div>
      `;

      const report = generateDOMDiagnosticReport();

      expect(report.elementCounts.PROGRESS_BAR).toBeDefined();
      expect(report.elementCounts.PROGRESS_BAR.fallback_0).toBeGreaterThan(0);
    });

    it('should handle zero element counts', () => {
      document.body.innerHTML = '<div class="unrelated">Nothing here</div>';

      const report = generateDOMDiagnosticReport();

      // Most selectors should have 0 counts
      expect(report.elementCounts.PROGRESS_BAR.fallback_0).toBe(0);
    });

    it('should include fallback indices', () => {
      const report = generateDOMDiagnosticReport();

      const progressBarCounts = report.elementCounts.PROGRESS_BAR;
      expect(progressBarCounts).toHaveProperty('fallback_0');
      expect(progressBarCounts).toHaveProperty('fallback_1');
      expect(progressBarCounts).toHaveProperty('fallback_2');
    });
  });

  describe('Sample Element Analysis', () => {
    it('should sample first element when found', () => {
      document.body.innerHTML = `
        <yt-thumbnail-view-model class="test-thumb">Test</yt-thumbnail-view-model>
      `;

      const report = generateDOMDiagnosticReport();

      const thumbnailSamples = report.sampleElements.VIDEO_THUMBNAIL;
      const firstFallback = thumbnailSamples.fallback_0;

      expect(firstFallback).toBeDefined();
      expect(firstFallback.tagName).toBe('YT-THUMBNAIL-VIEW-MODEL');
      expect(firstFallback.className).toContain('test-thumb');
      expect(firstFallback.attributes).toBeDefined();
      expect(Array.isArray(firstFallback.attributes)).toBe(true);
    });

    it('should include element attributes', () => {
      document.body.innerHTML = `
        <div class="test" id="test-id" data-video-id="abc123">Test</div>
      `;

      const report = generateDOMDiagnosticReport();

      // Find any sample with attributes
      let foundSample = null;
      Object.values(report.sampleElements).forEach(chain => {
        Object.values(chain).forEach(sample => {
          if (sample && sample.attributes && sample.attributes.length > 0) {
            foundSample = sample;
          }
        });
      });

      if (foundSample) {
        expect(Array.isArray(foundSample.attributes)).toBe(true);
        expect(foundSample.attributes.length).toBeGreaterThan(0);
        foundSample.attributes.forEach(attr => {
          expect(attr).toHaveProperty('name');
          expect(attr).toHaveProperty('value');
        });
      }
    });

    it('should truncate long attribute values', () => {
      const longValue = 'a'.repeat(100);
      document.body.innerHTML = `
        <div class="test" data-long="${longValue}">Test</div>
      `;

      const report = generateDOMDiagnosticReport();

      // Check if any sample has truncated values
      Object.values(report.sampleElements).forEach(chain => {
        Object.values(chain).forEach(sample => {
          if (sample && sample.attributes) {
            sample.attributes.forEach(attr => {
              expect(attr.value.length).toBeLessThanOrEqual(50);
            });
          }
        });
      });
    });

    it('should not include samples when no elements found', () => {
      document.body.innerHTML = '<div>Empty</div>';

      const report = generateDOMDiagnosticReport();

      // All chains should have empty sample objects
      Object.values(report.sampleElements).forEach(chain => {
        // Chain object should exist but may have no samples
        expect(chain).toBeDefined();
        expect(typeof chain).toBe('object');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid selectors gracefully', () => {
      const report = generateDOMDiagnosticReport();

      // Report should still be generated
      expect(report).toBeDefined();
      expect(report.elementCounts).toBeDefined();

      // Check if any errors were captured
      Object.values(report.elementCounts).forEach(chain => {
        Object.values(chain).forEach(count => {
          if (typeof count === 'string') {
            expect(count).toContain('ERROR');
          }
        });
      });
    });

    it('should continue after selector errors', () => {
      const report = generateDOMDiagnosticReport();

      // Should have processed all selector chains
      const chainKeys = Object.keys(SELECTOR_CHAINS);
      chainKeys.forEach(key => {
        expect(report.elementCounts).toHaveProperty(key);
      });
    });
  });

  describe('Print Diagnostics', () => {
    it('should print diagnostics to console', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const report = printDOMDiagnostics();

      expect(consoleSpy).toHaveBeenCalled();
      expect(report).toBeDefined();
      expect(report).toHaveProperty('timestamp');

      consoleSpy.mockRestore();
    });

    it('should return the report object', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const report = printDOMDiagnostics();

      expect(report).toHaveProperty('elementCounts');

      consoleSpy.mockRestore();
    });
  });

  describe('Export Diagnostics', () => {
    beforeEach(() => {
      // Mock URL.createObjectURL and document.createElement
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();
    });

    it('should create a blob with JSON data', () => {
      const createElementSpy = jest.spyOn(document, 'createElement');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      exportDOMDiagnostics();

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('[YT-HWV] Diagnostics exported');

      createElementSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should generate filename with timestamp', () => {
      const createElementSpy = jest.spyOn(document, 'createElement');
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      createElementSpy.mockReturnValue(mockLink);

      exportDOMDiagnostics();

      expect(mockLink.download).toMatch(/^ythwv-dom-diagnostics-\d+\.json$/);

      createElementSpy.mockRestore();
    });

    it('should trigger download', () => {
      const createElementSpy = jest.spyOn(document, 'createElement');
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      createElementSpy.mockReturnValue(mockLink);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      exportDOMDiagnostics();

      expect(mockLink.click).toHaveBeenCalled();

      createElementSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should revoke object URL after export', () => {
      exportDOMDiagnostics();

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  describe('Window API Exposure', () => {
    it('should expose diagnostics functions to window', () => {
      expect(window.YTHWV_DOMDiagnostics).toBeDefined();
      expect(window.YTHWV_DOMDiagnostics.print).toBe(printDOMDiagnostics);
      expect(window.YTHWV_DOMDiagnostics.export).toBe(exportDOMDiagnostics);
      expect(window.YTHWV_DOMDiagnostics.generate).toBe(generateDOMDiagnosticReport);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should generate useful report for YouTube-like DOM', () => {
      document.body.innerHTML = `
        <ytd-rich-item-renderer>
          <yt-thumbnail-view-model>
            <a href="/watch?v=test123">Video</a>
          </yt-thumbnail-view-model>
          <div class="ytd-thumbnail-overlay-resume-playback-renderer"
               style="width: 50%"></div>
        </ytd-rich-item-renderer>
      `;

      const report = generateDOMDiagnosticReport();

      // Should find video containers
      expect(report.elementCounts.VIDEO_CONTAINERS.fallback_0).toBeGreaterThan(0);

      // Should find thumbnails
      expect(report.elementCounts.VIDEO_THUMBNAIL.fallback_0).toBeGreaterThan(0);

      // Should find progress bars
      expect(report.elementCounts.PROGRESS_BAR.fallback_0).toBeGreaterThan(0);

      // Should have sample data
      expect(report.sampleElements.VIDEO_CONTAINERS.fallback_0).toBeDefined();
    });

    it('should detect when primary selectors fail but fallbacks work', () => {
      // Use only fallback selectors
      document.body.innerHTML = `
        <div class="ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment"
             style="width: 75%"></div>
      `;

      const report = generateDOMDiagnosticReport();

      // Primary selector should have 0 count
      expect(report.elementCounts.PROGRESS_BAR.fallback_0).toBe(0);

      // But fallback should have elements
      expect(report.elementCounts.PROGRESS_BAR.fallback_2).toBeGreaterThan(0);
    });
  });
});
