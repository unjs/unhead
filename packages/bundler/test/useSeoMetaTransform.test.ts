import { describe, expect, it, vi } from 'vitest'
import { UseSeoMetaTransform } from '../src/unplugin/UseSeoMetaTransform'

const USE_SERVER_HEAD_RE = /useServerHead/
const TITLE_RE = /title:/

async function transform(code: string | string[], id = 'some-id.js', opts: any = {}) {
  const plugin = UseSeoMetaTransform.vite(opts) as any
  const handler = typeof plugin.transform === 'function' ? plugin.transform : plugin.transform.handler
  const res = await handler.call(
    {},
    Array.isArray(code) ? code.join('\n') : code,
    id,
  )
  return res?.code
}

// Executes the transform output in a sandboxed scope. Only names that the
// rewritten `import { ... } from 'unhead'` actually lists get bound to spies;
// anything else the code calls surfaces as a real `ReferenceError`. This
// reproduces the original bug where `useSeoMeta` was stripped from the import
// but still referenced by an untransformable call site.
function runTransformed(code: string): { imported: string[], useHead: ReturnType<typeof vi.fn>, useSeoMeta: ReturnType<typeof vi.fn> } {
  const importMatch = code.match(/^import\s*\{([^}]*)\}\s*from\s*['"]unhead['"][^\n]*\n?/m)
  const imported = importMatch
    ? importMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    : []
  const body = importMatch ? code.replace(importMatch[0], '') : code
  const spies: Record<string, ReturnType<typeof vi.fn>> = {
    useHead: vi.fn(),
    useSeoMeta: vi.fn(),
    useServerHead: vi.fn(),
    useServerSeoMeta: vi.fn(),
  }
  const params = imported.filter(name => name in spies)
  const args = params.map(name => spies[name])
  // eslint-disable-next-line no-new-func
  new Function(...params, body)(...args)
  return { imported, useHead: spies.useHead, useSeoMeta: spies.useSeoMeta }
}

describe('useSeoMetaTransform', () => {
  const couldTransform = [
    'import { useSeoMeta } from \'unhead\'',
    'useSeoMeta({ title: \'Hello\', description: \'World\' })',
  ]

  it('ignores non-JS files', async () => {
    expect(await transform(couldTransform, 'test.css')).toBeUndefined()
  })

  it('transforms vue script blocks', async () => {
    expect(await transform(couldTransform, 'test.vue?type=script')).toBeDefined()
    expect(await transform(couldTransform, 'test.vue')).toBeDefined()
    expect(await transform(couldTransform, 'test.vue?type=template')).toBeUndefined()
  })

  it('retains calls above a hoisted local declaration', async () => {
    // Function declarations hoist: this call targets the local function
    // below it, not an auto-import.
    expect(await transform([
      'useSeoMeta({ title: \'Hello\' })',
      'function useSeoMeta(input) { return input }',
    ])).toBeUndefined()
  })

  it('preserves context for dynamic regexps', async () => {
    expect(
      await transform([
        'import { useSeoMeta } from \'unhead\'',
        'const meta = {}',
        'console.log(useSeoMeta(meta))',
      ]),
    ).not.toBeDefined()
  })

  it('keeps original import when a sibling call is untransformable', async () => {
    // One static call gets rewritten to useHead, another uses a dynamic first arg
    // and must stay as useSeoMeta(...). The import must keep both names.
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'const meta = {}',
      'useSeoMeta({ title: \'Hello\', description: \'World\' })',
      'useSeoMeta(meta, { tagPriority: 10 })',
    ])
    expect(code).toMatchInlineSnapshot(`
      "import { useHead, useSeoMeta } from 'unhead'
      const meta = {}
      useHead({
        title: 'Hello',
        meta: [
          { name: 'description', content: 'World' },
        ]
      })
      useSeoMeta(meta, { tagPriority: 10 })"
    `)
  })

  it('keeps original import when a spread-property call is untransformable', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'const extra = { description: \'d\' }',
      'useSeoMeta({ title: \'Hello\', description: \'World\' })',
      'useSeoMeta({ title: \'Dyn\', ...extra })',
    ])
    expect(code).toContain('import { useHead, useSeoMeta } from')
    expect(code).toContain('useSeoMeta({ title: \'Dyn\', ...extra })')
  })

  it('transformed code runs without ReferenceError when a sibling call is untransformable', async () => {
    // Regression for a bug where the bundler rewrote `useSeoMeta -> useHead`
    // for the transformable call but stripped `useSeoMeta` from the import,
    // leaving the untransformable call site dangling (`ReferenceError:
    // useSeoMeta is not defined`) at runtime.
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'const meta = { description: \'dynamic\' }',
      'useSeoMeta({ title: \'Static\', description: \'Static desc\' })',
      'useSeoMeta(meta, { tagPriority: 10 })',
    ])
    expect(code).toBeDefined()

    const { useHead, useSeoMeta } = runTransformed(code!)
    expect(useHead).toHaveBeenCalledTimes(1)
    expect(useHead).toHaveBeenCalledWith({
      title: 'Static',
      meta: [{ name: 'description', content: 'Static desc' }],
    })
    expect(useSeoMeta).toHaveBeenCalledTimes(1)
    expect(useSeoMeta).toHaveBeenCalledWith({ description: 'dynamic' }, { tagPriority: 10 })
  })

  it('statically replaces where possible', async () => {
    const code = await transform([
      'import { something } from \'other-module\'',
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ title: \'Hello\', description: \'World\'  })',
      'useSeoMeta({ title: \'Hello 2\', description: \'World 2\'  })',
    ])
    expect(code).toMatchInlineSnapshot(`
      "import { something } from 'other-module'
      import { useHead } from 'unhead'
      useHead({
        title: 'Hello',
        meta: [
          { name: 'description', content: 'World' },
        ]
      })
      useHead({
        title: 'Hello 2',
        meta: [
          { name: 'description', content: 'World 2' },
        ]
      })"
    `)
  })

  it('inlines reactive values for non-structural keys', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'import { ref } from \'vue\'',
      'const someValue = { value: \'test\' }',
      'useSeoMeta({ title: \'Hello\', description: () => someValue.value, ogTitle: ref(\'test\')  })',
    ])
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      import { ref } from 'vue'
      const someValue = { value: 'test' }
      useHead({
        title: 'Hello',
        meta: [
          { name: 'description', content: () => someValue.value },
          { property: 'og:title', content: ref('test') },
        ]
      })"
    `)
  })

  it('leaves dynamic media values to runtime (issue #769)', async () => {
    // A dynamic `ogImage` (ref/computed/getter) can resolve to an object or array that runtime
    // `unpackMeta` expands into `og:image`, `og:image:width`, ... Inlining it as a single
    // `content` would serialize the object to `[object Object]`, so the call must stay
    // `useSeoMeta(...)` and be handled at runtime. A static sibling still transforms.
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'import { computed } from \'vue\'',
      'const og = computed(() => [{ url: \'/og.png\', width: 800 }])',
      'useSeoMeta({ title: \'Static\', description: \'desc\' })',
      'useSeoMeta({ ogImage: () => [{ url: \'/og.png\', width: 800 }] })',
      'useSeoMeta({ ogImage: og })',
    ])
    expect(code).toContain('import { useHead, useSeoMeta } from')
    expect(code).toContain('useSeoMeta({ ogImage: () => [{ url: \'/og.png\', width: 800 }] })')
    expect(code).toContain('useSeoMeta({ ogImage: og })')
    expect(code).toContain('{ name: \'description\', content: \'desc\' }')
  })

  it('expands static media object and array literals', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ ogImage: { url: \'/og.png\', width: 800 }, twitterImage: [{ url: \'/t.png\', alt: \'hi\' }] })',
    ])
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      useHead({
        meta: [
          { property: 'og:image', content: '/og.png' },
          { property: 'og:image:width', content: 800 },
          { name: 'twitter:image', content: '/t.png' },
          { name: 'twitter:image:alt', content: 'hi' },
        ]
      })"
    `)
  })

  it('maps secureUrl to secure_url in static media objects', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ ogImage: { url: \'/og.png\', secureUrl: \'/s.png\' } })',
    ])
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      useHead({
        meta: [
          { property: 'og:image', content: '/og.png' },
          { property: 'og:image:secure_url', content: '/s.png' },
        ]
      })"
    `)
  })

  it('bails media objects with getters/methods/computed keys', async () => {
    // These can't be reproduced as plain `key: value` tags, so the call must go to runtime.
    expect(await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ ogImage: { get url() { return \'/o.png\' } } })',
    ])).toBeUndefined()
    expect(await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ ogImage: { [key]: \'/o.png\' } })',
    ])).toBeUndefined()
    expect(await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ ogImage: { url() { return \'/o.png\' } } })',
    ])).toBeUndefined()
  })

  it('bails non-primitive literal media values (regexp)', async () => {
    expect(await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ ogImage: /og.*/i })',
    ])).toBeUndefined()
  })

  it('preserves aliased import when a media call bails', async () => {
    const code = await transform([
      'import { useSeoMeta as usm } from \'unhead\'',
      'usm({ title: \'Static\' })',
      'usm({ ogImage: og })',
    ])
    expect(code).toMatchInlineSnapshot(`
      "import { useHead, useSeoMeta as usm } from 'unhead'
      useHead({
        title: 'Static',
      })
      usm({ ogImage: og })"
    `)
  })

  it('statically packs nested objects with booleans', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ title: \'Hello\', robots: { noindex: true, nofollow: true } })',
    ])
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      useHead({
        title: 'Hello',
        meta: [
          { name: 'robots', content: "noindex, nofollow" },
        ]
      })"
    `)
  })

  it('statically packs nested objects with numbers and negative numbers', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { maxSnippet: -1, maxImagePreview: \'large\', maxVideoPreview: 0 } })',
    ])
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      useHead({
        meta: [
          { name: 'robots', content: "max-snippet:-1, max-image-preview:large, max-video-preview:0" },
        ]
      })"
    `)
  })

  it('drops false nested values like runtime sanitizeObject', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { noindex: false, nofollow: true, maxSnippet: -1 } })',
    ])
    expect(code).toContain('{ name: \'robots\', content: "nofollow, max-snippet:-1" }')
  })

  it('bails nested objects with identifiers, calls and member expressions', async () => {
    for (const value of ['flag', 'getFlag()', 'config.noindex']) {
      expect(await transform([
        'import { useSeoMeta } from \'unhead\'',
        `useSeoMeta({ robots: { noindex: ${value} } })`,
      ])).toBeUndefined()
    }
  })

  it('bails nested objects with bigint and regexp values', async () => {
    expect(await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { maxSnippet: 1n } })',
    ])).toBeUndefined()
    expect(await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { pattern: /x/ } })',
    ])).toBeUndefined()
  })

  it('bails non-numeric unary values', async () => {
    expect(await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { noindex: !0 } })',
    ])).toBeUndefined()
    expect(await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { maxSnippet: -\'1\' } })',
    ])).toBeUndefined()
  })

  it('bails arrayable meta keys with object values (runtime handleObjectEntry)', async () => {
    // themeColor objects expand into sibling tags at runtime, not a packed string
    expect(await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ themeColor: { color: \'#fff\', media: \'dark\' } })',
    ])).toBeUndefined()
  })

  it('splits an unsupported tail prop into a residual runtime call', async () => {
    // robots stays a plain object at runtime (primitives-routed), so it can
    // trail the lowered entry without reordering rendered tags.
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'const flag = true',
      'useSeoMeta({ title: \'Hello\', description: \'World\', robots: { noindex: flag } })',
    ])
    expect(code).toMatchInlineSnapshot(`
      "import { useHead, useSeoMeta } from 'unhead'
      const flag = true
      useHead({
        title: 'Hello',
        meta: [
          { name: 'description', content: 'World' },
        ]
      });
      useSeoMeta({ robots: { noindex: flag } })"
    `)
  })

  it('does not split a dynamic media tail after lowered meta props', async () => {
    // og could resolve to an object at runtime; unpackMeta renders media
    // expansions before scalar props, so splitting would reorder tags.
    expect(await transform([
      'import { useSeoMeta } from \'unhead\'',
      'const og = \'/og.png\'',
      'useSeoMeta({ title: \'Hello\', description: \'World\', ogImage: og })',
    ])).toBeUndefined()
  })

  it('residual split keeps the aliased callee and its import', async () => {
    const code = await transform([
      'import { useSeoMeta as usm } from \'unhead\'',
      'const og = \'/og.png\'',
      'usm({ title: \'Hello\', ogImage: og })',
    ])
    expect(code).toMatchInlineSnapshot(`
      "import { useHead, useSeoMeta as usm } from 'unhead'
      const og = '/og.png'
      useHead({
        title: 'Hello',
      });
      usm({ ogImage: og })"
    `)
  })

  it('does not split when the residual name overlaps a lowered name', async () => {
    // ogImageUrl and ogImage both resolve to og:image; a cross-entry dedupe
    // could reorder rendered tags, so the whole call must stay at runtime.
    expect(await transform([
      'import { useSeoMeta } from \'unhead\'',
      'const og = \'/og.png\'',
      'useSeoMeta({ ogImageUrl: \'/a.png\', ogImage: og })',
    ])).toBeUndefined()
  })

  it('does not split when title appears after the unsupported prop', async () => {
    // title is hoisted into the lowered entry regardless of source position;
    // splitting would move it before the residual props and change last-wins order.
    expect(await transform([
      'import { useSeoMeta } from \'unhead\'',
      'const flag = true',
      'useSeoMeta({ description: \'D\', robots: { noindex: flag }, title: \'T\' })',
    ])).toBeUndefined()
  })

  it('does not split when an options argument is present', async () => {
    expect(await transform([
      'import { useSeoMeta } from \'unhead\'',
      'const og = \'/og.png\'',
      'useSeoMeta({ title: \'T\', ogImage: og }, { tagPriority: 10 })',
    ])).toBeUndefined()
  })

  it('does not split when the call result is used', async () => {
    expect(await transform([
      'import { useSeoMeta } from \'unhead\'',
      'const og = \'/og.png\'',
      'const entry = useSeoMeta({ title: \'T\', ogImage: og })',
    ])).toBeUndefined()
  })

  it('statically replaces packed meta objects without evaluating source text', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { noindex: \'true\', unavailableAfter: \'tomorrow\' } })',
    ])
    expect(code).toContain('{ name: \'robots\', content: "noindex:true, unavailable-after:tomorrow" }')
  })

  it('does not evaluate computed packed meta object keys', async () => {
    delete (globalThis as any).__unheadTransformPwned
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { [globalThis.__unheadTransformPwned = true]: \'x\' } })',
    ])
    expect(code).toBeUndefined()
    expect((globalThis as any).__unheadTransformPwned).toBeUndefined()
  })

  it('bails packed meta objects with unsafe prototype keys', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { constructor: \'polluted\' } })',
    ])
    expect(code).toBeUndefined()
  })

  it('handles @unhead/vue', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'@unhead/vue\'',
      'useSeoMeta({ charset: \'utf-8\' })',
    ])
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from '@unhead/vue'
      useHead({
        meta: [
          { charset: 'utf-8' },
        ]
      })"
    `)
  })

  it('handles node_module', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'@unhead/vue\'',
      'useSeoMeta({ charset: \'utf-8\' })',
    ], '/home/harlan/Projects/unhead/node_modules/@unhead/vue/dist/index.js')

    expect(code).toBeUndefined()
  })

  it('handles charset', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ charset: \'utf-8\' })',
    ])
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      useHead({
        meta: [
          { charset: 'utf-8' },
        ]
      })"
    `)
  })

  it('handles og:image', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      `useSeoMeta({
         ogImage: [
            {
              url: 'https://example.com/image.png',
              width: 800,
              height: 600,
              alt: 'My amazing image',
            },
          ],
          twitterImage: [
            {
              url: 'https://example.com/image.png',
              width: 800,
              height: 600,
              alt: 'My amazing image',
            },
          ],
      })`,
    ])
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      useHead({
        meta: [
          { property: 'og:image', content: 'https://example.com/image.png' },
          { property: 'og:image:width', content: 800 },
          { property: 'og:image:height', content: 600 },
          { property: 'og:image:alt', content: 'My amazing image' },
          { name: 'twitter:image', content: 'https://example.com/image.png' },
          { name: 'twitter:image:width', content: 800 },
          { name: 'twitter:image:height', content: 600 },
          { name: 'twitter:image:alt', content: 'My amazing image' },
        ]
      })"
    `)
  })

  it('respects how users import library', async () => {
    const code = await transform([
      'import { useSeoMeta as usm } from \'unhead\'',
      'usm({ title: \'Hello\', description: \'World\'  })',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      useHead({
        title: 'Hello',
        meta: [
          { name: 'description', content: 'World' },
        ]
      })"
    `)
  })

  it('respects pre-existing import', async () => {
    const code = await transform([
      'import { useSeoMeta as usm, useHead } from \'unhead\'',
      'useHead({ title: \'test\', })',
      'usm({ description: \'World\'  })',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      useHead({ title: 'test', })
      useHead({
        meta: [
          { name: 'description', content: 'World' },
        ]
      })"
    `)
  })

  it('no title - useSeoMeta', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ description: \'World\'  })',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      useHead({
        meta: [
          { name: 'description', content: 'World' },
        ]
      })"
    `)
  })

  it('no title - useServerSeoMeta', async () => {
    const code = await transform([
      'import { useServerSeoMeta } from \'unhead\'',
      'useServerSeoMeta({ description: \'World\'  })',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "import { useServerHead } from 'unhead'
      useServerHead({
        meta: [
          { name: 'description', content: 'World' },
        ]
      })"
    `)
  })

  it('useServerSeoMeta - title', async () => {
    const code = await transform([
      'import { useServerSeoMeta, useServerHead, useHead, SomethingRandom } from \'unhead\'',
      'useServerSeoMeta({ title: \'Hello\', description: \'World\'  })',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "import { useServerHead, useHead, SomethingRandom } from 'unhead'
      useHead({
        title: 'Hello',
      });
      useServerHead({
        meta: [
          { name: 'description', content: 'World' },
        ]
      })"
    `)
  })

  it('respects auto-imports', async () => {
    const code = await transform([
      'useSeoMeta({ title: \'Hello\', description: \'World\'  })',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "useHead({
        title: 'Hello',
        meta: [
          { name: 'description', content: 'World' },
        ]
      })"
    `)
  })

  it('does not handle spread operator', async () => {
    const code = await transform([
      'const data = { title: \'Hello\', description: \'World\'  }',
      'useSeoMeta({ ...data })',
    ])
    expect(code).toBeUndefined()
  })

  it('vue sfc example - useSeoMeta', async () => {
    const code = await transform(`
import { defineComponent as _defineComponent } from "vue";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "app",
  setup(__props, { expose }) {
    expose();
    useServerHead({
      link: [
        {
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
          rel: "stylesheet"
        }
      ]
    });
    const route = useRouter().currentRoute;
    useHead({
      htmlAttrs: {
        class: () => route.value.name
      }
    });
    useSeoMeta({
      description: "Hi, welcome to the %envName v%app.version of %siteName."
    });
    useSeoMeta({
      title: data.value.page?.title,
    })
    const __returned__ = { route };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
import { resolveComponent as _resolveComponent, createVNode as _createVNode, createElementVNode as _createElementVNode, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue";
const _hoisted_1 = { style: { "margin-top": "30px" } };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_NuxtPage = _resolveComponent("NuxtPage");
  const _component_DebugHead = _resolveComponent("DebugHead");
  return _openBlock(), _createElementBlock("div", null, [
    _createElementVNode("div", null, [
      _createVNode(_component_NuxtPage)
    ]),
    _createElementVNode("div", _hoisted_1, [
      _createVNode(_component_DebugHead)
    ])
  ]);
}
_sfc_main.__hmrId = "938b83b0";
typeof __VUE_HMR_RUNTIME__ !== "undefined" && __VUE_HMR_RUNTIME__.createRecord(_sfc_main.__hmrId, _sfc_main);
import.meta.hot.accept((mod) => {
  if (!mod)
    return;
  const { default: updated, _rerender_only } = mod;
  if (_rerender_only) {
    __VUE_HMR_RUNTIME__.rerender(updated.__hmrId, updated.render);
  } else {
    __VUE_HMR_RUNTIME__.reload(updated.__hmrId, updated);
  }
});
import _export_sfc from "plugin-vue:export-helper";
export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "/home/harlan/packages/nuxt-head/playground/app.vue"]]);`, 'app.js')

    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "
      import { defineComponent as _defineComponent } from "vue";
      const _sfc_main = /* @__PURE__ */ _defineComponent({
        __name: "app",
        setup(__props, { expose }) {
          expose();
          useServerHead({
            link: [
              {
                href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
                rel: "stylesheet"
              }
            ]
          });
          const route = useRouter().currentRoute;
          useHead({
            htmlAttrs: {
              class: () => route.value.name
            }
          });
          useHead({
        meta: [
          { name: 'description', content: "Hi, welcome to the %envName v%app.version of %siteName." },
        ]
      });
          useHead({
        title: data.value.page?.title,
      })
          const __returned__ = { route };
          Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
          return __returned__;
        }
      });
      import { resolveComponent as _resolveComponent, createVNode as _createVNode, createElementVNode as _createElementVNode, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue";
      const _hoisted_1 = { style: { "margin-top": "30px" } };
      function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
        const _component_NuxtPage = _resolveComponent("NuxtPage");
        const _component_DebugHead = _resolveComponent("DebugHead");
        return _openBlock(), _createElementBlock("div", null, [
          _createElementVNode("div", null, [
            _createVNode(_component_NuxtPage)
          ]),
          _createElementVNode("div", _hoisted_1, [
            _createVNode(_component_DebugHead)
          ])
        ]);
      }
      _sfc_main.__hmrId = "938b83b0";
      typeof __VUE_HMR_RUNTIME__ !== "undefined" && __VUE_HMR_RUNTIME__.createRecord(_sfc_main.__hmrId, _sfc_main);
      import.meta.hot.accept((mod) => {
        if (!mod)
          return;
        const { default: updated, _rerender_only } = mod;
        if (_rerender_only) {
          __VUE_HMR_RUNTIME__.rerender(updated.__hmrId, updated.render);
        } else {
          __VUE_HMR_RUNTIME__.reload(updated.__hmrId, updated);
        }
      });
      import _export_sfc from "plugin-vue:export-helper";
      export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "/home/harlan/packages/nuxt-head/playground/app.vue"]]);"
    `)
  })

  it('vue sfc example - useServerSeoMeta', async () => {
    const code = await transform(`
