const { STORAGE_KEYS, mockChromeStorage } = require('./testUtils');

describe('Business Logic - Debouncing', () => {
  jest.useFakeTimers();

  const debounce = function(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  };

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('should debounce function calls', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 250);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(250);

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('should pass correct arguments to debounced function', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn('arg1', 'arg2');
    jest.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  test('should reset timer on subsequent calls', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 200);

    debouncedFn();
    jest.advanceTimersByTime(100);
    debouncedFn();
    jest.advanceTimersByTime(100);
    debouncedFn();
    
    expect(mockFn).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(200);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('should maintain correct this context', () => {
    const obj = {
      value: 42,
      method: jest.fn(function() {
        return this.value;
      })
    };
    
    obj.debouncedMethod = debounce(obj.method, 100);
    obj.debouncedMethod();
    
    jest.advanceTimersByTime(100);
    
    expect(obj.method).toHaveBeenCalled();
  });
});

describe('Business Logic - Storage Synchronization', () => {
  let storageData;

  beforeEach(() => {
    jest.clearAllMocks();
    storageData = mockChromeStorage();
  });

  describe('Batch Storage Operations', () => {
    const batchSaveSettings = async (settings) => {
      const updates = {};
      
      for (const [key, value] of Object.entries(settings)) {
        updates[key] = value;
      }
      
      await chrome.storage.sync.set(updates);
      return updates;
    };

    test('should save multiple settings in one operation', async () => {
      const settings = {
        [STORAGE_KEYS.THRESHOLD]: 75,
        [STORAGE_KEYS.INDIVIDUAL_MODE]: 'hidden',
        [STORAGE_KEYS.THEME]: 'dark'
      };

      await batchSaveSettings(settings);

      expect(chrome.storage.sync.set).toHaveBeenCalledTimes(1);
      expect(chrome.storage.sync.set).toHaveBeenCalledWith(settings);
    });

    test('should handle large batch operations', async () => {
      const settings = {};
      
      for (let i = 1; i <= 50; i++) {
        settings[`key_${i}`] = `value_${i}`;
      }

      await batchSaveSettings(settings);

      expect(chrome.storage.sync.set).toHaveBeenCalledWith(settings);
      expect(Object.keys(settings).length).toBe(50);
    });
  });

  describe('Storage Change Listeners', () => {
    const setupStorageListener = (callback) => {
      chrome.storage.onChanged = {
        addListener: jest.fn((handler) => {
          chrome.storage.onChanged.handler = handler;
        })
      };
      
      chrome.storage.onChanged.addListener(callback);
    };

    test('should detect storage changes', () => {
      const callback = jest.fn();
      setupStorageListener(callback);

      const changes = {
        [STORAGE_KEYS.THRESHOLD]: {
          oldValue: 10,
          newValue: 50
        }
      };

      chrome.storage.onChanged.handler(changes, 'sync');

      expect(callback).toHaveBeenCalledWith(changes, 'sync');
    });

    test('should handle multiple simultaneous changes', () => {
      const callback = jest.fn();
      setupStorageListener(callback);

      const changes = {
        [STORAGE_KEYS.THRESHOLD]: { oldValue: 10, newValue: 50 },
        [STORAGE_KEYS.THEME]: { oldValue: 'light', newValue: 'dark' },
        [STORAGE_KEYS.INDIVIDUAL_MODE]: { oldValue: 'dimmed', newValue: 'hidden' }
      };

      chrome.storage.onChanged.handler(changes, 'sync');

      expect(callback).toHaveBeenCalledWith(changes, 'sync');
    });
  });
});

describe('Business Logic - Mutation Observers', () => {
  let observer;
  let callback;

  beforeEach(() => {
    callback = jest.fn();
    observer = new MutationObserver(callback);
  });

  describe('DOM Change Detection', () => {
    const simulateMutation = (type, target, attributeName = null) => {
      const mutations = [{
        type: type,
        target: target,
        attributeName: attributeName,
        addedNodes: [],
        removedNodes: []
      }];
      
      observer.callback(mutations);
      return mutations;
    };

    test('should detect child list changes', () => {
      const target = document.createElement('div');
      const mutations = simulateMutation('childList', target);

      expect(callback).toHaveBeenCalledWith(mutations);
    });

    test('should detect attribute changes', () => {
      const target = document.createElement('div');
      const mutations = simulateMutation('attributes', target, 'class');

      expect(callback).toHaveBeenCalledWith(mutations);
    });

    test('should handle multiple mutations', () => {
      const target1 = document.createElement('div');
      const target2 = document.createElement('span');
      
      const mutations = [
        {
          type: 'childList',
          target: target1,
          attributeName: null,
          addedNodes: [],
          removedNodes: []
        },
        {
          type: 'attributes',
          target: target2,
          attributeName: 'data-state',
          addedNodes: [],
          removedNodes: []
        }
      ];

      observer.callback(mutations);

      expect(callback).toHaveBeenCalledWith(mutations);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Aria-Hidden Handling', () => {
    const handleAriaHidden = (mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          const target = mutation.target;
          if (target.getAttribute('aria-hidden') === 'true' && 
              target.querySelector('.yt-hwv-eye-button')) {
            target.removeAttribute('aria-hidden');
          }
        }
      });
    };

    test('should remove aria-hidden when eye button is present', () => {
      const container = document.createElement('div');
      container.setAttribute('aria-hidden', 'true');
      
      const eyeButton = document.createElement('button');
      eyeButton.className = 'yt-hwv-eye-button';
      container.appendChild(eyeButton);

      const mutations = [{
        type: 'attributes',
        target: container,
        attributeName: 'aria-hidden'
      }];

      handleAriaHidden(mutations);

      expect(container.hasAttribute('aria-hidden')).toBe(false);
    });

    test('should not remove aria-hidden when no eye button', () => {
      const container = document.createElement('div');
      container.setAttribute('aria-hidden', 'true');

      const mutations = [{
        type: 'attributes',
        target: container,
        attributeName: 'aria-hidden'
      }];

      handleAriaHidden(mutations);

      expect(container.getAttribute('aria-hidden')).toBe('true');
    });
  });
});

