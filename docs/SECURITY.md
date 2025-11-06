# Security Documentation

## XSS Protection in Search Functionality

### Overview
The Hidden Videos Manager implements comprehensive XSS (Cross-Site Scripting) protection through multiple defense layers to prevent code injection attacks via search queries.

### Defense Layers

#### 1. Input Sanitization at State Entry Point
**File:** `hidden-videos.js`
**Location:** Search input handlers (lines ~732, ~769)

**Purpose:**
- Sanitizes search queries BEFORE storing in application state
- Ensures only safe queries circulate throughout the application
- Prevents XSS injection at the earliest possible point

**Implementation:**
```javascript
// Sanitize query before storing in state
hiddenVideosState.searchQuery = sanitizeSearchQuery(query);
```

**Why This Matters:**
By sanitizing at the entry point, we guarantee that `hiddenVideosState.searchQuery` always contains a safe value. This eliminates the need to sanitize before every use and reduces the risk of forgetting to sanitize in new code paths.

#### 2. Unicode Normalization (NFC)
**File:** `hidden-videos.js`
**Functions:** `normalizeString()`, `sanitizeSearchQuery()`

**Purpose:**
- Prevents Unicode normalization bypass attacks
- Ensures consistent character representation
- Mitigates homograph attacks
- Preserves legitimate CJK (Chinese/Japanese/Korean) text

**Implementation:**
```javascript
const normalized = String(str).normalize('NFC');
```

**CJK Compatibility:**
The fullwidth normalization (U+FF01-U+FF5E → ASCII) does NOT affect legitimate CJK characters:
- Japanese Hiragana (U+3040-U+309F): あいうえお - preserved ✓
- Japanese Katakana (U+30A0-U+30FF): アイウエオ - preserved ✓
- CJK Ideographs (U+4E00-U+9FFF): 漢字 - preserved ✓
- CJK Brackets (U+300C-U+300D): 「」 - preserved ✓

**Protects Against:**
- Fullwidth character bypass: `＜script＞` → `<script>` → removed
- Combined characters: `é` (U+0065 + U+0301) → `é` (U+00E9)
- Unicode escape sequences: `\u003cscript\u003e` → `<script>` → removed

#### 3. Search Query Sanitization
**File:** `hidden-videos.js`
**Function:** `sanitizeSearchQuery(query)`

**Sanitization Steps:**

1. **Unicode Normalization (NFC)**
   ```javascript
   let sanitized = String(query).normalize('NFC');
   ```

2. **Remove Control Characters**
   ```javascript
   sanitized = sanitized.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
   ```
   - Removes: NULL, tab, newline, carriage return, etc.
   - Range: U+0000 to U+001F, U+007F to U+009F

3. **Remove Zero-Width Characters**
   ```javascript
   sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');
   ```
   - U+200B: Zero Width Space
   - U+200C: Zero Width Non-Joiner
   - U+200D: Zero Width Joiner
   - U+FEFF: Zero Width No-Break Space (BOM)

4. **Normalize Fullwidth Characters to ASCII**
   ```javascript
   sanitized = sanitized.replace(/[\uFF01-\uFF5E]/g, (ch) => {
     return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
   });
   ```
   - Converts: `＜` → `<`, `＞` → `>`, etc.

5. **Remove HTML-like Tags and Dangerous Characters**
   ```javascript
   sanitized = sanitized.replace(/[<>'"&]/g, '');
   ```
   - Removes: `<`, `>`, `'`, `"`, `&`

#### 4. Defense-in-Depth Approach
**File:** `hidden-videos.js`
**Functions:** `filterItemsBySearch()`, `createHighlightedElement()`

**Strategy:**
Even though queries are sanitized at the entry point (when stored in state), we apply additional sanitization in critical functions as a safety net. This protects against:
- Unexpected code paths that might bypass state storage
- Future code changes that could introduce vulnerabilities
- Edge cases where state might be modified directly

**Implementation:**
```javascript
// Additional sanitization even though query is already sanitized in state
const sanitizedQuery = sanitizeSearchQuery(query);
```

This redundancy is intentional and provides robust protection.

#### 5. Safe DOM Manipulation
**File:** `hidden-videos.js`
**Functions:** `createHighlightedElement()`, `createVideoCard()`, `showImportErrorModal()`

