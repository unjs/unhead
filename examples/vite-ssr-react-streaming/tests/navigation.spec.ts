import { expect, test } from '@playwright/test'

test.describe('Page Navigation with Head Tags', () => {
  // Track console errors across tests
  let consoleErrors: string[] = []
  let consoleWarnings: string[] = []

  test.beforeEach(async ({ page }) => {
    consoleErrors = []
    consoleWarnings = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
      if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text())
      }
    })

    page.on('pageerror', (error) => {
      consoleErrors.push(error.message)
    })
  })

  // ============================================
  // HOME PAGE INITIAL LOAD
  // ============================================
  test.describe('Home page initial load', () => {
    test('has correct initial head tags', async ({ page }) => {
      await page.goto('/')

      // Wait for streaming to complete
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      await expect(page).toHaveTitle(/StreamShop/)
      await expect(page.locator('meta[name="page-id"]')).toHaveAttribute('content', 'home')
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://example.com/')
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    })

    test('progress bar disappears after load', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      // Progress bar should be hidden
      const progressBar = page.locator('.stream-progress')
      await expect(progressBar).toHaveCSS('opacity', '0')
    })

    test('no console errors during streaming', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      // Filter known non-critical errors
      const criticalErrors = consoleErrors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('DevTools')
      )
      expect(criticalErrors).toHaveLength(0)
    })
  })

  // ============================================
  // ABOUT PAGE INITIAL LOAD
  // ============================================
  test.describe('About page initial load', () => {
    test('has correct initial head tags', async ({ page }) => {
      await page.goto('/about')

      // Wait for streaming to complete
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      await expect(page).toHaveTitle(/About StreamShop/)
      await expect(page.locator('meta[name="page-id"]')).toHaveAttribute('content', 'about')
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://example.com/about')
      await expect(page.locator('html')).toHaveAttribute('data-page', 'about')
    })

    test('has Organization JSON-LD', async ({ page }) => {
      await page.goto('/about')
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      const jsonLd = page.locator('script[type="application/ld+json"]')
      await expect(jsonLd).toBeAttached()

      const content = await jsonLd.innerHTML()
      const data = JSON.parse(content)
      expect(data['@type']).toBe('Organization')
      expect(data.name).toBe('StreamShop')
    })

    test('no console errors during streaming', async ({ page }) => {
      await page.goto('/about')
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      const criticalErrors = consoleErrors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('DevTools')
      )
      expect(criticalErrors).toHaveLength(0)
    })
  })

  // ============================================
  // CLIENT-SIDE NAVIGATION: HOME -> ABOUT
  // ============================================
  test.describe('Navigation: Home -> About', () => {
    test('updates title correctly', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      // Navigate to about
      await page.click('a[href="/about"]')
      await expect(page.locator('.about-hero')).toBeVisible({ timeout: 5000 })

      // Wait for about page streaming
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      await expect(page).toHaveTitle(/About StreamShop/)
    })

    test('updates page-id meta', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      // Verify home page-id
      await expect(page.locator('meta[name="page-id"]')).toHaveAttribute('content', 'home')

      // Navigate to about
      await page.click('a[href="/about"]')
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      // Verify about page-id
      await expect(page.locator('meta[name="page-id"]')).toHaveAttribute('content', 'about')
    })

    test('updates canonical link', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://example.com/')

      await page.click('a[href="/about"]')
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://example.com/about')
    })

    test('adds data-page attribute to html', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      // Home page should not have data-page
      await expect(page.locator('html')).not.toHaveAttribute('data-page')

      await page.click('a[href="/about"]')
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      // About page should have data-page="about"
      await expect(page.locator('html')).toHaveAttribute('data-page', 'about')
    })

    test('removes home-specific meta and adds about-specific meta', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      // Home should have newsletter-status
      await expect(page.locator('meta[name="newsletter-status"]')).toHaveAttribute('content', 'loaded')

      await page.click('a[href="/about"]')
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      // About should have stats-loaded and team-loaded
      await expect(page.locator('meta[name="stats-loaded"]')).toHaveAttribute('content', 'true')
      await expect(page.locator('meta[name="team-loaded"]')).toHaveAttribute('content', 'true')
    })

    test('no console errors during navigation', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      await page.click('a[href="/about"]')
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      const criticalErrors = consoleErrors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('DevTools')
      )
      expect(criticalErrors).toHaveLength(0)
    })
  })

  // ============================================
  // CLIENT-SIDE NAVIGATION: ABOUT -> HOME
  // ============================================
  test.describe('Navigation: About -> Home', () => {
    test('updates title correctly', async ({ page }) => {
      await page.goto('/about')
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      await expect(page).toHaveTitle(/About StreamShop/)

      // Navigate to home
      await page.click('a[href="/"]')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      await expect(page).toHaveTitle(/StreamShop - Ready!/)
    })

    test('updates page-id meta', async ({ page }) => {
      await page.goto('/about')
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      await expect(page.locator('meta[name="page-id"]')).toHaveAttribute('content', 'about')

      await page.click('a[href="/"]')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      await expect(page.locator('meta[name="page-id"]')).toHaveAttribute('content', 'home')
    })

    test('removes data-page attribute from html', async ({ page }) => {
      await page.goto('/about')
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      await expect(page.locator('html')).toHaveAttribute('data-page', 'about')

      await page.click('a[href="/"]')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      // Home page should not have data-page
      await expect(page.locator('html')).not.toHaveAttribute('data-page')
    })

    test('swaps JSON-LD scripts', async ({ page }) => {
      await page.goto('/about')
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      // About has Organization
      let jsonLd = page.locator('script[type="application/ld+json"]')
      let content = await jsonLd.innerHTML()
      expect(JSON.parse(content)['@type']).toBe('Organization')

      await page.click('a[href="/"]')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      // Home has AggregateRating (from Reviews component)
      jsonLd = page.locator('script[type="application/ld+json"]')
      content = await jsonLd.innerHTML()
      expect(JSON.parse(content)['@type']).toBe('AggregateRating')
    })

    test('no console errors during navigation', async ({ page }) => {
      await page.goto('/about')
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      await page.click('a[href="/"]')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      const criticalErrors = consoleErrors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('DevTools')
      )
      expect(criticalErrors).toHaveLength(0)
    })
  })

  // ============================================
  // ROUND-TRIP NAVIGATION
  // ============================================
  test.describe('Round-trip navigation', () => {
    test('head tags are consistent after Home -> About -> Home', async ({ page }) => {
      // Start at home
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      const initialTitle = await page.title()
      const initialCanonical = await page.locator('link[rel="canonical"]').getAttribute('href')
      const initialPageId = await page.locator('meta[name="page-id"]').getAttribute('content')

      // Go to about
      await page.click('a[href="/about"]')
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      // Verify about state
      await expect(page).toHaveTitle(/About/)
      await expect(page.locator('meta[name="page-id"]')).toHaveAttribute('content', 'about')

      // Return to home
      await page.click('a[href="/"]')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      // Verify same state as initial
      await expect(page).toHaveTitle(initialTitle)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', initialCanonical!)
      await expect(page.locator('meta[name="page-id"]')).toHaveAttribute('content', initialPageId!)
    })

    test('no duplicate meta tags after multiple navigations', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      // Navigate back and forth multiple times
      for (let i = 0; i < 3; i++) {
        await page.click('a[href="/about"]')
        await expect(page.locator('.about-hero')).toBeVisible({ timeout: 5000 })

        await page.click('a[href="/"]')
        await expect(page.locator('.hero-banner')).toBeVisible({ timeout: 5000 })
      }

      // Wait for final state
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      // Check for duplicates
      expect(await page.locator('meta[name="page-id"]').count()).toBe(1)
      expect(await page.locator('meta[name="description"]').count()).toBe(1)
      expect(await page.locator('meta[name="viewport"]').count()).toBe(1)
      expect(await page.locator('link[rel="canonical"]').count()).toBe(1)
      expect(await page.locator('title').count()).toBe(1)
    })

    test('no console errors after multiple navigations', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      // Navigate back and forth
      await page.click('a[href="/about"]')
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      await page.click('a[href="/"]')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      await page.click('a[href="/about"]')
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      const criticalErrors = consoleErrors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('DevTools')
      )
      expect(criticalErrors).toHaveLength(0)
    })
  })

  // ============================================
  // BROWSER BACK/FORWARD
  // ============================================
  test.describe('Browser history navigation', () => {
    test('back button restores previous head state', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      await page.click('a[href="/about"]')
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      // Use browser back
      await page.goBack()
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      await expect(page.locator('meta[name="page-id"]')).toHaveAttribute('content', 'home')
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://example.com/')
    })

    test('forward button restores next head state', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      await page.click('a[href="/about"]')
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      await page.goBack()
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      // Use browser forward
      await page.goForward()
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      await expect(page.locator('meta[name="page-id"]')).toHaveAttribute('content', 'about')
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://example.com/about')
    })

    test('no console errors during history navigation', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      await page.click('a[href="/about"]')
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      await page.goBack()
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      await page.goForward()
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      const criticalErrors = consoleErrors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('DevTools')
      )
      expect(criticalErrors).toHaveLength(0)
    })
  })

  // ============================================
  // STREAMING PROGRESS ON EACH PAGE
  // ============================================
  test.describe('Streaming progress updates', () => {
    test('home page progress bar updates during streaming', async ({ page }) => {
      await page.goto('/')

      // Progress bar should exist and have some width during streaming
      const progressBar = page.locator('.stream-progress')
      await expect(progressBar).toBeVisible()

      // Wait for completion
      await expect(page.locator('.newsletter')).toBeVisible({ timeout: 15000 })

      // Should be hidden after complete
      await expect(progressBar).toHaveCSS('opacity', '0')
    })

    test('about page progress bar updates during streaming', async ({ page }) => {
      await page.goto('/about')

      const progressBar = page.locator('.stream-progress')
      await expect(progressBar).toBeVisible()

      // Wait for completion
      await expect(page.locator('.stats-section')).toBeVisible({ timeout: 15000 })

      // Should be hidden after complete
      await expect(progressBar).toHaveCSS('opacity', '0')
    })
  })
})
