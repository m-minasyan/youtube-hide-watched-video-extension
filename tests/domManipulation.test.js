const { createMockVideoElement } = require('./testUtils');

describe('Business Logic - DOM Manipulation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('CSS Class Application', () => {
    const applyHidingClass = (element, state, type = 'watched') => {
      const prefix = type === 'watched' ? 'YT-HWV-WATCHED' : 'YT-HWV-SHORTS';
      
      element.classList.remove(`${prefix}-DIMMED`, `${prefix}-HIDDEN`);
      
      if (state === 'dimmed') {
        element.classList.add(`${prefix}-DIMMED`);
      } else if (state === 'hidden') {
        element.classList.add(`${prefix}-HIDDEN`);
      }
    };

    test('should apply dimmed class for watched videos', () => {
      const element = document.createElement('div');
      applyHidingClass(element, 'dimmed', 'watched');
      
      expect(element.classList.contains('YT-HWV-WATCHED-DIMMED')).toBe(true);
      expect(element.classList.contains('YT-HWV-WATCHED-HIDDEN')).toBe(false);
    });

    test('should apply hidden class for watched videos', () => {
      const element = document.createElement('div');
      applyHidingClass(element, 'hidden', 'watched');
      
      expect(element.classList.contains('YT-HWV-WATCHED-HIDDEN')).toBe(true);
      expect(element.classList.contains('YT-HWV-WATCHED-DIMMED')).toBe(false);
    });

    test('should apply dimmed class for shorts', () => {
      const element = document.createElement('div');
      applyHidingClass(element, 'dimmed', 'shorts');
      
      expect(element.classList.contains('YT-HWV-SHORTS-DIMMED')).toBe(true);
      expect(element.classList.contains('YT-HWV-SHORTS-HIDDEN')).toBe(false);
    });

    test('should remove classes when state is normal', () => {
      const element = document.createElement('div');
      element.classList.add('YT-HWV-WATCHED-DIMMED', 'YT-HWV-WATCHED-HIDDEN');
      
      applyHidingClass(element, 'normal', 'watched');
      
      expect(element.classList.contains('YT-HWV-WATCHED-DIMMED')).toBe(false);
      expect(element.classList.contains('YT-HWV-WATCHED-HIDDEN')).toBe(false);
    });

    test('should replace existing class with new one', () => {
      const element = document.createElement('div');
      element.classList.add('YT-HWV-WATCHED-HIDDEN');
      
      applyHidingClass(element, 'dimmed', 'watched');
      
      expect(element.classList.contains('YT-HWV-WATCHED-DIMMED')).toBe(true);
      expect(element.classList.contains('YT-HWV-WATCHED-HIDDEN')).toBe(false);
    });
  });

  describe('Individual Video Classes', () => {
    const applyIndividualClass = (element, state) => {
      element.classList.remove('YT-HWV-INDIVIDUAL-DIMMED', 'YT-HWV-INDIVIDUAL-HIDDEN');
      
      if (state === 'dimmed') {
        element.classList.add('YT-HWV-INDIVIDUAL-DIMMED');
      } else if (state === 'hidden') {
        element.classList.add('YT-HWV-INDIVIDUAL-HIDDEN');
      }
    };

    test('should apply individual dimmed class', () => {
      const element = document.createElement('div');
      applyIndividualClass(element, 'dimmed');
      
      expect(element.classList.contains('YT-HWV-INDIVIDUAL-DIMMED')).toBe(true);
      expect(element.classList.contains('YT-HWV-INDIVIDUAL-HIDDEN')).toBe(false);
    });

    test('should apply individual hidden class', () => {
      const element = document.createElement('div');
      applyIndividualClass(element, 'hidden');
      
      expect(element.classList.contains('YT-HWV-INDIVIDUAL-HIDDEN')).toBe(true);
      expect(element.classList.contains('YT-HWV-INDIVIDUAL-DIMMED')).toBe(false);
    });
  });
});

