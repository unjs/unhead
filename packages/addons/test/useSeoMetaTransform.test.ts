import { parse } from 'acorn-loose'
import { describe, expect, it } from 'vitest'
import { UseSeoMetaTransform } from '../src/unplugin/UseSeoMetaTransform'

async function transform(code: string | string[], id = 'some-id.js', opts: any = {}) {
  const plugin = UseSeoMetaTransform.vite(opts) as any
  const res = await plugin.transform.call(
    { parse: (code: string) => parse(code, { ecmaVersion: 2022, sourceType: 'module', allowImportExportEverywhere: true, allowAwaitOutsideFunction: true }) },
    Array.isArray(code) ? code.join('\n') : code,
    id,
  )
  return res?.code
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

  it('preserves context for dynamic regexps', async () => {
    expect(
      await transform([
        'import { useSeoMeta } from \'unhead\'',
        'const meta = {}',
        'console.log(useSeoMeta(meta))',
      ]),
    ).not.toBeDefined()
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

  it('handles reactivity', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'import { ref } from \'vue\'',
      'const someValue = { value: \'test\' }',
      'useSeoMeta({ title: \'Hello\', description: () => someValue.value, ogImage: ref(\'test\')  })',
    ])
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      import { ref } from 'vue'
      const someValue = { value: 'test' }
      useHead({
        title: 'Hello',
        meta: [
          { name: 'description', content: () => someValue.value },
          { property: 'og:image', content: ref('test') },
        ]
      })"
    `)
  })

  it('fails gracefully with nested objects', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ title: \'Hello\', robots: { noindex: true, nofollow: true } })',
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
          { property: 'og:image:url', content: 'https://example.com/image.png' },
          { property: 'og:image:width', content: 800 },
          { property: 'og:image:height', content: 600 },
          { property: 'og:image:alt', content: 'My amazing image' },
          { name: 'twitter:image:url', content: 'https://example.com/image.png' },
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

    expect(code).match(/useServerHead/)
    expect(code).match(/title:/)
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
      ' title: `Hello ${name}`,',
      ' description: `Welcome to ${name}`',
      '})'
      + 'console.log(useSeoMeta)',
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
      })console.log(useSeoMeta)"
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
})
