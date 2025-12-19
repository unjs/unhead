import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { streamWithHead } from '@unhead/svelte/stream/server'

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
      (await import('sirv')).default(resolve('dist/client'), {
        extensions: [],
      }),
    )
  }

  app.use(async (req, res) => {
    const url = req.originalUrl

    let template, render
    if (!isProd) {
      template = fs.readFileSync(resolve('index.html'), 'utf-8')
      template = await vite.transformIndexHtml(url, template)
      render = (await vite.ssrLoadModule('/src/entry-server.ts')).render
    }
    else {
      template = indexProd
      render = (await import('./dist/server/entry-server.js')).render
    }

    const { svelteStream, head } = render(url)

    res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' })

    // Client script path for early head processing
    const clientScript = isProd
      ? '/assets/head-client.js' // TODO: resolve from manifest
      : '/src/head-client.ts'

    for await (const chunk of streamWithHead(svelteStream, template, head, { clientScript, debug: true })) {
      if (res.closed) break
      res.write(chunk)
    }
    res.end()
  })

  return { app, vite }
}

if (!isTest) {
  createServer().then(({ app }) => app.listen(5175, () => {
    console.log('http://localhost:5175')
  }))
}