describe('Business Logic - Video Element Detection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('Progress Bar Detection', () => {
    const findProgressBars = () => {
      const selectors = [
        '.ytd-thumbnail-overlay-resume-playback-renderer',
        '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment',
        '.ytp-progress-bar-played'
      ];
      
      const progressBars = [];
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          if (!progressBars.includes(el)) {
            progressBars.push(el);
          }
        });
      });
      
      return progressBars;
    };

    test('should find progress bars with different selectors', () => {
      const bar1 = document.createElement('div');
      bar1.className = 'ytd-thumbnail-overlay-resume-playback-renderer';
      
      const bar2 = document.createElement('div');
      bar2.className = 'ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment';
      
      const bar3 = document.createElement('div');
      bar3.className = 'ytp-progress-bar-played';
      
      document.body.appendChild(bar1);
      document.body.appendChild(bar2);
      document.body.appendChild(bar3);
      
      const bars = findProgressBars();
      expect(bars.length).toBe(3);
    });

    test('should not include duplicates', () => {
      const bar = document.createElement('div');
      bar.className = 'ytd-thumbnail-overlay-resume-playback-renderer ytp-progress-bar-played';
      document.body.appendChild(bar);
      
      const bars = findProgressBars();
      expect(bars.length).toBe(1);
    });

    test('should return empty array when no progress bars found', () => {
      const bars = findProgressBars();
      expect(bars).toEqual([]);
    });
  });

  describe('Video Container Detection', () => {
    const findVideoContainer = (element) => {
      const containerSelectors = [
        'ytd-rich-item-renderer',
        'ytd-video-renderer',
        'ytd-grid-video-renderer',
        'ytd-compact-video-renderer',
        'yt-lockup-view-model',
        'ytm-shorts-lockup-view-model'
      ];
      
      for (const selector of containerSelectors) {
        const container = element.closest(`.${selector}`);
        if (container) return container;
      }
      
      return null;
    };

    test('should find rich item renderer container', () => {
      const container = document.createElement('div');
      container.className = 'ytd-rich-item-renderer';
      const child = document.createElement('div');
      container.appendChild(child);
      document.body.appendChild(container);
      
      const found = findVideoContainer(child);
      expect(found).toBe(container);
    });

    test('should find video renderer container', () => {
      const container = document.createElement('div');
      container.className = 'ytd-video-renderer';
      const child = document.createElement('div');
      container.appendChild(child);
      document.body.appendChild(container);
      
      const found = findVideoContainer(child);
      expect(found).toBe(container);
    });

    test('should find closest container when nested', () => {
      const outer = document.createElement('div');
      outer.className = 'outer-element';
      const inner = document.createElement('div');
      inner.className = 'ytd-compact-video-renderer';
      const child = document.createElement('div');
      
      inner.appendChild(child);
      outer.appendChild(inner);
      document.body.appendChild(outer);
      
      const found = findVideoContainer(child);
      expect(found).toBe(inner);
    });

    test('should return null when no container found', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);
      
      const found = findVideoContainer(element);
      expect(found).toBeNull();
    });
  });

  describe('Video ID Extraction', () => {
    const extractVideoId = (url) => {
      if (!url) return null;
      
      const watchMatch = url.match(/\/watch\?v=([^&]+)/);
      if (watchMatch) return watchMatch[1];
      
      const shortsMatch = url.match(/\/shorts\/([^?]+)/);
      if (shortsMatch) return shortsMatch[1];
      
      return null;
    };

    test('should extract ID from watch URL', () => {
      expect(extractVideoId('/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractVideoId('/watch?v=abc123&list=PLtest')).toBe('abc123');
    });

    test('should extract ID from shorts URL', () => {
      expect(extractVideoId('/shorts/xyz789')).toBe('xyz789');
      expect(extractVideoId('/shorts/short123?feature=share')).toBe('short123');
    });

    test('should return null for invalid URLs', () => {
      expect(extractVideoId('/playlist?list=PLtest')).toBeNull();
      expect(extractVideoId('/channel/UCtest')).toBeNull();
      expect(extractVideoId('')).toBeNull();
      expect(extractVideoId(null)).toBeNull();
    });
  });

  describe('Title Extraction', () => {
    const extractVideoTitle = (container) => {
      const titleSelectors = [
        '#video-title',
        '#video-title-link',
        'a#video-title',
        'h3.title',
        'h3 a',
        'h4 a',
        '.title-and-badge a',
        'yt-formatted-string#video-title',
        'span#video-title'
      ];
      
      for (const selector of titleSelectors) {
        const element = container.querySelector(selector);
        if (element && !element.classList.contains('yt-hwv-eye-button')) {
          const title = element.getAttribute('title') || 
                       element.getAttribute('aria-label') || 
                       element.textContent?.trim() || 
                       '';
          
          if (title) {
            return cleanVideoTitle(title);
          }
        }
      }
      
      return '';
    };

    const cleanVideoTitle = (title) => {
      let cleaned = title;
      
      if (cleaned.includes(' - ')) {
        cleaned = cleaned.split(' - ')[0];
      }
      if (cleaned.includes(' by ')) {
        cleaned = cleaned.split(' by ')[0];
      }
      
      return cleaned.trim();
    };

    test('should extract title from title attribute', () => {
      const container = document.createElement('div');
      const titleElement = document.createElement('a');
      titleElement.id = 'video-title';
      titleElement.setAttribute('title', 'Amazing Video Title');
      container.appendChild(titleElement);
      
      expect(extractVideoTitle(container)).toBe('Amazing Video Title');
    });

    test('should extract title from aria-label', () => {
      const container = document.createElement('div');
      const titleElement = document.createElement('span');
      titleElement.id = 'video-title';
      titleElement.setAttribute('aria-label', 'Cool Video - by Channel Name');
      container.appendChild(titleElement);
      
      expect(extractVideoTitle(container)).toBe('Cool Video');
    });

    test('should extract title from text content', () => {
      const container = document.createElement('div');
      const titleElement = document.createElement('h3');
      titleElement.className = 'title';
      titleElement.textContent = '  Test Video Title  ';
      container.appendChild(titleElement);
      
      expect(extractVideoTitle(container)).toBe('Test Video Title');
    });

    test('should clean title by removing metadata', () => {
      expect(cleanVideoTitle('Video Title - 1M views')).toBe('Video Title');
      expect(cleanVideoTitle('Video Title by Creator Name')).toBe('Video Title');
      expect(cleanVideoTitle('Video Title - by Creator - 1M views')).toBe('Video Title');
    });

    test('should ignore eye button elements', () => {
      const container = document.createElement('div');
      const eyeButton = document.createElement('a');
      eyeButton.id = 'video-title';
      eyeButton.className = 'yt-hwv-eye-button';
      eyeButton.textContent = 'Toggle visibility';
      
      const realTitle = document.createElement('h3');
      realTitle.className = 'title';
      realTitle.textContent = 'Real Video Title';
      
      container.appendChild(eyeButton);
      container.appendChild(realTitle);
      
      expect(extractVideoTitle(container)).toBe('Real Video Title');
    });

    test('should return empty string when no title found', () => {
      const container = document.createElement('div');
      expect(extractVideoTitle(container)).toBe('');
    });
  });
});

