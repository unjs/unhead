import fs from 'node:fs/promises'
import express from 'express'
import { Transform } from 'node:stream'
import { renderSSRHeadShell } from '@unhead/react/stream/server'

// Constants
const isProduction = process.env.NODE_ENV === 'production'
const port = process.env.PORT || 5173
const base = process.env.BASE || '/'
const ABORT_DELAY = 10000

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
    /** @type {import('./src/entry-server.tsx').render} */
    let render
    if (!isProduction) {
      // Always read fresh template in development
      template = await fs.readFile('./index.html', 'utf-8')
      template = await vite.transformIndexHtml(url, template)
      render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render
    } else {
      template = templateHtml
      render = (await import('./dist/server/entry-server.js')).render
    }

    let didError = false

    const { pipe, abort, head } = render(url, {
      onShellError() {
        res.status(500)
        res.set({ 'Content-Type': 'text/html' })
        res.send('<h1>Something went wrong</h1>')
      },
      async onShellReady() {
        res.status(didError ? 500 : 200)
        res.set({ 'Content-Type': 'text/html' })

        // Inject streaming head support
        let processedTemplate = template
        if (head) {
          processedTemplate = await renderSSRHeadShell(head, template)
        }

        const [htmlStart, htmlEnd] = processedTemplate.split(`<!--app-html-->`)
        let htmlEnded = false

        const transformStream = new Transform({
          transform(chunk, encoding, callback) {
            console.log('chunk', chunk)
            // See entry-server.tsx for more details of this code
            if (!htmlEnded) {
              chunk = chunk.toString()
              if (chunk.endsWith('<vite-streaming-end></vite-streaming-end>')) {
                res.write(chunk.slice(0, -41) + htmlEnd, 'utf-8')
              } else {
                res.write(chunk, 'utf-8')
              }
            } else {
              res.write(chunk, encoding)
            }
            callback()
          },
        })

        transformStream.on('finish', () => {
          res.end()
        })

        res.write(htmlStart)

        pipe(transformStream)
      },
      onError(error) {
        didError = true
        console.error(error)
      },
    })

    setTimeout(() => {
      abort()
    }, ABORT_DELAY)
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
