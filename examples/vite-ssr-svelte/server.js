import fs from 'node:fs/promises'
import express from 'express'
import { createHead, renderSSRHead } from "unhead/server"
import { unheadCtx } from "unhead"

// Constants
const isProduction = process.env.NODE_ENV === 'production'
const port = process.env.PORT || 5173
const base = process.env.BASE || '/'

// Cached production assets
const templateHtml = isProduction
  ? await fs.readFile('./dist/client/index.html', 'utf-8')
  : ''

// Create http server
const app = express()

// Add Vite or respective production middlewares
/** @type {import('vite').ViteDevServer | undefined} */
let vite
if (!isProduction) {
  const { createServer } = await import('vite')
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    base,
  })
  app.use(vite.middlewares)
} else {
  const compression = (await import('compression')).default
  const sirv = (await import('sirv')).default
  app.use(compression())
  app.use(base, sirv('./dist/client', { extensions: [] }))
}

// Serve HTML
app.use('*all', async (req, res) => {
  try {
    const url = req.originalUrl.replace(base, '')

    /** @type {string} */
    let template
    /** @type {import('./src/entry-server.ts').render} */
    let render
    if (!isProduction) {
      // Always read fresh template in development
      template = await fs.readFile('./index.html', 'utf-8')
      template = await vite.transformIndexHtml(url, template)
      render = (await vite.ssrLoadModule('/src/entry-server.ts')).render
    } else {
      template = templateHtml
      render = (await import('./dist/server/entry-server.js')).render
    }

    const unhead = createHead()
    unhead.push({
      htmlAttrs: { lang: 'en' },
      bodyAttrs: { class: 'test' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/vite.svg' },
      ]
    })
    unheadCtx.set(unhead, true)
    const rendered = await render(url)
    unheadCtx.unset()
    const headTags = await renderSSRHead(unhead)

    const html = template
      .replace(`<!--app-head-->`, rendered.head ?? '' + '' + headTags.headTags)
      .replace(`<!--app-html-->`, rendered.html ?? '')
      .replace('<html>', `<html ${headTags.htmlAttrs}>`)
      .replace('<body>', `<body ${headTags.bodyAttrs}>${headTags.bodyTagsOpen}`)
      .replace('</body>', `${headTags.bodyTags}</body>`)

    res.status(200).set({ 'Content-Type': 'text/html' }).send(html)
  } catch (e) {
    vite?.ssrFixStacktrace(e)
    console.log(e.stack)
    res.status(500).end(e.stack)
  }
})

// Start http server
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`)
})
