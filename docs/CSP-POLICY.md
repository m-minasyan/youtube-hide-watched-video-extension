# Content Security Policy (CSP) Documentation

## Overview

This document explains the Content Security Policy configured in `manifest.json` and the rationale behind each directive.

## Current CSP Configuration

```json
"content_security_policy": {
  "extension_pages": "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests;"
}
```

## Directive Explanations

### `default-src 'self'`
**Purpose:** Restricts all resource types to same-origin by default
**Security:** Prevents loading resources from external domains
**Impact:** High security baseline

### `script-src 'self'`
**Purpose:** Only allows scripts from the extension itself
**Security:** Blocks inline scripts and eval(), preventing XSS attacks
**Impact:** Critical security control - no exceptions allowed

### `object-src 'none'`
**Purpose:** Blocks all `<object>`, `<embed>`, and `<applet>` elements
**Security:** Prevents Flash and plugin-based exploits
**Impact:** High security - no legacy plugin support needed

### `base-uri 'self'`
**Purpose:** Restricts `<base>` tag to same-origin
**Security:** Prevents base tag hijacking that could redirect relative URLs
**Impact:** Prevents URL manipulation attacks

### `form-action 'none'`
**Purpose:** Blocks all form submissions
**Security:** Extension doesn't use forms, so blocking prevents accidental data leakage
**Impact:** No functional impact, adds defense in depth

### `frame-ancestors 'none'`
**Purpose:** Prevents extension pages from being embedded in iframes
**Security:** Protects against clickjacking attacks
**Impact:** Extension pages can't be framed

### `style-src 'self' 'unsafe-inline'` ⚠️
**Purpose:** Allows stylesheets from extension and inline styles
**Security:** `'unsafe-inline'` is a potential XSS vector if misused
**Rationale:** Required for dynamic theming and user preference styling
**Mitigation:** See "Why 'unsafe-inline' is Safe in This Extension" below

### `upgrade-insecure-requests`
**Purpose:** Automatically upgrades HTTP requests to HTTPS
**Security:** Prevents mixed content and man-in-the-middle attacks
**Impact:** All requests use secure transport

---

## Why 'unsafe-inline' is Safe in This Extension

### ⚠️ Security Concern
`style-src 'self' 'unsafe-inline'` allows inline styles, which could be exploited for XSS if user-controlled data is inserted into HTML with style attributes.

### ✅ Mitigation Strategies

#### 1. Safe DOM Manipulation Practices
**All user-controlled content uses safe APIs:**

```javascript
// ✅ SAFE - Used throughout codebase
element.textContent = userInput;
element.setAttribute('data-value', userInput);
const text = document.createTextNode(userInput);

// ❌ NEVER USED - Explicitly avoided
element.innerHTML = userInput;
element.style = userInput;
```

**Evidence:**
- `hidden-videos.js`: All user data set via `textContent` or `createElement`
- `popup.js`: No innerHTML usage with user data
- Search highlighting: Uses `createElement('mark')` and `textContent`

#### 2. Input Sanitization
**All user input sanitized before rendering:**

```javascript
function sanitizeSearchQuery(query) {
  // Unicode normalization prevents bypass attacks
  let sanitized = String(query).normalize('NFC');

  // Remove control characters
  sanitized = sanitized.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  // Remove zero-width characters
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // Normalize fullwidth characters (prevents ＜script＞ bypass)
  sanitized = sanitized.replace(/[\uFF01-\uFF5E]/g, (ch) => {
    return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
  });

  // Remove HTML-like tags and dangerous characters
  sanitized = sanitized.replace(/[<>'"&]/g, '');

  return sanitized;
}
```

See `docs/SECURITY.md` for comprehensive XSS protection documentation.

#### 3. Why Inline Styles Are Needed

**Dynamic Theming:**
```javascript
// Theme switching requires dynamic style application
function applyTheme(theme) {
  document.body.style.setProperty('--bg-color', theme.bgColor);
  document.body.style.setProperty('--text-color', theme.textColor);
}
```

**User Preferences:**
```javascript
// User-controlled visibility settings
if (settings.hideWatched) {
  container.style.display = 'none';
}
```

