---
title: "Testing Third-Party Scripts"
description: "Test third-party scripts in CI and locally without slowing down development"
---

Third-party scripts break. Catch issues before production.

## Mock Scripts

```ts
// __mocks__/analytics.ts
export const mockAnalytics = {
  event: vi.fn(),
  pageview: vi.fn()
}

// tests/analytics.test.ts
const analytics = useScript('analytics.js', {
  use: () => mockAnalytics
})

test('tracks page view', () => {
  analytics.proxy.pageview()
  expect(mockAnalytics.pageview).toHaveBeenCalled()
})
```

## Test Load Failures

```ts
test('handles network error', async () => {
  // Mock fetch to fail
  global.fetch = vi.fn(() => 
    Promise.reject(new Error('Failed to load'))
  )

  const script = useScript('widget.js')
  
  expect(script.status).toBe('error')
  expect(console.error).toHaveBeenCalled()
})
```

## Local Development

Use local versions in development:

```ts
const isProd = process.env.NODE_ENV === 'production'

useScript(
  isProd 
    ? 'https://cdn.analytics.com/script.js'
    : '/mocks/analytics.js'
)
```

## CI Pipeline

```yaml
name: Test Scripts
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Mock third-party domains
        run: |
          echo "127.0.0.1 cdn.analytics.com" >> /etc/hosts
      - name: Run tests
        run: pnpm test
```

## External Resources

- [Vitest Mocking](https://vitest.dev/guide/mocking.html)
- [Testing Third Party Scripts](https://web.dev/articles/test-third-party)
- [CI Script Testing](https://playwright.dev/docs/ci)

## Next Steps

- [Monitor Performance →](/unhead/scripts/performance-monitoring)
- [Handle Errors →](/unhead/scripts/load-failures)
- [Privacy Settings →](/unhead/scripts/respecting-privacy)
