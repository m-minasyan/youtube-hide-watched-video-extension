#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_ROOT/build"
DIST_DIR="$PROJECT_ROOT/dist"
EXTENSION_NAME="youtube-hide-watched-video-extension"

echo "🚀 Building Chrome Extension Package..."
echo "================================"

cd "$PROJECT_ROOT" || exit 1

rm -rf "$BUILD_DIR" "$DIST_DIR"
mkdir -p "$BUILD_DIR" "$DIST_DIR"

echo "📋 Copying extension files..."

cp manifest.json "$BUILD_DIR/"
cp background.js "$BUILD_DIR/"
cp content.js "$BUILD_DIR/"
cp popup.html "$BUILD_DIR/"
cp popup.js "$BUILD_DIR/"
cp popup.css "$BUILD_DIR/"

# Include Hidden Videos Manager page files
cp hidden-videos.html "$BUILD_DIR/"
cp hidden-videos.js "$BUILD_DIR/"
cp hidden-videos.css "$BUILD_DIR/"

cp -r icons "$BUILD_DIR/"

echo "✅ Files copied successfully"

cd "$BUILD_DIR" || exit 1

VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": *"\([^"]*\)".*/\1/')
ZIP_NAME="${EXTENSION_NAME}-v${VERSION}.zip"

echo "📦 Creating ZIP archive: $ZIP_NAME"

zip -r "../dist/$ZIP_NAME" . -x "*.DS_Store" "*/.*" > /dev/null

cd "$PROJECT_ROOT" || exit 1

echo "🧹 Cleaning up build directory..."
rm -rf "$BUILD_DIR"

echo ""
echo "✨ Build complete!"
echo "================================"
echo "📍 Extension package location:"
echo "   $DIST_DIR/$ZIP_NAME"
echo ""
echo "📝 To upload to Chrome Web Store:"
echo "   1. Go to https://chrome.google.com/webstore/developer/dashboard"
echo "   2. Click 'New Item' or update existing item"
echo "   3. Upload the ZIP file: $ZIP_NAME"
echo "   4. Fill in the store listing details"
echo "   5. Submit for review"
echo ""
echo "🎯 File size: $(du -h "$DIST_DIR/$ZIP_NAME" | cut -f1)"
