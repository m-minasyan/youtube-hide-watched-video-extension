import { debounce } from '../utils/debounce.js';

export function setupXhrObserver(applyHiding) {
  const debouncedApplyHiding = debounce(applyHiding, 100);

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    this.addEventListener('readystatechange', function() {
      if (this.readyState === 4 && this._url &&
          (this._url.includes('browse_ajax') || this._url.includes('browse?'))) {
        setTimeout(debouncedApplyHiding, 100);
      }
    });
    return originalSend.apply(this, arguments);
  };
}
