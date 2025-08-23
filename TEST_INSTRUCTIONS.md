# Test Instructions for Eye Button Feature

## How to Load the Extension in Chrome

1. Open Chrome browser
2. Go to `chrome://extensions/`
3. Enable "Developer mode" toggle in the top right
4. Click "Load unpacked" button
5. Select the folder: `/Users/kuberstar/Documents/GitHub/youtube-hide-watched-video-extension`
6. The extension should now be loaded

## How to Test Eye Buttons

1. **Go to YouTube.com main page** (not a specific video)
2. **Open Developer Console** (Right-click → Inspect → Console tab)
3. You should see debug messages starting with `[YT-HWV]`
4. Look for messages like:
   - `[YT-HWV] Found video containers: X`
   - `[YT-HWV] Added eye button to video: videoId`

## Debug Mode Features

Since DEBUG is enabled, you will see:
- A red "Add Eye Buttons" button in the bottom-right corner
- Click it to manually trigger eye button creation
- Console logs showing what's happening

## Where Eye Buttons Should Appear

Eye buttons appear on video thumbnails in:
- YouTube homepage
- Subscriptions page
- Search results
- Channel video lists
- Sidebar recommendations

**NOT on the video player itself!**

## What the Eye Button Does

1. Click once: Video becomes dimmed (orange eye)
2. Click again: Returns to normal (white eye)

You can change the mode between Dimmed/Hidden in the extension popup settings.

## Troubleshooting

If you don't see eye buttons:
1. Click the red "Add Eye Buttons" debug button
2. Check console for error messages
3. Try refreshing the page
4. Make sure you're on a page with video thumbnails

## Check Hidden Videos Page

1. Click the extension icon in Chrome toolbar
2. Click "View Hidden Videos" button
3. This opens a page showing all videos you've hidden