import type { ResolvableHead } from 'unhead/types'
import type { MinifyFn } from '../src/unplugin/MinifyTransform'
import { runInNewContext } from 'node:vm'
import { useHead as coreUseHead } from 'unhead'
import { createHead } from 'unhead/server'
import { resolveConfig } from 'vite'
import { describe, expect, it } from 'vitest'
import { Unhead } from '../src/unplugin/vite'
import { runTransform } from './utils'

const js = `globalThis.visits++; /*${'static code '.repeat(350)}*/`
const css = `.page { display: grid; } /*${'static style '.repeat(350)}*/`

async function render(code: string, enabled?: boolean, input = {}, minifyJs?: MinifyFn, dependency?: { bundled: boolean, external?: boolean, linked?: boolean }) {
  const packageName = dependency?.linked ? '@unhead/bundler' : '@acme/head'
  const id = dependency?.linked
    ? new URL('./linked-fixture.js', import.meta.url).pathname
    : dependency
      ? '/app/node_modules/.pnpm/@acme+head@1.0.0/node_modules/@acme/head/dist/index.js'
      : '/app/App.vue?vue&type=script&setup=true&lang.ts'
  for (const plugin of Unhead({
    transformInlineTagKeys: enabled,
    transformInlineScripts: false,
    devtools: false,
    minify: minifyJs && { js: minifyJs },
  }, { framework: '@unhead/vue' })) {
    if (dependency && plugin.name === 'unhead:static-inline-keys' && plugin.configResolved) {
      await resolveConfig({
        configFile: false,
        plugins: [plugin],
        ssr: {
          noExternal: dependency.bundled ? [packageName] : [],
          external: dependency.external ? [packageName] : [],
        },
      }, 'build')
    }
    if (plugin.transform)
      code = (await runTransform(plugin, code, id))?.code ?? code
  }
  const head = createHead({ disableDefaults: true })
  const useHead = (entry: ResolvableHead) => head.push(entry)
  runInNewContext(code.replace(/^import .*\n/gm, ''), { useHead, headApi: { useHead }, coreUseHead, coreHead: head, ...input })
  return head.render().headTags
}

describe('static inline keys', () => {
  it('emits stable keys for long static script and style tags when enabled', async () => {
    const code = `useHead({ script: [{ innerHTML: ${JSON.stringify(js)} }], style: [{ textContent: ${JSON.stringify(css)} }] })`
    const output = await render(`${code}\n${code}`, true)

    expect(output.match(/data-hid="unhead:inline:[^"]+"/g)).toHaveLength(2)
    expect(output.replace(/ data-hid="[^"]+"/g, '')).toBe(await render(code))
  })

  it('leaves short tags, explicit keys, dynamic bodies and template parameters to the author', async () => {
    const code = `useHead({ script: [
      { innerHTML: "void 0" },
      { innerHTML: ${JSON.stringify(js)}, key: "manual" },
      { innerHTML: dynamic },
      { innerHTML: ${JSON.stringify(`${js} /* %scriptParam */`)} },
      { innerHTML: ${JSON.stringify(`${js} /* unevaluated strategy */`)}, tagDuplicateStrategy: undefined },
    ] })`

    expect(await render(code, true, { dynamic: `${js} /* dynamic */` })).toBe(await render(code, undefined, { dynamic: `${js} /* dynamic */` }))
  })

  it('keys the emitted script after minification', async () => {
    const code = `useHead({ script: [{ innerHTML: ${JSON.stringify(`${js} /* extra */`)} }] })`
    const emitted = `useHead({ script: [{ innerHTML: ${JSON.stringify(js)} }] })`

    expect(await render(code, true, {}, async () => js)).toBe(await render(emitted, true))
  })

  it('keys content-only tags from a dependency bundled for SSR', async () => {
    const code = `import * as headApi from 'nuxt/app'
    const css = ${JSON.stringify(css)}
    headApi.useHead({ style: [{ innerHTML: css, media: 'print' }], script: [${JSON.stringify(js)}] })
    headApi.useHead({ style: [{ textContent: css, media: 'screen' }] })`

    const baseline = await render(code, false)
    const output = await render(code, true, {}, undefined, { bundled: true })
    expect(output.match(/data-hid="unhead:inline:[^"]+"/g)).toHaveLength(2)
    expect(output.replace(/ data-hid="unhead:inline:[^"]+"/g, '')).toBe(baseline)
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
    expect(output.match(/data-hid="unhead:inline:[^"]+"/g)).toHaveLength(1)
    expect(output.replace(/ data-hid="unhead:inline:[^"]+"/, '')).toBe(await render(code))
  })

  it('keys an inline string passed as a shorthand property', async () => {
    const code = `const style = ${JSON.stringify(css)}; useHead({ style })`

    const output = await render(code, true)
    expect(output).toMatch(/data-hid="unhead:inline:[^"]+"/)
    expect(output.replace(/ data-hid="unhead:inline:[^"]+"/, '')).toBe(await render(code))
  })

  it('preserves entries that may be patched and tags with inherited IDs', async () => {
    const code = `const entry = useHead({ script: [${JSON.stringify(js)}] })
    useHead({ style: [{ __proto__: { id: 'theme' }, innerHTML: ${JSON.stringify(css)} }] })`

    expect(await render(code, true)).toBe(await render(code))
  })

  it('preserves linked modules explicitly externalized in SSR', async () => {
    const code = `import { useHead } from 'nuxt/app'
    useHead({ script: [${JSON.stringify(js)}] })`

    expect(await render(code, true, {}, undefined, { bundled: false, external: true, linked: true })).toBe(await render(code))
  })

  it('keeps callback parameter values independent of outer constants', async () => {
    const code = `const body = ${JSON.stringify(css)}
    useHead((body = ${JSON.stringify(`${css} /* first */`)}) => ({ style: [{ innerHTML: body }] }))
    useHead({ style: [{ innerHTML: body }] })`

    const output = await render(code, true)
    expect(output.match(/data-hid="unhead:inline:[^"]+"/g)).toHaveLength(1)
    expect(output.replace(/ data-hid="unhead:inline:[^"]+"/, '')).toBe(await render(code))
  })

  it('keys a static body from a callback without parameters', async () => {
    const code = `useHead(() => ({ style: [{ innerHTML: ${JSON.stringify(css)} }] }))`

    const output = await render(code, true)
    expect(output).toMatch(/data-hid="unhead:inline:[^"]+"/)
    expect(output.replace(/ data-hid="unhead:inline:[^"]+"/, '')).toBe(await render(code))
  })
})