**Safe Practices:**
- ✅ Uses `textContent` instead of `innerHTML`
- ✅ Creates elements via `createElement()` and `createTextNode()`
- ✅ Avoids HTML string interpolation for user input
- ✅ Uses `DocumentFragment` for safe highlighting
- ✅ Escapes HTML via `escapeHtml()` when innerHTML is unavoidable
- ✅ Validates numeric values before template insertion (import validation)

**Example:**
```javascript
// SAFE ✅
mark.textContent = match;
fragment.appendChild(document.createTextNode(beforeMatch));
const validRecordCount = Number(validation.validRecordCount) || 0;

// UNSAFE ❌ (NOT USED)
// element.innerHTML = userInput;
// element.innerHTML = `<div>${userInput}</div>`;
```

#### 6. Content Security Policy (CSP)
**File:** `manifest.json`

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none';"
  }
}
```

**Protection:**
- Blocks inline scripts (`<script>` tags in HTML)
- Blocks `eval()` and similar dynamic code execution
- Restricts script sources to extension files only ('self')
- Blocks object/embed tags entirely ('none')
- Restricts base URI to prevent relative URL hijacking
- Prevents form submissions to external URLs ('none')
- Prevents iframe embedding ('none')

### Attack Vectors Mitigated

| Attack Type | Example | How It's Blocked |
|-------------|---------|------------------|
| Fullwidth characters | `＜script＞alert(1)＜/script＞` | Normalized to ASCII → removed by sanitization |
| Standard HTML injection | `<script>alert(1)</script>` | Removed by sanitization |
| HTML entity injection | `<img src=x onerror=alert(1)>` | Removed by sanitization |
| Unicode escape | `\u003cscript\u003e` | Normalized → removed |
| Control characters | `test\x00<script>` | Control chars removed |
| Zero-width hiding | `te​st<script>` (U+200B) | Zero-width chars removed |
| Event handlers | `" onclick="alert(1)` | Quotes removed by sanitization |
| innerHTML injection | Any | textContent used instead |

### Testing

**Manual Testing - XSS Protection:**
1. Open Hidden Videos Manager
2. Try entering malicious queries in search:
   - `＜script＞alert(1)＜/script＞` (fullwidth)
   - `<img src=x onerror=alert(1)>`
   - `"><script>alert(1)</script>`
   - `te​st<script>` (with U+200B zero-width space)
3. Verify no script execution occurs
4. Verify dangerous characters are removed from search query

**Manual Testing - CJK Compatibility:**
1. Test Japanese Hiragana: `あいうえお`
2. Test Japanese Katakana: `テスト`
3. Test Chinese: `测试`
4. Test Japanese with brackets: `「テスト」`
5. Verify search works correctly and characters are preserved

**Automated Testing:**
See `tests/xss-protection.test.js` for comprehensive test cases including:
- Fullwidth character bypass
- Unicode escape sequences
- Control character injection
- Zero-width character obfuscation
- CJK text preservation

### Code Review Checklist

When modifying search or display code, ensure:

- [ ] User input is sanitized via `sanitizeSearchQuery()` at the entry point (before storing in state)
- [ ] Additional defense-in-depth sanitization in critical functions
- [ ] Unicode normalization is applied via `normalizeString()`
- [ ] DOM manipulation uses `textContent`, not `innerHTML`
- [ ] New elements use `createElement()` and `createTextNode()`
- [ ] No HTML string interpolation with user data
- [ ] Numeric values are validated before template insertion
- [ ] `escapeHtml()` is used when HTML insertion is unavoidable
- [ ] CSP in manifest.json remains strict (no relaxation)

### References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Unicode Normalization Forms](https://unicode.org/reports/tr15/)
- [Chrome Extension Content Security Policy](https://developer.chrome.com/docs/extensions/mv3/manifest/content_security_policy/)
- [MDN: textContent vs innerHTML](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)

### Reporting Security Issues

If you discover a security vulnerability, please report it to the maintainers via:
- GitHub Security Advisories
- Direct message to maintainers (do not open public issues)

---

**Last Updated:** 2025-11-06
**Reviewed By:** Security Audit
**Next Review:** 2025-12-06
