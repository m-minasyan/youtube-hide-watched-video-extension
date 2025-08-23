#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🧪 Running Extension Tests..."
echo "================================"

ERRORS=0

cd "$PROJECT_ROOT" || exit 1

echo "📋 Checking required files..."

REQUIRED_FILES=(
    "manifest.json"
    "background.js"
    "content.js"
    "popup.html"
    "popup.js"
    "popup.css"
    "icons/icon16.png"
    "icons/icon32.png"
    "icons/icon48.png"
    "icons/icon128.png"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ Missing: $file"
        ((ERRORS++))
    fi
done

echo ""
echo "🔍 Validating manifest.json..."

if [ -f "manifest.json" ]; then
    if python3 -m json.tool manifest.json > /dev/null 2>&1; then
        echo "✅ manifest.json is valid JSON"
    else
        echo "❌ manifest.json contains invalid JSON"
        ((ERRORS++))
    fi
    
    if grep -q '"manifest_version": 3' manifest.json; then
        echo "✅ Using Manifest V3"
    else
        echo "❌ Not using Manifest V3"
        ((ERRORS++))
    fi
    
    if grep -q '"version"' manifest.json; then
        VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": *"\([^"]*\)".*/\1/')
        echo "✅ Version found: $VERSION"
    else
        echo "❌ No version specified in manifest"
        ((ERRORS++))
    fi
fi

echo ""
echo "🔍 Checking JavaScript syntax..."

check_js_syntax() {
    local file=$1
    if [ -f "$file" ]; then
        if node -c "$file" 2>/dev/null; then
            echo "✅ $file syntax is valid"
        else
            echo "❌ $file has syntax errors"
            ((ERRORS++))
        fi
    fi
}

check_js_syntax "background.js"
check_js_syntax "content.js"
check_js_syntax "popup.js"

echo ""
echo "🔍 Checking CSS syntax..."

if [ -f "popup.css" ]; then
    if ! grep -E '(^[^}]*$|{[^}]*$)' popup.css | grep -q ';;' ; then
        echo "✅ popup.css appears valid"
    else
        echo "⚠️  popup.css may contain issues (manual review recommended)"
    fi
fi

echo ""
echo "🔍 Checking HTML structure..."

if [ -f "popup.html" ]; then
    if grep -q '<!DOCTYPE html>' popup.html && \
       grep -q '<html' popup.html && \
       grep -q '</html>' popup.html; then
        echo "✅ popup.html has valid structure"
    else
        echo "❌ popup.html missing basic HTML structure"
        ((ERRORS++))
    fi
fi

echo ""
echo "================================"

if [ $ERRORS -eq 0 ]; then
    echo "✨ All tests passed!"
    echo ""
    echo "📦 Ready to build extension package:"
    echo "   Run: ./scripts/build-extension.sh"
    exit 0
else
    echo "❌ Tests failed with $ERRORS error(s)"
    echo ""
    echo "Please fix the errors above before building."
    exit 1
fi