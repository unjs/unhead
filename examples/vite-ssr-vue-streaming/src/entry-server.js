import { basename } from 'node:path'
import { createApp } from './main'
import { createHead, VueHeadMixin } from "@unhead/vue/server"
import { renderToWebStream, renderToString } from 'vue/server-renderer'

export function render(url, ssrContext = {}, renderFn = renderToWebStream) {
  const { app } = createApp()
  const head = createHead()
  app.use(head)
  app.mixin(VueHeadMixin)

  // passing SSR context object which will be available via useSSRContext()
  // @vitejs/plugin-vue injects code into a component's setup() that registers
  // itself on ctx.modules. After the render, ctx.modules would contain all the
  // components that have been instantiated during this render call.
  const ctx = { ...ssrContext }
  
  // Support both streaming and string rendering
  if (renderFn === renderToString) {
    // For bots: return promise of complete HTML
    return {
      appHtml: renderFn(app, ctx),
      head,
      ctx
    }
  } else {
    // For users: return stream
    const vueStream = renderFn(app, ctx)
    return { vueStream, head, ctx }
  }
}

function renderPreloadLinks(modules, manifest) {
  let links = ''
  const seen = new Set()
  modules.forEach((id) => {
    const files = manifest[id]
    if (files) {
      files.forEach((file) => {
        if (!seen.has(file)) {
          seen.add(file)
          const filename = basename(file)
          if (manifest[filename]) {
            for (const depFile of manifest[filename]) {
              links += renderPreloadLink(depFile)
              seen.add(depFile)
            }
          }
          links += renderPreloadLink(file)
        }
      })
    }
  })
  return links
}

function renderPreloadLink(file) {
  if (file.endsWith('.js')) {
    return `<link rel="modulepreload" crossorigin href="${file}">`
  }
  else if (file.endsWith('.css')) {
    return `<link rel="stylesheet" href="${file}">`
  }
  else if (file.endsWith('.woff')) {
    return ` <link rel="preload" href="${file}" as="font" type="font/woff" crossorigin>`
  }
  else if (file.endsWith('.woff2')) {
    return ` <link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin>`
  }
  else if (file.endsWith('.gif')) {
    return ` <link rel="preload" href="${file}" as="image" type="image/gif">`
  }
  else if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
    return ` <link rel="preload" href="${file}" as="image" type="image/jpeg">`
  }
  else if (file.endsWith('.png')) {
    return ` <link rel="preload" href="${file}" as="image" type="image/png">`
  }
  else {
    // TODO
    return ''
  }
}
