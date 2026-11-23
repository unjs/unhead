import type { Unhead as Head, ResolvableHead } from 'unhead/types'
import type { MinifyFn } from '../src/unplugin/MinifyTransform'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { JSDOM } from 'jsdom'
import { useHead as coreUseHead } from 'unhead'
import { createHead as createClientHead } from 'unhead/client'
import { createHead } from 'unhead/server'
import { createBuilder, resolveConfig } from 'vite'
import { describe, expect, it } from 'vitest'
import { keyInlineTags } from '../src/inlineKeys'
import { Unhead } from '../src/unplugin/vite'
import { runTransform } from './utils'

const js = `globalThis.visits++; /*${'static code '.repeat(350)}*/`
const css = `.page { display: grid; } /*${'static style '.repeat(350)}*/`
const appRoot = fileURLToPath(new URL('..', import.meta.url))

async function render(code: string, enabled?: boolean, input = {}, minifyJs?: MinifyFn, dependency?: { bundled: boolean, external?: boolean | string, linked?: string, root?: string, buildExternal?: string | RegExp, alias?: Record<string, string> }) {
  const packageName = dependency?.linked ? '@acme/linked' : '@acme/head'
  const id = dependency?.linked ?? (dependency
    ? join(appRoot, 'node_modules/.pnpm/@acme+head@1.0.0/node_modules/@acme/head/dist/index.js')
    : join(appRoot, 'App.vue?vue&type=script&setup=true&lang.ts'))
  for (const plugin of Unhead({
    transformInlineTagKeys: enabled,
    transformInlineScripts: false,
    devtools: false,
    validate: false,
    minify: minifyJs && { js: minifyJs },
  }, { framework: '@unhead/vue' })) {
    if (plugin.name === 'unhead:static-inline-keys' && plugin.configResolved) {
      const builder = await createBuilder({
        configFile: false,
        root: dependency?.root ?? appRoot,
        environments: { ssr: { consumer: 'server' } },
        builder: {
          sharedConfigBuild: true,
          async buildApp(builder) {
            // These tests execute transformed head data directly instead of emitting bundles.
            for (const environment of Object.values(builder.environments))
              environment.isBuilt = true
          },
        },
        plugins: [plugin],
        resolve: { alias: dependency?.alias },
        build: { rollupOptions: { external: dependency?.buildExternal } },
        ssr: {
          noExternal: dependency?.bundled ? [packageName] : [],
          external: dependency?.external ? [dependency.external === true ? packageName : dependency.external] : [],
        },
      })
      await builder.buildApp()
    }
    if (plugin.transform)
      code = (await runTransform(plugin, code, id))?.code ?? code
  }
  const head = createHead({ disableDefaults: true })
  const useHead = (entry: ResolvableHead) => head.push(entry)
  const getHead = () => head
  runInNewContext(code.replace(/^import .*\n/gm, ''), {
    useHead,
    headApi: { useHead },
    coreUseHead,
    coreHead: head,
    server: { createHead: getHead },
    injectHead: getHead,
    ...input,
  })
  return head.render().headTags
}

