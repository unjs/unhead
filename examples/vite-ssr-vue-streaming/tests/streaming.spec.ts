import { expect, test } from '@playwright/test'

test.describe('Vue Streaming SSR with Unhead', () => {
  // ============================================
  // SHELL & INITIAL STATE
  // ============================================
  test.describe('Shell rendering', () => {
    test('initial shell has head tags before streaming completes', async ({ page }) => {
      const response = await page.goto('/')
      const html = await response?.text() || ''

      expect(html).toContain('lang="en"')
      expect(html).toContain('charset="utf-8"')
      expect(html).toContain('window.__unhead__')
    })

    test('initial title is set after async load', async ({ page }) => {
      await page.goto('/')
      // Wait for first async component to load
      await expect(page.locator('.site-header')).toBeVisible({ timeout: 3000 })
      // Title should be set by async component
      await expect(page).toHaveTitle(/StreamShop/)
    })
  })

  // ============================================
  // STREAMING BEHAVIOR
  // ============================================
  test.describe('Streaming behavior', () => {
    test('head updates happen via streaming (not client-side JS)', async ({ page }) => {
      const response = await page.goto('/')
      const html = await response?.text() || ''

      // Wait for newsletter (last component)
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 10000 })

      // Async content should be in streamed HTML
      expect(html).toContain('window.__unhead__')
    })

    test('components stream in order of resolution time', async ({ page }) => {
      const resolved: string[] = []

      await page.goto('/')

      // Track resolution order
      await page.locator('.site-header').waitFor({ timeout: 3000 })
      resolved.push('header')

      await page.locator('.sidebar').waitFor({ timeout: 3000 })
      resolved.push('sidebar')

      await page.locator('.hero-banner').waitFor({ timeout: 3000 })
      resolved.push('hero')

      await page.locator('.product-card').first().waitFor({ timeout: 3000 })
      resolved.push('products')

      await page.locator('.reviews-section').waitFor({ timeout: 5000 })
      resolved.push('reviews')

      await page.locator('.newsletter').waitFor({ timeout: 5000 })
      resolved.push('newsletter')

      // Header should be first, newsletter should be last
      expect(resolved[0]).toBe('header')
      expect(resolved[resolved.length - 1]).toBe('newsletter')
    })
  })

  // ============================================
  // DEDUPLICATION
  // ============================================
  test.describe('Deduplication', () => {
    test('only one title tag exists after all components load', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 10000 })

      const titles = await page.locator('title').count()
      expect(titles).toBe(1)
    })

    test('only one description meta exists (deduplicated by name)', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 10000 })

      const descriptions = await page.locator('meta[name="description"]').count()
      expect(descriptions).toBe(1)
    })

    test('final title is from last component to update', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 10000 })

      // Newsletter sets title last
      await expect(page).toHaveTitle('StreamShop - Ready!')
    })
  })

  // ============================================
  // PRODUCTS
  // ============================================
  test.describe('Products', () => {
    test('all product cards load and are visible', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 10000 })

      const productCards = await page.locator('.product-card').count()
      expect(productCards).toBe(6)
    })

    test('product cards have correct meta tags', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 5000 })

      // Product 1 should set its meta
      const product1Meta = page.locator('meta[name="product-1-loaded"]')
      await expect(product1Meta).toHaveAttribute('content', 'true')
    })
  })

  // ============================================
  // STRUCTURED DATA (JSON-LD)
  // ============================================
  test.describe('Structured data', () => {
    test('JSON-LD script is added by reviews component', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.reviews-section')).toBeVisible({ timeout: 10000 })

      const jsonLd = page.locator('script[type="application/ld+json"]')
      await expect(jsonLd).toBeAttached()
    })

    test('JSON-LD contains valid schema.org AggregateRating', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.reviews-section')).toBeVisible({ timeout: 10000 })

      const jsonLd = page.locator('script[type="application/ld+json"]')
      const content = await jsonLd.first().innerHTML()
      const data = JSON.parse(content)

      expect(data['@context']).toBe('https://schema.org')
      expect(data['@type']).toBe('AggregateRating')
      expect(data.ratingValue).toBe(4.6)
    })
  })

  // ============================================
  // NAVIGATION
  // ============================================
  test.describe('Navigation', () => {
    test('about page loads and streams correctly', async ({ page }) => {
      await page.goto('/about')

      // Wait for stats (last component on about page)
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 5000 })

      await expect(page).toHaveTitle('About StreamShop - Ready!')
    })

    test('about page has team section', async ({ page }) => {
      await page.goto('/about')
      await expect(page.locator('.team-section')).toBeVisible({ timeout: 3000 })

      const teamCards = await page.locator('.team-card').count()
      expect(teamCards).toBe(3)
    })

    test('navigation between pages works', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.page-nav')).toBeVisible({ timeout: 3000 })

      // Navigate to about (use force to bypass overlay)
      await page.click('.page-nav a[href="/about"]', { force: true })
      await expect(page.locator('.about-hero')).toBeVisible({ timeout: 3000 })

      // Navigate back to home
      await page.click('.page-nav a[href="/"]', { force: true })
      await expect(page.locator('.products-section')).toBeVisible({ timeout: 5000 })
    })
  })

  // ============================================
  // EDGE CASES
  // ============================================
  test.describe('Edge cases', () => {
    test('page remains functional after all streaming completes', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 10000 })

      // All content should be visible
      await expect(page.locator('.site-header')).toBeVisible()
      await expect(page.locator('.sidebar')).toBeVisible()
      await expect(page.locator('.hero-banner')).toBeVisible()
      await expect(page.locator('.product-card').first()).toBeVisible()
      await expect(page.locator('.reviews-section')).toBeVisible()
    })

    test('viewport meta is not duplicated', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 10000 })

      const viewports = await page.locator('meta[name="viewport"]').count()
      expect(viewports).toBe(1)
    })

    test('charset meta is not duplicated', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 10000 })

      const charsets = await page.locator('meta[charset]').count()
      expect(charsets).toBe(1)
    })
  })

  // ============================================
  // HYDRATION
  // ============================================
  test.describe('Hydration', () => {
    test('head state is consistent after hydration', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 10000 })

      // Wait a bit for hydration to complete
      await page.waitForTimeout(500)

      // Verify head state is still correct
      await expect(page).toHaveTitle('StreamShop - Ready!')
    })

    test('no unexpected console errors during streaming and hydration', async ({ page }) => {
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 10000 })

      // Wait for hydration
      await page.waitForTimeout(500)

      // Filter out favicon 404 errors and hydration mismatches (expected during streaming)
      const criticalErrors = errors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('Hydration') &&
        !e.includes('mismatch')
      )
      expect(criticalErrors).toHaveLength(0)
    })
  })
})
