# YouTube Hide Watched Videos Extension

A Chrome extension that hides or dims watched videos and YouTube Shorts with customizable settings for different YouTube sections.

## Features

- **Hide/Dim Watched Videos**: Automatically hide or dim videos you've already watched
- **Hide/Dim YouTube Shorts**: Control visibility of Shorts across YouTube
- **Section-Specific Settings**: Different settings for:
  - Home page
  - Subscriptions
  - Channel pages
  - Watch page (sidebar)
  - Trending
  - Playlists
- **Adjustable Threshold**: Set the minimum watch percentage to consider a video as "watched"
- **Three Visibility Modes**:
  - Normal: Show all content
  - Dimmed: Make content semi-transparent
  - Hidden: Completely hide content
- **Clean UI**: Modern popup interface with easy-to-use controls
- **Persistent Settings**: All settings are saved and synced across devices

## Installation

### From Source (Developer Mode)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the extension directory

### From Chrome Web Store

(Coming soon)

## Usage

1. Click the extension icon in your Chrome toolbar
2. Adjust the watched percentage threshold using the slider
3. Choose visibility modes for watched videos and Shorts in different YouTube sections
4. Settings are applied immediately - refresh YouTube to see changes

## How It Works

The extension:
1. Detects videos with watch progress indicators on YouTube
2. Applies your chosen visibility setting (normal/dimmed/hidden) based on the YouTube section you're viewing
3. Identifies and controls YouTube Shorts containers
4. Updates dynamically as you browse YouTube without needing page refreshes

## Privacy

This extension:
- Does not collect any personal data
- Does not send data to external servers
- Only stores your preferences locally in Chrome's sync storage
- Only runs on YouTube domains

## Development

### Project Structure

```
├── manifest.json       # Extension configuration
├── popup.html         # Settings interface
├── popup.css          # Popup styling
├── popup.js           # Settings management
├── content.js         # YouTube page manipulation
├── background.js      # Extension initialization
└── icons/            # Extension icons
```

### Building from Source

No build process required - the extension runs directly from source files.

## License

MIT License

## Credits

Based on concepts from the original YouTube Hide Watched Videos userscript.

## Support

For issues, feature requests, or contributions, please visit the [GitHub repository](https://github.com/m-minasyan/youtube-hide-watched-video-extension).