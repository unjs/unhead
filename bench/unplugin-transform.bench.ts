import type { MinifyFn } from '../packages/bundler/src/unplugin/MinifyTransform'
import { bench, describe } from 'vitest'
import { CreateHeadTransform, createHeadTransformContext } from '../packages/bundler/src/unplugin/CreateHeadTransform'
import { UnheadTransforms } from '../packages/bundler/src/unplugin/createTransformPipeline'
import { MinifyTransform } from '../packages/bundler/src/unplugin/MinifyTransform'
import { SSRStaticReplace } from '../packages/bundler/src/unplugin/SSRStaticReplace'
import { TreeshakeServerComposables } from '../packages/bundler/src/unplugin/TreeshakeServerComposables'
import { UseSeoMetaTransform } from '../packages/bundler/src/unplugin/UseSeoMetaTransform'
import { unheadReactStreamingPlugin } from '../packages/react/src/stream/plugin'
import { unheadSolidStreamingPlugin } from '../packages/solid-js/src/stream/plugin'

const ids = Array.from({ length: 1_000 }, (_, i) => {
  if (i % 5 === 0)
    return `/project/src/page-${i}.vue?type=script`
  if (i % 5 === 1)
    return `/project/src/page-${i}.vue?type=template`
  if (i % 5 === 2)
    return `/project/src/page-${i}.ts`
  if (i % 5 === 3)
    return `/project/node_modules/pkg-${i}/index.js`
  return `/project/src/page-${i}.css`
})

const seoCode = [
  `import { useSeoMeta } from 'unhead'`,
  ...Array.from({ length: 80 }, (_, i) => `useSeoMeta({
  title: 'Page ${i}',
  description: 'Description ${i}',
  ogImage: { url: '/og-${i}.png', width: 1200, height: 630, alt: 'Image ${i}' },
  appleItunesApp: { appId: '${i}', appArgument: 'app-${i}' },
})`),
].join('\n')

const minifyCode = [
  `import { useHead } from 'unhead'`,
  `useHead({`,
  `  script: [`,
  ...Array.from({ length: 40 }, (_, i) => `    { innerHTML: '// comment ${i}\\nvar value${i} = ${i};  var other${i} = value${i} + 1;' },`),
  `  ],`,
  `  style: [`,
  ...Array.from({ length: 40 }, (_, i) => `    { innerHTML: '/* comment ${i} */ .class-${i} { color: red; margin: 0; padding: 0; }' },`),
  `  ],`,
  `})`,
].join('\n')

const treeshakeCode = [
  `import { useServerHead, useServerSeoMeta } from 'unhead'`,
  ...Array.from({ length: 200 }, (_, i) => `useServerHead({ title: 'Page ${i}' });\nuseServerSeoMeta({ description: 'Description ${i}' });`),
].join('\n')

const ssrStaticReplaceCode = [
  `import { createHead } from 'unhead'`,
  ...Array.from({ length: 200 }, (_, i) => `if (head.ssr) { console.log('server ${i}') }`),
].join('\n')

const createHeadCode = [
  `import { createHead } from '@unhead/vue/client'`,
  ...Array.from({ length: 120 }, (_, i) => `const head${i} = createHead()`),
].join('\n')

const unrelatedCode = [
  `import { ref } from 'vue'`,
  ...Array.from({ length: 300 }, (_, i) => `export const value${i} = ref(${i})`),
].join('\n')

const jsxWithoutHeadCode = [
  `import React from 'react'`,
  ...Array.from({ length: 160 }, (_, i) => `export function Component${i}() { return <main><h1>Page ${i}</h1></main> }`),
].join('\n')

const jsxWithHeadCode = [
  `import React from 'react'`,
  `import { useHead } from '@unhead/react'`,
  ...Array.from({ length: 80 }, (_, i) => `export function Component${i}() { useHead({ title: 'Page ${i}' }); return <main><h1>Page ${i}</h1></main> }`),
].join('\n')

const mockJSMinifier: MinifyFn = async code =>
  code.replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim()

const mockCSSMinifier: MinifyFn = async code =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim()

function transformHandler(plugin: any) {
  return typeof plugin.transform === 'function' ? plugin.transform : plugin.transform.handler
}

async function runPluginTransform(plugin: any, code: string, id: string, context: any = {}) {
  if (plugin.transformInclude && !plugin.transformInclude(id))
    return undefined
  const transform = plugin.transform
  const codeFilter = typeof transform === 'function' ? undefined : transform?.filter?.code
  if (codeFilter && !codeFilter.test(code))
    return undefined
  return await transformHandler(plugin).call(context, code, id)
}

