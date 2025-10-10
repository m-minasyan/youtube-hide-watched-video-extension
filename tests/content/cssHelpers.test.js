/**
 * @jest-environment jsdom
 */

const { removeClassFromAll, removeClassesFromAll } = require('../../content/utils/cssHelpers.js');

describe('CSS Helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('removeClassFromAll', () => {
    it('should remove class from all elements', () => {
      document.body.innerHTML = `
        <div class="test-class">Item 1</div>
        <div class="test-class other">Item 2</div>
        <div class="another test-class">Item 3</div>
        <div>Item 4</div>
      `;

      removeClassFromAll('test-class');

      const elements = document.querySelectorAll('.test-class');
      expect(elements.length).toBe(0);

      const item2 = document.querySelectorAll('.other');
      expect(item2.length).toBe(1);
      expect(item2[0].classList.contains('other')).toBe(true);
    });

    it('should handle empty document', () => {
      document.body.innerHTML = '';

      expect(() => removeClassFromAll('test-class')).not.toThrow();
    });

    it('should handle non-existent class', () => {
      document.body.innerHTML = `
        <div class="foo">Item 1</div>
        <div class="bar">Item 2</div>
      `;

      removeClassFromAll('non-existent');

      expect(document.querySelectorAll('.foo').length).toBe(1);
      expect(document.querySelectorAll('.bar').length).toBe(1);
    });

    it('should handle elements with multiple classes', () => {
      document.body.innerHTML = `
        <div class="class-a class-b class-c">Item 1</div>
        <div class="class-b">Item 2</div>
      `;

      removeClassFromAll('class-b');

      const item1 = document.querySelector('div');
      expect(item1.classList.contains('class-a')).toBe(true);
      expect(item1.classList.contains('class-b')).toBe(false);
      expect(item1.classList.contains('class-c')).toBe(true);

      const elementsWithClassB = document.querySelectorAll('.class-b');
      expect(elementsWithClassB.length).toBe(0);
    });
  });

  describe('removeClassesFromAll', () => {
    it('should remove multiple classes', () => {
      document.body.innerHTML = `
        <div class="class-a class-b">Item 1</div>
        <div class="class-b class-c">Item 2</div>
        <div class="class-a">Item 3</div>
        <div>Item 4</div>
      `;

      removeClassesFromAll('class-a', 'class-b');

      expect(document.querySelectorAll('.class-a').length).toBe(0);
      expect(document.querySelectorAll('.class-b').length).toBe(0);
      expect(document.querySelectorAll('.class-c').length).toBe(1);
    });

    it('should handle single class', () => {
      document.body.innerHTML = `
        <div class="test">Item 1</div>
        <div class="test">Item 2</div>
      `;

      removeClassesFromAll('test');

      expect(document.querySelectorAll('.test').length).toBe(0);
    });

    it('should handle no arguments', () => {
      document.body.innerHTML = `
        <div class="test">Item 1</div>
      `;

      expect(() => removeClassesFromAll()).not.toThrow();
      expect(document.querySelectorAll('.test').length).toBe(1);
    });

    it('should handle many classes at once', () => {
      document.body.innerHTML = `
        <div class="a b c d e">Item 1</div>
        <div class="a">Item 2</div>
        <div class="e">Item 3</div>
      `;

      removeClassesFromAll('a', 'b', 'c', 'd', 'e');

      const item1 = document.querySelectorAll('div')[0];
      expect(item1.classList.length).toBe(0);
      expect(document.querySelectorAll('.a').length).toBe(0);
      expect(document.querySelectorAll('.e').length).toBe(0);
    });

    it('should work with YouTube extension classes', () => {
      const CSS_CLASSES = {
        WATCHED_DIMMED: 'YT-HWV-WATCHED-DIMMED',
        WATCHED_HIDDEN: 'YT-HWV-WATCHED-HIDDEN',
        SHORTS_DIMMED: 'YT-HWV-SHORTS-DIMMED',
        SHORTS_HIDDEN: 'YT-HWV-SHORTS-HIDDEN'
      };

      document.body.innerHTML = `
        <div class="${CSS_CLASSES.WATCHED_DIMMED}">Video 1</div>
        <div class="${CSS_CLASSES.WATCHED_HIDDEN}">Video 2</div>
        <div class="${CSS_CLASSES.SHORTS_DIMMED}">Short 1</div>
        <div class="${CSS_CLASSES.SHORTS_HIDDEN}">Short 2</div>
      `;

      removeClassesFromAll(CSS_CLASSES.WATCHED_DIMMED, CSS_CLASSES.WATCHED_HIDDEN);

      expect(document.querySelectorAll(`.${CSS_CLASSES.WATCHED_DIMMED}`).length).toBe(0);
      expect(document.querySelectorAll(`.${CSS_CLASSES.WATCHED_HIDDEN}`).length).toBe(0);
      expect(document.querySelectorAll(`.${CSS_CLASSES.SHORTS_DIMMED}`).length).toBe(1);
      expect(document.querySelectorAll(`.${CSS_CLASSES.SHORTS_HIDDEN}`).length).toBe(1);
    });
  });
});
