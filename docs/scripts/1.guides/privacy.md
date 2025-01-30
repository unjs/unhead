---
title: "Respect User Privacy"
description: "Load third-party scripts without compromising user privacy"
---

Third-party scripts collect user data. Do it ethically.

## Privacy Defaults

```ts
useScript('tracker.js', {
  // No referrer data sent
  referrerpolicy: 'no-referrer',
  
  // No credentials sent
  crossorigin: 'anonymous',
  
  // Load after consent
  trigger: hasConsent
})
```

## Common Scripts

### Google Analytics

```ts
useScript('gtag.js', {
  beforeInit() {
    window.dataLayer = window.dataLayer || []
    window.gtag = function() { dataLayer.push(arguments) }
    gtag('consent', 'default', {
      'analytics_storage': 'denied',
      'ad_storage': 'denied'
    })
  }
})
```

### Marketing Tags

```ts
useScript('tags.js', {
  // Clear params from URL
  src: cleanUrl('https://tags.example.com/tag.js'),
  // Don't send document.referrer
  referrerpolicy: 'no-referrer',
  // Don't send cookies
  crossorigin: 'anonymous',
})
```

## Script Permissions

Check what scripts can access:

- `document.referrer`: Previous page URL
- `navigator.userAgent`: Browser info
- `window.localStorage`: Stored data
- `document.cookie`: Cookies
- `navigator.geolocation`: Location

## Privacy Tools Impact

Scripts often break with:

- uBlock Origin
- Privacy Badger
- DuckDuckGo App
- Brave Browser

Handle it gracefully:

```ts
const script = useScript('tracker.js')
  .catch(error => {
    if (error.name === 'SecurityError') {
      // Privacy tool blocked script
      disableTracking()
    }
  })
```

## External Resources

- [Browser Fingerprinting](https://www.w3.org/2001/tag/doc/unsanctioned-tracking/)
- [GDPR Compliance](https://gdpr.eu/cookies/)
- [Privacy by Design](https://web.dev/articles/cookie-notice-best-practices)

## Next Steps

- [Load Triggers →](/unhead/scripts/load-triggers)
- [Handle Errors →](/unhead/scripts/load-failures)
- [Use Proxy API →](/unhead/scripts/proxy-api)
