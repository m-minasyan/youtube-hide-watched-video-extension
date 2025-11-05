/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./content/detection/sectionDetector.js":
/*!**********************************************!*\
  !*** ./content/detection/sectionDetector.js ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   determineYoutubeSection: () => (/* binding */ determineYoutubeSection)
/* harmony export */ });
function determineYoutubeSection() {
  const { href } = window.location;

  if (href.includes('/watch?')) return 'watch';
  if (href.match(/.*\/(user|channel|c)\/.+\/videos/u) || href.match(/.*\/@.*/u)) return 'channel';
  if (href.includes('/feed/subscriptions')) return 'subscriptions';
  if (href.includes('/feed/trending')) return 'trending';
  if (href.includes('/playlist?')) return 'playlist';

  return 'misc';
}


/***/ }),

/***/ "./content/detection/shortsDetector.js":
/*!*********************************************!*\
  !*** ./content/detection/shortsDetector.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   findShortsContainers: () => (/* binding */ findShortsContainers)
/* harmony export */ });
/* harmony import */ var _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/constants.js */ "./content/utils/constants.js");
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/logger.js */ "./content/utils/logger.js");
/* harmony import */ var _utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/domCache.js */ "./content/utils/domCache.js");




function findShortsContainers() {
  const shortsContainers = [];
  const processedContainers = new Set();

  _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.SELECTORS.SHORTS_CONTAINERS.forEach(selector => {
    try {
      // Use cached query
      (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.cachedDocumentQuery)(selector).forEach(element => {
        const key = element.tagName + element.className;
        if (!processedContainers.has(key)) {
          processedContainers.add(key);

          // Use cached closest
          const parentShelf = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.cachedClosest)(element, 'ytd-reel-shelf-renderer') ||
                             (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.cachedClosest)(element, 'ytd-rich-shelf-renderer') ||
                             (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.cachedClosest)(element, 'ytd-rich-section-renderer');

          if (parentShelf && !shortsContainers.includes(parentShelf)) {
            shortsContainers.push(parentShelf);
          } else if (!parentShelf && !shortsContainers.includes(element)) {
            shortsContainers.push(element);
          }
        }
      });
    } catch(e) {
      (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logDebug)(`Selector failed: ${selector}`, e);
    }
  });

  // Use cached queries for additional detection
  const reelItemLinks = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.cachedDocumentQuery)('a.reel-item-endpoint, a[href^="/shorts/"]');
  reelItemLinks.forEach(link => {
    const container = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.cachedClosest)(link, 'ytd-rich-item-renderer') ||
                     (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.cachedClosest)(link, 'ytd-video-renderer') ||
                     (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.cachedClosest)(link, 'ytd-compact-video-renderer') ||
                     (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.cachedClosest)(link, 'ytd-grid-video-renderer');
    if (container && !shortsContainers.includes(container)) {
      shortsContainers.push(container);
    }
  });

  const shortsLabels = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.cachedDocumentQuery)('.ytd-thumbnail-overlay-time-status-renderer[aria-label="Shorts"]');
  shortsLabels.forEach((child) => {
    const container = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.cachedClosest)(child, 'ytd-video-renderer') ||
                     (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.cachedClosest)(child, 'ytd-compact-video-renderer') ||
                     (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.cachedClosest)(child, 'ytd-grid-video-renderer');
    if (container && !shortsContainers.includes(container)) {
      shortsContainers.push(container);
    }
  });

  const richShelves = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.cachedDocumentQuery)('ytd-rich-shelf-renderer');
  richShelves.forEach(shelf => {
    const hasShorts = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.cachedQuerySelector)(shelf, 'a[href^="/shorts/"]') ||
                     (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.cachedQuerySelector)(shelf, '.reel-item-endpoint') ||
                     (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.cachedQuerySelector)(shelf, '.shortsLockupViewModelHost');
    if (hasShorts && !shortsContainers.includes(shelf)) {
      shortsContainers.push(shelf);
    }
  });

  (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logDebug)(`Found ${shortsContainers.length} shorts container elements`);

  return shortsContainers;
}


/***/ }),

/***/ "./content/detection/videoDetector.js":
/*!********************************************!*\
  !*** ./content/detection/videoDetector.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   findWatchedElements: () => (/* binding */ findWatchedElements),
/* harmony export */   getVideoId: () => (/* binding */ getVideoId)
/* harmony export */ });
/* harmony import */ var _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../shared/constants.js */ "./shared/constants.js");
/* harmony import */ var _storage_settings_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../storage/settings.js */ "./content/storage/settings.js");
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/logger.js */ "./content/utils/logger.js");
/* harmony import */ var _utils_dom_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils/dom.js */ "./content/utils/dom.js");
/* harmony import */ var _utils_domCache_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/domCache.js */ "./content/utils/domCache.js");






function getVideoId(element) {
  // Use fallback chain for video links
  const videoLink = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_4__.cachedQuerySelectorWithFallback)(
    element,
    'VIDEO_LINK',
    _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.SELECTOR_CHAINS.VIDEO_LINK
  );

  if (videoLink) {
    const href = videoLink.getAttribute('href');
    const videoId = (0,_utils_dom_js__WEBPACK_IMPORTED_MODULE_3__.extractVideoIdFromHref)(href);
    if (videoId) return videoId;
  }

  // Try shorts link as fallback
  const shortsLink = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_4__.cachedQuerySelectorWithFallback)(
    element,
    'SHORTS_LINK',
    _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.SELECTOR_CHAINS.SHORTS_LINK
  );

  if (shortsLink) {
    const href = shortsLink.getAttribute('href');
    const videoId = (0,_utils_dom_js__WEBPACK_IMPORTED_MODULE_3__.extractVideoIdFromHref)(href);
    if (videoId) return videoId;
  }

  return null;
}

function findWatchedElements() {
  // Use fallback chain for progress bars
  const progressBars = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_4__.cachedDocumentQueryWithFallback)(
    'PROGRESS_BAR',
    _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.SELECTOR_CHAINS.PROGRESS_BAR,
    _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.CACHE_CONFIG.PROGRESS_BAR_TTL
  );

  const threshold = (0,_storage_settings_js__WEBPACK_IMPORTED_MODULE_1__.getThreshold)();
  const withThreshold = progressBars.filter((bar) => {
    return bar.style.width && parseInt(bar.style.width, 10) >= threshold;
  });

  (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_2__.logDebug)(`Found ${progressBars.length} watched elements (${withThreshold.length} within threshold)`);

  return withThreshold;
}


/***/ }),

/***/ "./content/events/eventHandler.js":
/*!****************************************!*\
  !*** ./content/events/eventHandler.js ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   applyHiding: () => (/* binding */ applyHiding),
/* harmony export */   cleanupEventHandlers: () => (/* binding */ cleanupEventHandlers),
/* harmony export */   handleHiddenVideosEvent: () => (/* binding */ handleHiddenVideosEvent),
/* harmony export */   setupMessageListener: () => (/* binding */ setupMessageListener)
/* harmony export */ });
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/logger.js */ "./content/utils/logger.js");
/* harmony import */ var _utils_constants_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/constants.js */ "./content/utils/constants.js");
/* harmony import */ var _storage_cache_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../storage/cache.js */ "./content/storage/cache.js");
/* harmony import */ var _storage_settings_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../storage/settings.js */ "./content/storage/settings.js");
/* harmony import */ var _hiding_watchedHiding_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../hiding/watchedHiding.js */ "./content/hiding/watchedHiding.js");
/* harmony import */ var _hiding_shortsHiding_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../hiding/shortsHiding.js */ "./content/hiding/shortsHiding.js");
/* harmony import */ var _ui_eyeButton_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../ui/eyeButton.js */ "./content/ui/eyeButton.js");
/* harmony import */ var _ui_eyeButtonManager_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../ui/eyeButtonManager.js */ "./content/ui/eyeButtonManager.js");
/* harmony import */ var _hiding_individualHiding_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../hiding/individualHiding.js */ "./content/hiding/individualHiding.js");
/* harmony import */ var _utils_visibilityTracker_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../utils/visibilityTracker.js */ "./content/utils/visibilityTracker.js");











function handleHiddenVideosEvent(event) {
  if (!event || !event.type) return;
  if (event.type === 'updated' && event.record) {
    (0,_storage_cache_js__WEBPACK_IMPORTED_MODULE_2__.applyCacheUpdate)(event.record.videoId, event.record);
    // Use programmatic filtering to prevent CSS selector injection
    document.querySelectorAll(`.${_utils_constants_js__WEBPACK_IMPORTED_MODULE_1__.CSS_CLASSES.EYE_BUTTON}`).forEach((button) => {
      if (button.dataset.videoId === event.record.videoId) {
        (0,_ui_eyeButton_js__WEBPACK_IMPORTED_MODULE_6__.applyStateToEyeButton)(button, event.record.state);
      }
    });
    (0,_hiding_individualHiding_js__WEBPACK_IMPORTED_MODULE_8__.applyIndividualHiding)();
    return;
  }
  if (event.type === 'removed' && event.videoId) {
    (0,_storage_cache_js__WEBPACK_IMPORTED_MODULE_2__.applyCacheUpdate)(event.videoId, null);
    // Use programmatic filtering to prevent CSS selector injection
    document.querySelectorAll(`.${_utils_constants_js__WEBPACK_IMPORTED_MODULE_1__.CSS_CLASSES.EYE_BUTTON}`).forEach((button) => {
      if (button.dataset.videoId === event.videoId) {
        (0,_ui_eyeButton_js__WEBPACK_IMPORTED_MODULE_6__.applyStateToEyeButton)(button, 'normal');
      }
    });
    (0,_hiding_individualHiding_js__WEBPACK_IMPORTED_MODULE_8__.applyIndividualHiding)();
    return;
  }
  if (event.type === 'cleared') {
    (0,_storage_cache_js__WEBPACK_IMPORTED_MODULE_2__.clearCache)();
    document.querySelectorAll(`.${_utils_constants_js__WEBPACK_IMPORTED_MODULE_1__.CSS_CLASSES.EYE_BUTTON}`).forEach((button) => {
      (0,_ui_eyeButton_js__WEBPACK_IMPORTED_MODULE_6__.applyStateToEyeButton)(button, 'normal');
    });
    (0,_hiding_individualHiding_js__WEBPACK_IMPORTED_MODULE_8__.applyIndividualHiding)();
  }
}

async function applyHiding() {
  (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_0__.logDebug)('Applying hiding/dimming');
  (0,_hiding_watchedHiding_js__WEBPACK_IMPORTED_MODULE_4__.updateClassOnWatchedItems)();
  (0,_hiding_shortsHiding_js__WEBPACK_IMPORTED_MODULE_5__.updateClassOnShortsItems)();
  // Removed setTimeout delay - synchronization now happens in eye button fetch callbacks
  // This improves responsiveness and prevents race condition where container state
  // is applied before cache is populated
  (0,_ui_eyeButtonManager_js__WEBPACK_IMPORTED_MODULE_7__.addEyeButtons)();
  await (0,_hiding_individualHiding_js__WEBPACK_IMPORTED_MODULE_8__.applyIndividualHiding)();
}

// Visibility change handler
let visibilityUnsubscribe = null;

function setupMessageListener() {
  chrome.runtime.onMessage.addListener((request, sender) => {
    // Handle messages asynchronously without blocking
    // This listener doesn't send responses, so we handle async work internally
    (async () => {
      if (request.action === 'settingsUpdated') {
        await (0,_storage_settings_js__WEBPACK_IMPORTED_MODULE_3__.loadSettings)();
        await applyHiding();
      } else if (request.action === 'resetSettings') {
        await (0,_storage_settings_js__WEBPACK_IMPORTED_MODULE_3__.loadSettings)();
        await applyHiding();
      } else if (request.type === 'HIDDEN_VIDEOS_EVENT') {
        handleHiddenVideosEvent(request.event);
      }
    })().catch((err) => {
      (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_0__.error)('Error handling message in content script:', err);
    });

    // No response needed for these messages
    return false;
  });

  // Listen for custom events from eye buttons
  document.addEventListener('yt-hwv-individual-update', () => {
    (0,_hiding_individualHiding_js__WEBPACK_IMPORTED_MODULE_8__.applyIndividualHiding)();
  });

  // Listen to visibility changes if lazy processing is enabled
  // When ENABLE_LAZY_PROCESSING is false, all videos are processed immediately
  // without visibility tracking, which is the traditional behavior for smaller pages
  if (_utils_constants_js__WEBPACK_IMPORTED_MODULE_1__.INTERSECTION_OBSERVER_CONFIG.ENABLE_LAZY_PROCESSING) {
    visibilityUnsubscribe = (0,_utils_visibilityTracker_js__WEBPACK_IMPORTED_MODULE_9__.onVisibilityChange)(({ becameVisible, becameHidden }) => {
      if (becameVisible.length > 0) {
        (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_0__.logDebug)(`Processing ${becameVisible.length} newly visible videos`);
        // Process videos that just became visible
        (0,_hiding_individualHiding_js__WEBPACK_IMPORTED_MODULE_8__.applyIndividualHiding)();
      }
    });
  } else {
    (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_0__.logDebug)('Lazy processing disabled - processing all videos immediately on DOM changes');
  }
}

// Export cleanup function
function cleanupEventHandlers() {
  if (visibilityUnsubscribe) {
    visibilityUnsubscribe();
    visibilityUnsubscribe = null;
  }
}


/***/ }),

/***/ "./content/hiding/individualHiding.js":
/*!********************************************!*\
  !*** ./content/hiding/individualHiding.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   applyIndividualHiding: () => (/* binding */ applyIndividualHiding),
/* harmony export */   markInitialLoadComplete: () => (/* binding */ markInitialLoadComplete),
/* harmony export */   syncIndividualContainerState: () => (/* binding */ syncIndividualContainerState)
/* harmony export */ });
/* harmony import */ var _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/constants.js */ "./content/utils/constants.js");
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/logger.js */ "./content/utils/logger.js");
/* harmony import */ var _storage_cache_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../storage/cache.js */ "./content/storage/cache.js");
/* harmony import */ var _storage_messaging_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../storage/messaging.js */ "./content/storage/messaging.js");
/* harmony import */ var _storage_settings_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../storage/settings.js */ "./content/storage/settings.js");
/* harmony import */ var _utils_dom_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../utils/dom.js */ "./content/utils/dom.js");
/* harmony import */ var _utils_visibilityTracker_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../utils/visibilityTracker.js */ "./content/utils/visibilityTracker.js");








let individualHidingIteration = 0;
let isInitialLoad = true;

/**
 * Synchronizes container CSS classes with video state
 * Exported so eye button creation can sync state immediately after fetch
 * @param {HTMLElement} container - Video container element
 * @param {string} state - Video state ('normal', 'dimmed', 'hidden')
 */
function syncIndividualContainerState(container, state) {
  if (!container) return;
  const hasDimmed = container.classList.contains(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.INDIVIDUAL_DIMMED);
  const hasHidden = container.classList.contains(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.INDIVIDUAL_HIDDEN);
  if (state === 'dimmed') {
    if (hasHidden) {
      container.classList.remove(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.INDIVIDUAL_HIDDEN);
    }
    if (!hasDimmed) {
      container.classList.add(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.INDIVIDUAL_DIMMED);
    }
    return;
  }
  if (state === 'hidden') {
    if (hasDimmed) {
      container.classList.remove(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.INDIVIDUAL_DIMMED);
    }
    if (!hasHidden) {
      container.classList.add(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.INDIVIDUAL_HIDDEN);
    }
    return;
  }
  if (hasDimmed) {
    container.classList.remove(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.INDIVIDUAL_DIMMED);
  }
  if (hasHidden) {
    container.classList.remove(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.INDIVIDUAL_HIDDEN);
  }
}

/**
 * Mark the initial load as complete
 * Exported for testing purposes
 */
function markInitialLoadComplete() {
  isInitialLoad = false;
}

async function applyIndividualHiding() {
  if (!(0,_storage_settings_js__WEBPACK_IMPORTED_MODULE_4__.isIndividualModeEnabled)()) {
    document.querySelectorAll(`.${_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.INDIVIDUAL_DIMMED}, .${_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.INDIVIDUAL_HIDDEN}`).forEach((el) => {
      el.classList.remove(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.INDIVIDUAL_DIMMED, _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.INDIVIDUAL_HIDDEN);
    });
    return;
  }

  // Enhanced debug logging
  (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logDebug)('=== applyIndividualHiding called ===');
  (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logDebug)(`Initial load: ${isInitialLoad}`);
  (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logDebug)(`Lazy processing enabled: ${_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.INTERSECTION_OBSERVER_CONFIG.ENABLE_LAZY_PROCESSING}`);
  (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logDebug)(`Visible videos count: ${(0,_utils_visibilityTracker_js__WEBPACK_IMPORTED_MODULE_6__.getVisibleVideos)().size}`);

  individualHidingIteration += 1;
  const token = individualHidingIteration;

  let videoIds;

  if (_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.INTERSECTION_OBSERVER_CONFIG.ENABLE_LAZY_PROCESSING && !isInitialLoad) {
    // Lazy processing for subsequent updates (after initial load)
    const visibleContainers = (0,_utils_visibilityTracker_js__WEBPACK_IMPORTED_MODULE_6__.getVisibleVideos)();
    const visibleIds = new Set();

    visibleContainers.forEach(container => {
      // Add null check and verify container is still connected to DOM
      if (!container || !container.isConnected) {
        return;
      }

      try {
        const videoId = container.getAttribute('data-ythwv-video-id');
        if (videoId) visibleIds.add(videoId);

        // Also check for links within visible containers
        const links = container.querySelectorAll('a[href*="/watch?v="], a[href*="/shorts/"]');
        links.forEach(link => {
          const href = link.getAttribute('href');
          if (href) {
            const id = (0,_utils_dom_js__WEBPACK_IMPORTED_MODULE_5__.extractVideoIdFromHref)(href);
            if (id) visibleIds.add(id);
          }
        });
      } catch (error) {
        // Container may have been removed from DOM during iteration
        (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logDebug)('Error processing container in lazy mode:', error);
      }
    });

    videoIds = Array.from(visibleIds);
    (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logDebug)(`Processing ${videoIds.length} visible videos (lazy mode)`);
  } else {
    // Initial load or lazy processing disabled: process ALL videos
    videoIds = (0,_utils_dom_js__WEBPACK_IMPORTED_MODULE_5__.collectVisibleVideoIds)();
    (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logDebug)(`Processing ${videoIds.length} total videos (${isInitialLoad ? 'initial load' : 'full mode'})`);
  }

  if (videoIds.length === 0) {
    return;
  }

  try {
    await (0,_storage_messaging_js__WEBPACK_IMPORTED_MODULE_3__.fetchHiddenVideoStates)(videoIds);
  } catch (error) {
    (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logDebug)('Failed to fetch hidden video states', error);
    return;
  }

  if (token !== individualHidingIteration) {
    return;
  }

  videoIds.forEach((videoId) => {
    // Skip if no cached record - eye button will handle initial fetch and sync
    // This prevents applying stale/incorrect state before cache is populated
    if (!(0,_storage_cache_js__WEBPACK_IMPORTED_MODULE_2__.hasCachedVideo)(videoId)) {
      return;
    }

    const record = (0,_storage_cache_js__WEBPACK_IMPORTED_MODULE_2__.getCachedHiddenVideo)(videoId);
    const state = record?.state || 'normal';
    const containers = (0,_utils_dom_js__WEBPACK_IMPORTED_MODULE_5__.findVideoContainers)(videoId);

    containers.forEach((container) => {
      // On initial load, process all containers
      // After initial load, only process visible containers if lazy processing enabled
      const shouldProcess = !_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.INTERSECTION_OBSERVER_CONFIG.ENABLE_LAZY_PROCESSING ||
                            isInitialLoad ||
                            (0,_utils_visibilityTracker_js__WEBPACK_IMPORTED_MODULE_6__.isVideoVisible)(container);

      if (shouldProcess) {
        syncIndividualContainerState(container, state);
      }
    });
  });

  // Mark initial load as complete
  if (isInitialLoad) {
    isInitialLoad = false;
    (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logDebug)('Initial load complete, switching to lazy processing mode');
  }
}


/***/ }),

/***/ "./content/hiding/shortsHiding.js":
/*!****************************************!*\
  !*** ./content/hiding/shortsHiding.js ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   updateClassOnShortsItems: () => (/* binding */ updateClassOnShortsItems)
/* harmony export */ });
/* harmony import */ var _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/constants.js */ "./content/utils/constants.js");
/* harmony import */ var _storage_settings_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../storage/settings.js */ "./content/storage/settings.js");
/* harmony import */ var _detection_sectionDetector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../detection/sectionDetector.js */ "./content/detection/sectionDetector.js");
/* harmony import */ var _detection_shortsDetector_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../detection/shortsDetector.js */ "./content/detection/shortsDetector.js");
/* harmony import */ var _utils_cssHelpers_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/cssHelpers.js */ "./content/utils/cssHelpers.js");






function updateClassOnShortsItems() {
  (0,_utils_cssHelpers_js__WEBPACK_IMPORTED_MODULE_4__.removeClassesFromAll)(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.SHORTS_DIMMED, _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.SHORTS_HIDDEN);

  const section = (0,_detection_sectionDetector_js__WEBPACK_IMPORTED_MODULE_2__.determineYoutubeSection)();
  const state = (0,_storage_settings_js__WEBPACK_IMPORTED_MODULE_1__.getShortsState)(section) || 'normal';

  if (state === 'normal') return;

  const shortsContainers = (0,_detection_shortsDetector_js__WEBPACK_IMPORTED_MODULE_3__.findShortsContainers)();

  shortsContainers.forEach((item) => {
    if (state === 'dimmed') {
      item.classList.add(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.SHORTS_DIMMED);
    } else if (state === 'hidden') {
      item.classList.add(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.SHORTS_HIDDEN);
    }
  });
}


/***/ }),

/***/ "./content/hiding/watchedHiding.js":
/*!*****************************************!*\
  !*** ./content/hiding/watchedHiding.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   updateClassOnWatchedItems: () => (/* binding */ updateClassOnWatchedItems)
/* harmony export */ });
/* harmony import */ var _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/constants.js */ "./content/utils/constants.js");
/* harmony import */ var _storage_settings_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../storage/settings.js */ "./content/storage/settings.js");
/* harmony import */ var _detection_sectionDetector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../detection/sectionDetector.js */ "./content/detection/sectionDetector.js");
/* harmony import */ var _detection_videoDetector_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../detection/videoDetector.js */ "./content/detection/videoDetector.js");
/* harmony import */ var _utils_cssHelpers_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/cssHelpers.js */ "./content/utils/cssHelpers.js");
/* harmony import */ var _utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../utils/domCache.js */ "./content/utils/domCache.js");







function updateClassOnWatchedItems() {
  (0,_utils_cssHelpers_js__WEBPACK_IMPORTED_MODULE_4__.removeClassesFromAll)(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.WATCHED_DIMMED, _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.WATCHED_HIDDEN);

  if (window.location.href.indexOf('/feed/history') >= 0) return;

  const section = (0,_detection_sectionDetector_js__WEBPACK_IMPORTED_MODULE_2__.determineYoutubeSection)();
  const state = (0,_storage_settings_js__WEBPACK_IMPORTED_MODULE_1__.getWatchedState)(section) || 'normal';

  if (state === 'normal') return;

  (0,_detection_videoDetector_js__WEBPACK_IMPORTED_MODULE_3__.findWatchedElements)().forEach((item) => {
    let watchedItem;
    let dimmedItem;

    if (section === 'subscriptions') {
      // Use cached closest for all lookups
      watchedItem = (
        (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__.cachedClosest)(item, '.ytd-grid-renderer') ||
        (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__.cachedClosest)(item, '.ytd-item-section-renderer') ||
        (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__.cachedClosest)(item, '.ytd-rich-grid-row') ||
        (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__.cachedClosest)(item, '.ytd-rich-grid-renderer') ||
        (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__.cachedClosest)(item, '#grid-container')
      );

      if (watchedItem?.classList.contains('ytd-item-section-renderer')) {
        (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__.cachedClosest)(watchedItem, 'ytd-item-section-renderer')?.classList.add(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.HIDDEN_ROW_PARENT);
      }
    } else if (section === 'playlist') {
      watchedItem = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__.cachedClosest)(item, 'ytd-playlist-video-renderer');
    } else if (section === 'watch') {
      watchedItem = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__.cachedClosest)(item, 'ytd-compact-video-renderer');

      if ((0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__.cachedClosest)(watchedItem, 'ytd-compact-autoplay-renderer')) {
        watchedItem = null;
      }

      const watchedItemInPlaylist = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__.cachedClosest)(item, 'ytd-playlist-panel-video-renderer');
      if (!watchedItem && watchedItemInPlaylist) {
        dimmedItem = watchedItemInPlaylist;
      }
    } else {
      watchedItem = (
        (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__.cachedClosest)(item, 'ytd-rich-item-renderer') ||
        (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__.cachedClosest)(item, 'ytd-video-renderer') ||
        (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__.cachedClosest)(item, 'ytd-grid-video-renderer') ||
        (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__.cachedClosest)(item, 'ytm-video-with-context-renderer') ||
        (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__.cachedClosest)(item, 'ytm-item-section-renderer')
      );
    }

    if (watchedItem) {
      if (state === 'dimmed') {
        watchedItem.classList.add(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.WATCHED_DIMMED);
      } else if (state === 'hidden') {
        watchedItem.classList.add(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.WATCHED_HIDDEN);
      }
    }

    if (dimmedItem && (state === 'dimmed' || state === 'hidden')) {
      dimmedItem.classList.add(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.WATCHED_DIMMED);
    }
  });
}


/***/ }),

/***/ "./content/observers/intersectionObserver.js":
/*!***************************************************!*\
  !*** ./content/observers/intersectionObserver.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   disconnectIntersectionObserver: () => (/* binding */ disconnectIntersectionObserver),
/* harmony export */   getIntersectionObserver: () => (/* binding */ getIntersectionObserver),
/* harmony export */   observeVideoContainers: () => (/* binding */ observeVideoContainers),
/* harmony export */   reconnectIntersectionObserver: () => (/* binding */ reconnectIntersectionObserver),
/* harmony export */   setupIntersectionObserver: () => (/* binding */ setupIntersectionObserver),
/* harmony export */   unobserveVideoContainers: () => (/* binding */ unobserveVideoContainers)
/* harmony export */ });
/* harmony import */ var _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/constants.js */ "./content/utils/constants.js");
/* harmony import */ var _utils_visibilityTracker_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/visibilityTracker.js */ "./content/utils/visibilityTracker.js");
/* harmony import */ var _utils_debounce_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/debounce.js */ "./content/utils/debounce.js");
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils/logger.js */ "./content/utils/logger.js");
/* harmony import */ var _utils_domCache_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/domCache.js */ "./content/utils/domCache.js");






let intersectionObserver = null;
let debouncedProcessEntries = null;
let batchedEntries = [];

/**
 * Create and configure IntersectionObserver
 * @returns {IntersectionObserver}
 */
function createIntersectionObserver() {
  const options = {
    root: null, // viewport
    rootMargin: _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.INTERSECTION_OBSERVER_CONFIG.ROOT_MARGIN,
    threshold: _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.INTERSECTION_OBSERVER_CONFIG.THRESHOLD
  };

  // Batch process intersection changes
  debouncedProcessEntries = (0,_utils_debounce_js__WEBPACK_IMPORTED_MODULE_2__.debounce)(() => {
    if (batchedEntries.length > 0) {
      (0,_utils_visibilityTracker_js__WEBPACK_IMPORTED_MODULE_1__.processIntersectionEntries)([...batchedEntries]);
      batchedEntries.length = 0;
    }
  }, _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.INTERSECTION_OBSERVER_CONFIG.BATCH_DELAY);

  const observer = new IntersectionObserver((entries) => {
    batchedEntries.push(...entries);
    debouncedProcessEntries();
  }, options);

  (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_3__.logDebug)('IntersectionObserver created with options:', options);
  return observer;
}

/**
 * Start observing video containers
 * @param {Array<Element>} containers - Optional specific containers to observe
 */
function observeVideoContainers(containers = null) {
  if (!intersectionObserver) {
    (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_3__.logDebug)('No IntersectionObserver instance available');
    return;
  }

  const elementsToObserve = containers || (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_4__.cachedDocumentQuery)(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.SELECTOR_STRINGS.VIDEO_CONTAINERS);

  elementsToObserve.forEach(element => {
    try {
      intersectionObserver.observe(element);
    } catch (error) {
      (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_3__.logDebug)('Failed to observe element:', error);
    }
  });

  (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_3__.logDebug)(`Observing ${elementsToObserve.length} video containers`);
}

/**
 * Stop observing specific elements
 * @param {Array<Element>} elements
 */
function unobserveVideoContainers(elements) {
  if (!intersectionObserver) return;

  elements.forEach(element => {
    try {
      intersectionObserver.unobserve(element);
    } catch (error) {
      (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_3__.logDebug)('Failed to unobserve element:', error);
    }
  });
}

/**
 * Setup IntersectionObserver for the page
 * Initial observation of all video containers
 */
function setupIntersectionObserver() {
  if (!_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.INTERSECTION_OBSERVER_CONFIG.ENABLE_LAZY_PROCESSING) {
    (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_3__.logDebug)('Lazy processing disabled, skipping IntersectionObserver setup');
    return null;
  }

  // Clear existing observer if any
  disconnectIntersectionObserver();

  // Create new observer
  intersectionObserver = createIntersectionObserver();

  // Observe initial containers
  observeVideoContainers();

  return intersectionObserver;
}

/**
 * Disconnect and cleanup IntersectionObserver
 */
function disconnectIntersectionObserver() {
  if (intersectionObserver) {
    intersectionObserver.disconnect();
    intersectionObserver = null;
    (0,_utils_visibilityTracker_js__WEBPACK_IMPORTED_MODULE_1__.clearVisibilityTracking)();
    (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_3__.logDebug)('IntersectionObserver disconnected');
  }

  // Clear pending batched entries to prevent memory leaks
  batchedEntries.length = 0;

  // Cancel any pending debounced calls
  if (debouncedProcessEntries && typeof debouncedProcessEntries.cancel === 'function') {
    debouncedProcessEntries.cancel();
  }
  debouncedProcessEntries = null;
}

/**
 * Get current IntersectionObserver instance
 * @returns {IntersectionObserver|null}
 */
function getIntersectionObserver() {
  return intersectionObserver;
}

/**
 * Reconnect observer after page navigation
 */
function reconnectIntersectionObserver() {
  disconnectIntersectionObserver();
  setupIntersectionObserver();
}


/***/ }),

/***/ "./content/observers/mutationObserver.js":
/*!***********************************************!*\
  !*** ./content/observers/mutationObserver.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   setupMutationObserver: () => (/* binding */ setupMutationObserver)
/* harmony export */ });
/* harmony import */ var _utils_debounce_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/debounce.js */ "./content/utils/debounce.js");
/* harmony import */ var _utils_constants_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/constants.js */ "./content/utils/constants.js");
/* harmony import */ var _utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/domCache.js */ "./content/utils/domCache.js");
/* harmony import */ var _intersectionObserver_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./intersectionObserver.js */ "./content/observers/intersectionObserver.js");





function setupMutationObserver(applyHiding) {
  const debouncedApplyHiding = (0,_utils_debounce_js__WEBPACK_IMPORTED_MODULE_0__.debounce)(applyHiding, 250);

  const observer = new MutationObserver((mutations) => {
    let shouldApplyHiding = false;
    let hasVideoContainerChanges = false;
    let hasMajorDOMChanges = false;
    const addedContainers = [];
    const removedContainers = [];

    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
        const target = mutation.target;
        if (target.getAttribute('aria-hidden') === 'true' &&
            target.querySelector(`.${_utils_constants_js__WEBPACK_IMPORTED_MODULE_1__.CSS_CLASSES.EYE_BUTTON}`)) {
          target.removeAttribute('aria-hidden');
        }
      } else if (mutation.type === 'childList') {
        shouldApplyHiding = true;

        // Track removed video containers
        mutation.removedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.invalidateElementCache)(node);

            // Check if removed node is a video container
            const isVideoContainer = node.matches && (
              node.matches('ytd-rich-item-renderer') ||
              node.matches('ytd-video-renderer') ||
              node.matches('ytd-grid-video-renderer') ||
              node.matches('ytd-compact-video-renderer')
            );

            if (isVideoContainer) {
              hasVideoContainerChanges = true;
              removedContainers.push(node);
            }
          }
        });

        // Track added video containers
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const isVideoContainer = node.matches && (
              node.matches('ytd-rich-item-renderer') ||
              node.matches('ytd-video-renderer') ||
              node.matches('ytd-grid-video-renderer') ||
              node.matches('ytd-compact-video-renderer')
            );

            if (isVideoContainer) {
              hasVideoContainerChanges = true;
              addedContainers.push(node);
            }

            // Check for major structural changes (page sections)
            const isMajorStructure = node.matches && (
              node.matches('ytd-browse') ||
              node.matches('ytd-watch-flexy') ||
              node.matches('ytd-search')
            );

            if (isMajorStructure) {
              hasMajorDOMChanges = true;
            }
          }
        });
      }
    });

    // Update IntersectionObserver tracking
    if (addedContainers.length > 0) {
      (0,_intersectionObserver_js__WEBPACK_IMPORTED_MODULE_3__.observeVideoContainers)(addedContainers);
    }
    if (removedContainers.length > 0) {
      (0,_intersectionObserver_js__WEBPACK_IMPORTED_MODULE_3__.unobserveVideoContainers)(removedContainers);
    }

    // Granular cache invalidation based on change type
    if (hasMajorDOMChanges) {
      // Major page structure change - clear all caches
      (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.clearAllCaches)();
    } else if (hasVideoContainerChanges) {
      // Video container changes - only invalidate video-related caches
      (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.invalidateVideoContainerCaches)();
    }

    if (shouldApplyHiding) {
      if (mutations.length === 1 &&
          (mutations[0].target.classList?.contains(_utils_constants_js__WEBPACK_IMPORTED_MODULE_1__.CSS_CLASSES.WATCHED_DIMMED) ||
           mutations[0].target.classList?.contains(_utils_constants_js__WEBPACK_IMPORTED_MODULE_1__.CSS_CLASSES.WATCHED_HIDDEN) ||
           mutations[0].target.classList?.contains(_utils_constants_js__WEBPACK_IMPORTED_MODULE_1__.CSS_CLASSES.SHORTS_DIMMED) ||
           mutations[0].target.classList?.contains(_utils_constants_js__WEBPACK_IMPORTED_MODULE_1__.CSS_CLASSES.SHORTS_HIDDEN))) {
        return;
      }
      debouncedApplyHiding();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-hidden']
  });

  // Log cache stats periodically in debug mode
  if (_utils_constants_js__WEBPACK_IMPORTED_MODULE_1__.DEBUG) {
    setInterval(() => {
      (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_2__.logCacheStats)();
    }, _utils_constants_js__WEBPACK_IMPORTED_MODULE_1__.CACHE_CONFIG.STATS_LOG_INTERVAL);
  }

  return observer;
}


/***/ }),

/***/ "./content/observers/urlObserver.js":
/*!******************************************!*\
  !*** ./content/observers/urlObserver.js ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   setupUrlObserver: () => (/* binding */ setupUrlObserver)
/* harmony export */ });
/* harmony import */ var _utils_debounce_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/debounce.js */ "./content/utils/debounce.js");
/* harmony import */ var _utils_domCache_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/domCache.js */ "./content/utils/domCache.js");
/* harmony import */ var _utils_constants_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/constants.js */ "./content/utils/constants.js");
/* harmony import */ var _intersectionObserver_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./intersectionObserver.js */ "./content/observers/intersectionObserver.js");
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/logger.js */ "./content/utils/logger.js");






function setupUrlObserver(applyHiding) {
  const debouncedApplyHiding = (0,_utils_debounce_js__WEBPACK_IMPORTED_MODULE_0__.debounce)(applyHiding, 100);

  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      if (_utils_constants_js__WEBPACK_IMPORTED_MODULE_2__.DEBUG) {
        (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_4__.debug)('[YT-HWV] URL changed, clearing DOM cache and reconnecting IntersectionObserver');
        (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_1__.logCacheStats)();
      }

      (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_1__.clearAllCaches)();
      (0,_intersectionObserver_js__WEBPACK_IMPORTED_MODULE_3__.reconnectIntersectionObserver)();
      lastUrl = url;
      setTimeout(debouncedApplyHiding, 100);
    }
  });

  observer.observe(document, {
    subtree: true,
    childList: true
  });

  return observer;
}


/***/ }),

/***/ "./content/observers/xhrObserver.js":
/*!******************************************!*\
  !*** ./content/observers/xhrObserver.js ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   setupXhrObserver: () => (/* binding */ setupXhrObserver)
/* harmony export */ });
/* harmony import */ var _utils_debounce_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/debounce.js */ "./content/utils/debounce.js");


function setupXhrObserver(applyHiding) {
  const debouncedApplyHiding = (0,_utils_debounce_js__WEBPACK_IMPORTED_MODULE_0__.debounce)(applyHiding, 100);

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


/***/ }),

/***/ "./content/storage/cache.js":
/*!**********************************!*\
  !*** ./content/storage/cache.js ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   applyCacheUpdate: () => (/* binding */ applyCacheUpdate),
/* harmony export */   clearCache: () => (/* binding */ clearCache),
/* harmony export */   clearPendingRequests: () => (/* binding */ clearPendingRequests),
/* harmony export */   deletePendingRequest: () => (/* binding */ deletePendingRequest),
/* harmony export */   getCacheMemoryUsage: () => (/* binding */ getCacheMemoryUsage),
/* harmony export */   getCacheSize: () => (/* binding */ getCacheSize),
/* harmony export */   getCachedHiddenVideo: () => (/* binding */ getCachedHiddenVideo),
/* harmony export */   getPendingRequest: () => (/* binding */ getPendingRequest),
/* harmony export */   getRecordTimestamp: () => (/* binding */ getRecordTimestamp),
/* harmony export */   hasCachedVideo: () => (/* binding */ hasCachedVideo),
/* harmony export */   hasPendingRequest: () => (/* binding */ hasPendingRequest),
/* harmony export */   mergeFetchedRecord: () => (/* binding */ mergeFetchedRecord),
/* harmony export */   repairCacheConsistency: () => (/* binding */ repairCacheConsistency),
/* harmony export */   setPendingRequest: () => (/* binding */ setPendingRequest),
/* harmony export */   validateCacheConsistency: () => (/* binding */ validateCacheConsistency)
/* harmony export */ });
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/logger.js */ "./content/utils/logger.js");


const MAX_CACHE_SIZE = 1000;

const hiddenVideoCache = new Map();
const hiddenVideoTimestamps = new Map();
const cacheAccessOrder = new Map(); // videoId -> lastAccessTime
const pendingHiddenVideoRequests = new Map();

// Flag to prevent concurrent eviction operations
let isEvicting = false;

function getRecordTimestamp(record) {
  return record && Number.isFinite(record.updatedAt) ? record.updatedAt : -1;
}

/**
 * Evicts least recently used entries when cache exceeds MAX_CACHE_SIZE
 * Uses synchronization to prevent race conditions and ensure cache consistency
 */
function evictLRUEntries() {
  // Early exit if cache is within limits
  if (hiddenVideoCache.size <= MAX_CACHE_SIZE) return;

  // Prevent concurrent eviction operations
  if (isEvicting) return;

  try {
    isEvicting = true;

    // Re-check size after acquiring lock (might have changed)
    if (hiddenVideoCache.size <= MAX_CACHE_SIZE) return;

    // Create snapshot of entries to evict (oldest first)
    const entries = Array.from(cacheAccessOrder.entries())
      .sort((a, b) => a[1] - b[1]); // Sort by access time (oldest first)

    const numToEvict = hiddenVideoCache.size - MAX_CACHE_SIZE;
    const toEvict = entries.slice(0, numToEvict);

    // Batch delete: collect IDs first, then delete atomically
    // This minimizes the window for inconsistency
    const videoIdsToEvict = toEvict.map(([videoId]) => videoId);

    // Delete from all Maps in a single pass to maintain consistency
    videoIdsToEvict.forEach((videoId) => {
      hiddenVideoCache.delete(videoId);
      hiddenVideoTimestamps.delete(videoId);
      cacheAccessOrder.delete(videoId);
    });

    // Validate consistency: all three Maps should have same size
    if (hiddenVideoCache.size !== hiddenVideoTimestamps.size) {
      (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_0__.error)('[Cache] Inconsistency detected: hiddenVideoCache size', hiddenVideoCache.size,
            'vs hiddenVideoTimestamps size', hiddenVideoTimestamps.size);
    }
  } finally {
    // Always release lock, even if error occurs
    isEvicting = false;
  }
}

function applyCacheUpdate(videoId, record) {
  if (!videoId) return;
  if (record) {
    const timestamp = getRecordTimestamp(record);
    hiddenVideoCache.set(videoId, record);
    hiddenVideoTimestamps.set(videoId, timestamp === -1 ? Date.now() : timestamp);
    cacheAccessOrder.set(videoId, Date.now());
    evictLRUEntries();
    return;
  }
  hiddenVideoCache.delete(videoId);
  hiddenVideoTimestamps.set(videoId, Date.now());
  cacheAccessOrder.delete(videoId);
}

function mergeFetchedRecord(videoId, record) {
  if (!videoId) return;
  const incomingTimestamp = getRecordTimestamp(record);
  if (hiddenVideoTimestamps.has(videoId)) {
    const currentTimestamp = hiddenVideoTimestamps.get(videoId);
    if (incomingTimestamp <= currentTimestamp) {
      // Update access time even if not updating record
      cacheAccessOrder.set(videoId, Date.now());
      return;
    }
  }
  if (record) {
    hiddenVideoCache.set(videoId, record);
    hiddenVideoTimestamps.set(videoId, incomingTimestamp === -1 ? Date.now() : incomingTimestamp);
    cacheAccessOrder.set(videoId, Date.now());
    evictLRUEntries();
    return;
  }
  hiddenVideoCache.delete(videoId);
  cacheAccessOrder.delete(videoId);
}

/**
 * Gets a cached hidden video record and updates access tracking
 * @param {string} videoId - Video identifier
 * @returns {Object|null} - Cached record or null
 */
function getCachedHiddenVideo(videoId) {
  if (!videoId) return null;
  const record = hiddenVideoCache.get(videoId);

  // MEMORY LEAK PREVENTION: Only update access time for cache hits
  // This ensures cacheAccessOrder Map only tracks videos that exist in hiddenVideoCache
  // Cache misses (when record is undefined) should NOT populate cacheAccessOrder
  // This prevents orphaned entries in cacheAccessOrder that would never be evicted
  if (record) {
    cacheAccessOrder.set(videoId, Date.now());
  }

  return record || null;
}

function clearCache() {
  // Reset eviction flag to prevent deadlock
  isEvicting = false;

  hiddenVideoCache.clear();
  hiddenVideoTimestamps.clear();
  cacheAccessOrder.clear();
}

function hasPendingRequest(videoId) {
  return pendingHiddenVideoRequests.has(videoId);
}

function getPendingRequest(videoId) {
  return pendingHiddenVideoRequests.get(videoId);
}

function setPendingRequest(videoId, promise) {
  pendingHiddenVideoRequests.set(videoId, promise);
}

function deletePendingRequest(videoId) {
  pendingHiddenVideoRequests.delete(videoId);
}

/**
 * Clears all pending requests (useful for navigation events)
 */
function clearPendingRequests() {
  pendingHiddenVideoRequests.clear();
}

function hasCachedVideo(videoId) {
  return hiddenVideoCache.has(videoId);
}

/**
 * Gets current cache size for monitoring
 * @returns {number} - Number of entries in cache
 */
function getCacheSize() {
  return hiddenVideoCache.size;
}

/**
 * Gets estimated cache memory usage in bytes
 * @returns {number} - Estimated memory usage
 */
function getCacheMemoryUsage() {
  let estimatedSize = 0;
  hiddenVideoCache.forEach((record, videoId) => {
    // Estimate: videoId (11 chars * 2 bytes) + record (state, title, updatedAt)
    estimatedSize += videoId.length * 2;
    if (record) {
      estimatedSize += (record.title?.length || 0) * 2;
      estimatedSize += 32; // Approximate overhead for state + updatedAt + object structure
    }
  });
  return estimatedSize;
}

/**
 * Validates cache consistency between all Map structures
 * @returns {Object} - Validation result with status and details
 */
function validateCacheConsistency() {
  const issues = [];

  // Check size consistency
  if (hiddenVideoCache.size !== hiddenVideoTimestamps.size) {
    issues.push({
      type: 'size_mismatch',
      message: `hiddenVideoCache size (${hiddenVideoCache.size}) !== hiddenVideoTimestamps size (${hiddenVideoTimestamps.size})`
    });
  }

  // Check that all keys in hiddenVideoCache exist in hiddenVideoTimestamps
  for (const videoId of hiddenVideoCache.keys()) {
    if (!hiddenVideoTimestamps.has(videoId)) {
      issues.push({
        type: 'missing_timestamp',
        videoId,
        message: `Video ${videoId} in cache but missing timestamp`
      });
    }
  }

  // Check that all keys in cacheAccessOrder exist in hiddenVideoCache
  for (const videoId of cacheAccessOrder.keys()) {
    if (!hiddenVideoCache.has(videoId) && !hiddenVideoTimestamps.has(videoId)) {
      issues.push({
        type: 'orphaned_access_order',
        videoId,
        message: `Video ${videoId} in access order but not in cache`
      });
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    sizes: {
      cache: hiddenVideoCache.size,
      timestamps: hiddenVideoTimestamps.size,
      accessOrder: cacheAccessOrder.size
    }
  };
}

/**
 * Repairs cache inconsistencies by synchronizing all Map structures
 * @returns {Object} - Repair result with actions taken
 */
function repairCacheConsistency() {
  const actions = [];

  // Remove orphaned entries from hiddenVideoTimestamps
  for (const videoId of hiddenVideoTimestamps.keys()) {
    if (!hiddenVideoCache.has(videoId)) {
      hiddenVideoTimestamps.delete(videoId);
      actions.push({ action: 'removed_orphaned_timestamp', videoId });
    }
  }

  // Remove orphaned entries from cacheAccessOrder
  for (const videoId of cacheAccessOrder.keys()) {
    if (!hiddenVideoCache.has(videoId)) {
      cacheAccessOrder.delete(videoId);
      actions.push({ action: 'removed_orphaned_access_order', videoId });
    }
  }

  // Add missing timestamps for cached videos
  for (const videoId of hiddenVideoCache.keys()) {
    if (!hiddenVideoTimestamps.has(videoId)) {
      hiddenVideoTimestamps.set(videoId, Date.now());
      actions.push({ action: 'added_missing_timestamp', videoId });
    }
  }

  return {
    actionsCount: actions.length,
    actions,
    finalSizes: {
      cache: hiddenVideoCache.size,
      timestamps: hiddenVideoTimestamps.size,
      accessOrder: cacheAccessOrder.size
    }
  };
}


/***/ }),

/***/ "./content/storage/messaging.js":
/*!**************************************!*\
  !*** ./content/storage/messaging.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   clearPendingRequests: () => (/* binding */ clearPendingRequests),
/* harmony export */   fetchHiddenVideoStates: () => (/* binding */ fetchHiddenVideoStates),
/* harmony export */   sendHiddenVideosMessage: () => (/* reexport safe */ _shared_messaging_js__WEBPACK_IMPORTED_MODULE_2__.sendHiddenVideosMessage),
/* harmony export */   setHiddenVideoState: () => (/* binding */ setHiddenVideoState)
/* harmony export */ });
/* harmony import */ var _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/constants.js */ "./content/utils/constants.js");
/* harmony import */ var _cache_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./cache.js */ "./content/storage/cache.js");
/* harmony import */ var _shared_messaging_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../shared/messaging.js */ "./shared/messaging.js");
/* harmony import */ var _shared_errorHandler_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../shared/errorHandler.js */ "./shared/errorHandler.js");
/* harmony import */ var _shared_notifications_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../shared/notifications.js */ "./shared/notifications.js");






// Re-export sendHiddenVideosMessage for backward compatibility


/**
 * Clears all pending requests (useful for navigation events)
 */
function clearPendingRequests() {
  (0,_cache_js__WEBPACK_IMPORTED_MODULE_1__.clearPendingRequests)();
}

async function fetchHiddenVideoStates(videoIds) {
  const ids = Array.isArray(videoIds) ? videoIds.filter(Boolean) : [];
  if (ids.length === 0) return {};

  const unique = Array.from(new Set(ids));
  const result = {};
  const missing = [];
  const waiters = [];

  unique.forEach((videoId) => {
    if ((0,_cache_js__WEBPACK_IMPORTED_MODULE_1__.hasCachedVideo)(videoId)) {
      result[videoId] = (0,_cache_js__WEBPACK_IMPORTED_MODULE_1__.getCachedHiddenVideo)(videoId);
      return;
    }
    if ((0,_cache_js__WEBPACK_IMPORTED_MODULE_1__.hasPendingRequest)(videoId)) {
      waiters.push((0,_cache_js__WEBPACK_IMPORTED_MODULE_1__.getPendingRequest)(videoId).then((record) => {
        result[videoId] = record;
      }).catch(() => {
        // If pending request fails, we'll try to fetch again
        missing.push(videoId);
      }));
      return;
    }
    missing.push(videoId);
  });

  if (missing.length > 0) {
    // Note: We don't set a timeout to delete pending requests because that could
    // cause race conditions if the fetch takes longer than the timeout.
    // The finally block will clean up pending requests when the fetch completes.
    const fetchPromise = (0,_shared_messaging_js__WEBPACK_IMPORTED_MODULE_2__.sendHiddenVideosMessage)(
      _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.HIDDEN_VIDEO_MESSAGES.GET_MANY,
      { ids: missing }
    ).then((response) => {
      const records = response.records || {};
      missing.forEach((videoId) => {
        (0,_cache_js__WEBPACK_IMPORTED_MODULE_1__.mergeFetchedRecord)(videoId, records[videoId] || null);
        result[videoId] = (0,_cache_js__WEBPACK_IMPORTED_MODULE_1__.getCachedHiddenVideo)(videoId);
      });
      return records;
    }).catch((error) => {
      (0,_shared_errorHandler_js__WEBPACK_IMPORTED_MODULE_3__.logError)('ContentMessaging', error, {
        operation: 'fetchHiddenVideoStates',
        videoCount: missing.length
      });

      // Cache null values for failed fetches to prevent repeated failures
      missing.forEach((videoId) => {
        (0,_cache_js__WEBPACK_IMPORTED_MODULE_1__.mergeFetchedRecord)(videoId, null);
        result[videoId] = null;
      });

      throw error;
    }).finally(() => {
      // Clean up pending requests after fetch completes (success or failure)
      missing.forEach((videoId) => (0,_cache_js__WEBPACK_IMPORTED_MODULE_1__.deletePendingRequest)(videoId));
    });

    missing.forEach((videoId) => {
      const promise = fetchPromise
        .then(() => (0,_cache_js__WEBPACK_IMPORTED_MODULE_1__.getCachedHiddenVideo)(videoId))
        .catch(() => null);
      (0,_cache_js__WEBPACK_IMPORTED_MODULE_1__.setPendingRequest)(videoId, promise);
      waiters.push(promise.then((record) => {
        result[videoId] = record;
      }));
    });
  }

  if (waiters.length > 0) {
    // Use Promise.allSettled to not fail on individual errors
    await Promise.allSettled(waiters);
  }

  return result;
}

async function setHiddenVideoState(videoId, state, title) {
  const sanitizedId = videoId ? String(videoId).trim() : '';
  if (!sanitizedId) return null;

  // Optimistic update
  const optimisticRecord = {
    videoId: sanitizedId,
    state,
    title: title || '',
    updatedAt: Date.now()
  };
  (0,_cache_js__WEBPACK_IMPORTED_MODULE_1__.applyCacheUpdate)(sanitizedId, state === 'normal' ? null : optimisticRecord);

  const payload = {
    videoId: sanitizedId,
    state,
    title: title || ''
  };

  try {
    const result = await (0,_shared_messaging_js__WEBPACK_IMPORTED_MODULE_2__.sendHiddenVideosMessage)(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.HIDDEN_VIDEO_MESSAGES.SET_STATE, payload);

    if (result && result.record) {
      (0,_cache_js__WEBPACK_IMPORTED_MODULE_1__.applyCacheUpdate)(sanitizedId, result.record);
      return result.record;
    }

    (0,_cache_js__WEBPACK_IMPORTED_MODULE_1__.applyCacheUpdate)(sanitizedId, null);
    return null;
  } catch (error) {
    (0,_shared_errorHandler_js__WEBPACK_IMPORTED_MODULE_3__.logError)('ContentMessaging', error, {
      operation: 'setHiddenVideoState',
      videoId: sanitizedId,
      state
    });

    // Show user notification for persistent errors (after all retries exhausted)
    const errorType = (0,_shared_errorHandler_js__WEBPACK_IMPORTED_MODULE_3__.classifyError)(error);
    // Check for DOM availability before showing notification
    if (typeof document !== 'undefined' && document.body) {
      const message = errorType === _shared_errorHandler_js__WEBPACK_IMPORTED_MODULE_3__.ErrorType.NETWORK
        ? 'Unable to connect to extension. Please check your connection.'
        : 'Failed to save video state. Please try again.';
      (0,_shared_notifications_js__WEBPACK_IMPORTED_MODULE_4__.showNotification)(message, 'error', 3000);
    }

    // Revert optimistic update on failure
    (0,_cache_js__WEBPACK_IMPORTED_MODULE_1__.applyCacheUpdate)(sanitizedId, null);
    throw error;
  }
}


/***/ }),

/***/ "./content/storage/settings.js":
/*!*************************************!*\
  !*** ./content/storage/settings.js ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getIndividualMode: () => (/* binding */ getIndividualMode),
/* harmony export */   getSettings: () => (/* binding */ getSettings),
/* harmony export */   getShortsState: () => (/* binding */ getShortsState),
/* harmony export */   getThreshold: () => (/* binding */ getThreshold),
/* harmony export */   getWatchedState: () => (/* binding */ getWatchedState),
/* harmony export */   isIndividualModeEnabled: () => (/* binding */ isIndividualModeEnabled),
/* harmony export */   loadSettings: () => (/* binding */ loadSettings)
/* harmony export */ });
/* harmony import */ var _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/constants.js */ "./content/utils/constants.js");
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/logger.js */ "./content/utils/logger.js");



let settings = {
  threshold: 10,
  watchedStates: {},
  shortsStates: {},
  individualMode: 'dimmed',
  individualModeEnabled: true
};

async function loadSettings() {
  const syncResult = await chrome.storage.sync.get(null);
  settings.threshold = syncResult[_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.THRESHOLD] || 10;
  settings.individualMode = syncResult[_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.INDIVIDUAL_MODE] || 'dimmed';
  settings.individualModeEnabled = syncResult[_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.INDIVIDUAL_MODE_ENABLED] !== undefined ?
    syncResult[_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.INDIVIDUAL_MODE_ENABLED] : true;
  const sections = ['misc', 'subscriptions', 'channel', 'watch', 'trending', 'playlist'];
  sections.forEach((section) => {
    settings.watchedStates[section] = syncResult[`${_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.WATCHED_STATE}_${section}`] || 'normal';
    if (section !== 'playlist') {
      settings.shortsStates[section] = syncResult[`${_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.SHORTS_STATE}_${section}`] || 'normal';
    }
  });
  (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logDebug)('Settings loaded');
}

function getSettings() {
  return settings;
}

function getThreshold() {
  return settings.threshold;
}

function getWatchedState(section) {
  return settings.watchedStates[section];
}

function getShortsState(section) {
  return settings.shortsStates[section];
}

function getIndividualMode() {
  return settings.individualMode;
}

function isIndividualModeEnabled() {
  return settings.individualModeEnabled;
}


/***/ }),

/***/ "./content/ui/accessibility.js":
/*!*************************************!*\
  !*** ./content/ui/accessibility.js ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   handleAriaHiddenConflicts: () => (/* binding */ handleAriaHiddenConflicts)
/* harmony export */ });
/* harmony import */ var _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/constants.js */ "./content/utils/constants.js");


function handleAriaHiddenConflicts() {
  const eyeButtons = document.querySelectorAll(`.${_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.EYE_BUTTON}`);
  eyeButtons.forEach(button => {
    const ariaHiddenParent = button.closest('[aria-hidden="true"]');
    if (ariaHiddenParent) {
      ariaHiddenParent.removeAttribute('aria-hidden');
    }
  });
}


/***/ }),

/***/ "./content/ui/eyeButton.js":
/*!*********************************!*\
  !*** ./content/ui/eyeButton.js ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   applyStateToEyeButton: () => (/* binding */ applyStateToEyeButton),
/* harmony export */   createEyeButton: () => (/* binding */ createEyeButton)
/* harmony export */ });
/* harmony import */ var _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/constants.js */ "./content/utils/constants.js");
/* harmony import */ var _storage_cache_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../storage/cache.js */ "./content/storage/cache.js");
/* harmony import */ var _storage_messaging_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../storage/messaging.js */ "./content/storage/messaging.js");
/* harmony import */ var _storage_settings_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../storage/settings.js */ "./content/storage/settings.js");
/* harmony import */ var _utils_dom_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/dom.js */ "./content/utils/dom.js");
/* harmony import */ var _utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../utils/domCache.js */ "./content/utils/domCache.js");
/* harmony import */ var _hiding_individualHiding_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../hiding/individualHiding.js */ "./content/hiding/individualHiding.js");
/* harmony import */ var _shared_errorHandler_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../shared/errorHandler.js */ "./shared/errorHandler.js");









function applyStateToEyeButton(button, state) {
  if (!button) return;
  button.classList.remove('dimmed', 'hidden');
  if (state === 'dimmed') {
    button.classList.add('dimmed');
  } else if (state === 'hidden') {
    button.classList.add('hidden');
  }
}

async function saveHiddenVideo(videoId, state, title = null) {
  if (!videoId) return null;
  return (0,_storage_messaging_js__WEBPACK_IMPORTED_MODULE_2__.setHiddenVideoState)(videoId, state, title || undefined);
}

function createEyeButton(videoContainer, videoId) {
  if (!videoId) return null;
  const button = document.createElement('button');
  button.className = _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.EYE_BUTTON;
  button.setAttribute('data-video-id', videoId);
  button.setAttribute('tabindex', '-1');
  button.setAttribute('aria-label', 'Toggle video visibility');
  const cachedRecord = (0,_storage_cache_js__WEBPACK_IMPORTED_MODULE_1__.getCachedHiddenVideo)(videoId);
  applyStateToEyeButton(button, cachedRecord?.state || 'normal');
  if (!cachedRecord) {
    // Fetch video state and ensure container is synchronized
    // This prevents the eye button from showing correct state while container is not hidden/dimmed
    (0,_storage_messaging_js__WEBPACK_IMPORTED_MODULE_2__.fetchHiddenVideoStates)([videoId]).then(() => {
      const refreshed = (0,_storage_cache_js__WEBPACK_IMPORTED_MODULE_1__.getCachedHiddenVideo)(videoId);
      const state = refreshed?.state || 'normal';
      applyStateToEyeButton(button, state);

      // Find and update container to sync visual state
      const container = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__.cachedClosest)(button, _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.SELECTOR_STRINGS.VIDEO_CONTAINERS);
      if (container) {
        (0,_hiding_individualHiding_js__WEBPACK_IMPORTED_MODULE_6__.syncIndividualContainerState)(container, state);
      }
    }).catch((error) => {
      (0,_shared_errorHandler_js__WEBPACK_IMPORTED_MODULE_7__.logError)('EyeButton', error, {
        operation: 'fetchHiddenVideoStates',
        videoId
      });
    });
  }
  button.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
    </svg>
  `;
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const cached = (0,_storage_cache_js__WEBPACK_IMPORTED_MODULE_1__.getCachedHiddenVideo)(videoId);
    const currentState = cached?.state || 'normal';
    const nextState = currentState === 'normal' ? (0,_storage_settings_js__WEBPACK_IMPORTED_MODULE_3__.getIndividualMode)() : 'normal';

    // Use cached closest
    const container = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_5__.cachedClosest)(button, _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.SELECTOR_STRINGS.VIDEO_CONTAINERS);
    if (container) {
      container.setAttribute('data-ythwv-video-id', videoId);
    }

    const title = (0,_utils_dom_js__WEBPACK_IMPORTED_MODULE_4__.extractTitleFromContainer)(container);
    const record = await saveHiddenVideo(videoId, nextState, title);
    const effectiveState = record ? record.state : 'normal';

    applyStateToEyeButton(button, effectiveState);

    if (container) {
      container.classList.remove(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.INDIVIDUAL_DIMMED, _utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.INDIVIDUAL_HIDDEN);
      if (effectiveState === 'dimmed') {
        container.classList.add(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.INDIVIDUAL_DIMMED);
      } else if (effectiveState === 'hidden') {
        container.classList.add(_utils_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.INDIVIDUAL_HIDDEN);
      }
    }

    // Trigger individual hiding update - will be handled by event handler
    const event = new CustomEvent('yt-hwv-individual-update');
    document.dispatchEvent(event);
  });
  return button;
}


/***/ }),

/***/ "./content/ui/eyeButtonManager.js":
/*!****************************************!*\
  !*** ./content/ui/eyeButtonManager.js ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   addEyeButtons: () => (/* binding */ addEyeButtons)
/* harmony export */ });
/* harmony import */ var _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../shared/constants.js */ "./shared/constants.js");
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/logger.js */ "./content/utils/logger.js");
/* harmony import */ var _storage_cache_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../storage/cache.js */ "./content/storage/cache.js");
/* harmony import */ var _storage_messaging_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../storage/messaging.js */ "./content/storage/messaging.js");
/* harmony import */ var _storage_settings_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../storage/settings.js */ "./content/storage/settings.js");
/* harmony import */ var _utils_dom_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../utils/dom.js */ "./content/utils/dom.js");
/* harmony import */ var _accessibility_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./accessibility.js */ "./content/ui/accessibility.js");
/* harmony import */ var _eyeButton_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./eyeButton.js */ "./content/ui/eyeButton.js");
/* harmony import */ var _utils_domCache_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../utils/domCache.js */ "./content/utils/domCache.js");
/* harmony import */ var _hiding_individualHiding_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../hiding/individualHiding.js */ "./content/hiding/individualHiding.js");
/* harmony import */ var _shared_errorHandler_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../../shared/errorHandler.js */ "./shared/errorHandler.js");












async function saveHiddenVideo(videoId, state, title = null) {
  if (!videoId) return null;
  return (0,_storage_messaging_js__WEBPACK_IMPORTED_MODULE_3__.setHiddenVideoState)(videoId, state, title || undefined);
}

function addEyeButtons() {
  // Check if Individual Mode is enabled
  if (!(0,_storage_settings_js__WEBPACK_IMPORTED_MODULE_4__.isIndividualModeEnabled)()) {
    // Remove existing eye buttons if Individual Mode is disabled
    const existingButtons = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_8__.cachedDocumentQueryWithFallback)(
      'EYE_BUTTON',
      [`.${_shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.EYE_BUTTON}`]
    );
    existingButtons.forEach(button => button.remove());

    const thumbnails = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_8__.cachedDocumentQueryWithFallback)(
      'HAS_EYE_BUTTON',
      [`.${_shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.HAS_EYE_BUTTON}`]
    );
    thumbnails.forEach(thumbnail => thumbnail.classList.remove(_shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.HAS_EYE_BUTTON));

    return;
  }

  // Use fallback chain for thumbnails
  const thumbnails = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_8__.cachedDocumentQueryWithFallback)(
    'THUMBNAILS',
    _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.SELECTOR_CHAINS.THUMBNAILS
  );

  (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logDebug)('Found thumbnails:', thumbnails.length);

  thumbnails.forEach(thumbnail => {
    const existingButton = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_8__.cachedQuerySelector)(thumbnail, `.${_shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.EYE_BUTTON}`);
    if (existingButton) return;

    // Use cached closest/querySelector
    const link = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_8__.cachedClosest)(thumbnail, 'a') || (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_8__.cachedQuerySelector)(thumbnail, 'a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Extract video ID
    let videoId = null;
    const watchMatch = href.match(/\/watch\?v=([^&]+)/);
    const shortsMatch = href.match(/\/shorts\/([^?]+)/);

    if (watchMatch) {
      videoId = watchMatch[1];
    } else if (shortsMatch) {
      videoId = shortsMatch[1];
    }

    if (!videoId) return;

    const eyeButton = (0,_eyeButton_js__WEBPACK_IMPORTED_MODULE_7__.createEyeButton)(null, videoId);
    if (!eyeButton) return;

    thumbnail.style.position = 'relative';
    thumbnail.appendChild(eyeButton);
    thumbnail.classList.add(_shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.HAS_EYE_BUTTON);
    thumbnail.setAttribute('data-ythwv-video-id', videoId);

    // Invalidate THUMBNAILS cache since we modified the DOM
    // This ensures subsequent calls don't get stale cached results
    (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_8__.invalidateDocumentQuery)(/yt-thumbnail.*not.*yt-hwv-has-eye-button/i);

    const parentContainer = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_8__.cachedClosest)(thumbnail, _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.SELECTOR_CHAINS.VIDEO_CONTAINERS.join(', '));
    if (parentContainer) {
      parentContainer.setAttribute('data-ythwv-video-id', videoId);
    }

    // Fetch video state and synchronize container CSS classes
    // This prevents a race condition where the eye button shows correct state
    // but the container is not actually hidden/dimmed after page reload
    (0,_storage_messaging_js__WEBPACK_IMPORTED_MODULE_3__.fetchHiddenVideoStates)([videoId]).then(() => {
      const record = (0,_storage_cache_js__WEBPACK_IMPORTED_MODULE_2__.getCachedHiddenVideo)(videoId);

      // Apply container state immediately after cache update
      // This ensures eye button visual state matches container state
      if (record && parentContainer) {
        (0,_hiding_individualHiding_js__WEBPACK_IMPORTED_MODULE_9__.syncIndividualContainerState)(parentContainer, record.state);
      }

      if (!record || record.title) return;

      const container = (0,_utils_domCache_js__WEBPACK_IMPORTED_MODULE_8__.cachedClosest)(thumbnail, _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.SELECTOR_CHAINS.VIDEO_CONTAINERS.join(', '));
      if (container) {
        container.setAttribute('data-ythwv-video-id', videoId);
      }
      const videoTitle = (0,_utils_dom_js__WEBPACK_IMPORTED_MODULE_5__.extractTitleFromContainer)(container);
      if (videoTitle && videoTitle !== 'Toggle video visibility') {
        saveHiddenVideo(videoId, record.state, videoTitle);
      }
    }).catch((error) => {
      (0,_shared_errorHandler_js__WEBPACK_IMPORTED_MODULE_10__.logError)('EyeButtonManager', error, {
        operation: 'fetchHiddenVideoStates',
        videoId
      });
    });

    (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logDebug)('Added eye button to video:', videoId);
  });

  (0,_accessibility_js__WEBPACK_IMPORTED_MODULE_6__.handleAriaHiddenConflicts)();
}


/***/ }),

/***/ "./content/ui/styles.js":
/*!******************************!*\
  !*** ./content/ui/styles.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   injectStyles: () => (/* binding */ injectStyles)
/* harmony export */ });
function injectStyles() {
  const styleId = 'yt-hwv-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .YT-HWV-WATCHED-HIDDEN { display: none !important }
    .YT-HWV-WATCHED-DIMMED { opacity: 0.3 }
    .YT-HWV-SHORTS-HIDDEN { display: none !important }
    .YT-HWV-SHORTS-DIMMED { opacity: 0.3 }
    .YT-HWV-HIDDEN-ROW-PARENT { padding-bottom: 10px }
    .YT-HWV-INDIVIDUAL-HIDDEN { display: none !important }
    .YT-HWV-INDIVIDUAL-DIMMED { opacity: 0.3 }

    .yt-hwv-eye-button {
      position: absolute !important;
      top: 8px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      z-index: 999 !important;
      background: rgba(0, 0, 0, 0.7) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 6px !important;
      padding: 6px 8px !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
      opacity: 0.3 !important;
    }

    .yt-hwv-eye-button:hover {
      opacity: 1 !important;
      background: rgba(0, 0, 0, 1) !important;
      transform: translateX(-50%) scale(1.1) !important;
      box-shadow: 0 4px 8px rgba(0,0,0,0.7) !important;
    }

    .yt-hwv-eye-button svg {
      width: 20px !important;
      height: 20px !important;
      fill: white !important;
      pointer-events: none !important;
    }

    .yt-hwv-eye-button.hidden svg {
      fill: #ff4444 !important;
    }

    .yt-hwv-eye-button.dimmed svg {
      fill: #ffaa00 !important;
    }

    ytd-thumbnail, yt-thumbnail-view-model, #dismissible, #thumbnail-container {
      position: relative !important;
    }
  `;
  document.head.appendChild(style);

  // Inject notification styles for content script
  injectNotificationStyles();
}

function injectNotificationStyles() {
  const notificationStyleId = 'yt-hwv-notification-styles';
  if (document.getElementById(notificationStyleId)) return;

  const notificationStyle = document.createElement('style');
  notificationStyle.id = notificationStyleId;
  notificationStyle.textContent = `
    .yt-hwv-notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    }

    .yt-hwv-notification {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      background: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
    }

    .yt-hwv-notification.visible {
      opacity: 1;
      transform: translateX(0);
    }

    .yt-hwv-notification.error {
      background: #fee;
      border-left: 4px solid #c00;
      color: #c00;
    }

    .yt-hwv-notification.warning {
      background: #ffc;
      border-left: 4px solid #fa0;
      color: #a60;
    }

    .yt-hwv-notification.success {
      background: #efe;
      border-left: 4px solid #0a0;
      color: #060;
    }

    .yt-hwv-notification.info {
      background: #eef;
      border-left: 4px solid #06c;
      color: #048;
    }

    .notification-icon {
      font-size: 20px;
      font-weight: bold;
    }

    .notification-message {
      flex: 1;
      font-size: 14px;
    }

    .notification-close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      opacity: 0.6;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .notification-close:hover {
      opacity: 1;
    }

    [data-theme="dark"] .yt-hwv-notification {
      background: #333;
      color: #fff;
    }

    [data-theme="dark"] .yt-hwv-notification.error {
      background: #400;
      border-left-color: #f88;
      color: #fcc;
    }

    [data-theme="dark"] .yt-hwv-notification.warning {
      background: #440;
      border-left-color: #fa0;
      color: #ffc;
    }

    [data-theme="dark"] .yt-hwv-notification.success {
      background: #040;
      border-left-color: #0f0;
      color: #cfc;
    }

    [data-theme="dark"] .yt-hwv-notification.info {
      background: #004;
      border-left-color: #09f;
      color: #ccf;
    }
  `;
  document.head.appendChild(notificationStyle);
}


/***/ }),

/***/ "./content/utils/constants.js":
/*!************************************!*\
  !*** ./content/utils/constants.js ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CACHE_CONFIG: () => (/* reexport safe */ _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.CACHE_CONFIG),
/* harmony export */   CSS_CLASSES: () => (/* reexport safe */ _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES),
/* harmony export */   DEBUG: () => (/* reexport safe */ _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.DEBUG),
/* harmony export */   ERROR_CONFIG: () => (/* reexport safe */ _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.ERROR_CONFIG),
/* harmony export */   HIDDEN_VIDEO_MESSAGES: () => (/* reexport safe */ _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.HIDDEN_VIDEO_MESSAGES),
/* harmony export */   INTERSECTION_OBSERVER_CONFIG: () => (/* reexport safe */ _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.INTERSECTION_OBSERVER_CONFIG),
/* harmony export */   SELECTORS: () => (/* reexport safe */ _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.SELECTORS),
/* harmony export */   SELECTOR_STRINGS: () => (/* reexport safe */ _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.SELECTOR_STRINGS),
/* harmony export */   STORAGE_KEYS: () => (/* reexport safe */ _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS)
/* harmony export */ });
/* harmony import */ var _shared_constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../shared/constants.js */ "./shared/constants.js");



/***/ }),

/***/ "./content/utils/cssHelpers.js":
/*!*************************************!*\
  !*** ./content/utils/cssHelpers.js ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   removeClassFromAll: () => (/* binding */ removeClassFromAll),
/* harmony export */   removeClassesFromAll: () => (/* binding */ removeClassesFromAll)
/* harmony export */ });
/**
 * Remove a CSS class from all elements that have it
 */
function removeClassFromAll(className) {
  document.querySelectorAll(`.${className}`).forEach((el) => {
    el.classList.remove(className);
  });
}

/**
 * Remove multiple CSS classes from all elements
 */
function removeClassesFromAll(...classNames) {
  classNames.forEach((className) => {
    removeClassFromAll(className);
  });
}


/***/ }),

/***/ "./content/utils/debounce.js":
/*!***********************************!*\
  !*** ./content/utils/debounce.js ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   debounce: () => (/* binding */ debounce)
/* harmony export */ });
function debounce(func, wait) {
  let timeout;
  const debounced = function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };

  // Add cancel method to clear pending calls
  debounced.cancel = function() {
    clearTimeout(timeout);
    timeout = null;
  };

  return debounced;
}


/***/ }),

/***/ "./content/utils/dom.js":
/*!******************************!*\
  !*** ./content/utils/dom.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   collectVisibleVideoIds: () => (/* binding */ collectVisibleVideoIds),
/* harmony export */   extractTitleFromContainer: () => (/* binding */ extractTitleFromContainer),
/* harmony export */   extractVideoIdFromContainer: () => (/* binding */ extractVideoIdFromContainer),
/* harmony export */   extractVideoIdFromHref: () => (/* binding */ extractVideoIdFromHref),
/* harmony export */   findVideoContainers: () => (/* binding */ findVideoContainers)
/* harmony export */ });
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./constants.js */ "./content/utils/constants.js");
/* harmony import */ var _domCache_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./domCache.js */ "./content/utils/domCache.js");



function extractVideoIdFromHref(href) {
  if (!href) return null;
  const watchMatch = href.match(/\/watch\?v=([^&]+)/);
  if (watchMatch) return watchMatch[1];
  const shortsMatch = href.match(/\/shorts\/([^?]+)/);
  if (shortsMatch) return shortsMatch[1];
  return null;
}

function collectVisibleVideoIds() {
  const ids = new Set();

  (0,_domCache_js__WEBPACK_IMPORTED_MODULE_1__.cachedDocumentQuery)('[data-ythwv-video-id]').forEach((element) => {
    const value = element.getAttribute('data-ythwv-video-id');
    if (value) ids.add(value);
  });

  (0,_domCache_js__WEBPACK_IMPORTED_MODULE_1__.cachedDocumentQuery)('a[href*="/watch?v="], a[href*="/shorts/"]').forEach((link) => {
    const id = extractVideoIdFromHref(link.getAttribute('href'));
    if (id) ids.add(id);
  });

  return Array.from(ids);
}

function findVideoContainers(videoId) {
  const containers = new Set();

  // Use cached document query for eye buttons
  const buttons = (0,_domCache_js__WEBPACK_IMPORTED_MODULE_1__.cachedDocumentQuery)(`.${_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.EYE_BUTTON}[data-video-id="${videoId}"]`);
  buttons.forEach((button) => {
    const container = (0,_domCache_js__WEBPACK_IMPORTED_MODULE_1__.cachedClosest)(button, _constants_js__WEBPACK_IMPORTED_MODULE_0__.SELECTOR_STRINGS.VIDEO_CONTAINERS);
    if (container) containers.add(container);
  });

  // Use cached document query for video links
  const links = (0,_domCache_js__WEBPACK_IMPORTED_MODULE_1__.cachedDocumentQuery)(`a[href*="/watch?v=${videoId}"], a[href*="/shorts/${videoId}"]`);
  links.forEach((link) => {
    const container = (0,_domCache_js__WEBPACK_IMPORTED_MODULE_1__.cachedClosest)(link, _constants_js__WEBPACK_IMPORTED_MODULE_0__.SELECTOR_STRINGS.VIDEO_CONTAINERS);
    if (container) containers.add(container);
  });

  return Array.from(containers);
}

function extractTitleFromContainer(container) {
  if (!container) return '';

  for (const selector of _constants_js__WEBPACK_IMPORTED_MODULE_0__.SELECTORS.TITLE_ELEMENTS) {
    const element = (0,_domCache_js__WEBPACK_IMPORTED_MODULE_1__.cachedQuerySelector)(container, selector);
    if (element && !element.classList.contains(_constants_js__WEBPACK_IMPORTED_MODULE_0__.CSS_CLASSES.EYE_BUTTON)) {
      const text = element.getAttribute('title') || element.getAttribute('aria-label') || element.textContent?.trim() || '';
      if (!text) return '';
      if (text.includes(' - ')) {
        return text.split(' - ')[0];
      }
      if (text.includes(' by ')) {
        return text.split(' by ')[0];
      }
      return text;
    }
  }
  return '';
}

/**
 * Extract video ID from container element
 * @param {Element} container - Video container element
 * @returns {string|null} Video ID or null
 */
function extractVideoIdFromContainer(container) {
  if (!container) return null;

  // Check data attribute first
  const dataId = container.getAttribute('data-ythwv-video-id');
  if (dataId) return dataId;

  // Search for video links
  const link = (0,_domCache_js__WEBPACK_IMPORTED_MODULE_1__.cachedQuerySelector)(
    container,
    'a[href*="/watch?v="], a[href*="/shorts/"]'
  );

  if (link) {
    return extractVideoIdFromHref(link.getAttribute('href'));
  }

  return null;
}


/***/ }),

/***/ "./content/utils/domCache.js":
/*!***********************************!*\
  !*** ./content/utils/domCache.js ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   cachedClosest: () => (/* binding */ cachedClosest),
/* harmony export */   cachedDocumentQuery: () => (/* binding */ cachedDocumentQuery),
/* harmony export */   cachedDocumentQueryWithFallback: () => (/* binding */ cachedDocumentQueryWithFallback),
/* harmony export */   cachedQuerySelector: () => (/* binding */ cachedQuerySelector),
/* harmony export */   cachedQuerySelectorAll: () => (/* binding */ cachedQuerySelectorAll),
/* harmony export */   cachedQuerySelectorWithFallback: () => (/* binding */ cachedQuerySelectorWithFallback),
/* harmony export */   clearAllCaches: () => (/* binding */ clearAllCaches),
/* harmony export */   getCacheStats: () => (/* binding */ getCacheStats),
/* harmony export */   invalidateDocumentQuery: () => (/* binding */ invalidateDocumentQuery),
/* harmony export */   invalidateElementCache: () => (/* binding */ invalidateElementCache),
/* harmony export */   invalidateVideoContainerCaches: () => (/* binding */ invalidateVideoContainerCaches),
/* harmony export */   logCacheStats: () => (/* binding */ logCacheStats),
/* harmony export */   resetCacheStats: () => (/* binding */ resetCacheStats)
/* harmony export */ });
/* harmony import */ var _domSelectorHealth_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./domSelectorHealth.js */ "./content/utils/domSelectorHealth.js");
/* harmony import */ var _utils_constants_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/constants.js */ "./content/utils/constants.js");
/* harmony import */ var _logger_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./logger.js */ "./content/utils/logger.js");




// WeakMap caches for different query types
const elementParentCache = new WeakMap();
const elementChildrenCache = new WeakMap();
const elementSelectorCache = new WeakMap();
const querySelectorAllCache = new Map();

// Performance metrics
const cacheStats = {
  hits: 0,
  misses: 0,
  invalidations: 0
};

// Maximum cache size for document queries (LRU behavior)
const MAX_DOCUMENT_CACHE_SIZE = 100;

/**
 * Cache the result of element.closest(selector)
 * @param {Element} element - The starting element
 * @param {string} selector - The selector to match
 * @returns {Element|null} The matched parent element or null
 */
function cachedClosest(element, selector) {
  if (!element || !selector) return null;

  try {
    // Check cache
    if (!elementParentCache.has(element)) {
      elementParentCache.set(element, new Map());
    }

    const selectorCache = elementParentCache.get(element);

    if (selectorCache.has(selector)) {
      cacheStats.hits++;
      return selectorCache.get(selector);
    }

    // Cache miss - perform query
    cacheStats.misses++;
    const result = element.closest(selector);
    selectorCache.set(selector, result);

    return result;
  } catch (err) {
    // Invalid selector or element - fall back to uncached query
    (0,_logger_js__WEBPACK_IMPORTED_MODULE_2__.warn)('[YT-HWV Cache] Error in cachedClosest:', err);
    try {
      return element.closest(selector);
    } catch (fallbackError) {
      return null;
    }
  }
}

/**
 * Cache the result of element.querySelector(selector)
 * @param {Element} element - The parent element
 * @param {string} selector - The selector to match
 * @returns {Element|null} The matched child element or null
 */
function cachedQuerySelector(element, selector) {
  if (!element || !selector) return null;

  try {
    if (!elementChildrenCache.has(element)) {
      elementChildrenCache.set(element, new Map());
    }

    const selectorCache = elementChildrenCache.get(element);

    if (selectorCache.has(selector)) {
      cacheStats.hits++;
      return selectorCache.get(selector);
    }

    cacheStats.misses++;
    const result = element.querySelector(selector);
    selectorCache.set(selector, result);

    return result;
  } catch (err) {
    // Invalid selector or element - fall back to uncached query
    (0,_logger_js__WEBPACK_IMPORTED_MODULE_2__.warn)('[YT-HWV Cache] Error in cachedQuerySelector:', err);
    try {
      return element.querySelector(selector);
    } catch (fallbackError) {
      return null;
    }
  }
}

/**
 * Cache the result of element.querySelectorAll(selector)
 * Returns array for consistency and easier manipulation
 * @param {Element} element - The parent element
 * @param {string} selector - The selector to match
 * @returns {Array<Element>} Array of matched elements
 */
function cachedQuerySelectorAll(element, selector) {
  if (!element || !selector) return [];

  try {
    if (!elementSelectorCache.has(element)) {
      elementSelectorCache.set(element, new Map());
    }

    const selectorCache = elementSelectorCache.get(element);

    if (selectorCache.has(selector)) {
      cacheStats.hits++;
      return selectorCache.get(selector);
    }

    cacheStats.misses++;
    const result = Array.from(element.querySelectorAll(selector));
    selectorCache.set(selector, result);

    return result;
  } catch (err) {
    // Invalid selector or element - fall back to uncached query
    (0,_logger_js__WEBPACK_IMPORTED_MODULE_2__.warn)('[YT-HWV Cache] Error in cachedQuerySelectorAll:', err);
    try {
      return Array.from(element.querySelectorAll(selector));
    } catch (fallbackError) {
      return [];
    }
  }
}

/**
 * Cache document-level querySelectorAll with TTL
 * Uses Map instead of WeakMap since document is always present
 * @param {string} selector - The selector to match
 * @param {number} ttl - Time to live in milliseconds (default 1000ms)
 * @returns {Array<Element>} Array of matched elements
 */
function cachedDocumentQuery(selector, ttl = 1000) {
  if (!selector) return [];

  try {
    const now = Date.now();

    // Clean up expired entries if cache is getting large
    if (querySelectorAllCache.size > MAX_DOCUMENT_CACHE_SIZE) {
      cleanupExpiredCacheEntries();
    }

    const cached = querySelectorAllCache.get(selector);

    if (cached && (now - cached.timestamp) < ttl) {
      cacheStats.hits++;
      return cached.results;
    }

    cacheStats.misses++;
    const results = Array.from(document.querySelectorAll(selector));
    querySelectorAllCache.set(selector, {
      results,
      timestamp: now
    });

    return results;
  } catch (err) {
    // Invalid selector - fall back to uncached query
    (0,_logger_js__WEBPACK_IMPORTED_MODULE_2__.warn)('[YT-HWV Cache] Error in cachedDocumentQuery:', err);
    try {
      return Array.from(document.querySelectorAll(selector));
    } catch (fallbackError) {
      return [];
    }
  }
}

/**
 * Clean up expired cache entries to prevent unbounded growth
 * @private
 */
function cleanupExpiredCacheEntries() {
  const now = Date.now();
  const entriesToDelete = [];

  // Identify expired entries (using default TTL of 1000ms)
  for (const [selector, entry] of querySelectorAllCache.entries()) {
    if (now - entry.timestamp > 1000) {
      entriesToDelete.push(selector);
    }
  }

  // Delete expired entries
  entriesToDelete.forEach(selector => {
    querySelectorAllCache.delete(selector);
  });
}

/**
 * Invalidate cache for a specific element
 * Called when an element is modified or removed
 * @param {Element} element - The element to invalidate
 */
function invalidateElementCache(element) {
  if (!element) return;

  // Explicitly clear nested Maps before deletion to ensure proper cleanup
  const parentMap = elementParentCache.get(element);
  if (parentMap) {
    parentMap.clear();
  }

  const childrenMap = elementChildrenCache.get(element);
  if (childrenMap) {
    childrenMap.clear();
  }

  const selectorMap = elementSelectorCache.get(element);
  if (selectorMap) {
    selectorMap.clear();
  }

  elementParentCache.delete(element);
  elementChildrenCache.delete(element);
  elementSelectorCache.delete(element);
  cacheStats.invalidations++;
}

/**
 * Invalidate document-level query cache for specific selector or pattern
 * @param {string|RegExp} selectorPattern - The selector to invalidate (string or regex pattern)
 */
function invalidateDocumentQuery(selectorPattern) {
  if (!selectorPattern) {
    querySelectorAllCache.clear();
    cacheStats.invalidations++;
    return;
  }

  if (typeof selectorPattern === 'string') {
    // Exact match
    querySelectorAllCache.delete(selectorPattern);
    cacheStats.invalidations++;
  } else if (selectorPattern instanceof RegExp) {
    // Pattern match - invalidate all matching selectors
    const keysToDelete = [];
    for (const key of querySelectorAllCache.keys()) {
      if (selectorPattern.test(key)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => querySelectorAllCache.delete(key));
    if (keysToDelete.length > 0) {
      cacheStats.invalidations++;
    }
  }
}

/**
 * Invalidate cache entries related to video containers
 * More efficient than clearing all caches
 */
function invalidateVideoContainerCaches() {
  // Invalidate common video-related selectors
  const videoSelectors = [
    /ytd-rich-item-renderer/,
    /ytd-video-renderer/,
    /ytd-grid-video-renderer/,
    /ytd-compact-video-renderer/,
    /yt-thumbnail/,
    /progress.*bar/i,
    /watch\?v=/,
    /shorts\//
  ];

  videoSelectors.forEach(pattern => {
    invalidateDocumentQuery(pattern);
  });
}

/**
 * Clear all caches (called on major DOM changes)
 */
function clearAllCaches() {
  querySelectorAllCache.clear();
  // WeakMaps will be garbage collected automatically
  cacheStats.invalidations++;
}

/**
 * Get cache performance statistics
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
  const total = cacheStats.hits + cacheStats.misses;
  return {
    ...cacheStats,
    hitRate: total > 0 ? ((cacheStats.hits / total) * 100).toFixed(2) : 0,
    totalQueries: total
  };
}

/**
 * Reset cache statistics
 */
function resetCacheStats() {
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.invalidations = 0;
}

/**
 * Log cache statistics (debug mode only)
 */
function logCacheStats() {
  const stats = getCacheStats();
  (0,_logger_js__WEBPACK_IMPORTED_MODULE_2__.debug)('[YT-HWV DOM Cache]', {
    'Hit Rate': `${stats.hitRate}%`,
    'Hits': stats.hits,
    'Misses': stats.misses,
    'Invalidations': stats.invalidations,
    'Total Queries': stats.totalQueries
  });
}

/**
 * Query with fallback selector chain
 * Tries each selector until one succeeds
 * @param {string} selectorKey - Key for health tracking
 * @param {Array<string>} selectors - Array of selectors to try
 * @param {number} ttl - Cache TTL
 * @returns {Array<Element>} Matched elements
 */
function cachedDocumentQueryWithFallback(selectorKey, selectors, ttl = 1000) {
  if (!selectors || selectors.length === 0) {
    (0,_domSelectorHealth_js__WEBPACK_IMPORTED_MODULE_0__.trackSelectorQuery)(selectorKey, null, false, 0);
    return [];
  }

  // Try each selector in order
  for (let i = 0; i < selectors.length; i++) {
    const selector = selectors[i];
    try {
      const results = cachedDocumentQuery(selector, ttl);

      if (results.length > 0) {
        (0,_domSelectorHealth_js__WEBPACK_IMPORTED_MODULE_0__.trackSelectorQuery)(selectorKey, selector, true, results.length);

        // Log if using fallback selector (not the first one)
        if (i > 0 && _utils_constants_js__WEBPACK_IMPORTED_MODULE_1__.DEBUG) {
          (0,_logger_js__WEBPACK_IMPORTED_MODULE_2__.debug)(`[YT-HWV] Using fallback selector #${i} for ${selectorKey}:`, selector);
        }

        return results;
      }
    } catch (err) {
      (0,_logger_js__WEBPACK_IMPORTED_MODULE_2__.warn)(`[YT-HWV] Selector failed: ${selector}`, err);
    }
  }

  // All selectors failed
  (0,_domSelectorHealth_js__WEBPACK_IMPORTED_MODULE_0__.trackSelectorQuery)(selectorKey, selectors[0], false, 0);
  return [];
}

/**
 * Element query with fallback selector chain
 * @param {Element} element - Parent element
 * @param {string} selectorKey - Key for health tracking
 * @param {Array<string>} selectors - Array of selectors to try
 * @returns {Element|null} First matched element
 */
function cachedQuerySelectorWithFallback(element, selectorKey, selectors) {
  if (!element || !selectors || selectors.length === 0) {
    return null;
  }

  for (let i = 0; i < selectors.length; i++) {
    const selector = selectors[i];
    try {
      const result = cachedQuerySelector(element, selector);
      if (result) {
        if (i > 0 && _utils_constants_js__WEBPACK_IMPORTED_MODULE_1__.DEBUG) {
          (0,_logger_js__WEBPACK_IMPORTED_MODULE_2__.debug)(`[YT-HWV] Using fallback selector #${i} for ${selectorKey}:`, selector);
        }
        return result;
      }
    } catch (err) {
      (0,_logger_js__WEBPACK_IMPORTED_MODULE_2__.warn)(`[YT-HWV] Selector failed: ${selector}`, err);
    }
  }

  return null;
}


/***/ }),

/***/ "./content/utils/domErrorDetection.js":
/*!********************************************!*\
  !*** ./content/utils/domErrorDetection.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   setupDOMHealthMonitoring: () => (/* binding */ setupDOMHealthMonitoring),
/* harmony export */   testDOMHealth: () => (/* binding */ testDOMHealth)
/* harmony export */ });
/* harmony import */ var _domSelectorHealth_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./domSelectorHealth.js */ "./content/utils/domSelectorHealth.js");
/* harmony import */ var _shared_notifications_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../shared/notifications.js */ "./shared/notifications.js");
/* harmony import */ var _shared_constants_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../shared/constants.js */ "./shared/constants.js");
/* harmony import */ var _logger_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./logger.js */ "./content/utils/logger.js");





// Track notification timestamps to prevent spam
const lastNotifications = new Map();

/**
 * Setup periodic DOM health monitoring
 */
function setupDOMHealthMonitoring() {
  // Check selector health periodically
  setInterval(() => {
    performHealthCheck();
  }, _shared_constants_js__WEBPACK_IMPORTED_MODULE_2__.SELECTOR_HEALTH_CONFIG.HEALTH_CHECK_INTERVAL);
}

/**
 * Perform health check on critical selectors
 * @private
 */
function performHealthCheck() {
  const unhealthySelectors = (0,_domSelectorHealth_js__WEBPACK_IMPORTED_MODULE_0__.checkCriticalSelectorsHealth)();

  if (unhealthySelectors.length > 0) {
    handleUnhealthySelectors(unhealthySelectors);
  }
}

/**
 * Handle unhealthy selectors by notifying users
 * @private
 * @param {Array} unhealthySelectors - Array of unhealthy selector data
 */
function handleUnhealthySelectors(unhealthySelectors) {
  for (const { key, health } of unhealthySelectors) {
    const lastNotification = lastNotifications.get(key);
    const now = Date.now();

    // Check cooldown
    if (lastNotification && (now - lastNotification) < _shared_constants_js__WEBPACK_IMPORTED_MODULE_2__.SELECTOR_HEALTH_CONFIG.NOTIFICATION_COOLDOWN) {
      continue;
    }

    // Determine severity
    const severity = getSeverity(health.successRate);

    if (severity === 'critical') {
      showCriticalSelectorFailure(key, health);
      lastNotifications.set(key, now);
    } else if (severity === 'warning') {
      showSelectorWarning(key, health);
      lastNotifications.set(key, now);
    }
  }
}

/**
 * Get severity level based on success rate
 * @private
 * @param {number} successRate - Success rate (0-1)
 * @returns {string} Severity level
 */
function getSeverity(successRate) {
  if (successRate < 0.3) return 'critical';
  if (successRate < 0.7) return 'warning';
  return 'ok';
}

/**
 * Show critical selector failure notification
 * @private
 * @param {string} selectorKey - Selector identifier
 * @param {Object} health - Health statistics
 */
function showCriticalSelectorFailure(selectorKey, health) {
  const message = 'YouTube structure changed. Some videos may not be detected. Please report this issue.';

  (0,_logger_js__WEBPACK_IMPORTED_MODULE_3__.error)('[YT-HWV] Critical selector failure:',
    'selector:', selectorKey,
    'successRate:', health.successRate,
    'queries:', health.queries
  );

  (0,_shared_notifications_js__WEBPACK_IMPORTED_MODULE_1__.showNotification)(message, _shared_notifications_js__WEBPACK_IMPORTED_MODULE_1__.NotificationType.ERROR, 8000);
}

/**
 * Show selector warning notification
 * @private
 * @param {string} selectorKey - Selector identifier
 * @param {Object} health - Health statistics
 */
function showSelectorWarning(selectorKey, health) {
  const message = 'Extension may not detect all videos. YouTube might have changed their layout.';

  (0,_logger_js__WEBPACK_IMPORTED_MODULE_3__.warn)('[YT-HWV] Selector degradation:',
    'selector:', selectorKey,
    'successRate:', health.successRate
  );

  (0,_shared_notifications_js__WEBPACK_IMPORTED_MODULE_1__.showNotification)(message, _shared_notifications_js__WEBPACK_IMPORTED_MODULE_1__.NotificationType.WARNING, 5000);
}

/**
 * Manual trigger for testing DOM health
 * @returns {boolean} True if all selectors are healthy
 */
function testDOMHealth() {
  const unhealthySelectors = (0,_domSelectorHealth_js__WEBPACK_IMPORTED_MODULE_0__.checkCriticalSelectorsHealth)();

  if (unhealthySelectors.length === 0) {
    (0,_shared_notifications_js__WEBPACK_IMPORTED_MODULE_1__.showNotification)('All DOM selectors are healthy', _shared_notifications_js__WEBPACK_IMPORTED_MODULE_1__.NotificationType.SUCCESS, 3000);
    return true;
  }

  handleUnhealthySelectors(unhealthySelectors);
  return false;
}

// Expose for debugging
if (typeof window !== 'undefined') {
  window.YTHWV_TestDOMHealth = testDOMHealth;
}


/***/ }),

/***/ "./content/utils/domSelectorHealth.js":
/*!********************************************!*\
  !*** ./content/utils/domSelectorHealth.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   checkCriticalSelectorsHealth: () => (/* binding */ checkCriticalSelectorsHealth),
/* harmony export */   getAllSelectorStats: () => (/* binding */ getAllSelectorStats),
/* harmony export */   getSelectorHealth: () => (/* binding */ getSelectorHealth),
/* harmony export */   resetSelectorStats: () => (/* binding */ resetSelectorStats),
/* harmony export */   trackSelectorQuery: () => (/* binding */ trackSelectorQuery)
/* harmony export */ });
// Track selector usage and success/failure rates
const selectorStats = new Map();

/**
 * Track selector query result for health monitoring
 * @param {string} selectorKey - Key identifying the selector type
 * @param {string} selector - The actual selector string used
 * @param {boolean} success - Whether the query succeeded (found elements)
 * @param {number} elementCount - Number of elements found
 */
function trackSelectorQuery(selectorKey, selector, success, elementCount = 0) {
  if (!selectorStats.has(selectorKey)) {
    selectorStats.set(selectorKey, {
      queries: 0,
      successes: 0,
      failures: 0,
      lastSuccess: null,
      lastFailure: null,
      elementCounts: []
    });
  }

  const stats = selectorStats.get(selectorKey);
  stats.queries++;

  if (success && elementCount > 0) {
    stats.successes++;
    stats.lastSuccess = Date.now();
    stats.elementCounts.push(elementCount);
  } else {
    stats.failures++;
    stats.lastFailure = Date.now();
  }

  // Keep only last 100 counts to prevent unbounded memory growth
  if (stats.elementCounts.length > 100) {
    stats.elementCounts.shift();
  }
}

/**
 * Get health status for a specific selector
 * @param {string} selectorKey - Key identifying the selector type
 * @returns {Object|null} Health statistics or null if no data
 */
function getSelectorHealth(selectorKey) {
  const stats = selectorStats.get(selectorKey);
  if (!stats) return null;

  const successRate = stats.queries > 0 ? (stats.successes / stats.queries) : 0;
  const avgElementCount = stats.elementCounts.length > 0
    ? stats.elementCounts.reduce((a, b) => a + b, 0) / stats.elementCounts.length
    : 0;

  return {
    ...stats,
    successRate,
    avgElementCount,
    isHealthy: successRate > 0.7 && stats.queries >= 10
  };
}

/**
 * Check health of critical selectors
 * @returns {Array} Array of unhealthy selectors with their health data
 */
function checkCriticalSelectorsHealth() {
  const criticalSelectors = [
    'PROGRESS_BAR',
    'VIDEO_CONTAINERS',
    'THUMBNAILS',
    'SHORTS_CONTAINERS'
  ];

  const unhealthySelectors = [];

  for (const key of criticalSelectors) {
    const health = getSelectorHealth(key);
    if (health && !health.isHealthy) {
      unhealthySelectors.push({ key, health });
    }
  }

  return unhealthySelectors;
}

/**
 * Get all selector statistics
 * @returns {Object} Statistics for all selectors
 */
function getAllSelectorStats() {
  const stats = {};
  for (const [key, value] of selectorStats.entries()) {
    stats[key] = getSelectorHealth(key);
  }
  return stats;
}

/**
 * Reset all selector statistics
 */
function resetSelectorStats() {
  selectorStats.clear();
}

// Expose for debugging in browser console
if (typeof window !== 'undefined') {
  window.YTHWV_SelectorHealth = {
    getStats: getAllSelectorStats,
    getHealth: getSelectorHealth,
    checkCritical: checkCriticalSelectorsHealth,
    reset: resetSelectorStats
  };
}


/***/ }),

/***/ "./content/utils/logger.js":
/*!*********************************!*\
  !*** ./content/utils/logger.js ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createLogger: () => (/* binding */ createLogger),
/* harmony export */   debug: () => (/* binding */ debug),
/* harmony export */   error: () => (/* binding */ error),
/* harmony export */   info: () => (/* binding */ info),
/* harmony export */   logDebug: () => (/* binding */ logDebug),
/* harmony export */   warn: () => (/* binding */ warn)
/* harmony export */ });
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./constants.js */ "./content/utils/constants.js");
/**
 * @fileoverview Debug logging utility with build-time stripping for production
 *
 * This module provides logging functions that are automatically removed in production builds.
 * The DEBUG flag is set at build time by webpack DefinePlugin.
 *
 * Usage:
 *   import { debug, error, warn, info } from './utils/logger.js';
 *   debug('[Component]', 'Debug message', data);
 *   error('[Component]', 'Error occurred', errorObj);
 *
 * In production builds:
 * - DEBUG is replaced with false by webpack DefinePlugin
 * - Dead code elimination removes all if (DEBUG) blocks
 * - Terser's drop_console removes any remaining console statements
 */



/**
 * Log debug information (removed in production)
 * @param {...any} args - Arguments to log
 */
function debug(...args) {
  if (_constants_js__WEBPACK_IMPORTED_MODULE_0__.DEBUG) {
    console.log(...args);
  }
}

/**
 * Legacy function for backward compatibility
 * @param {...any} msgs - Messages to log
 * @deprecated Use debug() instead
 */
function logDebug(...msgs) {
  if (_constants_js__WEBPACK_IMPORTED_MODULE_0__.DEBUG) {
    console.log('[YT-HWV]', ...msgs);
  }
}

/**
 * Log error information (removed in production)
 * @param {...any} args - Arguments to log
 */
function error(...args) {
  if (_constants_js__WEBPACK_IMPORTED_MODULE_0__.DEBUG) {
    console.error(...args);
  }
}

/**
 * Log warning information (removed in production)
 * @param {...any} args - Arguments to log
 */
function warn(...args) {
  if (_constants_js__WEBPACK_IMPORTED_MODULE_0__.DEBUG) {
    console.warn(...args);
  }
}

/**
 * Log informational messages (removed in production)
 * @param {...any} args - Arguments to log
 */
function info(...args) {
  if (_constants_js__WEBPACK_IMPORTED_MODULE_0__.DEBUG) {
    console.info(...args);
  }
}

/**
 * Create a namespaced logger for a specific component
 * @param {string} namespace - Component or module name
 * @returns {Object} Logger object with namespaced methods
 */
function createLogger(namespace) {
  const prefix = `[${namespace}]`;

  return {
    debug: (...args) => debug(prefix, ...args),
    error: (...args) => error(prefix, ...args),
    warn: (...args) => warn(prefix, ...args),
    info: (...args) => info(prefix, ...args),
  };
}


/***/ }),

/***/ "./content/utils/visibilityTracker.js":
/*!********************************************!*\
  !*** ./content/utils/visibilityTracker.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   __testing__: () => (/* binding */ __testing__),
/* harmony export */   clearVisibilityTracking: () => (/* binding */ clearVisibilityTracking),
/* harmony export */   getVisibleVideoCount: () => (/* binding */ getVisibleVideoCount),
/* harmony export */   getVisibleVideos: () => (/* binding */ getVisibleVideos),
/* harmony export */   isVideoVisible: () => (/* binding */ isVideoVisible),
/* harmony export */   markHidden: () => (/* binding */ markHidden),
/* harmony export */   markVisible: () => (/* binding */ markVisible),
/* harmony export */   onVisibilityChange: () => (/* binding */ onVisibilityChange),
/* harmony export */   processIntersectionEntries: () => (/* binding */ processIntersectionEntries)
/* harmony export */ });
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./constants.js */ "./content/utils/constants.js");
/* harmony import */ var _logger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./logger.js */ "./content/utils/logger.js");



// Track visibility state of video containers
const visibleVideos = new Set();
const visibilityCallbacks = new Set();

/**
 * Check if element is visible based on intersection ratio
 * @param {IntersectionObserverEntry} entry
 * @returns {boolean}
 */
function isElementVisible(entry) {
  return entry.isIntersecting &&
         entry.intersectionRatio >= _constants_js__WEBPACK_IMPORTED_MODULE_0__.INTERSECTION_OBSERVER_CONFIG.VISIBILITY_THRESHOLD;
}

/**
 * Add callback to be notified when visibility changes
 * @param {Function} callback
 */
function onVisibilityChange(callback) {
  visibilityCallbacks.add(callback);
  return () => visibilityCallbacks.delete(callback);
}

/**
 * Notify all registered callbacks of visibility change
 * @param {Array<Element>} becameVisible
 * @param {Array<Element>} becameHidden
 */
function notifyVisibilityChange(becameVisible, becameHidden) {
  visibilityCallbacks.forEach(callback => {
    try {
      callback({ becameVisible, becameHidden });
    } catch (error) {
      (0,_logger_js__WEBPACK_IMPORTED_MODULE_1__.logDebug)('Error in visibility callback:', error);
    }
  });
}

/**
 * Get all currently visible video containers
 * @returns {Set<Element>}
 */
function getVisibleVideos() {
  return new Set(visibleVideos);
}

/**
 * Check if specific element is currently visible
 * @param {Element} element
 * @returns {boolean}
 */
function isVideoVisible(element) {
  return visibleVideos.has(element);
}

/**
 * Get count of visible videos
 * @returns {number}
 */
function getVisibleVideoCount() {
  return visibleVideos.size;
}

/**
 * Mark element as visible
 * @param {Element} element
 */
function markVisible(element) {
  if (!visibleVideos.has(element)) {
    visibleVideos.add(element);
    return true;
  }
  return false;
}

/**
 * Mark element as hidden
 * @param {Element} element
 */
function markHidden(element) {
  return visibleVideos.delete(element);
}

/**
 * Clear all visibility tracking
 */
function clearVisibilityTracking() {
  visibleVideos.clear();
}

/**
 * Process intersection observer entries
 * @param {Array<IntersectionObserverEntry>} entries
 */
function processIntersectionEntries(entries) {
  // Validate entries parameter
  if (!Array.isArray(entries) || entries.length === 0) {
    return;
  }

  const becameVisible = [];
  const becameHidden = [];

  entries.forEach(entry => {
    const element = entry.target;
    const visible = isElementVisible(entry);

    if (visible && markVisible(element)) {
      becameVisible.push(element);
    } else if (!visible && markHidden(element)) {
      becameHidden.push(element);
    }
  });

  if (becameVisible.length > 0 || becameHidden.length > 0) {
    (0,_logger_js__WEBPACK_IMPORTED_MODULE_1__.logDebug)(`Visibility changed: +${becameVisible.length} visible, -${becameHidden.length} hidden`);
    notifyVisibilityChange(becameVisible, becameHidden);
  }
}

/**
 * Export for testing
 */
const __testing__ = {
  isElementVisible,
  notifyVisibilityChange
};


/***/ }),

/***/ "./shared/constants.js":
/*!*****************************!*\
  !*** ./shared/constants.js ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CACHE_CONFIG: () => (/* binding */ CACHE_CONFIG),
/* harmony export */   CSS_CLASSES: () => (/* binding */ CSS_CLASSES),
/* harmony export */   DEBUG: () => (/* binding */ DEBUG),
/* harmony export */   DEFAULT_SETTINGS: () => (/* binding */ DEFAULT_SETTINGS),
/* harmony export */   ERROR_CONFIG: () => (/* binding */ ERROR_CONFIG),
/* harmony export */   FEATURE_FLAGS: () => (/* binding */ FEATURE_FLAGS),
/* harmony export */   HIDDEN_VIDEO_MESSAGES: () => (/* binding */ HIDDEN_VIDEO_MESSAGES),
/* harmony export */   IMPORT_EXPORT_CONFIG: () => (/* binding */ IMPORT_EXPORT_CONFIG),
/* harmony export */   INDEXEDDB_CONFIG: () => (/* binding */ INDEXEDDB_CONFIG),
/* harmony export */   INTERSECTION_OBSERVER_CONFIG: () => (/* binding */ INTERSECTION_OBSERVER_CONFIG),
/* harmony export */   QUOTA_CONFIG: () => (/* binding */ QUOTA_CONFIG),
/* harmony export */   SELECTORS: () => (/* binding */ SELECTORS),
/* harmony export */   SELECTOR_CHAINS: () => (/* binding */ SELECTOR_CHAINS),
/* harmony export */   SELECTOR_HEALTH_CONFIG: () => (/* binding */ SELECTOR_HEALTH_CONFIG),
/* harmony export */   SELECTOR_STRINGS: () => (/* binding */ SELECTOR_STRINGS),
/* harmony export */   SERVICE_WORKER_CONFIG: () => (/* binding */ SERVICE_WORKER_CONFIG),
/* harmony export */   STORAGE_KEYS: () => (/* binding */ STORAGE_KEYS)
/* harmony export */ });
// Storage Keys
const STORAGE_KEYS = {
  THRESHOLD: 'YTHWV_THRESHOLD',
  WATCHED_STATE: 'YTHWV_STATE',
  SHORTS_STATE: 'YTHWV_STATE_SHORTS',
  HIDDEN_VIDEOS: 'YTHWV_HIDDEN_VIDEOS',
  INDIVIDUAL_MODE: 'YTHWV_INDIVIDUAL_MODE',
  INDIVIDUAL_MODE_ENABLED: 'YTHWV_INDIVIDUAL_MODE_ENABLED',
  THEME: 'YTHWV_THEME'
};

// Hidden Video Message Types
const HIDDEN_VIDEO_MESSAGES = {
  HEALTH_CHECK: 'HIDDEN_VIDEOS_HEALTH_CHECK',
  GET_MANY: 'HIDDEN_VIDEOS_GET_MANY',
  GET_PAGE: 'HIDDEN_VIDEOS_GET_PAGE',
  GET_STATS: 'HIDDEN_VIDEOS_GET_STATS',
  SET_STATE: 'HIDDEN_VIDEOS_SET_STATE',
  CLEAR_ALL: 'HIDDEN_VIDEOS_CLEAR_ALL',
  EXPORT_ALL: 'HIDDEN_VIDEOS_EXPORT_ALL',
  IMPORT_RECORDS: 'HIDDEN_VIDEOS_IMPORT_RECORDS',
  VALIDATE_IMPORT: 'HIDDEN_VIDEOS_VALIDATE_IMPORT'
};

// Default Settings
const DEFAULT_SETTINGS = {
  threshold: 10,
  theme: 'auto',
  individualMode: 'dimmed',
  individualModeEnabled: true,
  states: {
    watched: {
      misc: 'normal',
      subscriptions: 'normal',
      channel: 'normal',
      watch: 'normal',
      trending: 'normal',
      playlist: 'normal'
    },
    shorts: {
      misc: 'normal',
      subscriptions: 'normal',
      channel: 'normal',
      watch: 'normal',
      trending: 'normal'
    }
  }
};

// CSS Classes (content script specific, but defined here for completeness)
const CSS_CLASSES = {
  WATCHED_HIDDEN: 'YT-HWV-WATCHED-HIDDEN',
  WATCHED_DIMMED: 'YT-HWV-WATCHED-DIMMED',
  SHORTS_HIDDEN: 'YT-HWV-SHORTS-HIDDEN',
  SHORTS_DIMMED: 'YT-HWV-SHORTS-DIMMED',
  HIDDEN_ROW_PARENT: 'YT-HWV-HIDDEN-ROW-PARENT',
  INDIVIDUAL_HIDDEN: 'YT-HWV-INDIVIDUAL-HIDDEN',
  INDIVIDUAL_DIMMED: 'YT-HWV-INDIVIDUAL-DIMMED',
  EYE_BUTTON: 'yt-hwv-eye-button',
  HAS_EYE_BUTTON: 'yt-hwv-has-eye-button'
};

// Selectors (content script specific)
const SELECTORS = {
  PROGRESS_BAR: [
    '.ytd-thumbnail-overlay-resume-playback-renderer',
    '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment',
    '.ytp-progress-bar-played'
  ],
  SHORTS_CONTAINERS: [
    'ytd-reel-shelf-renderer',
    'ytd-rich-shelf-renderer[is-shorts]',
    'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
    'ytm-shorts-lockup-view-model-v2',
    'ytm-shorts-lockup-view-model',
    'ytd-rich-item-renderer:has(.shortsLockupViewModelHost)',
    'ytd-rich-item-renderer:has(a[href^="/shorts/"])',
    '.ytd-rich-shelf-renderer:has(a.reel-item-endpoint)',
    'ytd-video-renderer:has(.ytd-thumbnail-overlay-time-status-renderer[aria-label="Shorts"])',
    'ytd-compact-video-renderer:has(a[href^="/shorts/"])',
    'ytd-grid-video-renderer:has(a[href^="/shorts/"])'
  ],
  THUMBNAILS: [
    'yt-thumbnail-view-model:not(.yt-hwv-has-eye-button)',
    'ytd-thumbnail:not(.yt-hwv-has-eye-button)'
  ],
  VIDEO_CONTAINERS: [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-compact-video-renderer',
    'yt-lockup-view-model',
    'ytm-shorts-lockup-view-model'
  ],
  TITLE_ELEMENTS: [
    '#video-title',
    '#video-title-link',
    'a#video-title',
    'h3.title',
    'h3 a',
    'h4 a',
    '.title-and-badge a',
    'ytm-shorts-lockup-view-model-v2 .shortsLockupViewModelHostTextContent',
    'yt-formatted-string#video-title',
    'span#video-title'
  ]
};

// Error handling configuration
const ERROR_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  INITIAL_RETRY_DELAY: 100,
  MAX_RETRY_DELAY: 5000,
  MESSAGE_TIMEOUT: 5000,
  MAX_ERROR_LOG_SIZE: 100
};

// Background service worker configuration
// NOTE: Chrome's alarms API enforces a MINIMUM periodInMinutes of 1 minute for both
// packed and unpacked extensions. Values below 1 minute are rounded UP to 1 minute.
// This means we cannot ping more frequently than once per minute using chrome.alarms.
//
// Chrome suspends service workers after ~30 seconds of inactivity, so with a 1-minute
// alarm interval, the worker WILL be suspended between pings. This is acceptable because:
// - All critical data is persisted in IndexedDB (survives suspensions)
// - Message listeners are automatically re-registered on wake-up
// - The worker can restart quickly when needed (< 100ms typically)
//
// For more aggressive keep-alive, we would need long-lived connections from content
// scripts, but that adds complexity and battery drain. The current approach balances
// performance with resource efficiency.
const SERVICE_WORKER_CONFIG = {
  KEEP_ALIVE_INTERVAL: 60000 // 1 minute - Chrome's enforced minimum for chrome.alarms
};

// Pre-computed selector strings for performance
const SELECTOR_STRINGS = {
  VIDEO_CONTAINERS: SELECTORS.VIDEO_CONTAINERS.join(', '),
  THUMBNAILS: SELECTORS.THUMBNAILS.join(', '),
  SHORTS_CONTAINERS: SELECTORS.SHORTS_CONTAINERS.join(', ')
};

// Debug flag - replaced at build time by webpack DefinePlugin
// In development: true, In production: false
// DO NOT hardcode this value - it must be set by the build system
const DEBUG =  true ? true : 0;

// DOM Cache Configuration
const CACHE_CONFIG = {
  DOCUMENT_QUERY_TTL: 1000,        // 1 second TTL for document queries
  PROGRESS_BAR_TTL: 500,           // 500ms for progress bars (update frequently)
  STATS_LOG_INTERVAL: 30000,       // Log stats every 30 seconds in debug mode
  ENABLE_PERFORMANCE_MONITORING: true
};

// IntersectionObserver Configuration
// Note: These values are validated to ensure proper observer behavior
// - ROOT_MARGIN: 100px provides smooth pre-loading before viewport entry
// - THRESHOLD: Multiple points track granular visibility changes
// - VISIBILITY_THRESHOLD: 25% visibility balances accuracy with performance
// - BATCH_DELAY: 100ms reduces callback frequency during rapid scrolling
const INTERSECTION_OBSERVER_CONFIG = (function() {
  const config = {
    ROOT_MARGIN: '100px',
    THRESHOLD: [0, 0.25, 0.5],
    VISIBILITY_THRESHOLD: 0.25,
    BATCH_DELAY: 100,
    ENABLE_LAZY_PROCESSING: true
  };

  // Validate configuration values
  if (!Array.isArray(config.THRESHOLD) || config.THRESHOLD.length === 0) {
    console.error('[YT-HWV] Invalid THRESHOLD config, using defaults');
    config.THRESHOLD = [0, 0.25, 0.5];
  }

  // Validate threshold values are between 0 and 1
  config.THRESHOLD = config.THRESHOLD.filter(t => typeof t === 'number' && t >= 0 && t <= 1);

  if (typeof config.VISIBILITY_THRESHOLD !== 'number' ||
      config.VISIBILITY_THRESHOLD < 0 ||
      config.VISIBILITY_THRESHOLD > 1) {
    console.error('[YT-HWV] Invalid VISIBILITY_THRESHOLD config, using default 0.25');
    config.VISIBILITY_THRESHOLD = 0.25;
  }

  if (typeof config.BATCH_DELAY !== 'number' || config.BATCH_DELAY < 0) {
    console.error('[YT-HWV] Invalid BATCH_DELAY config, using default 100ms');
    config.BATCH_DELAY = 100;
  }

  return config;
})();

// IndexedDB Optimization Configuration
const INDEXEDDB_CONFIG = {
  // Cache settings
  CONTENT_CACHE_MAX_SIZE: 1000,
  BACKGROUND_CACHE_TTL: 30000, // 30 seconds

  // Write batching
  WRITE_BATCH_DELAY: 100, // milliseconds
  WRITE_BATCH_MAX_SIZE: 50,

  // Query optimization
  GET_CURSOR_THRESHOLD: 50, // Use cursor for 50+ IDs
  STATS_CURSOR_THRESHOLD: 100, // Use cursor for 100+ records

  // Pagination
  ENABLE_PREFETCH: false, // Disabled by default (Phase 6)
  PREFETCH_DELAY: 100,

  // Broadcast
  BROADCAST_DEBOUNCE: 100,

  // Timeout settings
  OPERATION_TIMEOUT: 30000, // 30 seconds - timeout for individual operations
  CURSOR_TIMEOUT: 60000, // 60 seconds - timeout for cursor operations (can be longer)
  DB_OPEN_TIMEOUT: 10000, // 10 seconds - timeout for opening database
  RESET_TIMEOUT: 30000 // 30 seconds - timeout for database reset
};

// Feature flags for IndexedDB optimizations
const FEATURE_FLAGS = {
  ENABLE_WRITE_BATCHING: false, // Disabled by default - needs testing
  ENABLE_BACKGROUND_CACHE: true,
  ENABLE_LRU_EVICTION: true,
  ENABLE_CURSOR_OPTIMIZATION: true,
  ENABLE_STATS_OPTIMIZATION: true,
  ENABLE_PAGINATION_PREFETCH: false, // Phase 6
  ENABLE_BROADCAST_BATCHING: false // Phase 6
};

// Import/Export Configuration
const IMPORT_EXPORT_CONFIG = {
  FORMAT_VERSION: 1,
  MAX_IMPORT_SIZE_MB: 50,
  MAX_IMPORT_RECORDS: 200000,
  IMPORT_BATCH_SIZE: 500,
  CONFLICT_STRATEGIES: {
    SKIP: 'skip',           // Skip existing records
    OVERWRITE: 'overwrite', // Overwrite with imported data
    MERGE: 'merge'          // Keep newer timestamp
  }
};

// Quota Management Configuration
const QUOTA_CONFIG = {
  // Estimate record size (bytes) - typical video record with metadata
  ESTIMATED_RECORD_SIZE: 200,

  // Safety margin for cleanup (delete 20% more than estimated need)
  CLEANUP_SAFETY_MARGIN: 1.2,

  // Minimum records to delete (avoid too frequent cleanups)
  MIN_CLEANUP_COUNT: 100,

  // Maximum records to delete in one cleanup (prevent excessive deletions)
  MAX_CLEANUP_COUNT: 5000,

  // Maximum records to store in fallback storage
  MAX_FALLBACK_RECORDS: 1000,

  // Notification cooldown (5 minutes)
  NOTIFICATION_COOLDOWN_MS: 5 * 60 * 1000,

  // Maximum quota events to log
  MAX_QUOTA_EVENTS: 50,

  // Maximum retry attempts for quota exceeded operations
  MAX_RETRY_ATTEMPTS: 3,

  // Enable fallback storage for critical operations
  ENABLE_FALLBACK_STORAGE: true,

  // Enable user notifications for quota events
  ENABLE_QUOTA_NOTIFICATIONS: true
};

// Selector Fallback Chains
// Primary selectors listed first, fallbacks in order of preference
const SELECTOR_CHAINS = {
  VIDEO_TITLE: [
    '#video-title',
    '#video-title-link',
    'a#video-title',
    'h3.title a',
    'h3 a',
    'h4 a',
    '.title-and-badge a',
    'yt-formatted-string#video-title',
    'span#video-title',
    // Fallback to any link in container
    'a[href*="/watch?v="]',
    'a[href*="/shorts/"]'
  ],

  PROGRESS_BAR: [
    // Modern selectors
    '.ytd-thumbnail-overlay-resume-playback-renderer',
    '.yt-thumbnail-overlay-resume-playback-renderer-wiz__progress-bar',
    '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment',
    // Legacy selectors
    '.ytp-progress-bar-played',
    'yt-thumbnail-overlay-resume-playback-renderer',
    '.ytm-thumbnail-overlay-resume-playback-renderer',
    // Generic fallbacks
    '[class*="progress"][class*="bar"]',
    '[class*="watched"]'
  ],

  VIDEO_THUMBNAIL: [
    'yt-thumbnail-view-model',
    'ytd-thumbnail',
    '.ytThumbnailViewModelImage',
    'img.yt-core-image',
    // Generic fallbacks
    '[class*="thumbnail"]'
  ],

  VIDEO_LINK: [
    'a[href*="/watch?v="]',
    'a[href^="/watch?"]',
    'a[href*="&v="]',
    'a.ytd-thumbnail',
    'a.yt-simple-endpoint'
  ],

  SHORTS_LINK: [
    'a[href*="/shorts/"]',
    'a[href^="/shorts/"]',
    'a.reel-item-endpoint',
    '.shortsLockupViewModelHost a'
  ],

  VIDEO_CONTAINERS: [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-compact-video-renderer',
    'yt-lockup-view-model',
    'ytm-shorts-lockup-view-model'
  ],

  THUMBNAILS: [
    'yt-thumbnail-view-model:not(.yt-hwv-has-eye-button)',
    'ytd-thumbnail:not(.yt-hwv-has-eye-button)'
  ]
};

// Critical selector health thresholds
// These values define when the extension detects that YouTube's DOM structure has changed
const SELECTOR_HEALTH_CONFIG = {
  // 70% success rate minimum - Below this, selectors are considered unhealthy
  // This threshold allows for transient failures while catching structural changes
  CRITICAL_SUCCESS_RATE: 0.7,

  // Minimum 10 queries before health assessment - Prevents false positives during initial load
  // Statistical significance requires multiple samples before making health determinations
  MIN_QUERIES_FOR_HEALTH: 10,

  // Check selector health every 30 seconds (30000ms)
  // Balances responsiveness to DOM changes with performance overhead
  HEALTH_CHECK_INTERVAL: 30000,

  // 5 minute cooldown between notifications (300000ms)
  // Prevents notification spam while keeping users informed of persistent issues
  NOTIFICATION_COOLDOWN: 300000,

  // Show notification after 5 consecutive failures (currently unused - reserved for future use)
  // Would trigger alerts only after sustained failure pattern is established
  FAILURE_NOTIFICATION_THRESHOLD: 5
};


/***/ }),

/***/ "./shared/errorHandler.js":
/*!********************************!*\
  !*** ./shared/errorHandler.js ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ErrorType: () => (/* binding */ ErrorType),
/* harmony export */   classifyError: () => (/* binding */ classifyError),
/* harmony export */   clearErrorLog: () => (/* binding */ clearErrorLog),
/* harmony export */   getErrorLog: () => (/* binding */ getErrorLog),
/* harmony export */   logError: () => (/* binding */ logError),
/* harmony export */   retryOperation: () => (/* binding */ retryOperation)
/* harmony export */ });
/* harmony import */ var _logger_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./logger.js */ "./shared/logger.js");


// Error categories
const ErrorType = {
  TRANSIENT: 'transient',      // Retry automatically
  TIMEOUT: 'timeout',           // Operation timeout - may be retryable
  QUOTA_EXCEEDED: 'quota',      // Special handling needed
  PERMISSION: 'permission',     // User action required
  CORRUPTION: 'corruption',     // Data recovery needed
  NETWORK: 'network',           // Connectivity issue
  PERMANENT: 'permanent'        // No recovery possible
};

// Classify errors
function classifyError(error) {
  if (!error) return ErrorType.PERMANENT;

  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';

  // Timeout errors - check flag first, then name and message
  if (error.timeout === true ||
      name === 'timeouterror' ||
      (message.includes('timeout') && message.includes('operation'))) {
    return ErrorType.TIMEOUT;
  }

  // IndexedDB quota errors
  if (message.includes('quota') || name.includes('quotaexceedederror')) {
    return ErrorType.QUOTA_EXCEEDED;
  }

  // Transient errors
  if (message.includes('transaction') ||
      message.includes('aborted') ||
      message.includes('busy') ||
      name.includes('aborterror')) {
    return ErrorType.TRANSIENT;
  }

  // Extension context invalidated - PERMANENT (extension was reloaded/updated)
  if (message.includes('extension context invalidated') ||
      message.includes('context invalidated')) {
    return ErrorType.PERMANENT;
  }

  // Network/messaging errors - ENHANCED (but not our custom timeout errors)
  if (message.includes('message') ||
      message.includes('no response') ||
      message.includes('no receiver') ||
      message.includes('disconnected') ||
      message.includes('timeout') ||
      message.includes('could not establish connection') ||
      message.includes('receiving end does not exist')) {
    return ErrorType.NETWORK;
  }

  // Permission errors
  if (message.includes('permission') || name.includes('securityerror')) {
    return ErrorType.PERMISSION;
  }

  // Data corruption
  if (message.includes('corrupt') ||
      message.includes('invalid') ||
      name.includes('dataerror')) {
    return ErrorType.CORRUPTION;
  }

  return ErrorType.PERMANENT;
}

// Retry with exponential backoff
async function retryOperation(
  operation,
  options = {}
) {
  const {
    maxAttempts = 3,
    initialDelay = 100,
    maxDelay = 5000,
    shouldRetry = (error) => classifyError(error) === ErrorType.TRANSIENT,
    onRetry = null
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      if (onRetry) {
        onRetry(attempt, error);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  throw lastError;
}

// Error logger with tracking
const errorLog = [];
const MAX_LOG_SIZE = 100;

function logError(context, err, metadata = {}) {
  const entry = {
    timestamp: Date.now(),
    context,
    type: classifyError(err),
    message: err?.message || String(err),
    metadata
  };

  errorLog.unshift(entry);
  if (errorLog.length > MAX_LOG_SIZE) {
    errorLog.pop();
  }

  (0,_logger_js__WEBPACK_IMPORTED_MODULE_0__.error)(`[${context}]`, err, metadata);
  return entry;
}

function getErrorLog() {
  return [...errorLog];
}

function clearErrorLog() {
  errorLog.length = 0;
}


/***/ }),

/***/ "./shared/logger.js":
/*!**************************!*\
  !*** ./shared/logger.js ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createLogger: () => (/* binding */ createLogger),
/* harmony export */   debug: () => (/* binding */ debug),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   error: () => (/* binding */ error),
/* harmony export */   info: () => (/* binding */ info),
/* harmony export */   warn: () => (/* binding */ warn)
/* harmony export */ });
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./constants.js */ "./shared/constants.js");
/**
 * @fileoverview Shared debug logging utility with build-time stripping for production
 *
 * This module provides logging functions that are automatically removed in production builds.
 * The DEBUG flag is imported from constants.js which is set at build time by webpack DefinePlugin.
 *
 * Usage:
 *   import { debug, error, warn, info } from './logger.js';
 *   debug('[Component]', 'Debug message', data);
 *   error('[Component]', 'Error occurred', errorObj);
 *
 * In production builds:
 * - DEBUG is replaced with false by webpack DefinePlugin
 * - Dead code elimination removes all if (DEBUG) blocks
 * - Terser's drop_console removes any remaining console statements
 */



/**
 * Log debug information (removed in production)
 * @param {...any} args - Arguments to log
 */
function debug(...args) {
  if (_constants_js__WEBPACK_IMPORTED_MODULE_0__.DEBUG) {
    console.log(...args);
  }
}

/**
 * Log error information (removed in production)
 * @param {...any} args - Arguments to log
 */
function error(...args) {
  if (_constants_js__WEBPACK_IMPORTED_MODULE_0__.DEBUG) {
    console.error(...args);
  }
}

/**
 * Log warning information (removed in production)
 * @param {...any} args - Arguments to log
 */
function warn(...args) {
  if (_constants_js__WEBPACK_IMPORTED_MODULE_0__.DEBUG) {
    console.warn(...args);
  }
}

/**
 * Log informational messages (removed in production)
 * @param {...any} args - Arguments to log
 */
function info(...args) {
  if (_constants_js__WEBPACK_IMPORTED_MODULE_0__.DEBUG) {
    console.info(...args);
  }
}

/**
 * Create a namespaced logger for a specific component
 * @param {string} namespace - Component or module name
 * @returns {Object} Logger object with namespaced methods
 */
function createLogger(namespace) {
  const prefix = `[${namespace}]`;

  return {
    debug: (...args) => debug(prefix, ...args),
    error: (...args) => error(prefix, ...args),
    warn: (...args) => warn(prefix, ...args),
    info: (...args) => info(prefix, ...args),
  };
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  debug,
  error,
  warn,
  info,
  createLogger,
});


/***/ }),

/***/ "./shared/messaging.js":
/*!*****************************!*\
  !*** ./shared/messaging.js ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   sendHiddenVideosMessage: () => (/* binding */ sendHiddenVideosMessage)
/* harmony export */ });
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./constants.js */ "./shared/constants.js");
/* harmony import */ var _errorHandler_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./errorHandler.js */ "./shared/errorHandler.js");



const MESSAGE_TIMEOUT = 5000;

// Track if extension context has been invalidated
let contextInvalidated = false;

/**
 * Check if the extension context is still valid
 * @returns {boolean} True if context is valid, false if invalidated
 */
function isExtensionContextValid() {
  if (contextInvalidated) {
    return false;
  }

  try {
    // Accessing chrome.runtime.id will throw if context is invalidated
    // This is a reliable way to check if the extension is still active
    const id = chrome.runtime?.id;
    return !!id;
  } catch (error) {
    // Context invalidated - mark it so we don't spam checks
    contextInvalidated = true;
    return false;
  }
}

/**
 * Send message with timeout
 */
function sendMessageWithTimeout(message, timeout = MESSAGE_TIMEOUT) {
  // Check if extension context is still valid before attempting to send
  if (!isExtensionContextValid()) {
    return Promise.reject(new Error('Extension context invalidated'));
  }

  return Promise.race([
    chrome.runtime.sendMessage(message),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Message timeout')), timeout)
    )
  ]).catch(error => {
    // Check if this is a context invalidation error
    const errorMsg = error?.message?.toLowerCase() || '';
    if (errorMsg.includes('extension context invalidated') ||
        errorMsg.includes('context invalidated')) {
      contextInvalidated = true;
    }
    throw error;
  });
}

/**
 * Send a message to background script for hidden videos operations
 * Includes automatic retry logic for transient failures
 *
 * Retry Configuration:
 * - maxAttempts: 5 (increased from 3 to handle service worker wake-up delays)
 * - initialDelay: 300ms (increased from 200ms to give background script more time to initialize)
 * - maxDelay: 3000ms (caps exponential backoff to prevent excessive waiting)
 *
 * These values are tuned for Manifest V3 service workers which may need time
 * to wake up and complete initialization before handling messages.
 *
 * Context Invalidation:
 * When the extension is reloaded/updated, the context becomes invalidated.
 * This is expected behavior and the function will fail gracefully without
 * logging errors to avoid console spam.
 */
async function sendHiddenVideosMessage(type, payload = {}) {
  // Quick check before attempting message send
  if (!isExtensionContextValid()) {
    // Silently fail when context is invalidated - this is expected during extension reload
    // No need to log errors as this is a normal part of the extension lifecycle
    return Promise.reject(new Error('Extension context invalidated'));
  }

  return (0,_errorHandler_js__WEBPACK_IMPORTED_MODULE_1__.retryOperation)(
    async () => {
      try {
        const response = await sendMessageWithTimeout({ type, ...payload });

        if (!response) {
          throw new Error('No response from background script');
        }

        if (!response.ok) {
          const error = new Error(response.error || 'hidden video message failed');
          error.response = response;
          throw error;
        }

        return response.result;
      } catch (error) {
        // Don't log errors for context invalidation - this is expected behavior
        const errorType = (0,_errorHandler_js__WEBPACK_IMPORTED_MODULE_1__.classifyError)(error);
        if (errorType !== _errorHandler_js__WEBPACK_IMPORTED_MODULE_1__.ErrorType.PERMANENT || !error.message?.includes('context invalidated')) {
          (0,_errorHandler_js__WEBPACK_IMPORTED_MODULE_1__.logError)('Messaging', error, { type, payload });
        }
        throw error;
      }
    },
    {
      maxAttempts: 5,
      initialDelay: 300,
      maxDelay: 3000,
      shouldRetry: (error) => {
        const errorType = (0,_errorHandler_js__WEBPACK_IMPORTED_MODULE_1__.classifyError)(error);
        // Don't retry permanent errors (including context invalidation)
        return errorType === _errorHandler_js__WEBPACK_IMPORTED_MODULE_1__.ErrorType.NETWORK || errorType === _errorHandler_js__WEBPACK_IMPORTED_MODULE_1__.ErrorType.TRANSIENT;
      }
    }
  );
}


/***/ }),

/***/ "./shared/notifications.js":
/*!*********************************!*\
  !*** ./shared/notifications.js ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NotificationType: () => (/* binding */ NotificationType),
/* harmony export */   clearAllNotifications: () => (/* binding */ clearAllNotifications),
/* harmony export */   showNotification: () => (/* binding */ showNotification)
/* harmony export */ });
const NotificationType = {
  ERROR: 'error',
  WARNING: 'warning',
  SUCCESS: 'success',
  INFO: 'info'
};

// Storage for active notifications
const activeNotifications = new Map();

function showNotification(message, type = NotificationType.INFO, duration = 3000) {
  const container = getOrCreateNotificationContainer();
  const notification = createNotificationElement(message, type);

  container.appendChild(notification);

  const id = Date.now() + Math.random();
  activeNotifications.set(id, notification);

  // Animate in
  requestAnimationFrame(() => {
    notification.classList.add('visible');
  });

  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => {
      dismissNotification(id, notification);
    }, duration);
  }

  return id;
}

function getOrCreateNotificationContainer() {
  let container = document.getElementById('yt-hwv-notifications');
  if (!container) {
    container = document.createElement('div');
    container.id = 'yt-hwv-notifications';
    container.className = 'yt-hwv-notification-container';
    document.body.appendChild(container);
  }
  return container;
}

function createNotificationElement(message, type) {
  const notification = document.createElement('div');
  notification.className = `yt-hwv-notification ${type}`;

  const icon = getIconForType(type);

  // Create elements safely without innerHTML to prevent XSS
  const iconDiv = document.createElement('div');
  iconDiv.className = 'notification-icon';
  iconDiv.textContent = icon;

  const messageDiv = document.createElement('div');
  messageDiv.className = 'notification-message';
  messageDiv.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'notification-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = '×';

  notification.appendChild(iconDiv);
  notification.appendChild(messageDiv);
  notification.appendChild(closeBtn);

  closeBtn.addEventListener('click', () => {
    dismissNotification(null, notification);
  });

  return notification;
}

function getIconForType(type) {
  const icons = {
    error: '⚠',
    warning: '⚠',
    success: '✓',
    info: 'ℹ'
  };
  return icons[type] || icons.info;
}

function dismissNotification(id, notification) {
  notification.classList.remove('visible');
  setTimeout(() => {
    notification.remove();
    if (id) {
      activeNotifications.delete(id);
    }
  }, 300);
}

function clearAllNotifications() {
  activeNotifications.forEach((notification) => {
    dismissNotification(null, notification);
  });
  activeNotifications.clear();
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!**************************!*\
  !*** ./content/index.js ***!
  \**************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   waitForBackgroundReady: () => (/* binding */ waitForBackgroundReady)
/* harmony export */ });
/* harmony import */ var _ui_styles_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ui/styles.js */ "./content/ui/styles.js");
/* harmony import */ var _storage_settings_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./storage/settings.js */ "./content/storage/settings.js");
/* harmony import */ var _events_eventHandler_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./events/eventHandler.js */ "./content/events/eventHandler.js");
/* harmony import */ var _observers_mutationObserver_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./observers/mutationObserver.js */ "./content/observers/mutationObserver.js");
/* harmony import */ var _observers_urlObserver_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./observers/urlObserver.js */ "./content/observers/urlObserver.js");
/* harmony import */ var _observers_xhrObserver_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./observers/xhrObserver.js */ "./content/observers/xhrObserver.js");
/* harmony import */ var _observers_intersectionObserver_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./observers/intersectionObserver.js */ "./content/observers/intersectionObserver.js");
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./utils/logger.js */ "./content/utils/logger.js");
/* harmony import */ var _shared_messaging_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../shared/messaging.js */ "./shared/messaging.js");
/* harmony import */ var _shared_constants_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../shared/constants.js */ "./shared/constants.js");
/* harmony import */ var _shared_errorHandler_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../shared/errorHandler.js */ "./shared/errorHandler.js");
/* harmony import */ var _shared_notifications_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../shared/notifications.js */ "./shared/notifications.js");
/* harmony import */ var _utils_domErrorDetection_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./utils/domErrorDetection.js */ "./content/utils/domErrorDetection.js");
/* harmony import */ var _utils_domSelectorHealth_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./utils/domSelectorHealth.js */ "./content/utils/domSelectorHealth.js");















/**
 * Wait for background script to be ready
 * Exported for testing purposes
 *
 * @param {number} maxAttempts - Maximum number of health check attempts
 * @param {number} delayMs - Delay between attempts in milliseconds
 * @returns {Promise<boolean>} True if background is ready, false otherwise
 */
async function waitForBackgroundReady(maxAttempts = 10, delayMs = 500) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const health = await (0,_shared_messaging_js__WEBPACK_IMPORTED_MODULE_8__.sendHiddenVideosMessage)(
        _shared_constants_js__WEBPACK_IMPORTED_MODULE_9__.HIDDEN_VIDEO_MESSAGES.HEALTH_CHECK,
        {}
      );

      if (health && health.ready) {
        return true;
      }

      if (health && health.error) {
        (0,_shared_errorHandler_js__WEBPACK_IMPORTED_MODULE_10__.logError)('ContentInit', new Error('Background initialization error: ' + health.error));
        // Continue waiting, it might recover
      }
    } catch (error) {
      (0,_shared_errorHandler_js__WEBPACK_IMPORTED_MODULE_10__.logError)('ContentInit', error, {
        attempt,
        maxAttempts,
        message: 'Health check failed, retrying...'
      });
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return false; // Not ready after max attempts
}

async function init() {
  try {
    const isReady = await waitForBackgroundReady();

    if (!isReady) {
      (0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_7__.warn)('[YT-HWV] Background script not ready, starting with limited functionality. Individual video hiding/dimming may not work until background service is ready.');
      // Continue anyway but with graceful degradation
    }

    try {
      (0,_ui_styles_js__WEBPACK_IMPORTED_MODULE_0__.injectStyles)();
    } catch (styleError) {
      (0,_shared_errorHandler_js__WEBPACK_IMPORTED_MODULE_10__.logError)('ContentInit', styleError, { component: 'styles', fatal: true });
      if (typeof document !== 'undefined' && document.body) {
        (0,_shared_notifications_js__WEBPACK_IMPORTED_MODULE_11__.showNotification)('YouTube Hide Watched Videos failed to load styles', 'error', 5000);
      }
      throw styleError;
    }

    await (0,_storage_settings_js__WEBPACK_IMPORTED_MODULE_1__.loadSettings)();

    // Reset selector stats on page navigation
    (0,_utils_domSelectorHealth_js__WEBPACK_IMPORTED_MODULE_13__.resetSelectorStats)();

    // Setup DOM health monitoring
    (0,_utils_domErrorDetection_js__WEBPACK_IMPORTED_MODULE_12__.setupDOMHealthMonitoring)();

    // Apply initial hiding before setting up IntersectionObserver
    // This prevents race condition where observer callbacks fire
    // while initial processing is still happening
    await (0,_events_eventHandler_js__WEBPACK_IMPORTED_MODULE_2__.applyHiding)();

    // Setup IntersectionObserver after initial processing completes
    (0,_observers_intersectionObserver_js__WEBPACK_IMPORTED_MODULE_6__.setupIntersectionObserver)();

    (0,_observers_mutationObserver_js__WEBPACK_IMPORTED_MODULE_3__.setupMutationObserver)(_events_eventHandler_js__WEBPACK_IMPORTED_MODULE_2__.applyHiding);
    (0,_observers_xhrObserver_js__WEBPACK_IMPORTED_MODULE_5__.setupXhrObserver)(_events_eventHandler_js__WEBPACK_IMPORTED_MODULE_2__.applyHiding);
    (0,_observers_urlObserver_js__WEBPACK_IMPORTED_MODULE_4__.setupUrlObserver)(_events_eventHandler_js__WEBPACK_IMPORTED_MODULE_2__.applyHiding);
    (0,_events_eventHandler_js__WEBPACK_IMPORTED_MODULE_2__.setupMessageListener)();
  } catch (error) {
    (0,_shared_errorHandler_js__WEBPACK_IMPORTED_MODULE_10__.logError)('ContentInit', error, { fatal: true });
    if (typeof document !== 'undefined' && document.body) {
      (0,_shared_notifications_js__WEBPACK_IMPORTED_MODULE_11__.showNotification)('YouTube Hide Watched Videos extension failed to initialize', 'error', 5000);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Cleanup on page unload and extension-specific events
if (typeof window !== 'undefined') {
  // Standard beforeunload (may not fire reliably in extensions)
  window.addEventListener('beforeunload', () => {
    (0,_observers_intersectionObserver_js__WEBPACK_IMPORTED_MODULE_6__.disconnectIntersectionObserver)();
    (0,_events_eventHandler_js__WEBPACK_IMPORTED_MODULE_2__.cleanupEventHandlers)();
  });

  // Page visibility change - cleanup when page becomes hidden
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Partial cleanup to free resources when page is hidden
      (0,_observers_intersectionObserver_js__WEBPACK_IMPORTED_MODULE_6__.disconnectIntersectionObserver)();
    }
  });

  // Pagehide event - more reliable than beforeunload in modern browsers
  window.addEventListener('pagehide', () => {
    (0,_observers_intersectionObserver_js__WEBPACK_IMPORTED_MODULE_6__.disconnectIntersectionObserver)();
    (0,_events_eventHandler_js__WEBPACK_IMPORTED_MODULE_2__.cleanupEventHandlers)();
  });
}

// Extension-specific cleanup
if (typeof chrome !== 'undefined' && chrome.runtime) {
  // Listen for extension being disabled or unloaded
  chrome.runtime.onSuspend?.addListener(() => {
    (0,_observers_intersectionObserver_js__WEBPACK_IMPORTED_MODULE_6__.disconnectIntersectionObserver)();
    (0,_events_eventHandler_js__WEBPACK_IMPORTED_MODULE_2__.cleanupEventHandlers)();
  });
}

(0,_utils_logger_js__WEBPACK_IMPORTED_MODULE_7__.logDebug)('YouTube Hide Watched Videos extension loaded');

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDTztBQUNQO0FBQ0E7O0FBRUE7QUFDTztBQUNQO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNPLGNBQWMsS0FBOEIsR0FBRyxJQUFPLEdBQUcsQ0FBcUM7O0FBRXJHO0FBQ087QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNPO0FBQ1A7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLENBQUM7O0FBRUQ7QUFDTztBQUNQO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNPO0FBQ1A7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNPO0FBQ1A7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDTztBQUNQO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ087QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ087QUFDUDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ3BYdUQ7O0FBRXZEO0FBQ087QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ087QUFDUDs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ087QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJOztBQUVKO0FBQ0E7O0FBRUEsd0JBQXdCLHdCQUF3QjtBQUNoRDtBQUNBO0FBQ0EsTUFBTTtBQUNOOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRU8sNkNBQTZDO0FBQ3BEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLEVBQUUsaURBQWUsS0FBSyxRQUFRO0FBQzlCO0FBQ0E7O0FBRU87QUFDUDtBQUNBOztBQUVP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QixJQUFJLHFGQUFxQixDQUFDLGdFQUFXO0FBQ3JDLElBQUksMkVBQWdCLENBQUMsZ0VBQVc7QUFDaEMsSUFBSSwyRUFBZ0IsQ0FBQyxnRUFBVztBQUNoQyxJQUFJLDZFQUFvQjtBQUN4QixJQUFJO0FBQ0osSUFBSSxrRUFBUSx5QkFBeUIsYUFBYTtBQUNsRDtBQUNBLE1BQU0sMkVBQWdCO0FBQ3RCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsRUFBRTtBQUNGO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLGtHQUE4QjtBQUNsQyxJQUFJLDZFQUFvQjtBQUN4QixHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTSxrR0FBOEI7QUFDcEM7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQSxJQUFJLGtHQUE4QjtBQUNsQyxJQUFJLDZFQUFvQjtBQUN4QixHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLGtHQUE4QjtBQUNsQyxJQUFJLDZFQUFvQjtBQUN4QixHQUFHO0FBQ0g7O0FBRUEsMERBQVEiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly95b3V0dWJlLWhpZGUtd2F0Y2hlZC12aWRlby1leHRlbnNpb24vLi9jb250ZW50L2RldGVjdGlvbi9zZWN0aW9uRGV0ZWN0b3IuanMiLCJ3ZWJwYWNrOi8veW91dHViZS1oaWRlLXdhdGNoZWQtdmlkZW8tZXh0ZW5zaW9uLy4vY29udGVudC9kZXRlY3Rpb24vc2hvcnRzRGV0ZWN0b3IuanMiLCJ3ZWJwYWNrOi8veW91dHViZS1oaWRlLXdhdGNoZWQtdmlkZW8tZXh0ZW5zaW9uLy4vY29udGVudC9kZXRlY3Rpb24vdmlkZW9EZXRlY3Rvci5qcyIsIndlYnBhY2s6Ly95b3V0dWJlLWhpZGUtd2F0Y2hlZC12aWRlby1leHRlbnNpb24vLi9jb250ZW50L2V2ZW50cy9ldmVudEhhbmRsZXIuanMiLCJ3ZWJwYWNrOi8veW91dHViZS1oaWRlLXdhdGNoZWQtdmlkZW8tZXh0ZW5zaW9uLy4vY29udGVudC9oaWRpbmcvaW5kaXZpZHVhbEhpZGluZy5qcyIsIndlYnBhY2s6Ly95b3V0dWJlLWhpZGUtd2F0Y2hlZC12aWRlby1leHRlbnNpb24vLi9jb250ZW50L2hpZGluZy9zaG9ydHNIaWRpbmcuanMiLCJ3ZWJwYWNrOi8veW91dHViZS1oaWRlLXdhdGNoZWQtdmlkZW8tZXh0ZW5zaW9uLy4vY29udGVudC9oaWRpbmcvd2F0Y2hlZEhpZGluZy5qcyIsIndlYnBhY2s6Ly95b3V0dWJlLWhpZGUtd2F0Y2hlZC12aWRlby1leHRlbnNpb24vLi9jb250ZW50L29ic2VydmVycy9pbnRlcnNlY3Rpb25PYnNlcnZlci5qcyIsIndlYnBhY2s6Ly95b3V0dWJlLWhpZGUtd2F0Y2hlZC12aWRlby1leHRlbnNpb24vLi9jb250ZW50L29ic2VydmVycy9tdXRhdGlvbk9ic2VydmVyLmpzIiwid2VicGFjazovL3lvdXR1YmUtaGlkZS13YXRjaGVkLXZpZGVvLWV4dGVuc2lvbi8uL2NvbnRlbnQvb2JzZXJ2ZXJzL3VybE9ic2VydmVyLmpzIiwid2VicGFjazovL3lvdXR1YmUtaGlkZS13YXRjaGVkLXZpZGVvLWV4dGVuc2lvbi8uL2NvbnRlbnQvb2JzZXJ2ZXJzL3hock9ic2VydmVyLmpzIiwid2VicGFjazovL3lvdXR1YmUtaGlkZS13YXRjaGVkLXZpZGVvLWV4dGVuc2lvbi8uL2NvbnRlbnQvc3RvcmFnZS9jYWNoZS5qcyIsIndlYnBhY2s6Ly95b3V0dWJlLWhpZGUtd2F0Y2hlZC12aWRlby1leHRlbnNpb24vLi9jb250ZW50L3N0b3JhZ2UvbWVzc2FnaW5nLmpzIiwid2VicGFjazovL3lvdXR1YmUtaGlkZS13YXRjaGVkLXZpZGVvLWV4dGVuc2lvbi8uL2NvbnRlbnQvc3RvcmFnZS9zZXR0aW5ncy5qcyIsIndlYnBhY2s6Ly95b3V0dWJlLWhpZGUtd2F0Y2hlZC12aWRlby1leHRlbnNpb24vLi9jb250ZW50L3VpL2FjY2Vzc2liaWxpdHkuanMiLCJ3ZWJwYWNrOi8veW91dHViZS1oaWRlLXdhdGNoZWQtdmlkZW8tZXh0ZW5zaW9uLy4vY29udGVudC91aS9leWVCdXR0b24uanMiLCJ3ZWJwYWNrOi8veW91dHViZS1oaWRlLXdhdGNoZWQtdmlkZW8tZXh0ZW5zaW9uLy4vY29udGVudC91aS9leWVCdXR0b25NYW5hZ2VyLmpzIiwid2VicGFjazovL3lvdXR1YmUtaGlkZS13YXRjaGVkLXZpZGVvLWV4dGVuc2lvbi8uL2NvbnRlbnQvdWkvc3R5bGVzLmpzIiwid2VicGFjazovL3lvdXR1YmUtaGlkZS13YXRjaGVkLXZpZGVvLWV4dGVuc2lvbi8uL2NvbnRlbnQvdXRpbHMvY29uc3RhbnRzLmpzIiwid2VicGFjazovL3lvdXR1YmUtaGlkZS13YXRjaGVkLXZpZGVvLWV4dGVuc2lvbi8uL2NvbnRlbnQvdXRpbHMvY3NzSGVscGVycy5qcyIsIndlYnBhY2s6Ly95b3V0dWJlLWhpZGUtd2F0Y2hlZC12aWRlby1leHRlbnNpb24vLi9jb250ZW50L3V0aWxzL2RlYm91bmNlLmpzIiwid2VicGFjazovL3lvdXR1YmUtaGlkZS13YXRjaGVkLXZpZGVvLWV4dGVuc2lvbi8uL2NvbnRlbnQvdXRpbHMvZG9tLmpzIiwid2VicGFjazovL3lvdXR1YmUtaGlkZS13YXRjaGVkLXZpZGVvLWV4dGVuc2lvbi8uL2NvbnRlbnQvdXRpbHMvZG9tQ2FjaGUuanMiLCJ3ZWJwYWNrOi8veW91dHViZS1oaWRlLXdhdGNoZWQtdmlkZW8tZXh0ZW5zaW9uLy4vY29udGVudC91dGlscy9kb21FcnJvckRldGVjdGlvbi5qcyIsIndlYnBhY2s6Ly95b3V0dWJlLWhpZGUtd2F0Y2hlZC12aWRlby1leHRlbnNpb24vLi9jb250ZW50L3V0aWxzL2RvbVNlbGVjdG9ySGVhbHRoLmpzIiwid2VicGFjazovL3lvdXR1YmUtaGlkZS13YXRjaGVkLXZpZGVvLWV4dGVuc2lvbi8uL2NvbnRlbnQvdXRpbHMvbG9nZ2VyLmpzIiwid2VicGFjazovL3lvdXR1YmUtaGlkZS13YXRjaGVkLXZpZGVvLWV4dGVuc2lvbi8uL2NvbnRlbnQvdXRpbHMvdmlzaWJpbGl0eVRyYWNrZXIuanMiLCJ3ZWJwYWNrOi8veW91dHViZS1oaWRlLXdhdGNoZWQtdmlkZW8tZXh0ZW5zaW9uLy4vc2hhcmVkL2NvbnN0YW50cy5qcyIsIndlYnBhY2s6Ly95b3V0dWJlLWhpZGUtd2F0Y2hlZC12aWRlby1leHRlbnNpb24vLi9zaGFyZWQvZXJyb3JIYW5kbGVyLmpzIiwid2VicGFjazovL3lvdXR1YmUtaGlkZS13YXRjaGVkLXZpZGVvLWV4dGVuc2lvbi8uL3NoYXJlZC9sb2dnZXIuanMiLCJ3ZWJwYWNrOi8veW91dHViZS1oaWRlLXdhdGNoZWQtdmlkZW8tZXh0ZW5zaW9uLy4vc2hhcmVkL21lc3NhZ2luZy5qcyIsIndlYnBhY2s6Ly95b3V0dWJlLWhpZGUtd2F0Y2hlZC12aWRlby1leHRlbnNpb24vLi9zaGFyZWQvbm90aWZpY2F0aW9ucy5qcyIsIndlYnBhY2s6Ly95b3V0dWJlLWhpZGUtd2F0Y2hlZC12aWRlby1leHRlbnNpb24vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8veW91dHViZS1oaWRlLXdhdGNoZWQtdmlkZW8tZXh0ZW5zaW9uL3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly95b3V0dWJlLWhpZGUtd2F0Y2hlZC12aWRlby1leHRlbnNpb24vd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly95b3V0dWJlLWhpZGUtd2F0Y2hlZC12aWRlby1leHRlbnNpb24vd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly95b3V0dWJlLWhpZGUtd2F0Y2hlZC12aWRlby1leHRlbnNpb24vLi9jb250ZW50L2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBkZXRlcm1pbmVZb3V0dWJlU2VjdGlvbigpIHtcbiAgY29uc3QgeyBocmVmIH0gPSB3aW5kb3cubG9jYXRpb247XG5cbiAgaWYgKGhyZWYuaW5jbHVkZXMoJy93YXRjaD8nKSkgcmV0dXJuICd3YXRjaCc7XG4gIGlmIChocmVmLm1hdGNoKC8uKlxcLyh1c2VyfGNoYW5uZWx8YylcXC8uK1xcL3ZpZGVvcy91KSB8fCBocmVmLm1hdGNoKC8uKlxcL0AuKi91KSkgcmV0dXJuICdjaGFubmVsJztcbiAgaWYgKGhyZWYuaW5jbHVkZXMoJy9mZWVkL3N1YnNjcmlwdGlvbnMnKSkgcmV0dXJuICdzdWJzY3JpcHRpb25zJztcbiAgaWYgKGhyZWYuaW5jbHVkZXMoJy9mZWVkL3RyZW5kaW5nJykpIHJldHVybiAndHJlbmRpbmcnO1xuICBpZiAoaHJlZi5pbmNsdWRlcygnL3BsYXlsaXN0PycpKSByZXR1cm4gJ3BsYXlsaXN0JztcblxuICByZXR1cm4gJ21pc2MnO1xufVxuIiwiaW1wb3J0IHsgU0VMRUNUT1JTIH0gZnJvbSAnLi4vdXRpbHMvY29uc3RhbnRzLmpzJztcbmltcG9ydCB7IGxvZ0RlYnVnIH0gZnJvbSAnLi4vdXRpbHMvbG9nZ2VyLmpzJztcbmltcG9ydCB7IGNhY2hlZERvY3VtZW50UXVlcnksIGNhY2hlZENsb3Nlc3QsIGNhY2hlZFF1ZXJ5U2VsZWN0b3IgfSBmcm9tICcuLi91dGlscy9kb21DYWNoZS5qcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kU2hvcnRzQ29udGFpbmVycygpIHtcbiAgY29uc3Qgc2hvcnRzQ29udGFpbmVycyA9IFtdO1xuICBjb25zdCBwcm9jZXNzZWRDb250YWluZXJzID0gbmV3IFNldCgpO1xuXG4gIFNFTEVDVE9SUy5TSE9SVFNfQ09OVEFJTkVSUy5mb3JFYWNoKHNlbGVjdG9yID0+IHtcbiAgICB0cnkge1xuICAgICAgLy8gVXNlIGNhY2hlZCBxdWVyeVxuICAgICAgY2FjaGVkRG9jdW1lbnRRdWVyeShzZWxlY3RvcikuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgY29uc3Qga2V5ID0gZWxlbWVudC50YWdOYW1lICsgZWxlbWVudC5jbGFzc05hbWU7XG4gICAgICAgIGlmICghcHJvY2Vzc2VkQ29udGFpbmVycy5oYXMoa2V5KSkge1xuICAgICAgICAgIHByb2Nlc3NlZENvbnRhaW5lcnMuYWRkKGtleSk7XG5cbiAgICAgICAgICAvLyBVc2UgY2FjaGVkIGNsb3Nlc3RcbiAgICAgICAgICBjb25zdCBwYXJlbnRTaGVsZiA9IGNhY2hlZENsb3Nlc3QoZWxlbWVudCwgJ3l0ZC1yZWVsLXNoZWxmLXJlbmRlcmVyJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FjaGVkQ2xvc2VzdChlbGVtZW50LCAneXRkLXJpY2gtc2hlbGYtcmVuZGVyZXInKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWNoZWRDbG9zZXN0KGVsZW1lbnQsICd5dGQtcmljaC1zZWN0aW9uLXJlbmRlcmVyJyk7XG5cbiAgICAgICAgICBpZiAocGFyZW50U2hlbGYgJiYgIXNob3J0c0NvbnRhaW5lcnMuaW5jbHVkZXMocGFyZW50U2hlbGYpKSB7XG4gICAgICAgICAgICBzaG9ydHNDb250YWluZXJzLnB1c2gocGFyZW50U2hlbGYpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoIXBhcmVudFNoZWxmICYmICFzaG9ydHNDb250YWluZXJzLmluY2x1ZGVzKGVsZW1lbnQpKSB7XG4gICAgICAgICAgICBzaG9ydHNDb250YWluZXJzLnB1c2goZWxlbWVudCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIGxvZ0RlYnVnKGBTZWxlY3RvciBmYWlsZWQ6ICR7c2VsZWN0b3J9YCwgZSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBVc2UgY2FjaGVkIHF1ZXJpZXMgZm9yIGFkZGl0aW9uYWwgZGV0ZWN0aW9uXG4gIGNvbnN0IHJlZWxJdGVtTGlua3MgPSBjYWNoZWREb2N1bWVudFF1ZXJ5KCdhLnJlZWwtaXRlbS1lbmRwb2ludCwgYVtocmVmXj1cIi9zaG9ydHMvXCJdJyk7XG4gIHJlZWxJdGVtTGlua3MuZm9yRWFjaChsaW5rID0+IHtcbiAgICBjb25zdCBjb250YWluZXIgPSBjYWNoZWRDbG9zZXN0KGxpbmssICd5dGQtcmljaC1pdGVtLXJlbmRlcmVyJykgfHxcbiAgICAgICAgICAgICAgICAgICAgIGNhY2hlZENsb3Nlc3QobGluaywgJ3l0ZC12aWRlby1yZW5kZXJlcicpIHx8XG4gICAgICAgICAgICAgICAgICAgICBjYWNoZWRDbG9zZXN0KGxpbmssICd5dGQtY29tcGFjdC12aWRlby1yZW5kZXJlcicpIHx8XG4gICAgICAgICAgICAgICAgICAgICBjYWNoZWRDbG9zZXN0KGxpbmssICd5dGQtZ3JpZC12aWRlby1yZW5kZXJlcicpO1xuICAgIGlmIChjb250YWluZXIgJiYgIXNob3J0c0NvbnRhaW5lcnMuaW5jbHVkZXMoY29udGFpbmVyKSkge1xuICAgICAgc2hvcnRzQ29udGFpbmVycy5wdXNoKGNvbnRhaW5lcik7XG4gICAgfVxuICB9KTtcblxuICBjb25zdCBzaG9ydHNMYWJlbHMgPSBjYWNoZWREb2N1bWVudFF1ZXJ5KCcueXRkLXRodW1ibmFpbC1vdmVybGF5LXRpbWUtc3RhdHVzLXJlbmRlcmVyW2FyaWEtbGFiZWw9XCJTaG9ydHNcIl0nKTtcbiAgc2hvcnRzTGFiZWxzLmZvckVhY2goKGNoaWxkKSA9PiB7XG4gICAgY29uc3QgY29udGFpbmVyID0gY2FjaGVkQ2xvc2VzdChjaGlsZCwgJ3l0ZC12aWRlby1yZW5kZXJlcicpIHx8XG4gICAgICAgICAgICAgICAgICAgICBjYWNoZWRDbG9zZXN0KGNoaWxkLCAneXRkLWNvbXBhY3QtdmlkZW8tcmVuZGVyZXInKSB8fFxuICAgICAgICAgICAgICAgICAgICAgY2FjaGVkQ2xvc2VzdChjaGlsZCwgJ3l0ZC1ncmlkLXZpZGVvLXJlbmRlcmVyJyk7XG4gICAgaWYgKGNvbnRhaW5lciAmJiAhc2hvcnRzQ29udGFpbmVycy5pbmNsdWRlcyhjb250YWluZXIpKSB7XG4gICAgICBzaG9ydHNDb250YWluZXJzLnB1c2goY29udGFpbmVyKTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IHJpY2hTaGVsdmVzID0gY2FjaGVkRG9jdW1lbnRRdWVyeSgneXRkLXJpY2gtc2hlbGYtcmVuZGVyZXInKTtcbiAgcmljaFNoZWx2ZXMuZm9yRWFjaChzaGVsZiA9PiB7XG4gICAgY29uc3QgaGFzU2hvcnRzID0gY2FjaGVkUXVlcnlTZWxlY3RvcihzaGVsZiwgJ2FbaHJlZl49XCIvc2hvcnRzL1wiXScpIHx8XG4gICAgICAgICAgICAgICAgICAgICBjYWNoZWRRdWVyeVNlbGVjdG9yKHNoZWxmLCAnLnJlZWwtaXRlbS1lbmRwb2ludCcpIHx8XG4gICAgICAgICAgICAgICAgICAgICBjYWNoZWRRdWVyeVNlbGVjdG9yKHNoZWxmLCAnLnNob3J0c0xvY2t1cFZpZXdNb2RlbEhvc3QnKTtcbiAgICBpZiAoaGFzU2hvcnRzICYmICFzaG9ydHNDb250YWluZXJzLmluY2x1ZGVzKHNoZWxmKSkge1xuICAgICAgc2hvcnRzQ29udGFpbmVycy5wdXNoKHNoZWxmKTtcbiAgICB9XG4gIH0pO1xuXG4gIGxvZ0RlYnVnKGBGb3VuZCAke3Nob3J0c0NvbnRhaW5lcnMubGVuZ3RofSBzaG9ydHMgY29udGFpbmVyIGVsZW1lbnRzYCk7XG5cbiAgcmV0dXJuIHNob3J0c0NvbnRhaW5lcnM7XG59XG4iLCJpbXBvcnQgeyBTRUxFQ1RPUl9DSEFJTlMsIENBQ0hFX0NPTkZJRyB9IGZyb20gJy4uLy4uL3NoYXJlZC9jb25zdGFudHMuanMnO1xuaW1wb3J0IHsgZ2V0VGhyZXNob2xkIH0gZnJvbSAnLi4vc3RvcmFnZS9zZXR0aW5ncy5qcyc7XG5pbXBvcnQgeyBsb2dEZWJ1ZyB9IGZyb20gJy4uL3V0aWxzL2xvZ2dlci5qcyc7XG5pbXBvcnQgeyBleHRyYWN0VmlkZW9JZEZyb21IcmVmIH0gZnJvbSAnLi4vdXRpbHMvZG9tLmpzJztcbmltcG9ydCB7IGNhY2hlZERvY3VtZW50UXVlcnlXaXRoRmFsbGJhY2ssIGNhY2hlZFF1ZXJ5U2VsZWN0b3JXaXRoRmFsbGJhY2sgfSBmcm9tICcuLi91dGlscy9kb21DYWNoZS5qcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRWaWRlb0lkKGVsZW1lbnQpIHtcbiAgLy8gVXNlIGZhbGxiYWNrIGNoYWluIGZvciB2aWRlbyBsaW5rc1xuICBjb25zdCB2aWRlb0xpbmsgPSBjYWNoZWRRdWVyeVNlbGVjdG9yV2l0aEZhbGxiYWNrKFxuICAgIGVsZW1lbnQsXG4gICAgJ1ZJREVPX0xJTksnLFxuICAgIFNFTEVDVE9SX0NIQUlOUy5WSURFT19MSU5LXG4gICk7XG5cbiAgaWYgKHZpZGVvTGluaykge1xuICAgIGNvbnN0IGhyZWYgPSB2aWRlb0xpbmsuZ2V0QXR0cmlidXRlKCdocmVmJyk7XG4gICAgY29uc3QgdmlkZW9JZCA9IGV4dHJhY3RWaWRlb0lkRnJvbUhyZWYoaHJlZik7XG4gICAgaWYgKHZpZGVvSWQpIHJldHVybiB2aWRlb0lkO1xuICB9XG5cbiAgLy8gVHJ5IHNob3J0cyBsaW5rIGFzIGZhbGxiYWNrXG4gIGNvbnN0IHNob3J0c0xpbmsgPSBjYWNoZWRRdWVyeVNlbGVjdG9yV2l0aEZhbGxiYWNrKFxuICAgIGVsZW1lbnQsXG4gICAgJ1NIT1JUU19MSU5LJyxcbiAgICBTRUxFQ1RPUl9DSEFJTlMuU0hPUlRTX0xJTktcbiAgKTtcblxuICBpZiAoc2hvcnRzTGluaykge1xuICAgIGNvbnN0IGhyZWYgPSBzaG9ydHNMaW5rLmdldEF0dHJpYnV0ZSgnaHJlZicpO1xuICAgIGNvbnN0IHZpZGVvSWQgPSBleHRyYWN0VmlkZW9JZEZyb21IcmVmKGhyZWYpO1xuICAgIGlmICh2aWRlb0lkKSByZXR1cm4gdmlkZW9JZDtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZFdhdGNoZWRFbGVtZW50cygpIHtcbiAgLy8gVXNlIGZhbGxiYWNrIGNoYWluIGZvciBwcm9ncmVzcyBiYXJzXG4gIGNvbnN0IHByb2dyZXNzQmFycyA9IGNhY2hlZERvY3VtZW50UXVlcnlXaXRoRmFsbGJhY2soXG4gICAgJ1BST0dSRVNTX0JBUicsXG4gICAgU0VMRUNUT1JfQ0hBSU5TLlBST0dSRVNTX0JBUixcbiAgICBDQUNIRV9DT05GSUcuUFJPR1JFU1NfQkFSX1RUTFxuICApO1xuXG4gIGNvbnN0IHRocmVzaG9sZCA9IGdldFRocmVzaG9sZCgpO1xuICBjb25zdCB3aXRoVGhyZXNob2xkID0gcHJvZ3Jlc3NCYXJzLmZpbHRlcigoYmFyKSA9PiB7XG4gICAgcmV0dXJuIGJhci5zdHlsZS53aWR0aCAmJiBwYXJzZUludChiYXIuc3R5bGUud2lkdGgsIDEwKSA+PSB0aHJlc2hvbGQ7XG4gIH0pO1xuXG4gIGxvZ0RlYnVnKGBGb3VuZCAke3Byb2dyZXNzQmFycy5sZW5ndGh9IHdhdGNoZWQgZWxlbWVudHMgKCR7d2l0aFRocmVzaG9sZC5sZW5ndGh9IHdpdGhpbiB0aHJlc2hvbGQpYCk7XG5cbiAgcmV0dXJuIHdpdGhUaHJlc2hvbGQ7XG59XG4iLCJpbXBvcnQgeyBsb2dEZWJ1ZywgZXJyb3IgfSBmcm9tICcuLi91dGlscy9sb2dnZXIuanMnO1xuaW1wb3J0IHsgQ1NTX0NMQVNTRVMsIElOVEVSU0VDVElPTl9PQlNFUlZFUl9DT05GSUcgfSBmcm9tICcuLi91dGlscy9jb25zdGFudHMuanMnO1xuaW1wb3J0IHsgYXBwbHlDYWNoZVVwZGF0ZSwgY2xlYXJDYWNoZSB9IGZyb20gJy4uL3N0b3JhZ2UvY2FjaGUuanMnO1xuaW1wb3J0IHsgbG9hZFNldHRpbmdzIH0gZnJvbSAnLi4vc3RvcmFnZS9zZXR0aW5ncy5qcyc7XG5pbXBvcnQgeyB1cGRhdGVDbGFzc09uV2F0Y2hlZEl0ZW1zIH0gZnJvbSAnLi4vaGlkaW5nL3dhdGNoZWRIaWRpbmcuanMnO1xuaW1wb3J0IHsgdXBkYXRlQ2xhc3NPblNob3J0c0l0ZW1zIH0gZnJvbSAnLi4vaGlkaW5nL3Nob3J0c0hpZGluZy5qcyc7XG5pbXBvcnQgeyBhcHBseVN0YXRlVG9FeWVCdXR0b24gfSBmcm9tICcuLi91aS9leWVCdXR0b24uanMnO1xuaW1wb3J0IHsgYWRkRXllQnV0dG9ucyB9IGZyb20gJy4uL3VpL2V5ZUJ1dHRvbk1hbmFnZXIuanMnO1xuaW1wb3J0IHsgYXBwbHlJbmRpdmlkdWFsSGlkaW5nIH0gZnJvbSAnLi4vaGlkaW5nL2luZGl2aWR1YWxIaWRpbmcuanMnO1xuaW1wb3J0IHsgb25WaXNpYmlsaXR5Q2hhbmdlIH0gZnJvbSAnLi4vdXRpbHMvdmlzaWJpbGl0eVRyYWNrZXIuanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gaGFuZGxlSGlkZGVuVmlkZW9zRXZlbnQoZXZlbnQpIHtcbiAgaWYgKCFldmVudCB8fCAhZXZlbnQudHlwZSkgcmV0dXJuO1xuICBpZiAoZXZlbnQudHlwZSA9PT0gJ3VwZGF0ZWQnICYmIGV2ZW50LnJlY29yZCkge1xuICAgIGFwcGx5Q2FjaGVVcGRhdGUoZXZlbnQucmVjb3JkLnZpZGVvSWQsIGV2ZW50LnJlY29yZCk7XG4gICAgLy8gVXNlIHByb2dyYW1tYXRpYyBmaWx0ZXJpbmcgdG8gcHJldmVudCBDU1Mgc2VsZWN0b3IgaW5qZWN0aW9uXG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChgLiR7Q1NTX0NMQVNTRVMuRVlFX0JVVFRPTn1gKS5mb3JFYWNoKChidXR0b24pID0+IHtcbiAgICAgIGlmIChidXR0b24uZGF0YXNldC52aWRlb0lkID09PSBldmVudC5yZWNvcmQudmlkZW9JZCkge1xuICAgICAgICBhcHBseVN0YXRlVG9FeWVCdXR0b24oYnV0dG9uLCBldmVudC5yZWNvcmQuc3RhdGUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGFwcGx5SW5kaXZpZHVhbEhpZGluZygpO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoZXZlbnQudHlwZSA9PT0gJ3JlbW92ZWQnICYmIGV2ZW50LnZpZGVvSWQpIHtcbiAgICBhcHBseUNhY2hlVXBkYXRlKGV2ZW50LnZpZGVvSWQsIG51bGwpO1xuICAgIC8vIFVzZSBwcm9ncmFtbWF0aWMgZmlsdGVyaW5nIHRvIHByZXZlbnQgQ1NTIHNlbGVjdG9yIGluamVjdGlvblxuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoYC4ke0NTU19DTEFTU0VTLkVZRV9CVVRUT059YCkuZm9yRWFjaCgoYnV0dG9uKSA9PiB7XG4gICAgICBpZiAoYnV0dG9uLmRhdGFzZXQudmlkZW9JZCA9PT0gZXZlbnQudmlkZW9JZCkge1xuICAgICAgICBhcHBseVN0YXRlVG9FeWVCdXR0b24oYnV0dG9uLCAnbm9ybWFsJyk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgYXBwbHlJbmRpdmlkdWFsSGlkaW5nKCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChldmVudC50eXBlID09PSAnY2xlYXJlZCcpIHtcbiAgICBjbGVhckNhY2hlKCk7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChgLiR7Q1NTX0NMQVNTRVMuRVlFX0JVVFRPTn1gKS5mb3JFYWNoKChidXR0b24pID0+IHtcbiAgICAgIGFwcGx5U3RhdGVUb0V5ZUJ1dHRvbihidXR0b24sICdub3JtYWwnKTtcbiAgICB9KTtcbiAgICBhcHBseUluZGl2aWR1YWxIaWRpbmcoKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXBwbHlIaWRpbmcoKSB7XG4gIGxvZ0RlYnVnKCdBcHBseWluZyBoaWRpbmcvZGltbWluZycpO1xuICB1cGRhdGVDbGFzc09uV2F0Y2hlZEl0ZW1zKCk7XG4gIHVwZGF0ZUNsYXNzT25TaG9ydHNJdGVtcygpO1xuICAvLyBSZW1vdmVkIHNldFRpbWVvdXQgZGVsYXkgLSBzeW5jaHJvbml6YXRpb24gbm93IGhhcHBlbnMgaW4gZXllIGJ1dHRvbiBmZXRjaCBjYWxsYmFja3NcbiAgLy8gVGhpcyBpbXByb3ZlcyByZXNwb25zaXZlbmVzcyBhbmQgcHJldmVudHMgcmFjZSBjb25kaXRpb24gd2hlcmUgY29udGFpbmVyIHN0YXRlXG4gIC8vIGlzIGFwcGxpZWQgYmVmb3JlIGNhY2hlIGlzIHBvcHVsYXRlZFxuICBhZGRFeWVCdXR0b25zKCk7XG4gIGF3YWl0IGFwcGx5SW5kaXZpZHVhbEhpZGluZygpO1xufVxuXG4vLyBWaXNpYmlsaXR5IGNoYW5nZSBoYW5kbGVyXG5sZXQgdmlzaWJpbGl0eVVuc3Vic2NyaWJlID0gbnVsbDtcblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwTWVzc2FnZUxpc3RlbmVyKCkge1xuICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKHJlcXVlc3QsIHNlbmRlcikgPT4ge1xuICAgIC8vIEhhbmRsZSBtZXNzYWdlcyBhc3luY2hyb25vdXNseSB3aXRob3V0IGJsb2NraW5nXG4gICAgLy8gVGhpcyBsaXN0ZW5lciBkb2Vzbid0IHNlbmQgcmVzcG9uc2VzLCBzbyB3ZSBoYW5kbGUgYXN5bmMgd29yayBpbnRlcm5hbGx5XG4gICAgKGFzeW5jICgpID0+IHtcbiAgICAgIGlmIChyZXF1ZXN0LmFjdGlvbiA9PT0gJ3NldHRpbmdzVXBkYXRlZCcpIHtcbiAgICAgICAgYXdhaXQgbG9hZFNldHRpbmdzKCk7XG4gICAgICAgIGF3YWl0IGFwcGx5SGlkaW5nKCk7XG4gICAgICB9IGVsc2UgaWYgKHJlcXVlc3QuYWN0aW9uID09PSAncmVzZXRTZXR0aW5ncycpIHtcbiAgICAgICAgYXdhaXQgbG9hZFNldHRpbmdzKCk7XG4gICAgICAgIGF3YWl0IGFwcGx5SGlkaW5nKCk7XG4gICAgICB9IGVsc2UgaWYgKHJlcXVlc3QudHlwZSA9PT0gJ0hJRERFTl9WSURFT1NfRVZFTlQnKSB7XG4gICAgICAgIGhhbmRsZUhpZGRlblZpZGVvc0V2ZW50KHJlcXVlc3QuZXZlbnQpO1xuICAgICAgfVxuICAgIH0pKCkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgZXJyb3IoJ0Vycm9yIGhhbmRsaW5nIG1lc3NhZ2UgaW4gY29udGVudCBzY3JpcHQ6JywgZXJyKTtcbiAgICB9KTtcblxuICAgIC8vIE5vIHJlc3BvbnNlIG5lZWRlZCBmb3IgdGhlc2UgbWVzc2FnZXNcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuXG4gIC8vIExpc3RlbiBmb3IgY3VzdG9tIGV2ZW50cyBmcm9tIGV5ZSBidXR0b25zXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3l0LWh3di1pbmRpdmlkdWFsLXVwZGF0ZScsICgpID0+IHtcbiAgICBhcHBseUluZGl2aWR1YWxIaWRpbmcoKTtcbiAgfSk7XG5cbiAgLy8gTGlzdGVuIHRvIHZpc2liaWxpdHkgY2hhbmdlcyBpZiBsYXp5IHByb2Nlc3NpbmcgaXMgZW5hYmxlZFxuICAvLyBXaGVuIEVOQUJMRV9MQVpZX1BST0NFU1NJTkcgaXMgZmFsc2UsIGFsbCB2aWRlb3MgYXJlIHByb2Nlc3NlZCBpbW1lZGlhdGVseVxuICAvLyB3aXRob3V0IHZpc2liaWxpdHkgdHJhY2tpbmcsIHdoaWNoIGlzIHRoZSB0cmFkaXRpb25hbCBiZWhhdmlvciBmb3Igc21hbGxlciBwYWdlc1xuICBpZiAoSU5URVJTRUNUSU9OX09CU0VSVkVSX0NPTkZJRy5FTkFCTEVfTEFaWV9QUk9DRVNTSU5HKSB7XG4gICAgdmlzaWJpbGl0eVVuc3Vic2NyaWJlID0gb25WaXNpYmlsaXR5Q2hhbmdlKCh7IGJlY2FtZVZpc2libGUsIGJlY2FtZUhpZGRlbiB9KSA9PiB7XG4gICAgICBpZiAoYmVjYW1lVmlzaWJsZS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGxvZ0RlYnVnKGBQcm9jZXNzaW5nICR7YmVjYW1lVmlzaWJsZS5sZW5ndGh9IG5ld2x5IHZpc2libGUgdmlkZW9zYCk7XG4gICAgICAgIC8vIFByb2Nlc3MgdmlkZW9zIHRoYXQganVzdCBiZWNhbWUgdmlzaWJsZVxuICAgICAgICBhcHBseUluZGl2aWR1YWxIaWRpbmcoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBsb2dEZWJ1ZygnTGF6eSBwcm9jZXNzaW5nIGRpc2FibGVkIC0gcHJvY2Vzc2luZyBhbGwgdmlkZW9zIGltbWVkaWF0ZWx5IG9uIERPTSBjaGFuZ2VzJyk7XG4gIH1cbn1cblxuLy8gRXhwb3J0IGNsZWFudXAgZnVuY3Rpb25cbmV4cG9ydCBmdW5jdGlvbiBjbGVhbnVwRXZlbnRIYW5kbGVycygpIHtcbiAgaWYgKHZpc2liaWxpdHlVbnN1YnNjcmliZSkge1xuICAgIHZpc2liaWxpdHlVbnN1YnNjcmliZSgpO1xuICAgIHZpc2liaWxpdHlVbnN1YnNjcmliZSA9IG51bGw7XG4gIH1cbn1cbiIsImltcG9ydCB7IENTU19DTEFTU0VTLCBJTlRFUlNFQ1RJT05fT0JTRVJWRVJfQ09ORklHIH0gZnJvbSAnLi4vdXRpbHMvY29uc3RhbnRzLmpzJztcbmltcG9ydCB7IGxvZ0RlYnVnIH0gZnJvbSAnLi4vdXRpbHMvbG9nZ2VyLmpzJztcbmltcG9ydCB7IGdldENhY2hlZEhpZGRlblZpZGVvLCBoYXNDYWNoZWRWaWRlbyB9IGZyb20gJy4uL3N0b3JhZ2UvY2FjaGUuanMnO1xuaW1wb3J0IHsgZmV0Y2hIaWRkZW5WaWRlb1N0YXRlcyB9IGZyb20gJy4uL3N0b3JhZ2UvbWVzc2FnaW5nLmpzJztcbmltcG9ydCB7IGlzSW5kaXZpZHVhbE1vZGVFbmFibGVkIH0gZnJvbSAnLi4vc3RvcmFnZS9zZXR0aW5ncy5qcyc7XG5pbXBvcnQgeyBjb2xsZWN0VmlzaWJsZVZpZGVvSWRzLCBmaW5kVmlkZW9Db250YWluZXJzLCBleHRyYWN0VmlkZW9JZEZyb21IcmVmIH0gZnJvbSAnLi4vdXRpbHMvZG9tLmpzJztcbmltcG9ydCB7IGdldFZpc2libGVWaWRlb3MsIGlzVmlkZW9WaXNpYmxlIH0gZnJvbSAnLi4vdXRpbHMvdmlzaWJpbGl0eVRyYWNrZXIuanMnO1xuXG5sZXQgaW5kaXZpZHVhbEhpZGluZ0l0ZXJhdGlvbiA9IDA7XG5sZXQgaXNJbml0aWFsTG9hZCA9IHRydWU7XG5cbi8qKlxuICogU3luY2hyb25pemVzIGNvbnRhaW5lciBDU1MgY2xhc3NlcyB3aXRoIHZpZGVvIHN0YXRlXG4gKiBFeHBvcnRlZCBzbyBleWUgYnV0dG9uIGNyZWF0aW9uIGNhbiBzeW5jIHN0YXRlIGltbWVkaWF0ZWx5IGFmdGVyIGZldGNoXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBjb250YWluZXIgLSBWaWRlbyBjb250YWluZXIgZWxlbWVudFxuICogQHBhcmFtIHtzdHJpbmd9IHN0YXRlIC0gVmlkZW8gc3RhdGUgKCdub3JtYWwnLCAnZGltbWVkJywgJ2hpZGRlbicpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzeW5jSW5kaXZpZHVhbENvbnRhaW5lclN0YXRlKGNvbnRhaW5lciwgc3RhdGUpIHtcbiAgaWYgKCFjb250YWluZXIpIHJldHVybjtcbiAgY29uc3QgaGFzRGltbWVkID0gY29udGFpbmVyLmNsYXNzTGlzdC5jb250YWlucyhDU1NfQ0xBU1NFUy5JTkRJVklEVUFMX0RJTU1FRCk7XG4gIGNvbnN0IGhhc0hpZGRlbiA9IGNvbnRhaW5lci5jbGFzc0xpc3QuY29udGFpbnMoQ1NTX0NMQVNTRVMuSU5ESVZJRFVBTF9ISURERU4pO1xuICBpZiAoc3RhdGUgPT09ICdkaW1tZWQnKSB7XG4gICAgaWYgKGhhc0hpZGRlbikge1xuICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoQ1NTX0NMQVNTRVMuSU5ESVZJRFVBTF9ISURERU4pO1xuICAgIH1cbiAgICBpZiAoIWhhc0RpbW1lZCkge1xuICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5hZGQoQ1NTX0NMQVNTRVMuSU5ESVZJRFVBTF9ESU1NRUQpO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKHN0YXRlID09PSAnaGlkZGVuJykge1xuICAgIGlmIChoYXNEaW1tZWQpIHtcbiAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKENTU19DTEFTU0VTLklORElWSURVQUxfRElNTUVEKTtcbiAgICB9XG4gICAgaWYgKCFoYXNIaWRkZW4pIHtcbiAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKENTU19DTEFTU0VTLklORElWSURVQUxfSElEREVOKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChoYXNEaW1tZWQpIHtcbiAgICBjb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZShDU1NfQ0xBU1NFUy5JTkRJVklEVUFMX0RJTU1FRCk7XG4gIH1cbiAgaWYgKGhhc0hpZGRlbikge1xuICAgIGNvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKENTU19DTEFTU0VTLklORElWSURVQUxfSElEREVOKTtcbiAgfVxufVxuXG4vKipcbiAqIE1hcmsgdGhlIGluaXRpYWwgbG9hZCBhcyBjb21wbGV0ZVxuICogRXhwb3J0ZWQgZm9yIHRlc3RpbmcgcHVycG9zZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hcmtJbml0aWFsTG9hZENvbXBsZXRlKCkge1xuICBpc0luaXRpYWxMb2FkID0gZmFsc2U7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcHBseUluZGl2aWR1YWxIaWRpbmcoKSB7XG4gIGlmICghaXNJbmRpdmlkdWFsTW9kZUVuYWJsZWQoKSkge1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoYC4ke0NTU19DTEFTU0VTLklORElWSURVQUxfRElNTUVEfSwgLiR7Q1NTX0NMQVNTRVMuSU5ESVZJRFVBTF9ISURERU59YCkuZm9yRWFjaCgoZWwpID0+IHtcbiAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoQ1NTX0NMQVNTRVMuSU5ESVZJRFVBTF9ESU1NRUQsIENTU19DTEFTU0VTLklORElWSURVQUxfSElEREVOKTtcbiAgICB9KTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBFbmhhbmNlZCBkZWJ1ZyBsb2dnaW5nXG4gIGxvZ0RlYnVnKCc9PT0gYXBwbHlJbmRpdmlkdWFsSGlkaW5nIGNhbGxlZCA9PT0nKTtcbiAgbG9nRGVidWcoYEluaXRpYWwgbG9hZDogJHtpc0luaXRpYWxMb2FkfWApO1xuICBsb2dEZWJ1ZyhgTGF6eSBwcm9jZXNzaW5nIGVuYWJsZWQ6ICR7SU5URVJTRUNUSU9OX09CU0VSVkVSX0NPTkZJRy5FTkFCTEVfTEFaWV9QUk9DRVNTSU5HfWApO1xuICBsb2dEZWJ1ZyhgVmlzaWJsZSB2aWRlb3MgY291bnQ6ICR7Z2V0VmlzaWJsZVZpZGVvcygpLnNpemV9YCk7XG5cbiAgaW5kaXZpZHVhbEhpZGluZ0l0ZXJhdGlvbiArPSAxO1xuICBjb25zdCB0b2tlbiA9IGluZGl2aWR1YWxIaWRpbmdJdGVyYXRpb247XG5cbiAgbGV0IHZpZGVvSWRzO1xuXG4gIGlmIChJTlRFUlNFQ1RJT05fT0JTRVJWRVJfQ09ORklHLkVOQUJMRV9MQVpZX1BST0NFU1NJTkcgJiYgIWlzSW5pdGlhbExvYWQpIHtcbiAgICAvLyBMYXp5IHByb2Nlc3NpbmcgZm9yIHN1YnNlcXVlbnQgdXBkYXRlcyAoYWZ0ZXIgaW5pdGlhbCBsb2FkKVxuICAgIGNvbnN0IHZpc2libGVDb250YWluZXJzID0gZ2V0VmlzaWJsZVZpZGVvcygpO1xuICAgIGNvbnN0IHZpc2libGVJZHMgPSBuZXcgU2V0KCk7XG5cbiAgICB2aXNpYmxlQ29udGFpbmVycy5mb3JFYWNoKGNvbnRhaW5lciA9PiB7XG4gICAgICAvLyBBZGQgbnVsbCBjaGVjayBhbmQgdmVyaWZ5IGNvbnRhaW5lciBpcyBzdGlsbCBjb25uZWN0ZWQgdG8gRE9NXG4gICAgICBpZiAoIWNvbnRhaW5lciB8fCAhY29udGFpbmVyLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgdmlkZW9JZCA9IGNvbnRhaW5lci5nZXRBdHRyaWJ1dGUoJ2RhdGEteXRod3YtdmlkZW8taWQnKTtcbiAgICAgICAgaWYgKHZpZGVvSWQpIHZpc2libGVJZHMuYWRkKHZpZGVvSWQpO1xuXG4gICAgICAgIC8vIEFsc28gY2hlY2sgZm9yIGxpbmtzIHdpdGhpbiB2aXNpYmxlIGNvbnRhaW5lcnNcbiAgICAgICAgY29uc3QgbGlua3MgPSBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnYVtocmVmKj1cIi93YXRjaD92PVwiXSwgYVtocmVmKj1cIi9zaG9ydHMvXCJdJyk7XG4gICAgICAgIGxpbmtzLmZvckVhY2gobGluayA9PiB7XG4gICAgICAgICAgY29uc3QgaHJlZiA9IGxpbmsuZ2V0QXR0cmlidXRlKCdocmVmJyk7XG4gICAgICAgICAgaWYgKGhyZWYpIHtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gZXh0cmFjdFZpZGVvSWRGcm9tSHJlZihocmVmKTtcbiAgICAgICAgICAgIGlmIChpZCkgdmlzaWJsZUlkcy5hZGQoaWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAvLyBDb250YWluZXIgbWF5IGhhdmUgYmVlbiByZW1vdmVkIGZyb20gRE9NIGR1cmluZyBpdGVyYXRpb25cbiAgICAgICAgbG9nRGVidWcoJ0Vycm9yIHByb2Nlc3NpbmcgY29udGFpbmVyIGluIGxhenkgbW9kZTonLCBlcnJvcik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB2aWRlb0lkcyA9IEFycmF5LmZyb20odmlzaWJsZUlkcyk7XG4gICAgbG9nRGVidWcoYFByb2Nlc3NpbmcgJHt2aWRlb0lkcy5sZW5ndGh9IHZpc2libGUgdmlkZW9zIChsYXp5IG1vZGUpYCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gSW5pdGlhbCBsb2FkIG9yIGxhenkgcHJvY2Vzc2luZyBkaXNhYmxlZDogcHJvY2VzcyBBTEwgdmlkZW9zXG4gICAgdmlkZW9JZHMgPSBjb2xsZWN0VmlzaWJsZVZpZGVvSWRzKCk7XG4gICAgbG9nRGVidWcoYFByb2Nlc3NpbmcgJHt2aWRlb0lkcy5sZW5ndGh9IHRvdGFsIHZpZGVvcyAoJHtpc0luaXRpYWxMb2FkID8gJ2luaXRpYWwgbG9hZCcgOiAnZnVsbCBtb2RlJ30pYCk7XG4gIH1cblxuICBpZiAodmlkZW9JZHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBmZXRjaEhpZGRlblZpZGVvU3RhdGVzKHZpZGVvSWRzKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dEZWJ1ZygnRmFpbGVkIHRvIGZldGNoIGhpZGRlbiB2aWRlbyBzdGF0ZXMnLCBlcnJvcik7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHRva2VuICE9PSBpbmRpdmlkdWFsSGlkaW5nSXRlcmF0aW9uKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmlkZW9JZHMuZm9yRWFjaCgodmlkZW9JZCkgPT4ge1xuICAgIC8vIFNraXAgaWYgbm8gY2FjaGVkIHJlY29yZCAtIGV5ZSBidXR0b24gd2lsbCBoYW5kbGUgaW5pdGlhbCBmZXRjaCBhbmQgc3luY1xuICAgIC8vIFRoaXMgcHJldmVudHMgYXBwbHlpbmcgc3RhbGUvaW5jb3JyZWN0IHN0YXRlIGJlZm9yZSBjYWNoZSBpcyBwb3B1bGF0ZWRcbiAgICBpZiAoIWhhc0NhY2hlZFZpZGVvKHZpZGVvSWQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcmVjb3JkID0gZ2V0Q2FjaGVkSGlkZGVuVmlkZW8odmlkZW9JZCk7XG4gICAgY29uc3Qgc3RhdGUgPSByZWNvcmQ/LnN0YXRlIHx8ICdub3JtYWwnO1xuICAgIGNvbnN0IGNvbnRhaW5lcnMgPSBmaW5kVmlkZW9Db250YWluZXJzKHZpZGVvSWQpO1xuXG4gICAgY29udGFpbmVycy5mb3JFYWNoKChjb250YWluZXIpID0+IHtcbiAgICAgIC8vIE9uIGluaXRpYWwgbG9hZCwgcHJvY2VzcyBhbGwgY29udGFpbmVyc1xuICAgICAgLy8gQWZ0ZXIgaW5pdGlhbCBsb2FkLCBvbmx5IHByb2Nlc3MgdmlzaWJsZSBjb250YWluZXJzIGlmIGxhenkgcHJvY2Vzc2luZyBlbmFibGVkXG4gICAgICBjb25zdCBzaG91bGRQcm9jZXNzID0gIUlOVEVSU0VDVElPTl9PQlNFUlZFUl9DT05GSUcuRU5BQkxFX0xBWllfUFJPQ0VTU0lORyB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzSW5pdGlhbExvYWQgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc1ZpZGVvVmlzaWJsZShjb250YWluZXIpO1xuXG4gICAgICBpZiAoc2hvdWxkUHJvY2Vzcykge1xuICAgICAgICBzeW5jSW5kaXZpZHVhbENvbnRhaW5lclN0YXRlKGNvbnRhaW5lciwgc3RhdGUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcblxuICAvLyBNYXJrIGluaXRpYWwgbG9hZCBhcyBjb21wbGV0ZVxuICBpZiAoaXNJbml0aWFsTG9hZCkge1xuICAgIGlzSW5pdGlhbExvYWQgPSBmYWxzZTtcbiAgICBsb2dEZWJ1ZygnSW5pdGlhbCBsb2FkIGNvbXBsZXRlLCBzd2l0Y2hpbmcgdG8gbGF6eSBwcm9jZXNzaW5nIG1vZGUnKTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgQ1NTX0NMQVNTRVMgfSBmcm9tICcuLi91dGlscy9jb25zdGFudHMuanMnO1xuaW1wb3J0IHsgZ2V0U2hvcnRzU3RhdGUgfSBmcm9tICcuLi9zdG9yYWdlL3NldHRpbmdzLmpzJztcbmltcG9ydCB7IGRldGVybWluZVlvdXR1YmVTZWN0aW9uIH0gZnJvbSAnLi4vZGV0ZWN0aW9uL3NlY3Rpb25EZXRlY3Rvci5qcyc7XG5pbXBvcnQgeyBmaW5kU2hvcnRzQ29udGFpbmVycyB9IGZyb20gJy4uL2RldGVjdGlvbi9zaG9ydHNEZXRlY3Rvci5qcyc7XG5pbXBvcnQgeyByZW1vdmVDbGFzc2VzRnJvbUFsbCB9IGZyb20gJy4uL3V0aWxzL2Nzc0hlbHBlcnMuanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlQ2xhc3NPblNob3J0c0l0ZW1zKCkge1xuICByZW1vdmVDbGFzc2VzRnJvbUFsbChDU1NfQ0xBU1NFUy5TSE9SVFNfRElNTUVELCBDU1NfQ0xBU1NFUy5TSE9SVFNfSElEREVOKTtcblxuICBjb25zdCBzZWN0aW9uID0gZGV0ZXJtaW5lWW91dHViZVNlY3Rpb24oKTtcbiAgY29uc3Qgc3RhdGUgPSBnZXRTaG9ydHNTdGF0ZShzZWN0aW9uKSB8fCAnbm9ybWFsJztcblxuICBpZiAoc3RhdGUgPT09ICdub3JtYWwnKSByZXR1cm47XG5cbiAgY29uc3Qgc2hvcnRzQ29udGFpbmVycyA9IGZpbmRTaG9ydHNDb250YWluZXJzKCk7XG5cbiAgc2hvcnRzQ29udGFpbmVycy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgaWYgKHN0YXRlID09PSAnZGltbWVkJykge1xuICAgICAgaXRlbS5jbGFzc0xpc3QuYWRkKENTU19DTEFTU0VTLlNIT1JUU19ESU1NRUQpO1xuICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09ICdoaWRkZW4nKSB7XG4gICAgICBpdGVtLmNsYXNzTGlzdC5hZGQoQ1NTX0NMQVNTRVMuU0hPUlRTX0hJRERFTik7XG4gICAgfVxuICB9KTtcbn1cbiIsImltcG9ydCB7IENTU19DTEFTU0VTIH0gZnJvbSAnLi4vdXRpbHMvY29uc3RhbnRzLmpzJztcbmltcG9ydCB7IGdldFdhdGNoZWRTdGF0ZSB9IGZyb20gJy4uL3N0b3JhZ2Uvc2V0dGluZ3MuanMnO1xuaW1wb3J0IHsgZGV0ZXJtaW5lWW91dHViZVNlY3Rpb24gfSBmcm9tICcuLi9kZXRlY3Rpb24vc2VjdGlvbkRldGVjdG9yLmpzJztcbmltcG9ydCB7IGZpbmRXYXRjaGVkRWxlbWVudHMgfSBmcm9tICcuLi9kZXRlY3Rpb24vdmlkZW9EZXRlY3Rvci5qcyc7XG5pbXBvcnQgeyByZW1vdmVDbGFzc2VzRnJvbUFsbCB9IGZyb20gJy4uL3V0aWxzL2Nzc0hlbHBlcnMuanMnO1xuaW1wb3J0IHsgY2FjaGVkQ2xvc2VzdCB9IGZyb20gJy4uL3V0aWxzL2RvbUNhY2hlLmpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUNsYXNzT25XYXRjaGVkSXRlbXMoKSB7XG4gIHJlbW92ZUNsYXNzZXNGcm9tQWxsKENTU19DTEFTU0VTLldBVENIRURfRElNTUVELCBDU1NfQ0xBU1NFUy5XQVRDSEVEX0hJRERFTik7XG5cbiAgaWYgKHdpbmRvdy5sb2NhdGlvbi5ocmVmLmluZGV4T2YoJy9mZWVkL2hpc3RvcnknKSA+PSAwKSByZXR1cm47XG5cbiAgY29uc3Qgc2VjdGlvbiA9IGRldGVybWluZVlvdXR1YmVTZWN0aW9uKCk7XG4gIGNvbnN0IHN0YXRlID0gZ2V0V2F0Y2hlZFN0YXRlKHNlY3Rpb24pIHx8ICdub3JtYWwnO1xuXG4gIGlmIChzdGF0ZSA9PT0gJ25vcm1hbCcpIHJldHVybjtcblxuICBmaW5kV2F0Y2hlZEVsZW1lbnRzKCkuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgIGxldCB3YXRjaGVkSXRlbTtcbiAgICBsZXQgZGltbWVkSXRlbTtcblxuICAgIGlmIChzZWN0aW9uID09PSAnc3Vic2NyaXB0aW9ucycpIHtcbiAgICAgIC8vIFVzZSBjYWNoZWQgY2xvc2VzdCBmb3IgYWxsIGxvb2t1cHNcbiAgICAgIHdhdGNoZWRJdGVtID0gKFxuICAgICAgICBjYWNoZWRDbG9zZXN0KGl0ZW0sICcueXRkLWdyaWQtcmVuZGVyZXInKSB8fFxuICAgICAgICBjYWNoZWRDbG9zZXN0KGl0ZW0sICcueXRkLWl0ZW0tc2VjdGlvbi1yZW5kZXJlcicpIHx8XG4gICAgICAgIGNhY2hlZENsb3Nlc3QoaXRlbSwgJy55dGQtcmljaC1ncmlkLXJvdycpIHx8XG4gICAgICAgIGNhY2hlZENsb3Nlc3QoaXRlbSwgJy55dGQtcmljaC1ncmlkLXJlbmRlcmVyJykgfHxcbiAgICAgICAgY2FjaGVkQ2xvc2VzdChpdGVtLCAnI2dyaWQtY29udGFpbmVyJylcbiAgICAgICk7XG5cbiAgICAgIGlmICh3YXRjaGVkSXRlbT8uY2xhc3NMaXN0LmNvbnRhaW5zKCd5dGQtaXRlbS1zZWN0aW9uLXJlbmRlcmVyJykpIHtcbiAgICAgICAgY2FjaGVkQ2xvc2VzdCh3YXRjaGVkSXRlbSwgJ3l0ZC1pdGVtLXNlY3Rpb24tcmVuZGVyZXInKT8uY2xhc3NMaXN0LmFkZChDU1NfQ0xBU1NFUy5ISURERU5fUk9XX1BBUkVOVCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChzZWN0aW9uID09PSAncGxheWxpc3QnKSB7XG4gICAgICB3YXRjaGVkSXRlbSA9IGNhY2hlZENsb3Nlc3QoaXRlbSwgJ3l0ZC1wbGF5bGlzdC12aWRlby1yZW5kZXJlcicpO1xuICAgIH0gZWxzZSBpZiAoc2VjdGlvbiA9PT0gJ3dhdGNoJykge1xuICAgICAgd2F0Y2hlZEl0ZW0gPSBjYWNoZWRDbG9zZXN0KGl0ZW0sICd5dGQtY29tcGFjdC12aWRlby1yZW5kZXJlcicpO1xuXG4gICAgICBpZiAoY2FjaGVkQ2xvc2VzdCh3YXRjaGVkSXRlbSwgJ3l0ZC1jb21wYWN0LWF1dG9wbGF5LXJlbmRlcmVyJykpIHtcbiAgICAgICAgd2F0Y2hlZEl0ZW0gPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB3YXRjaGVkSXRlbUluUGxheWxpc3QgPSBjYWNoZWRDbG9zZXN0KGl0ZW0sICd5dGQtcGxheWxpc3QtcGFuZWwtdmlkZW8tcmVuZGVyZXInKTtcbiAgICAgIGlmICghd2F0Y2hlZEl0ZW0gJiYgd2F0Y2hlZEl0ZW1JblBsYXlsaXN0KSB7XG4gICAgICAgIGRpbW1lZEl0ZW0gPSB3YXRjaGVkSXRlbUluUGxheWxpc3Q7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHdhdGNoZWRJdGVtID0gKFxuICAgICAgICBjYWNoZWRDbG9zZXN0KGl0ZW0sICd5dGQtcmljaC1pdGVtLXJlbmRlcmVyJykgfHxcbiAgICAgICAgY2FjaGVkQ2xvc2VzdChpdGVtLCAneXRkLXZpZGVvLXJlbmRlcmVyJykgfHxcbiAgICAgICAgY2FjaGVkQ2xvc2VzdChpdGVtLCAneXRkLWdyaWQtdmlkZW8tcmVuZGVyZXInKSB8fFxuICAgICAgICBjYWNoZWRDbG9zZXN0KGl0ZW0sICd5dG0tdmlkZW8td2l0aC1jb250ZXh0LXJlbmRlcmVyJykgfHxcbiAgICAgICAgY2FjaGVkQ2xvc2VzdChpdGVtLCAneXRtLWl0ZW0tc2VjdGlvbi1yZW5kZXJlcicpXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICh3YXRjaGVkSXRlbSkge1xuICAgICAgaWYgKHN0YXRlID09PSAnZGltbWVkJykge1xuICAgICAgICB3YXRjaGVkSXRlbS5jbGFzc0xpc3QuYWRkKENTU19DTEFTU0VTLldBVENIRURfRElNTUVEKTtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09ICdoaWRkZW4nKSB7XG4gICAgICAgIHdhdGNoZWRJdGVtLmNsYXNzTGlzdC5hZGQoQ1NTX0NMQVNTRVMuV0FUQ0hFRF9ISURERU4pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChkaW1tZWRJdGVtICYmIChzdGF0ZSA9PT0gJ2RpbW1lZCcgfHwgc3RhdGUgPT09ICdoaWRkZW4nKSkge1xuICAgICAgZGltbWVkSXRlbS5jbGFzc0xpc3QuYWRkKENTU19DTEFTU0VTLldBVENIRURfRElNTUVEKTtcbiAgICB9XG4gIH0pO1xufVxuIiwiaW1wb3J0IHsgSU5URVJTRUNUSU9OX09CU0VSVkVSX0NPTkZJRywgU0VMRUNUT1JfU1RSSU5HUyB9IGZyb20gJy4uL3V0aWxzL2NvbnN0YW50cy5qcyc7XG5pbXBvcnQgeyBwcm9jZXNzSW50ZXJzZWN0aW9uRW50cmllcywgY2xlYXJWaXNpYmlsaXR5VHJhY2tpbmcgfSBmcm9tICcuLi91dGlscy92aXNpYmlsaXR5VHJhY2tlci5qcyc7XG5pbXBvcnQgeyBkZWJvdW5jZSB9IGZyb20gJy4uL3V0aWxzL2RlYm91bmNlLmpzJztcbmltcG9ydCB7IGxvZ0RlYnVnIH0gZnJvbSAnLi4vdXRpbHMvbG9nZ2VyLmpzJztcbmltcG9ydCB7IGNhY2hlZERvY3VtZW50UXVlcnkgfSBmcm9tICcuLi91dGlscy9kb21DYWNoZS5qcyc7XG5cbmxldCBpbnRlcnNlY3Rpb25PYnNlcnZlciA9IG51bGw7XG5sZXQgZGVib3VuY2VkUHJvY2Vzc0VudHJpZXMgPSBudWxsO1xubGV0IGJhdGNoZWRFbnRyaWVzID0gW107XG5cbi8qKlxuICogQ3JlYXRlIGFuZCBjb25maWd1cmUgSW50ZXJzZWN0aW9uT2JzZXJ2ZXJcbiAqIEByZXR1cm5zIHtJbnRlcnNlY3Rpb25PYnNlcnZlcn1cbiAqL1xuZnVuY3Rpb24gY3JlYXRlSW50ZXJzZWN0aW9uT2JzZXJ2ZXIoKSB7XG4gIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgcm9vdDogbnVsbCwgLy8gdmlld3BvcnRcbiAgICByb290TWFyZ2luOiBJTlRFUlNFQ1RJT05fT0JTRVJWRVJfQ09ORklHLlJPT1RfTUFSR0lOLFxuICAgIHRocmVzaG9sZDogSU5URVJTRUNUSU9OX09CU0VSVkVSX0NPTkZJRy5USFJFU0hPTERcbiAgfTtcblxuICAvLyBCYXRjaCBwcm9jZXNzIGludGVyc2VjdGlvbiBjaGFuZ2VzXG4gIGRlYm91bmNlZFByb2Nlc3NFbnRyaWVzID0gZGVib3VuY2UoKCkgPT4ge1xuICAgIGlmIChiYXRjaGVkRW50cmllcy5sZW5ndGggPiAwKSB7XG4gICAgICBwcm9jZXNzSW50ZXJzZWN0aW9uRW50cmllcyhbLi4uYmF0Y2hlZEVudHJpZXNdKTtcbiAgICAgIGJhdGNoZWRFbnRyaWVzLmxlbmd0aCA9IDA7XG4gICAgfVxuICB9LCBJTlRFUlNFQ1RJT05fT0JTRVJWRVJfQ09ORklHLkJBVENIX0RFTEFZKTtcblxuICBjb25zdCBvYnNlcnZlciA9IG5ldyBJbnRlcnNlY3Rpb25PYnNlcnZlcigoZW50cmllcykgPT4ge1xuICAgIGJhdGNoZWRFbnRyaWVzLnB1c2goLi4uZW50cmllcyk7XG4gICAgZGVib3VuY2VkUHJvY2Vzc0VudHJpZXMoKTtcbiAgfSwgb3B0aW9ucyk7XG5cbiAgbG9nRGVidWcoJ0ludGVyc2VjdGlvbk9ic2VydmVyIGNyZWF0ZWQgd2l0aCBvcHRpb25zOicsIG9wdGlvbnMpO1xuICByZXR1cm4gb2JzZXJ2ZXI7XG59XG5cbi8qKlxuICogU3RhcnQgb2JzZXJ2aW5nIHZpZGVvIGNvbnRhaW5lcnNcbiAqIEBwYXJhbSB7QXJyYXk8RWxlbWVudD59IGNvbnRhaW5lcnMgLSBPcHRpb25hbCBzcGVjaWZpYyBjb250YWluZXJzIHRvIG9ic2VydmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9ic2VydmVWaWRlb0NvbnRhaW5lcnMoY29udGFpbmVycyA9IG51bGwpIHtcbiAgaWYgKCFpbnRlcnNlY3Rpb25PYnNlcnZlcikge1xuICAgIGxvZ0RlYnVnKCdObyBJbnRlcnNlY3Rpb25PYnNlcnZlciBpbnN0YW5jZSBhdmFpbGFibGUnKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBlbGVtZW50c1RvT2JzZXJ2ZSA9IGNvbnRhaW5lcnMgfHwgY2FjaGVkRG9jdW1lbnRRdWVyeShTRUxFQ1RPUl9TVFJJTkdTLlZJREVPX0NPTlRBSU5FUlMpO1xuXG4gIGVsZW1lbnRzVG9PYnNlcnZlLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGludGVyc2VjdGlvbk9ic2VydmVyLm9ic2VydmUoZWxlbWVudCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ0RlYnVnKCdGYWlsZWQgdG8gb2JzZXJ2ZSBlbGVtZW50OicsIGVycm9yKTtcbiAgICB9XG4gIH0pO1xuXG4gIGxvZ0RlYnVnKGBPYnNlcnZpbmcgJHtlbGVtZW50c1RvT2JzZXJ2ZS5sZW5ndGh9IHZpZGVvIGNvbnRhaW5lcnNgKTtcbn1cblxuLyoqXG4gKiBTdG9wIG9ic2VydmluZyBzcGVjaWZpYyBlbGVtZW50c1xuICogQHBhcmFtIHtBcnJheTxFbGVtZW50Pn0gZWxlbWVudHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVub2JzZXJ2ZVZpZGVvQ29udGFpbmVycyhlbGVtZW50cykge1xuICBpZiAoIWludGVyc2VjdGlvbk9ic2VydmVyKSByZXR1cm47XG5cbiAgZWxlbWVudHMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICB0cnkge1xuICAgICAgaW50ZXJzZWN0aW9uT2JzZXJ2ZXIudW5vYnNlcnZlKGVsZW1lbnQpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2dEZWJ1ZygnRmFpbGVkIHRvIHVub2JzZXJ2ZSBlbGVtZW50OicsIGVycm9yKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIFNldHVwIEludGVyc2VjdGlvbk9ic2VydmVyIGZvciB0aGUgcGFnZVxuICogSW5pdGlhbCBvYnNlcnZhdGlvbiBvZiBhbGwgdmlkZW8gY29udGFpbmVyc1xuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBJbnRlcnNlY3Rpb25PYnNlcnZlcigpIHtcbiAgaWYgKCFJTlRFUlNFQ1RJT05fT0JTRVJWRVJfQ09ORklHLkVOQUJMRV9MQVpZX1BST0NFU1NJTkcpIHtcbiAgICBsb2dEZWJ1ZygnTGF6eSBwcm9jZXNzaW5nIGRpc2FibGVkLCBza2lwcGluZyBJbnRlcnNlY3Rpb25PYnNlcnZlciBzZXR1cCcpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gQ2xlYXIgZXhpc3Rpbmcgb2JzZXJ2ZXIgaWYgYW55XG4gIGRpc2Nvbm5lY3RJbnRlcnNlY3Rpb25PYnNlcnZlcigpO1xuXG4gIC8vIENyZWF0ZSBuZXcgb2JzZXJ2ZXJcbiAgaW50ZXJzZWN0aW9uT2JzZXJ2ZXIgPSBjcmVhdGVJbnRlcnNlY3Rpb25PYnNlcnZlcigpO1xuXG4gIC8vIE9ic2VydmUgaW5pdGlhbCBjb250YWluZXJzXG4gIG9ic2VydmVWaWRlb0NvbnRhaW5lcnMoKTtcblxuICByZXR1cm4gaW50ZXJzZWN0aW9uT2JzZXJ2ZXI7XG59XG5cbi8qKlxuICogRGlzY29ubmVjdCBhbmQgY2xlYW51cCBJbnRlcnNlY3Rpb25PYnNlcnZlclxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlzY29ubmVjdEludGVyc2VjdGlvbk9ic2VydmVyKCkge1xuICBpZiAoaW50ZXJzZWN0aW9uT2JzZXJ2ZXIpIHtcbiAgICBpbnRlcnNlY3Rpb25PYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgaW50ZXJzZWN0aW9uT2JzZXJ2ZXIgPSBudWxsO1xuICAgIGNsZWFyVmlzaWJpbGl0eVRyYWNraW5nKCk7XG4gICAgbG9nRGVidWcoJ0ludGVyc2VjdGlvbk9ic2VydmVyIGRpc2Nvbm5lY3RlZCcpO1xuICB9XG5cbiAgLy8gQ2xlYXIgcGVuZGluZyBiYXRjaGVkIGVudHJpZXMgdG8gcHJldmVudCBtZW1vcnkgbGVha3NcbiAgYmF0Y2hlZEVudHJpZXMubGVuZ3RoID0gMDtcblxuICAvLyBDYW5jZWwgYW55IHBlbmRpbmcgZGVib3VuY2VkIGNhbGxzXG4gIGlmIChkZWJvdW5jZWRQcm9jZXNzRW50cmllcyAmJiB0eXBlb2YgZGVib3VuY2VkUHJvY2Vzc0VudHJpZXMuY2FuY2VsID09PSAnZnVuY3Rpb24nKSB7XG4gICAgZGVib3VuY2VkUHJvY2Vzc0VudHJpZXMuY2FuY2VsKCk7XG4gIH1cbiAgZGVib3VuY2VkUHJvY2Vzc0VudHJpZXMgPSBudWxsO1xufVxuXG4vKipcbiAqIEdldCBjdXJyZW50IEludGVyc2VjdGlvbk9ic2VydmVyIGluc3RhbmNlXG4gKiBAcmV0dXJucyB7SW50ZXJzZWN0aW9uT2JzZXJ2ZXJ8bnVsbH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEludGVyc2VjdGlvbk9ic2VydmVyKCkge1xuICByZXR1cm4gaW50ZXJzZWN0aW9uT2JzZXJ2ZXI7XG59XG5cbi8qKlxuICogUmVjb25uZWN0IG9ic2VydmVyIGFmdGVyIHBhZ2UgbmF2aWdhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVjb25uZWN0SW50ZXJzZWN0aW9uT2JzZXJ2ZXIoKSB7XG4gIGRpc2Nvbm5lY3RJbnRlcnNlY3Rpb25PYnNlcnZlcigpO1xuICBzZXR1cEludGVyc2VjdGlvbk9ic2VydmVyKCk7XG59XG4iLCJpbXBvcnQgeyBkZWJvdW5jZSB9IGZyb20gJy4uL3V0aWxzL2RlYm91bmNlLmpzJztcbmltcG9ydCB7IENTU19DTEFTU0VTLCBERUJVRywgQ0FDSEVfQ09ORklHIH0gZnJvbSAnLi4vdXRpbHMvY29uc3RhbnRzLmpzJztcbmltcG9ydCB7IGludmFsaWRhdGVFbGVtZW50Q2FjaGUsIGludmFsaWRhdGVWaWRlb0NvbnRhaW5lckNhY2hlcywgY2xlYXJBbGxDYWNoZXMsIGxvZ0NhY2hlU3RhdHMgfSBmcm9tICcuLi91dGlscy9kb21DYWNoZS5qcyc7XG5pbXBvcnQgeyBvYnNlcnZlVmlkZW9Db250YWluZXJzLCB1bm9ic2VydmVWaWRlb0NvbnRhaW5lcnMgfSBmcm9tICcuL2ludGVyc2VjdGlvbk9ic2VydmVyLmpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwTXV0YXRpb25PYnNlcnZlcihhcHBseUhpZGluZykge1xuICBjb25zdCBkZWJvdW5jZWRBcHBseUhpZGluZyA9IGRlYm91bmNlKGFwcGx5SGlkaW5nLCAyNTApO1xuXG4gIGNvbnN0IG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoKG11dGF0aW9ucykgPT4ge1xuICAgIGxldCBzaG91bGRBcHBseUhpZGluZyA9IGZhbHNlO1xuICAgIGxldCBoYXNWaWRlb0NvbnRhaW5lckNoYW5nZXMgPSBmYWxzZTtcbiAgICBsZXQgaGFzTWFqb3JET01DaGFuZ2VzID0gZmFsc2U7XG4gICAgY29uc3QgYWRkZWRDb250YWluZXJzID0gW107XG4gICAgY29uc3QgcmVtb3ZlZENvbnRhaW5lcnMgPSBbXTtcblxuICAgIG11dGF0aW9ucy5mb3JFYWNoKG11dGF0aW9uID0+IHtcbiAgICAgIGlmIChtdXRhdGlvbi50eXBlID09PSAnYXR0cmlidXRlcycgJiYgbXV0YXRpb24uYXR0cmlidXRlTmFtZSA9PT0gJ2FyaWEtaGlkZGVuJykge1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBtdXRhdGlvbi50YXJnZXQ7XG4gICAgICAgIGlmICh0YXJnZXQuZ2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicpID09PSAndHJ1ZScgJiZcbiAgICAgICAgICAgIHRhcmdldC5xdWVyeVNlbGVjdG9yKGAuJHtDU1NfQ0xBU1NFUy5FWUVfQlVUVE9OfWApKSB7XG4gICAgICAgICAgdGFyZ2V0LnJlbW92ZUF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChtdXRhdGlvbi50eXBlID09PSAnY2hpbGRMaXN0Jykge1xuICAgICAgICBzaG91bGRBcHBseUhpZGluZyA9IHRydWU7XG5cbiAgICAgICAgLy8gVHJhY2sgcmVtb3ZlZCB2aWRlbyBjb250YWluZXJzXG4gICAgICAgIG11dGF0aW9uLnJlbW92ZWROb2Rlcy5mb3JFYWNoKG5vZGUgPT4ge1xuICAgICAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgaW52YWxpZGF0ZUVsZW1lbnRDYWNoZShub2RlKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcmVtb3ZlZCBub2RlIGlzIGEgdmlkZW8gY29udGFpbmVyXG4gICAgICAgICAgICBjb25zdCBpc1ZpZGVvQ29udGFpbmVyID0gbm9kZS5tYXRjaGVzICYmIChcbiAgICAgICAgICAgICAgbm9kZS5tYXRjaGVzKCd5dGQtcmljaC1pdGVtLXJlbmRlcmVyJykgfHxcbiAgICAgICAgICAgICAgbm9kZS5tYXRjaGVzKCd5dGQtdmlkZW8tcmVuZGVyZXInKSB8fFxuICAgICAgICAgICAgICBub2RlLm1hdGNoZXMoJ3l0ZC1ncmlkLXZpZGVvLXJlbmRlcmVyJykgfHxcbiAgICAgICAgICAgICAgbm9kZS5tYXRjaGVzKCd5dGQtY29tcGFjdC12aWRlby1yZW5kZXJlcicpXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBpZiAoaXNWaWRlb0NvbnRhaW5lcikge1xuICAgICAgICAgICAgICBoYXNWaWRlb0NvbnRhaW5lckNoYW5nZXMgPSB0cnVlO1xuICAgICAgICAgICAgICByZW1vdmVkQ29udGFpbmVycy5wdXNoKG5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVHJhY2sgYWRkZWQgdmlkZW8gY29udGFpbmVyc1xuICAgICAgICBtdXRhdGlvbi5hZGRlZE5vZGVzLmZvckVhY2gobm9kZSA9PiB7XG4gICAgICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICBjb25zdCBpc1ZpZGVvQ29udGFpbmVyID0gbm9kZS5tYXRjaGVzICYmIChcbiAgICAgICAgICAgICAgbm9kZS5tYXRjaGVzKCd5dGQtcmljaC1pdGVtLXJlbmRlcmVyJykgfHxcbiAgICAgICAgICAgICAgbm9kZS5tYXRjaGVzKCd5dGQtdmlkZW8tcmVuZGVyZXInKSB8fFxuICAgICAgICAgICAgICBub2RlLm1hdGNoZXMoJ3l0ZC1ncmlkLXZpZGVvLXJlbmRlcmVyJykgfHxcbiAgICAgICAgICAgICAgbm9kZS5tYXRjaGVzKCd5dGQtY29tcGFjdC12aWRlby1yZW5kZXJlcicpXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBpZiAoaXNWaWRlb0NvbnRhaW5lcikge1xuICAgICAgICAgICAgICBoYXNWaWRlb0NvbnRhaW5lckNoYW5nZXMgPSB0cnVlO1xuICAgICAgICAgICAgICBhZGRlZENvbnRhaW5lcnMucHVzaChub2RlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIG1ham9yIHN0cnVjdHVyYWwgY2hhbmdlcyAocGFnZSBzZWN0aW9ucylcbiAgICAgICAgICAgIGNvbnN0IGlzTWFqb3JTdHJ1Y3R1cmUgPSBub2RlLm1hdGNoZXMgJiYgKFxuICAgICAgICAgICAgICBub2RlLm1hdGNoZXMoJ3l0ZC1icm93c2UnKSB8fFxuICAgICAgICAgICAgICBub2RlLm1hdGNoZXMoJ3l0ZC13YXRjaC1mbGV4eScpIHx8XG4gICAgICAgICAgICAgIG5vZGUubWF0Y2hlcygneXRkLXNlYXJjaCcpXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBpZiAoaXNNYWpvclN0cnVjdHVyZSkge1xuICAgICAgICAgICAgICBoYXNNYWpvckRPTUNoYW5nZXMgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBVcGRhdGUgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgdHJhY2tpbmdcbiAgICBpZiAoYWRkZWRDb250YWluZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIG9ic2VydmVWaWRlb0NvbnRhaW5lcnMoYWRkZWRDb250YWluZXJzKTtcbiAgICB9XG4gICAgaWYgKHJlbW92ZWRDb250YWluZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIHVub2JzZXJ2ZVZpZGVvQ29udGFpbmVycyhyZW1vdmVkQ29udGFpbmVycyk7XG4gICAgfVxuXG4gICAgLy8gR3JhbnVsYXIgY2FjaGUgaW52YWxpZGF0aW9uIGJhc2VkIG9uIGNoYW5nZSB0eXBlXG4gICAgaWYgKGhhc01ham9yRE9NQ2hhbmdlcykge1xuICAgICAgLy8gTWFqb3IgcGFnZSBzdHJ1Y3R1cmUgY2hhbmdlIC0gY2xlYXIgYWxsIGNhY2hlc1xuICAgICAgY2xlYXJBbGxDYWNoZXMoKTtcbiAgICB9IGVsc2UgaWYgKGhhc1ZpZGVvQ29udGFpbmVyQ2hhbmdlcykge1xuICAgICAgLy8gVmlkZW8gY29udGFpbmVyIGNoYW5nZXMgLSBvbmx5IGludmFsaWRhdGUgdmlkZW8tcmVsYXRlZCBjYWNoZXNcbiAgICAgIGludmFsaWRhdGVWaWRlb0NvbnRhaW5lckNhY2hlcygpO1xuICAgIH1cblxuICAgIGlmIChzaG91bGRBcHBseUhpZGluZykge1xuICAgICAgaWYgKG11dGF0aW9ucy5sZW5ndGggPT09IDEgJiZcbiAgICAgICAgICAobXV0YXRpb25zWzBdLnRhcmdldC5jbGFzc0xpc3Q/LmNvbnRhaW5zKENTU19DTEFTU0VTLldBVENIRURfRElNTUVEKSB8fFxuICAgICAgICAgICBtdXRhdGlvbnNbMF0udGFyZ2V0LmNsYXNzTGlzdD8uY29udGFpbnMoQ1NTX0NMQVNTRVMuV0FUQ0hFRF9ISURERU4pIHx8XG4gICAgICAgICAgIG11dGF0aW9uc1swXS50YXJnZXQuY2xhc3NMaXN0Py5jb250YWlucyhDU1NfQ0xBU1NFUy5TSE9SVFNfRElNTUVEKSB8fFxuICAgICAgICAgICBtdXRhdGlvbnNbMF0udGFyZ2V0LmNsYXNzTGlzdD8uY29udGFpbnMoQ1NTX0NMQVNTRVMuU0hPUlRTX0hJRERFTikpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGRlYm91bmNlZEFwcGx5SGlkaW5nKCk7XG4gICAgfVxuICB9KTtcblxuICBvYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmJvZHksIHtcbiAgICBjaGlsZExpc3Q6IHRydWUsXG4gICAgc3VidHJlZTogdHJ1ZSxcbiAgICBhdHRyaWJ1dGVzOiB0cnVlLFxuICAgIGF0dHJpYnV0ZUZpbHRlcjogWydhcmlhLWhpZGRlbiddXG4gIH0pO1xuXG4gIC8vIExvZyBjYWNoZSBzdGF0cyBwZXJpb2RpY2FsbHkgaW4gZGVidWcgbW9kZVxuICBpZiAoREVCVUcpIHtcbiAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBsb2dDYWNoZVN0YXRzKCk7XG4gICAgfSwgQ0FDSEVfQ09ORklHLlNUQVRTX0xPR19JTlRFUlZBTCk7XG4gIH1cblxuICByZXR1cm4gb2JzZXJ2ZXI7XG59XG4iLCJpbXBvcnQgeyBkZWJvdW5jZSB9IGZyb20gJy4uL3V0aWxzL2RlYm91bmNlLmpzJztcbmltcG9ydCB7IGNsZWFyQWxsQ2FjaGVzLCBsb2dDYWNoZVN0YXRzIH0gZnJvbSAnLi4vdXRpbHMvZG9tQ2FjaGUuanMnO1xuaW1wb3J0IHsgREVCVUcgfSBmcm9tICcuLi91dGlscy9jb25zdGFudHMuanMnO1xuaW1wb3J0IHsgcmVjb25uZWN0SW50ZXJzZWN0aW9uT2JzZXJ2ZXIgfSBmcm9tICcuL2ludGVyc2VjdGlvbk9ic2VydmVyLmpzJztcbmltcG9ydCB7IGRlYnVnIH0gZnJvbSAnLi4vdXRpbHMvbG9nZ2VyLmpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwVXJsT2JzZXJ2ZXIoYXBwbHlIaWRpbmcpIHtcbiAgY29uc3QgZGVib3VuY2VkQXBwbHlIaWRpbmcgPSBkZWJvdW5jZShhcHBseUhpZGluZywgMTAwKTtcblxuICBsZXQgbGFzdFVybCA9IGxvY2F0aW9uLmhyZWY7XG4gIGNvbnN0IG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoKCkgPT4ge1xuICAgIGNvbnN0IHVybCA9IGxvY2F0aW9uLmhyZWY7XG4gICAgaWYgKHVybCAhPT0gbGFzdFVybCkge1xuICAgICAgaWYgKERFQlVHKSB7XG4gICAgICAgIGRlYnVnKCdbWVQtSFdWXSBVUkwgY2hhbmdlZCwgY2xlYXJpbmcgRE9NIGNhY2hlIGFuZCByZWNvbm5lY3RpbmcgSW50ZXJzZWN0aW9uT2JzZXJ2ZXInKTtcbiAgICAgICAgbG9nQ2FjaGVTdGF0cygpO1xuICAgICAgfVxuXG4gICAgICBjbGVhckFsbENhY2hlcygpO1xuICAgICAgcmVjb25uZWN0SW50ZXJzZWN0aW9uT2JzZXJ2ZXIoKTtcbiAgICAgIGxhc3RVcmwgPSB1cmw7XG4gICAgICBzZXRUaW1lb3V0KGRlYm91bmNlZEFwcGx5SGlkaW5nLCAxMDApO1xuICAgIH1cbiAgfSk7XG5cbiAgb2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudCwge1xuICAgIHN1YnRyZWU6IHRydWUsXG4gICAgY2hpbGRMaXN0OiB0cnVlXG4gIH0pO1xuXG4gIHJldHVybiBvYnNlcnZlcjtcbn1cbiIsImltcG9ydCB7IGRlYm91bmNlIH0gZnJvbSAnLi4vdXRpbHMvZGVib3VuY2UuanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBYaHJPYnNlcnZlcihhcHBseUhpZGluZykge1xuICBjb25zdCBkZWJvdW5jZWRBcHBseUhpZGluZyA9IGRlYm91bmNlKGFwcGx5SGlkaW5nLCAxMDApO1xuXG4gIGNvbnN0IG9yaWdpbmFsT3BlbiA9IFhNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZS5vcGVuO1xuICBjb25zdCBvcmlnaW5hbFNlbmQgPSBYTUxIdHRwUmVxdWVzdC5wcm90b3R5cGUuc2VuZDtcblxuICBYTUxIdHRwUmVxdWVzdC5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uKG1ldGhvZCwgdXJsKSB7XG4gICAgdGhpcy5fdXJsID0gdXJsO1xuICAgIHJldHVybiBvcmlnaW5hbE9wZW4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcblxuICBYTUxIdHRwUmVxdWVzdC5wcm90b3R5cGUuc2VuZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigncmVhZHlzdGF0ZWNoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PT0gNCAmJiB0aGlzLl91cmwgJiZcbiAgICAgICAgICAodGhpcy5fdXJsLmluY2x1ZGVzKCdicm93c2VfYWpheCcpIHx8IHRoaXMuX3VybC5pbmNsdWRlcygnYnJvd3NlPycpKSkge1xuICAgICAgICBzZXRUaW1lb3V0KGRlYm91bmNlZEFwcGx5SGlkaW5nLCAxMDApO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvcmlnaW5hbFNlbmQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcbn1cbiIsImltcG9ydCB7IGVycm9yIH0gZnJvbSAnLi4vdXRpbHMvbG9nZ2VyLmpzJztcblxuY29uc3QgTUFYX0NBQ0hFX1NJWkUgPSAxMDAwO1xuXG5jb25zdCBoaWRkZW5WaWRlb0NhY2hlID0gbmV3IE1hcCgpO1xuY29uc3QgaGlkZGVuVmlkZW9UaW1lc3RhbXBzID0gbmV3IE1hcCgpO1xuY29uc3QgY2FjaGVBY2Nlc3NPcmRlciA9IG5ldyBNYXAoKTsgLy8gdmlkZW9JZCAtPiBsYXN0QWNjZXNzVGltZVxuY29uc3QgcGVuZGluZ0hpZGRlblZpZGVvUmVxdWVzdHMgPSBuZXcgTWFwKCk7XG5cbi8vIEZsYWcgdG8gcHJldmVudCBjb25jdXJyZW50IGV2aWN0aW9uIG9wZXJhdGlvbnNcbmxldCBpc0V2aWN0aW5nID0gZmFsc2U7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRSZWNvcmRUaW1lc3RhbXAocmVjb3JkKSB7XG4gIHJldHVybiByZWNvcmQgJiYgTnVtYmVyLmlzRmluaXRlKHJlY29yZC51cGRhdGVkQXQpID8gcmVjb3JkLnVwZGF0ZWRBdCA6IC0xO1xufVxuXG4vKipcbiAqIEV2aWN0cyBsZWFzdCByZWNlbnRseSB1c2VkIGVudHJpZXMgd2hlbiBjYWNoZSBleGNlZWRzIE1BWF9DQUNIRV9TSVpFXG4gKiBVc2VzIHN5bmNocm9uaXphdGlvbiB0byBwcmV2ZW50IHJhY2UgY29uZGl0aW9ucyBhbmQgZW5zdXJlIGNhY2hlIGNvbnNpc3RlbmN5XG4gKi9cbmZ1bmN0aW9uIGV2aWN0TFJVRW50cmllcygpIHtcbiAgLy8gRWFybHkgZXhpdCBpZiBjYWNoZSBpcyB3aXRoaW4gbGltaXRzXG4gIGlmIChoaWRkZW5WaWRlb0NhY2hlLnNpemUgPD0gTUFYX0NBQ0hFX1NJWkUpIHJldHVybjtcblxuICAvLyBQcmV2ZW50IGNvbmN1cnJlbnQgZXZpY3Rpb24gb3BlcmF0aW9uc1xuICBpZiAoaXNFdmljdGluZykgcmV0dXJuO1xuXG4gIHRyeSB7XG4gICAgaXNFdmljdGluZyA9IHRydWU7XG5cbiAgICAvLyBSZS1jaGVjayBzaXplIGFmdGVyIGFjcXVpcmluZyBsb2NrIChtaWdodCBoYXZlIGNoYW5nZWQpXG4gICAgaWYgKGhpZGRlblZpZGVvQ2FjaGUuc2l6ZSA8PSBNQVhfQ0FDSEVfU0laRSkgcmV0dXJuO1xuXG4gICAgLy8gQ3JlYXRlIHNuYXBzaG90IG9mIGVudHJpZXMgdG8gZXZpY3QgKG9sZGVzdCBmaXJzdClcbiAgICBjb25zdCBlbnRyaWVzID0gQXJyYXkuZnJvbShjYWNoZUFjY2Vzc09yZGVyLmVudHJpZXMoKSlcbiAgICAgIC5zb3J0KChhLCBiKSA9PiBhWzFdIC0gYlsxXSk7IC8vIFNvcnQgYnkgYWNjZXNzIHRpbWUgKG9sZGVzdCBmaXJzdClcblxuICAgIGNvbnN0IG51bVRvRXZpY3QgPSBoaWRkZW5WaWRlb0NhY2hlLnNpemUgLSBNQVhfQ0FDSEVfU0laRTtcbiAgICBjb25zdCB0b0V2aWN0ID0gZW50cmllcy5zbGljZSgwLCBudW1Ub0V2aWN0KTtcblxuICAgIC8vIEJhdGNoIGRlbGV0ZTogY29sbGVjdCBJRHMgZmlyc3QsIHRoZW4gZGVsZXRlIGF0b21pY2FsbHlcbiAgICAvLyBUaGlzIG1pbmltaXplcyB0aGUgd2luZG93IGZvciBpbmNvbnNpc3RlbmN5XG4gICAgY29uc3QgdmlkZW9JZHNUb0V2aWN0ID0gdG9FdmljdC5tYXAoKFt2aWRlb0lkXSkgPT4gdmlkZW9JZCk7XG5cbiAgICAvLyBEZWxldGUgZnJvbSBhbGwgTWFwcyBpbiBhIHNpbmdsZSBwYXNzIHRvIG1haW50YWluIGNvbnNpc3RlbmN5XG4gICAgdmlkZW9JZHNUb0V2aWN0LmZvckVhY2goKHZpZGVvSWQpID0+IHtcbiAgICAgIGhpZGRlblZpZGVvQ2FjaGUuZGVsZXRlKHZpZGVvSWQpO1xuICAgICAgaGlkZGVuVmlkZW9UaW1lc3RhbXBzLmRlbGV0ZSh2aWRlb0lkKTtcbiAgICAgIGNhY2hlQWNjZXNzT3JkZXIuZGVsZXRlKHZpZGVvSWQpO1xuICAgIH0pO1xuXG4gICAgLy8gVmFsaWRhdGUgY29uc2lzdGVuY3k6IGFsbCB0aHJlZSBNYXBzIHNob3VsZCBoYXZlIHNhbWUgc2l6ZVxuICAgIGlmIChoaWRkZW5WaWRlb0NhY2hlLnNpemUgIT09IGhpZGRlblZpZGVvVGltZXN0YW1wcy5zaXplKSB7XG4gICAgICBlcnJvcignW0NhY2hlXSBJbmNvbnNpc3RlbmN5IGRldGVjdGVkOiBoaWRkZW5WaWRlb0NhY2hlIHNpemUnLCBoaWRkZW5WaWRlb0NhY2hlLnNpemUsXG4gICAgICAgICAgICAndnMgaGlkZGVuVmlkZW9UaW1lc3RhbXBzIHNpemUnLCBoaWRkZW5WaWRlb1RpbWVzdGFtcHMuc2l6ZSk7XG4gICAgfVxuICB9IGZpbmFsbHkge1xuICAgIC8vIEFsd2F5cyByZWxlYXNlIGxvY2ssIGV2ZW4gaWYgZXJyb3Igb2NjdXJzXG4gICAgaXNFdmljdGluZyA9IGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcHBseUNhY2hlVXBkYXRlKHZpZGVvSWQsIHJlY29yZCkge1xuICBpZiAoIXZpZGVvSWQpIHJldHVybjtcbiAgaWYgKHJlY29yZCkge1xuICAgIGNvbnN0IHRpbWVzdGFtcCA9IGdldFJlY29yZFRpbWVzdGFtcChyZWNvcmQpO1xuICAgIGhpZGRlblZpZGVvQ2FjaGUuc2V0KHZpZGVvSWQsIHJlY29yZCk7XG4gICAgaGlkZGVuVmlkZW9UaW1lc3RhbXBzLnNldCh2aWRlb0lkLCB0aW1lc3RhbXAgPT09IC0xID8gRGF0ZS5ub3coKSA6IHRpbWVzdGFtcCk7XG4gICAgY2FjaGVBY2Nlc3NPcmRlci5zZXQodmlkZW9JZCwgRGF0ZS5ub3coKSk7XG4gICAgZXZpY3RMUlVFbnRyaWVzKCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGhpZGRlblZpZGVvQ2FjaGUuZGVsZXRlKHZpZGVvSWQpO1xuICBoaWRkZW5WaWRlb1RpbWVzdGFtcHMuc2V0KHZpZGVvSWQsIERhdGUubm93KCkpO1xuICBjYWNoZUFjY2Vzc09yZGVyLmRlbGV0ZSh2aWRlb0lkKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlRmV0Y2hlZFJlY29yZCh2aWRlb0lkLCByZWNvcmQpIHtcbiAgaWYgKCF2aWRlb0lkKSByZXR1cm47XG4gIGNvbnN0IGluY29taW5nVGltZXN0YW1wID0gZ2V0UmVjb3JkVGltZXN0YW1wKHJlY29yZCk7XG4gIGlmIChoaWRkZW5WaWRlb1RpbWVzdGFtcHMuaGFzKHZpZGVvSWQpKSB7XG4gICAgY29uc3QgY3VycmVudFRpbWVzdGFtcCA9IGhpZGRlblZpZGVvVGltZXN0YW1wcy5nZXQodmlkZW9JZCk7XG4gICAgaWYgKGluY29taW5nVGltZXN0YW1wIDw9IGN1cnJlbnRUaW1lc3RhbXApIHtcbiAgICAgIC8vIFVwZGF0ZSBhY2Nlc3MgdGltZSBldmVuIGlmIG5vdCB1cGRhdGluZyByZWNvcmRcbiAgICAgIGNhY2hlQWNjZXNzT3JkZXIuc2V0KHZpZGVvSWQsIERhdGUubm93KCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICBpZiAocmVjb3JkKSB7XG4gICAgaGlkZGVuVmlkZW9DYWNoZS5zZXQodmlkZW9JZCwgcmVjb3JkKTtcbiAgICBoaWRkZW5WaWRlb1RpbWVzdGFtcHMuc2V0KHZpZGVvSWQsIGluY29taW5nVGltZXN0YW1wID09PSAtMSA/IERhdGUubm93KCkgOiBpbmNvbWluZ1RpbWVzdGFtcCk7XG4gICAgY2FjaGVBY2Nlc3NPcmRlci5zZXQodmlkZW9JZCwgRGF0ZS5ub3coKSk7XG4gICAgZXZpY3RMUlVFbnRyaWVzKCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGhpZGRlblZpZGVvQ2FjaGUuZGVsZXRlKHZpZGVvSWQpO1xuICBjYWNoZUFjY2Vzc09yZGVyLmRlbGV0ZSh2aWRlb0lkKTtcbn1cblxuLyoqXG4gKiBHZXRzIGEgY2FjaGVkIGhpZGRlbiB2aWRlbyByZWNvcmQgYW5kIHVwZGF0ZXMgYWNjZXNzIHRyYWNraW5nXG4gKiBAcGFyYW0ge3N0cmluZ30gdmlkZW9JZCAtIFZpZGVvIGlkZW50aWZpZXJcbiAqIEByZXR1cm5zIHtPYmplY3R8bnVsbH0gLSBDYWNoZWQgcmVjb3JkIG9yIG51bGxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhY2hlZEhpZGRlblZpZGVvKHZpZGVvSWQpIHtcbiAgaWYgKCF2aWRlb0lkKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgcmVjb3JkID0gaGlkZGVuVmlkZW9DYWNoZS5nZXQodmlkZW9JZCk7XG5cbiAgLy8gTUVNT1JZIExFQUsgUFJFVkVOVElPTjogT25seSB1cGRhdGUgYWNjZXNzIHRpbWUgZm9yIGNhY2hlIGhpdHNcbiAgLy8gVGhpcyBlbnN1cmVzIGNhY2hlQWNjZXNzT3JkZXIgTWFwIG9ubHkgdHJhY2tzIHZpZGVvcyB0aGF0IGV4aXN0IGluIGhpZGRlblZpZGVvQ2FjaGVcbiAgLy8gQ2FjaGUgbWlzc2VzICh3aGVuIHJlY29yZCBpcyB1bmRlZmluZWQpIHNob3VsZCBOT1QgcG9wdWxhdGUgY2FjaGVBY2Nlc3NPcmRlclxuICAvLyBUaGlzIHByZXZlbnRzIG9ycGhhbmVkIGVudHJpZXMgaW4gY2FjaGVBY2Nlc3NPcmRlciB0aGF0IHdvdWxkIG5ldmVyIGJlIGV2aWN0ZWRcbiAgaWYgKHJlY29yZCkge1xuICAgIGNhY2hlQWNjZXNzT3JkZXIuc2V0KHZpZGVvSWQsIERhdGUubm93KCkpO1xuICB9XG5cbiAgcmV0dXJuIHJlY29yZCB8fCBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJDYWNoZSgpIHtcbiAgLy8gUmVzZXQgZXZpY3Rpb24gZmxhZyB0byBwcmV2ZW50IGRlYWRsb2NrXG4gIGlzRXZpY3RpbmcgPSBmYWxzZTtcblxuICBoaWRkZW5WaWRlb0NhY2hlLmNsZWFyKCk7XG4gIGhpZGRlblZpZGVvVGltZXN0YW1wcy5jbGVhcigpO1xuICBjYWNoZUFjY2Vzc09yZGVyLmNsZWFyKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNQZW5kaW5nUmVxdWVzdCh2aWRlb0lkKSB7XG4gIHJldHVybiBwZW5kaW5nSGlkZGVuVmlkZW9SZXF1ZXN0cy5oYXModmlkZW9JZCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQZW5kaW5nUmVxdWVzdCh2aWRlb0lkKSB7XG4gIHJldHVybiBwZW5kaW5nSGlkZGVuVmlkZW9SZXF1ZXN0cy5nZXQodmlkZW9JZCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRQZW5kaW5nUmVxdWVzdCh2aWRlb0lkLCBwcm9taXNlKSB7XG4gIHBlbmRpbmdIaWRkZW5WaWRlb1JlcXVlc3RzLnNldCh2aWRlb0lkLCBwcm9taXNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlbGV0ZVBlbmRpbmdSZXF1ZXN0KHZpZGVvSWQpIHtcbiAgcGVuZGluZ0hpZGRlblZpZGVvUmVxdWVzdHMuZGVsZXRlKHZpZGVvSWQpO1xufVxuXG4vKipcbiAqIENsZWFycyBhbGwgcGVuZGluZyByZXF1ZXN0cyAodXNlZnVsIGZvciBuYXZpZ2F0aW9uIGV2ZW50cylcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyUGVuZGluZ1JlcXVlc3RzKCkge1xuICBwZW5kaW5nSGlkZGVuVmlkZW9SZXF1ZXN0cy5jbGVhcigpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFzQ2FjaGVkVmlkZW8odmlkZW9JZCkge1xuICByZXR1cm4gaGlkZGVuVmlkZW9DYWNoZS5oYXModmlkZW9JZCk7XG59XG5cbi8qKlxuICogR2V0cyBjdXJyZW50IGNhY2hlIHNpemUgZm9yIG1vbml0b3JpbmdcbiAqIEByZXR1cm5zIHtudW1iZXJ9IC0gTnVtYmVyIG9mIGVudHJpZXMgaW4gY2FjaGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhY2hlU2l6ZSgpIHtcbiAgcmV0dXJuIGhpZGRlblZpZGVvQ2FjaGUuc2l6ZTtcbn1cblxuLyoqXG4gKiBHZXRzIGVzdGltYXRlZCBjYWNoZSBtZW1vcnkgdXNhZ2UgaW4gYnl0ZXNcbiAqIEByZXR1cm5zIHtudW1iZXJ9IC0gRXN0aW1hdGVkIG1lbW9yeSB1c2FnZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2FjaGVNZW1vcnlVc2FnZSgpIHtcbiAgbGV0IGVzdGltYXRlZFNpemUgPSAwO1xuICBoaWRkZW5WaWRlb0NhY2hlLmZvckVhY2goKHJlY29yZCwgdmlkZW9JZCkgPT4ge1xuICAgIC8vIEVzdGltYXRlOiB2aWRlb0lkICgxMSBjaGFycyAqIDIgYnl0ZXMpICsgcmVjb3JkIChzdGF0ZSwgdGl0bGUsIHVwZGF0ZWRBdClcbiAgICBlc3RpbWF0ZWRTaXplICs9IHZpZGVvSWQubGVuZ3RoICogMjtcbiAgICBpZiAocmVjb3JkKSB7XG4gICAgICBlc3RpbWF0ZWRTaXplICs9IChyZWNvcmQudGl0bGU/Lmxlbmd0aCB8fCAwKSAqIDI7XG4gICAgICBlc3RpbWF0ZWRTaXplICs9IDMyOyAvLyBBcHByb3hpbWF0ZSBvdmVyaGVhZCBmb3Igc3RhdGUgKyB1cGRhdGVkQXQgKyBvYmplY3Qgc3RydWN0dXJlXG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGVzdGltYXRlZFNpemU7XG59XG5cbi8qKlxuICogVmFsaWRhdGVzIGNhY2hlIGNvbnNpc3RlbmN5IGJldHdlZW4gYWxsIE1hcCBzdHJ1Y3R1cmVzXG4gKiBAcmV0dXJucyB7T2JqZWN0fSAtIFZhbGlkYXRpb24gcmVzdWx0IHdpdGggc3RhdHVzIGFuZCBkZXRhaWxzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNhY2hlQ29uc2lzdGVuY3koKSB7XG4gIGNvbnN0IGlzc3VlcyA9IFtdO1xuXG4gIC8vIENoZWNrIHNpemUgY29uc2lzdGVuY3lcbiAgaWYgKGhpZGRlblZpZGVvQ2FjaGUuc2l6ZSAhPT0gaGlkZGVuVmlkZW9UaW1lc3RhbXBzLnNpemUpIHtcbiAgICBpc3N1ZXMucHVzaCh7XG4gICAgICB0eXBlOiAnc2l6ZV9taXNtYXRjaCcsXG4gICAgICBtZXNzYWdlOiBgaGlkZGVuVmlkZW9DYWNoZSBzaXplICgke2hpZGRlblZpZGVvQ2FjaGUuc2l6ZX0pICE9PSBoaWRkZW5WaWRlb1RpbWVzdGFtcHMgc2l6ZSAoJHtoaWRkZW5WaWRlb1RpbWVzdGFtcHMuc2l6ZX0pYFxuICAgIH0pO1xuICB9XG5cbiAgLy8gQ2hlY2sgdGhhdCBhbGwga2V5cyBpbiBoaWRkZW5WaWRlb0NhY2hlIGV4aXN0IGluIGhpZGRlblZpZGVvVGltZXN0YW1wc1xuICBmb3IgKGNvbnN0IHZpZGVvSWQgb2YgaGlkZGVuVmlkZW9DYWNoZS5rZXlzKCkpIHtcbiAgICBpZiAoIWhpZGRlblZpZGVvVGltZXN0YW1wcy5oYXModmlkZW9JZCkpIHtcbiAgICAgIGlzc3Vlcy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ21pc3NpbmdfdGltZXN0YW1wJyxcbiAgICAgICAgdmlkZW9JZCxcbiAgICAgICAgbWVzc2FnZTogYFZpZGVvICR7dmlkZW9JZH0gaW4gY2FjaGUgYnV0IG1pc3NpbmcgdGltZXN0YW1wYFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gQ2hlY2sgdGhhdCBhbGwga2V5cyBpbiBjYWNoZUFjY2Vzc09yZGVyIGV4aXN0IGluIGhpZGRlblZpZGVvQ2FjaGVcbiAgZm9yIChjb25zdCB2aWRlb0lkIG9mIGNhY2hlQWNjZXNzT3JkZXIua2V5cygpKSB7XG4gICAgaWYgKCFoaWRkZW5WaWRlb0NhY2hlLmhhcyh2aWRlb0lkKSAmJiAhaGlkZGVuVmlkZW9UaW1lc3RhbXBzLmhhcyh2aWRlb0lkKSkge1xuICAgICAgaXNzdWVzLnB1c2goe1xuICAgICAgICB0eXBlOiAnb3JwaGFuZWRfYWNjZXNzX29yZGVyJyxcbiAgICAgICAgdmlkZW9JZCxcbiAgICAgICAgbWVzc2FnZTogYFZpZGVvICR7dmlkZW9JZH0gaW4gYWNjZXNzIG9yZGVyIGJ1dCBub3QgaW4gY2FjaGVgXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGlzVmFsaWQ6IGlzc3Vlcy5sZW5ndGggPT09IDAsXG4gICAgaXNzdWVzLFxuICAgIHNpemVzOiB7XG4gICAgICBjYWNoZTogaGlkZGVuVmlkZW9DYWNoZS5zaXplLFxuICAgICAgdGltZXN0YW1wczogaGlkZGVuVmlkZW9UaW1lc3RhbXBzLnNpemUsXG4gICAgICBhY2Nlc3NPcmRlcjogY2FjaGVBY2Nlc3NPcmRlci5zaXplXG4gICAgfVxuICB9O1xufVxuXG4vKipcbiAqIFJlcGFpcnMgY2FjaGUgaW5jb25zaXN0ZW5jaWVzIGJ5IHN5bmNocm9uaXppbmcgYWxsIE1hcCBzdHJ1Y3R1cmVzXG4gKiBAcmV0dXJucyB7T2JqZWN0fSAtIFJlcGFpciByZXN1bHQgd2l0aCBhY3Rpb25zIHRha2VuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXBhaXJDYWNoZUNvbnNpc3RlbmN5KCkge1xuICBjb25zdCBhY3Rpb25zID0gW107XG5cbiAgLy8gUmVtb3ZlIG9ycGhhbmVkIGVudHJpZXMgZnJvbSBoaWRkZW5WaWRlb1RpbWVzdGFtcHNcbiAgZm9yIChjb25zdCB2aWRlb0lkIG9mIGhpZGRlblZpZGVvVGltZXN0YW1wcy5rZXlzKCkpIHtcbiAgICBpZiAoIWhpZGRlblZpZGVvQ2FjaGUuaGFzKHZpZGVvSWQpKSB7XG4gICAgICBoaWRkZW5WaWRlb1RpbWVzdGFtcHMuZGVsZXRlKHZpZGVvSWQpO1xuICAgICAgYWN0aW9ucy5wdXNoKHsgYWN0aW9uOiAncmVtb3ZlZF9vcnBoYW5lZF90aW1lc3RhbXAnLCB2aWRlb0lkIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIFJlbW92ZSBvcnBoYW5lZCBlbnRyaWVzIGZyb20gY2FjaGVBY2Nlc3NPcmRlclxuICBmb3IgKGNvbnN0IHZpZGVvSWQgb2YgY2FjaGVBY2Nlc3NPcmRlci5rZXlzKCkpIHtcbiAgICBpZiAoIWhpZGRlblZpZGVvQ2FjaGUuaGFzKHZpZGVvSWQpKSB7XG4gICAgICBjYWNoZUFjY2Vzc09yZGVyLmRlbGV0ZSh2aWRlb0lkKTtcbiAgICAgIGFjdGlvbnMucHVzaCh7IGFjdGlvbjogJ3JlbW92ZWRfb3JwaGFuZWRfYWNjZXNzX29yZGVyJywgdmlkZW9JZCB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBBZGQgbWlzc2luZyB0aW1lc3RhbXBzIGZvciBjYWNoZWQgdmlkZW9zXG4gIGZvciAoY29uc3QgdmlkZW9JZCBvZiBoaWRkZW5WaWRlb0NhY2hlLmtleXMoKSkge1xuICAgIGlmICghaGlkZGVuVmlkZW9UaW1lc3RhbXBzLmhhcyh2aWRlb0lkKSkge1xuICAgICAgaGlkZGVuVmlkZW9UaW1lc3RhbXBzLnNldCh2aWRlb0lkLCBEYXRlLm5vdygpKTtcbiAgICAgIGFjdGlvbnMucHVzaCh7IGFjdGlvbjogJ2FkZGVkX21pc3NpbmdfdGltZXN0YW1wJywgdmlkZW9JZCB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGFjdGlvbnNDb3VudDogYWN0aW9ucy5sZW5ndGgsXG4gICAgYWN0aW9ucyxcbiAgICBmaW5hbFNpemVzOiB7XG4gICAgICBjYWNoZTogaGlkZGVuVmlkZW9DYWNoZS5zaXplLFxuICAgICAgdGltZXN0YW1wczogaGlkZGVuVmlkZW9UaW1lc3RhbXBzLnNpemUsXG4gICAgICBhY2Nlc3NPcmRlcjogY2FjaGVBY2Nlc3NPcmRlci5zaXplXG4gICAgfVxuICB9O1xufVxuIiwiaW1wb3J0IHsgSElEREVOX1ZJREVPX01FU1NBR0VTIH0gZnJvbSAnLi4vdXRpbHMvY29uc3RhbnRzLmpzJztcbmltcG9ydCB7XG4gIGdldENhY2hlZEhpZGRlblZpZGVvLFxuICBtZXJnZUZldGNoZWRSZWNvcmQsXG4gIGFwcGx5Q2FjaGVVcGRhdGUsXG4gIGhhc0NhY2hlZFZpZGVvLFxuICBoYXNQZW5kaW5nUmVxdWVzdCxcbiAgZ2V0UGVuZGluZ1JlcXVlc3QsXG4gIHNldFBlbmRpbmdSZXF1ZXN0LFxuICBkZWxldGVQZW5kaW5nUmVxdWVzdCxcbiAgY2xlYXJQZW5kaW5nUmVxdWVzdHMgYXMgY2xlYXJQZW5kaW5nUmVxdWVzdHNDYWNoZVxufSBmcm9tICcuL2NhY2hlLmpzJztcbmltcG9ydCB7IHNlbmRIaWRkZW5WaWRlb3NNZXNzYWdlIH0gZnJvbSAnLi4vLi4vc2hhcmVkL21lc3NhZ2luZy5qcyc7XG5pbXBvcnQgeyBsb2dFcnJvciwgY2xhc3NpZnlFcnJvciwgRXJyb3JUeXBlIH0gZnJvbSAnLi4vLi4vc2hhcmVkL2Vycm9ySGFuZGxlci5qcyc7XG5pbXBvcnQgeyBzaG93Tm90aWZpY2F0aW9uIH0gZnJvbSAnLi4vLi4vc2hhcmVkL25vdGlmaWNhdGlvbnMuanMnO1xuXG4vLyBSZS1leHBvcnQgc2VuZEhpZGRlblZpZGVvc01lc3NhZ2UgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbmV4cG9ydCB7IHNlbmRIaWRkZW5WaWRlb3NNZXNzYWdlIH07XG5cbi8qKlxuICogQ2xlYXJzIGFsbCBwZW5kaW5nIHJlcXVlc3RzICh1c2VmdWwgZm9yIG5hdmlnYXRpb24gZXZlbnRzKVxuICovXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJQZW5kaW5nUmVxdWVzdHMoKSB7XG4gIGNsZWFyUGVuZGluZ1JlcXVlc3RzQ2FjaGUoKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoSGlkZGVuVmlkZW9TdGF0ZXModmlkZW9JZHMpIHtcbiAgY29uc3QgaWRzID0gQXJyYXkuaXNBcnJheSh2aWRlb0lkcykgPyB2aWRlb0lkcy5maWx0ZXIoQm9vbGVhbikgOiBbXTtcbiAgaWYgKGlkcy5sZW5ndGggPT09IDApIHJldHVybiB7fTtcblxuICBjb25zdCB1bmlxdWUgPSBBcnJheS5mcm9tKG5ldyBTZXQoaWRzKSk7XG4gIGNvbnN0IHJlc3VsdCA9IHt9O1xuICBjb25zdCBtaXNzaW5nID0gW107XG4gIGNvbnN0IHdhaXRlcnMgPSBbXTtcblxuICB1bmlxdWUuZm9yRWFjaCgodmlkZW9JZCkgPT4ge1xuICAgIGlmIChoYXNDYWNoZWRWaWRlbyh2aWRlb0lkKSkge1xuICAgICAgcmVzdWx0W3ZpZGVvSWRdID0gZ2V0Q2FjaGVkSGlkZGVuVmlkZW8odmlkZW9JZCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChoYXNQZW5kaW5nUmVxdWVzdCh2aWRlb0lkKSkge1xuICAgICAgd2FpdGVycy5wdXNoKGdldFBlbmRpbmdSZXF1ZXN0KHZpZGVvSWQpLnRoZW4oKHJlY29yZCkgPT4ge1xuICAgICAgICByZXN1bHRbdmlkZW9JZF0gPSByZWNvcmQ7XG4gICAgICB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICAgIC8vIElmIHBlbmRpbmcgcmVxdWVzdCBmYWlscywgd2UnbGwgdHJ5IHRvIGZldGNoIGFnYWluXG4gICAgICAgIG1pc3NpbmcucHVzaCh2aWRlb0lkKTtcbiAgICAgIH0pKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbWlzc2luZy5wdXNoKHZpZGVvSWQpO1xuICB9KTtcblxuICBpZiAobWlzc2luZy5sZW5ndGggPiAwKSB7XG4gICAgLy8gTm90ZTogV2UgZG9uJ3Qgc2V0IGEgdGltZW91dCB0byBkZWxldGUgcGVuZGluZyByZXF1ZXN0cyBiZWNhdXNlIHRoYXQgY291bGRcbiAgICAvLyBjYXVzZSByYWNlIGNvbmRpdGlvbnMgaWYgdGhlIGZldGNoIHRha2VzIGxvbmdlciB0aGFuIHRoZSB0aW1lb3V0LlxuICAgIC8vIFRoZSBmaW5hbGx5IGJsb2NrIHdpbGwgY2xlYW4gdXAgcGVuZGluZyByZXF1ZXN0cyB3aGVuIHRoZSBmZXRjaCBjb21wbGV0ZXMuXG4gICAgY29uc3QgZmV0Y2hQcm9taXNlID0gc2VuZEhpZGRlblZpZGVvc01lc3NhZ2UoXG4gICAgICBISURERU5fVklERU9fTUVTU0FHRVMuR0VUX01BTlksXG4gICAgICB7IGlkczogbWlzc2luZyB9XG4gICAgKS50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgICAgY29uc3QgcmVjb3JkcyA9IHJlc3BvbnNlLnJlY29yZHMgfHwge307XG4gICAgICBtaXNzaW5nLmZvckVhY2goKHZpZGVvSWQpID0+IHtcbiAgICAgICAgbWVyZ2VGZXRjaGVkUmVjb3JkKHZpZGVvSWQsIHJlY29yZHNbdmlkZW9JZF0gfHwgbnVsbCk7XG4gICAgICAgIHJlc3VsdFt2aWRlb0lkXSA9IGdldENhY2hlZEhpZGRlblZpZGVvKHZpZGVvSWQpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVjb3JkcztcbiAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgIGxvZ0Vycm9yKCdDb250ZW50TWVzc2FnaW5nJywgZXJyb3IsIHtcbiAgICAgICAgb3BlcmF0aW9uOiAnZmV0Y2hIaWRkZW5WaWRlb1N0YXRlcycsXG4gICAgICAgIHZpZGVvQ291bnQ6IG1pc3NpbmcubGVuZ3RoXG4gICAgICB9KTtcblxuICAgICAgLy8gQ2FjaGUgbnVsbCB2YWx1ZXMgZm9yIGZhaWxlZCBmZXRjaGVzIHRvIHByZXZlbnQgcmVwZWF0ZWQgZmFpbHVyZXNcbiAgICAgIG1pc3NpbmcuZm9yRWFjaCgodmlkZW9JZCkgPT4ge1xuICAgICAgICBtZXJnZUZldGNoZWRSZWNvcmQodmlkZW9JZCwgbnVsbCk7XG4gICAgICAgIHJlc3VsdFt2aWRlb0lkXSA9IG51bGw7XG4gICAgICB9KTtcblxuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfSkuZmluYWxseSgoKSA9PiB7XG4gICAgICAvLyBDbGVhbiB1cCBwZW5kaW5nIHJlcXVlc3RzIGFmdGVyIGZldGNoIGNvbXBsZXRlcyAoc3VjY2VzcyBvciBmYWlsdXJlKVxuICAgICAgbWlzc2luZy5mb3JFYWNoKCh2aWRlb0lkKSA9PiBkZWxldGVQZW5kaW5nUmVxdWVzdCh2aWRlb0lkKSk7XG4gICAgfSk7XG5cbiAgICBtaXNzaW5nLmZvckVhY2goKHZpZGVvSWQpID0+IHtcbiAgICAgIGNvbnN0IHByb21pc2UgPSBmZXRjaFByb21pc2VcbiAgICAgICAgLnRoZW4oKCkgPT4gZ2V0Q2FjaGVkSGlkZGVuVmlkZW8odmlkZW9JZCkpXG4gICAgICAgIC5jYXRjaCgoKSA9PiBudWxsKTtcbiAgICAgIHNldFBlbmRpbmdSZXF1ZXN0KHZpZGVvSWQsIHByb21pc2UpO1xuICAgICAgd2FpdGVycy5wdXNoKHByb21pc2UudGhlbigocmVjb3JkKSA9PiB7XG4gICAgICAgIHJlc3VsdFt2aWRlb0lkXSA9IHJlY29yZDtcbiAgICAgIH0pKTtcbiAgICB9KTtcbiAgfVxuXG4gIGlmICh3YWl0ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAvLyBVc2UgUHJvbWlzZS5hbGxTZXR0bGVkIHRvIG5vdCBmYWlsIG9uIGluZGl2aWR1YWwgZXJyb3JzXG4gICAgYXdhaXQgUHJvbWlzZS5hbGxTZXR0bGVkKHdhaXRlcnMpO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldEhpZGRlblZpZGVvU3RhdGUodmlkZW9JZCwgc3RhdGUsIHRpdGxlKSB7XG4gIGNvbnN0IHNhbml0aXplZElkID0gdmlkZW9JZCA/IFN0cmluZyh2aWRlb0lkKS50cmltKCkgOiAnJztcbiAgaWYgKCFzYW5pdGl6ZWRJZCkgcmV0dXJuIG51bGw7XG5cbiAgLy8gT3B0aW1pc3RpYyB1cGRhdGVcbiAgY29uc3Qgb3B0aW1pc3RpY1JlY29yZCA9IHtcbiAgICB2aWRlb0lkOiBzYW5pdGl6ZWRJZCxcbiAgICBzdGF0ZSxcbiAgICB0aXRsZTogdGl0bGUgfHwgJycsXG4gICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpXG4gIH07XG4gIGFwcGx5Q2FjaGVVcGRhdGUoc2FuaXRpemVkSWQsIHN0YXRlID09PSAnbm9ybWFsJyA/IG51bGwgOiBvcHRpbWlzdGljUmVjb3JkKTtcblxuICBjb25zdCBwYXlsb2FkID0ge1xuICAgIHZpZGVvSWQ6IHNhbml0aXplZElkLFxuICAgIHN0YXRlLFxuICAgIHRpdGxlOiB0aXRsZSB8fCAnJ1xuICB9O1xuXG4gIHRyeSB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2VuZEhpZGRlblZpZGVvc01lc3NhZ2UoSElEREVOX1ZJREVPX01FU1NBR0VTLlNFVF9TVEFURSwgcGF5bG9hZCk7XG5cbiAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5yZWNvcmQpIHtcbiAgICAgIGFwcGx5Q2FjaGVVcGRhdGUoc2FuaXRpemVkSWQsIHJlc3VsdC5yZWNvcmQpO1xuICAgICAgcmV0dXJuIHJlc3VsdC5yZWNvcmQ7XG4gICAgfVxuXG4gICAgYXBwbHlDYWNoZVVwZGF0ZShzYW5pdGl6ZWRJZCwgbnVsbCk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbG9nRXJyb3IoJ0NvbnRlbnRNZXNzYWdpbmcnLCBlcnJvciwge1xuICAgICAgb3BlcmF0aW9uOiAnc2V0SGlkZGVuVmlkZW9TdGF0ZScsXG4gICAgICB2aWRlb0lkOiBzYW5pdGl6ZWRJZCxcbiAgICAgIHN0YXRlXG4gICAgfSk7XG5cbiAgICAvLyBTaG93IHVzZXIgbm90aWZpY2F0aW9uIGZvciBwZXJzaXN0ZW50IGVycm9ycyAoYWZ0ZXIgYWxsIHJldHJpZXMgZXhoYXVzdGVkKVxuICAgIGNvbnN0IGVycm9yVHlwZSA9IGNsYXNzaWZ5RXJyb3IoZXJyb3IpO1xuICAgIC8vIENoZWNrIGZvciBET00gYXZhaWxhYmlsaXR5IGJlZm9yZSBzaG93aW5nIG5vdGlmaWNhdGlvblxuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnICYmIGRvY3VtZW50LmJvZHkpIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvclR5cGUgPT09IEVycm9yVHlwZS5ORVRXT1JLXG4gICAgICAgID8gJ1VuYWJsZSB0byBjb25uZWN0IHRvIGV4dGVuc2lvbi4gUGxlYXNlIGNoZWNrIHlvdXIgY29ubmVjdGlvbi4nXG4gICAgICAgIDogJ0ZhaWxlZCB0byBzYXZlIHZpZGVvIHN0YXRlLiBQbGVhc2UgdHJ5IGFnYWluLic7XG4gICAgICBzaG93Tm90aWZpY2F0aW9uKG1lc3NhZ2UsICdlcnJvcicsIDMwMDApO1xuICAgIH1cblxuICAgIC8vIFJldmVydCBvcHRpbWlzdGljIHVwZGF0ZSBvbiBmYWlsdXJlXG4gICAgYXBwbHlDYWNoZVVwZGF0ZShzYW5pdGl6ZWRJZCwgbnVsbCk7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cbiIsImltcG9ydCB7IFNUT1JBR0VfS0VZUyB9IGZyb20gJy4uL3V0aWxzL2NvbnN0YW50cy5qcyc7XG5pbXBvcnQgeyBsb2dEZWJ1ZyB9IGZyb20gJy4uL3V0aWxzL2xvZ2dlci5qcyc7XG5cbmxldCBzZXR0aW5ncyA9IHtcbiAgdGhyZXNob2xkOiAxMCxcbiAgd2F0Y2hlZFN0YXRlczoge30sXG4gIHNob3J0c1N0YXRlczoge30sXG4gIGluZGl2aWR1YWxNb2RlOiAnZGltbWVkJyxcbiAgaW5kaXZpZHVhbE1vZGVFbmFibGVkOiB0cnVlXG59O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZFNldHRpbmdzKCkge1xuICBjb25zdCBzeW5jUmVzdWx0ID0gYXdhaXQgY2hyb21lLnN0b3JhZ2Uuc3luYy5nZXQobnVsbCk7XG4gIHNldHRpbmdzLnRocmVzaG9sZCA9IHN5bmNSZXN1bHRbU1RPUkFHRV9LRVlTLlRIUkVTSE9MRF0gfHwgMTA7XG4gIHNldHRpbmdzLmluZGl2aWR1YWxNb2RlID0gc3luY1Jlc3VsdFtTVE9SQUdFX0tFWVMuSU5ESVZJRFVBTF9NT0RFXSB8fCAnZGltbWVkJztcbiAgc2V0dGluZ3MuaW5kaXZpZHVhbE1vZGVFbmFibGVkID0gc3luY1Jlc3VsdFtTVE9SQUdFX0tFWVMuSU5ESVZJRFVBTF9NT0RFX0VOQUJMRURdICE9PSB1bmRlZmluZWQgP1xuICAgIHN5bmNSZXN1bHRbU1RPUkFHRV9LRVlTLklORElWSURVQUxfTU9ERV9FTkFCTEVEXSA6IHRydWU7XG4gIGNvbnN0IHNlY3Rpb25zID0gWydtaXNjJywgJ3N1YnNjcmlwdGlvbnMnLCAnY2hhbm5lbCcsICd3YXRjaCcsICd0cmVuZGluZycsICdwbGF5bGlzdCddO1xuICBzZWN0aW9ucy5mb3JFYWNoKChzZWN0aW9uKSA9PiB7XG4gICAgc2V0dGluZ3Mud2F0Y2hlZFN0YXRlc1tzZWN0aW9uXSA9IHN5bmNSZXN1bHRbYCR7U1RPUkFHRV9LRVlTLldBVENIRURfU1RBVEV9XyR7c2VjdGlvbn1gXSB8fCAnbm9ybWFsJztcbiAgICBpZiAoc2VjdGlvbiAhPT0gJ3BsYXlsaXN0Jykge1xuICAgICAgc2V0dGluZ3Muc2hvcnRzU3RhdGVzW3NlY3Rpb25dID0gc3luY1Jlc3VsdFtgJHtTVE9SQUdFX0tFWVMuU0hPUlRTX1NUQVRFfV8ke3NlY3Rpb259YF0gfHwgJ25vcm1hbCc7XG4gICAgfVxuICB9KTtcbiAgbG9nRGVidWcoJ1NldHRpbmdzIGxvYWRlZCcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2V0dGluZ3MoKSB7XG4gIHJldHVybiBzZXR0aW5ncztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRocmVzaG9sZCgpIHtcbiAgcmV0dXJuIHNldHRpbmdzLnRocmVzaG9sZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFdhdGNoZWRTdGF0ZShzZWN0aW9uKSB7XG4gIHJldHVybiBzZXR0aW5ncy53YXRjaGVkU3RhdGVzW3NlY3Rpb25dO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2hvcnRzU3RhdGUoc2VjdGlvbikge1xuICByZXR1cm4gc2V0dGluZ3Muc2hvcnRzU3RhdGVzW3NlY3Rpb25dO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0SW5kaXZpZHVhbE1vZGUoKSB7XG4gIHJldHVybiBzZXR0aW5ncy5pbmRpdmlkdWFsTW9kZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSW5kaXZpZHVhbE1vZGVFbmFibGVkKCkge1xuICByZXR1cm4gc2V0dGluZ3MuaW5kaXZpZHVhbE1vZGVFbmFibGVkO1xufVxuIiwiaW1wb3J0IHsgQ1NTX0NMQVNTRVMgfSBmcm9tICcuLi91dGlscy9jb25zdGFudHMuanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gaGFuZGxlQXJpYUhpZGRlbkNvbmZsaWN0cygpIHtcbiAgY29uc3QgZXllQnV0dG9ucyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoYC4ke0NTU19DTEFTU0VTLkVZRV9CVVRUT059YCk7XG4gIGV5ZUJ1dHRvbnMuZm9yRWFjaChidXR0b24gPT4ge1xuICAgIGNvbnN0IGFyaWFIaWRkZW5QYXJlbnQgPSBidXR0b24uY2xvc2VzdCgnW2FyaWEtaGlkZGVuPVwidHJ1ZVwiXScpO1xuICAgIGlmIChhcmlhSGlkZGVuUGFyZW50KSB7XG4gICAgICBhcmlhSGlkZGVuUGFyZW50LnJlbW92ZUF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nKTtcbiAgICB9XG4gIH0pO1xufVxuIiwiaW1wb3J0IHsgQ1NTX0NMQVNTRVMsIFNFTEVDVE9SX1NUUklOR1MgfSBmcm9tICcuLi91dGlscy9jb25zdGFudHMuanMnO1xuaW1wb3J0IHsgZ2V0Q2FjaGVkSGlkZGVuVmlkZW8gfSBmcm9tICcuLi9zdG9yYWdlL2NhY2hlLmpzJztcbmltcG9ydCB7IGZldGNoSGlkZGVuVmlkZW9TdGF0ZXMsIHNldEhpZGRlblZpZGVvU3RhdGUgfSBmcm9tICcuLi9zdG9yYWdlL21lc3NhZ2luZy5qcyc7XG5pbXBvcnQgeyBnZXRJbmRpdmlkdWFsTW9kZSB9IGZyb20gJy4uL3N0b3JhZ2Uvc2V0dGluZ3MuanMnO1xuaW1wb3J0IHsgZXh0cmFjdFRpdGxlRnJvbUNvbnRhaW5lciB9IGZyb20gJy4uL3V0aWxzL2RvbS5qcyc7XG5pbXBvcnQgeyBjYWNoZWRDbG9zZXN0IH0gZnJvbSAnLi4vdXRpbHMvZG9tQ2FjaGUuanMnO1xuaW1wb3J0IHsgc3luY0luZGl2aWR1YWxDb250YWluZXJTdGF0ZSB9IGZyb20gJy4uL2hpZGluZy9pbmRpdmlkdWFsSGlkaW5nLmpzJztcbmltcG9ydCB7IGxvZ0Vycm9yIH0gZnJvbSAnLi4vLi4vc2hhcmVkL2Vycm9ySGFuZGxlci5qcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVN0YXRlVG9FeWVCdXR0b24oYnV0dG9uLCBzdGF0ZSkge1xuICBpZiAoIWJ1dHRvbikgcmV0dXJuO1xuICBidXR0b24uY2xhc3NMaXN0LnJlbW92ZSgnZGltbWVkJywgJ2hpZGRlbicpO1xuICBpZiAoc3RhdGUgPT09ICdkaW1tZWQnKSB7XG4gICAgYnV0dG9uLmNsYXNzTGlzdC5hZGQoJ2RpbW1lZCcpO1xuICB9IGVsc2UgaWYgKHN0YXRlID09PSAnaGlkZGVuJykge1xuICAgIGJ1dHRvbi5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBzYXZlSGlkZGVuVmlkZW8odmlkZW9JZCwgc3RhdGUsIHRpdGxlID0gbnVsbCkge1xuICBpZiAoIXZpZGVvSWQpIHJldHVybiBudWxsO1xuICByZXR1cm4gc2V0SGlkZGVuVmlkZW9TdGF0ZSh2aWRlb0lkLCBzdGF0ZSwgdGl0bGUgfHwgdW5kZWZpbmVkKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUV5ZUJ1dHRvbih2aWRlb0NvbnRhaW5lciwgdmlkZW9JZCkge1xuICBpZiAoIXZpZGVvSWQpIHJldHVybiBudWxsO1xuICBjb25zdCBidXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgYnV0dG9uLmNsYXNzTmFtZSA9IENTU19DTEFTU0VTLkVZRV9CVVRUT047XG4gIGJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ2RhdGEtdmlkZW8taWQnLCB2aWRlb0lkKTtcbiAgYnV0dG9uLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAnLTEnKTtcbiAgYnV0dG9uLnNldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcsICdUb2dnbGUgdmlkZW8gdmlzaWJpbGl0eScpO1xuICBjb25zdCBjYWNoZWRSZWNvcmQgPSBnZXRDYWNoZWRIaWRkZW5WaWRlbyh2aWRlb0lkKTtcbiAgYXBwbHlTdGF0ZVRvRXllQnV0dG9uKGJ1dHRvbiwgY2FjaGVkUmVjb3JkPy5zdGF0ZSB8fCAnbm9ybWFsJyk7XG4gIGlmICghY2FjaGVkUmVjb3JkKSB7XG4gICAgLy8gRmV0Y2ggdmlkZW8gc3RhdGUgYW5kIGVuc3VyZSBjb250YWluZXIgaXMgc3luY2hyb25pemVkXG4gICAgLy8gVGhpcyBwcmV2ZW50cyB0aGUgZXllIGJ1dHRvbiBmcm9tIHNob3dpbmcgY29ycmVjdCBzdGF0ZSB3aGlsZSBjb250YWluZXIgaXMgbm90IGhpZGRlbi9kaW1tZWRcbiAgICBmZXRjaEhpZGRlblZpZGVvU3RhdGVzKFt2aWRlb0lkXSkudGhlbigoKSA9PiB7XG4gICAgICBjb25zdCByZWZyZXNoZWQgPSBnZXRDYWNoZWRIaWRkZW5WaWRlbyh2aWRlb0lkKTtcbiAgICAgIGNvbnN0IHN0YXRlID0gcmVmcmVzaGVkPy5zdGF0ZSB8fCAnbm9ybWFsJztcbiAgICAgIGFwcGx5U3RhdGVUb0V5ZUJ1dHRvbihidXR0b24sIHN0YXRlKTtcblxuICAgICAgLy8gRmluZCBhbmQgdXBkYXRlIGNvbnRhaW5lciB0byBzeW5jIHZpc3VhbCBzdGF0ZVxuICAgICAgY29uc3QgY29udGFpbmVyID0gY2FjaGVkQ2xvc2VzdChidXR0b24sIFNFTEVDVE9SX1NUUklOR1MuVklERU9fQ09OVEFJTkVSUyk7XG4gICAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICAgIHN5bmNJbmRpdmlkdWFsQ29udGFpbmVyU3RhdGUoY29udGFpbmVyLCBzdGF0ZSk7XG4gICAgICB9XG4gICAgfSkuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICBsb2dFcnJvcignRXllQnV0dG9uJywgZXJyb3IsIHtcbiAgICAgICAgb3BlcmF0aW9uOiAnZmV0Y2hIaWRkZW5WaWRlb1N0YXRlcycsXG4gICAgICAgIHZpZGVvSWRcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIGJ1dHRvbi5pbm5lckhUTUwgPSBgXG4gICAgPHN2ZyB2aWV3Qm94PVwiMCAwIDI0IDI0XCI+XG4gICAgICA8cGF0aCBkPVwiTTEyIDQuNUM3IDQuNSAyLjczIDcuNjEgMSAxMmMxLjczIDQuMzkgNiA3LjUgMTEgNy41czkuMjctMy4xMSAxMS03LjVjLTEuNzMtNC4zOS02LTcuNS0xMS03LjV6TTEyIDE3Yy0yLjc2IDAtNS0yLjI0LTUtNXMyLjI0LTUgNS01IDUgMi4yNCA1IDUtMi4yNCA1LTUgNXptMC04Yy0xLjY2IDAtMyAxLjM0LTMgM3MxLjM0IDMgMyAzIDMtMS4zNCAzLTMtMS4zNC0zLTMtM3pcIi8+XG4gICAgPC9zdmc+XG4gIGA7XG4gIGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGFzeW5jIChlKSA9PiB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICBjb25zdCBjYWNoZWQgPSBnZXRDYWNoZWRIaWRkZW5WaWRlbyh2aWRlb0lkKTtcbiAgICBjb25zdCBjdXJyZW50U3RhdGUgPSBjYWNoZWQ/LnN0YXRlIHx8ICdub3JtYWwnO1xuICAgIGNvbnN0IG5leHRTdGF0ZSA9IGN1cnJlbnRTdGF0ZSA9PT0gJ25vcm1hbCcgPyBnZXRJbmRpdmlkdWFsTW9kZSgpIDogJ25vcm1hbCc7XG5cbiAgICAvLyBVc2UgY2FjaGVkIGNsb3Nlc3RcbiAgICBjb25zdCBjb250YWluZXIgPSBjYWNoZWRDbG9zZXN0KGJ1dHRvbiwgU0VMRUNUT1JfU1RSSU5HUy5WSURFT19DT05UQUlORVJTKTtcbiAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICBjb250YWluZXIuc2V0QXR0cmlidXRlKCdkYXRhLXl0aHd2LXZpZGVvLWlkJywgdmlkZW9JZCk7XG4gICAgfVxuXG4gICAgY29uc3QgdGl0bGUgPSBleHRyYWN0VGl0bGVGcm9tQ29udGFpbmVyKGNvbnRhaW5lcik7XG4gICAgY29uc3QgcmVjb3JkID0gYXdhaXQgc2F2ZUhpZGRlblZpZGVvKHZpZGVvSWQsIG5leHRTdGF0ZSwgdGl0bGUpO1xuICAgIGNvbnN0IGVmZmVjdGl2ZVN0YXRlID0gcmVjb3JkID8gcmVjb3JkLnN0YXRlIDogJ25vcm1hbCc7XG5cbiAgICBhcHBseVN0YXRlVG9FeWVCdXR0b24oYnV0dG9uLCBlZmZlY3RpdmVTdGF0ZSk7XG5cbiAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICBjb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZShDU1NfQ0xBU1NFUy5JTkRJVklEVUFMX0RJTU1FRCwgQ1NTX0NMQVNTRVMuSU5ESVZJRFVBTF9ISURERU4pO1xuICAgICAgaWYgKGVmZmVjdGl2ZVN0YXRlID09PSAnZGltbWVkJykge1xuICAgICAgICBjb250YWluZXIuY2xhc3NMaXN0LmFkZChDU1NfQ0xBU1NFUy5JTkRJVklEVUFMX0RJTU1FRCk7XG4gICAgICB9IGVsc2UgaWYgKGVmZmVjdGl2ZVN0YXRlID09PSAnaGlkZGVuJykge1xuICAgICAgICBjb250YWluZXIuY2xhc3NMaXN0LmFkZChDU1NfQ0xBU1NFUy5JTkRJVklEVUFMX0hJRERFTik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVHJpZ2dlciBpbmRpdmlkdWFsIGhpZGluZyB1cGRhdGUgLSB3aWxsIGJlIGhhbmRsZWQgYnkgZXZlbnQgaGFuZGxlclxuICAgIGNvbnN0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCd5dC1od3YtaW5kaXZpZHVhbC11cGRhdGUnKTtcbiAgICBkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgfSk7XG4gIHJldHVybiBidXR0b247XG59XG4iLCJpbXBvcnQgeyBDU1NfQ0xBU1NFUywgU0VMRUNUT1JfQ0hBSU5TIH0gZnJvbSAnLi4vLi4vc2hhcmVkL2NvbnN0YW50cy5qcyc7XG5pbXBvcnQgeyBsb2dEZWJ1ZyB9IGZyb20gJy4uL3V0aWxzL2xvZ2dlci5qcyc7XG5pbXBvcnQgeyBnZXRDYWNoZWRIaWRkZW5WaWRlbyB9IGZyb20gJy4uL3N0b3JhZ2UvY2FjaGUuanMnO1xuaW1wb3J0IHsgZmV0Y2hIaWRkZW5WaWRlb1N0YXRlcywgc2V0SGlkZGVuVmlkZW9TdGF0ZSB9IGZyb20gJy4uL3N0b3JhZ2UvbWVzc2FnaW5nLmpzJztcbmltcG9ydCB7IGlzSW5kaXZpZHVhbE1vZGVFbmFibGVkIH0gZnJvbSAnLi4vc3RvcmFnZS9zZXR0aW5ncy5qcyc7XG5pbXBvcnQgeyBleHRyYWN0VGl0bGVGcm9tQ29udGFpbmVyIH0gZnJvbSAnLi4vdXRpbHMvZG9tLmpzJztcbmltcG9ydCB7IGhhbmRsZUFyaWFIaWRkZW5Db25mbGljdHMgfSBmcm9tICcuL2FjY2Vzc2liaWxpdHkuanMnO1xuaW1wb3J0IHsgY3JlYXRlRXllQnV0dG9uIH0gZnJvbSAnLi9leWVCdXR0b24uanMnO1xuaW1wb3J0IHsgY2FjaGVkRG9jdW1lbnRRdWVyeVdpdGhGYWxsYmFjaywgY2FjaGVkQ2xvc2VzdCwgY2FjaGVkUXVlcnlTZWxlY3RvciwgaW52YWxpZGF0ZURvY3VtZW50UXVlcnkgfSBmcm9tICcuLi91dGlscy9kb21DYWNoZS5qcyc7XG5pbXBvcnQgeyBzeW5jSW5kaXZpZHVhbENvbnRhaW5lclN0YXRlIH0gZnJvbSAnLi4vaGlkaW5nL2luZGl2aWR1YWxIaWRpbmcuanMnO1xuaW1wb3J0IHsgbG9nRXJyb3IgfSBmcm9tICcuLi8uLi9zaGFyZWQvZXJyb3JIYW5kbGVyLmpzJztcblxuYXN5bmMgZnVuY3Rpb24gc2F2ZUhpZGRlblZpZGVvKHZpZGVvSWQsIHN0YXRlLCB0aXRsZSA9IG51bGwpIHtcbiAgaWYgKCF2aWRlb0lkKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHNldEhpZGRlblZpZGVvU3RhdGUodmlkZW9JZCwgc3RhdGUsIHRpdGxlIHx8IHVuZGVmaW5lZCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhZGRFeWVCdXR0b25zKCkge1xuICAvLyBDaGVjayBpZiBJbmRpdmlkdWFsIE1vZGUgaXMgZW5hYmxlZFxuICBpZiAoIWlzSW5kaXZpZHVhbE1vZGVFbmFibGVkKCkpIHtcbiAgICAvLyBSZW1vdmUgZXhpc3RpbmcgZXllIGJ1dHRvbnMgaWYgSW5kaXZpZHVhbCBNb2RlIGlzIGRpc2FibGVkXG4gICAgY29uc3QgZXhpc3RpbmdCdXR0b25zID0gY2FjaGVkRG9jdW1lbnRRdWVyeVdpdGhGYWxsYmFjayhcbiAgICAgICdFWUVfQlVUVE9OJyxcbiAgICAgIFtgLiR7Q1NTX0NMQVNTRVMuRVlFX0JVVFRPTn1gXVxuICAgICk7XG4gICAgZXhpc3RpbmdCdXR0b25zLmZvckVhY2goYnV0dG9uID0+IGJ1dHRvbi5yZW1vdmUoKSk7XG5cbiAgICBjb25zdCB0aHVtYm5haWxzID0gY2FjaGVkRG9jdW1lbnRRdWVyeVdpdGhGYWxsYmFjayhcbiAgICAgICdIQVNfRVlFX0JVVFRPTicsXG4gICAgICBbYC4ke0NTU19DTEFTU0VTLkhBU19FWUVfQlVUVE9OfWBdXG4gICAgKTtcbiAgICB0aHVtYm5haWxzLmZvckVhY2godGh1bWJuYWlsID0+IHRodW1ibmFpbC5jbGFzc0xpc3QucmVtb3ZlKENTU19DTEFTU0VTLkhBU19FWUVfQlVUVE9OKSk7XG5cbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBVc2UgZmFsbGJhY2sgY2hhaW4gZm9yIHRodW1ibmFpbHNcbiAgY29uc3QgdGh1bWJuYWlscyA9IGNhY2hlZERvY3VtZW50UXVlcnlXaXRoRmFsbGJhY2soXG4gICAgJ1RIVU1CTkFJTFMnLFxuICAgIFNFTEVDVE9SX0NIQUlOUy5USFVNQk5BSUxTXG4gICk7XG5cbiAgbG9nRGVidWcoJ0ZvdW5kIHRodW1ibmFpbHM6JywgdGh1bWJuYWlscy5sZW5ndGgpO1xuXG4gIHRodW1ibmFpbHMuZm9yRWFjaCh0aHVtYm5haWwgPT4ge1xuICAgIGNvbnN0IGV4aXN0aW5nQnV0dG9uID0gY2FjaGVkUXVlcnlTZWxlY3Rvcih0aHVtYm5haWwsIGAuJHtDU1NfQ0xBU1NFUy5FWUVfQlVUVE9OfWApO1xuICAgIGlmIChleGlzdGluZ0J1dHRvbikgcmV0dXJuO1xuXG4gICAgLy8gVXNlIGNhY2hlZCBjbG9zZXN0L3F1ZXJ5U2VsZWN0b3JcbiAgICBjb25zdCBsaW5rID0gY2FjaGVkQ2xvc2VzdCh0aHVtYm5haWwsICdhJykgfHwgY2FjaGVkUXVlcnlTZWxlY3Rvcih0aHVtYm5haWwsICdhJyk7XG4gICAgaWYgKCFsaW5rKSByZXR1cm47XG5cbiAgICBjb25zdCBocmVmID0gbGluay5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcbiAgICBpZiAoIWhyZWYpIHJldHVybjtcblxuICAgIC8vIEV4dHJhY3QgdmlkZW8gSURcbiAgICBsZXQgdmlkZW9JZCA9IG51bGw7XG4gICAgY29uc3Qgd2F0Y2hNYXRjaCA9IGhyZWYubWF0Y2goL1xcL3dhdGNoXFw/dj0oW14mXSspLyk7XG4gICAgY29uc3Qgc2hvcnRzTWF0Y2ggPSBocmVmLm1hdGNoKC9cXC9zaG9ydHNcXC8oW14/XSspLyk7XG5cbiAgICBpZiAod2F0Y2hNYXRjaCkge1xuICAgICAgdmlkZW9JZCA9IHdhdGNoTWF0Y2hbMV07XG4gICAgfSBlbHNlIGlmIChzaG9ydHNNYXRjaCkge1xuICAgICAgdmlkZW9JZCA9IHNob3J0c01hdGNoWzFdO1xuICAgIH1cblxuICAgIGlmICghdmlkZW9JZCkgcmV0dXJuO1xuXG4gICAgY29uc3QgZXllQnV0dG9uID0gY3JlYXRlRXllQnV0dG9uKG51bGwsIHZpZGVvSWQpO1xuICAgIGlmICghZXllQnV0dG9uKSByZXR1cm47XG5cbiAgICB0aHVtYm5haWwuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuICAgIHRodW1ibmFpbC5hcHBlbmRDaGlsZChleWVCdXR0b24pO1xuICAgIHRodW1ibmFpbC5jbGFzc0xpc3QuYWRkKENTU19DTEFTU0VTLkhBU19FWUVfQlVUVE9OKTtcbiAgICB0aHVtYm5haWwuc2V0QXR0cmlidXRlKCdkYXRhLXl0aHd2LXZpZGVvLWlkJywgdmlkZW9JZCk7XG5cbiAgICAvLyBJbnZhbGlkYXRlIFRIVU1CTkFJTFMgY2FjaGUgc2luY2Ugd2UgbW9kaWZpZWQgdGhlIERPTVxuICAgIC8vIFRoaXMgZW5zdXJlcyBzdWJzZXF1ZW50IGNhbGxzIGRvbid0IGdldCBzdGFsZSBjYWNoZWQgcmVzdWx0c1xuICAgIGludmFsaWRhdGVEb2N1bWVudFF1ZXJ5KC95dC10aHVtYm5haWwuKm5vdC4qeXQtaHd2LWhhcy1leWUtYnV0dG9uL2kpO1xuXG4gICAgY29uc3QgcGFyZW50Q29udGFpbmVyID0gY2FjaGVkQ2xvc2VzdCh0aHVtYm5haWwsIFNFTEVDVE9SX0NIQUlOUy5WSURFT19DT05UQUlORVJTLmpvaW4oJywgJykpO1xuICAgIGlmIChwYXJlbnRDb250YWluZXIpIHtcbiAgICAgIHBhcmVudENvbnRhaW5lci5zZXRBdHRyaWJ1dGUoJ2RhdGEteXRod3YtdmlkZW8taWQnLCB2aWRlb0lkKTtcbiAgICB9XG5cbiAgICAvLyBGZXRjaCB2aWRlbyBzdGF0ZSBhbmQgc3luY2hyb25pemUgY29udGFpbmVyIENTUyBjbGFzc2VzXG4gICAgLy8gVGhpcyBwcmV2ZW50cyBhIHJhY2UgY29uZGl0aW9uIHdoZXJlIHRoZSBleWUgYnV0dG9uIHNob3dzIGNvcnJlY3Qgc3RhdGVcbiAgICAvLyBidXQgdGhlIGNvbnRhaW5lciBpcyBub3QgYWN0dWFsbHkgaGlkZGVuL2RpbW1lZCBhZnRlciBwYWdlIHJlbG9hZFxuICAgIGZldGNoSGlkZGVuVmlkZW9TdGF0ZXMoW3ZpZGVvSWRdKS50aGVuKCgpID0+IHtcbiAgICAgIGNvbnN0IHJlY29yZCA9IGdldENhY2hlZEhpZGRlblZpZGVvKHZpZGVvSWQpO1xuXG4gICAgICAvLyBBcHBseSBjb250YWluZXIgc3RhdGUgaW1tZWRpYXRlbHkgYWZ0ZXIgY2FjaGUgdXBkYXRlXG4gICAgICAvLyBUaGlzIGVuc3VyZXMgZXllIGJ1dHRvbiB2aXN1YWwgc3RhdGUgbWF0Y2hlcyBjb250YWluZXIgc3RhdGVcbiAgICAgIGlmIChyZWNvcmQgJiYgcGFyZW50Q29udGFpbmVyKSB7XG4gICAgICAgIHN5bmNJbmRpdmlkdWFsQ29udGFpbmVyU3RhdGUocGFyZW50Q29udGFpbmVyLCByZWNvcmQuc3RhdGUpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXJlY29yZCB8fCByZWNvcmQudGl0bGUpIHJldHVybjtcblxuICAgICAgY29uc3QgY29udGFpbmVyID0gY2FjaGVkQ2xvc2VzdCh0aHVtYm5haWwsIFNFTEVDVE9SX0NIQUlOUy5WSURFT19DT05UQUlORVJTLmpvaW4oJywgJykpO1xuICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICBjb250YWluZXIuc2V0QXR0cmlidXRlKCdkYXRhLXl0aHd2LXZpZGVvLWlkJywgdmlkZW9JZCk7XG4gICAgICB9XG4gICAgICBjb25zdCB2aWRlb1RpdGxlID0gZXh0cmFjdFRpdGxlRnJvbUNvbnRhaW5lcihjb250YWluZXIpO1xuICAgICAgaWYgKHZpZGVvVGl0bGUgJiYgdmlkZW9UaXRsZSAhPT0gJ1RvZ2dsZSB2aWRlbyB2aXNpYmlsaXR5Jykge1xuICAgICAgICBzYXZlSGlkZGVuVmlkZW8odmlkZW9JZCwgcmVjb3JkLnN0YXRlLCB2aWRlb1RpdGxlKTtcbiAgICAgIH1cbiAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgIGxvZ0Vycm9yKCdFeWVCdXR0b25NYW5hZ2VyJywgZXJyb3IsIHtcbiAgICAgICAgb3BlcmF0aW9uOiAnZmV0Y2hIaWRkZW5WaWRlb1N0YXRlcycsXG4gICAgICAgIHZpZGVvSWRcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgbG9nRGVidWcoJ0FkZGVkIGV5ZSBidXR0b24gdG8gdmlkZW86JywgdmlkZW9JZCk7XG4gIH0pO1xuXG4gIGhhbmRsZUFyaWFIaWRkZW5Db25mbGljdHMoKTtcbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBpbmplY3RTdHlsZXMoKSB7XG4gIGNvbnN0IHN0eWxlSWQgPSAneXQtaHd2LXN0eWxlcyc7XG4gIGlmIChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChzdHlsZUlkKSkgcmV0dXJuO1xuXG4gIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgc3R5bGUuaWQgPSBzdHlsZUlkO1xuICBzdHlsZS50ZXh0Q29udGVudCA9IGBcbiAgICAuWVQtSFdWLVdBVENIRUQtSElEREVOIHsgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50IH1cbiAgICAuWVQtSFdWLVdBVENIRUQtRElNTUVEIHsgb3BhY2l0eTogMC4zIH1cbiAgICAuWVQtSFdWLVNIT1JUUy1ISURERU4geyBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQgfVxuICAgIC5ZVC1IV1YtU0hPUlRTLURJTU1FRCB7IG9wYWNpdHk6IDAuMyB9XG4gICAgLllULUhXVi1ISURERU4tUk9XLVBBUkVOVCB7IHBhZGRpbmctYm90dG9tOiAxMHB4IH1cbiAgICAuWVQtSFdWLUlORElWSURVQUwtSElEREVOIHsgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50IH1cbiAgICAuWVQtSFdWLUlORElWSURVQUwtRElNTUVEIHsgb3BhY2l0eTogMC4zIH1cblxuICAgIC55dC1od3YtZXllLWJ1dHRvbiB7XG4gICAgICBwb3NpdGlvbjogYWJzb2x1dGUgIWltcG9ydGFudDtcbiAgICAgIHRvcDogOHB4ICFpbXBvcnRhbnQ7XG4gICAgICBsZWZ0OiA1MCUgIWltcG9ydGFudDtcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWCgtNTAlKSAhaW1wb3J0YW50O1xuICAgICAgei1pbmRleDogOTk5ICFpbXBvcnRhbnQ7XG4gICAgICBiYWNrZ3JvdW5kOiByZ2JhKDAsIDAsIDAsIDAuNykgIWltcG9ydGFudDtcbiAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xKSAhaW1wb3J0YW50O1xuICAgICAgYm9yZGVyLXJhZGl1czogNnB4ICFpbXBvcnRhbnQ7XG4gICAgICBwYWRkaW5nOiA2cHggOHB4ICFpbXBvcnRhbnQ7XG4gICAgICBjdXJzb3I6IHBvaW50ZXIgIWltcG9ydGFudDtcbiAgICAgIGRpc3BsYXk6IGZsZXggIWltcG9ydGFudDtcbiAgICAgIGFsaWduLWl0ZW1zOiBjZW50ZXIgIWltcG9ydGFudDtcbiAgICAgIGp1c3RpZnktY29udGVudDogY2VudGVyICFpbXBvcnRhbnQ7XG4gICAgICB0cmFuc2l0aW9uOiBhbGwgMC4ycyBlYXNlICFpbXBvcnRhbnQ7XG4gICAgICBib3gtc2hhZG93OiAwIDJweCA0cHggcmdiYSgwLDAsMCwwLjMpICFpbXBvcnRhbnQ7XG4gICAgICBvcGFjaXR5OiAwLjMgIWltcG9ydGFudDtcbiAgICB9XG5cbiAgICAueXQtaHd2LWV5ZS1idXR0b246aG92ZXIge1xuICAgICAgb3BhY2l0eTogMSAhaW1wb3J0YW50O1xuICAgICAgYmFja2dyb3VuZDogcmdiYSgwLCAwLCAwLCAxKSAhaW1wb3J0YW50O1xuICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVYKC01MCUpIHNjYWxlKDEuMSkgIWltcG9ydGFudDtcbiAgICAgIGJveC1zaGFkb3c6IDAgNHB4IDhweCByZ2JhKDAsMCwwLDAuNykgIWltcG9ydGFudDtcbiAgICB9XG5cbiAgICAueXQtaHd2LWV5ZS1idXR0b24gc3ZnIHtcbiAgICAgIHdpZHRoOiAyMHB4ICFpbXBvcnRhbnQ7XG4gICAgICBoZWlnaHQ6IDIwcHggIWltcG9ydGFudDtcbiAgICAgIGZpbGw6IHdoaXRlICFpbXBvcnRhbnQ7XG4gICAgICBwb2ludGVyLWV2ZW50czogbm9uZSAhaW1wb3J0YW50O1xuICAgIH1cblxuICAgIC55dC1od3YtZXllLWJ1dHRvbi5oaWRkZW4gc3ZnIHtcbiAgICAgIGZpbGw6ICNmZjQ0NDQgIWltcG9ydGFudDtcbiAgICB9XG5cbiAgICAueXQtaHd2LWV5ZS1idXR0b24uZGltbWVkIHN2ZyB7XG4gICAgICBmaWxsOiAjZmZhYTAwICFpbXBvcnRhbnQ7XG4gICAgfVxuXG4gICAgeXRkLXRodW1ibmFpbCwgeXQtdGh1bWJuYWlsLXZpZXctbW9kZWwsICNkaXNtaXNzaWJsZSwgI3RodW1ibmFpbC1jb250YWluZXIge1xuICAgICAgcG9zaXRpb246IHJlbGF0aXZlICFpbXBvcnRhbnQ7XG4gICAgfVxuICBgO1xuICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcblxuICAvLyBJbmplY3Qgbm90aWZpY2F0aW9uIHN0eWxlcyBmb3IgY29udGVudCBzY3JpcHRcbiAgaW5qZWN0Tm90aWZpY2F0aW9uU3R5bGVzKCk7XG59XG5cbmZ1bmN0aW9uIGluamVjdE5vdGlmaWNhdGlvblN0eWxlcygpIHtcbiAgY29uc3Qgbm90aWZpY2F0aW9uU3R5bGVJZCA9ICd5dC1od3Ytbm90aWZpY2F0aW9uLXN0eWxlcyc7XG4gIGlmIChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChub3RpZmljYXRpb25TdHlsZUlkKSkgcmV0dXJuO1xuXG4gIGNvbnN0IG5vdGlmaWNhdGlvblN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgbm90aWZpY2F0aW9uU3R5bGUuaWQgPSBub3RpZmljYXRpb25TdHlsZUlkO1xuICBub3RpZmljYXRpb25TdHlsZS50ZXh0Q29udGVudCA9IGBcbiAgICAueXQtaHd2LW5vdGlmaWNhdGlvbi1jb250YWluZXIge1xuICAgICAgcG9zaXRpb246IGZpeGVkO1xuICAgICAgdG9wOiAyMHB4O1xuICAgICAgcmlnaHQ6IDIwcHg7XG4gICAgICB6LWluZGV4OiA5OTk5OTk7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgICAgIGdhcDogMTBweDtcbiAgICAgIG1heC13aWR0aDogNDAwcHg7XG4gICAgfVxuXG4gICAgLnl0LWh3di1ub3RpZmljYXRpb24ge1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgICBnYXA6IDEycHg7XG4gICAgICBwYWRkaW5nOiAxMnB4IDE2cHg7XG4gICAgICBib3JkZXItcmFkaXVzOiA4cHg7XG4gICAgICBiYWNrZ3JvdW5kOiB3aGl0ZTtcbiAgICAgIGJveC1zaGFkb3c6IDAgNHB4IDEycHggcmdiYSgwLCAwLCAwLCAwLjE1KTtcbiAgICAgIG9wYWNpdHk6IDA7XG4gICAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVgoMTAwJSk7XG4gICAgICB0cmFuc2l0aW9uOiBhbGwgMC4zcyBlYXNlO1xuICAgIH1cblxuICAgIC55dC1od3Ytbm90aWZpY2F0aW9uLnZpc2libGUge1xuICAgICAgb3BhY2l0eTogMTtcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWCgwKTtcbiAgICB9XG5cbiAgICAueXQtaHd2LW5vdGlmaWNhdGlvbi5lcnJvciB7XG4gICAgICBiYWNrZ3JvdW5kOiAjZmVlO1xuICAgICAgYm9yZGVyLWxlZnQ6IDRweCBzb2xpZCAjYzAwO1xuICAgICAgY29sb3I6ICNjMDA7XG4gICAgfVxuXG4gICAgLnl0LWh3di1ub3RpZmljYXRpb24ud2FybmluZyB7XG4gICAgICBiYWNrZ3JvdW5kOiAjZmZjO1xuICAgICAgYm9yZGVyLWxlZnQ6IDRweCBzb2xpZCAjZmEwO1xuICAgICAgY29sb3I6ICNhNjA7XG4gICAgfVxuXG4gICAgLnl0LWh3di1ub3RpZmljYXRpb24uc3VjY2VzcyB7XG4gICAgICBiYWNrZ3JvdW5kOiAjZWZlO1xuICAgICAgYm9yZGVyLWxlZnQ6IDRweCBzb2xpZCAjMGEwO1xuICAgICAgY29sb3I6ICMwNjA7XG4gICAgfVxuXG4gICAgLnl0LWh3di1ub3RpZmljYXRpb24uaW5mbyB7XG4gICAgICBiYWNrZ3JvdW5kOiAjZWVmO1xuICAgICAgYm9yZGVyLWxlZnQ6IDRweCBzb2xpZCAjMDZjO1xuICAgICAgY29sb3I6ICMwNDg7XG4gICAgfVxuXG4gICAgLm5vdGlmaWNhdGlvbi1pY29uIHtcbiAgICAgIGZvbnQtc2l6ZTogMjBweDtcbiAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xuICAgIH1cblxuICAgIC5ub3RpZmljYXRpb24tbWVzc2FnZSB7XG4gICAgICBmbGV4OiAxO1xuICAgICAgZm9udC1zaXplOiAxNHB4O1xuICAgIH1cblxuICAgIC5ub3RpZmljYXRpb24tY2xvc2Uge1xuICAgICAgYmFja2dyb3VuZDogbm9uZTtcbiAgICAgIGJvcmRlcjogbm9uZTtcbiAgICAgIGZvbnQtc2l6ZTogMjBweDtcbiAgICAgIGN1cnNvcjogcG9pbnRlcjtcbiAgICAgIG9wYWNpdHk6IDAuNjtcbiAgICAgIHBhZGRpbmc6IDA7XG4gICAgICB3aWR0aDogMjBweDtcbiAgICAgIGhlaWdodDogMjBweDtcbiAgICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgICAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gICAgfVxuXG4gICAgLm5vdGlmaWNhdGlvbi1jbG9zZTpob3ZlciB7XG4gICAgICBvcGFjaXR5OiAxO1xuICAgIH1cblxuICAgIFtkYXRhLXRoZW1lPVwiZGFya1wiXSAueXQtaHd2LW5vdGlmaWNhdGlvbiB7XG4gICAgICBiYWNrZ3JvdW5kOiAjMzMzO1xuICAgICAgY29sb3I6ICNmZmY7XG4gICAgfVxuXG4gICAgW2RhdGEtdGhlbWU9XCJkYXJrXCJdIC55dC1od3Ytbm90aWZpY2F0aW9uLmVycm9yIHtcbiAgICAgIGJhY2tncm91bmQ6ICM0MDA7XG4gICAgICBib3JkZXItbGVmdC1jb2xvcjogI2Y4ODtcbiAgICAgIGNvbG9yOiAjZmNjO1xuICAgIH1cblxuICAgIFtkYXRhLXRoZW1lPVwiZGFya1wiXSAueXQtaHd2LW5vdGlmaWNhdGlvbi53YXJuaW5nIHtcbiAgICAgIGJhY2tncm91bmQ6ICM0NDA7XG4gICAgICBib3JkZXItbGVmdC1jb2xvcjogI2ZhMDtcbiAgICAgIGNvbG9yOiAjZmZjO1xuICAgIH1cblxuICAgIFtkYXRhLXRoZW1lPVwiZGFya1wiXSAueXQtaHd2LW5vdGlmaWNhdGlvbi5zdWNjZXNzIHtcbiAgICAgIGJhY2tncm91bmQ6ICMwNDA7XG4gICAgICBib3JkZXItbGVmdC1jb2xvcjogIzBmMDtcbiAgICAgIGNvbG9yOiAjY2ZjO1xuICAgIH1cblxuICAgIFtkYXRhLXRoZW1lPVwiZGFya1wiXSAueXQtaHd2LW5vdGlmaWNhdGlvbi5pbmZvIHtcbiAgICAgIGJhY2tncm91bmQ6ICMwMDQ7XG4gICAgICBib3JkZXItbGVmdC1jb2xvcjogIzA5ZjtcbiAgICAgIGNvbG9yOiAjY2NmO1xuICAgIH1cbiAgYDtcbiAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChub3RpZmljYXRpb25TdHlsZSk7XG59XG4iLCJleHBvcnQge1xuICBERUJVRyxcbiAgU1RPUkFHRV9LRVlTLFxuICBISURERU5fVklERU9fTUVTU0FHRVMsXG4gIENTU19DTEFTU0VTLFxuICBTRUxFQ1RPUlMsXG4gIFNFTEVDVE9SX1NUUklOR1MsXG4gIEVSUk9SX0NPTkZJRyxcbiAgQ0FDSEVfQ09ORklHLFxuICBJTlRFUlNFQ1RJT05fT0JTRVJWRVJfQ09ORklHXG59IGZyb20gJy4uLy4uL3NoYXJlZC9jb25zdGFudHMuanMnO1xuIiwiLyoqXG4gKiBSZW1vdmUgYSBDU1MgY2xhc3MgZnJvbSBhbGwgZWxlbWVudHMgdGhhdCBoYXZlIGl0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVDbGFzc0Zyb21BbGwoY2xhc3NOYW1lKSB7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoYC4ke2NsYXNzTmFtZX1gKS5mb3JFYWNoKChlbCkgPT4ge1xuICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoY2xhc3NOYW1lKTtcbiAgfSk7XG59XG5cbi8qKlxuICogUmVtb3ZlIG11bHRpcGxlIENTUyBjbGFzc2VzIGZyb20gYWxsIGVsZW1lbnRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVDbGFzc2VzRnJvbUFsbCguLi5jbGFzc05hbWVzKSB7XG4gIGNsYXNzTmFtZXMuZm9yRWFjaCgoY2xhc3NOYW1lKSA9PiB7XG4gICAgcmVtb3ZlQ2xhc3NGcm9tQWxsKGNsYXNzTmFtZSk7XG4gIH0pO1xufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQpIHtcbiAgbGV0IHRpbWVvdXQ7XG4gIGNvbnN0IGRlYm91bmNlZCA9IGZ1bmN0aW9uKC4uLmFyZ3MpIHtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gZnVuYy5hcHBseSh0aGlzLCBhcmdzKSwgd2FpdCk7XG4gIH07XG5cbiAgLy8gQWRkIGNhbmNlbCBtZXRob2QgdG8gY2xlYXIgcGVuZGluZyBjYWxsc1xuICBkZWJvdW5jZWQuY2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgIHRpbWVvdXQgPSBudWxsO1xuICB9O1xuXG4gIHJldHVybiBkZWJvdW5jZWQ7XG59XG4iLCJpbXBvcnQgeyBTRUxFQ1RPUlMsIENTU19DTEFTU0VTLCBTRUxFQ1RPUl9TVFJJTkdTIH0gZnJvbSAnLi9jb25zdGFudHMuanMnO1xuaW1wb3J0IHsgY2FjaGVkQ2xvc2VzdCwgY2FjaGVkUXVlcnlTZWxlY3RvciwgY2FjaGVkRG9jdW1lbnRRdWVyeSB9IGZyb20gJy4vZG9tQ2FjaGUuanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFZpZGVvSWRGcm9tSHJlZihocmVmKSB7XG4gIGlmICghaHJlZikgcmV0dXJuIG51bGw7XG4gIGNvbnN0IHdhdGNoTWF0Y2ggPSBocmVmLm1hdGNoKC9cXC93YXRjaFxcP3Y9KFteJl0rKS8pO1xuICBpZiAod2F0Y2hNYXRjaCkgcmV0dXJuIHdhdGNoTWF0Y2hbMV07XG4gIGNvbnN0IHNob3J0c01hdGNoID0gaHJlZi5tYXRjaCgvXFwvc2hvcnRzXFwvKFteP10rKS8pO1xuICBpZiAoc2hvcnRzTWF0Y2gpIHJldHVybiBzaG9ydHNNYXRjaFsxXTtcbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb2xsZWN0VmlzaWJsZVZpZGVvSWRzKCkge1xuICBjb25zdCBpZHMgPSBuZXcgU2V0KCk7XG5cbiAgY2FjaGVkRG9jdW1lbnRRdWVyeSgnW2RhdGEteXRod3YtdmlkZW8taWRdJykuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xuICAgIGNvbnN0IHZhbHVlID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEteXRod3YtdmlkZW8taWQnKTtcbiAgICBpZiAodmFsdWUpIGlkcy5hZGQodmFsdWUpO1xuICB9KTtcblxuICBjYWNoZWREb2N1bWVudFF1ZXJ5KCdhW2hyZWYqPVwiL3dhdGNoP3Y9XCJdLCBhW2hyZWYqPVwiL3Nob3J0cy9cIl0nKS5mb3JFYWNoKChsaW5rKSA9PiB7XG4gICAgY29uc3QgaWQgPSBleHRyYWN0VmlkZW9JZEZyb21IcmVmKGxpbmsuZ2V0QXR0cmlidXRlKCdocmVmJykpO1xuICAgIGlmIChpZCkgaWRzLmFkZChpZCk7XG4gIH0pO1xuXG4gIHJldHVybiBBcnJheS5mcm9tKGlkcyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kVmlkZW9Db250YWluZXJzKHZpZGVvSWQpIHtcbiAgY29uc3QgY29udGFpbmVycyA9IG5ldyBTZXQoKTtcblxuICAvLyBVc2UgY2FjaGVkIGRvY3VtZW50IHF1ZXJ5IGZvciBleWUgYnV0dG9uc1xuICBjb25zdCBidXR0b25zID0gY2FjaGVkRG9jdW1lbnRRdWVyeShgLiR7Q1NTX0NMQVNTRVMuRVlFX0JVVFRPTn1bZGF0YS12aWRlby1pZD1cIiR7dmlkZW9JZH1cIl1gKTtcbiAgYnV0dG9ucy5mb3JFYWNoKChidXR0b24pID0+IHtcbiAgICBjb25zdCBjb250YWluZXIgPSBjYWNoZWRDbG9zZXN0KGJ1dHRvbiwgU0VMRUNUT1JfU1RSSU5HUy5WSURFT19DT05UQUlORVJTKTtcbiAgICBpZiAoY29udGFpbmVyKSBjb250YWluZXJzLmFkZChjb250YWluZXIpO1xuICB9KTtcblxuICAvLyBVc2UgY2FjaGVkIGRvY3VtZW50IHF1ZXJ5IGZvciB2aWRlbyBsaW5rc1xuICBjb25zdCBsaW5rcyA9IGNhY2hlZERvY3VtZW50UXVlcnkoYGFbaHJlZio9XCIvd2F0Y2g/dj0ke3ZpZGVvSWR9XCJdLCBhW2hyZWYqPVwiL3Nob3J0cy8ke3ZpZGVvSWR9XCJdYCk7XG4gIGxpbmtzLmZvckVhY2goKGxpbmspID0+IHtcbiAgICBjb25zdCBjb250YWluZXIgPSBjYWNoZWRDbG9zZXN0KGxpbmssIFNFTEVDVE9SX1NUUklOR1MuVklERU9fQ09OVEFJTkVSUyk7XG4gICAgaWYgKGNvbnRhaW5lcikgY29udGFpbmVycy5hZGQoY29udGFpbmVyKTtcbiAgfSk7XG5cbiAgcmV0dXJuIEFycmF5LmZyb20oY29udGFpbmVycyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VGl0bGVGcm9tQ29udGFpbmVyKGNvbnRhaW5lcikge1xuICBpZiAoIWNvbnRhaW5lcikgcmV0dXJuICcnO1xuXG4gIGZvciAoY29uc3Qgc2VsZWN0b3Igb2YgU0VMRUNUT1JTLlRJVExFX0VMRU1FTlRTKSB7XG4gICAgY29uc3QgZWxlbWVudCA9IGNhY2hlZFF1ZXJ5U2VsZWN0b3IoY29udGFpbmVyLCBzZWxlY3Rvcik7XG4gICAgaWYgKGVsZW1lbnQgJiYgIWVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKENTU19DTEFTU0VTLkVZRV9CVVRUT04pKSB7XG4gICAgICBjb25zdCB0ZXh0ID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3RpdGxlJykgfHwgZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnKSB8fCBlbGVtZW50LnRleHRDb250ZW50Py50cmltKCkgfHwgJyc7XG4gICAgICBpZiAoIXRleHQpIHJldHVybiAnJztcbiAgICAgIGlmICh0ZXh0LmluY2x1ZGVzKCcgLSAnKSkge1xuICAgICAgICByZXR1cm4gdGV4dC5zcGxpdCgnIC0gJylbMF07XG4gICAgICB9XG4gICAgICBpZiAodGV4dC5pbmNsdWRlcygnIGJ5ICcpKSB7XG4gICAgICAgIHJldHVybiB0ZXh0LnNwbGl0KCcgYnkgJylbMF07XG4gICAgICB9XG4gICAgICByZXR1cm4gdGV4dDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuICcnO1xufVxuXG4vKipcbiAqIEV4dHJhY3QgdmlkZW8gSUQgZnJvbSBjb250YWluZXIgZWxlbWVudFxuICogQHBhcmFtIHtFbGVtZW50fSBjb250YWluZXIgLSBWaWRlbyBjb250YWluZXIgZWxlbWVudFxuICogQHJldHVybnMge3N0cmluZ3xudWxsfSBWaWRlbyBJRCBvciBudWxsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VmlkZW9JZEZyb21Db250YWluZXIoY29udGFpbmVyKSB7XG4gIGlmICghY29udGFpbmVyKSByZXR1cm4gbnVsbDtcblxuICAvLyBDaGVjayBkYXRhIGF0dHJpYnV0ZSBmaXJzdFxuICBjb25zdCBkYXRhSWQgPSBjb250YWluZXIuZ2V0QXR0cmlidXRlKCdkYXRhLXl0aHd2LXZpZGVvLWlkJyk7XG4gIGlmIChkYXRhSWQpIHJldHVybiBkYXRhSWQ7XG5cbiAgLy8gU2VhcmNoIGZvciB2aWRlbyBsaW5rc1xuICBjb25zdCBsaW5rID0gY2FjaGVkUXVlcnlTZWxlY3RvcihcbiAgICBjb250YWluZXIsXG4gICAgJ2FbaHJlZio9XCIvd2F0Y2g/dj1cIl0sIGFbaHJlZio9XCIvc2hvcnRzL1wiXSdcbiAgKTtcblxuICBpZiAobGluaykge1xuICAgIHJldHVybiBleHRyYWN0VmlkZW9JZEZyb21IcmVmKGxpbmsuZ2V0QXR0cmlidXRlKCdocmVmJykpO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG4iLCJpbXBvcnQgeyB0cmFja1NlbGVjdG9yUXVlcnkgfSBmcm9tICcuL2RvbVNlbGVjdG9ySGVhbHRoLmpzJztcbmltcG9ydCB7IERFQlVHIH0gZnJvbSAnLi4vdXRpbHMvY29uc3RhbnRzLmpzJztcbmltcG9ydCB7IGRlYnVnLCB3YXJuIH0gZnJvbSAnLi9sb2dnZXIuanMnO1xuXG4vLyBXZWFrTWFwIGNhY2hlcyBmb3IgZGlmZmVyZW50IHF1ZXJ5IHR5cGVzXG5jb25zdCBlbGVtZW50UGFyZW50Q2FjaGUgPSBuZXcgV2Vha01hcCgpO1xuY29uc3QgZWxlbWVudENoaWxkcmVuQ2FjaGUgPSBuZXcgV2Vha01hcCgpO1xuY29uc3QgZWxlbWVudFNlbGVjdG9yQ2FjaGUgPSBuZXcgV2Vha01hcCgpO1xuY29uc3QgcXVlcnlTZWxlY3RvckFsbENhY2hlID0gbmV3IE1hcCgpO1xuXG4vLyBQZXJmb3JtYW5jZSBtZXRyaWNzXG5jb25zdCBjYWNoZVN0YXRzID0ge1xuICBoaXRzOiAwLFxuICBtaXNzZXM6IDAsXG4gIGludmFsaWRhdGlvbnM6IDBcbn07XG5cbi8vIE1heGltdW0gY2FjaGUgc2l6ZSBmb3IgZG9jdW1lbnQgcXVlcmllcyAoTFJVIGJlaGF2aW9yKVxuY29uc3QgTUFYX0RPQ1VNRU5UX0NBQ0hFX1NJWkUgPSAxMDA7XG5cbi8qKlxuICogQ2FjaGUgdGhlIHJlc3VsdCBvZiBlbGVtZW50LmNsb3Nlc3Qoc2VsZWN0b3IpXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnQgLSBUaGUgc3RhcnRpbmcgZWxlbWVudFxuICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yIC0gVGhlIHNlbGVjdG9yIHRvIG1hdGNoXG4gKiBAcmV0dXJucyB7RWxlbWVudHxudWxsfSBUaGUgbWF0Y2hlZCBwYXJlbnQgZWxlbWVudCBvciBudWxsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYWNoZWRDbG9zZXN0KGVsZW1lbnQsIHNlbGVjdG9yKSB7XG4gIGlmICghZWxlbWVudCB8fCAhc2VsZWN0b3IpIHJldHVybiBudWxsO1xuXG4gIHRyeSB7XG4gICAgLy8gQ2hlY2sgY2FjaGVcbiAgICBpZiAoIWVsZW1lbnRQYXJlbnRDYWNoZS5oYXMoZWxlbWVudCkpIHtcbiAgICAgIGVsZW1lbnRQYXJlbnRDYWNoZS5zZXQoZWxlbWVudCwgbmV3IE1hcCgpKTtcbiAgICB9XG5cbiAgICBjb25zdCBzZWxlY3RvckNhY2hlID0gZWxlbWVudFBhcmVudENhY2hlLmdldChlbGVtZW50KTtcblxuICAgIGlmIChzZWxlY3RvckNhY2hlLmhhcyhzZWxlY3RvcikpIHtcbiAgICAgIGNhY2hlU3RhdHMuaGl0cysrO1xuICAgICAgcmV0dXJuIHNlbGVjdG9yQ2FjaGUuZ2V0KHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICAvLyBDYWNoZSBtaXNzIC0gcGVyZm9ybSBxdWVyeVxuICAgIGNhY2hlU3RhdHMubWlzc2VzKys7XG4gICAgY29uc3QgcmVzdWx0ID0gZWxlbWVudC5jbG9zZXN0KHNlbGVjdG9yKTtcbiAgICBzZWxlY3RvckNhY2hlLnNldChzZWxlY3RvciwgcmVzdWx0KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIC8vIEludmFsaWQgc2VsZWN0b3Igb3IgZWxlbWVudCAtIGZhbGwgYmFjayB0byB1bmNhY2hlZCBxdWVyeVxuICAgIHdhcm4oJ1tZVC1IV1YgQ2FjaGVdIEVycm9yIGluIGNhY2hlZENsb3Nlc3Q6JywgZXJyKTtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGVsZW1lbnQuY2xvc2VzdChzZWxlY3Rvcik7XG4gICAgfSBjYXRjaCAoZmFsbGJhY2tFcnJvcikge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQ2FjaGUgdGhlIHJlc3VsdCBvZiBlbGVtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnQgLSBUaGUgcGFyZW50IGVsZW1lbnRcbiAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciAtIFRoZSBzZWxlY3RvciB0byBtYXRjaFxuICogQHJldHVybnMge0VsZW1lbnR8bnVsbH0gVGhlIG1hdGNoZWQgY2hpbGQgZWxlbWVudCBvciBudWxsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYWNoZWRRdWVyeVNlbGVjdG9yKGVsZW1lbnQsIHNlbGVjdG9yKSB7XG4gIGlmICghZWxlbWVudCB8fCAhc2VsZWN0b3IpIHJldHVybiBudWxsO1xuXG4gIHRyeSB7XG4gICAgaWYgKCFlbGVtZW50Q2hpbGRyZW5DYWNoZS5oYXMoZWxlbWVudCkpIHtcbiAgICAgIGVsZW1lbnRDaGlsZHJlbkNhY2hlLnNldChlbGVtZW50LCBuZXcgTWFwKCkpO1xuICAgIH1cblxuICAgIGNvbnN0IHNlbGVjdG9yQ2FjaGUgPSBlbGVtZW50Q2hpbGRyZW5DYWNoZS5nZXQoZWxlbWVudCk7XG5cbiAgICBpZiAoc2VsZWN0b3JDYWNoZS5oYXMoc2VsZWN0b3IpKSB7XG4gICAgICBjYWNoZVN0YXRzLmhpdHMrKztcbiAgICAgIHJldHVybiBzZWxlY3RvckNhY2hlLmdldChzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgY2FjaGVTdGF0cy5taXNzZXMrKztcbiAgICBjb25zdCByZXN1bHQgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIHNlbGVjdG9yQ2FjaGUuc2V0KHNlbGVjdG9yLCByZXN1bHQpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgLy8gSW52YWxpZCBzZWxlY3RvciBvciBlbGVtZW50IC0gZmFsbCBiYWNrIHRvIHVuY2FjaGVkIHF1ZXJ5XG4gICAgd2FybignW1lULUhXViBDYWNoZV0gRXJyb3IgaW4gY2FjaGVkUXVlcnlTZWxlY3RvcjonLCBlcnIpO1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZWxlbWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICB9IGNhdGNoIChmYWxsYmFja0Vycm9yKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBDYWNoZSB0aGUgcmVzdWx0IG9mIGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcilcbiAqIFJldHVybnMgYXJyYXkgZm9yIGNvbnNpc3RlbmN5IGFuZCBlYXNpZXIgbWFuaXB1bGF0aW9uXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnQgLSBUaGUgcGFyZW50IGVsZW1lbnRcbiAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciAtIFRoZSBzZWxlY3RvciB0byBtYXRjaFxuICogQHJldHVybnMge0FycmF5PEVsZW1lbnQ+fSBBcnJheSBvZiBtYXRjaGVkIGVsZW1lbnRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYWNoZWRRdWVyeVNlbGVjdG9yQWxsKGVsZW1lbnQsIHNlbGVjdG9yKSB7XG4gIGlmICghZWxlbWVudCB8fCAhc2VsZWN0b3IpIHJldHVybiBbXTtcblxuICB0cnkge1xuICAgIGlmICghZWxlbWVudFNlbGVjdG9yQ2FjaGUuaGFzKGVsZW1lbnQpKSB7XG4gICAgICBlbGVtZW50U2VsZWN0b3JDYWNoZS5zZXQoZWxlbWVudCwgbmV3IE1hcCgpKTtcbiAgICB9XG5cbiAgICBjb25zdCBzZWxlY3RvckNhY2hlID0gZWxlbWVudFNlbGVjdG9yQ2FjaGUuZ2V0KGVsZW1lbnQpO1xuXG4gICAgaWYgKHNlbGVjdG9yQ2FjaGUuaGFzKHNlbGVjdG9yKSkge1xuICAgICAgY2FjaGVTdGF0cy5oaXRzKys7XG4gICAgICByZXR1cm4gc2VsZWN0b3JDYWNoZS5nZXQoc2VsZWN0b3IpO1xuICAgIH1cblxuICAgIGNhY2hlU3RhdHMubWlzc2VzKys7XG4gICAgY29uc3QgcmVzdWx0ID0gQXJyYXkuZnJvbShlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcbiAgICBzZWxlY3RvckNhY2hlLnNldChzZWxlY3RvciwgcmVzdWx0KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIC8vIEludmFsaWQgc2VsZWN0b3Igb3IgZWxlbWVudCAtIGZhbGwgYmFjayB0byB1bmNhY2hlZCBxdWVyeVxuICAgIHdhcm4oJ1tZVC1IV1YgQ2FjaGVdIEVycm9yIGluIGNhY2hlZFF1ZXJ5U2VsZWN0b3JBbGw6JywgZXJyKTtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIEFycmF5LmZyb20oZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG4gICAgfSBjYXRjaCAoZmFsbGJhY2tFcnJvcikge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIENhY2hlIGRvY3VtZW50LWxldmVsIHF1ZXJ5U2VsZWN0b3JBbGwgd2l0aCBUVExcbiAqIFVzZXMgTWFwIGluc3RlYWQgb2YgV2Vha01hcCBzaW5jZSBkb2N1bWVudCBpcyBhbHdheXMgcHJlc2VudFxuICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yIC0gVGhlIHNlbGVjdG9yIHRvIG1hdGNoXG4gKiBAcGFyYW0ge251bWJlcn0gdHRsIC0gVGltZSB0byBsaXZlIGluIG1pbGxpc2Vjb25kcyAoZGVmYXVsdCAxMDAwbXMpXG4gKiBAcmV0dXJucyB7QXJyYXk8RWxlbWVudD59IEFycmF5IG9mIG1hdGNoZWQgZWxlbWVudHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhY2hlZERvY3VtZW50UXVlcnkoc2VsZWN0b3IsIHR0bCA9IDEwMDApIHtcbiAgaWYgKCFzZWxlY3RvcikgcmV0dXJuIFtdO1xuXG4gIHRyeSB7XG4gICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcblxuICAgIC8vIENsZWFuIHVwIGV4cGlyZWQgZW50cmllcyBpZiBjYWNoZSBpcyBnZXR0aW5nIGxhcmdlXG4gICAgaWYgKHF1ZXJ5U2VsZWN0b3JBbGxDYWNoZS5zaXplID4gTUFYX0RPQ1VNRU5UX0NBQ0hFX1NJWkUpIHtcbiAgICAgIGNsZWFudXBFeHBpcmVkQ2FjaGVFbnRyaWVzKCk7XG4gICAgfVxuXG4gICAgY29uc3QgY2FjaGVkID0gcXVlcnlTZWxlY3RvckFsbENhY2hlLmdldChzZWxlY3Rvcik7XG5cbiAgICBpZiAoY2FjaGVkICYmIChub3cgLSBjYWNoZWQudGltZXN0YW1wKSA8IHR0bCkge1xuICAgICAgY2FjaGVTdGF0cy5oaXRzKys7XG4gICAgICByZXR1cm4gY2FjaGVkLnJlc3VsdHM7XG4gICAgfVxuXG4gICAgY2FjaGVTdGF0cy5taXNzZXMrKztcbiAgICBjb25zdCByZXN1bHRzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG4gICAgcXVlcnlTZWxlY3RvckFsbENhY2hlLnNldChzZWxlY3Rvciwge1xuICAgICAgcmVzdWx0cyxcbiAgICAgIHRpbWVzdGFtcDogbm93XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgLy8gSW52YWxpZCBzZWxlY3RvciAtIGZhbGwgYmFjayB0byB1bmNhY2hlZCBxdWVyeVxuICAgIHdhcm4oJ1tZVC1IV1YgQ2FjaGVdIEVycm9yIGluIGNhY2hlZERvY3VtZW50UXVlcnk6JywgZXJyKTtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xuICAgIH0gY2F0Y2ggKGZhbGxiYWNrRXJyb3IpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBDbGVhbiB1cCBleHBpcmVkIGNhY2hlIGVudHJpZXMgdG8gcHJldmVudCB1bmJvdW5kZWQgZ3Jvd3RoXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBjbGVhbnVwRXhwaXJlZENhY2hlRW50cmllcygpIHtcbiAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgY29uc3QgZW50cmllc1RvRGVsZXRlID0gW107XG5cbiAgLy8gSWRlbnRpZnkgZXhwaXJlZCBlbnRyaWVzICh1c2luZyBkZWZhdWx0IFRUTCBvZiAxMDAwbXMpXG4gIGZvciAoY29uc3QgW3NlbGVjdG9yLCBlbnRyeV0gb2YgcXVlcnlTZWxlY3RvckFsbENhY2hlLmVudHJpZXMoKSkge1xuICAgIGlmIChub3cgLSBlbnRyeS50aW1lc3RhbXAgPiAxMDAwKSB7XG4gICAgICBlbnRyaWVzVG9EZWxldGUucHVzaChzZWxlY3Rvcik7XG4gICAgfVxuICB9XG5cbiAgLy8gRGVsZXRlIGV4cGlyZWQgZW50cmllc1xuICBlbnRyaWVzVG9EZWxldGUuZm9yRWFjaChzZWxlY3RvciA9PiB7XG4gICAgcXVlcnlTZWxlY3RvckFsbENhY2hlLmRlbGV0ZShzZWxlY3Rvcik7XG4gIH0pO1xufVxuXG4vKipcbiAqIEludmFsaWRhdGUgY2FjaGUgZm9yIGEgc3BlY2lmaWMgZWxlbWVudFxuICogQ2FsbGVkIHdoZW4gYW4gZWxlbWVudCBpcyBtb2RpZmllZCBvciByZW1vdmVkXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnQgLSBUaGUgZWxlbWVudCB0byBpbnZhbGlkYXRlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnZhbGlkYXRlRWxlbWVudENhY2hlKGVsZW1lbnQpIHtcbiAgaWYgKCFlbGVtZW50KSByZXR1cm47XG5cbiAgLy8gRXhwbGljaXRseSBjbGVhciBuZXN0ZWQgTWFwcyBiZWZvcmUgZGVsZXRpb24gdG8gZW5zdXJlIHByb3BlciBjbGVhbnVwXG4gIGNvbnN0IHBhcmVudE1hcCA9IGVsZW1lbnRQYXJlbnRDYWNoZS5nZXQoZWxlbWVudCk7XG4gIGlmIChwYXJlbnRNYXApIHtcbiAgICBwYXJlbnRNYXAuY2xlYXIoKTtcbiAgfVxuXG4gIGNvbnN0IGNoaWxkcmVuTWFwID0gZWxlbWVudENoaWxkcmVuQ2FjaGUuZ2V0KGVsZW1lbnQpO1xuICBpZiAoY2hpbGRyZW5NYXApIHtcbiAgICBjaGlsZHJlbk1hcC5jbGVhcigpO1xuICB9XG5cbiAgY29uc3Qgc2VsZWN0b3JNYXAgPSBlbGVtZW50U2VsZWN0b3JDYWNoZS5nZXQoZWxlbWVudCk7XG4gIGlmIChzZWxlY3Rvck1hcCkge1xuICAgIHNlbGVjdG9yTWFwLmNsZWFyKCk7XG4gIH1cblxuICBlbGVtZW50UGFyZW50Q2FjaGUuZGVsZXRlKGVsZW1lbnQpO1xuICBlbGVtZW50Q2hpbGRyZW5DYWNoZS5kZWxldGUoZWxlbWVudCk7XG4gIGVsZW1lbnRTZWxlY3RvckNhY2hlLmRlbGV0ZShlbGVtZW50KTtcbiAgY2FjaGVTdGF0cy5pbnZhbGlkYXRpb25zKys7XG59XG5cbi8qKlxuICogSW52YWxpZGF0ZSBkb2N1bWVudC1sZXZlbCBxdWVyeSBjYWNoZSBmb3Igc3BlY2lmaWMgc2VsZWN0b3Igb3IgcGF0dGVyblxuICogQHBhcmFtIHtzdHJpbmd8UmVnRXhwfSBzZWxlY3RvclBhdHRlcm4gLSBUaGUgc2VsZWN0b3IgdG8gaW52YWxpZGF0ZSAoc3RyaW5nIG9yIHJlZ2V4IHBhdHRlcm4pXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnZhbGlkYXRlRG9jdW1lbnRRdWVyeShzZWxlY3RvclBhdHRlcm4pIHtcbiAgaWYgKCFzZWxlY3RvclBhdHRlcm4pIHtcbiAgICBxdWVyeVNlbGVjdG9yQWxsQ2FjaGUuY2xlYXIoKTtcbiAgICBjYWNoZVN0YXRzLmludmFsaWRhdGlvbnMrKztcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAodHlwZW9mIHNlbGVjdG9yUGF0dGVybiA9PT0gJ3N0cmluZycpIHtcbiAgICAvLyBFeGFjdCBtYXRjaFxuICAgIHF1ZXJ5U2VsZWN0b3JBbGxDYWNoZS5kZWxldGUoc2VsZWN0b3JQYXR0ZXJuKTtcbiAgICBjYWNoZVN0YXRzLmludmFsaWRhdGlvbnMrKztcbiAgfSBlbHNlIGlmIChzZWxlY3RvclBhdHRlcm4gaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAvLyBQYXR0ZXJuIG1hdGNoIC0gaW52YWxpZGF0ZSBhbGwgbWF0Y2hpbmcgc2VsZWN0b3JzXG4gICAgY29uc3Qga2V5c1RvRGVsZXRlID0gW107XG4gICAgZm9yIChjb25zdCBrZXkgb2YgcXVlcnlTZWxlY3RvckFsbENhY2hlLmtleXMoKSkge1xuICAgICAgaWYgKHNlbGVjdG9yUGF0dGVybi50ZXN0KGtleSkpIHtcbiAgICAgICAga2V5c1RvRGVsZXRlLnB1c2goa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gICAga2V5c1RvRGVsZXRlLmZvckVhY2goa2V5ID0+IHF1ZXJ5U2VsZWN0b3JBbGxDYWNoZS5kZWxldGUoa2V5KSk7XG4gICAgaWYgKGtleXNUb0RlbGV0ZS5sZW5ndGggPiAwKSB7XG4gICAgICBjYWNoZVN0YXRzLmludmFsaWRhdGlvbnMrKztcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBJbnZhbGlkYXRlIGNhY2hlIGVudHJpZXMgcmVsYXRlZCB0byB2aWRlbyBjb250YWluZXJzXG4gKiBNb3JlIGVmZmljaWVudCB0aGFuIGNsZWFyaW5nIGFsbCBjYWNoZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGludmFsaWRhdGVWaWRlb0NvbnRhaW5lckNhY2hlcygpIHtcbiAgLy8gSW52YWxpZGF0ZSBjb21tb24gdmlkZW8tcmVsYXRlZCBzZWxlY3RvcnNcbiAgY29uc3QgdmlkZW9TZWxlY3RvcnMgPSBbXG4gICAgL3l0ZC1yaWNoLWl0ZW0tcmVuZGVyZXIvLFxuICAgIC95dGQtdmlkZW8tcmVuZGVyZXIvLFxuICAgIC95dGQtZ3JpZC12aWRlby1yZW5kZXJlci8sXG4gICAgL3l0ZC1jb21wYWN0LXZpZGVvLXJlbmRlcmVyLyxcbiAgICAveXQtdGh1bWJuYWlsLyxcbiAgICAvcHJvZ3Jlc3MuKmJhci9pLFxuICAgIC93YXRjaFxcP3Y9LyxcbiAgICAvc2hvcnRzXFwvL1xuICBdO1xuXG4gIHZpZGVvU2VsZWN0b3JzLmZvckVhY2gocGF0dGVybiA9PiB7XG4gICAgaW52YWxpZGF0ZURvY3VtZW50UXVlcnkocGF0dGVybik7XG4gIH0pO1xufVxuXG4vKipcbiAqIENsZWFyIGFsbCBjYWNoZXMgKGNhbGxlZCBvbiBtYWpvciBET00gY2hhbmdlcylcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyQWxsQ2FjaGVzKCkge1xuICBxdWVyeVNlbGVjdG9yQWxsQ2FjaGUuY2xlYXIoKTtcbiAgLy8gV2Vha01hcHMgd2lsbCBiZSBnYXJiYWdlIGNvbGxlY3RlZCBhdXRvbWF0aWNhbGx5XG4gIGNhY2hlU3RhdHMuaW52YWxpZGF0aW9ucysrO1xufVxuXG4vKipcbiAqIEdldCBjYWNoZSBwZXJmb3JtYW5jZSBzdGF0aXN0aWNzXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBDYWNoZSBzdGF0aXN0aWNzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYWNoZVN0YXRzKCkge1xuICBjb25zdCB0b3RhbCA9IGNhY2hlU3RhdHMuaGl0cyArIGNhY2hlU3RhdHMubWlzc2VzO1xuICByZXR1cm4ge1xuICAgIC4uLmNhY2hlU3RhdHMsXG4gICAgaGl0UmF0ZTogdG90YWwgPiAwID8gKChjYWNoZVN0YXRzLmhpdHMgLyB0b3RhbCkgKiAxMDApLnRvRml4ZWQoMikgOiAwLFxuICAgIHRvdGFsUXVlcmllczogdG90YWxcbiAgfTtcbn1cblxuLyoqXG4gKiBSZXNldCBjYWNoZSBzdGF0aXN0aWNzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNldENhY2hlU3RhdHMoKSB7XG4gIGNhY2hlU3RhdHMuaGl0cyA9IDA7XG4gIGNhY2hlU3RhdHMubWlzc2VzID0gMDtcbiAgY2FjaGVTdGF0cy5pbnZhbGlkYXRpb25zID0gMDtcbn1cblxuLyoqXG4gKiBMb2cgY2FjaGUgc3RhdGlzdGljcyAoZGVidWcgbW9kZSBvbmx5KVxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9nQ2FjaGVTdGF0cygpIHtcbiAgY29uc3Qgc3RhdHMgPSBnZXRDYWNoZVN0YXRzKCk7XG4gIGRlYnVnKCdbWVQtSFdWIERPTSBDYWNoZV0nLCB7XG4gICAgJ0hpdCBSYXRlJzogYCR7c3RhdHMuaGl0UmF0ZX0lYCxcbiAgICAnSGl0cyc6IHN0YXRzLmhpdHMsXG4gICAgJ01pc3Nlcyc6IHN0YXRzLm1pc3NlcyxcbiAgICAnSW52YWxpZGF0aW9ucyc6IHN0YXRzLmludmFsaWRhdGlvbnMsXG4gICAgJ1RvdGFsIFF1ZXJpZXMnOiBzdGF0cy50b3RhbFF1ZXJpZXNcbiAgfSk7XG59XG5cbi8qKlxuICogUXVlcnkgd2l0aCBmYWxsYmFjayBzZWxlY3RvciBjaGFpblxuICogVHJpZXMgZWFjaCBzZWxlY3RvciB1bnRpbCBvbmUgc3VjY2VlZHNcbiAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvcktleSAtIEtleSBmb3IgaGVhbHRoIHRyYWNraW5nXG4gKiBAcGFyYW0ge0FycmF5PHN0cmluZz59IHNlbGVjdG9ycyAtIEFycmF5IG9mIHNlbGVjdG9ycyB0byB0cnlcbiAqIEBwYXJhbSB7bnVtYmVyfSB0dGwgLSBDYWNoZSBUVExcbiAqIEByZXR1cm5zIHtBcnJheTxFbGVtZW50Pn0gTWF0Y2hlZCBlbGVtZW50c1xuICovXG5leHBvcnQgZnVuY3Rpb24gY2FjaGVkRG9jdW1lbnRRdWVyeVdpdGhGYWxsYmFjayhzZWxlY3RvcktleSwgc2VsZWN0b3JzLCB0dGwgPSAxMDAwKSB7XG4gIGlmICghc2VsZWN0b3JzIHx8IHNlbGVjdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICB0cmFja1NlbGVjdG9yUXVlcnkoc2VsZWN0b3JLZXksIG51bGwsIGZhbHNlLCAwKTtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICAvLyBUcnkgZWFjaCBzZWxlY3RvciBpbiBvcmRlclxuICBmb3IgKGxldCBpID0gMDsgaSA8IHNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHRzID0gY2FjaGVkRG9jdW1lbnRRdWVyeShzZWxlY3RvciwgdHRsKTtcblxuICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID4gMCkge1xuICAgICAgICB0cmFja1NlbGVjdG9yUXVlcnkoc2VsZWN0b3JLZXksIHNlbGVjdG9yLCB0cnVlLCByZXN1bHRzLmxlbmd0aCk7XG5cbiAgICAgICAgLy8gTG9nIGlmIHVzaW5nIGZhbGxiYWNrIHNlbGVjdG9yIChub3QgdGhlIGZpcnN0IG9uZSlcbiAgICAgICAgaWYgKGkgPiAwICYmIERFQlVHKSB7XG4gICAgICAgICAgZGVidWcoYFtZVC1IV1ZdIFVzaW5nIGZhbGxiYWNrIHNlbGVjdG9yICMke2l9IGZvciAke3NlbGVjdG9yS2V5fTpgLCBzZWxlY3Rvcik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHdhcm4oYFtZVC1IV1ZdIFNlbGVjdG9yIGZhaWxlZDogJHtzZWxlY3Rvcn1gLCBlcnIpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEFsbCBzZWxlY3RvcnMgZmFpbGVkXG4gIHRyYWNrU2VsZWN0b3JRdWVyeShzZWxlY3RvcktleSwgc2VsZWN0b3JzWzBdLCBmYWxzZSwgMCk7XG4gIHJldHVybiBbXTtcbn1cblxuLyoqXG4gKiBFbGVtZW50IHF1ZXJ5IHdpdGggZmFsbGJhY2sgc2VsZWN0b3IgY2hhaW5cbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudCAtIFBhcmVudCBlbGVtZW50XG4gKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3JLZXkgLSBLZXkgZm9yIGhlYWx0aCB0cmFja2luZ1xuICogQHBhcmFtIHtBcnJheTxzdHJpbmc+fSBzZWxlY3RvcnMgLSBBcnJheSBvZiBzZWxlY3RvcnMgdG8gdHJ5XG4gKiBAcmV0dXJucyB7RWxlbWVudHxudWxsfSBGaXJzdCBtYXRjaGVkIGVsZW1lbnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhY2hlZFF1ZXJ5U2VsZWN0b3JXaXRoRmFsbGJhY2soZWxlbWVudCwgc2VsZWN0b3JLZXksIHNlbGVjdG9ycykge1xuICBpZiAoIWVsZW1lbnQgfHwgIXNlbGVjdG9ycyB8fCBzZWxlY3RvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHNlbGVjdG9yID0gc2VsZWN0b3JzW2ldO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBjYWNoZWRRdWVyeVNlbGVjdG9yKGVsZW1lbnQsIHNlbGVjdG9yKTtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgaWYgKGkgPiAwICYmIERFQlVHKSB7XG4gICAgICAgICAgZGVidWcoYFtZVC1IV1ZdIFVzaW5nIGZhbGxiYWNrIHNlbGVjdG9yICMke2l9IGZvciAke3NlbGVjdG9yS2V5fTpgLCBzZWxlY3Rvcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHdhcm4oYFtZVC1IV1ZdIFNlbGVjdG9yIGZhaWxlZDogJHtzZWxlY3Rvcn1gLCBlcnIpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuIiwiaW1wb3J0IHsgY2hlY2tDcml0aWNhbFNlbGVjdG9yc0hlYWx0aCwgZ2V0U2VsZWN0b3JIZWFsdGggfSBmcm9tICcuL2RvbVNlbGVjdG9ySGVhbHRoLmpzJztcbmltcG9ydCB7IHNob3dOb3RpZmljYXRpb24sIE5vdGlmaWNhdGlvblR5cGUgfSBmcm9tICcuLi8uLi9zaGFyZWQvbm90aWZpY2F0aW9ucy5qcyc7XG5pbXBvcnQgeyBTRUxFQ1RPUl9IRUFMVEhfQ09ORklHIH0gZnJvbSAnLi4vLi4vc2hhcmVkL2NvbnN0YW50cy5qcyc7XG5pbXBvcnQgeyBlcnJvciwgd2FybiB9IGZyb20gJy4vbG9nZ2VyLmpzJztcblxuLy8gVHJhY2sgbm90aWZpY2F0aW9uIHRpbWVzdGFtcHMgdG8gcHJldmVudCBzcGFtXG5jb25zdCBsYXN0Tm90aWZpY2F0aW9ucyA9IG5ldyBNYXAoKTtcblxuLyoqXG4gKiBTZXR1cCBwZXJpb2RpYyBET00gaGVhbHRoIG1vbml0b3JpbmdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwRE9NSGVhbHRoTW9uaXRvcmluZygpIHtcbiAgLy8gQ2hlY2sgc2VsZWN0b3IgaGVhbHRoIHBlcmlvZGljYWxseVxuICBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgcGVyZm9ybUhlYWx0aENoZWNrKCk7XG4gIH0sIFNFTEVDVE9SX0hFQUxUSF9DT05GSUcuSEVBTFRIX0NIRUNLX0lOVEVSVkFMKTtcbn1cblxuLyoqXG4gKiBQZXJmb3JtIGhlYWx0aCBjaGVjayBvbiBjcml0aWNhbCBzZWxlY3RvcnNcbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIHBlcmZvcm1IZWFsdGhDaGVjaygpIHtcbiAgY29uc3QgdW5oZWFsdGh5U2VsZWN0b3JzID0gY2hlY2tDcml0aWNhbFNlbGVjdG9yc0hlYWx0aCgpO1xuXG4gIGlmICh1bmhlYWx0aHlTZWxlY3RvcnMubGVuZ3RoID4gMCkge1xuICAgIGhhbmRsZVVuaGVhbHRoeVNlbGVjdG9ycyh1bmhlYWx0aHlTZWxlY3RvcnMpO1xuICB9XG59XG5cbi8qKlxuICogSGFuZGxlIHVuaGVhbHRoeSBzZWxlY3RvcnMgYnkgbm90aWZ5aW5nIHVzZXJzXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBcnJheX0gdW5oZWFsdGh5U2VsZWN0b3JzIC0gQXJyYXkgb2YgdW5oZWFsdGh5IHNlbGVjdG9yIGRhdGFcbiAqL1xuZnVuY3Rpb24gaGFuZGxlVW5oZWFsdGh5U2VsZWN0b3JzKHVuaGVhbHRoeVNlbGVjdG9ycykge1xuICBmb3IgKGNvbnN0IHsga2V5LCBoZWFsdGggfSBvZiB1bmhlYWx0aHlTZWxlY3RvcnMpIHtcbiAgICBjb25zdCBsYXN0Tm90aWZpY2F0aW9uID0gbGFzdE5vdGlmaWNhdGlvbnMuZ2V0KGtleSk7XG4gICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcblxuICAgIC8vIENoZWNrIGNvb2xkb3duXG4gICAgaWYgKGxhc3ROb3RpZmljYXRpb24gJiYgKG5vdyAtIGxhc3ROb3RpZmljYXRpb24pIDwgU0VMRUNUT1JfSEVBTFRIX0NPTkZJRy5OT1RJRklDQVRJT05fQ09PTERPV04pIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIERldGVybWluZSBzZXZlcml0eVxuICAgIGNvbnN0IHNldmVyaXR5ID0gZ2V0U2V2ZXJpdHkoaGVhbHRoLnN1Y2Nlc3NSYXRlKTtcblxuICAgIGlmIChzZXZlcml0eSA9PT0gJ2NyaXRpY2FsJykge1xuICAgICAgc2hvd0NyaXRpY2FsU2VsZWN0b3JGYWlsdXJlKGtleSwgaGVhbHRoKTtcbiAgICAgIGxhc3ROb3RpZmljYXRpb25zLnNldChrZXksIG5vdyk7XG4gICAgfSBlbHNlIGlmIChzZXZlcml0eSA9PT0gJ3dhcm5pbmcnKSB7XG4gICAgICBzaG93U2VsZWN0b3JXYXJuaW5nKGtleSwgaGVhbHRoKTtcbiAgICAgIGxhc3ROb3RpZmljYXRpb25zLnNldChrZXksIG5vdyk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogR2V0IHNldmVyaXR5IGxldmVsIGJhc2VkIG9uIHN1Y2Nlc3MgcmF0ZVxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7bnVtYmVyfSBzdWNjZXNzUmF0ZSAtIFN1Y2Nlc3MgcmF0ZSAoMC0xKVxuICogQHJldHVybnMge3N0cmluZ30gU2V2ZXJpdHkgbGV2ZWxcbiAqL1xuZnVuY3Rpb24gZ2V0U2V2ZXJpdHkoc3VjY2Vzc1JhdGUpIHtcbiAgaWYgKHN1Y2Nlc3NSYXRlIDwgMC4zKSByZXR1cm4gJ2NyaXRpY2FsJztcbiAgaWYgKHN1Y2Nlc3NSYXRlIDwgMC43KSByZXR1cm4gJ3dhcm5pbmcnO1xuICByZXR1cm4gJ29rJztcbn1cblxuLyoqXG4gKiBTaG93IGNyaXRpY2FsIHNlbGVjdG9yIGZhaWx1cmUgbm90aWZpY2F0aW9uXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yS2V5IC0gU2VsZWN0b3IgaWRlbnRpZmllclxuICogQHBhcmFtIHtPYmplY3R9IGhlYWx0aCAtIEhlYWx0aCBzdGF0aXN0aWNzXG4gKi9cbmZ1bmN0aW9uIHNob3dDcml0aWNhbFNlbGVjdG9yRmFpbHVyZShzZWxlY3RvcktleSwgaGVhbHRoKSB7XG4gIGNvbnN0IG1lc3NhZ2UgPSAnWW91VHViZSBzdHJ1Y3R1cmUgY2hhbmdlZC4gU29tZSB2aWRlb3MgbWF5IG5vdCBiZSBkZXRlY3RlZC4gUGxlYXNlIHJlcG9ydCB0aGlzIGlzc3VlLic7XG5cbiAgZXJyb3IoJ1tZVC1IV1ZdIENyaXRpY2FsIHNlbGVjdG9yIGZhaWx1cmU6JyxcbiAgICAnc2VsZWN0b3I6Jywgc2VsZWN0b3JLZXksXG4gICAgJ3N1Y2Nlc3NSYXRlOicsIGhlYWx0aC5zdWNjZXNzUmF0ZSxcbiAgICAncXVlcmllczonLCBoZWFsdGgucXVlcmllc1xuICApO1xuXG4gIHNob3dOb3RpZmljYXRpb24obWVzc2FnZSwgTm90aWZpY2F0aW9uVHlwZS5FUlJPUiwgODAwMCk7XG59XG5cbi8qKlxuICogU2hvdyBzZWxlY3RvciB3YXJuaW5nIG5vdGlmaWNhdGlvblxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvcktleSAtIFNlbGVjdG9yIGlkZW50aWZpZXJcbiAqIEBwYXJhbSB7T2JqZWN0fSBoZWFsdGggLSBIZWFsdGggc3RhdGlzdGljc1xuICovXG5mdW5jdGlvbiBzaG93U2VsZWN0b3JXYXJuaW5nKHNlbGVjdG9yS2V5LCBoZWFsdGgpIHtcbiAgY29uc3QgbWVzc2FnZSA9ICdFeHRlbnNpb24gbWF5IG5vdCBkZXRlY3QgYWxsIHZpZGVvcy4gWW91VHViZSBtaWdodCBoYXZlIGNoYW5nZWQgdGhlaXIgbGF5b3V0Lic7XG5cbiAgd2FybignW1lULUhXVl0gU2VsZWN0b3IgZGVncmFkYXRpb246JyxcbiAgICAnc2VsZWN0b3I6Jywgc2VsZWN0b3JLZXksXG4gICAgJ3N1Y2Nlc3NSYXRlOicsIGhlYWx0aC5zdWNjZXNzUmF0ZVxuICApO1xuXG4gIHNob3dOb3RpZmljYXRpb24obWVzc2FnZSwgTm90aWZpY2F0aW9uVHlwZS5XQVJOSU5HLCA1MDAwKTtcbn1cblxuLyoqXG4gKiBNYW51YWwgdHJpZ2dlciBmb3IgdGVzdGluZyBET00gaGVhbHRoXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBhbGwgc2VsZWN0b3JzIGFyZSBoZWFsdGh5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXN0RE9NSGVhbHRoKCkge1xuICBjb25zdCB1bmhlYWx0aHlTZWxlY3RvcnMgPSBjaGVja0NyaXRpY2FsU2VsZWN0b3JzSGVhbHRoKCk7XG5cbiAgaWYgKHVuaGVhbHRoeVNlbGVjdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICBzaG93Tm90aWZpY2F0aW9uKCdBbGwgRE9NIHNlbGVjdG9ycyBhcmUgaGVhbHRoeScsIE5vdGlmaWNhdGlvblR5cGUuU1VDQ0VTUywgMzAwMCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBoYW5kbGVVbmhlYWx0aHlTZWxlY3RvcnModW5oZWFsdGh5U2VsZWN0b3JzKTtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBFeHBvc2UgZm9yIGRlYnVnZ2luZ1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gIHdpbmRvdy5ZVEhXVl9UZXN0RE9NSGVhbHRoID0gdGVzdERPTUhlYWx0aDtcbn1cbiIsIi8vIFRyYWNrIHNlbGVjdG9yIHVzYWdlIGFuZCBzdWNjZXNzL2ZhaWx1cmUgcmF0ZXNcbmNvbnN0IHNlbGVjdG9yU3RhdHMgPSBuZXcgTWFwKCk7XG5cbi8qKlxuICogVHJhY2sgc2VsZWN0b3IgcXVlcnkgcmVzdWx0IGZvciBoZWFsdGggbW9uaXRvcmluZ1xuICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yS2V5IC0gS2V5IGlkZW50aWZ5aW5nIHRoZSBzZWxlY3RvciB0eXBlXG4gKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3IgLSBUaGUgYWN0dWFsIHNlbGVjdG9yIHN0cmluZyB1c2VkXG4gKiBAcGFyYW0ge2Jvb2xlYW59IHN1Y2Nlc3MgLSBXaGV0aGVyIHRoZSBxdWVyeSBzdWNjZWVkZWQgKGZvdW5kIGVsZW1lbnRzKVxuICogQHBhcmFtIHtudW1iZXJ9IGVsZW1lbnRDb3VudCAtIE51bWJlciBvZiBlbGVtZW50cyBmb3VuZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHJhY2tTZWxlY3RvclF1ZXJ5KHNlbGVjdG9yS2V5LCBzZWxlY3Rvciwgc3VjY2VzcywgZWxlbWVudENvdW50ID0gMCkge1xuICBpZiAoIXNlbGVjdG9yU3RhdHMuaGFzKHNlbGVjdG9yS2V5KSkge1xuICAgIHNlbGVjdG9yU3RhdHMuc2V0KHNlbGVjdG9yS2V5LCB7XG4gICAgICBxdWVyaWVzOiAwLFxuICAgICAgc3VjY2Vzc2VzOiAwLFxuICAgICAgZmFpbHVyZXM6IDAsXG4gICAgICBsYXN0U3VjY2VzczogbnVsbCxcbiAgICAgIGxhc3RGYWlsdXJlOiBudWxsLFxuICAgICAgZWxlbWVudENvdW50czogW11cbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHN0YXRzID0gc2VsZWN0b3JTdGF0cy5nZXQoc2VsZWN0b3JLZXkpO1xuICBzdGF0cy5xdWVyaWVzKys7XG5cbiAgaWYgKHN1Y2Nlc3MgJiYgZWxlbWVudENvdW50ID4gMCkge1xuICAgIHN0YXRzLnN1Y2Nlc3NlcysrO1xuICAgIHN0YXRzLmxhc3RTdWNjZXNzID0gRGF0ZS5ub3coKTtcbiAgICBzdGF0cy5lbGVtZW50Q291bnRzLnB1c2goZWxlbWVudENvdW50KTtcbiAgfSBlbHNlIHtcbiAgICBzdGF0cy5mYWlsdXJlcysrO1xuICAgIHN0YXRzLmxhc3RGYWlsdXJlID0gRGF0ZS5ub3coKTtcbiAgfVxuXG4gIC8vIEtlZXAgb25seSBsYXN0IDEwMCBjb3VudHMgdG8gcHJldmVudCB1bmJvdW5kZWQgbWVtb3J5IGdyb3d0aFxuICBpZiAoc3RhdHMuZWxlbWVudENvdW50cy5sZW5ndGggPiAxMDApIHtcbiAgICBzdGF0cy5lbGVtZW50Q291bnRzLnNoaWZ0KCk7XG4gIH1cbn1cblxuLyoqXG4gKiBHZXQgaGVhbHRoIHN0YXR1cyBmb3IgYSBzcGVjaWZpYyBzZWxlY3RvclxuICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yS2V5IC0gS2V5IGlkZW50aWZ5aW5nIHRoZSBzZWxlY3RvciB0eXBlXG4gKiBAcmV0dXJucyB7T2JqZWN0fG51bGx9IEhlYWx0aCBzdGF0aXN0aWNzIG9yIG51bGwgaWYgbm8gZGF0YVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2VsZWN0b3JIZWFsdGgoc2VsZWN0b3JLZXkpIHtcbiAgY29uc3Qgc3RhdHMgPSBzZWxlY3RvclN0YXRzLmdldChzZWxlY3RvcktleSk7XG4gIGlmICghc3RhdHMpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IHN1Y2Nlc3NSYXRlID0gc3RhdHMucXVlcmllcyA+IDAgPyAoc3RhdHMuc3VjY2Vzc2VzIC8gc3RhdHMucXVlcmllcykgOiAwO1xuICBjb25zdCBhdmdFbGVtZW50Q291bnQgPSBzdGF0cy5lbGVtZW50Q291bnRzLmxlbmd0aCA+IDBcbiAgICA/IHN0YXRzLmVsZW1lbnRDb3VudHMucmVkdWNlKChhLCBiKSA9PiBhICsgYiwgMCkgLyBzdGF0cy5lbGVtZW50Q291bnRzLmxlbmd0aFxuICAgIDogMDtcblxuICByZXR1cm4ge1xuICAgIC4uLnN0YXRzLFxuICAgIHN1Y2Nlc3NSYXRlLFxuICAgIGF2Z0VsZW1lbnRDb3VudCxcbiAgICBpc0hlYWx0aHk6IHN1Y2Nlc3NSYXRlID4gMC43ICYmIHN0YXRzLnF1ZXJpZXMgPj0gMTBcbiAgfTtcbn1cblxuLyoqXG4gKiBDaGVjayBoZWFsdGggb2YgY3JpdGljYWwgc2VsZWN0b3JzXG4gKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHVuaGVhbHRoeSBzZWxlY3RvcnMgd2l0aCB0aGVpciBoZWFsdGggZGF0YVxuICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tDcml0aWNhbFNlbGVjdG9yc0hlYWx0aCgpIHtcbiAgY29uc3QgY3JpdGljYWxTZWxlY3RvcnMgPSBbXG4gICAgJ1BST0dSRVNTX0JBUicsXG4gICAgJ1ZJREVPX0NPTlRBSU5FUlMnLFxuICAgICdUSFVNQk5BSUxTJyxcbiAgICAnU0hPUlRTX0NPTlRBSU5FUlMnXG4gIF07XG5cbiAgY29uc3QgdW5oZWFsdGh5U2VsZWN0b3JzID0gW107XG5cbiAgZm9yIChjb25zdCBrZXkgb2YgY3JpdGljYWxTZWxlY3RvcnMpIHtcbiAgICBjb25zdCBoZWFsdGggPSBnZXRTZWxlY3RvckhlYWx0aChrZXkpO1xuICAgIGlmIChoZWFsdGggJiYgIWhlYWx0aC5pc0hlYWx0aHkpIHtcbiAgICAgIHVuaGVhbHRoeVNlbGVjdG9ycy5wdXNoKHsga2V5LCBoZWFsdGggfSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHVuaGVhbHRoeVNlbGVjdG9ycztcbn1cblxuLyoqXG4gKiBHZXQgYWxsIHNlbGVjdG9yIHN0YXRpc3RpY3NcbiAqIEByZXR1cm5zIHtPYmplY3R9IFN0YXRpc3RpY3MgZm9yIGFsbCBzZWxlY3RvcnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbFNlbGVjdG9yU3RhdHMoKSB7XG4gIGNvbnN0IHN0YXRzID0ge307XG4gIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIHNlbGVjdG9yU3RhdHMuZW50cmllcygpKSB7XG4gICAgc3RhdHNba2V5XSA9IGdldFNlbGVjdG9ySGVhbHRoKGtleSk7XG4gIH1cbiAgcmV0dXJuIHN0YXRzO1xufVxuXG4vKipcbiAqIFJlc2V0IGFsbCBzZWxlY3RvciBzdGF0aXN0aWNzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNldFNlbGVjdG9yU3RhdHMoKSB7XG4gIHNlbGVjdG9yU3RhdHMuY2xlYXIoKTtcbn1cblxuLy8gRXhwb3NlIGZvciBkZWJ1Z2dpbmcgaW4gYnJvd3NlciBjb25zb2xlXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgd2luZG93LllUSFdWX1NlbGVjdG9ySGVhbHRoID0ge1xuICAgIGdldFN0YXRzOiBnZXRBbGxTZWxlY3RvclN0YXRzLFxuICAgIGdldEhlYWx0aDogZ2V0U2VsZWN0b3JIZWFsdGgsXG4gICAgY2hlY2tDcml0aWNhbDogY2hlY2tDcml0aWNhbFNlbGVjdG9yc0hlYWx0aCxcbiAgICByZXNldDogcmVzZXRTZWxlY3RvclN0YXRzXG4gIH07XG59XG4iLCIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgRGVidWcgbG9nZ2luZyB1dGlsaXR5IHdpdGggYnVpbGQtdGltZSBzdHJpcHBpbmcgZm9yIHByb2R1Y3Rpb25cbiAqXG4gKiBUaGlzIG1vZHVsZSBwcm92aWRlcyBsb2dnaW5nIGZ1bmN0aW9ucyB0aGF0IGFyZSBhdXRvbWF0aWNhbGx5IHJlbW92ZWQgaW4gcHJvZHVjdGlvbiBidWlsZHMuXG4gKiBUaGUgREVCVUcgZmxhZyBpcyBzZXQgYXQgYnVpbGQgdGltZSBieSB3ZWJwYWNrIERlZmluZVBsdWdpbi5cbiAqXG4gKiBVc2FnZTpcbiAqICAgaW1wb3J0IHsgZGVidWcsIGVycm9yLCB3YXJuLCBpbmZvIH0gZnJvbSAnLi91dGlscy9sb2dnZXIuanMnO1xuICogICBkZWJ1ZygnW0NvbXBvbmVudF0nLCAnRGVidWcgbWVzc2FnZScsIGRhdGEpO1xuICogICBlcnJvcignW0NvbXBvbmVudF0nLCAnRXJyb3Igb2NjdXJyZWQnLCBlcnJvck9iaik7XG4gKlxuICogSW4gcHJvZHVjdGlvbiBidWlsZHM6XG4gKiAtIERFQlVHIGlzIHJlcGxhY2VkIHdpdGggZmFsc2UgYnkgd2VicGFjayBEZWZpbmVQbHVnaW5cbiAqIC0gRGVhZCBjb2RlIGVsaW1pbmF0aW9uIHJlbW92ZXMgYWxsIGlmIChERUJVRykgYmxvY2tzXG4gKiAtIFRlcnNlcidzIGRyb3BfY29uc29sZSByZW1vdmVzIGFueSByZW1haW5pbmcgY29uc29sZSBzdGF0ZW1lbnRzXG4gKi9cblxuaW1wb3J0IHsgREVCVUcgfSBmcm9tICcuL2NvbnN0YW50cy5qcyc7XG5cbi8qKlxuICogTG9nIGRlYnVnIGluZm9ybWF0aW9uIChyZW1vdmVkIGluIHByb2R1Y3Rpb24pXG4gKiBAcGFyYW0gey4uLmFueX0gYXJncyAtIEFyZ3VtZW50cyB0byBsb2dcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlYnVnKC4uLmFyZ3MpIHtcbiAgaWYgKERFQlVHKSB7XG4gICAgY29uc29sZS5sb2coLi4uYXJncyk7XG4gIH1cbn1cblxuLyoqXG4gKiBMZWdhY3kgZnVuY3Rpb24gZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbiAqIEBwYXJhbSB7Li4uYW55fSBtc2dzIC0gTWVzc2FnZXMgdG8gbG9nXG4gKiBAZGVwcmVjYXRlZCBVc2UgZGVidWcoKSBpbnN0ZWFkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2dEZWJ1ZyguLi5tc2dzKSB7XG4gIGlmIChERUJVRykge1xuICAgIGNvbnNvbGUubG9nKCdbWVQtSFdWXScsIC4uLm1zZ3MpO1xuICB9XG59XG5cbi8qKlxuICogTG9nIGVycm9yIGluZm9ybWF0aW9uIChyZW1vdmVkIGluIHByb2R1Y3Rpb24pXG4gKiBAcGFyYW0gey4uLmFueX0gYXJncyAtIEFyZ3VtZW50cyB0byBsb2dcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVycm9yKC4uLmFyZ3MpIHtcbiAgaWYgKERFQlVHKSB7XG4gICAgY29uc29sZS5lcnJvciguLi5hcmdzKTtcbiAgfVxufVxuXG4vKipcbiAqIExvZyB3YXJuaW5nIGluZm9ybWF0aW9uIChyZW1vdmVkIGluIHByb2R1Y3Rpb24pXG4gKiBAcGFyYW0gey4uLmFueX0gYXJncyAtIEFyZ3VtZW50cyB0byBsb2dcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdhcm4oLi4uYXJncykge1xuICBpZiAoREVCVUcpIHtcbiAgICBjb25zb2xlLndhcm4oLi4uYXJncyk7XG4gIH1cbn1cblxuLyoqXG4gKiBMb2cgaW5mb3JtYXRpb25hbCBtZXNzYWdlcyAocmVtb3ZlZCBpbiBwcm9kdWN0aW9uKVxuICogQHBhcmFtIHsuLi5hbnl9IGFyZ3MgLSBBcmd1bWVudHMgdG8gbG9nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbmZvKC4uLmFyZ3MpIHtcbiAgaWYgKERFQlVHKSB7XG4gICAgY29uc29sZS5pbmZvKC4uLmFyZ3MpO1xuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgbmFtZXNwYWNlZCBsb2dnZXIgZm9yIGEgc3BlY2lmaWMgY29tcG9uZW50XG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZXNwYWNlIC0gQ29tcG9uZW50IG9yIG1vZHVsZSBuYW1lXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBMb2dnZXIgb2JqZWN0IHdpdGggbmFtZXNwYWNlZCBtZXRob2RzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMb2dnZXIobmFtZXNwYWNlKSB7XG4gIGNvbnN0IHByZWZpeCA9IGBbJHtuYW1lc3BhY2V9XWA7XG5cbiAgcmV0dXJuIHtcbiAgICBkZWJ1ZzogKC4uLmFyZ3MpID0+IGRlYnVnKHByZWZpeCwgLi4uYXJncyksXG4gICAgZXJyb3I6ICguLi5hcmdzKSA9PiBlcnJvcihwcmVmaXgsIC4uLmFyZ3MpLFxuICAgIHdhcm46ICguLi5hcmdzKSA9PiB3YXJuKHByZWZpeCwgLi4uYXJncyksXG4gICAgaW5mbzogKC4uLmFyZ3MpID0+IGluZm8ocHJlZml4LCAuLi5hcmdzKSxcbiAgfTtcbn1cbiIsImltcG9ydCB7IElOVEVSU0VDVElPTl9PQlNFUlZFUl9DT05GSUcgfSBmcm9tICcuL2NvbnN0YW50cy5qcyc7XG5pbXBvcnQgeyBsb2dEZWJ1ZyB9IGZyb20gJy4vbG9nZ2VyLmpzJztcblxuLy8gVHJhY2sgdmlzaWJpbGl0eSBzdGF0ZSBvZiB2aWRlbyBjb250YWluZXJzXG5jb25zdCB2aXNpYmxlVmlkZW9zID0gbmV3IFNldCgpO1xuY29uc3QgdmlzaWJpbGl0eUNhbGxiYWNrcyA9IG5ldyBTZXQoKTtcblxuLyoqXG4gKiBDaGVjayBpZiBlbGVtZW50IGlzIHZpc2libGUgYmFzZWQgb24gaW50ZXJzZWN0aW9uIHJhdGlvXG4gKiBAcGFyYW0ge0ludGVyc2VjdGlvbk9ic2VydmVyRW50cnl9IGVudHJ5XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNFbGVtZW50VmlzaWJsZShlbnRyeSkge1xuICByZXR1cm4gZW50cnkuaXNJbnRlcnNlY3RpbmcgJiZcbiAgICAgICAgIGVudHJ5LmludGVyc2VjdGlvblJhdGlvID49IElOVEVSU0VDVElPTl9PQlNFUlZFUl9DT05GSUcuVklTSUJJTElUWV9USFJFU0hPTEQ7XG59XG5cbi8qKlxuICogQWRkIGNhbGxiYWNrIHRvIGJlIG5vdGlmaWVkIHdoZW4gdmlzaWJpbGl0eSBjaGFuZ2VzXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICovXG5leHBvcnQgZnVuY3Rpb24gb25WaXNpYmlsaXR5Q2hhbmdlKGNhbGxiYWNrKSB7XG4gIHZpc2liaWxpdHlDYWxsYmFja3MuYWRkKGNhbGxiYWNrKTtcbiAgcmV0dXJuICgpID0+IHZpc2liaWxpdHlDYWxsYmFja3MuZGVsZXRlKGNhbGxiYWNrKTtcbn1cblxuLyoqXG4gKiBOb3RpZnkgYWxsIHJlZ2lzdGVyZWQgY2FsbGJhY2tzIG9mIHZpc2liaWxpdHkgY2hhbmdlXG4gKiBAcGFyYW0ge0FycmF5PEVsZW1lbnQ+fSBiZWNhbWVWaXNpYmxlXG4gKiBAcGFyYW0ge0FycmF5PEVsZW1lbnQ+fSBiZWNhbWVIaWRkZW5cbiAqL1xuZnVuY3Rpb24gbm90aWZ5VmlzaWJpbGl0eUNoYW5nZShiZWNhbWVWaXNpYmxlLCBiZWNhbWVIaWRkZW4pIHtcbiAgdmlzaWJpbGl0eUNhbGxiYWNrcy5mb3JFYWNoKGNhbGxiYWNrID0+IHtcbiAgICB0cnkge1xuICAgICAgY2FsbGJhY2soeyBiZWNhbWVWaXNpYmxlLCBiZWNhbWVIaWRkZW4gfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ0RlYnVnKCdFcnJvciBpbiB2aXNpYmlsaXR5IGNhbGxiYWNrOicsIGVycm9yKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIEdldCBhbGwgY3VycmVudGx5IHZpc2libGUgdmlkZW8gY29udGFpbmVyc1xuICogQHJldHVybnMge1NldDxFbGVtZW50Pn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFZpc2libGVWaWRlb3MoKSB7XG4gIHJldHVybiBuZXcgU2V0KHZpc2libGVWaWRlb3MpO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIHNwZWNpZmljIGVsZW1lbnQgaXMgY3VycmVudGx5IHZpc2libGVcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudFxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1ZpZGVvVmlzaWJsZShlbGVtZW50KSB7XG4gIHJldHVybiB2aXNpYmxlVmlkZW9zLmhhcyhlbGVtZW50KTtcbn1cblxuLyoqXG4gKiBHZXQgY291bnQgb2YgdmlzaWJsZSB2aWRlb3NcbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRWaXNpYmxlVmlkZW9Db3VudCgpIHtcbiAgcmV0dXJuIHZpc2libGVWaWRlb3Muc2l6ZTtcbn1cblxuLyoqXG4gKiBNYXJrIGVsZW1lbnQgYXMgdmlzaWJsZVxuICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXJrVmlzaWJsZShlbGVtZW50KSB7XG4gIGlmICghdmlzaWJsZVZpZGVvcy5oYXMoZWxlbWVudCkpIHtcbiAgICB2aXNpYmxlVmlkZW9zLmFkZChlbGVtZW50KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogTWFyayBlbGVtZW50IGFzIGhpZGRlblxuICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXJrSGlkZGVuKGVsZW1lbnQpIHtcbiAgcmV0dXJuIHZpc2libGVWaWRlb3MuZGVsZXRlKGVsZW1lbnQpO1xufVxuXG4vKipcbiAqIENsZWFyIGFsbCB2aXNpYmlsaXR5IHRyYWNraW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGVhclZpc2liaWxpdHlUcmFja2luZygpIHtcbiAgdmlzaWJsZVZpZGVvcy5jbGVhcigpO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgaW50ZXJzZWN0aW9uIG9ic2VydmVyIGVudHJpZXNcbiAqIEBwYXJhbSB7QXJyYXk8SW50ZXJzZWN0aW9uT2JzZXJ2ZXJFbnRyeT59IGVudHJpZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb2Nlc3NJbnRlcnNlY3Rpb25FbnRyaWVzKGVudHJpZXMpIHtcbiAgLy8gVmFsaWRhdGUgZW50cmllcyBwYXJhbWV0ZXJcbiAgaWYgKCFBcnJheS5pc0FycmF5KGVudHJpZXMpIHx8IGVudHJpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgYmVjYW1lVmlzaWJsZSA9IFtdO1xuICBjb25zdCBiZWNhbWVIaWRkZW4gPSBbXTtcblxuICBlbnRyaWVzLmZvckVhY2goZW50cnkgPT4ge1xuICAgIGNvbnN0IGVsZW1lbnQgPSBlbnRyeS50YXJnZXQ7XG4gICAgY29uc3QgdmlzaWJsZSA9IGlzRWxlbWVudFZpc2libGUoZW50cnkpO1xuXG4gICAgaWYgKHZpc2libGUgJiYgbWFya1Zpc2libGUoZWxlbWVudCkpIHtcbiAgICAgIGJlY2FtZVZpc2libGUucHVzaChlbGVtZW50KTtcbiAgICB9IGVsc2UgaWYgKCF2aXNpYmxlICYmIG1hcmtIaWRkZW4oZWxlbWVudCkpIHtcbiAgICAgIGJlY2FtZUhpZGRlbi5wdXNoKGVsZW1lbnQpO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKGJlY2FtZVZpc2libGUubGVuZ3RoID4gMCB8fCBiZWNhbWVIaWRkZW4ubGVuZ3RoID4gMCkge1xuICAgIGxvZ0RlYnVnKGBWaXNpYmlsaXR5IGNoYW5nZWQ6ICske2JlY2FtZVZpc2libGUubGVuZ3RofSB2aXNpYmxlLCAtJHtiZWNhbWVIaWRkZW4ubGVuZ3RofSBoaWRkZW5gKTtcbiAgICBub3RpZnlWaXNpYmlsaXR5Q2hhbmdlKGJlY2FtZVZpc2libGUsIGJlY2FtZUhpZGRlbik7XG4gIH1cbn1cblxuLyoqXG4gKiBFeHBvcnQgZm9yIHRlc3RpbmdcbiAqL1xuZXhwb3J0IGNvbnN0IF9fdGVzdGluZ19fID0ge1xuICBpc0VsZW1lbnRWaXNpYmxlLFxuICBub3RpZnlWaXNpYmlsaXR5Q2hhbmdlXG59O1xuIiwiLy8gU3RvcmFnZSBLZXlzXG5leHBvcnQgY29uc3QgU1RPUkFHRV9LRVlTID0ge1xuICBUSFJFU0hPTEQ6ICdZVEhXVl9USFJFU0hPTEQnLFxuICBXQVRDSEVEX1NUQVRFOiAnWVRIV1ZfU1RBVEUnLFxuICBTSE9SVFNfU1RBVEU6ICdZVEhXVl9TVEFURV9TSE9SVFMnLFxuICBISURERU5fVklERU9TOiAnWVRIV1ZfSElEREVOX1ZJREVPUycsXG4gIElORElWSURVQUxfTU9ERTogJ1lUSFdWX0lORElWSURVQUxfTU9ERScsXG4gIElORElWSURVQUxfTU9ERV9FTkFCTEVEOiAnWVRIV1ZfSU5ESVZJRFVBTF9NT0RFX0VOQUJMRUQnLFxuICBUSEVNRTogJ1lUSFdWX1RIRU1FJ1xufTtcblxuLy8gSGlkZGVuIFZpZGVvIE1lc3NhZ2UgVHlwZXNcbmV4cG9ydCBjb25zdCBISURERU5fVklERU9fTUVTU0FHRVMgPSB7XG4gIEhFQUxUSF9DSEVDSzogJ0hJRERFTl9WSURFT1NfSEVBTFRIX0NIRUNLJyxcbiAgR0VUX01BTlk6ICdISURERU5fVklERU9TX0dFVF9NQU5ZJyxcbiAgR0VUX1BBR0U6ICdISURERU5fVklERU9TX0dFVF9QQUdFJyxcbiAgR0VUX1NUQVRTOiAnSElEREVOX1ZJREVPU19HRVRfU1RBVFMnLFxuICBTRVRfU1RBVEU6ICdISURERU5fVklERU9TX1NFVF9TVEFURScsXG4gIENMRUFSX0FMTDogJ0hJRERFTl9WSURFT1NfQ0xFQVJfQUxMJyxcbiAgRVhQT1JUX0FMTDogJ0hJRERFTl9WSURFT1NfRVhQT1JUX0FMTCcsXG4gIElNUE9SVF9SRUNPUkRTOiAnSElEREVOX1ZJREVPU19JTVBPUlRfUkVDT1JEUycsXG4gIFZBTElEQVRFX0lNUE9SVDogJ0hJRERFTl9WSURFT1NfVkFMSURBVEVfSU1QT1JUJ1xufTtcblxuLy8gRGVmYXVsdCBTZXR0aW5nc1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0VUVElOR1MgPSB7XG4gIHRocmVzaG9sZDogMTAsXG4gIHRoZW1lOiAnYXV0bycsXG4gIGluZGl2aWR1YWxNb2RlOiAnZGltbWVkJyxcbiAgaW5kaXZpZHVhbE1vZGVFbmFibGVkOiB0cnVlLFxuICBzdGF0ZXM6IHtcbiAgICB3YXRjaGVkOiB7XG4gICAgICBtaXNjOiAnbm9ybWFsJyxcbiAgICAgIHN1YnNjcmlwdGlvbnM6ICdub3JtYWwnLFxuICAgICAgY2hhbm5lbDogJ25vcm1hbCcsXG4gICAgICB3YXRjaDogJ25vcm1hbCcsXG4gICAgICB0cmVuZGluZzogJ25vcm1hbCcsXG4gICAgICBwbGF5bGlzdDogJ25vcm1hbCdcbiAgICB9LFxuICAgIHNob3J0czoge1xuICAgICAgbWlzYzogJ25vcm1hbCcsXG4gICAgICBzdWJzY3JpcHRpb25zOiAnbm9ybWFsJyxcbiAgICAgIGNoYW5uZWw6ICdub3JtYWwnLFxuICAgICAgd2F0Y2g6ICdub3JtYWwnLFxuICAgICAgdHJlbmRpbmc6ICdub3JtYWwnXG4gICAgfVxuICB9XG59O1xuXG4vLyBDU1MgQ2xhc3NlcyAoY29udGVudCBzY3JpcHQgc3BlY2lmaWMsIGJ1dCBkZWZpbmVkIGhlcmUgZm9yIGNvbXBsZXRlbmVzcylcbmV4cG9ydCBjb25zdCBDU1NfQ0xBU1NFUyA9IHtcbiAgV0FUQ0hFRF9ISURERU46ICdZVC1IV1YtV0FUQ0hFRC1ISURERU4nLFxuICBXQVRDSEVEX0RJTU1FRDogJ1lULUhXVi1XQVRDSEVELURJTU1FRCcsXG4gIFNIT1JUU19ISURERU46ICdZVC1IV1YtU0hPUlRTLUhJRERFTicsXG4gIFNIT1JUU19ESU1NRUQ6ICdZVC1IV1YtU0hPUlRTLURJTU1FRCcsXG4gIEhJRERFTl9ST1dfUEFSRU5UOiAnWVQtSFdWLUhJRERFTi1ST1ctUEFSRU5UJyxcbiAgSU5ESVZJRFVBTF9ISURERU46ICdZVC1IV1YtSU5ESVZJRFVBTC1ISURERU4nLFxuICBJTkRJVklEVUFMX0RJTU1FRDogJ1lULUhXVi1JTkRJVklEVUFMLURJTU1FRCcsXG4gIEVZRV9CVVRUT046ICd5dC1od3YtZXllLWJ1dHRvbicsXG4gIEhBU19FWUVfQlVUVE9OOiAneXQtaHd2LWhhcy1leWUtYnV0dG9uJ1xufTtcblxuLy8gU2VsZWN0b3JzIChjb250ZW50IHNjcmlwdCBzcGVjaWZpYylcbmV4cG9ydCBjb25zdCBTRUxFQ1RPUlMgPSB7XG4gIFBST0dSRVNTX0JBUjogW1xuICAgICcueXRkLXRodW1ibmFpbC1vdmVybGF5LXJlc3VtZS1wbGF5YmFjay1yZW5kZXJlcicsXG4gICAgJy55dFRodW1ibmFpbE92ZXJsYXlQcm9ncmVzc0Jhckhvc3RXYXRjaGVkUHJvZ3Jlc3NCYXJTZWdtZW50JyxcbiAgICAnLnl0cC1wcm9ncmVzcy1iYXItcGxheWVkJ1xuICBdLFxuICBTSE9SVFNfQ09OVEFJTkVSUzogW1xuICAgICd5dGQtcmVlbC1zaGVsZi1yZW5kZXJlcicsXG4gICAgJ3l0ZC1yaWNoLXNoZWxmLXJlbmRlcmVyW2lzLXNob3J0c10nLFxuICAgICd5dGQtcmljaC1zZWN0aW9uLXJlbmRlcmVyOmhhcyh5dGQtcmljaC1zaGVsZi1yZW5kZXJlcltpcy1zaG9ydHNdKScsXG4gICAgJ3l0bS1zaG9ydHMtbG9ja3VwLXZpZXctbW9kZWwtdjInLFxuICAgICd5dG0tc2hvcnRzLWxvY2t1cC12aWV3LW1vZGVsJyxcbiAgICAneXRkLXJpY2gtaXRlbS1yZW5kZXJlcjpoYXMoLnNob3J0c0xvY2t1cFZpZXdNb2RlbEhvc3QpJyxcbiAgICAneXRkLXJpY2gtaXRlbS1yZW5kZXJlcjpoYXMoYVtocmVmXj1cIi9zaG9ydHMvXCJdKScsXG4gICAgJy55dGQtcmljaC1zaGVsZi1yZW5kZXJlcjpoYXMoYS5yZWVsLWl0ZW0tZW5kcG9pbnQpJyxcbiAgICAneXRkLXZpZGVvLXJlbmRlcmVyOmhhcygueXRkLXRodW1ibmFpbC1vdmVybGF5LXRpbWUtc3RhdHVzLXJlbmRlcmVyW2FyaWEtbGFiZWw9XCJTaG9ydHNcIl0pJyxcbiAgICAneXRkLWNvbXBhY3QtdmlkZW8tcmVuZGVyZXI6aGFzKGFbaHJlZl49XCIvc2hvcnRzL1wiXSknLFxuICAgICd5dGQtZ3JpZC12aWRlby1yZW5kZXJlcjpoYXMoYVtocmVmXj1cIi9zaG9ydHMvXCJdKSdcbiAgXSxcbiAgVEhVTUJOQUlMUzogW1xuICAgICd5dC10aHVtYm5haWwtdmlldy1tb2RlbDpub3QoLnl0LWh3di1oYXMtZXllLWJ1dHRvbiknLFxuICAgICd5dGQtdGh1bWJuYWlsOm5vdCgueXQtaHd2LWhhcy1leWUtYnV0dG9uKSdcbiAgXSxcbiAgVklERU9fQ09OVEFJTkVSUzogW1xuICAgICd5dGQtcmljaC1pdGVtLXJlbmRlcmVyJyxcbiAgICAneXRkLXZpZGVvLXJlbmRlcmVyJyxcbiAgICAneXRkLWdyaWQtdmlkZW8tcmVuZGVyZXInLFxuICAgICd5dGQtY29tcGFjdC12aWRlby1yZW5kZXJlcicsXG4gICAgJ3l0LWxvY2t1cC12aWV3LW1vZGVsJyxcbiAgICAneXRtLXNob3J0cy1sb2NrdXAtdmlldy1tb2RlbCdcbiAgXSxcbiAgVElUTEVfRUxFTUVOVFM6IFtcbiAgICAnI3ZpZGVvLXRpdGxlJyxcbiAgICAnI3ZpZGVvLXRpdGxlLWxpbmsnLFxuICAgICdhI3ZpZGVvLXRpdGxlJyxcbiAgICAnaDMudGl0bGUnLFxuICAgICdoMyBhJyxcbiAgICAnaDQgYScsXG4gICAgJy50aXRsZS1hbmQtYmFkZ2UgYScsXG4gICAgJ3l0bS1zaG9ydHMtbG9ja3VwLXZpZXctbW9kZWwtdjIgLnNob3J0c0xvY2t1cFZpZXdNb2RlbEhvc3RUZXh0Q29udGVudCcsXG4gICAgJ3l0LWZvcm1hdHRlZC1zdHJpbmcjdmlkZW8tdGl0bGUnLFxuICAgICdzcGFuI3ZpZGVvLXRpdGxlJ1xuICBdXG59O1xuXG4vLyBFcnJvciBoYW5kbGluZyBjb25maWd1cmF0aW9uXG5leHBvcnQgY29uc3QgRVJST1JfQ09ORklHID0ge1xuICBNQVhfUkVUUllfQVRURU1QVFM6IDMsXG4gIElOSVRJQUxfUkVUUllfREVMQVk6IDEwMCxcbiAgTUFYX1JFVFJZX0RFTEFZOiA1MDAwLFxuICBNRVNTQUdFX1RJTUVPVVQ6IDUwMDAsXG4gIE1BWF9FUlJPUl9MT0dfU0laRTogMTAwXG59O1xuXG4vLyBCYWNrZ3JvdW5kIHNlcnZpY2Ugd29ya2VyIGNvbmZpZ3VyYXRpb25cbi8vIE5PVEU6IENocm9tZSdzIGFsYXJtcyBBUEkgZW5mb3JjZXMgYSBNSU5JTVVNIHBlcmlvZEluTWludXRlcyBvZiAxIG1pbnV0ZSBmb3IgYm90aFxuLy8gcGFja2VkIGFuZCB1bnBhY2tlZCBleHRlbnNpb25zLiBWYWx1ZXMgYmVsb3cgMSBtaW51dGUgYXJlIHJvdW5kZWQgVVAgdG8gMSBtaW51dGUuXG4vLyBUaGlzIG1lYW5zIHdlIGNhbm5vdCBwaW5nIG1vcmUgZnJlcXVlbnRseSB0aGFuIG9uY2UgcGVyIG1pbnV0ZSB1c2luZyBjaHJvbWUuYWxhcm1zLlxuLy9cbi8vIENocm9tZSBzdXNwZW5kcyBzZXJ2aWNlIHdvcmtlcnMgYWZ0ZXIgfjMwIHNlY29uZHMgb2YgaW5hY3Rpdml0eSwgc28gd2l0aCBhIDEtbWludXRlXG4vLyBhbGFybSBpbnRlcnZhbCwgdGhlIHdvcmtlciBXSUxMIGJlIHN1c3BlbmRlZCBiZXR3ZWVuIHBpbmdzLiBUaGlzIGlzIGFjY2VwdGFibGUgYmVjYXVzZTpcbi8vIC0gQWxsIGNyaXRpY2FsIGRhdGEgaXMgcGVyc2lzdGVkIGluIEluZGV4ZWREQiAoc3Vydml2ZXMgc3VzcGVuc2lvbnMpXG4vLyAtIE1lc3NhZ2UgbGlzdGVuZXJzIGFyZSBhdXRvbWF0aWNhbGx5IHJlLXJlZ2lzdGVyZWQgb24gd2FrZS11cFxuLy8gLSBUaGUgd29ya2VyIGNhbiByZXN0YXJ0IHF1aWNrbHkgd2hlbiBuZWVkZWQgKDwgMTAwbXMgdHlwaWNhbGx5KVxuLy9cbi8vIEZvciBtb3JlIGFnZ3Jlc3NpdmUga2VlcC1hbGl2ZSwgd2Ugd291bGQgbmVlZCBsb25nLWxpdmVkIGNvbm5lY3Rpb25zIGZyb20gY29udGVudFxuLy8gc2NyaXB0cywgYnV0IHRoYXQgYWRkcyBjb21wbGV4aXR5IGFuZCBiYXR0ZXJ5IGRyYWluLiBUaGUgY3VycmVudCBhcHByb2FjaCBiYWxhbmNlc1xuLy8gcGVyZm9ybWFuY2Ugd2l0aCByZXNvdXJjZSBlZmZpY2llbmN5LlxuZXhwb3J0IGNvbnN0IFNFUlZJQ0VfV09SS0VSX0NPTkZJRyA9IHtcbiAgS0VFUF9BTElWRV9JTlRFUlZBTDogNjAwMDAgLy8gMSBtaW51dGUgLSBDaHJvbWUncyBlbmZvcmNlZCBtaW5pbXVtIGZvciBjaHJvbWUuYWxhcm1zXG59O1xuXG4vLyBQcmUtY29tcHV0ZWQgc2VsZWN0b3Igc3RyaW5ncyBmb3IgcGVyZm9ybWFuY2VcbmV4cG9ydCBjb25zdCBTRUxFQ1RPUl9TVFJJTkdTID0ge1xuICBWSURFT19DT05UQUlORVJTOiBTRUxFQ1RPUlMuVklERU9fQ09OVEFJTkVSUy5qb2luKCcsICcpLFxuICBUSFVNQk5BSUxTOiBTRUxFQ1RPUlMuVEhVTUJOQUlMUy5qb2luKCcsICcpLFxuICBTSE9SVFNfQ09OVEFJTkVSUzogU0VMRUNUT1JTLlNIT1JUU19DT05UQUlORVJTLmpvaW4oJywgJylcbn07XG5cbi8vIERlYnVnIGZsYWcgLSByZXBsYWNlZCBhdCBidWlsZCB0aW1lIGJ5IHdlYnBhY2sgRGVmaW5lUGx1Z2luXG4vLyBJbiBkZXZlbG9wbWVudDogdHJ1ZSwgSW4gcHJvZHVjdGlvbjogZmFsc2Vcbi8vIERPIE5PVCBoYXJkY29kZSB0aGlzIHZhbHVlIC0gaXQgbXVzdCBiZSBzZXQgYnkgdGhlIGJ1aWxkIHN5c3RlbVxuZXhwb3J0IGNvbnN0IERFQlVHID0gdHlwZW9mIF9fREVWX18gIT09ICd1bmRlZmluZWQnID8gX19ERVZfXyA6IHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbic7XG5cbi8vIERPTSBDYWNoZSBDb25maWd1cmF0aW9uXG5leHBvcnQgY29uc3QgQ0FDSEVfQ09ORklHID0ge1xuICBET0NVTUVOVF9RVUVSWV9UVEw6IDEwMDAsICAgICAgICAvLyAxIHNlY29uZCBUVEwgZm9yIGRvY3VtZW50IHF1ZXJpZXNcbiAgUFJPR1JFU1NfQkFSX1RUTDogNTAwLCAgICAgICAgICAgLy8gNTAwbXMgZm9yIHByb2dyZXNzIGJhcnMgKHVwZGF0ZSBmcmVxdWVudGx5KVxuICBTVEFUU19MT0dfSU5URVJWQUw6IDMwMDAwLCAgICAgICAvLyBMb2cgc3RhdHMgZXZlcnkgMzAgc2Vjb25kcyBpbiBkZWJ1ZyBtb2RlXG4gIEVOQUJMRV9QRVJGT1JNQU5DRV9NT05JVE9SSU5HOiB0cnVlXG59O1xuXG4vLyBJbnRlcnNlY3Rpb25PYnNlcnZlciBDb25maWd1cmF0aW9uXG4vLyBOb3RlOiBUaGVzZSB2YWx1ZXMgYXJlIHZhbGlkYXRlZCB0byBlbnN1cmUgcHJvcGVyIG9ic2VydmVyIGJlaGF2aW9yXG4vLyAtIFJPT1RfTUFSR0lOOiAxMDBweCBwcm92aWRlcyBzbW9vdGggcHJlLWxvYWRpbmcgYmVmb3JlIHZpZXdwb3J0IGVudHJ5XG4vLyAtIFRIUkVTSE9MRDogTXVsdGlwbGUgcG9pbnRzIHRyYWNrIGdyYW51bGFyIHZpc2liaWxpdHkgY2hhbmdlc1xuLy8gLSBWSVNJQklMSVRZX1RIUkVTSE9MRDogMjUlIHZpc2liaWxpdHkgYmFsYW5jZXMgYWNjdXJhY3kgd2l0aCBwZXJmb3JtYW5jZVxuLy8gLSBCQVRDSF9ERUxBWTogMTAwbXMgcmVkdWNlcyBjYWxsYmFjayBmcmVxdWVuY3kgZHVyaW5nIHJhcGlkIHNjcm9sbGluZ1xuZXhwb3J0IGNvbnN0IElOVEVSU0VDVElPTl9PQlNFUlZFUl9DT05GSUcgPSAoZnVuY3Rpb24oKSB7XG4gIGNvbnN0IGNvbmZpZyA9IHtcbiAgICBST09UX01BUkdJTjogJzEwMHB4JyxcbiAgICBUSFJFU0hPTEQ6IFswLCAwLjI1LCAwLjVdLFxuICAgIFZJU0lCSUxJVFlfVEhSRVNIT0xEOiAwLjI1LFxuICAgIEJBVENIX0RFTEFZOiAxMDAsXG4gICAgRU5BQkxFX0xBWllfUFJPQ0VTU0lORzogdHJ1ZVxuICB9O1xuXG4gIC8vIFZhbGlkYXRlIGNvbmZpZ3VyYXRpb24gdmFsdWVzXG4gIGlmICghQXJyYXkuaXNBcnJheShjb25maWcuVEhSRVNIT0xEKSB8fCBjb25maWcuVEhSRVNIT0xELmxlbmd0aCA9PT0gMCkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tZVC1IV1ZdIEludmFsaWQgVEhSRVNIT0xEIGNvbmZpZywgdXNpbmcgZGVmYXVsdHMnKTtcbiAgICBjb25maWcuVEhSRVNIT0xEID0gWzAsIDAuMjUsIDAuNV07XG4gIH1cblxuICAvLyBWYWxpZGF0ZSB0aHJlc2hvbGQgdmFsdWVzIGFyZSBiZXR3ZWVuIDAgYW5kIDFcbiAgY29uZmlnLlRIUkVTSE9MRCA9IGNvbmZpZy5USFJFU0hPTEQuZmlsdGVyKHQgPT4gdHlwZW9mIHQgPT09ICdudW1iZXInICYmIHQgPj0gMCAmJiB0IDw9IDEpO1xuXG4gIGlmICh0eXBlb2YgY29uZmlnLlZJU0lCSUxJVFlfVEhSRVNIT0xEICE9PSAnbnVtYmVyJyB8fFxuICAgICAgY29uZmlnLlZJU0lCSUxJVFlfVEhSRVNIT0xEIDwgMCB8fFxuICAgICAgY29uZmlnLlZJU0lCSUxJVFlfVEhSRVNIT0xEID4gMSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tZVC1IV1ZdIEludmFsaWQgVklTSUJJTElUWV9USFJFU0hPTEQgY29uZmlnLCB1c2luZyBkZWZhdWx0IDAuMjUnKTtcbiAgICBjb25maWcuVklTSUJJTElUWV9USFJFU0hPTEQgPSAwLjI1O1xuICB9XG5cbiAgaWYgKHR5cGVvZiBjb25maWcuQkFUQ0hfREVMQVkgIT09ICdudW1iZXInIHx8IGNvbmZpZy5CQVRDSF9ERUxBWSA8IDApIHtcbiAgICBjb25zb2xlLmVycm9yKCdbWVQtSFdWXSBJbnZhbGlkIEJBVENIX0RFTEFZIGNvbmZpZywgdXNpbmcgZGVmYXVsdCAxMDBtcycpO1xuICAgIGNvbmZpZy5CQVRDSF9ERUxBWSA9IDEwMDtcbiAgfVxuXG4gIHJldHVybiBjb25maWc7XG59KSgpO1xuXG4vLyBJbmRleGVkREIgT3B0aW1pemF0aW9uIENvbmZpZ3VyYXRpb25cbmV4cG9ydCBjb25zdCBJTkRFWEVEREJfQ09ORklHID0ge1xuICAvLyBDYWNoZSBzZXR0aW5nc1xuICBDT05URU5UX0NBQ0hFX01BWF9TSVpFOiAxMDAwLFxuICBCQUNLR1JPVU5EX0NBQ0hFX1RUTDogMzAwMDAsIC8vIDMwIHNlY29uZHNcblxuICAvLyBXcml0ZSBiYXRjaGluZ1xuICBXUklURV9CQVRDSF9ERUxBWTogMTAwLCAvLyBtaWxsaXNlY29uZHNcbiAgV1JJVEVfQkFUQ0hfTUFYX1NJWkU6IDUwLFxuXG4gIC8vIFF1ZXJ5IG9wdGltaXphdGlvblxuICBHRVRfQ1VSU09SX1RIUkVTSE9MRDogNTAsIC8vIFVzZSBjdXJzb3IgZm9yIDUwKyBJRHNcbiAgU1RBVFNfQ1VSU09SX1RIUkVTSE9MRDogMTAwLCAvLyBVc2UgY3Vyc29yIGZvciAxMDArIHJlY29yZHNcblxuICAvLyBQYWdpbmF0aW9uXG4gIEVOQUJMRV9QUkVGRVRDSDogZmFsc2UsIC8vIERpc2FibGVkIGJ5IGRlZmF1bHQgKFBoYXNlIDYpXG4gIFBSRUZFVENIX0RFTEFZOiAxMDAsXG5cbiAgLy8gQnJvYWRjYXN0XG4gIEJST0FEQ0FTVF9ERUJPVU5DRTogMTAwLFxuXG4gIC8vIFRpbWVvdXQgc2V0dGluZ3NcbiAgT1BFUkFUSU9OX1RJTUVPVVQ6IDMwMDAwLCAvLyAzMCBzZWNvbmRzIC0gdGltZW91dCBmb3IgaW5kaXZpZHVhbCBvcGVyYXRpb25zXG4gIENVUlNPUl9USU1FT1VUOiA2MDAwMCwgLy8gNjAgc2Vjb25kcyAtIHRpbWVvdXQgZm9yIGN1cnNvciBvcGVyYXRpb25zIChjYW4gYmUgbG9uZ2VyKVxuICBEQl9PUEVOX1RJTUVPVVQ6IDEwMDAwLCAvLyAxMCBzZWNvbmRzIC0gdGltZW91dCBmb3Igb3BlbmluZyBkYXRhYmFzZVxuICBSRVNFVF9USU1FT1VUOiAzMDAwMCAvLyAzMCBzZWNvbmRzIC0gdGltZW91dCBmb3IgZGF0YWJhc2UgcmVzZXRcbn07XG5cbi8vIEZlYXR1cmUgZmxhZ3MgZm9yIEluZGV4ZWREQiBvcHRpbWl6YXRpb25zXG5leHBvcnQgY29uc3QgRkVBVFVSRV9GTEFHUyA9IHtcbiAgRU5BQkxFX1dSSVRFX0JBVENISU5HOiBmYWxzZSwgLy8gRGlzYWJsZWQgYnkgZGVmYXVsdCAtIG5lZWRzIHRlc3RpbmdcbiAgRU5BQkxFX0JBQ0tHUk9VTkRfQ0FDSEU6IHRydWUsXG4gIEVOQUJMRV9MUlVfRVZJQ1RJT046IHRydWUsXG4gIEVOQUJMRV9DVVJTT1JfT1BUSU1JWkFUSU9OOiB0cnVlLFxuICBFTkFCTEVfU1RBVFNfT1BUSU1JWkFUSU9OOiB0cnVlLFxuICBFTkFCTEVfUEFHSU5BVElPTl9QUkVGRVRDSDogZmFsc2UsIC8vIFBoYXNlIDZcbiAgRU5BQkxFX0JST0FEQ0FTVF9CQVRDSElORzogZmFsc2UgLy8gUGhhc2UgNlxufTtcblxuLy8gSW1wb3J0L0V4cG9ydCBDb25maWd1cmF0aW9uXG5leHBvcnQgY29uc3QgSU1QT1JUX0VYUE9SVF9DT05GSUcgPSB7XG4gIEZPUk1BVF9WRVJTSU9OOiAxLFxuICBNQVhfSU1QT1JUX1NJWkVfTUI6IDUwLFxuICBNQVhfSU1QT1JUX1JFQ09SRFM6IDIwMDAwMCxcbiAgSU1QT1JUX0JBVENIX1NJWkU6IDUwMCxcbiAgQ09ORkxJQ1RfU1RSQVRFR0lFUzoge1xuICAgIFNLSVA6ICdza2lwJywgICAgICAgICAgIC8vIFNraXAgZXhpc3RpbmcgcmVjb3Jkc1xuICAgIE9WRVJXUklURTogJ292ZXJ3cml0ZScsIC8vIE92ZXJ3cml0ZSB3aXRoIGltcG9ydGVkIGRhdGFcbiAgICBNRVJHRTogJ21lcmdlJyAgICAgICAgICAvLyBLZWVwIG5ld2VyIHRpbWVzdGFtcFxuICB9XG59O1xuXG4vLyBRdW90YSBNYW5hZ2VtZW50IENvbmZpZ3VyYXRpb25cbmV4cG9ydCBjb25zdCBRVU9UQV9DT05GSUcgPSB7XG4gIC8vIEVzdGltYXRlIHJlY29yZCBzaXplIChieXRlcykgLSB0eXBpY2FsIHZpZGVvIHJlY29yZCB3aXRoIG1ldGFkYXRhXG4gIEVTVElNQVRFRF9SRUNPUkRfU0laRTogMjAwLFxuXG4gIC8vIFNhZmV0eSBtYXJnaW4gZm9yIGNsZWFudXAgKGRlbGV0ZSAyMCUgbW9yZSB0aGFuIGVzdGltYXRlZCBuZWVkKVxuICBDTEVBTlVQX1NBRkVUWV9NQVJHSU46IDEuMixcblxuICAvLyBNaW5pbXVtIHJlY29yZHMgdG8gZGVsZXRlIChhdm9pZCB0b28gZnJlcXVlbnQgY2xlYW51cHMpXG4gIE1JTl9DTEVBTlVQX0NPVU5UOiAxMDAsXG5cbiAgLy8gTWF4aW11bSByZWNvcmRzIHRvIGRlbGV0ZSBpbiBvbmUgY2xlYW51cCAocHJldmVudCBleGNlc3NpdmUgZGVsZXRpb25zKVxuICBNQVhfQ0xFQU5VUF9DT1VOVDogNTAwMCxcblxuICAvLyBNYXhpbXVtIHJlY29yZHMgdG8gc3RvcmUgaW4gZmFsbGJhY2sgc3RvcmFnZVxuICBNQVhfRkFMTEJBQ0tfUkVDT1JEUzogMTAwMCxcblxuICAvLyBOb3RpZmljYXRpb24gY29vbGRvd24gKDUgbWludXRlcylcbiAgTk9USUZJQ0FUSU9OX0NPT0xET1dOX01TOiA1ICogNjAgKiAxMDAwLFxuXG4gIC8vIE1heGltdW0gcXVvdGEgZXZlbnRzIHRvIGxvZ1xuICBNQVhfUVVPVEFfRVZFTlRTOiA1MCxcblxuICAvLyBNYXhpbXVtIHJldHJ5IGF0dGVtcHRzIGZvciBxdW90YSBleGNlZWRlZCBvcGVyYXRpb25zXG4gIE1BWF9SRVRSWV9BVFRFTVBUUzogMyxcblxuICAvLyBFbmFibGUgZmFsbGJhY2sgc3RvcmFnZSBmb3IgY3JpdGljYWwgb3BlcmF0aW9uc1xuICBFTkFCTEVfRkFMTEJBQ0tfU1RPUkFHRTogdHJ1ZSxcblxuICAvLyBFbmFibGUgdXNlciBub3RpZmljYXRpb25zIGZvciBxdW90YSBldmVudHNcbiAgRU5BQkxFX1FVT1RBX05PVElGSUNBVElPTlM6IHRydWVcbn07XG5cbi8vIFNlbGVjdG9yIEZhbGxiYWNrIENoYWluc1xuLy8gUHJpbWFyeSBzZWxlY3RvcnMgbGlzdGVkIGZpcnN0LCBmYWxsYmFja3MgaW4gb3JkZXIgb2YgcHJlZmVyZW5jZVxuZXhwb3J0IGNvbnN0IFNFTEVDVE9SX0NIQUlOUyA9IHtcbiAgVklERU9fVElUTEU6IFtcbiAgICAnI3ZpZGVvLXRpdGxlJyxcbiAgICAnI3ZpZGVvLXRpdGxlLWxpbmsnLFxuICAgICdhI3ZpZGVvLXRpdGxlJyxcbiAgICAnaDMudGl0bGUgYScsXG4gICAgJ2gzIGEnLFxuICAgICdoNCBhJyxcbiAgICAnLnRpdGxlLWFuZC1iYWRnZSBhJyxcbiAgICAneXQtZm9ybWF0dGVkLXN0cmluZyN2aWRlby10aXRsZScsXG4gICAgJ3NwYW4jdmlkZW8tdGl0bGUnLFxuICAgIC8vIEZhbGxiYWNrIHRvIGFueSBsaW5rIGluIGNvbnRhaW5lclxuICAgICdhW2hyZWYqPVwiL3dhdGNoP3Y9XCJdJyxcbiAgICAnYVtocmVmKj1cIi9zaG9ydHMvXCJdJ1xuICBdLFxuXG4gIFBST0dSRVNTX0JBUjogW1xuICAgIC8vIE1vZGVybiBzZWxlY3RvcnNcbiAgICAnLnl0ZC10aHVtYm5haWwtb3ZlcmxheS1yZXN1bWUtcGxheWJhY2stcmVuZGVyZXInLFxuICAgICcueXQtdGh1bWJuYWlsLW92ZXJsYXktcmVzdW1lLXBsYXliYWNrLXJlbmRlcmVyLXdpel9fcHJvZ3Jlc3MtYmFyJyxcbiAgICAnLnl0VGh1bWJuYWlsT3ZlcmxheVByb2dyZXNzQmFySG9zdFdhdGNoZWRQcm9ncmVzc0JhclNlZ21lbnQnLFxuICAgIC8vIExlZ2FjeSBzZWxlY3RvcnNcbiAgICAnLnl0cC1wcm9ncmVzcy1iYXItcGxheWVkJyxcbiAgICAneXQtdGh1bWJuYWlsLW92ZXJsYXktcmVzdW1lLXBsYXliYWNrLXJlbmRlcmVyJyxcbiAgICAnLnl0bS10aHVtYm5haWwtb3ZlcmxheS1yZXN1bWUtcGxheWJhY2stcmVuZGVyZXInLFxuICAgIC8vIEdlbmVyaWMgZmFsbGJhY2tzXG4gICAgJ1tjbGFzcyo9XCJwcm9ncmVzc1wiXVtjbGFzcyo9XCJiYXJcIl0nLFxuICAgICdbY2xhc3MqPVwid2F0Y2hlZFwiXSdcbiAgXSxcblxuICBWSURFT19USFVNQk5BSUw6IFtcbiAgICAneXQtdGh1bWJuYWlsLXZpZXctbW9kZWwnLFxuICAgICd5dGQtdGh1bWJuYWlsJyxcbiAgICAnLnl0VGh1bWJuYWlsVmlld01vZGVsSW1hZ2UnLFxuICAgICdpbWcueXQtY29yZS1pbWFnZScsXG4gICAgLy8gR2VuZXJpYyBmYWxsYmFja3NcbiAgICAnW2NsYXNzKj1cInRodW1ibmFpbFwiXSdcbiAgXSxcblxuICBWSURFT19MSU5LOiBbXG4gICAgJ2FbaHJlZio9XCIvd2F0Y2g/dj1cIl0nLFxuICAgICdhW2hyZWZePVwiL3dhdGNoP1wiXScsXG4gICAgJ2FbaHJlZio9XCImdj1cIl0nLFxuICAgICdhLnl0ZC10aHVtYm5haWwnLFxuICAgICdhLnl0LXNpbXBsZS1lbmRwb2ludCdcbiAgXSxcblxuICBTSE9SVFNfTElOSzogW1xuICAgICdhW2hyZWYqPVwiL3Nob3J0cy9cIl0nLFxuICAgICdhW2hyZWZePVwiL3Nob3J0cy9cIl0nLFxuICAgICdhLnJlZWwtaXRlbS1lbmRwb2ludCcsXG4gICAgJy5zaG9ydHNMb2NrdXBWaWV3TW9kZWxIb3N0IGEnXG4gIF0sXG5cbiAgVklERU9fQ09OVEFJTkVSUzogW1xuICAgICd5dGQtcmljaC1pdGVtLXJlbmRlcmVyJyxcbiAgICAneXRkLXZpZGVvLXJlbmRlcmVyJyxcbiAgICAneXRkLWdyaWQtdmlkZW8tcmVuZGVyZXInLFxuICAgICd5dGQtY29tcGFjdC12aWRlby1yZW5kZXJlcicsXG4gICAgJ3l0LWxvY2t1cC12aWV3LW1vZGVsJyxcbiAgICAneXRtLXNob3J0cy1sb2NrdXAtdmlldy1tb2RlbCdcbiAgXSxcblxuICBUSFVNQk5BSUxTOiBbXG4gICAgJ3l0LXRodW1ibmFpbC12aWV3LW1vZGVsOm5vdCgueXQtaHd2LWhhcy1leWUtYnV0dG9uKScsXG4gICAgJ3l0ZC10aHVtYm5haWw6bm90KC55dC1od3YtaGFzLWV5ZS1idXR0b24pJ1xuICBdXG59O1xuXG4vLyBDcml0aWNhbCBzZWxlY3RvciBoZWFsdGggdGhyZXNob2xkc1xuLy8gVGhlc2UgdmFsdWVzIGRlZmluZSB3aGVuIHRoZSBleHRlbnNpb24gZGV0ZWN0cyB0aGF0IFlvdVR1YmUncyBET00gc3RydWN0dXJlIGhhcyBjaGFuZ2VkXG5leHBvcnQgY29uc3QgU0VMRUNUT1JfSEVBTFRIX0NPTkZJRyA9IHtcbiAgLy8gNzAlIHN1Y2Nlc3MgcmF0ZSBtaW5pbXVtIC0gQmVsb3cgdGhpcywgc2VsZWN0b3JzIGFyZSBjb25zaWRlcmVkIHVuaGVhbHRoeVxuICAvLyBUaGlzIHRocmVzaG9sZCBhbGxvd3MgZm9yIHRyYW5zaWVudCBmYWlsdXJlcyB3aGlsZSBjYXRjaGluZyBzdHJ1Y3R1cmFsIGNoYW5nZXNcbiAgQ1JJVElDQUxfU1VDQ0VTU19SQVRFOiAwLjcsXG5cbiAgLy8gTWluaW11bSAxMCBxdWVyaWVzIGJlZm9yZSBoZWFsdGggYXNzZXNzbWVudCAtIFByZXZlbnRzIGZhbHNlIHBvc2l0aXZlcyBkdXJpbmcgaW5pdGlhbCBsb2FkXG4gIC8vIFN0YXRpc3RpY2FsIHNpZ25pZmljYW5jZSByZXF1aXJlcyBtdWx0aXBsZSBzYW1wbGVzIGJlZm9yZSBtYWtpbmcgaGVhbHRoIGRldGVybWluYXRpb25zXG4gIE1JTl9RVUVSSUVTX0ZPUl9IRUFMVEg6IDEwLFxuXG4gIC8vIENoZWNrIHNlbGVjdG9yIGhlYWx0aCBldmVyeSAzMCBzZWNvbmRzICgzMDAwMG1zKVxuICAvLyBCYWxhbmNlcyByZXNwb25zaXZlbmVzcyB0byBET00gY2hhbmdlcyB3aXRoIHBlcmZvcm1hbmNlIG92ZXJoZWFkXG4gIEhFQUxUSF9DSEVDS19JTlRFUlZBTDogMzAwMDAsXG5cbiAgLy8gNSBtaW51dGUgY29vbGRvd24gYmV0d2VlbiBub3RpZmljYXRpb25zICgzMDAwMDBtcylcbiAgLy8gUHJldmVudHMgbm90aWZpY2F0aW9uIHNwYW0gd2hpbGUga2VlcGluZyB1c2VycyBpbmZvcm1lZCBvZiBwZXJzaXN0ZW50IGlzc3Vlc1xuICBOT1RJRklDQVRJT05fQ09PTERPV046IDMwMDAwMCxcblxuICAvLyBTaG93IG5vdGlmaWNhdGlvbiBhZnRlciA1IGNvbnNlY3V0aXZlIGZhaWx1cmVzIChjdXJyZW50bHkgdW51c2VkIC0gcmVzZXJ2ZWQgZm9yIGZ1dHVyZSB1c2UpXG4gIC8vIFdvdWxkIHRyaWdnZXIgYWxlcnRzIG9ubHkgYWZ0ZXIgc3VzdGFpbmVkIGZhaWx1cmUgcGF0dGVybiBpcyBlc3RhYmxpc2hlZFxuICBGQUlMVVJFX05PVElGSUNBVElPTl9USFJFU0hPTEQ6IDVcbn07XG4iLCJpbXBvcnQgeyBlcnJvciBhcyBsb2dFcnJvck1lc3NhZ2UgfSBmcm9tICcuL2xvZ2dlci5qcyc7XG5cbi8vIEVycm9yIGNhdGVnb3JpZXNcbmV4cG9ydCBjb25zdCBFcnJvclR5cGUgPSB7XG4gIFRSQU5TSUVOVDogJ3RyYW5zaWVudCcsICAgICAgLy8gUmV0cnkgYXV0b21hdGljYWxseVxuICBUSU1FT1VUOiAndGltZW91dCcsICAgICAgICAgICAvLyBPcGVyYXRpb24gdGltZW91dCAtIG1heSBiZSByZXRyeWFibGVcbiAgUVVPVEFfRVhDRUVERUQ6ICdxdW90YScsICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBuZWVkZWRcbiAgUEVSTUlTU0lPTjogJ3Blcm1pc3Npb24nLCAgICAgLy8gVXNlciBhY3Rpb24gcmVxdWlyZWRcbiAgQ09SUlVQVElPTjogJ2NvcnJ1cHRpb24nLCAgICAgLy8gRGF0YSByZWNvdmVyeSBuZWVkZWRcbiAgTkVUV09SSzogJ25ldHdvcmsnLCAgICAgICAgICAgLy8gQ29ubmVjdGl2aXR5IGlzc3VlXG4gIFBFUk1BTkVOVDogJ3Blcm1hbmVudCcgICAgICAgIC8vIE5vIHJlY292ZXJ5IHBvc3NpYmxlXG59O1xuXG4vLyBDbGFzc2lmeSBlcnJvcnNcbmV4cG9ydCBmdW5jdGlvbiBjbGFzc2lmeUVycm9yKGVycm9yKSB7XG4gIGlmICghZXJyb3IpIHJldHVybiBFcnJvclR5cGUuUEVSTUFORU5UO1xuXG4gIGNvbnN0IG1lc3NhZ2UgPSBlcnJvci5tZXNzYWdlPy50b0xvd2VyQ2FzZSgpIHx8ICcnO1xuICBjb25zdCBuYW1lID0gZXJyb3IubmFtZT8udG9Mb3dlckNhc2UoKSB8fCAnJztcblxuICAvLyBUaW1lb3V0IGVycm9ycyAtIGNoZWNrIGZsYWcgZmlyc3QsIHRoZW4gbmFtZSBhbmQgbWVzc2FnZVxuICBpZiAoZXJyb3IudGltZW91dCA9PT0gdHJ1ZSB8fFxuICAgICAgbmFtZSA9PT0gJ3RpbWVvdXRlcnJvcicgfHxcbiAgICAgIChtZXNzYWdlLmluY2x1ZGVzKCd0aW1lb3V0JykgJiYgbWVzc2FnZS5pbmNsdWRlcygnb3BlcmF0aW9uJykpKSB7XG4gICAgcmV0dXJuIEVycm9yVHlwZS5USU1FT1VUO1xuICB9XG5cbiAgLy8gSW5kZXhlZERCIHF1b3RhIGVycm9yc1xuICBpZiAobWVzc2FnZS5pbmNsdWRlcygncXVvdGEnKSB8fCBuYW1lLmluY2x1ZGVzKCdxdW90YWV4Y2VlZGVkZXJyb3InKSkge1xuICAgIHJldHVybiBFcnJvclR5cGUuUVVPVEFfRVhDRUVERUQ7XG4gIH1cblxuICAvLyBUcmFuc2llbnQgZXJyb3JzXG4gIGlmIChtZXNzYWdlLmluY2x1ZGVzKCd0cmFuc2FjdGlvbicpIHx8XG4gICAgICBtZXNzYWdlLmluY2x1ZGVzKCdhYm9ydGVkJykgfHxcbiAgICAgIG1lc3NhZ2UuaW5jbHVkZXMoJ2J1c3knKSB8fFxuICAgICAgbmFtZS5pbmNsdWRlcygnYWJvcnRlcnJvcicpKSB7XG4gICAgcmV0dXJuIEVycm9yVHlwZS5UUkFOU0lFTlQ7XG4gIH1cblxuICAvLyBFeHRlbnNpb24gY29udGV4dCBpbnZhbGlkYXRlZCAtIFBFUk1BTkVOVCAoZXh0ZW5zaW9uIHdhcyByZWxvYWRlZC91cGRhdGVkKVxuICBpZiAobWVzc2FnZS5pbmNsdWRlcygnZXh0ZW5zaW9uIGNvbnRleHQgaW52YWxpZGF0ZWQnKSB8fFxuICAgICAgbWVzc2FnZS5pbmNsdWRlcygnY29udGV4dCBpbnZhbGlkYXRlZCcpKSB7XG4gICAgcmV0dXJuIEVycm9yVHlwZS5QRVJNQU5FTlQ7XG4gIH1cblxuICAvLyBOZXR3b3JrL21lc3NhZ2luZyBlcnJvcnMgLSBFTkhBTkNFRCAoYnV0IG5vdCBvdXIgY3VzdG9tIHRpbWVvdXQgZXJyb3JzKVxuICBpZiAobWVzc2FnZS5pbmNsdWRlcygnbWVzc2FnZScpIHx8XG4gICAgICBtZXNzYWdlLmluY2x1ZGVzKCdubyByZXNwb25zZScpIHx8XG4gICAgICBtZXNzYWdlLmluY2x1ZGVzKCdubyByZWNlaXZlcicpIHx8XG4gICAgICBtZXNzYWdlLmluY2x1ZGVzKCdkaXNjb25uZWN0ZWQnKSB8fFxuICAgICAgbWVzc2FnZS5pbmNsdWRlcygndGltZW91dCcpIHx8XG4gICAgICBtZXNzYWdlLmluY2x1ZGVzKCdjb3VsZCBub3QgZXN0YWJsaXNoIGNvbm5lY3Rpb24nKSB8fFxuICAgICAgbWVzc2FnZS5pbmNsdWRlcygncmVjZWl2aW5nIGVuZCBkb2VzIG5vdCBleGlzdCcpKSB7XG4gICAgcmV0dXJuIEVycm9yVHlwZS5ORVRXT1JLO1xuICB9XG5cbiAgLy8gUGVybWlzc2lvbiBlcnJvcnNcbiAgaWYgKG1lc3NhZ2UuaW5jbHVkZXMoJ3Blcm1pc3Npb24nKSB8fCBuYW1lLmluY2x1ZGVzKCdzZWN1cml0eWVycm9yJykpIHtcbiAgICByZXR1cm4gRXJyb3JUeXBlLlBFUk1JU1NJT047XG4gIH1cblxuICAvLyBEYXRhIGNvcnJ1cHRpb25cbiAgaWYgKG1lc3NhZ2UuaW5jbHVkZXMoJ2NvcnJ1cHQnKSB8fFxuICAgICAgbWVzc2FnZS5pbmNsdWRlcygnaW52YWxpZCcpIHx8XG4gICAgICBuYW1lLmluY2x1ZGVzKCdkYXRhZXJyb3InKSkge1xuICAgIHJldHVybiBFcnJvclR5cGUuQ09SUlVQVElPTjtcbiAgfVxuXG4gIHJldHVybiBFcnJvclR5cGUuUEVSTUFORU5UO1xufVxuXG4vLyBSZXRyeSB3aXRoIGV4cG9uZW50aWFsIGJhY2tvZmZcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXRyeU9wZXJhdGlvbihcbiAgb3BlcmF0aW9uLFxuICBvcHRpb25zID0ge31cbikge1xuICBjb25zdCB7XG4gICAgbWF4QXR0ZW1wdHMgPSAzLFxuICAgIGluaXRpYWxEZWxheSA9IDEwMCxcbiAgICBtYXhEZWxheSA9IDUwMDAsXG4gICAgc2hvdWxkUmV0cnkgPSAoZXJyb3IpID0+IGNsYXNzaWZ5RXJyb3IoZXJyb3IpID09PSBFcnJvclR5cGUuVFJBTlNJRU5ULFxuICAgIG9uUmV0cnkgPSBudWxsXG4gIH0gPSBvcHRpb25zO1xuXG4gIGxldCBsYXN0RXJyb3I7XG4gIGxldCBkZWxheSA9IGluaXRpYWxEZWxheTtcblxuICBmb3IgKGxldCBhdHRlbXB0ID0gMTsgYXR0ZW1wdCA8PSBtYXhBdHRlbXB0czsgYXR0ZW1wdCsrKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBhd2FpdCBvcGVyYXRpb24oKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbGFzdEVycm9yID0gZXJyb3I7XG5cbiAgICAgIGlmIChhdHRlbXB0ID09PSBtYXhBdHRlbXB0cyB8fCAhc2hvdWxkUmV0cnkoZXJyb3IpKSB7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuXG4gICAgICBpZiAob25SZXRyeSkge1xuICAgICAgICBvblJldHJ5KGF0dGVtcHQsIGVycm9yKTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIGRlbGF5KSk7XG4gICAgICBkZWxheSA9IE1hdGgubWluKGRlbGF5ICogMiwgbWF4RGVsYXkpO1xuICAgIH1cbiAgfVxuXG4gIHRocm93IGxhc3RFcnJvcjtcbn1cblxuLy8gRXJyb3IgbG9nZ2VyIHdpdGggdHJhY2tpbmdcbmNvbnN0IGVycm9yTG9nID0gW107XG5jb25zdCBNQVhfTE9HX1NJWkUgPSAxMDA7XG5cbmV4cG9ydCBmdW5jdGlvbiBsb2dFcnJvcihjb250ZXh0LCBlcnIsIG1ldGFkYXRhID0ge30pIHtcbiAgY29uc3QgZW50cnkgPSB7XG4gICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgIGNvbnRleHQsXG4gICAgdHlwZTogY2xhc3NpZnlFcnJvcihlcnIpLFxuICAgIG1lc3NhZ2U6IGVycj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyKSxcbiAgICBtZXRhZGF0YVxuICB9O1xuXG4gIGVycm9yTG9nLnVuc2hpZnQoZW50cnkpO1xuICBpZiAoZXJyb3JMb2cubGVuZ3RoID4gTUFYX0xPR19TSVpFKSB7XG4gICAgZXJyb3JMb2cucG9wKCk7XG4gIH1cblxuICBsb2dFcnJvck1lc3NhZ2UoYFske2NvbnRleHR9XWAsIGVyciwgbWV0YWRhdGEpO1xuICByZXR1cm4gZW50cnk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRFcnJvckxvZygpIHtcbiAgcmV0dXJuIFsuLi5lcnJvckxvZ107XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGVhckVycm9yTG9nKCkge1xuICBlcnJvckxvZy5sZW5ndGggPSAwO1xufVxuIiwiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IFNoYXJlZCBkZWJ1ZyBsb2dnaW5nIHV0aWxpdHkgd2l0aCBidWlsZC10aW1lIHN0cmlwcGluZyBmb3IgcHJvZHVjdGlvblxuICpcbiAqIFRoaXMgbW9kdWxlIHByb3ZpZGVzIGxvZ2dpbmcgZnVuY3Rpb25zIHRoYXQgYXJlIGF1dG9tYXRpY2FsbHkgcmVtb3ZlZCBpbiBwcm9kdWN0aW9uIGJ1aWxkcy5cbiAqIFRoZSBERUJVRyBmbGFnIGlzIGltcG9ydGVkIGZyb20gY29uc3RhbnRzLmpzIHdoaWNoIGlzIHNldCBhdCBidWlsZCB0aW1lIGJ5IHdlYnBhY2sgRGVmaW5lUGx1Z2luLlxuICpcbiAqIFVzYWdlOlxuICogICBpbXBvcnQgeyBkZWJ1ZywgZXJyb3IsIHdhcm4sIGluZm8gfSBmcm9tICcuL2xvZ2dlci5qcyc7XG4gKiAgIGRlYnVnKCdbQ29tcG9uZW50XScsICdEZWJ1ZyBtZXNzYWdlJywgZGF0YSk7XG4gKiAgIGVycm9yKCdbQ29tcG9uZW50XScsICdFcnJvciBvY2N1cnJlZCcsIGVycm9yT2JqKTtcbiAqXG4gKiBJbiBwcm9kdWN0aW9uIGJ1aWxkczpcbiAqIC0gREVCVUcgaXMgcmVwbGFjZWQgd2l0aCBmYWxzZSBieSB3ZWJwYWNrIERlZmluZVBsdWdpblxuICogLSBEZWFkIGNvZGUgZWxpbWluYXRpb24gcmVtb3ZlcyBhbGwgaWYgKERFQlVHKSBibG9ja3NcbiAqIC0gVGVyc2VyJ3MgZHJvcF9jb25zb2xlIHJlbW92ZXMgYW55IHJlbWFpbmluZyBjb25zb2xlIHN0YXRlbWVudHNcbiAqL1xuXG5pbXBvcnQgeyBERUJVRyB9IGZyb20gJy4vY29uc3RhbnRzLmpzJztcblxuLyoqXG4gKiBMb2cgZGVidWcgaW5mb3JtYXRpb24gKHJlbW92ZWQgaW4gcHJvZHVjdGlvbilcbiAqIEBwYXJhbSB7Li4uYW55fSBhcmdzIC0gQXJndW1lbnRzIHRvIGxvZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVidWcoLi4uYXJncykge1xuICBpZiAoREVCVUcpIHtcbiAgICBjb25zb2xlLmxvZyguLi5hcmdzKTtcbiAgfVxufVxuXG4vKipcbiAqIExvZyBlcnJvciBpbmZvcm1hdGlvbiAocmVtb3ZlZCBpbiBwcm9kdWN0aW9uKVxuICogQHBhcmFtIHsuLi5hbnl9IGFyZ3MgLSBBcmd1bWVudHMgdG8gbG9nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlcnJvciguLi5hcmdzKSB7XG4gIGlmIChERUJVRykge1xuICAgIGNvbnNvbGUuZXJyb3IoLi4uYXJncyk7XG4gIH1cbn1cblxuLyoqXG4gKiBMb2cgd2FybmluZyBpbmZvcm1hdGlvbiAocmVtb3ZlZCBpbiBwcm9kdWN0aW9uKVxuICogQHBhcmFtIHsuLi5hbnl9IGFyZ3MgLSBBcmd1bWVudHMgdG8gbG9nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3YXJuKC4uLmFyZ3MpIHtcbiAgaWYgKERFQlVHKSB7XG4gICAgY29uc29sZS53YXJuKC4uLmFyZ3MpO1xuICB9XG59XG5cbi8qKlxuICogTG9nIGluZm9ybWF0aW9uYWwgbWVzc2FnZXMgKHJlbW92ZWQgaW4gcHJvZHVjdGlvbilcbiAqIEBwYXJhbSB7Li4uYW55fSBhcmdzIC0gQXJndW1lbnRzIHRvIGxvZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gaW5mbyguLi5hcmdzKSB7XG4gIGlmIChERUJVRykge1xuICAgIGNvbnNvbGUuaW5mbyguLi5hcmdzKTtcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZSBhIG5hbWVzcGFjZWQgbG9nZ2VyIGZvciBhIHNwZWNpZmljIGNvbXBvbmVudFxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVzcGFjZSAtIENvbXBvbmVudCBvciBtb2R1bGUgbmFtZVxuICogQHJldHVybnMge09iamVjdH0gTG9nZ2VyIG9iamVjdCB3aXRoIG5hbWVzcGFjZWQgbWV0aG9kc1xuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTG9nZ2VyKG5hbWVzcGFjZSkge1xuICBjb25zdCBwcmVmaXggPSBgWyR7bmFtZXNwYWNlfV1gO1xuXG4gIHJldHVybiB7XG4gICAgZGVidWc6ICguLi5hcmdzKSA9PiBkZWJ1ZyhwcmVmaXgsIC4uLmFyZ3MpLFxuICAgIGVycm9yOiAoLi4uYXJncykgPT4gZXJyb3IocHJlZml4LCAuLi5hcmdzKSxcbiAgICB3YXJuOiAoLi4uYXJncykgPT4gd2FybihwcmVmaXgsIC4uLmFyZ3MpLFxuICAgIGluZm86ICguLi5hcmdzKSA9PiBpbmZvKHByZWZpeCwgLi4uYXJncyksXG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgZGVidWcsXG4gIGVycm9yLFxuICB3YXJuLFxuICBpbmZvLFxuICBjcmVhdGVMb2dnZXIsXG59O1xuIiwiaW1wb3J0IHsgSElEREVOX1ZJREVPX01FU1NBR0VTIH0gZnJvbSAnLi9jb25zdGFudHMuanMnO1xuaW1wb3J0IHsgcmV0cnlPcGVyYXRpb24sIGxvZ0Vycm9yLCBjbGFzc2lmeUVycm9yLCBFcnJvclR5cGUgfSBmcm9tICcuL2Vycm9ySGFuZGxlci5qcyc7XG5cbmNvbnN0IE1FU1NBR0VfVElNRU9VVCA9IDUwMDA7XG5cbi8vIFRyYWNrIGlmIGV4dGVuc2lvbiBjb250ZXh0IGhhcyBiZWVuIGludmFsaWRhdGVkXG5sZXQgY29udGV4dEludmFsaWRhdGVkID0gZmFsc2U7XG5cbi8qKlxuICogQ2hlY2sgaWYgdGhlIGV4dGVuc2lvbiBjb250ZXh0IGlzIHN0aWxsIHZhbGlkXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBjb250ZXh0IGlzIHZhbGlkLCBmYWxzZSBpZiBpbnZhbGlkYXRlZFxuICovXG5mdW5jdGlvbiBpc0V4dGVuc2lvbkNvbnRleHRWYWxpZCgpIHtcbiAgaWYgKGNvbnRleHRJbnZhbGlkYXRlZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgLy8gQWNjZXNzaW5nIGNocm9tZS5ydW50aW1lLmlkIHdpbGwgdGhyb3cgaWYgY29udGV4dCBpcyBpbnZhbGlkYXRlZFxuICAgIC8vIFRoaXMgaXMgYSByZWxpYWJsZSB3YXkgdG8gY2hlY2sgaWYgdGhlIGV4dGVuc2lvbiBpcyBzdGlsbCBhY3RpdmVcbiAgICBjb25zdCBpZCA9IGNocm9tZS5ydW50aW1lPy5pZDtcbiAgICByZXR1cm4gISFpZDtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBDb250ZXh0IGludmFsaWRhdGVkIC0gbWFyayBpdCBzbyB3ZSBkb24ndCBzcGFtIGNoZWNrc1xuICAgIGNvbnRleHRJbnZhbGlkYXRlZCA9IHRydWU7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogU2VuZCBtZXNzYWdlIHdpdGggdGltZW91dFxuICovXG5mdW5jdGlvbiBzZW5kTWVzc2FnZVdpdGhUaW1lb3V0KG1lc3NhZ2UsIHRpbWVvdXQgPSBNRVNTQUdFX1RJTUVPVVQpIHtcbiAgLy8gQ2hlY2sgaWYgZXh0ZW5zaW9uIGNvbnRleHQgaXMgc3RpbGwgdmFsaWQgYmVmb3JlIGF0dGVtcHRpbmcgdG8gc2VuZFxuICBpZiAoIWlzRXh0ZW5zaW9uQ29udGV4dFZhbGlkKCkpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdFeHRlbnNpb24gY29udGV4dCBpbnZhbGlkYXRlZCcpKTtcbiAgfVxuXG4gIHJldHVybiBQcm9taXNlLnJhY2UoW1xuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKG1lc3NhZ2UpLFxuICAgIG5ldyBQcm9taXNlKChfLCByZWplY3QpID0+XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoJ01lc3NhZ2UgdGltZW91dCcpKSwgdGltZW91dClcbiAgICApXG4gIF0pLmNhdGNoKGVycm9yID0+IHtcbiAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29udGV4dCBpbnZhbGlkYXRpb24gZXJyb3JcbiAgICBjb25zdCBlcnJvck1zZyA9IGVycm9yPy5tZXNzYWdlPy50b0xvd2VyQ2FzZSgpIHx8ICcnO1xuICAgIGlmIChlcnJvck1zZy5pbmNsdWRlcygnZXh0ZW5zaW9uIGNvbnRleHQgaW52YWxpZGF0ZWQnKSB8fFxuICAgICAgICBlcnJvck1zZy5pbmNsdWRlcygnY29udGV4dCBpbnZhbGlkYXRlZCcpKSB7XG4gICAgICBjb250ZXh0SW52YWxpZGF0ZWQgPSB0cnVlO1xuICAgIH1cbiAgICB0aHJvdyBlcnJvcjtcbiAgfSk7XG59XG5cbi8qKlxuICogU2VuZCBhIG1lc3NhZ2UgdG8gYmFja2dyb3VuZCBzY3JpcHQgZm9yIGhpZGRlbiB2aWRlb3Mgb3BlcmF0aW9uc1xuICogSW5jbHVkZXMgYXV0b21hdGljIHJldHJ5IGxvZ2ljIGZvciB0cmFuc2llbnQgZmFpbHVyZXNcbiAqXG4gKiBSZXRyeSBDb25maWd1cmF0aW9uOlxuICogLSBtYXhBdHRlbXB0czogNSAoaW5jcmVhc2VkIGZyb20gMyB0byBoYW5kbGUgc2VydmljZSB3b3JrZXIgd2FrZS11cCBkZWxheXMpXG4gKiAtIGluaXRpYWxEZWxheTogMzAwbXMgKGluY3JlYXNlZCBmcm9tIDIwMG1zIHRvIGdpdmUgYmFja2dyb3VuZCBzY3JpcHQgbW9yZSB0aW1lIHRvIGluaXRpYWxpemUpXG4gKiAtIG1heERlbGF5OiAzMDAwbXMgKGNhcHMgZXhwb25lbnRpYWwgYmFja29mZiB0byBwcmV2ZW50IGV4Y2Vzc2l2ZSB3YWl0aW5nKVxuICpcbiAqIFRoZXNlIHZhbHVlcyBhcmUgdHVuZWQgZm9yIE1hbmlmZXN0IFYzIHNlcnZpY2Ugd29ya2VycyB3aGljaCBtYXkgbmVlZCB0aW1lXG4gKiB0byB3YWtlIHVwIGFuZCBjb21wbGV0ZSBpbml0aWFsaXphdGlvbiBiZWZvcmUgaGFuZGxpbmcgbWVzc2FnZXMuXG4gKlxuICogQ29udGV4dCBJbnZhbGlkYXRpb246XG4gKiBXaGVuIHRoZSBleHRlbnNpb24gaXMgcmVsb2FkZWQvdXBkYXRlZCwgdGhlIGNvbnRleHQgYmVjb21lcyBpbnZhbGlkYXRlZC5cbiAqIFRoaXMgaXMgZXhwZWN0ZWQgYmVoYXZpb3IgYW5kIHRoZSBmdW5jdGlvbiB3aWxsIGZhaWwgZ3JhY2VmdWxseSB3aXRob3V0XG4gKiBsb2dnaW5nIGVycm9ycyB0byBhdm9pZCBjb25zb2xlIHNwYW0uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZW5kSGlkZGVuVmlkZW9zTWVzc2FnZSh0eXBlLCBwYXlsb2FkID0ge30pIHtcbiAgLy8gUXVpY2sgY2hlY2sgYmVmb3JlIGF0dGVtcHRpbmcgbWVzc2FnZSBzZW5kXG4gIGlmICghaXNFeHRlbnNpb25Db250ZXh0VmFsaWQoKSkge1xuICAgIC8vIFNpbGVudGx5IGZhaWwgd2hlbiBjb250ZXh0IGlzIGludmFsaWRhdGVkIC0gdGhpcyBpcyBleHBlY3RlZCBkdXJpbmcgZXh0ZW5zaW9uIHJlbG9hZFxuICAgIC8vIE5vIG5lZWQgdG8gbG9nIGVycm9ycyBhcyB0aGlzIGlzIGEgbm9ybWFsIHBhcnQgb2YgdGhlIGV4dGVuc2lvbiBsaWZlY3ljbGVcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdFeHRlbnNpb24gY29udGV4dCBpbnZhbGlkYXRlZCcpKTtcbiAgfVxuXG4gIHJldHVybiByZXRyeU9wZXJhdGlvbihcbiAgICBhc3luYyAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHNlbmRNZXNzYWdlV2l0aFRpbWVvdXQoeyB0eXBlLCAuLi5wYXlsb2FkIH0pO1xuXG4gICAgICAgIGlmICghcmVzcG9uc2UpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHJlc3BvbnNlIGZyb20gYmFja2dyb3VuZCBzY3JpcHQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcihyZXNwb25zZS5lcnJvciB8fCAnaGlkZGVuIHZpZGVvIG1lc3NhZ2UgZmFpbGVkJyk7XG4gICAgICAgICAgZXJyb3IucmVzcG9uc2UgPSByZXNwb25zZTtcbiAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXNwb25zZS5yZXN1bHQ7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAvLyBEb24ndCBsb2cgZXJyb3JzIGZvciBjb250ZXh0IGludmFsaWRhdGlvbiAtIHRoaXMgaXMgZXhwZWN0ZWQgYmVoYXZpb3JcbiAgICAgICAgY29uc3QgZXJyb3JUeXBlID0gY2xhc3NpZnlFcnJvcihlcnJvcik7XG4gICAgICAgIGlmIChlcnJvclR5cGUgIT09IEVycm9yVHlwZS5QRVJNQU5FTlQgfHwgIWVycm9yLm1lc3NhZ2U/LmluY2x1ZGVzKCdjb250ZXh0IGludmFsaWRhdGVkJykpIHtcbiAgICAgICAgICBsb2dFcnJvcignTWVzc2FnaW5nJywgZXJyb3IsIHsgdHlwZSwgcGF5bG9hZCB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIG1heEF0dGVtcHRzOiA1LFxuICAgICAgaW5pdGlhbERlbGF5OiAzMDAsXG4gICAgICBtYXhEZWxheTogMzAwMCxcbiAgICAgIHNob3VsZFJldHJ5OiAoZXJyb3IpID0+IHtcbiAgICAgICAgY29uc3QgZXJyb3JUeXBlID0gY2xhc3NpZnlFcnJvcihlcnJvcik7XG4gICAgICAgIC8vIERvbid0IHJldHJ5IHBlcm1hbmVudCBlcnJvcnMgKGluY2x1ZGluZyBjb250ZXh0IGludmFsaWRhdGlvbilcbiAgICAgICAgcmV0dXJuIGVycm9yVHlwZSA9PT0gRXJyb3JUeXBlLk5FVFdPUksgfHwgZXJyb3JUeXBlID09PSBFcnJvclR5cGUuVFJBTlNJRU5UO1xuICAgICAgfVxuICAgIH1cbiAgKTtcbn1cbiIsImV4cG9ydCBjb25zdCBOb3RpZmljYXRpb25UeXBlID0ge1xuICBFUlJPUjogJ2Vycm9yJyxcbiAgV0FSTklORzogJ3dhcm5pbmcnLFxuICBTVUNDRVNTOiAnc3VjY2VzcycsXG4gIElORk86ICdpbmZvJ1xufTtcblxuLy8gU3RvcmFnZSBmb3IgYWN0aXZlIG5vdGlmaWNhdGlvbnNcbmNvbnN0IGFjdGl2ZU5vdGlmaWNhdGlvbnMgPSBuZXcgTWFwKCk7XG5cbmV4cG9ydCBmdW5jdGlvbiBzaG93Tm90aWZpY2F0aW9uKG1lc3NhZ2UsIHR5cGUgPSBOb3RpZmljYXRpb25UeXBlLklORk8sIGR1cmF0aW9uID0gMzAwMCkge1xuICBjb25zdCBjb250YWluZXIgPSBnZXRPckNyZWF0ZU5vdGlmaWNhdGlvbkNvbnRhaW5lcigpO1xuICBjb25zdCBub3RpZmljYXRpb24gPSBjcmVhdGVOb3RpZmljYXRpb25FbGVtZW50KG1lc3NhZ2UsIHR5cGUpO1xuXG4gIGNvbnRhaW5lci5hcHBlbmRDaGlsZChub3RpZmljYXRpb24pO1xuXG4gIGNvbnN0IGlkID0gRGF0ZS5ub3coKSArIE1hdGgucmFuZG9tKCk7XG4gIGFjdGl2ZU5vdGlmaWNhdGlvbnMuc2V0KGlkLCBub3RpZmljYXRpb24pO1xuXG4gIC8vIEFuaW1hdGUgaW5cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICBub3RpZmljYXRpb24uY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xuICB9KTtcblxuICAvLyBBdXRvLWRpc21pc3NcbiAgaWYgKGR1cmF0aW9uID4gMCkge1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgZGlzbWlzc05vdGlmaWNhdGlvbihpZCwgbm90aWZpY2F0aW9uKTtcbiAgICB9LCBkdXJhdGlvbik7XG4gIH1cblxuICByZXR1cm4gaWQ7XG59XG5cbmZ1bmN0aW9uIGdldE9yQ3JlYXRlTm90aWZpY2F0aW9uQ29udGFpbmVyKCkge1xuICBsZXQgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3l0LWh3di1ub3RpZmljYXRpb25zJyk7XG4gIGlmICghY29udGFpbmVyKSB7XG4gICAgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgY29udGFpbmVyLmlkID0gJ3l0LWh3di1ub3RpZmljYXRpb25zJztcbiAgICBjb250YWluZXIuY2xhc3NOYW1lID0gJ3l0LWh3di1ub3RpZmljYXRpb24tY29udGFpbmVyJztcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XG4gIH1cbiAgcmV0dXJuIGNvbnRhaW5lcjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTm90aWZpY2F0aW9uRWxlbWVudChtZXNzYWdlLCB0eXBlKSB7XG4gIGNvbnN0IG5vdGlmaWNhdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBub3RpZmljYXRpb24uY2xhc3NOYW1lID0gYHl0LWh3di1ub3RpZmljYXRpb24gJHt0eXBlfWA7XG5cbiAgY29uc3QgaWNvbiA9IGdldEljb25Gb3JUeXBlKHR5cGUpO1xuXG4gIC8vIENyZWF0ZSBlbGVtZW50cyBzYWZlbHkgd2l0aG91dCBpbm5lckhUTUwgdG8gcHJldmVudCBYU1NcbiAgY29uc3QgaWNvbkRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBpY29uRGl2LmNsYXNzTmFtZSA9ICdub3RpZmljYXRpb24taWNvbic7XG4gIGljb25EaXYudGV4dENvbnRlbnQgPSBpY29uO1xuXG4gIGNvbnN0IG1lc3NhZ2VEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgbWVzc2FnZURpdi5jbGFzc05hbWUgPSAnbm90aWZpY2F0aW9uLW1lc3NhZ2UnO1xuICBtZXNzYWdlRGl2LnRleHRDb250ZW50ID0gbWVzc2FnZTtcblxuICBjb25zdCBjbG9zZUJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICBjbG9zZUJ0bi5jbGFzc05hbWUgPSAnbm90aWZpY2F0aW9uLWNsb3NlJztcbiAgY2xvc2VCdG4uc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgJ0Nsb3NlJyk7XG4gIGNsb3NlQnRuLnRleHRDb250ZW50ID0gJ8OXJztcblxuICBub3RpZmljYXRpb24uYXBwZW5kQ2hpbGQoaWNvbkRpdik7XG4gIG5vdGlmaWNhdGlvbi5hcHBlbmRDaGlsZChtZXNzYWdlRGl2KTtcbiAgbm90aWZpY2F0aW9uLmFwcGVuZENoaWxkKGNsb3NlQnRuKTtcblxuICBjbG9zZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICBkaXNtaXNzTm90aWZpY2F0aW9uKG51bGwsIG5vdGlmaWNhdGlvbik7XG4gIH0pO1xuXG4gIHJldHVybiBub3RpZmljYXRpb247XG59XG5cbmZ1bmN0aW9uIGdldEljb25Gb3JUeXBlKHR5cGUpIHtcbiAgY29uc3QgaWNvbnMgPSB7XG4gICAgZXJyb3I6ICfimqAnLFxuICAgIHdhcm5pbmc6ICfimqAnLFxuICAgIHN1Y2Nlc3M6ICfinJMnLFxuICAgIGluZm86ICfihLknXG4gIH07XG4gIHJldHVybiBpY29uc1t0eXBlXSB8fCBpY29ucy5pbmZvO1xufVxuXG5mdW5jdGlvbiBkaXNtaXNzTm90aWZpY2F0aW9uKGlkLCBub3RpZmljYXRpb24pIHtcbiAgbm90aWZpY2F0aW9uLmNsYXNzTGlzdC5yZW1vdmUoJ3Zpc2libGUnKTtcbiAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgbm90aWZpY2F0aW9uLnJlbW92ZSgpO1xuICAgIGlmIChpZCkge1xuICAgICAgYWN0aXZlTm90aWZpY2F0aW9ucy5kZWxldGUoaWQpO1xuICAgIH1cbiAgfSwgMzAwKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyQWxsTm90aWZpY2F0aW9ucygpIHtcbiAgYWN0aXZlTm90aWZpY2F0aW9ucy5mb3JFYWNoKChub3RpZmljYXRpb24pID0+IHtcbiAgICBkaXNtaXNzTm90aWZpY2F0aW9uKG51bGwsIG5vdGlmaWNhdGlvbik7XG4gIH0pO1xuICBhY3RpdmVOb3RpZmljYXRpb25zLmNsZWFyKCk7XG59XG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsImltcG9ydCB7IGluamVjdFN0eWxlcyB9IGZyb20gJy4vdWkvc3R5bGVzLmpzJztcbmltcG9ydCB7IGxvYWRTZXR0aW5ncyB9IGZyb20gJy4vc3RvcmFnZS9zZXR0aW5ncy5qcyc7XG5pbXBvcnQgeyBhcHBseUhpZGluZywgc2V0dXBNZXNzYWdlTGlzdGVuZXIsIGNsZWFudXBFdmVudEhhbmRsZXJzIH0gZnJvbSAnLi9ldmVudHMvZXZlbnRIYW5kbGVyLmpzJztcbmltcG9ydCB7IHNldHVwTXV0YXRpb25PYnNlcnZlciB9IGZyb20gJy4vb2JzZXJ2ZXJzL211dGF0aW9uT2JzZXJ2ZXIuanMnO1xuaW1wb3J0IHsgc2V0dXBVcmxPYnNlcnZlciB9IGZyb20gJy4vb2JzZXJ2ZXJzL3VybE9ic2VydmVyLmpzJztcbmltcG9ydCB7IHNldHVwWGhyT2JzZXJ2ZXIgfSBmcm9tICcuL29ic2VydmVycy94aHJPYnNlcnZlci5qcyc7XG5pbXBvcnQgeyBzZXR1cEludGVyc2VjdGlvbk9ic2VydmVyLCBkaXNjb25uZWN0SW50ZXJzZWN0aW9uT2JzZXJ2ZXIgfSBmcm9tICcuL29ic2VydmVycy9pbnRlcnNlY3Rpb25PYnNlcnZlci5qcyc7XG5pbXBvcnQgeyBsb2dEZWJ1Zywgd2FybiB9IGZyb20gJy4vdXRpbHMvbG9nZ2VyLmpzJztcbmltcG9ydCB7IHNlbmRIaWRkZW5WaWRlb3NNZXNzYWdlIH0gZnJvbSAnLi4vc2hhcmVkL21lc3NhZ2luZy5qcyc7XG5pbXBvcnQgeyBISURERU5fVklERU9fTUVTU0FHRVMgfSBmcm9tICcuLi9zaGFyZWQvY29uc3RhbnRzLmpzJztcbmltcG9ydCB7IGxvZ0Vycm9yIH0gZnJvbSAnLi4vc2hhcmVkL2Vycm9ySGFuZGxlci5qcyc7XG5pbXBvcnQgeyBzaG93Tm90aWZpY2F0aW9uIH0gZnJvbSAnLi4vc2hhcmVkL25vdGlmaWNhdGlvbnMuanMnO1xuaW1wb3J0IHsgc2V0dXBET01IZWFsdGhNb25pdG9yaW5nIH0gZnJvbSAnLi91dGlscy9kb21FcnJvckRldGVjdGlvbi5qcyc7XG5pbXBvcnQgeyByZXNldFNlbGVjdG9yU3RhdHMgfSBmcm9tICcuL3V0aWxzL2RvbVNlbGVjdG9ySGVhbHRoLmpzJztcblxuLyoqXG4gKiBXYWl0IGZvciBiYWNrZ3JvdW5kIHNjcmlwdCB0byBiZSByZWFkeVxuICogRXhwb3J0ZWQgZm9yIHRlc3RpbmcgcHVycG9zZXNcbiAqXG4gKiBAcGFyYW0ge251bWJlcn0gbWF4QXR0ZW1wdHMgLSBNYXhpbXVtIG51bWJlciBvZiBoZWFsdGggY2hlY2sgYXR0ZW1wdHNcbiAqIEBwYXJhbSB7bnVtYmVyfSBkZWxheU1zIC0gRGVsYXkgYmV0d2VlbiBhdHRlbXB0cyBpbiBtaWxsaXNlY29uZHNcbiAqIEByZXR1cm5zIHtQcm9taXNlPGJvb2xlYW4+fSBUcnVlIGlmIGJhY2tncm91bmQgaXMgcmVhZHksIGZhbHNlIG90aGVyd2lzZVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd2FpdEZvckJhY2tncm91bmRSZWFkeShtYXhBdHRlbXB0cyA9IDEwLCBkZWxheU1zID0gNTAwKSB7XG4gIGZvciAobGV0IGF0dGVtcHQgPSAxOyBhdHRlbXB0IDw9IG1heEF0dGVtcHRzOyBhdHRlbXB0KyspIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgaGVhbHRoID0gYXdhaXQgc2VuZEhpZGRlblZpZGVvc01lc3NhZ2UoXG4gICAgICAgIEhJRERFTl9WSURFT19NRVNTQUdFUy5IRUFMVEhfQ0hFQ0ssXG4gICAgICAgIHt9XG4gICAgICApO1xuXG4gICAgICBpZiAoaGVhbHRoICYmIGhlYWx0aC5yZWFkeSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGhlYWx0aCAmJiBoZWFsdGguZXJyb3IpIHtcbiAgICAgICAgbG9nRXJyb3IoJ0NvbnRlbnRJbml0JywgbmV3IEVycm9yKCdCYWNrZ3JvdW5kIGluaXRpYWxpemF0aW9uIGVycm9yOiAnICsgaGVhbHRoLmVycm9yKSk7XG4gICAgICAgIC8vIENvbnRpbnVlIHdhaXRpbmcsIGl0IG1pZ2h0IHJlY292ZXJcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nRXJyb3IoJ0NvbnRlbnRJbml0JywgZXJyb3IsIHtcbiAgICAgICAgYXR0ZW1wdCxcbiAgICAgICAgbWF4QXR0ZW1wdHMsXG4gICAgICAgIG1lc3NhZ2U6ICdIZWFsdGggY2hlY2sgZmFpbGVkLCByZXRyeWluZy4uLidcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChhdHRlbXB0IDwgbWF4QXR0ZW1wdHMpIHtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBkZWxheU1zKSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlOyAvLyBOb3QgcmVhZHkgYWZ0ZXIgbWF4IGF0dGVtcHRzXG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgaXNSZWFkeSA9IGF3YWl0IHdhaXRGb3JCYWNrZ3JvdW5kUmVhZHkoKTtcblxuICAgIGlmICghaXNSZWFkeSkge1xuICAgICAgd2FybignW1lULUhXVl0gQmFja2dyb3VuZCBzY3JpcHQgbm90IHJlYWR5LCBzdGFydGluZyB3aXRoIGxpbWl0ZWQgZnVuY3Rpb25hbGl0eS4gSW5kaXZpZHVhbCB2aWRlbyBoaWRpbmcvZGltbWluZyBtYXkgbm90IHdvcmsgdW50aWwgYmFja2dyb3VuZCBzZXJ2aWNlIGlzIHJlYWR5LicpO1xuICAgICAgLy8gQ29udGludWUgYW55d2F5IGJ1dCB3aXRoIGdyYWNlZnVsIGRlZ3JhZGF0aW9uXG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGluamVjdFN0eWxlcygpO1xuICAgIH0gY2F0Y2ggKHN0eWxlRXJyb3IpIHtcbiAgICAgIGxvZ0Vycm9yKCdDb250ZW50SW5pdCcsIHN0eWxlRXJyb3IsIHsgY29tcG9uZW50OiAnc3R5bGVzJywgZmF0YWw6IHRydWUgfSk7XG4gICAgICBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJyAmJiBkb2N1bWVudC5ib2R5KSB7XG4gICAgICAgIHNob3dOb3RpZmljYXRpb24oJ1lvdVR1YmUgSGlkZSBXYXRjaGVkIFZpZGVvcyBmYWlsZWQgdG8gbG9hZCBzdHlsZXMnLCAnZXJyb3InLCA1MDAwKTtcbiAgICAgIH1cbiAgICAgIHRocm93IHN0eWxlRXJyb3I7XG4gICAgfVxuXG4gICAgYXdhaXQgbG9hZFNldHRpbmdzKCk7XG5cbiAgICAvLyBSZXNldCBzZWxlY3RvciBzdGF0cyBvbiBwYWdlIG5hdmlnYXRpb25cbiAgICByZXNldFNlbGVjdG9yU3RhdHMoKTtcblxuICAgIC8vIFNldHVwIERPTSBoZWFsdGggbW9uaXRvcmluZ1xuICAgIHNldHVwRE9NSGVhbHRoTW9uaXRvcmluZygpO1xuXG4gICAgLy8gQXBwbHkgaW5pdGlhbCBoaWRpbmcgYmVmb3JlIHNldHRpbmcgdXAgSW50ZXJzZWN0aW9uT2JzZXJ2ZXJcbiAgICAvLyBUaGlzIHByZXZlbnRzIHJhY2UgY29uZGl0aW9uIHdoZXJlIG9ic2VydmVyIGNhbGxiYWNrcyBmaXJlXG4gICAgLy8gd2hpbGUgaW5pdGlhbCBwcm9jZXNzaW5nIGlzIHN0aWxsIGhhcHBlbmluZ1xuICAgIGF3YWl0IGFwcGx5SGlkaW5nKCk7XG5cbiAgICAvLyBTZXR1cCBJbnRlcnNlY3Rpb25PYnNlcnZlciBhZnRlciBpbml0aWFsIHByb2Nlc3NpbmcgY29tcGxldGVzXG4gICAgc2V0dXBJbnRlcnNlY3Rpb25PYnNlcnZlcigpO1xuXG4gICAgc2V0dXBNdXRhdGlvbk9ic2VydmVyKGFwcGx5SGlkaW5nKTtcbiAgICBzZXR1cFhock9ic2VydmVyKGFwcGx5SGlkaW5nKTtcbiAgICBzZXR1cFVybE9ic2VydmVyKGFwcGx5SGlkaW5nKTtcbiAgICBzZXR1cE1lc3NhZ2VMaXN0ZW5lcigpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ0Vycm9yKCdDb250ZW50SW5pdCcsIGVycm9yLCB7IGZhdGFsOiB0cnVlIH0pO1xuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnICYmIGRvY3VtZW50LmJvZHkpIHtcbiAgICAgIHNob3dOb3RpZmljYXRpb24oJ1lvdVR1YmUgSGlkZSBXYXRjaGVkIFZpZGVvcyBleHRlbnNpb24gZmFpbGVkIHRvIGluaXRpYWxpemUnLCAnZXJyb3InLCA1MDAwKTtcbiAgICB9XG4gIH1cbn1cblxuaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdsb2FkaW5nJykge1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgaW5pdCk7XG59IGVsc2Uge1xuICBpbml0KCk7XG59XG5cbi8vIENsZWFudXAgb24gcGFnZSB1bmxvYWQgYW5kIGV4dGVuc2lvbi1zcGVjaWZpYyBldmVudHNcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAvLyBTdGFuZGFyZCBiZWZvcmV1bmxvYWQgKG1heSBub3QgZmlyZSByZWxpYWJseSBpbiBleHRlbnNpb25zKVxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignYmVmb3JldW5sb2FkJywgKCkgPT4ge1xuICAgIGRpc2Nvbm5lY3RJbnRlcnNlY3Rpb25PYnNlcnZlcigpO1xuICAgIGNsZWFudXBFdmVudEhhbmRsZXJzKCk7XG4gIH0pO1xuXG4gIC8vIFBhZ2UgdmlzaWJpbGl0eSBjaGFuZ2UgLSBjbGVhbnVwIHdoZW4gcGFnZSBiZWNvbWVzIGhpZGRlblxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5Y2hhbmdlJywgKCkgPT4ge1xuICAgIGlmIChkb2N1bWVudC52aXNpYmlsaXR5U3RhdGUgPT09ICdoaWRkZW4nKSB7XG4gICAgICAvLyBQYXJ0aWFsIGNsZWFudXAgdG8gZnJlZSByZXNvdXJjZXMgd2hlbiBwYWdlIGlzIGhpZGRlblxuICAgICAgZGlzY29ubmVjdEludGVyc2VjdGlvbk9ic2VydmVyKCk7XG4gICAgfVxuICB9KTtcblxuICAvLyBQYWdlaGlkZSBldmVudCAtIG1vcmUgcmVsaWFibGUgdGhhbiBiZWZvcmV1bmxvYWQgaW4gbW9kZXJuIGJyb3dzZXJzXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwYWdlaGlkZScsICgpID0+IHtcbiAgICBkaXNjb25uZWN0SW50ZXJzZWN0aW9uT2JzZXJ2ZXIoKTtcbiAgICBjbGVhbnVwRXZlbnRIYW5kbGVycygpO1xuICB9KTtcbn1cblxuLy8gRXh0ZW5zaW9uLXNwZWNpZmljIGNsZWFudXBcbmlmICh0eXBlb2YgY2hyb21lICE9PSAndW5kZWZpbmVkJyAmJiBjaHJvbWUucnVudGltZSkge1xuICAvLyBMaXN0ZW4gZm9yIGV4dGVuc2lvbiBiZWluZyBkaXNhYmxlZCBvciB1bmxvYWRlZFxuICBjaHJvbWUucnVudGltZS5vblN1c3BlbmQ/LmFkZExpc3RlbmVyKCgpID0+IHtcbiAgICBkaXNjb25uZWN0SW50ZXJzZWN0aW9uT2JzZXJ2ZXIoKTtcbiAgICBjbGVhbnVwRXZlbnRIYW5kbGVycygpO1xuICB9KTtcbn1cblxubG9nRGVidWcoJ1lvdVR1YmUgSGlkZSBXYXRjaGVkIFZpZGVvcyBleHRlbnNpb24gbG9hZGVkJyk7XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=