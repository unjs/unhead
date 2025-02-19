import { basename } from 'node:path'
import { createApp } from './main'
import { createHead, VueHeadMixin } from "@unhead/vue/server"
import { renderToWebStream } from 'vue/server-renderer'
import { Writable } from 'node:stream'

class CustomWritable extends Writable {
  constructor(options = {}) {
    super(options)
    this.chunks = []
    this.queue = [] // Initialize the queue
    this.controller = null
    this.resolve = null
    this.isClosed = false // Flag to indicate if the stream is closed
  }

  _write(chunk, encoding, callback) {
    console.log('CustomWritable _write called', Buffer.from(chunk).toString('utf-8'))
    this.chunks.push(chunk)
    if (this.controller && this.controller.desiredSize > 0) {
      this.controller.enqueue(chunk)
    }
    this.queue.push(chunk)
    if (this.resolve) {
      this.resolve()
      this.resolve = null
    }
    callback()
  }

  _final(callback) {
    this.isClosed = true
    if (this.resolve) {
      this.resolve({ value: undefined, done: true })
    }
    callback()
  }

  getContent() {
    return Buffer.concat(this.chunks).toString('utf-8')
  }

  setController(controller) {
    this.controller = controller
  }

  [Symbol.asyncIterator]() {
    return {
      next: () => {
        if (this.queue.length > 0) {
          return Promise.resolve({ value: this.queue.shift(), done: false })
        }
        return Promise.resolve({ value: '', done: true })
        // if (this.isClosed) {
        //   return Promise.resolve({ value: '', done: true })
        // }
        // return new Promise((resolve) => {
        //   this.resolve = () => resolve({ value: this.queue.shift(), done: false })
        // })
      }
    }
  }
}

export function render(url) {
  const { app } = createApp()
  const head = createHead()
  app.use(head)
  app.mixin(VueHeadMixin)
  head.push({
    htmlAttrs: {
      class: 'layout-default',
    },
    bodyAttrs: {
      style: 'overflow: hidden;',
    },
  })

  const customWritable = new CustomWritable()

  head.hooks.hook('entries:updated', async () => {
    console.log('entries:updated hook triggered')
    if (customWritable.controller) {
      console.log('controller state:', customWritable.controller.desiredSize)
      if (customWritable.controller.desiredSize > 0) {
        console.log('enqueueing head tags update')
        const tags = JSON.stringify(await head.resolveTags())
        customWritable.controller.enqueue(`<script>window.__HEAD_TAGS__ = ${tags}</script>`)
      } else {
        console.log('controller has no desired size')
      }
    } else {
      console.log('controller is not defined')
    }
  })

  // passing SSR context object which will be available via useSSRContext()
  // @vitejs/plugin-vue injects code into a component's setup() that registers
  // itself on ctx.modules. After the render, ctx.modules would contain all the
  // components that have been instantiated during this render call.
  const ctx = {}
  const vueStream = renderToWebStream(app, ctx)

  vueStream.pipeTo(new WritableStream({
    start(controller) {
      console.log('WritableStream started')
      customWritable.setController(controller)
    },
    write(chunk) {
      console.log('WritableStream write called', Buffer.from(chunk).toString('utf-8'))
      customWritable.write(chunk)
    },
    close() {
      console.log('WritableStream close called')
      customWritable.end()
    }
  })).then(() => {
    console.log('Stream has ended')
    customWritable.end()
  }).catch((err) => {
    console.error('Stream error:', err)
    customWritable.destroy(err)
  })

  return { stream: customWritable }
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