describe('unplugin transform CPU', () => {
  bench('transformInclude mixed ids', () => {
    const seo = UseSeoMetaTransform.vite({}) as any
    const minify = MinifyTransform.vite({ js: mockJSMinifier, css: mockCSSMinifier }) as any
    const treeshake = TreeshakeServerComposables.vite({}) as any
    let included = 0
    for (const id of ids) {
      if (seo.transformInclude(id))
        included++
      if (minify.transformInclude(id))
        included++
      if (treeshake.transformInclude(id))
        included++
    }
    return included
  })

  bench('useSeoMetaTransform static calls', async () => {
    const plugin = UseSeoMetaTransform.vite({}) as any
    await runPluginTransform(plugin, seoCode, '/project/src/page.ts')
  })

  bench('minifyTransform inline script/style', async () => {
    const plugin = MinifyTransform.vite({ js: mockJSMinifier, css: mockCSSMinifier }) as any
    await runPluginTransform(plugin, minifyCode, '/project/src/page.ts')
  })

  bench('treeshakeServerComposables many calls', async () => {
    const plugin = TreeshakeServerComposables.vite({}) as any
    await runPluginTransform(plugin, treeshakeCode, '/project/src/page.ts')
  })

  bench('treeshakeServerComposables skip unrelated code', async () => {
    const plugin = TreeshakeServerComposables.vite({}) as any
    await runPluginTransform(plugin, unrelatedCode, '/project/src/page.ts')
  })

  bench('ssrStaticReplace many head.ssr reads', async () => {
    const plugin = SSRStaticReplace.vite({}) as any
    plugin.apply({}, { command: 'build', isSsrBuild: false })
    await runPluginTransform(plugin, ssrStaticReplaceCode, '/project/node_modules/unhead/dist/index.mjs')
  })

  bench('ssrStaticReplace skip unrelated code', async () => {
    const plugin = SSRStaticReplace.vite({}) as any
    plugin.apply({}, { command: 'build', isSsrBuild: false })
    await runPluginTransform(plugin, unrelatedCode, '/project/node_modules/unhead/dist/index.mjs')
  })

  bench('createHeadTransform many createHead calls', async () => {
    const ctx = createHeadTransformContext()
    ctx.addRuntimePlugin({
      import: { name: 'ValidatePlugin', source: '@unhead/vue/plugins', as: '__validate' },
      client: '_h.use(__validate({ root: __ROOT__ }))',
    })
    ctx.addRuntimePlugin({
      import: { name: 'devtoolsPlugin', source: '@unhead/bundler', as: '__devtools' },
      client: 'window.__unhead_devtools__=_h',
    })
    const plugin = CreateHeadTransform(ctx) as any
    plugin.configResolved({ root: '/project' })
    await plugin.transform.handler.call({ environment: { config: { consumer: 'client' } } }, createHeadCode, '/project/src/head.ts')
  })

  bench('react streaming skip JSX without head calls', async () => {
    const plugin = unheadReactStreamingPlugin.vite({}) as any
    await plugin.transform.handler.call({ environment: { name: 'client' } }, jsxWithoutHeadCode, '/project/src/page.tsx')
  })

  bench('react streaming transform JSX with head calls', async () => {
    const plugin = unheadReactStreamingPlugin.vite({}) as any
    await plugin.transform.handler.call({ environment: { name: 'client' } }, jsxWithHeadCode, '/project/src/page.tsx')
  })

  bench('solid streaming skip JSX without head calls', async () => {
    const plugin = unheadSolidStreamingPlugin.vite({}) as any
    await plugin.transform.handler.call({ environment: { name: 'client' } }, jsxWithoutHeadCode, '/project/src/page.tsx')
  })
})

// A transform-positive module hitting all three concerns (treeshake, seoMeta, minify).
const combinedCode = [
  `import { useSeoMeta, useServerSeoMeta, useServerHead, useHead } from 'unhead'`,
  ...Array.from({ length: 40 }, (_, i) => [
    `useServerHead({ script: [{ innerHTML: '// server comment ${i}\\nvar a${i} = ${i};  var b${i} = a${i} + 1;' }] });`,
    `useServerSeoMeta({ description: 'Server ${i}' });`,
    `useSeoMeta({ title: 'Page ${i}', description: 'Description ${i}', ogImage: { url: '/og-${i}.png', width: 1200 } });`,
    `useHead({ script: [{ innerHTML: '// client comment ${i}\\nvar x${i} = ${i};  var y${i} = x${i} + 1;' }] });`,
  ].join('\n')),
].join('\n')

const clientContext = { environment: { config: { consumer: 'client' } } }

async function runComposedTransform(plugins: any[], code: string, id: string, context: any) {
  let current = code
  for (const plugin of plugins) {
    const result = await runPluginTransform(plugin, current, id, context)
    if (result?.code)
      current = result.code
  }
  return current
}

describe('unplugin transform pipeline', () => {
  bench('combined module: three-pass composition', async () => {
    const plugins = [
      TreeshakeServerComposables.vite({}) as any,
      UseSeoMetaTransform.vite({}) as any,
      MinifyTransform.vite({ js: mockJSMinifier, css: mockCSSMinifier }) as any,
    ]
    await runComposedTransform(plugins, combinedCode, '/project/src/page.ts', clientContext)
  })

  bench('combined module: unified pipeline', async () => {
    const plugin = UnheadTransforms.vite({
      treeshake: {},
      seoMeta: {},
      minify: { js: mockJSMinifier, css: mockCSSMinifier },
    }) as any
    await runPluginTransform(plugin, combinedCode, '/project/src/page.ts', clientContext)
  })

  bench('prefiltered module: three-pass composition', async () => {
    const plugins = [
      TreeshakeServerComposables.vite({}) as any,
      UseSeoMetaTransform.vite({}) as any,
      MinifyTransform.vite({ js: mockJSMinifier, css: mockCSSMinifier }) as any,
    ]
    await runComposedTransform(plugins, unrelatedCode, '/project/src/page.ts', clientContext)
  })

  bench('prefiltered module: unified pipeline', async () => {
    const plugin = UnheadTransforms.vite({
      treeshake: {},
      seoMeta: {},
      minify: { js: mockJSMinifier, css: mockCSSMinifier },
    }) as any
    await runPluginTransform(plugin, unrelatedCode, '/project/src/page.ts', clientContext)
  })
})