**Performance Optimization:**
```javascript
// Dynamic positioning faster than class switching
eyeButton.style.top = `${position.y}px`;
eyeButton.style.left = `${position.x}px`;
```

#### 4. Code Review Requirements

**Developers must follow these rules:**
- ✅ Always use `textContent` for user data
- ✅ Always use `createElement()` and `appendChild()` for dynamic content
- ✅ Always sanitize search queries and user input
- ❌ Never use `innerHTML` with variables
- ❌ Never use `style` attribute with user data
- ❌ Never use `eval()` or `Function()` constructors

**Automated Protection:**
- ESLint rule (recommended): `no-unsanitized/property` to prevent dangerous innerHTML usage
- Code review checklist in `docs/SECURITY.md`

---

## Attack Vectors Prevented

### ✅ Script Injection
- **Blocked by:** `script-src 'self'` - no inline scripts or eval() allowed
- **Impact:** XSS via `<script>` tags impossible

### ✅ Object/Embed Exploits
- **Blocked by:** `object-src 'none'` - no plugins allowed
- **Impact:** Flash and Java exploits impossible

### ✅ Base Tag Hijacking
- **Blocked by:** `base-uri 'self'` - base tag restricted
- **Impact:** Relative URL manipulation impossible

### ✅ Form Data Leakage
- **Blocked by:** `form-action 'none'` - no form submissions
- **Impact:** Accidental POST to external servers impossible

### ✅ Clickjacking
- **Blocked by:** `frame-ancestors 'none'` - no iframe embedding
- **Impact:** UI redressing attacks impossible

### ⚠️ Style Injection (Mitigated)
- **Allowed by:** `style-src 'self' 'unsafe-inline'`
- **Mitigated by:** Safe DOM practices, input sanitization, code review
- **Risk:** Low - exploitation requires innerHTML misuse (not present in codebase)

---

## Alternative Approaches Considered

### Option 1: Remove 'unsafe-inline' (Rejected)
**Pros:** Stronger CSP
**Cons:**
- Breaks dynamic theming
- Requires extensive refactoring (1000+ lines)
- Performance regression from class switching overhead
- No security benefit given safe coding practices

### Option 2: Use CSS-in-JS library (Rejected)
**Pros:** Programmatic style control
**Cons:**
- Adds 50KB+ dependency
- CSP still requires 'unsafe-inline' for most libraries
- Increased complexity
- Bundle size regression

### Option 3: Nonce-based CSP (Considered)
**Pros:** More granular control
**Cons:**
- Manifest V3 doesn't support nonces easily
- Requires server-side nonce generation (not applicable)
- Complexity without security benefit

---

## Monitoring and Maintenance

### Code Review Checklist
Before merging code that touches user input or DOM manipulation:
- [ ] Verify no `innerHTML` usage with variables
- [ ] Verify user input sanitized via `sanitizeSearchQuery()` or equivalent
- [ ] Verify dynamic content uses `createElement()` and `textContent`
- [ ] Verify no `style` attribute set with user data
- [ ] Run XSS test suite (`tests/xss-protection.test.js`)

### Recommended ESLint Rule
Add to `.eslintrc.json`:
```json
{
  "rules": {
    "no-unsanitized/property": "error",
    "no-unsanitized/method": "error"
  },
  "plugins": ["no-unsanitized"]
}
```

Install: `npm install --save-dev eslint-plugin-no-unsanitized`

---

## Security Audit History

| Date | Auditor | Findings | Status |
|------|---------|----------|--------|
| 2025-11-09 | Code Review | P2-1: Document CSP rationale | ✅ Documented |
| 2025-11-09 | Code Review | No XSS vulnerabilities found | ✅ Verified |
| 2025-11-09 | Code Review | Safe DOM practices verified | ✅ Confirmed |

---

## References

- [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [Chrome Extension Content Security Policy](https://developer.chrome.com/docs/extensions/mv3/manifest/content_security_policy/)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Google's CSP Evaluator](https://csp-evaluator.withgoogle.com/)

---

**Last Updated:** 2025-11-09
**Next Review:** 2026-01-09 (or before major DOM manipulation changes)
