import {
  STORAGE_KEYS,
  HIDDEN_VIDEO_MESSAGES,
  DEFAULT_SETTINGS,
  CSS_CLASSES,
  SELECTORS,
  DEBUG
} from '../shared/constants.js';

describe('Shared Constants', () => {
  describe('STORAGE_KEYS', () => {
    test('all storage keys are defined', () => {
      expect(STORAGE_KEYS.THRESHOLD).toBe('YTHWV_THRESHOLD');
      expect(STORAGE_KEYS.WATCHED_STATE).toBe('YTHWV_STATE');
      expect(STORAGE_KEYS.SHORTS_STATE).toBe('YTHWV_STATE_SHORTS');
      expect(STORAGE_KEYS.HIDDEN_VIDEOS).toBe('YTHWV_HIDDEN_VIDEOS');
      expect(STORAGE_KEYS.INDIVIDUAL_MODE).toBe('YTHWV_INDIVIDUAL_MODE');
      expect(STORAGE_KEYS.INDIVIDUAL_MODE_ENABLED).toBe('YTHWV_INDIVIDUAL_MODE_ENABLED');
      expect(STORAGE_KEYS.THEME).toBe('YTHWV_THEME');
    });

    test('all keys have YTHWV prefix', () => {
      Object.values(STORAGE_KEYS).forEach(key => {
        expect(key).toMatch(/^YTHWV_/);
      });
    });

    test('storage keys object has correct number of keys', () => {
      expect(Object.keys(STORAGE_KEYS).length).toBe(7);
    });
  });

  describe('HIDDEN_VIDEO_MESSAGES', () => {
    test('all message types are defined', () => {
      expect(HIDDEN_VIDEO_MESSAGES.GET_MANY).toBe('HIDDEN_VIDEOS_GET_MANY');
      expect(HIDDEN_VIDEO_MESSAGES.GET_PAGE).toBe('HIDDEN_VIDEOS_GET_PAGE');
      expect(HIDDEN_VIDEO_MESSAGES.GET_STATS).toBe('HIDDEN_VIDEOS_GET_STATS');
      expect(HIDDEN_VIDEO_MESSAGES.SET_STATE).toBe('HIDDEN_VIDEOS_SET_STATE');
      expect(HIDDEN_VIDEO_MESSAGES.CLEAR_ALL).toBe('HIDDEN_VIDEOS_CLEAR_ALL');
    });

    test('all message types have HIDDEN_VIDEOS prefix', () => {
      Object.values(HIDDEN_VIDEO_MESSAGES).forEach(msg => {
        expect(msg).toMatch(/^HIDDEN_VIDEOS_/);
      });
    });

    test('message types object has correct number of types', () => {
      expect(Object.keys(HIDDEN_VIDEO_MESSAGES).length).toBe(5);
    });
  });

  describe('DEFAULT_SETTINGS', () => {
    test('threshold default is correct', () => {
      expect(DEFAULT_SETTINGS.threshold).toBe(10);
    });

    test('theme default is correct', () => {
      expect(DEFAULT_SETTINGS.theme).toBe('auto');
    });

    test('individualMode default is correct', () => {
      expect(DEFAULT_SETTINGS.individualMode).toBe('dimmed');
    });

    test('individualModeEnabled default is correct', () => {
      expect(DEFAULT_SETTINGS.individualModeEnabled).toBe(true);
    });

    test('watched states structure is valid', () => {
      expect(DEFAULT_SETTINGS.states.watched).toBeDefined();
      expect(DEFAULT_SETTINGS.states.watched.misc).toBe('normal');
      expect(DEFAULT_SETTINGS.states.watched.subscriptions).toBe('normal');
      expect(DEFAULT_SETTINGS.states.watched.channel).toBe('normal');
      expect(DEFAULT_SETTINGS.states.watched.watch).toBe('normal');
      expect(DEFAULT_SETTINGS.states.watched.trending).toBe('normal');
      expect(DEFAULT_SETTINGS.states.watched.playlist).toBe('normal');
    });

    test('shorts states structure is valid', () => {
      expect(DEFAULT_SETTINGS.states.shorts).toBeDefined();
      expect(DEFAULT_SETTINGS.states.shorts.misc).toBe('normal');
      expect(DEFAULT_SETTINGS.states.shorts.subscriptions).toBe('normal');
      expect(DEFAULT_SETTINGS.states.shorts.channel).toBe('normal');
      expect(DEFAULT_SETTINGS.states.shorts.watch).toBe('normal');
      expect(DEFAULT_SETTINGS.states.shorts.trending).toBe('normal');
    });

    test('all watched state sections have normal as default', () => {
      Object.values(DEFAULT_SETTINGS.states.watched).forEach(state => {
        expect(state).toBe('normal');
      });
    });

    test('all shorts state sections have normal as default', () => {
      Object.values(DEFAULT_SETTINGS.states.shorts).forEach(state => {
        expect(state).toBe('normal');
      });
    });
  });

  describe('CSS_CLASSES', () => {
    test('all CSS classes are defined', () => {
      expect(CSS_CLASSES.WATCHED_HIDDEN).toBe('YT-HWV-WATCHED-HIDDEN');
      expect(CSS_CLASSES.WATCHED_DIMMED).toBe('YT-HWV-WATCHED-DIMMED');
      expect(CSS_CLASSES.SHORTS_HIDDEN).toBe('YT-HWV-SHORTS-HIDDEN');
      expect(CSS_CLASSES.SHORTS_DIMMED).toBe('YT-HWV-SHORTS-DIMMED');
      expect(CSS_CLASSES.HIDDEN_ROW_PARENT).toBe('YT-HWV-HIDDEN-ROW-PARENT');
      expect(CSS_CLASSES.INDIVIDUAL_HIDDEN).toBe('YT-HWV-INDIVIDUAL-HIDDEN');
      expect(CSS_CLASSES.INDIVIDUAL_DIMMED).toBe('YT-HWV-INDIVIDUAL-DIMMED');
      expect(CSS_CLASSES.EYE_BUTTON).toBe('yt-hwv-eye-button');
      expect(CSS_CLASSES.HAS_EYE_BUTTON).toBe('yt-hwv-has-eye-button');
    });

    test('CSS classes object has correct number of classes', () => {
      expect(Object.keys(CSS_CLASSES).length).toBe(9);
    });

    test('major classes have YT-HWV prefix', () => {
      const majorClasses = [
        CSS_CLASSES.WATCHED_HIDDEN,
        CSS_CLASSES.WATCHED_DIMMED,
        CSS_CLASSES.SHORTS_HIDDEN,
        CSS_CLASSES.SHORTS_DIMMED,
        CSS_CLASSES.HIDDEN_ROW_PARENT,
        CSS_CLASSES.INDIVIDUAL_HIDDEN,
        CSS_CLASSES.INDIVIDUAL_DIMMED
      ];

      majorClasses.forEach(cls => {
        expect(cls).toMatch(/^YT-HWV-/);
      });
    });
  });

  describe('SELECTORS', () => {
    test('PROGRESS_BAR selectors are defined as array', () => {
      expect(Array.isArray(SELECTORS.PROGRESS_BAR)).toBe(true);
      expect(SELECTORS.PROGRESS_BAR.length).toBeGreaterThan(0);
      expect(SELECTORS.PROGRESS_BAR).toContain('.ytd-thumbnail-overlay-resume-playback-renderer');
    });

    test('SHORTS_CONTAINERS selectors are defined as array', () => {
      expect(Array.isArray(SELECTORS.SHORTS_CONTAINERS)).toBe(true);
      expect(SELECTORS.SHORTS_CONTAINERS.length).toBeGreaterThan(0);
      expect(SELECTORS.SHORTS_CONTAINERS).toContain('ytd-reel-shelf-renderer');
    });

    test('THUMBNAILS selectors are defined as array', () => {
      expect(Array.isArray(SELECTORS.THUMBNAILS)).toBe(true);
      expect(SELECTORS.THUMBNAILS.length).toBeGreaterThan(0);
      expect(SELECTORS.THUMBNAILS).toContain('yt-thumbnail-view-model:not(.yt-hwv-has-eye-button)');
    });

    test('VIDEO_CONTAINERS selectors are defined as array', () => {
      expect(Array.isArray(SELECTORS.VIDEO_CONTAINERS)).toBe(true);
      expect(SELECTORS.VIDEO_CONTAINERS.length).toBeGreaterThan(0);
      expect(SELECTORS.VIDEO_CONTAINERS).toContain('ytd-rich-item-renderer');
    });

    test('TITLE_ELEMENTS selectors are defined as array', () => {
      expect(Array.isArray(SELECTORS.TITLE_ELEMENTS)).toBe(true);
      expect(SELECTORS.TITLE_ELEMENTS.length).toBeGreaterThan(0);
      expect(SELECTORS.TITLE_ELEMENTS).toContain('#video-title');
    });

    test('all selector arrays contain valid CSS selectors', () => {
      Object.values(SELECTORS).forEach(selectorArray => {
        expect(Array.isArray(selectorArray)).toBe(true);
        selectorArray.forEach(selector => {
          expect(typeof selector).toBe('string');
          expect(selector.length).toBeGreaterThan(0);
        });
      });
    });

    test('selectors object has correct number of selector groups', () => {
      expect(Object.keys(SELECTORS).length).toBe(5);
    });
  });

  describe('DEBUG', () => {
    test('DEBUG flag is boolean', () => {
      expect(typeof DEBUG).toBe('boolean');
    });

    test('DEBUG is false in production', () => {
      expect(DEBUG).toBe(false);
    });
  });

  describe('Constants consistency', () => {
    test('STORAGE_KEYS values remain constant', () => {
      // Verify values are as expected (no accidental changes)
      expect(STORAGE_KEYS.THRESHOLD).toBe('YTHWV_THRESHOLD');
      expect(STORAGE_KEYS.WATCHED_STATE).toBe('YTHWV_STATE');
      expect(STORAGE_KEYS.SHORTS_STATE).toBe('YTHWV_STATE_SHORTS');
    });
  });

  describe('No constant duplication', () => {
    test('all storage key values are unique', () => {
      const values = Object.values(STORAGE_KEYS);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    test('all message type values are unique', () => {
      const values = Object.values(HIDDEN_VIDEO_MESSAGES);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    test('all CSS class values are unique', () => {
      const values = Object.values(CSS_CLASSES);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
});
