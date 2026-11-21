import type { ResolvableHead } from 'unhead/types'
import type { MinifyFn } from '../src/unplugin/MinifyTransform'
import { runInNewContext } from 'node:vm'
import { createHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'
import { Unhead } from '../src/unplugin/vite'
import { runTransform } from './utils'

const js = `globalThis.visits++; /*${'static code '.repeat(350)}*/`
const css = `.page { display: grid; } /*${'static style '.repeat(350)}*/`

async function render(code: string, enabled?: boolean, input = {}, minifyJs?: MinifyFn) {
  for (const plugin of Unhead({
    transformInlineTagKeys: enabled,
    transformInlineScripts: false,
    devtools: false,
    minify: minifyJs && { js: minifyJs },
  }, { framework: '@unhead/vue' })) {
    if (plugin.transform)
      code = (await runTransform(plugin, code, '/app/App.vue?vue&type=script&setup=true&lang.ts'))?.code ?? code
  }
  const head = createHead({ disableDefaults: true })
  runInNewContext(code, { useHead: (entry: ResolvableHead) => head.push(entry), ...input })
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
    ] })`

    expect(await render(code, true, { dynamic: `${js} /* dynamic */` })).toBe(await render(code, undefined, { dynamic: `${js} /* dynamic */` }))
  })

  it('keys the emitted script after minification', async () => {
    const code = `useHead({ script: [{ innerHTML: ${JSON.stringify(`${js} /* extra */`)} }] })`
    const emitted = `useHead({ script: [{ innerHTML: ${JSON.stringify(js)} }] })`

    expect(await render(code, true, {}, async () => js)).toBe(await render(emitted, true))
  })
})
