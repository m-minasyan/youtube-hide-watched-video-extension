#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🧪 Running Extension Tests..."
echo "================================"

ERRORS=0
WARNINGS=0

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
check_js_syntax "hidden-videos.js"

echo ""
echo "🔍 Checking CSS syntax..."

if [ -f "popup.css" ]; then
    if ! grep -E '(^[^}]*$|{[^}]*$)' popup.css | grep -q ';;' ; then
        echo "✅ popup.css appears valid"
    else
        echo "⚠️  popup.css may contain issues (manual review recommended)"
        ((WARNINGS++))
    fi
fi

if [ -f "hidden-videos.css" ]; then
    if ! grep -E '(^[^}]*$|{[^}]*$)' hidden-videos.css | grep -q ';;' ; then
        echo "✅ hidden-videos.css appears valid"
    else
        echo "⚠️  hidden-videos.css may contain issues (manual review recommended)"
        ((WARNINGS++))
    fi
fi

echo ""
echo "🔍 Checking HTML structure..."

check_html_structure() {
    local file=$1
    if [ -f "$file" ]; then
        if grep -q '<!DOCTYPE html>' "$file" && \
           grep -q '<html' "$file" && \
           grep -q '</html>' "$file"; then
            echo "✅ $file has valid structure"
        else
            echo "❌ $file missing basic HTML structure"
            ((ERRORS++))
        fi
    fi
}

check_html_structure "popup.html"
check_html_structure "hidden-videos.html"

echo ""
echo "🧪 Running Unit Tests..."
echo "------------------------"

if [ -f "package.json" ] && command -v npm &> /dev/null; then
    echo "Installing test dependencies..."
    npm install --silent 2>/dev/null || {
        echo "⚠️  Failed to install dependencies. Running tests anyway..."
        ((WARNINGS++))
    }
    
    echo "Running Jest tests..."
    if npm test 2>&1; then
        echo "✅ All unit tests passed!"
    else
        echo "❌ Unit tests failed!"
        ((ERRORS++))
    fi
else
    echo "⚠️  Jest not configured or npm not available. Skipping unit tests."
    ((WARNINGS++))
fi

echo ""
echo "================================"

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo "✨ All tests passed!"
    else
        echo "✅ Tests passed with $WARNINGS warning(s)"
    fi
    echo ""
    echo "📦 Ready to build extension package:"
    echo "   Run: ./scripts/build-extension.sh"
    exit 0
else
    echo "❌ Tests failed with $ERRORS error(s) and $WARNINGS warning(s)"
    echo ""
    echo "Please fix the errors above before building."
    exit 1
fi
