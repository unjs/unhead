import { expect, test } from '@playwright/test'

test.describe('Svelte Streaming SSR with Unhead', () => {
  test('initial shell has unhead runtime', async ({ page }) => {
    const response = await page.goto('/')
    const html = await response?.text() || ''

    // Should have unhead runtime script for streaming
    expect(html).toContain('window.__unhead__')
    expect(html).toContain('_q:[]')
  })

  test('streaming pushes head updates inline', async ({ page }) => {
    const response = await page.goto('/')
    const html = await response?.text() || ''

    // Head updates should be streamed via window.__unhead__.push()
    expect(html).toContain('window.__unhead__.push')
    expect(html).toContain('"title":"S1 - Loaded"')
    expect(html).toContain('"title":"S2 - Loaded"')
    expect(html).toContain('"class":"layout-default"')
  })

  test('nested components render with head updates', async ({ page }) => {
    await page.goto('/')

    // Both slow components should be visible
    await expect(page.locator('text=Slow component one')).toBeVisible()
    await expect(page.locator('text=Slow component two')).toBeVisible()

    // Title should be updated to the last component's title after hydration
    await expect(page).toHaveTitle('S2 - Loaded')
  })

  test('html attributes are applied after hydration', async ({ page }) => {
    await page.goto('/')

    // Wait for hydration to apply the class
    const html = page.locator('html')
    await expect(html).toHaveClass(/layout-default/)
  })

  test('multiple head updates deduplicate correctly', async ({ page }) => {
    await page.goto('/')

    // Should only have one title tag after deduplication
    const titles = await page.locator('title').count()
    expect(titles).toBe(1)

    // Should only have one description meta (deduped by name)
    const descriptions = await page.locator('meta[name="description"]').count()
    expect(descriptions).toBe(1)
  })

  test('stylesheet links from components are present', async ({ page }) => {
    await page.goto('/')

    const link = page.locator('link[rel="stylesheet"][href*="font-awesome"]')
    await expect(link).toBeAttached()
  })

  test('og:title meta from nested component is present', async ({ page }) => {
    await page.goto('/')

    const ogTitle = page.locator('meta[property="og:title"]')
    await expect(ogTitle).toHaveAttribute('content', 'Second Slow Component')
  })

  test('counter component works after hydration', async ({ page }) => {
    await page.goto('/')

    // Initial count should be 0
    await expect(page.locator('button')).toContainText('count is 0')

    // Click the button
    await page.locator('button').click()

    // Count should increment
    await expect(page.locator('button')).toContainText('count is 1')

    // Title should update with count
    await expect(page).toHaveTitle('1 - Counter')
  })
})
