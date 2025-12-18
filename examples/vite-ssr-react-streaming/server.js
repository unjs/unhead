// @ts-check
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import {
  renderSSRHeadShell,
  renderSSRHeadClosing,
} from '@unhead/react/server'

const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITE_TEST_BUILD

export async function createServer(
  root = process.cwd(),
  isProd = process.env.NODE_ENV === 'production',
  hmrPort,
) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const resolve = p => path.resolve(__dirname, p)

  const indexProd = isProd
    ? fs.readFileSync(resolve('dist/client/index.html'), 'utf-8')
    : ''

  const app = express()

  /** @type {import('vite').ViteDevServer} */
  let vite
  if (!isProd) {
    vite = await (
      await import('vite')
    ).createServer({
      root,
      logLevel: isTest ? 'error' : 'info',
      server: {
        middlewareMode: true,
        watch: {
          usePolling: true,
          interval: 100,
        },
        hmr: {
          port: hmrPort,
        },
      },
      appType: 'custom',
    })
    app.use(vite.middlewares)
  }
  else {
    app.use((await import('compression')).default())
    app.use(
      (await import('express')).static(resolve('dist/client'), {
        index: false,
      }),
    )
  }

  app.use('/{*path}', async (req, res) => {
    try {
      const url = req.originalUrl

      let template, render
      if (!isProd) {
        template = fs.readFileSync(resolve('index.html'), 'utf-8')
        template = await vite.transformIndexHtml(url, template)
        render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render
      }
      else {
        template = indexProd
        render = (await import('./dist/server/entry-server.js')).render
      }

      const { pipe, head, onReady } = render()

      // Split template at app placeholder
      const [htmlStart, htmlEnd] = template.split('<!--app-html-->')

      // Wait for shell to be ready
      await onReady

      res.status(200).set({ 'Content-Type': 'text/html' })

      // Render shell with initial head tags
      const shell = await renderSSRHeadShell(head, htmlStart)
      res.write(shell)

      // Stream React content
      const { PassThrough } = await import('node:stream')
      const passthrough = new PassThrough()

      passthrough.on('data', chunk => res.write(chunk))
      passthrough.on('end', async () => {
        const closing = await renderSSRHeadClosing(head)
        res.write(closing)
        res.write(htmlEnd)
        res.end()
      })

      pipe(passthrough)
    }
    catch (e) {
      vite && vite.ssrFixStacktrace(e)
      console.log(e.stack)
      res.status(500).end('Internal Server Error')
    }
  })

  return { app, vite }
}

if (!isTest) {
  createServer().then(({ app }) =>
    app.listen(6174, () => {
      console.log('http://localhost:6174')
    })
  )
}
