# Content Module Tests

This directory contains unit tests for the modular content script architecture.

## Test Structure

```
tests/content/
├── storage/
│   ├── cache.test.js       - Cache management tests
│   ├── messaging.test.js   - Background messaging tests
│   └── settings.test.js    - Settings loading and access tests
└── events/
    └── eventHandler.test.js - Event coordination tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run content module tests specifically
npm test -- tests/content

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Coverage

These tests provide coverage for the core business logic modules:
- **cache.js**: Hidden video cache management, timestamp handling, merge logic
- **messaging.js**: Chrome message passing, request deduplication, state updates
- **settings.js**: Settings loading from chrome.storage, default values, getters
- **eventHandler.js**: Event coordination, message routing, hiding orchestration

## Adding New Tests

When adding new modules to the content/ directory:

1. Create corresponding test file in tests/content/[category]/
2. Follow the naming convention: `moduleName.test.js`
3. Use `@jest-environment jsdom` for DOM-dependent tests
4. Mock Chrome APIs using the patterns in setup.js
5. Aim for >80% code coverage for critical modules

## Test Utilities

Common test utilities are available in `/tests/testUtils.js`:
- Chrome API mocks
- DOM helpers
- Async utilities
