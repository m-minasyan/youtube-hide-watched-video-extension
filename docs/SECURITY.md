# Security Documentation

## XSS Protection in Search Functionality

### Overview
The Hidden Videos Manager implements comprehensive XSS (Cross-Site Scripting) protection through multiple defense layers to prevent code injection attacks via search queries.

### Defense Layers

#### 1. Unicode Normalization (NFC)
**File:** `hidden-videos.js`
**Functions:** `normalizeString()`, `sanitizeSearchQuery()`

**Purpose:**
- Prevents Unicode normalization bypass attacks
- Ensures consistent character representation
- Mitigates homograph attacks

**Implementation:**
```javascript
const normalized = String(str).normalize('NFC');
```

**Protects Against:**
- Fullwidth character bypass: `＜script＞` → `<script>` → removed
- Combined characters: `é` (U+0065 + U+0301) → `é` (U+00E9)
- Unicode escape sequences: `\u003cscript\u003e` → `<script>` → removed

#### 2. Search Query Sanitization
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

#### 3. Safe DOM Manipulation
**File:** `hidden-videos.js`
**Functions:** `createHighlightedElement()`, `createVideoCard()`

**Safe Practices:**
- ✅ Uses `textContent` instead of `innerHTML`
- ✅ Creates elements via `createElement()` and `createTextNode()`
- ✅ Avoids HTML string interpolation for user input
- ✅ Uses `DocumentFragment` for safe highlighting
- ✅ Escapes HTML via `escapeHtml()` when necessary

**Example:**
```javascript
// SAFE ✅
mark.textContent = match;
fragment.appendChild(document.createTextNode(beforeMatch));

// UNSAFE ❌ (NOT USED)
// element.innerHTML = userInput;
// element.innerHTML = `<div>${userInput}</div>`;
```

#### 4. Content Security Policy (CSP)
**File:** `manifest.json`

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; base-uri 'self';"
  }
}
```

**Protection:**
- Blocks inline scripts (`<script>` tags in HTML)
- Blocks `eval()` and similar dynamic code execution
- Restricts script sources to extension files only ('self')
- Prevents object/embed tags
- Restricts base URI to prevent relative URL hijacking

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

**Manual Testing:**
1. Open Hidden Videos Manager
2. Try entering malicious queries in search:
   - `＜script＞alert(1)＜/script＞`
   - `<img src=x onerror=alert(1)>`
   - `"><script>alert(1)</script>`
3. Verify no script execution occurs
4. Verify search still works for legitimate queries

**Automated Testing:**
See `tests/xss-protection.test.js` for test cases.

### Code Review Checklist

When modifying search or display code, ensure:

- [ ] User input is sanitized via `sanitizeSearchQuery()` before use
- [ ] Unicode normalization is applied via `normalizeString()`
- [ ] DOM manipulation uses `textContent`, not `innerHTML`
- [ ] New elements use `createElement()` and `createTextNode()`
- [ ] No HTML string interpolation with user data
- [ ] `escapeHtml()` is used when HTML insertion is unavoidable
- [ ] CSP in manifest.json remains strict

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