describe('static inline keys', () => {
  it.each(['client', 'ssr'] as const)('hydrates a script once when an earlier buildApp hook builds %s first', async (first) => {
    const body = 'globalThis.visits = (globalThis.visits || 0) + 1'
    const entry = join(appRoot, 'inline-key-hook-order.ts')
    const source = `import { useHead } from 'unhead'
export function register(head) {
  useHead(head, { script: [{ innerHTML: ${JSON.stringify(body)} }] })
}`
    const registrations: Record<string, (head: Head<ResolvableHead>) => void> = {}
    const builder = await createBuilder({
      configFile: false,
      root: appRoot,
      logLevel: 'silent',
      resolve: { alias: { unhead: fileURLToPath(new URL('../../unhead/src/index.ts', import.meta.url)) } },
      environments: { ssr: { consumer: 'server', build: { ssr: entry } } },
      build: { write: false, minify: false, lib: { entry, formats: ['cjs'] } },
      builder: {
        sharedConfigBuild: true,
        async buildApp(builder) {
          await builder.build(builder.environments[first === 'client' ? 'ssr' : 'client']!)
        },
      },
      plugins: [
        {
          name: 'framework-build-first',
          async buildApp(builder) {
            await builder.build(builder.environments[first]!)
          },
          resolveId(id) {
            if (id === entry)
              return entry
          },
          load(id) {
            if (id === entry)
              return source
          },
          generateBundle(_options, bundle) {
            for (const chunk of Object.values(bundle)) {
              if (chunk.type === 'chunk' && chunk.isEntry) {
                const exports: { register?: typeof registrations[string] } = {}
                runInNewContext(chunk.code, { exports })
                registrations[this.environment.name] = exports.register!
              }
            }
          },
        },
        ...Unhead({ transformInlineTagKeys: true, transformInlineScripts: false, devtools: false, validate: false }),
      ],
    })
    await builder.buildApp()
    const server = createHead({ disableDefaults: true })
    registrations.ssr!(server)
    const dom = new JSDOM(`<!DOCTYPE html><head>${server.render().headTags}</head>`, { runScripts: 'dangerously' })
    try {
      const original = dom.window.document.querySelector('script')
      expect(dom.window.visits).toBe(1)
      const client = createClientHead({ document: dom.window.document })
      registrations.client!(client)
      client.render()
      expect(dom.window.visits).toBe(1)
      expect([...dom.window.document.querySelectorAll('script')]).toEqual([original])
    }
    finally {
      dom.window.close()
    }
  })

  it('deduplicates repeated static tags and preserves their SSR nodes', async () => {
    const body = 'globalThis.visits = (globalThis.visits || 0) + 1'
    const input = { script: [{ innerHTML: body }], style: [{ innerHTML: '.page{color:red}' }], noscript: [{ innerHTML: 'Enable JavaScript' }] }
    const literal = `useHead(${JSON.stringify(input)})`
    const html = await render(`${literal}\n${literal}`, true)
    const dom = new JSDOM(`<!DOCTYPE html><html><head>${html}</head><body></body></html>`, { runScripts: 'dangerously' })
    try {
      const original = [...dom.window.document.querySelectorAll('script,style,noscript')]
      expect(original.map(el => el.tagName)).toEqual(['SCRIPT', 'STYLE', 'NOSCRIPT'])
      expect(dom.window.visits).toBe(1)
      const client = createClientHead({ document: dom.window.document })
      const first = client.push(keyInlineTags(input))
      client.push(keyInlineTags(input))
      client.render()
      expect([...dom.window.document.querySelectorAll('script,style,noscript')]).toEqual(original)
      expect(dom.window.visits).toBe(1)
      first.dispose()
      client.render()
      expect([...dom.window.document.querySelectorAll('script,style,noscript')]).toEqual(original)
      expect(dom.window.visits).toBe(1)
    }
    finally {
      dom.window.close()
    }
  })

  it('preserves authored keys that resemble generated keys', async () => {
    const body = 'globalThis.visits = (globalThis.visits || 0) + 1'
    const html = await render(`useHead({ script: [{ innerHTML: ${JSON.stringify(body)}, key: '~authoredKey' }] })\nuseHead({ script: [{ innerHTML: runtimeBody }] })`, true, { runtimeBody: body })
    const dom = new JSDOM(`<!DOCTYPE html><head>${html}</head>`, { runScripts: 'dangerously' })
    try {
      const original = [...dom.window.document.querySelectorAll('script')]
      expect(original).toHaveLength(2)
      const client = createClientHead({ document: dom.window.document })
      client.push({ script: [{ innerHTML: body, key: '~authoredKey' }, { innerHTML: body }] })
      client.render()
      expect([...dom.window.document.querySelectorAll('script')]).toEqual(original)
      expect(dom.window.visits).toBe(2)
    }
    finally {
      dom.window.close()
    }
  })

  it.each(['configs', 'builders', 'shared-config builders'] as const)('reuses SSR scripts with separate client and SSR %s and an SSR-only external callback', async (mode) => {
    const body = `globalThis.visits = (globalThis.visits || 0) + 1; /*${'static code '.repeat(350)}*/`
    const source = `import { useHead } from '@unhead/vue'\nuseHead({ script: [{ innerHTML: ${JSON.stringify(body)} }] })`
    const inputs: ResolvableHead[] = []
    for (const ssr of [false, true]) {
      const plugins = Unhead({ transformInlineTagKeys: true, transformInlineScripts: false, devtools: false, validate: false })
      const config = {
        configFile: false as const,
        root: appRoot,
        plugins,
        build: {
          ssr,
          rollupOptions: { external: ssr ? (id: string) => id === 'node:fs' : undefined },
        },
      }
      if (mode === 'configs') {
        await resolveConfig(config, 'build')
      }
      else {
        const builder = await createBuilder({
          ...config,
          builder: {
            sharedConfigBuild: mode === 'shared-config builders',
            async buildApp(builder) {
              for (const environment of Object.values(builder.environments))
                environment.isBuilt = true
            },
          },
        }, true)
        await builder.buildApp()
      }
      let code = source
      for (const plugin of plugins) {
        if (plugin.transform)
          code = (await runTransform(plugin, code, join(appRoot, 'app.ts')))?.code ?? code
      }
      runInNewContext(code.replace(/^import .*\n/gm, ''), { useHead: (input: ResolvableHead) => inputs.push(input) })
    }
    const server = createHead({ disableDefaults: true })
    server.push(inputs[1]!)
    const dom = new JSDOM(`<!DOCTYPE html><html><head>${server.render().headTags}</head><body></body></html>`, { runScripts: 'dangerously' })
    try {
      const original = dom.window.document.querySelector('script')
      const client = createClientHead({ document: dom.window.document })
      client.push(inputs[0]!)
      client.render()
      expect(dom.window.visits).toBe(1)
      expect([...dom.window.document.querySelectorAll('script')]).toEqual([original])
    }
    finally {
      dom.window.close()
    }
  })

  it('keys short static head data consistently across useHead and head.push when enabled', async () => {
    const input = {
      script: [{ textContent: 'globalThis.visits++' }],
      style: [{ innerHTML: '.page{display:grid}/* %23 */', processTemplateParams: false }],
      noscript: [{ innerHTML: 'Enable JavaScript' }],
    }
    const head = createHead({ disableDefaults: true })
    head.push(keyInlineTags(input))
    const html = head.render().headTags
    const push = `import { injectHead } from '@unhead/vue'\nconst head = injectHead()\nhead.push(${JSON.stringify(input)})`

    expect(html.match(/data-hid="~[\w-]{11}"/g)).toHaveLength(3)
    expect(await render(`useHead(${JSON.stringify(input)})`, true)).toBe(html)
    expect(await render(push, true)).toBe(html)
    expect(await render(push)).toBe(html.replace(/ data-hid="~[\w-]{11}"/g, ''))
  })

  it('keeps authored IDs, keys and singleton tags in static head data', () => {
    const input = {
      title: 'Example',
      script: [{ textContent: js, key: 'author' }],
      style: [{ innerHTML: css, id: 'theme' }],
    }
    const baseline = createHead({ disableDefaults: true })
    baseline.push(input)
    const head = createHead({ disableDefaults: true })
    head.push(keyInlineTags(input))

    expect(head.render().headTags).toBe(baseline.render().headTags)
  })

  it('emits stable keys for long static script and style tags when enabled', async () => {
    const code = `useHead({ script: [{ innerHTML: ${JSON.stringify(js)} }], style: [{ textContent: ${JSON.stringify(css)} }] })`
    const output = await render(`${code}\n${code}`, true)

    expect(output.match(/data-hid="~[\w-]{11}"/g)).toHaveLength(2)
    expect(output.replace(/ data-hid="[^"]+"/g, '')).toBe(await render(code, false))
  })

  it('preserves empty bodies, explicit keys, dynamic bodies and template parameters', async () => {
    const code = `useHead({ script: [
      { innerHTML: "" },
      { innerHTML: ${JSON.stringify(js)}, key: "manual" },
      { innerHTML: dynamic },
      { innerHTML: ${JSON.stringify(`${js} /* %scriptParam */`)} },
      { innerHTML: ${JSON.stringify(`${js} /* unevaluated strategy */`)}, tagDuplicateStrategy: undefined },
    ] })`

    const input = { dynamic: `${js} /* dynamic */` }
    expect(await render(code, true, input)).toBe(await render(code, false, input))
  })

  it('keys the emitted script after minification', async () => {
    const code = `useHead({ script: [{ innerHTML: ${JSON.stringify(`${js} /* extra */`)} }] })`
    const emitted = `useHead({ script: [{ innerHTML: ${JSON.stringify(js)} }] })`

    expect(await render(code, true, {}, async () => js)).toBe(await render(emitted, true))
  })

  it('keeps dependency tags unkeyed when an SSR-external parent can load their original code', async () => {
    const code = `import * as headApi from 'nuxt/app'
    const css = ${JSON.stringify(css)}
    headApi.useHead({ style: [{ innerHTML: css, media: 'print' }], script: [${JSON.stringify(js)}] })
    headApi.useHead({ style: [{ textContent: css, media: 'screen' }] })`

    const baseline = await render(code, false)
    expect(await render(code, true, {}, undefined, { bundled: true, external: '@acme/parent' })).toBe(baseline)
  })

  it.each([{ bundled: false }, { bundled: true, external: true }])('keeps an SSR-external dependency unkeyed', async (dependency) => {
    const code = `import { useHead } from 'nuxt/app'
    useHead({ script: [{ innerHTML: ${JSON.stringify(js)} }] })`

    expect(await render(code, true, {}, undefined, dependency)).toBe(await render(code, false))
  })

  it('keeps singleton tags and styles with an existing identity', async () => {
    const code = `useHead({
      title: ${JSON.stringify(css)}, base: { href: '/first' }, meta: [{ charset: 'utf-8' }],
      style: [{ id: 'theme', innerHTML: ${JSON.stringify(css)} },
        { hid: 'old-id', innerHTML: ${JSON.stringify(css)} },
        { vmid: 'meta-id', innerHTML: ${JSON.stringify(`${css} /* legacy */`)} }],
      script: [{ type: 'importmap', innerHTML: ${JSON.stringify(`{"imports":{"script":"${'x'.repeat(4200)}"}}`)} }],
    })
    useHead({ title: 'Latest', style: [{ ID: 'theme', textContent: ${JSON.stringify(`${css} /* latest */`)} }] })
    useHead({ script: [{ innerHTML: ${JSON.stringify(js)} }] }, {})`

    expect(await render(code, true)).toBe(await render(code, false))
  })

  it('reads the inline input from the core composable', async () => {
    const code = `import { useHead as coreUseHead } from 'unhead'
    coreUseHead(coreHead, { style: [{ innerHTML: ${JSON.stringify(css)} }] })
    coreUseHead(coreHead, { script: [{ innerHTML: ${JSON.stringify(js)} }] }, {})`

    const output = await render(code, true)
    expect(output.match(/data-hid="~[\w-]{11}"/g)).toHaveLength(1)
    expect(output.replace(/ data-hid="~[\w-]{11}"/g, '')).toBe(await render(code, false))
  })

  it('gives repeated static pushes on a known Unhead instance one content key', async () => {
    const code = `import * as server from 'unhead/server'
    function mount(server) {
      head.push({ style: [{ innerHTML: ${JSON.stringify(css)} }] })
    }
    const head = server.createHead()
    mount(); mount()`

    const output = await render(code, true)
    expect(output).toMatch(/data-hid="~[\w-]{11}"/)
    expect(output.replace(/ data-hid="~[\w-]{11}"/g, '')).toBe(await render(code, false))
  })

  it.each(['@unhead/vue', '#app/composables/head', '#unhead/composables', 'nuxt/app'])('keys static pushes from %s and keeps dynamic, keyed and patchable input', async (source) => {
    const code = `import { injectHead } from '${source}'
    const head = injectHead()
    head.push({ style: [{ innerHTML: ${JSON.stringify(css)} }] })
    head.push({ style: [{ innerHTML: dynamic, key: 'author' }] })
    head.push({ style: [{ innerHTML: dynamic }] })
    head.push({ style: [{ innerHTML: ${JSON.stringify(`${css} /* options */`)} }] }, { tagPriority: 'low' })
    const entry = head.push({ style: [{ innerHTML: ${JSON.stringify(`${css} /* patchable */`)} }] })
    entry.patch({ style: [{ innerHTML: dynamicPatch }] })`

    const input = { dynamic: `${css} /* dynamic */`, dynamicPatch: `${css} /* dynamic patch */` }
    const output = await render(code, true, input)
    expect(output.match(/data-hid="~[\w-]{11}"/g)).toHaveLength(1)
    expect(output.replace(/ data-hid="~[\w-]{11}"/g, '')).toBe(await render(code, false, input))
  })

  it('leaves pushes on shadowed or foreign receivers alone', async () => {
    const code = `import * as server from 'unhead/server'
    const head = server.createHead()
    function register(head) {
      head.push({ style: [{ innerHTML: ${JSON.stringify(css)} }] })
    }
    register(head)
    function registerForeign(server) {
      const head = server.createHead()
      head.push({ style: [{ innerHTML: ${JSON.stringify(`${css} /* foreign */`)} }] })
    }
    registerForeign({ createHead: () => coreHead })`

    expect(await render(code, true)).toBe(await render(code, false))
  })

  it('keys an inline string passed as a shorthand property', async () => {
    const code = `const style = ${JSON.stringify(css)}; useHead({ style })`

    const output = await render(code, true)
    expect(output).toMatch(/data-hid="~[\w-]{11}"/)
    expect(output.replace(/ data-hid="~[\w-]{11}"/g, '')).toBe(await render(code, false))
  })

  it('preserves entries that may be patched and tags with inherited IDs', async () => {
    const code = `const entry = useHead({ script: [${JSON.stringify(js)}] })
    useHead({ style: [{ __proto__: { id: 'theme' }, innerHTML: ${JSON.stringify(css)} }] })`

    expect(await render(code, true)).toBe(await render(code, false))
  })

  it.each([false, true])('preserves SSR-external linked modules with a type-only manifest set to %s', async (typeOnlyManifest) => {
    const code = `import { useHead } from '@unhead/vue'
    useHead({ script: [${JSON.stringify(js)}] })`

    const root = await mkdtemp(join(tmpdir(), 'unhead-linked-'))
    try {
      const dist = join(root, 'dist')
      await mkdir(dist)
      await writeFile(join(root, 'package.json'), '{"name":"@acme/linked"}')
      if (typeOnlyManifest)
        await writeFile(join(dist, 'package.json'), '{"type":"module"}')
      const output = await render(code, true, {}, undefined, { bundled: false, external: true, linked: join(dist, 'index.js') })
      expect(output).toBe(await render(code, false))
    }
    finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('keeps linked workspace packages inside the project root unkeyed', async () => {
    const code = `import { useHead } from '@unhead/vue'
    useHead({ script: [{ textContent: ${JSON.stringify(js)} }] })`
    const root = await mkdtemp(join(tmpdir(), 'unhead-app-'))
    try {
      const linked = join(root, 'packages', 'linked')
      await mkdir(linked, { recursive: true })
      await writeFile(join(root, 'package.json'), '{"name":"@acme/app"}')
      await writeFile(join(linked, 'package.json'), '{"name":"@acme/linked"}')
      const output = await render(code, true, {}, undefined, { bundled: true, root, linked: join(linked, 'index.js') })
      expect(output).toBe(await render(code, false))
    }
    finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it.each([false, true])('checks outside SSR directory rules with a wildcard set to %s', async (wildcard) => {
    const code = `import { useHead } from '@unhead/vue'\nuseHead({ script: [{ textContent: ${JSON.stringify(js)} }] })`
    const file = join(appRoot, 'entry.ts')
    const outside = join(tmpdir(), 'unhead-external-build-only').replaceAll('\\', '/')
    const escaped = outside.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll('-', '\\x2d')
    const buildExternal = new RegExp(`^${escaped}${wildcard ? '.*' : '/'}`)
    const bundled = await render(code, true, {}, undefined, { bundled: false, linked: file, buildExternal })

    if (wildcard)
      expect(bundled).toBe(await render(code, false))
    else
      expect(bundled).toMatch(/data-hid="~[\w-]{11}"/)
  })

  it.each(['#external-app', /^#external-app$/])('leaves an SSR-external alias unkeyed in application source (%s)', async (buildExternal) => {
    const code = `import { useHead } from '@unhead/vue'\nuseHead({ script: [{ textContent: ${JSON.stringify(js)} }] })`
    const root = await mkdtemp(join(tmpdir(), 'unhead-app-'))
    const file = join(root, 'external.mjs')
    try {
      await writeFile(file, code)
      const output = await render(code, true, {}, undefined, {
        bundled: false,
        root,
        linked: file,
        buildExternal,
        alias: { '#external-app': file },
      })
      expect(output).toBe(await render(code, false))
    }
    finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it.each(['alias', 'absolute path', 'absolute pattern', 'symlink'] as const)('preserves sibling input when SSR can load it through an external %s', async (kind) => {
    const root = await mkdtemp(join(tmpdir(), 'unhead-app-'))
    const code = `import { useHead } from '@unhead/vue'\nuseHead({ script: [{ textContent: ${JSON.stringify(js)} }] })`
    const external = join(root, 'external.mjs')
    const sibling = join(root, 'sibling.mjs')
    const link = join(root, 'link.mjs')
    try {
      await writeFile(external, `import './sibling.mjs'`)
      await writeFile(sibling, code)
      await symlink(external, link, 'file')
      const absolutePattern = new RegExp(`^${external.replaceAll('\\', '/').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
      const buildExternal = { 'alias': '#external-app', 'absolute path': external, 'absolute pattern': absolutePattern, 'symlink': link }[kind]
      const output = await render(code, true, {}, undefined, {
        bundled: false,
        root,
        linked: sibling,
        buildExternal,
        alias: { '#external-app': external },
      })
      expect(output).toBe(await render(code, false))
    }
    finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('leaves app input unkeyed if an SSR-external workspace package can import it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'unhead-app-'))
    const workspace = join(root, 'workspace')
    const external = join(workspace, 'index.mjs')
    const sibling = join(root, 'sibling.mjs')
    const code = `import { useHead } from '@unhead/vue'\nuseHead({ script: [{ textContent: ${JSON.stringify(js)} }] })`
    try {
      await mkdir(workspace)
      await writeFile(join(workspace, 'package.json'), '{"name":"@acme/workspace"}')
      await writeFile(external, `import '../sibling.mjs'`)
      await writeFile(sibling, code)
      const output = await render(code, true, {}, undefined, {
        bundled: false,
        root,
        linked: sibling,
        buildExternal: '@acme/workspace',
        alias: { '@acme/workspace': external },
      })
      expect(output).toBe(await render(code, false))
    }
    finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('keeps callback parameter values independent of outer constants', async () => {
    const code = `const body = ${JSON.stringify(css)}
    useHead((body = ${JSON.stringify(`${css} /* first */`)}) => ({ style: [{ innerHTML: body }] }))
    useHead({ style: [{ innerHTML: body }] })`

    const output = await render(code, true)
    expect(output.match(/data-hid="~[\w-]{11}"/g)).toHaveLength(1)
    expect(output.replace(/ data-hid="~[\w-]{11}"/g, '')).toBe(await render(code, false))
  })

  it('keys a static body from a callback without parameters', async () => {
    const code = `useHead(() => ({ style: [{ innerHTML: ${JSON.stringify(css)} }] }))`

    const output = await render(code, true)
    expect(output).toMatch(/data-hid="~[\w-]{11}"/)
    expect(output.replace(/ data-hid="~[\w-]{11}"/g, '')).toBe(await render(code, false))
  })
})
