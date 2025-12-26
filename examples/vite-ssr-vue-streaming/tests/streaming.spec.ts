import { expect, test } from '@playwright/test'

test.describe('Vue Streaming SSR with Unhead', () => {
  test('initial shell has head tags before streaming completes', async ({ page }) => {
    const response = await page.goto('/')
    const html = await response?.text() || ''

    // Shell should contain initial head tags (set in App.vue before Suspense)
    expect(html).toContain('class="layout-default"')
    expect(html).toContain('overflow:hidden') // no space in style attribute

    // Should have unhead runtime script
    expect(html).toContain('window.__unhead__')
  })

  test('streaming updates head tags when async content resolves', async ({ page }) => {
    await page.goto('/')

    // Wait for all async components (3 nested components, 3s each = ~9s total)
    await expect(page.locator('.slow-component-three')).toBeVisible({ timeout: 15000 })

    // Title should be updated to the last async component's title
    await expect(page).toHaveTitle('S3')

    // Meta description should be from last component
    const description = page.locator('meta[name="description"]')
    await expect(description).toHaveAttribute('content', 'This is slow component three')
  })

  test('head updates happen via streaming (not client-side JS)', async ({ page }) => {
    // Navigate and get the full HTML response
    const response = await page.goto('/')
    const html = await response?.text() || ''

    // Wait for async content
    await expect(page.locator('.slow-component-three')).toBeVisible({ timeout: 15000 })

    // The response should contain the streaming head update script
    expect(html).toContain('window.__unhead__')
    // Async titles should appear in streamed HTML (not just added by client JS)
    expect(html).toContain('"title":"S1"')
    expect(html).toContain('"title":"S2"')
    expect(html).toContain('"title":"S3"')
  })

  test('html and body attributes are set correctly', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.slow-component-three')).toBeVisible({ timeout: 15000 })

    const html = page.locator('html')
    await expect(html).toHaveClass(/layout-default/)

    // Body should have streamed background color from last component
    const body = page.locator('body')
    const style = await body.getAttribute('style')
    expect(style).toContain('background-color')
  })

  test('multiple head updates deduplicate correctly', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.slow-component-three')).toBeVisible({ timeout: 15000 })

    // Should only have one title tag
    const titles = await page.locator('title').count()
    expect(titles).toBe(1)

    // Should only have one description meta (deduped by name)
    const descriptions = await page.locator('meta[name="description"]').count()
    expect(descriptions).toBe(1)
  })

  test('stylesheet links are added by async components', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.slow-component-three')).toBeVisible({ timeout: 15000 })

    // Note: During streaming, each component adds its link inline.
    // Client-side hydration deduplicates, but DOM may have multiple until full hydration.
    // Test that at least the final component's stylesheet is present
    const link = page.locator('link[rel="stylesheet"][href*="font-awesome/6.0.0-beta3"]')
    await expect(link).toBeAttached()
  })

  test('nested async components stream in correct order', async ({ page }) => {
    await page.goto('/')

    // First component should appear first
    await expect(page.locator('text=Slow component one')).toBeVisible({ timeout: 5000 })

    // Then second
    await expect(page.locator('text=Slow component two')).toBeVisible({ timeout: 5000 })

    // Then third
    await expect(page.locator('text=Slow component three')).toBeVisible({ timeout: 5000 })

    // All components should be visible in nested structure
    await expect(page.locator('.slow-component-three')).toBeVisible()
  })
})
