# YouTube Hide Watched Videos Extension

A powerful Chrome extension that automatically hides, dims, or manages watched videos and YouTube Shorts with advanced customization options and individual video control.

## 🚀 Features

### Core Functionality

- **Automatic Detection**: Intelligently detects and processes watched videos based on YouTube's progress indicators
- **Three Visibility Modes**:
  - **Normal**: Show all content as usual
  - **Dimmed**: Make content semi-transparent for subtle de-emphasis
  - **Hidden**: Completely remove content from view
- **Individual Video Control**:
  - Eye icon on each video thumbnail for instant hide/dim toggle
  - Real-time visibility changes without page reload
  - Persistent state across sessions
- **Hidden Videos Manager**:
  - Dedicated page to view and manage all individually hidden videos
  - Filter by status (All, Dimmed, Hidden)
  - Pagination support (12 videos per page)
  - Quick actions: Toggle state, View on YouTube, Remove from list

### Advanced Settings

- **Section-Specific Configuration**: Different settings for each YouTube section:
  - Home page
  - Subscriptions
  - Channel pages
  - Watch page (sidebar)
  - Trending
  - Playlists
- **YouTube Shorts Control**: Separate handling for Shorts content
- **Adjustable Watch Threshold**: Set minimum watch percentage (0-100%)
- **Individual Mode Toggle**: Enable/disable per-video controls
- **Quick Toggle Buttons**: Apply settings to all videos/shorts at once

### User Interface

- **Modern Design**: Clean, intuitive popup interface with smooth animations
- **Dark/Light Theme**:
  - Automatic theme detection based on system preferences
  - Manual theme toggle with persistent preference
  - Consistent theming across all extension pages
- **Collapsible Sections**: Organized settings with dropdown functionality
- **Visual Feedback**: Instant response to all user interactions
- **Responsive Layout**: Optimized for all screen sizes

## 📦 Installation

### Method 1: From Chrome Web Store

(Coming soon - currently in review)

### Method 2: From Source (Developer Mode)

1. Download or clone this repository:

   ```bash
   git clone https://github.com/m-minasyan/youtube-hide-watched-video-extension.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked"

5. Select the extension directory

### Method 3: From Release Package

1. Download the latest `.zip` file from the [Releases](https://github.com/m-minasyan/youtube-hide-watched-video-extension/releases) page

2. Extract the ZIP file to a folder

3. Follow steps 2-5 from Method 2 above

## 🎯 Usage Guide

### Basic Usage

1. Click the extension icon in your Chrome toolbar
2. Configure your preferences:
   - Set watched video threshold using the slider
   - Choose visibility modes for different sections
   - Enable/disable Individual Mode for per-video control
3. Navigate to YouTube - settings apply automatically

### Individual Video Management

1. Enable "Individual Video Mode" in the extension popup
2. Hover over any video thumbnail on YouTube
3. Click the eye icon to hide/dim that specific video
4. Access Hidden Videos Manager from the popup to manage hidden videos

### Quick Actions

- Use Quick Toggle buttons to set all videos/shorts to the same mode instantly
- Click section headers to expand/collapse settings groups
- Toggle theme with the sun/moon icon in the header

## 🏗️ Technical Architecture

### Project Structure

```
/
├── manifest.json           # Extension manifest (Manifest V3)
├── package.json           # Node.js dependencies and test configuration
├── background.js          # Service worker for extension lifecycle
├── content.js            # Content script for YouTube manipulation
├── popup.html/js/css    # Extension popup interface
├── hidden-videos.*      # Hidden Videos Manager page
├── icons/              # Extension icons (16x16 to 128x128)
├── tests/             # Comprehensive test suite (230+ tests)
│   ├── setup.js      # Jest configuration
│   ├── testUtils.js  # Test utilities
│   └── *.test.js    # Test files for all components
├── scripts/          # Build and utility scripts
│   ├── build-extension.sh
│   └── run_tests_local.sh
└── docs/            # Project documentation
    ├── app-flow.md
    ├── changelog.md
    ├── backend-structure.md
    ├── frontend-guidelines.md
    ├── tech-stack.md
    └── prd.md
```

### Technology Stack

- **Core**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **APIs**: Chrome Extensions Manifest V3, WebExtensions API
- **Testing**: Jest with 230+ unit tests covering all business logic
- **Build Tools**: Bash scripts for packaging and distribution
- **Browser Support**: Chrome 88+, Edge (Chromium), Brave, Opera

### Key Features Implementation

- **DOM Manipulation**: Efficient selectors supporting latest YouTube HTML structure
- **State Management**: Chrome Storage API with cross-tab synchronization
- **Performance**: Debounced operations, caching, and optimized queries
- **Error Handling**: Comprehensive error recovery and fallback mechanisms

## 🧪 Testing

The extension includes a comprehensive test suite with 230+ unit tests covering:

- Settings management and initialization
- Video detection and hiding logic
- Theme management and persistence
- Individual video management
- DOM manipulation and mutation observers
- Message passing between components
- Storage synchronization
- Performance optimization
- Edge cases and error scenarios

Run tests locally:

```bash
npm install
npm test
```

## 🩺 Troubleshooting

- View Hidden Videos opens ERR_FILE_NOT_FOUND:
  - Cause: An older build package missed bundling the Hidden Videos Manager page (`hidden-videos.html/css/js`).
  - Status: Fixed in v2.4.3 by updating the build script to include these files.
  - Fix locally: Reload the unpacked extension from the repo root or rebuild using `./scripts/build-extension.sh`, then click “Reload” in `chrome://extensions/`.

## 🔒 Privacy & Security

This extension:

- ✅ **No Data Collection**: Does not collect or transmit any personal data
- ✅ **Local Storage Only**: All preferences stored locally in Chrome
- ✅ **Minimal Permissions**: Only requests necessary YouTube access
- ✅ **Open Source**: Full source code available for review
- ✅ **No External Connections**: No analytics or tracking
- ✅ **Content Security Policy**: Strict CSP enforcement

## 🛠️ Development

### Prerequisites

- Node.js 14+ (for testing)
- Chrome 88+ for testing
- Git for version control

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/m-minasyan/youtube-hide-watched-video-extension.git
cd youtube-hide-watched-video-extension

# Install test dependencies
npm install

# Run tests
npm test

# Build for distribution
./scripts/build-extension.sh
```

The build script bundles all required assets, including the Hidden Videos Manager page (`hidden-videos.html`, `hidden-videos.css`, `hidden-videos.js`). If you previously saw ERR_FILE_NOT_FOUND when clicking “View Hidden Videos”, rebuild and reload the extension.

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Changelog

### Version 2.5.1 (Latest)

- Enhanced storage with IndexedDB for unlimited hidden videos
- Improved pagination in Hidden Videos Manager
- Faster and more stable hide/unhide operations
- Better synchronization across multiple tabs
- Fixed UI flickering issues
- Optimized memory usage and performance
- Rock-solid stability with service worker improvements

See [CHANGELOG.md](docs/changelog.md) for full version history.

## 🤝 Support

For issues, feature requests, or questions:

- **GitHub Issues**: [Report a bug or request a feature](https://github.com/m-minasyan/youtube-hide-watched-video-extension/issues)
- **Discussions**: [Join the conversation](https://github.com/m-minasyan/youtube-hide-watched-video-extension/discussions)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Credits

- Icons designed using modern UI principles
- Community feedback and contributions

## 🌟 Star History

If you find this extension helpful, please consider giving it a star on GitHub!

---

**Made with ❤️ for the YouTube community**
