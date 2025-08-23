document.addEventListener('DOMContentLoaded', async () => {
  const thresholdSlider = document.getElementById('threshold');
  const thresholdValue = document.getElementById('threshold-value');
  const resetButton = document.getElementById('reset-all');
  const modeButtons = document.querySelectorAll('.mode-btn');
  const themeToggle = document.getElementById('theme-toggle');
  const toggleAllNormal = document.getElementById('toggle-all-normal');
  const toggleAllDimmed = document.getElementById('toggle-all-dimmed');
  const toggleAllHidden = document.getElementById('toggle-all-hidden');

  const STORAGE_KEYS = {
    THRESHOLD: 'YTHWV_THRESHOLD',
    WATCHED_STATE: 'YTHWV_STATE',
    SHORTS_STATE: 'YTHWV_STATE_SHORTS',
    THEME: 'YTHWV_THEME'
  };

  const DEFAULT_SETTINGS = {
    threshold: 10,
    theme: 'light',
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

  async function initTheme() {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.THEME);
    const theme = result[STORAGE_KEYS.THEME] || DEFAULT_SETTINGS.theme;
    
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
    });
  });

  async function setAllToMode(mode) {
    const updates = {};
    
    Object.keys(DEFAULT_SETTINGS.states.watched).forEach(section => {
      updates[`${STORAGE_KEYS.WATCHED_STATE}_${section}`] = mode;
    });
    
    Object.keys(DEFAULT_SETTINGS.states.shorts).forEach(section => {
      updates[`${STORAGE_KEYS.SHORTS_STATE}_${section}`] = mode;
    });
    
    await chrome.storage.sync.set(updates);
    await loadSettings();
    
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

  toggleAllNormal.addEventListener('click', () => setAllToMode('normal'));
  toggleAllDimmed.addEventListener('click', () => setAllToMode('dimmed'));
  toggleAllHidden.addEventListener('click', () => setAllToMode('hidden'));

  resetButton.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      await chrome.storage.sync.clear();
      
      const defaultData = {
        [STORAGE_KEYS.THRESHOLD]: DEFAULT_SETTINGS.threshold,
        [STORAGE_KEYS.THEME]: DEFAULT_SETTINGS.theme
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
      
      chrome.tabs.query({url: '*://*.youtube.com/*'}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {action: 'resetSettings'}).catch(() => {});
        });
      });
    }
  });

  await initTheme();
  await loadSettings();
});