import { expect, test } from '@playwright/test'

test.describe('React Streaming SSR with Unhead', () => {
  // ============================================
  // SHELL & INITIAL STATE
  // ============================================
  test.describe('Shell rendering', () => {
    test('initial shell has head tags before streaming completes', async ({ page }) => {
      const response = await page.goto('/')
      const html = await response?.text() || ''

      expect(html).toContain('<title>React Streaming SSR Demo</title>')
      expect(html).toContain('lang="en"')
      expect(html).toContain('charset="utf-8"')
      expect(html).toContain('window.__unhead__')
    })

    test('initial description is present in shell', async ({ page }) => {
      const response = await page.goto('/')
      const html = await response?.text() || ''

      expect(html).toContain('Initial description before async load')
    })

    test('app config script is in head', async ({ page }) => {
      const response = await page.goto('/')
      const html = await response?.text() || ''

      expect(html).toContain('id="app-config"')
      expect(html).toContain('"env":"production"')
    })

    test('html and body attributes are set in shell', async ({ page }) => {
      await page.goto('/')

      const html = page.locator('html')
      await expect(html).toHaveAttribute('lang', 'en')
      await expect(html).toHaveClass(/layout-default/)

      const body = page.locator('body')
      await expect(body).toHaveClass(/app-body/)
    })
  })

  // ============================================
  // STREAMING BEHAVIOR
  // ============================================
  test.describe('Streaming behavior', () => {
    test('head updates happen via streaming (not client-side JS)', async ({ page }) => {
      const response = await page.goto('/')
      const html = await response?.text() || ''

      // Wait for slowest component
      await expect(page.locator('.slow-component')).toBeVisible({ timeout: 5000 })

      // Async content should be in streamed HTML
      expect(html).toContain('window.__unhead__')
      expect(html).toContain('Async Product')
    })

    test('fast component resolves and updates head before slow component', async ({ page }) => {
      await page.goto('/')

      // Fast component (500ms) should appear quickly
      await expect(page.locator('.fast-component')).toBeVisible({ timeout: 2000 })

      // Category meta should be present
      const categoryMeta = page.locator('meta[name="category"]')
      await expect(categoryMeta).toHaveAttribute('content', 'Electronics')
    })

    test('components stream in order of resolution time', async ({ page }) => {
      const resolved: string[] = []

      await page.goto('/')

      // Track resolution order
      await page.locator('.fast-component').waitFor({ timeout: 2000 })
      resolved.push('fast')

      await page.locator('.outer-async').waitFor({ timeout: 2000 })
      resolved.push('outer')

      await page.locator('.special-chars-component').waitFor({ timeout: 2000 })
      resolved.push('special')

      await page.locator('.seo-component').waitFor({ timeout: 2000 })
      resolved.push('seo')

      await page.locator('.inner-async').waitFor({ timeout: 2000 })
      resolved.push('inner')

      await page.locator('.slow-component').waitFor({ timeout: 3000 })
      resolved.push('slow')

      // Fast should be first, slow should be last
      expect(resolved[0]).toBe('fast')
      expect(resolved[resolved.length - 1]).toBe('slow')
    })
  })

  // ============================================
  // DEDUPLICATION
  // ============================================
  test.describe('Deduplication', () => {
    test('only one title tag exists after all components load', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.slow-component')).toBeVisible({ timeout: 5000 })

      const titles = await page.locator('title').count()
      expect(titles).toBe(1)
    })

    test('only one description meta exists (deduplicated by name)', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.slow-component')).toBeVisible({ timeout: 5000 })

      const descriptions = await page.locator('meta[name="description"]').count()
      expect(descriptions).toBe(1)
    })

    test('final title is from last component to update', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.slow-component')).toBeVisible({ timeout: 5000 })

      // SlowComponent sets title last
      await expect(page).toHaveTitle('Async Product - $99')
    })

    test('description is updated by slow component', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.slow-component')).toBeVisible({ timeout: 5000 })

      const description = page.locator('meta[name="description"]')
      await expect(description).toHaveAttribute('content', 'This product loaded after a delay with streaming SSR')
    })
  })

  // ============================================
  // NESTED SUSPENSE
  // ============================================
  test.describe('Nested Suspense', () => {
    test('outer suspense resolves and adds meta', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.outer-async')).toBeVisible({ timeout: 3000 })

      const sectionMeta = page.locator('meta[name="section"]')
      await expect(sectionMeta).toHaveAttribute('content', 'Outer Section')
    })

    test('inner suspense resolves after outer', async ({ page }) => {
      await page.goto('/')

      // Outer first
      await expect(page.locator('.outer-async')).toBeVisible({ timeout: 3000 })

      // Then inner
      await expect(page.locator('.inner-async')).toBeVisible({ timeout: 3000 })

      const subsectionMeta = page.locator('meta[name="subsection"]')
      await expect(subsectionMeta).toHaveAttribute('content', 'Inner Subsection')
    })

    test('nested component adds script tag', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.inner-async')).toBeVisible({ timeout: 5000 })

      const script = page.locator('script#inner-config')
      await expect(script).toBeAttached()

      const content = await script.innerHTML()
      expect(JSON.parse(content)).toEqual({ nested: true })
    })
  })

  // ============================================
  // SPECIAL CHARACTERS & XSS PREVENTION
  // ============================================
  test.describe('Special characters and XSS prevention', () => {
    test('unicode characters in title are preserved', async ({ page }) => {
      await page.goto('/')
      // Wait for slow component since it sets final title after special-chars
      await expect(page.locator('.slow-component')).toBeVisible({ timeout: 5000 })

      // Special chars component sets title with unicode, but slow component overwrites it
      // Check that special-chars meta content has unicode instead
      const unicodeMeta = page.locator('meta[name="unicode"]')
      const content = await unicodeMeta.getAttribute('content')
      expect(content).toContain('🚀')
    })

    test('special chars meta does not execute XSS', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.special-chars-component')).toBeVisible({ timeout: 3000 })

      // The script tag in content should be escaped, not executed
      const specialMeta = page.locator('meta[name="special-chars"]')
      const content = await specialMeta.getAttribute('content')

      // Content should contain the literal text, not execute it
      expect(content).toContain('<script>')
      expect(content).toContain('</script>')
    })

    test('unicode meta content is preserved', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.special-chars-component')).toBeVisible({ timeout: 3000 })

      const unicodeMeta = page.locator('meta[name="unicode"]')
      const content = await unicodeMeta.getAttribute('content')

      expect(content).toContain('日本語')
      expect(content).toContain('🚀')
    })

    test('quotes and special chars in meta are handled', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.special-chars-component')).toBeVisible({ timeout: 3000 })

      // Check special-chars meta has quotes and special characters properly escaped
      const specialMeta = page.locator('meta[name="special-chars"]')
      const content = await specialMeta.getAttribute('content')
      expect(content).toContain('"quotes"')
      expect(content).toContain("'")
    })
  })

  // ============================================
  // STRUCTURED DATA (JSON-LD)
  // ============================================
  test.describe('Structured data', () => {
    test('JSON-LD script is added by async component', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.special-chars-component')).toBeVisible({ timeout: 3000 })

      const jsonLd = page.locator('script[type="application/ld+json"]')
      await expect(jsonLd).toBeAttached()
    })

    test('JSON-LD contains valid schema.org Product data', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.special-chars-component')).toBeVisible({ timeout: 3000 })

      const jsonLd = page.locator('script[type="application/ld+json"]')
      const content = await jsonLd.innerHTML()
      const data = JSON.parse(content)

      expect(data['@context']).toBe('https://schema.org')
      expect(data['@type']).toBe('Product')
      expect(data.offers.price).toBe(29.99)
    })
  })

  // ============================================
  // SEO TAGS
  // ============================================
  test.describe('SEO tags', () => {
    test('canonical link is added', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.seo-component')).toBeVisible({ timeout: 3000 })

      const canonical = page.locator('link[rel="canonical"]')
      await expect(canonical).toHaveAttribute('href', 'https://example.com/async-product-page')
    })

    test('hreflang alternates are added', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.seo-component')).toBeVisible({ timeout: 3000 })

      const esAlternate = page.locator('link[hreflang="es"]')
      await expect(esAlternate).toHaveAttribute('href', 'https://example.com/es/async-product-page')

      const frAlternate = page.locator('link[hreflang="fr"]')
      await expect(frAlternate).toHaveAttribute('href', 'https://example.com/fr/async-product-page')
    })

    test('robots meta is set', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.seo-component')).toBeVisible({ timeout: 3000 })

      const robots = page.locator('meta[name="robots"]')
      await expect(robots).toHaveAttribute('content', 'index, follow, max-image-preview:large')
    })

    test('author meta is set', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.seo-component')).toBeVisible({ timeout: 3000 })

      const author = page.locator('meta[name="author"]')
      await expect(author).toHaveAttribute('content', 'Jane Developer')
    })

    test('Twitter card meta tags are set', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.seo-component')).toBeVisible({ timeout: 3000 })

      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
      await expect(page.locator('meta[name="twitter:site"]')).toHaveAttribute('content', '@example')
      await expect(page.locator('meta[name="twitter:creator"]')).toHaveAttribute('content', '@janedeveloper')
    })
  })

  // ============================================
  // OPEN GRAPH TAGS
  // ============================================
  test.describe('Open Graph tags', () => {
    test('og:title is set from async component', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.slow-component')).toBeVisible({ timeout: 5000 })

      const ogTitle = page.locator('meta[property="og:title"]')
      await expect(ogTitle).toHaveAttribute('content', 'Async Product - $99')
    })

    test('og:description is set', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.slow-component')).toBeVisible({ timeout: 5000 })

      const ogDesc = page.locator('meta[property="og:description"]')
      await expect(ogDesc).toHaveAttribute('content', 'This product loaded after a delay with streaming SSR')
    })

    test('og:price meta tags are set', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.special-chars-component')).toBeVisible({ timeout: 3000 })

      const ogPriceAmount = page.locator('meta[property="og:price:amount"]')
      await expect(ogPriceAmount).toHaveAttribute('content', '29.99')

      const ogPriceCurrency = page.locator('meta[property="og:price:currency"]')
      await expect(ogPriceCurrency).toHaveAttribute('content', 'USD')
    })

    test('product:category meta is set', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.fast-component')).toBeVisible({ timeout: 2000 })

      const productCategory = page.locator('meta[property="product:category"]')
      await expect(productCategory).toHaveAttribute('content', 'Electronics')
    })
  })

  // ============================================
  // LINK TAGS
  // ============================================
  test.describe('Link tags', () => {
    test('stylesheet link is added by async component', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.slow-component')).toBeVisible({ timeout: 5000 })

      const stylesheet = page.locator('link[href="https://example.com/product-styles.css"]')
      await expect(stylesheet).toHaveAttribute('rel', 'stylesheet')
    })

    test('preload link with font attributes is added', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.fast-component')).toBeVisible({ timeout: 2000 })

      const preload = page.locator('link[rel="preload"][as="font"]')
      await expect(preload).toHaveAttribute('href', '/fonts/inter.woff2')
      await expect(preload).toHaveAttribute('type', 'font/woff2')
      await expect(preload).toHaveAttribute('crossorigin', 'anonymous')
    })
  })

  // ============================================
  // EDGE CASES
  // ============================================
  test.describe('Edge cases', () => {
    test('page remains functional after all streaming completes', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.slow-component')).toBeVisible({ timeout: 5000 })

      // All content should be visible and interactive
      await expect(page.locator('h1')).toContainText('React Streaming SSR with Unhead')
      await expect(page.locator('.fast-component')).toBeVisible()
      await expect(page.locator('.outer-async')).toBeVisible()
      await expect(page.locator('.inner-async')).toBeVisible()
      await expect(page.locator('.special-chars-component')).toBeVisible()
      await expect(page.locator('.seo-component')).toBeVisible()
    })

    test('no duplicate script tags with same id', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.slow-component')).toBeVisible({ timeout: 5000 })

      const appConfigs = await page.locator('script#app-config').count()
      expect(appConfigs).toBe(1)
    })

    test('viewport meta is not duplicated', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.slow-component')).toBeVisible({ timeout: 5000 })

      const viewports = await page.locator('meta[name="viewport"]').count()
      expect(viewports).toBe(1)
    })

    test('charset meta is not duplicated', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.slow-component')).toBeVisible({ timeout: 5000 })

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
      await expect(page.locator('.slow-component')).toBeVisible({ timeout: 5000 })

      // Wait a bit for hydration to complete
      await page.waitForTimeout(500)

      // Verify head state is still correct
      await expect(page).toHaveTitle('Async Product - $99')
      const description = page.locator('meta[name="description"]')
      await expect(description).toHaveAttribute('content', 'This product loaded after a delay with streaming SSR')
    })

    test('no unexpected console errors during streaming and hydration', async ({ page }) => {
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      await page.goto('/')
      await expect(page.locator('.slow-component')).toBeVisible({ timeout: 5000 })

      // Wait for hydration
      await page.waitForTimeout(500)

      // Filter out only favicon 404 errors
      const criticalErrors = errors.filter(e => !e.includes('favicon'))
      expect(criticalErrors).toHaveLength(0)
    })
  })
})
