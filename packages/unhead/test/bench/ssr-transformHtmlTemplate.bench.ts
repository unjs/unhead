import { createHead } from 'unhead/server'
import { bench, describe } from 'vitest'
import { transformHtmlTemplate } from '../../src/server/transformHtmlTemplate'

describe('transformHtmlTemplate', () => {
  const basicHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Basic Template</title>
</head>
<body>
  <h1>Hello World</h1>
</body>
</html>`

  const complexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complex Template</title>
  <link rel="stylesheet" href="/styles.css">
  <script src="/script.js"></script>
</head>
<body class="page">
  <header>
    <nav>Navigation</nav>
  </header>
  <main>
    <h1>Main Content</h1>
    <p>Lorem ipsum dolor sit amet consectetur adipisicing elit.</p>
  </main>
  <footer>
    <p>Footer content</p>
  </footer>
</body>
</html>`

  bench('basic html template', async () => {
    const head = createHead()
    head.push({
      title: 'Benchmarked Page',
      meta: [
        { name: 'description', content: 'A benchmark test page' },
        { property: 'og:title', content: 'Benchmarked Page' }
      ]
    })
    await transformHtmlTemplate(head, basicHtml)
  }, {
    iterations: 1000,
    time: 1000,
  })

  bench('complex html template', async () => {
    const head = createHead()
    head.push({
      title: 'Complex Benchmarked Page',
      meta: [
        { name: 'description', content: 'A complex benchmark test page with lots of content' },
        { name: 'keywords', content: 'benchmark, test, performance, html' },
        { property: 'og:title', content: 'Complex Benchmarked Page' },
        { property: 'og:description', content: 'Testing performance with complex HTML' },
        { property: 'og:image', content: 'https://example.com/image.jpg' },
        { name: 'twitter:card', content: 'summary_large_image' }
      ],
      link: [
        { rel: 'canonical', href: 'https://example.com/complex' },
        { rel: 'alternate', hreflang: 'en', href: 'https://example.com/en/complex' }
      ],
      script: [
        { type: 'application/ld+json', innerHTML: '{"@type": "WebPage", "name": "Complex Page"}' }
      ]
    })
    await transformHtmlTemplate(head, complexHtml)
  }, {
    iterations: 1000,
    time: 1000,
  })

  bench('multiple head pushes', async () => {
    const head = createHead()

    // Simulate multiple components adding head data
    head.push({ title: 'Base Title' })
    head.push({ meta: [{ name: 'description', content: 'Base description' }] })
    head.push({ meta: [{ property: 'og:title', content: 'Social Title' }] })
    head.push({ link: [{ rel: 'canonical', href: 'https://example.com' }] })
    head.push({ script: [{ src: '/analytics.js', async: true }] })

    await transformHtmlTemplate(head, basicHtml)
  }, {
    iterations: 1000,
    time: 1000,
  })

  bench('large html template', async () => {
    // Generate a larger HTML template
    const largeContent = Array.from({ length: 100 }, (_, i) =>
      `<section><h2>Section ${i}</h2><p>Content for section ${i} with some text...</p></section>`
    ).join('\n    ')

    const largeHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Large Template</title>
</head>
<body>
  <header>Header</header>
  <main>
    ${largeContent}
  </main>
  <footer>Footer</footer>
</body>
</html>`

    const head = createHead()
    head.push({
      title: 'Large Page Benchmark',
      meta: [
        { name: 'description', content: 'Testing with large HTML content' },
        { property: 'og:title', content: 'Large Page' }
      ]
    })

    await transformHtmlTemplate(head, largeHtml)
  }, {
    iterations: 500,
    time: 1000,
  })
})