describe('Business Logic - Performance Optimization', () => {
  describe('Batch DOM Operations', () => {
    const batchHideElements = (elements, className) => {
      const fragment = document.createDocumentFragment();
      
      elements.forEach(element => {
        element.classList.add(className);
      });
      
      return elements.length;
    };

    test('should batch add classes to multiple elements', () => {
      const elements = [];
      for (let i = 0; i < 10; i++) {
        elements.push(document.createElement('div'));
      }

      const count = batchHideElements(elements, 'YT-HWV-HIDDEN');

      expect(count).toBe(10);
      elements.forEach(el => {
        expect(el.classList.contains('YT-HWV-HIDDEN')).toBe(true);
      });
    });

    test('should handle empty element array', () => {
      const count = batchHideElements([], 'YT-HWV-HIDDEN');
      expect(count).toBe(0);
    });
  });

  describe('Caching Mechanisms', () => {
    const createCache = () => {
      const cache = new Map();
      
      return {
        get: (key) => cache.get(key),
        set: (key, value) => {
          if (cache.size >= 100) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
          }
          cache.set(key, value);
        },
        clear: () => cache.clear(),
        size: () => cache.size
      };
    };

    test('should cache and retrieve values', () => {
      const cache = createCache();
      
      cache.set('video1', { state: 'hidden', title: 'Test Video' });
      const cached = cache.get('video1');
      
      expect(cached).toEqual({ state: 'hidden', title: 'Test Video' });
    });

    test('should limit cache size', () => {
      const cache = createCache();
      
      for (let i = 0; i < 105; i++) {
        cache.set(`video${i}`, { state: 'normal' });
      }
      
      expect(cache.size()).toBeLessThanOrEqual(100);
      expect(cache.get('video0')).toBeUndefined();
      expect(cache.get('video104')).toBeDefined();
    });

    test('should clear cache', () => {
      const cache = createCache();
      
      cache.set('video1', { state: 'hidden' });
      cache.set('video2', { state: 'dimmed' });
      cache.clear();
      
      expect(cache.size()).toBe(0);
      expect(cache.get('video1')).toBeUndefined();
    });
  });
});

