# Build Scripts

## build-extension.sh

Creates a packaged ZIP file ready for submission to the Chrome Web Store.

### Usage

```bash
./scripts/build-extension.sh
```

### What it does

1. Creates a clean build directory
2. Copies all necessary extension files:
   - manifest.json
   - background.js
   - content.js
   - popup files (HTML, JS, CSS)
   - icons directory
3. Creates a versioned ZIP archive in the `dist/` directory
4. Cleans up temporary build files

### Output

The script generates a ZIP file in the `dist/` directory with the naming format:
```
youtube-hide-watched-video-extension-v{VERSION}.zip
```

Where `{VERSION}` is extracted from the manifest.json file.

### Chrome Web Store Submission

After running the build script:

1. Navigate to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
2. Click "New Item" for first submission or "Edit" for updates
3. Upload the generated ZIP file from the `dist/` directory
4. Complete the store listing information:
   - Extension description
   - Screenshots
   - Categories
   - Pricing (free)
5. Submit for review

### Requirements

- Bash shell
- zip command-line utility (pre-installed on macOS and most Linux distributions)

### File Size Limits

Chrome Web Store has a maximum file size limit of 100MB for extensions. Our extension is typically under 50KB.