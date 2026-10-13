import fs from 'node:fs/promises'
import express from 'express'

const isProduction = process.env.NODE_ENV === 'production'
const port = process.env.PORT || 5174
const base = process.env.BASE || '/'

const templateHtml = isProduction
  ? await fs.readFile('./dist/client/index.html', 'utf-8')
  : ''

const app = express()

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
}
else {
  const compression = (await import('compression')).default
  const sirv = (await import('sirv')).default
  app.use(compression())
  app.use(base, sirv('./dist/client', { extensions: [] }))
}

/** Minimal sealed-payload template injection (the sealed runtime has no hooks). */
function applyPayload(template, payload, appHtml) {
  return template
    .replace('<!--app-html-->', appHtml)
    .replace(/(<html[^>]*?)(>)/, `$1${payload.htmlAttrs || ''}$2`)
    .replace(/(<body[^>]*?)(>)/, `$1${payload.bodyAttrs || ''}$2`)
    .replace('<!--app-head-->', payload.headTags || '')
    .replace('</body>', `${payload.bodyTagsOpen || ''}${payload.bodyTags || ''}</body>`)
}

app.use('*all', async (req, res) => {
  try {
    const url = req.originalUrl.replace(base, '')

    /** @type {string} */
    let template
    /** @type {import('./src/entry-server.ts').render} */
    let render
    if (!isProduction) {
      template = await fs.readFile('./index.html', 'utf-8')
      template = await vite.transformIndexHtml(url, template)
      render = (await vite.ssrLoadModule('/src/entry-server.ts')).render
    }
    else {
      template = templateHtml
      render = (await import('./dist/server/entry-server.js')).render
    }

    const { html, payload } = await render(url)

    res
      .status(200)
      .set({ 'Content-Type': 'text/html' })
      .send(applyPayload(template, payload, html))
  }
  catch (e) {
    vite?.ssrFixStacktrace(e)
    console.log(e.stack)
    res.status(500).end(e.stack)
  }
})

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`)
})