import { defineComponent as _defineComponent } from "vue";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "app",
  setup(__props, { expose }) {
    expose();
    useServerHead({
      link: [
        {
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
          rel: "stylesheet"
        }
      ]
    });
    const route = useRouter().currentRoute;
    useHead({
      htmlAttrs: {
        class: () => route.value.name
      }
    });
    useServerSeoMeta({
      title: 'Welcome to %siteName',
      description: "Hi, welcome to the %envName v%app.version of %siteName."
    });
    const __returned__ = { route };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
import { resolveComponent as _resolveComponent, createVNode as _createVNode, createElementVNode as _createElementVNode, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue";
const _hoisted_1 = { style: { "margin-top": "30px" } };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_NuxtPage = _resolveComponent("NuxtPage");
  const _component_DebugHead = _resolveComponent("DebugHead");
  return _openBlock(), _createElementBlock("div", null, [
    _createElementVNode("div", null, [
      _createVNode(_component_NuxtPage)
    ]),
    _createElementVNode("div", _hoisted_1, [
      _createVNode(_component_DebugHead)
    ])
  ]);
}
_sfc_main.__hmrId = "938b83b0";
typeof __VUE_HMR_RUNTIME__ !== "undefined" && __VUE_HMR_RUNTIME__.createRecord(_sfc_main.__hmrId, _sfc_main);
import.meta.hot.accept((mod) => {
  if (!mod)
    return;
  const { default: updated, _rerender_only } = mod;
  if (_rerender_only) {
    __VUE_HMR_RUNTIME__.rerender(updated.__hmrId, updated.render);
  } else {
    __VUE_HMR_RUNTIME__.reload(updated.__hmrId, updated);
  }
});
import _export_sfc from "plugin-vue:export-helper";
export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "/home/harlan/packages/nuxt-head/playground/app.vue"]]);`, 'app.js')

    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "
      import { defineComponent as _defineComponent } from "vue";
      const _sfc_main = /* @__PURE__ */ _defineComponent({
        __name: "app",
        setup(__props, { expose }) {
          expose();
          useServerHead({
            link: [
              {
                href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
                rel: "stylesheet"
              }
            ]
          });
          const route = useRouter().currentRoute;
          useHead({
            htmlAttrs: {
              class: () => route.value.name
            }
          });
          useHead({
        title: 'Welcome to %siteName',
      });
      useServerHead({
        meta: [
          { name: 'description', content: "Hi, welcome to the %envName v%app.version of %siteName." },
        ]
      });
          const __returned__ = { route };
          Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
          return __returned__;
        }
      });
      import { resolveComponent as _resolveComponent, createVNode as _createVNode, createElementVNode as _createElementVNode, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue";
      const _hoisted_1 = { style: { "margin-top": "30px" } };
      function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
        const _component_NuxtPage = _resolveComponent("NuxtPage");
        const _component_DebugHead = _resolveComponent("DebugHead");
        return _openBlock(), _createElementBlock("div", null, [
          _createElementVNode("div", null, [
            _createVNode(_component_NuxtPage)
          ]),
          _createElementVNode("div", _hoisted_1, [
            _createVNode(_component_DebugHead)
          ])
        ]);
      }
      _sfc_main.__hmrId = "938b83b0";
      typeof __VUE_HMR_RUNTIME__ !== "undefined" && __VUE_HMR_RUNTIME__.createRecord(_sfc_main.__hmrId, _sfc_main);
      import.meta.hot.accept((mod) => {
        if (!mod)
          return;
        const { default: updated, _rerender_only } = mod;
        if (_rerender_only) {
          __VUE_HMR_RUNTIME__.rerender(updated.__hmrId, updated.render);
        } else {
          __VUE_HMR_RUNTIME__.reload(updated.__hmrId, updated);
        }
      });
      import _export_sfc from "plugin-vue:export-helper";
      export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "/home/harlan/packages/nuxt-head/playground/app.vue"]]);"
    `)

    expect(code).match(USE_SERVER_HEAD_RE)
    expect(code).match(TITLE_RE)
  })

  it('#407', async () => {
    const code = await transform(`
import { defineComponent as _defineComponent } from "vue";
import { useHead, useSeoMeta } from "@unhead/vue";

const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "app",
  setup(__props, { expose }) {
    expose();
    useHead({ title: 'test' });
    useSeoMeta({ description: 'foo' });
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});`, 'app.js')

    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "
      import { defineComponent as _defineComponent } from "vue";
      import { useHead } from "@unhead/vue";

      const _sfc_main = /* @__PURE__ */ _defineComponent({
        __name: "app",
        setup(__props, { expose }) {
          expose();
          useHead({ title: 'test' });
          useHead({
        meta: [
          { name: 'description', content: 'foo' },
        ]
      });
          Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
          return __returned__;
        }
      });"
    `)
  })

  it('alt import as name', async () => {
    const code = await transform(`
import { defineComponent as _defineComponent } from "vue";
import { useSeoMeta as SEOMETA } from "@unhead/vue";

const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "app",
  setup(__props, { expose }) {
    expose();
    SEOMETA({});
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});`, 'app.js')

    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "
      import { defineComponent as _defineComponent } from "vue";
      import { useHead } from "@unhead/vue";

      const _sfc_main = /* @__PURE__ */ _defineComponent({
        __name: "app",
        setup(__props, { expose }) {
          expose();
          useHead({
      });
          Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
          return __returned__;
        }
      });"
    `)
  })

  it('handles empty meta objects', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({})',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      useHead({
      })"
    `)
  })

  it('handles complex meta properties', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({',
      ' ogTitle: "My Page",',
      ' ogDescription: "My Description",',
      ' ogImage: "https://example.com/image.jpg",',
      ' twitterCard: "summary_large_image"',
      '})',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      useHead({
        meta: [
          { property: 'og:title', content: "My Page" },
          { property: 'og:description', content: "My Description" },
          { property: 'og:image', content: "https://example.com/image.jpg" },
          { name: 'twitter:card', content: "summary_large_image" },
        ]
      })"
    `)
  })

  it('handles template literals', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'const name = "World"',
      'useSeoMeta({',
      // eslint-disable-next-line no-template-curly-in-string
      ' title: `Hello ${name}`,',
      // eslint-disable-next-line no-template-curly-in-string
      ' description: `Welcome to ${name}`',
      '})',
      'console.log(useSeoMeta)',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "import { useHead, useSeoMeta } from 'unhead'
      const name = "World"
      useHead({
        title: \`Hello \${name}\`,
        meta: [
          { name: 'description', content: \`Welcome to \${name}\` },
        ]
      })
      console.log(useSeoMeta)"
    `)
  })

  it('handles multiple imports and transformations', async () => {
    const code = await transform([
      'import { useSeoMeta, useServerSeoMeta } from \'unhead\'',
      'useSeoMeta({ title: "Client" })',
      'useServerSeoMeta({ description: "Server" })',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "import { useHead, useServerHead } from 'unhead'
      useHead({
        title: "Client",
      })
      useServerHead({
        meta: [
          { name: 'description', content: "Server" },
        ]
      })"
    `)
  })

  it('handles conditional meta values', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'const condition = true',
      'useSeoMeta({',
      ' title: condition ? "True Title" : "False Title",',
      ' description: condition && "Conditional Description"',
      '})',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      const condition = true
      useHead({
        title: condition ? "True Title" : "False Title",
        meta: [
          { name: 'description', content: condition && "Conditional Description" },
        ]
      })"
    `)
  })

  it('preserves second argument (options) when present', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'@unhead/vue\'',
      'useSeoMeta({ title: \'Hello\', description: \'World\' }, { head })',
    ])
    expect(code).toBeDefined()
    expect(code).toContain('{ head }')
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from '@unhead/vue'
      useHead({
        title: 'Hello',
        meta: [
          { name: 'description', content: 'World' },
        ]
      }, { head })"
    `)
  })

  it('preserves complex second argument', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ description: \'Test\' }, { head, tagPriority: \'high\' })',
    ])
    expect(code).toBeDefined()
    expect(code).toContain('{ head, tagPriority: \'high\' }')
  })

  it('handles #import', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'#imports\'',
      'const condition = true',
      'useSeoMeta({',
      ' title: condition ? "True Title" : "False Title",',
      ' description: condition && "Conditional Description"',
      '})',
    ], 'some-id.js', {
      importPaths: ['#imports'],
    })
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from '#imports'
      const condition = true
      useHead({
        title: condition ? "True Title" : "False Title",
        meta: [
          { name: 'description', content: condition && "Conditional Description" },
        ]
      })"
    `)
  })

  it('respects imports: false', async () => {
    const opts = { imports: false }
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ title: \'Hello\', description: \'World\' })',
    ], 'some-id.js', opts)
    expect(code).toBeDefined()
    // the call is still transformed, but the import specifier is untouched
    expect(code).toContain('import { useSeoMeta } from \'unhead\'')
    expect(code).toContain('useHead({')
    expect(code).not.toContain('import { useHead }')
    // the user-supplied options object must not be mutated
    expect(opts.imports).toBe(false)
  })
})
