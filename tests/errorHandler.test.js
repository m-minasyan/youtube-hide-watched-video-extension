import {
  classifyError,
  retryOperation,
  logError,
  getErrorLog,
  clearErrorLog,
  ErrorType
} from '../shared/errorHandler.js';

describe('Error Handler', () => {
  beforeEach(() => {
    clearErrorLog();
    jest.clearAllMocks();
  });

  describe('classifyError', () => {
    it('should classify quota errors', () => {
      const error = new Error('QuotaExceededError');
      expect(classifyError(error)).toBe(ErrorType.QUOTA_EXCEEDED);
    });

    it('should classify quota errors from message', () => {
      const error = new Error('Storage quota exceeded');
      expect(classifyError(error)).toBe(ErrorType.QUOTA_EXCEEDED);
    });

    it('should classify transient errors', () => {
      const error = new Error('Transaction aborted');
      expect(classifyError(error)).toBe(ErrorType.TRANSIENT);
    });

    it('should classify busy errors as transient', () => {
      const error = new Error('Database is busy');
      expect(classifyError(error)).toBe(ErrorType.TRANSIENT);
    });

    it('should classify network errors', () => {
      const error = new Error('No receiver for message');
      expect(classifyError(error)).toBe(ErrorType.NETWORK);
    });

    it('should classify disconnected errors as network', () => {
      const error = new Error('Connection disconnected');
      expect(classifyError(error)).toBe(ErrorType.NETWORK);
    });

    it('should classify corruption errors', () => {
      const error = new Error('Data corrupt');
      expect(classifyError(error)).toBe(ErrorType.CORRUPTION);
    });

    it('should classify invalid data errors as corruption', () => {
      const error = new Error('Invalid data format');
      expect(classifyError(error)).toBe(ErrorType.CORRUPTION);
    });

    it('should classify permission errors', () => {
      const error = new Error('Permission denied');
      expect(classifyError(error)).toBe(ErrorType.PERMISSION);
    });

    it('should default to permanent for unknown errors', () => {
      const error = new Error('Unknown error');
      expect(classifyError(error)).toBe(ErrorType.PERMANENT);
    });

    it('should handle null error', () => {
      expect(classifyError(null)).toBe(ErrorType.PERMANENT);
    });

    it('should handle undefined error', () => {
      expect(classifyError(undefined)).toBe(ErrorType.PERMANENT);
    });
  });

  describe('retryOperation', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await retryOperation(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Transaction aborted'))
        .mockResolvedValue('success');

      const result = await retryOperation(operation, {
        initialDelay: 10,
        maxDelay: 20
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect maxAttempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Transaction aborted'));

      await expect(
        retryOperation(operation, {
          maxAttempts: 3,
          initialDelay: 10
        })
      ).rejects.toThrow('Transaction aborted');

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry permanent errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Permanent failure'));

      await expect(
        retryOperation(operation, {
          maxAttempts: 3,
          initialDelay: 10,
          shouldRetry: (error) => classifyError(error) === ErrorType.TRANSIENT
        })
      ).rejects.toThrow('Permanent failure');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Transaction aborted'))
        .mockResolvedValue('success');

      const onRetry = jest.fn();

      await retryOperation(operation, {
        initialDelay: 10,
        onRetry
      });

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it('should use exponential backoff', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Transaction aborted'))
        .mockRejectedValueOnce(new Error('Transaction aborted'))
        .mockResolvedValue('success');

      const delays = [];
      const onRetry = jest.fn((attempt) => {
        delays.push(attempt);
      });

      await retryOperation(operation, {
        initialDelay: 100,
        maxDelay: 5000,
        onRetry
      });

      expect(delays).toEqual([1, 2]);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should respect maxDelay', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Transaction aborted'))
        .mockRejectedValueOnce(new Error('Transaction aborted'))
        .mockResolvedValue('success');

      await retryOperation(operation, {
        initialDelay: 100,
        maxDelay: 150
      });

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should handle custom shouldRetry function', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue('success');

      const shouldRetry = jest.fn().mockReturnValue(true);

      await retryOperation(operation, {
        initialDelay: 10,
        shouldRetry
      });

      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error));
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('logError', () => {
    it('should log errors with metadata', () => {
      const error = new Error('Test error');
      const entry = logError('TestContext', error, { foo: 'bar' });

      expect(entry.context).toBe('TestContext');
      expect(entry.message).toBe('Test error');
      expect(entry.metadata).toEqual({ foo: 'bar' });
      expect(entry.type).toBe(ErrorType.PERMANENT);
      expect(entry.timestamp).toBeGreaterThan(0);
    });

    it('should maintain error log', () => {
      logError('Context1', new Error('Error 1'));
      logError('Context2', new Error('Error 2'));

      const log = getErrorLog();
      expect(log).toHaveLength(2);
      expect(log[0].message).toBe('Error 2'); // Most recent first
      expect(log[1].message).toBe('Error 1');
    });

    it('should limit log size', () => {
      for (let i = 0; i < 150; i++) {
        logError('Context', new Error(`Error ${i}`));
      }

      const log = getErrorLog();
      expect(log.length).toBeLessThanOrEqual(100);
    });

    it('should classify errors when logging', () => {
      const error = new Error('Transaction aborted');
      const entry = logError('TestContext', error);

      expect(entry.type).toBe(ErrorType.TRANSIENT);
    });

    it('should handle non-Error objects', () => {
      const entry = logError('TestContext', 'String error', { foo: 'bar' });

      expect(entry.message).toBe('String error');
      expect(entry.metadata).toEqual({ foo: 'bar' });
    });

    it('should call console.error', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');

      logError('TestContext', error, { foo: 'bar' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[TestContext]',
        error,
        { foo: 'bar' }
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getErrorLog', () => {
    it('should return copy of error log', () => {
      logError('Context1', new Error('Error 1'));
      logError('Context2', new Error('Error 2'));

      const log1 = getErrorLog();
      const log2 = getErrorLog();

      expect(log1).toEqual(log2);
      expect(log1).not.toBe(log2); // Different array instances
    });

    it('should return empty array when no errors', () => {
      const log = getErrorLog();
      expect(log).toEqual([]);
    });
  });

  describe('clearErrorLog', () => {
    it('should clear all errors', () => {
      logError('Context1', new Error('Error 1'));
      logError('Context2', new Error('Error 2'));

      expect(getErrorLog()).toHaveLength(2);

      clearErrorLog();

      expect(getErrorLog()).toHaveLength(0);
    });

    it('should allow new errors after clearing', () => {
      logError('Context1', new Error('Error 1'));
      clearErrorLog();
      logError('Context2', new Error('Error 2'));

      const log = getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0].message).toBe('Error 2');
    });
  });
});
