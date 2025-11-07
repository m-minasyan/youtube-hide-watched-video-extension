/**
 * Service Worker Import Compatibility Tests
 *
 * Tests to ensure all background/service worker files use static imports only,
 * as dynamic imports are disallowed in ServiceWorkerGlobalScope.
 *
 * This addresses the fix for: "TypeError: import() is disallowed on ServiceWorkerGlobalScope"
 */

import fs from 'fs';
import path from 'path';

// Use process.cwd() for project root
const projectRoot = process.cwd();

describe('Service Worker Import Compatibility', () => {
  const backgroundFiles = [
    'background.js',
    'background/indexedDb.js',
    'background/indexedDbCache.js',
    'background/hiddenVideosService.js',
    'background/writeBatcher.js'
  ];

  describe('Static Import Verification', () => {
    test('should not contain dynamic import() calls in any background files', () => {
      const violations = [];

      backgroundFiles.forEach(relPath => {
        const filePath = path.join(projectRoot, relPath);

        if (!fs.existsSync(filePath)) {
          console.warn(`File not found: ${filePath}`);
          return;
        }

        const content = fs.readFileSync(filePath, 'utf8');

        // Check for dynamic import patterns
        // Pattern 1: await import(...)
        const awaitImportPattern = /await\s+import\s*\(/g;
        const awaitMatches = content.match(awaitImportPattern);

        // Pattern 2: import(...) as expression (not at module level)
        // This regex looks for import( that's not part of a comment
        const dynamicImportPattern = /(?<!\/\/.*)\bimport\s*\([^)]+\)/g;
        const dynamicMatches = content.match(dynamicImportPattern);

        if (awaitMatches) {
          violations.push({
            file: relPath,
            pattern: 'await import(...)',
            matches: awaitMatches
          });
        }

        if (dynamicMatches) {
          // Filter out false positives (e.g., in comments or strings)
          const realMatches = dynamicMatches.filter(match => {
            // Check if this is in a comment line
            const lines = content.split('\n');
            for (const line of lines) {
              if (line.includes(match) && line.trim().startsWith('//')) {
                return false;
              }
            }
            return true;
          });

          if (realMatches.length > 0) {
            violations.push({
              file: relPath,
              pattern: 'import(...)',
              matches: realMatches
            });
          }
        }
      });

      if (violations.length > 0) {
        const errorMessage = violations.map(v =>
          `${v.file}: Found ${v.pattern} - ${v.matches.join(', ')}`
        ).join('\n');

        fail(`Dynamic imports found in Service Worker files:\n${errorMessage}`);
      }

      expect(violations).toHaveLength(0);
    });

    test('should have static import for clearBackgroundCache in indexedDb.js', () => {
      const indexedDbPath = path.join(projectRoot, 'background/indexedDb.js');
      const content = fs.readFileSync(indexedDbPath, 'utf8');

      // Check that clearBackgroundCache is in the static import from indexedDbCache.js
      const importPattern = /import\s+{[^}]+clearBackgroundCache[^}]+}\s+from\s+['"]\.\/indexedDbCache\.js['"]/;

      expect(content).toMatch(importPattern);
    });

    test('should not have dynamic import in clearHiddenVideosStore function', () => {
      const indexedDbPath = path.join(projectRoot, 'background/indexedDb.js');
      const content = fs.readFileSync(indexedDbPath, 'utf8');

      // Find the function definition
      const functionStart = content.indexOf('export async function clearHiddenVideosStore()');
      if (functionStart === -1) {
        fail('clearHiddenVideosStore function not found');
        return;
      }

      // Extract the function (find matching braces)
      let braceCount = 0;
      let functionStart_brace = content.indexOf('{', functionStart);
      let i = functionStart_brace;
      let functionEnd = -1;

      while (i < content.length) {
        if (content[i] === '{') braceCount++;
        if (content[i] === '}') braceCount--;
        if (braceCount === 0) {
          functionEnd = i;
          break;
        }
        i++;
      }

      const functionBody = content.substring(functionStart_brace, functionEnd + 1);

      // Ensure no dynamic import in the function body
      expect(functionBody).not.toMatch(/await\s+import\s*\(/);
      expect(functionBody).not.toMatch(/import\s*\(['"]/);

      // Ensure clearBackgroundCache is called directly
      expect(functionBody).toMatch(/clearBackgroundCache\s*\(/);
    });
  });

  describe('Module Structure Validation', () => {
    test('indexedDbCache.js should export clearBackgroundCache', async () => {
      const cacheModule = await import('../background/indexedDbCache.js');

      expect(cacheModule.clearBackgroundCache).toBeDefined();
      expect(typeof cacheModule.clearBackgroundCache).toBe('function');
    });

    test('indexedDb.js should import and use clearBackgroundCache statically', async () => {
      const indexedDbModule = await import('../background/indexedDb.js');

      // The module should load without errors
      expect(indexedDbModule).toBeDefined();
      expect(indexedDbModule.clearHiddenVideosStore).toBeDefined();
    });
  });

  describe('No Circular Dependencies', () => {
    test('should not have circular dependencies between indexedDb and indexedDbCache', async () => {
      // This test ensures modules can be loaded in any order
      let caughtError = null;

      try {
        // Try loading in different orders
        await import('../background/indexedDbCache.js');
        await import('../background/indexedDb.js');

        // Reset and try reverse order
        jest.resetModules();

        await import('../background/indexedDb.js');
        await import('../background/indexedDbCache.js');
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeNull();
    });
  });
});

describe('clearHiddenVideosStore Function Behavior', () => {
  let dbModule;
  let cacheModule;

  beforeEach(async () => {
    jest.resetModules();

    // Delete database before each test
    const deleteDatabase = (name) => new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });

    await deleteDatabase('ythwvHiddenVideos');

    dbModule = await import('../background/indexedDb.js');
    cacheModule = await import('../background/indexedDbCache.js');

    await dbModule.initializeDb();
  });

  test('should clear database and cache without dynamic import', async () => {
    // Add some records
    await dbModule.upsertHiddenVideos([
      { videoId: 'test1', state: 'hidden', title: 'Test 1', updatedAt: Date.now() },
      { videoId: 'test2', state: 'dimmed', title: 'Test 2', updatedAt: Date.now() }
    ]);

    // Verify records exist
    const beforeStats = await dbModule.getHiddenVideosStats();
    expect(beforeStats.total).toBe(2);

    // Verify cache has entries
    const cacheBefore = cacheModule.getCacheStats();
    expect(cacheBefore.size).toBeGreaterThan(0);

    // Clear all
    await dbModule.clearHiddenVideosStore();

    // Verify database is empty
    const afterStats = await dbModule.getHiddenVideosStats();
    expect(afterStats.total).toBe(0);

    // Verify cache is cleared
    const cacheAfter = cacheModule.getCacheStats();
    expect(cacheAfter.size).toBe(0);
  });

  test('should handle clearing empty database without errors', async () => {
    // Clear when already empty
    await expect(dbModule.clearHiddenVideosStore()).resolves.not.toThrow();

    const stats = await dbModule.getHiddenVideosStats();
    expect(stats.total).toBe(0);
  });
});
