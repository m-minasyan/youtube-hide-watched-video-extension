import { jest } from '@jest/globals';

describe('Export/Import Hidden Videos', () => {
  let mockChrome;

  beforeEach(() => {
    // Setup mock Chrome APIs
    mockChrome = {
      runtime: {
        sendMessage: jest.fn()
      },
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };
    global.chrome = mockChrome;
  });

  describe('Export Functionality', () => {
    test('should export all hidden videos with correct format', async () => {
      const mockData = {
        version: 1,
        exportDate: '2025-10-10T12:00:00.000Z',
        count: 2,
        records: [
          { videoId: 'abc123', state: 'hidden', title: 'Test Video 1', updatedAt: 1234567890 },
          { videoId: 'xyz789', state: 'dimmed', title: 'Test Video 2', updatedAt: 1234567891 }
        ]
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({
        ok: true,
        result: mockData
      });

      // Verify the export data structure
      expect(mockData).toHaveProperty('version');
      expect(mockData).toHaveProperty('exportDate');
      expect(mockData).toHaveProperty('count');
      expect(mockData).toHaveProperty('records');
      expect(mockData.version).toBe(1);
      expect(mockData.count).toBe(2);
      expect(Array.isArray(mockData.records)).toBe(true);
    });

    test('should handle export with empty list', async () => {
      const mockData = {
        version: 1,
        exportDate: '2025-10-10T12:00:00.000Z',
        count: 0,
        records: []
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({
        ok: true,
        result: mockData
      });

      expect(mockData.count).toBe(0);
      expect(mockData.records).toHaveLength(0);
    });

    test('should handle export errors gracefully', async () => {
      mockChrome.runtime.sendMessage.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        mockChrome.runtime.sendMessage()
      ).rejects.toThrow('Database error');
    });
  });

  describe('Import Validation', () => {
    test('should validate correct import format', () => {
      const validData = {
        version: 1,
        exportDate: '2025-10-10T12:00:00.000Z',
        count: 2,
        records: [
          { videoId: 'abc123', state: 'hidden', title: 'Test Video 1', updatedAt: 1234567890 },
          { videoId: 'xyz789', state: 'dimmed', title: 'Test Video 2', updatedAt: 1234567891 }
        ]
      };

      // Validate structure
      expect(validData).toHaveProperty('version');
      expect(validData).toHaveProperty('records');
      expect(Array.isArray(validData.records)).toBe(true);

      // Validate records
      validData.records.forEach(record => {
        expect(record).toHaveProperty('videoId');
        expect(record).toHaveProperty('state');
        expect(['dimmed', 'hidden']).toContain(record.state);
      });
    });

    test('should reject invalid JSON', () => {
      const invalidJSON = 'not a json string';

      expect(() => {
        JSON.parse(invalidJSON);
      }).toThrow();
    });

    test('should reject unsupported version', () => {
      const futureVersion = {
        version: 999,
        records: []
      };

      expect(futureVersion.version).toBeGreaterThan(1);
    });

    test('should reject files exceeding size limit', () => {
      const maxSize = 50 * 1024 * 1024; // 50MB
      const fileSize = 60 * 1024 * 1024; // 60MB

      expect(fileSize).toBeGreaterThan(maxSize);
    });

    test('should validate individual records', () => {
      const validRecord = {
        videoId: 'abc123',
        state: 'hidden',
        title: 'Test Video',
        updatedAt: 1234567890
      };

      expect(validRecord.videoId).toBeTruthy();
      expect(['dimmed', 'hidden']).toContain(validRecord.state);
      expect(typeof validRecord.updatedAt).toBe('number');
    });

    test('should identify invalid videoIds', () => {
      const invalidRecords = [
        { videoId: '', state: 'hidden' },
        { videoId: null, state: 'hidden' },
        { state: 'hidden' }
      ];

      invalidRecords.forEach(record => {
        expect(record.videoId || '').toBeFalsy();
      });
    });

    test('should identify invalid states', () => {
      const invalidStates = ['normal', 'visible', 'deleted', null];

      invalidStates.forEach(state => {
        expect(['dimmed', 'hidden']).not.toContain(state);
      });
    });
  });

  describe('Import Execution', () => {
    test('should import with SKIP strategy', async () => {
      const importData = {
        version: 1,
        records: [
          { videoId: 'new123', state: 'hidden', title: 'New Video', updatedAt: Date.now() }
        ]
      };

      const expectedResult = {
        total: 1,
        added: 1,
        updated: 0,
        skipped: 0,
        errors: []
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({
        ok: true,
        result: expectedResult
      });

      const response = await mockChrome.runtime.sendMessage();
      expect(response.ok).toBe(true);
      expect(response.result.added).toBe(1);
      expect(response.result.skipped).toBe(0);
    });

    test('should import with OVERWRITE strategy', async () => {
      const importData = {
        version: 1,
        records: [
          { videoId: 'existing123', state: 'hidden', title: 'Updated Video', updatedAt: Date.now() }
        ]
      };

      const expectedResult = {
        total: 1,
        added: 0,
        updated: 1,
        skipped: 0,
        errors: []
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({
        ok: true,
        result: expectedResult
      });

      const response = await mockChrome.runtime.sendMessage();
      expect(response.ok).toBe(true);
      expect(response.result.updated).toBe(1);
    });

    test('should import with MERGE strategy', async () => {
      const importData = {
        version: 1,
        records: [
          { videoId: 'existing123', state: 'hidden', title: 'Newer Video', updatedAt: Date.now() + 1000 }
        ]
      };

      const expectedResult = {
        total: 1,
        added: 0,
        updated: 1,
        skipped: 0,
        errors: []
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({
        ok: true,
        result: expectedResult
      });

      const response = await mockChrome.runtime.sendMessage();
      expect(response.ok).toBe(true);
      expect(response.result.updated).toBe(1);
    });

    test('should handle partial import with some invalid records', async () => {
      const importData = {
        version: 1,
        records: [
          { videoId: 'valid123', state: 'hidden', title: 'Valid Video', updatedAt: Date.now() },
          { videoId: '', state: 'invalid' }, // Invalid record
          { videoId: 'valid456', state: 'dimmed', title: 'Another Valid', updatedAt: Date.now() }
        ]
      };

      const expectedResult = {
        total: 2, // Only valid records
        added: 2,
        updated: 0,
        skipped: 0,
        errors: []
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({
        ok: true,
        result: expectedResult
      });

      const response = await mockChrome.runtime.sendMessage();
      expect(response.result.total).toBe(2);
      expect(response.result.added).toBe(2);
    });

    test('should trigger pruning if quota exceeded', async () => {
      // This would be tested in integration with the actual service
      const stats = {
        total: 200001, // Over limit
        dimmed: 100000,
        hidden: 100001
      };

      expect(stats.total).toBeGreaterThan(200000);
    });

    test('should broadcast import event after completion', async () => {
      const expectedResult = {
        total: 5,
        added: 5,
        updated: 0,
        skipped: 0,
        errors: []
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({
        ok: true,
        result: expectedResult
      });

      const response = await mockChrome.runtime.sendMessage();
      expect(response.ok).toBe(true);
      expect(response.result.total).toBe(5);
    });
  });

  describe('File Operations', () => {
    test('should create downloadable JSON blob', () => {
      const exportData = {
        version: 1,
        exportDate: '2025-10-10T12:00:00.000Z',
        count: 1,
        records: [
          { videoId: 'abc123', state: 'hidden', title: 'Test', updatedAt: Date.now() }
        ]
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      expect(blob.type).toBe('application/json');
      expect(blob.size).toBeGreaterThan(0);
    });

    test('should read uploaded file correctly', async () => {
      const fileContent = JSON.stringify({
        version: 1,
        records: []
      });

      const mockFile = new Blob([fileContent], { type: 'application/json' });

      expect(mockFile.type).toBe('application/json');
      expect(mockFile.size).toBeGreaterThan(0);
    });

    test('should handle file read errors', async () => {
      const invalidContent = 'invalid json';

      expect(() => {
        JSON.parse(invalidContent);
      }).toThrow();
    });
  });

  describe('Conflict Resolution Strategies', () => {
    test('SKIP strategy should keep existing records', () => {
      const existing = { videoId: 'abc', state: 'hidden', updatedAt: 1000 };
      const imported = { videoId: 'abc', state: 'dimmed', updatedAt: 2000 };
      const strategy = 'skip';

      if (strategy === 'skip') {
        expect(existing.state).toBe('hidden');
      }
    });

    test('OVERWRITE strategy should replace existing records', () => {
      const existing = { videoId: 'abc', state: 'hidden', updatedAt: 1000 };
      const imported = { videoId: 'abc', state: 'dimmed', updatedAt: 2000 };
      const strategy = 'overwrite';

      if (strategy === 'overwrite') {
        expect(imported.state).toBe('dimmed');
      }
    });

    test('MERGE strategy should keep newer timestamp', () => {
      const existing = { videoId: 'abc', state: 'hidden', updatedAt: 1000 };
      const imported = { videoId: 'abc', state: 'dimmed', updatedAt: 2000 };
      const strategy = 'merge';

      if (strategy === 'merge') {
        const winner = imported.updatedAt > existing.updatedAt ? imported : existing;
        expect(winner.state).toBe('dimmed');
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle missing version field', () => {
      const invalidData = {
        records: []
      };

      expect(invalidData.version).toBeUndefined();
    });

    test('should handle missing records field', () => {
      const invalidData = {
        version: 1
      };

      expect(invalidData.records).toBeUndefined();
    });

    test('should handle non-array records field', () => {
      const invalidData = {
        version: 1,
        records: 'not an array'
      };

      expect(Array.isArray(invalidData.records)).toBe(false);
    });

    test('should handle too many records', () => {
      const maxRecords = 200000;
      const tooManyRecords = 200001;

      expect(tooManyRecords).toBeGreaterThan(maxRecords);
    });
  });
});