describe('Business Logic - Error Handling', () => {
  describe('Safe Storage Operations', () => {
    let originalConsoleError;

    beforeEach(() => {
      originalConsoleError = console.error;
      console.error = jest.fn();
    });

    afterEach(() => {
      console.error = originalConsoleError;
    });

    const safeStorageGet = async (key, defaultValue = null) => {
      try {
        const result = await chrome.storage.sync.get(key);
        return result[key] !== undefined ? result[key] : defaultValue;
      } catch (error) {
        console.error('Storage get error:', error);
        return defaultValue;
      }
    };

    const safeStorageSet = async (key, value) => {
      try {
        await chrome.storage.sync.set({ [key]: value });
        return true;
      } catch (error) {
        console.error('Storage set error:', error);
        return false;
      }
    };

    test('should return value when storage get succeeds', async () => {
      const mockData = { [STORAGE_KEYS.THRESHOLD]: 50 };
      chrome.storage.sync.get.mockResolvedValue(mockData);
      
      const value = await safeStorageGet(STORAGE_KEYS.THRESHOLD, 10);
      expect(value).toBe(50);
    });

    test('should return default value when key not found', async () => {
      chrome.storage.sync.get.mockResolvedValue({});
      
      const value = await safeStorageGet(STORAGE_KEYS.THRESHOLD, 10);
      expect(value).toBe(10);
    });

    test('should return default value on storage error', async () => {
      chrome.storage.sync.get.mockRejectedValue(new Error('Storage error'));
      
      const value = await safeStorageGet(STORAGE_KEYS.THRESHOLD, 10);
      expect(value).toBe(10);
      expect(console.error).toHaveBeenCalled();
    });

    test('should return true when storage set succeeds', async () => {
      chrome.storage.sync.set.mockResolvedValue();
      
      const success = await safeStorageSet(STORAGE_KEYS.THRESHOLD, 75);
      expect(success).toBe(true);
    });

    test('should return false on storage set error', async () => {
      chrome.storage.sync.set.mockRejectedValue(new Error('Storage error'));
      console.error = jest.fn();
      
      const success = await safeStorageSet(STORAGE_KEYS.THRESHOLD, 75);
      expect(success).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('DOM Operation Safety', () => {
    let originalConsoleError;

    beforeEach(() => {
      originalConsoleError = console.error;
      console.error = jest.fn();
    });

    afterEach(() => {
      console.error = originalConsoleError;
    });

    const safeQuerySelector = (parent, selector) => {
      try {
        return parent.querySelector(selector);
      } catch (error) {
        console.error('Query selector error:', error);
        return null;
      }
    };

    const safeGetAttribute = (element, attribute, defaultValue = '') => {
      try {
        return element?.getAttribute(attribute) || defaultValue;
      } catch (error) {
        console.error('Get attribute error:', error);
        return defaultValue;
      }
    };

    test('should safely query selector', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      child.className = 'test-class';
      parent.appendChild(child);
      
      const result = safeQuerySelector(parent, '.test-class');
      expect(result).toBe(child);
    });

    test('should return null on invalid selector', () => {
      const parent = document.createElement('div');
      
      const result = safeQuerySelector(parent, '!!!invalid');
      expect(result).toBeNull();
    });

    test('should safely get attribute', () => {
      const element = document.createElement('div');
      element.setAttribute('data-test', 'value');
      
      const value = safeGetAttribute(element, 'data-test', 'default');
      expect(value).toBe('value');
    });

    test('should return default on null element', () => {
      const value = safeGetAttribute(null, 'data-test', 'default');
      expect(value).toBe('default');
    });
  });
});