describe('Business Logic - Eye Button Management', () => {
  describe('Eye Button Creation', () => {
    const createEyeButton = (videoId, currentState) => {
      const button = document.createElement('button');
      button.className = 'yt-hwv-eye-button';
      button.setAttribute('data-video-id', videoId);
      button.setAttribute('tabindex', '-1');
      button.setAttribute('aria-label', 'Toggle video visibility');
      
      if (currentState === 'dimmed') button.classList.add('dimmed');
      if (currentState === 'hidden') button.classList.add('hidden');
      
      button.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z"/>
        </svg>
      `;
      
      return button;
    };

    test('should create eye button with normal state', () => {
      const button = createEyeButton('video123', 'normal');
      
      expect(button.classList.contains('yt-hwv-eye-button')).toBe(true);
      expect(button.getAttribute('data-video-id')).toBe('video123');
      expect(button.classList.contains('dimmed')).toBe(false);
      expect(button.classList.contains('hidden')).toBe(false);
    });

    test('should create eye button with dimmed state', () => {
      const button = createEyeButton('video456', 'dimmed');
      
      expect(button.classList.contains('dimmed')).toBe(true);
      expect(button.classList.contains('hidden')).toBe(false);
    });

    test('should create eye button with hidden state', () => {
      const button = createEyeButton('video789', 'hidden');
      
      expect(button.classList.contains('hidden')).toBe(true);
      expect(button.classList.contains('dimmed')).toBe(false);
    });

    test('should have correct accessibility attributes', () => {
      const button = createEyeButton('video', 'normal');
      
      expect(button.getAttribute('tabindex')).toBe('-1');
      expect(button.getAttribute('aria-label')).toBe('Toggle video visibility');
    });
  });

  describe('Eye Button State Toggle', () => {
    const toggleEyeButtonState = (button, currentState, individualMode) => {
      const states = ['normal', individualMode];
      const currentIndex = states.indexOf(currentState);
      const nextIndex = (currentIndex + 1) % states.length;
      const nextState = states[nextIndex];
      
      button.classList.remove('dimmed', 'hidden');
      if (nextState === 'dimmed') button.classList.add('dimmed');
      if (nextState === 'hidden') button.classList.add('hidden');
      
      return nextState;
    };

    test('should toggle from normal to dimmed', () => {
      const button = document.createElement('button');
      const nextState = toggleEyeButtonState(button, 'normal', 'dimmed');
      
      expect(nextState).toBe('dimmed');
      expect(button.classList.contains('dimmed')).toBe(true);
    });

    test('should toggle from dimmed to normal', () => {
      const button = document.createElement('button');
      button.classList.add('dimmed');
      const nextState = toggleEyeButtonState(button, 'dimmed', 'dimmed');
      
      expect(nextState).toBe('normal');
      expect(button.classList.contains('dimmed')).toBe(false);
    });

    test('should toggle to hidden when individual mode is hidden', () => {
      const button = document.createElement('button');
      const nextState = toggleEyeButtonState(button, 'normal', 'hidden');
      
      expect(nextState).toBe('hidden');
      expect(button.classList.contains('hidden')).toBe(true);
    });
  });
});
