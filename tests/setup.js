require('fake-indexeddb/auto');

global.chrome = {
  runtime: {
    onInstalled: {
      addListener: jest.fn()
    },
    onStartup: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn(() => Promise.resolve()),
    onMessage: {
      addListener: jest.fn()
    }
  },
  storage: {
    sync: {
      get: jest.fn((keys, callback) => {
        if (callback) {
          callback({});
        }
        return Promise.resolve({});
      }),
      set: jest.fn((data, callback) => {
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }),
      remove: jest.fn(() => Promise.resolve()),
      clear: jest.fn(() => Promise.resolve())
    },
    local: {
      get: jest.fn((keys, callback) => {
        if (callback) {
          callback({});
        }
        return Promise.resolve({});
      }),
      set: jest.fn((data, callback) => {
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }),
      remove: jest.fn(() => Promise.resolve()),
      clear: jest.fn(() => Promise.resolve())
    }
  },
  tabs: {
    onUpdated: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn(() => Promise.resolve()),
    query: jest.fn((queryInfo, callback) => {
      if (typeof callback === 'function') {
        callback([]);
      }
      return Promise.resolve([]);
    })
  }
};

global.window = global.window || {};
global.window.matchMedia = jest.fn((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn()
}));

global.MutationObserver = class MutationObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  disconnect() {}
  takeRecords() { return []; }
};

global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

HTMLElement.prototype.scrollIntoView = jest.fn();

Object.defineProperty(window, 'location', {
  value: {
    href: 'https://www.youtube.com/',
    hostname: 'www.youtube.com',
    pathname: '/'
  },
  writable: true
});
