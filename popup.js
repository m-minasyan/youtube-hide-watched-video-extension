document.addEventListener('DOMContentLoaded', async () => {
  const thresholdSlider = document.getElementById('threshold');
  const thresholdValue = document.getElementById('threshold-value');
  const resetButton = document.getElementById('reset-all');
  const modeButtons = document.querySelectorAll('.mode-btn');
  const themeToggle = document.getElementById('theme-toggle');
  const viewHiddenVideosBtn = document.getElementById('view-hidden-videos');
  const individualModeButtons = document.querySelectorAll('.individual-mode');
  const sectionHeaders = document.querySelectorAll('.section-header');
  const quickToggleButtons = document.querySelectorAll('.quick-btn-small');
  const individualModeToggle = document.getElementById('individual-mode-toggle');
  const individualModeOptions = document.getElementById('individual-mode-options');

  const STORAGE_KEYS = {
    THRESHOLD: 'YTHWV_THRESHOLD',
    WATCHED_STATE: 'YTHWV_STATE',
    SHORTS_STATE: 'YTHWV_STATE_SHORTS',
    THEME: 'YTHWV_THEME',
    HIDDEN_VIDEOS: 'YTHWV_HIDDEN_VIDEOS',
    INDIVIDUAL_MODE: 'YTHWV_INDIVIDUAL_MODE',
    INDIVIDUAL_MODE_ENABLED: 'YTHWV_INDIVIDUAL_MODE_ENABLED'
  };

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

  async function initIndividualMode() {
    const result = await chrome.storage.sync.get([
      STORAGE_KEYS.INDIVIDUAL_MODE,
      STORAGE_KEYS.INDIVIDUAL_MODE_ENABLED
    ]);
    
    let individualMode = result[STORAGE_KEYS.INDIVIDUAL_MODE];
    let individualModeEnabled = result[STORAGE_KEYS.INDIVIDUAL_MODE_ENABLED];
    
    if (individualModeEnabled === undefined) {
      individualModeEnabled = DEFAULT_SETTINGS.individualModeEnabled;
      await saveSettings(STORAGE_KEYS.INDIVIDUAL_MODE_ENABLED, individualModeEnabled);
    }
    
    if (!individualMode) {
      individualMode = DEFAULT_SETTINGS.individualMode;
      await saveSettings(STORAGE_KEYS.INDIVIDUAL_MODE, individualMode);
    }
    
    individualModeToggle.checked = individualModeEnabled;
    
    if (individualModeEnabled) {
      individualModeOptions.classList.remove('disabled');
    } else {
      individualModeOptions.classList.add('disabled');
    }
    
    individualModeButtons.forEach(button => {
      button.classList.remove('active');
      if (button.dataset.mode === individualMode) {
        button.classList.add('active');
      }
    });
    
    const hasActiveButton = Array.from(individualModeButtons).some(btn => btn.classList.contains('active'));
    if (!hasActiveButton && individualModeButtons.length > 0) {
      const dimmedButton = Array.from(individualModeButtons).find(btn => btn.dataset.mode === 'dimmed');
      if (dimmedButton) {
        dimmedButton.classList.add('active');
        await saveSettings(STORAGE_KEYS.INDIVIDUAL_MODE, 'dimmed');
      }
    }
  }

  async function initTheme() {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.THEME);
    let theme = result[STORAGE_KEYS.THEME];
    
    if (!theme || theme === 'auto') {
      const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = isDarkMode ? 'dark' : 'light';
      
      if (!result[STORAGE_KEYS.THEME]) {
        await saveSettings(STORAGE_KEYS.THEME, theme);
      }
    }
    
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  async function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    
    await saveSettings(STORAGE_KEYS.THEME, newTheme);
  }

  async function loadSettings() {
    const result = await chrome.storage.sync.get(null);
    
    const threshold = result[STORAGE_KEYS.THRESHOLD] || DEFAULT_SETTINGS.threshold;
    thresholdSlider.value = threshold;
    thresholdValue.textContent = `${threshold}%`;

    modeButtons.forEach(button => {
      if (button.classList.contains('individual-mode')) {
        return;
      }
      
      const section = button.dataset.section;
      const type = button.dataset.type;
      const mode = button.dataset.mode;
      
      const storageKey = type === 'watched' 
        ? `${STORAGE_KEYS.WATCHED_STATE}_${section}`
        : `${STORAGE_KEYS.SHORTS_STATE}_${section}`;
      
      const currentMode = result[storageKey] || 'normal';
      
      if (currentMode === mode) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    
    updateQuickToggleStates(result);
  }
  
  function updateQuickToggleStates(settings) {
    ['watched', 'shorts'].forEach(type => {
      const states = type === 'watched' ? DEFAULT_SETTINGS.states.watched : DEFAULT_SETTINGS.states.shorts;
      const storageKey = type === 'watched' ? STORAGE_KEYS.WATCHED_STATE : STORAGE_KEYS.SHORTS_STATE;
      
      const sectionModes = Object.keys(states).map(section => {
        return settings[`${storageKey}_${section}`] || 'normal';
      });
      
      const allSame = sectionModes.every(mode => mode === sectionModes[0]);
      const commonMode = allSame ? sectionModes[0] : null;
      
      quickToggleButtons.forEach(button => {
        if (button.dataset.toggleType === type) {
          if (commonMode && button.dataset.toggleMode === commonMode) {
            button.classList.add('active');
          } else {
            button.classList.remove('active');
          }
        }
      });
    });
  }

  async function saveSettings(key, value) {
    const data = {};
    data[key] = value;
    await chrome.storage.sync.set(data);
    
    if (key !== STORAGE_KEYS.THEME) {
      chrome.tabs.query({url: '*://*.youtube.com/*'}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'settingsUpdated',
            key: key,
            value: value
          }).catch(() => {});
        });
      });
    }
  }

  themeToggle.addEventListener('click', toggleTheme);

  thresholdSlider.addEventListener('input', async (e) => {
    const value = e.target.value;
    thresholdValue.textContent = `${value}%`;
    await saveSettings(STORAGE_KEYS.THRESHOLD, parseInt(value));
  });

  modeButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const section = button.dataset.section;
      const type = button.dataset.type;
      const mode = button.dataset.mode;
      
      const siblingButtons = button.parentElement.querySelectorAll('.mode-btn');
      siblingButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      const storageKey = type === 'watched' 
        ? `${STORAGE_KEYS.WATCHED_STATE}_${section}`
        : `${STORAGE_KEYS.SHORTS_STATE}_${section}`;
      
      await saveSettings(storageKey, mode);
      
      const allSettings = await chrome.storage.sync.get(null);
      updateQuickToggleStates(allSettings);
    });
  });

  async function setTypeToMode(type, mode) {
    const updates = {};
    const states = type === 'watched' ? DEFAULT_SETTINGS.states.watched : DEFAULT_SETTINGS.states.shorts;
    const storageKey = type === 'watched' ? STORAGE_KEYS.WATCHED_STATE : STORAGE_KEYS.SHORTS_STATE;
    
    Object.keys(states).forEach(section => {
      updates[`${storageKey}_${section}`] = mode;
    });
    
    await chrome.storage.sync.set(updates);
    await loadSettings();
    
    quickToggleButtons.forEach(button => {
      if (button.dataset.toggleType === type) {
        if (button.dataset.toggleMode === mode) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      }
    });
    
    chrome.tabs.query({url: '*://*.youtube.com/*'}, (tabs) => {
      tabs.forEach(tab => {
        Object.keys(updates).forEach(key => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'settingsUpdated',
            key: key,
            value: mode
          }).catch(() => {});
        });
      });
    });
  }

  sectionHeaders.forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('.quick-btn-small')) return;
      
      const section = header.closest('.settings-section');
      const content = section.querySelector('.collapsible-content');
      
      if (section.classList.contains('collapsed')) {
        section.classList.remove('collapsed');
        content.style.display = 'block';
        setTimeout(() => {
          content.style.maxHeight = '1000px';
          content.style.opacity = '1';
        }, 10);
      } else {
        content.style.maxHeight = '0';
        content.style.opacity = '0';
        setTimeout(() => {
          section.classList.add('collapsed');
          content.style.display = 'none';
        }, 300);
      }
    });
  });

  quickToggleButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const type = button.dataset.toggleType;
      const mode = button.dataset.toggleMode;
      await setTypeToMode(type, mode);
    });
  });
  
  individualModeToggle.addEventListener('change', async () => {
    const enabled = individualModeToggle.checked;
    await saveSettings(STORAGE_KEYS.INDIVIDUAL_MODE_ENABLED, enabled);
    
    if (enabled) {
      individualModeOptions.classList.remove('disabled');
    } else {
      individualModeOptions.classList.add('disabled');
    }
  });
  
  individualModeButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const mode = button.dataset.mode;
      
      individualModeButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      await saveSettings(STORAGE_KEYS.INDIVIDUAL_MODE, mode);
    });
  });
  
  viewHiddenVideosBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('hidden-videos.html') });
  });

  resetButton.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      await chrome.storage.sync.clear();
      
      const defaultData = {
        [STORAGE_KEYS.THRESHOLD]: DEFAULT_SETTINGS.threshold,
        [STORAGE_KEYS.THEME]: DEFAULT_SETTINGS.theme,
        [STORAGE_KEYS.INDIVIDUAL_MODE]: DEFAULT_SETTINGS.individualMode,
        [STORAGE_KEYS.INDIVIDUAL_MODE_ENABLED]: DEFAULT_SETTINGS.individualModeEnabled
      };
      
      Object.keys(DEFAULT_SETTINGS.states.watched).forEach(section => {
        defaultData[`${STORAGE_KEYS.WATCHED_STATE}_${section}`] = DEFAULT_SETTINGS.states.watched[section];
      });
      
      Object.keys(DEFAULT_SETTINGS.states.shorts).forEach(section => {
        defaultData[`${STORAGE_KEYS.SHORTS_STATE}_${section}`] = DEFAULT_SETTINGS.states.shorts[section];
      });
      
      await chrome.storage.sync.set(defaultData);
      
      await initTheme();
      await loadSettings();
      await initIndividualMode();
      
      chrome.tabs.query({url: '*://*.youtube.com/*'}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {action: 'resetSettings'}).catch(() => {});
        });
      });
    }
  });

  await initTheme();
  await loadSettings();
  await initIndividualMode();
});