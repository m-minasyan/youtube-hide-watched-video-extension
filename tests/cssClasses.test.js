const { createMockVideoElement } = require('./testUtils');

describe('Content Script - CSS Class Application', () => {
  const applyVideoState = (element, type, state) => {
    const classMap = {
      watched: {
        hidden: 'YT-HWV-WATCHED-HIDDEN',
        dimmed: 'YT-HWV-WATCHED-DIMMED'
      },
      shorts: {
        hidden: 'YT-HWV-SHORTS-HIDDEN',
        dimmed: 'YT-HWV-SHORTS-DIMMED'
      },
      individual: {
        hidden: 'YT-HWV-INDIVIDUAL-HIDDEN',
        dimmed: 'YT-HWV-INDIVIDUAL-DIMMED'
      }
    };
    
    Object.values(classMap).forEach(classes => {
      Object.values(classes).forEach(className => {
        element.classList.remove(className);
      });
    });
    
    if (state !== 'normal' && classMap[type] && classMap[type][state]) {
      element.classList.add(classMap[type][state]);
    }
  };

  test('should apply correct class for watched videos', () => {
    const element = createMockVideoElement();
    
    applyVideoState(element, 'watched', 'hidden');
    expect(element.classList.contains('YT-HWV-WATCHED-HIDDEN')).toBe(true);
    
    applyVideoState(element, 'watched', 'dimmed');
    expect(element.classList.contains('YT-HWV-WATCHED-DIMMED')).toBe(true);
    expect(element.classList.contains('YT-HWV-WATCHED-HIDDEN')).toBe(false);
  });

  test('should apply correct class for shorts', () => {
    const element = createMockVideoElement({ isShorts: true });
    
    applyVideoState(element, 'shorts', 'hidden');
    expect(element.classList.contains('YT-HWV-SHORTS-HIDDEN')).toBe(true);
    
    applyVideoState(element, 'shorts', 'dimmed');
    expect(element.classList.contains('YT-HWV-SHORTS-DIMMED')).toBe(true);
    expect(element.classList.contains('YT-HWV-SHORTS-HIDDEN')).toBe(false);
  });

  test('should apply correct class for individual videos', () => {
    const element = createMockVideoElement();
    
    applyVideoState(element, 'individual', 'hidden');
    expect(element.classList.contains('YT-HWV-INDIVIDUAL-HIDDEN')).toBe(true);
    
    applyVideoState(element, 'individual', 'dimmed');
    expect(element.classList.contains('YT-HWV-INDIVIDUAL-DIMMED')).toBe(true);
    expect(element.classList.contains('YT-HWV-INDIVIDUAL-HIDDEN')).toBe(false);
  });

  test('should remove all classes when state is normal', () => {
    const element = createMockVideoElement();
    element.classList.add('YT-HWV-WATCHED-HIDDEN');
    element.classList.add('YT-HWV-INDIVIDUAL-DIMMED');
    
    applyVideoState(element, 'watched', 'normal');
    
    expect(element.classList.contains('YT-HWV-WATCHED-HIDDEN')).toBe(false);
    expect(element.classList.contains('YT-HWV-INDIVIDUAL-DIMMED')).toBe(false);
  });

  test('should handle invalid state gracefully', () => {
    const element = createMockVideoElement();
    
    applyVideoState(element, 'watched', 'invalid');
    
    expect(element.className).toBe('ytd-rich-item-renderer');
  });
});
