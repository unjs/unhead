import { describe, expect, it } from 'vitest'
import { TreeshakeServerComposables } from '../src/unplugin/TreeshakeServerComposables'

const USE_SERVER_HEAD_RE = /useServerHead/

function environmentContext(consumer: 'client' | 'server') {
  return { environment: { config: { consumer } } }
}

async function transformWith(plugin: any, code: string | string[], id = 'some-id.js', ctx: any = environmentContext('client')) {
  if (plugin.transformInclude && !plugin.transformInclude(id))
    return
  const handler = typeof plugin.transform === 'function' ? plugin.transform : plugin.transform.handler
  const res = await handler.call(
    ctx,
    Array.isArray(code) ? code.join('\n') : code,
    id,
  )
  return res?.code
}

async function transform(code: string | string[], id = 'some-id.js', ctx?: any) {
  return transformWith(TreeshakeServerComposables.vite({}) as any, code, id, ctx)
}

describe('treeshakeServerComposables', () => {
  const couldTransform = [
    'import { useServerHead } from \'unhead\'',
    'useServerHead({ title: \'Hello\', description: \'World\' })',
  ]

  it('ignores non-JS files', async () => {
    expect(await transform(couldTransform, 'test.css')).toBeUndefined()
  })

  it('transforms vue script blocks', async () => {
    expect(await transform(couldTransform, 'test.vue?type=script')).toBeDefined()
    expect(await transform(couldTransform, 'test.vue')).toBeDefined()
    expect(await transform(couldTransform, 'test.vue?type=template')).toBeUndefined()
  })

  it('useServerSeoMeta', async () => {
    const code = await transform([
      'useServerSeoMeta({ title: \'Hello\', description: \'World\'  })',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot('""')
  })

  it('vue sfc example', async () => {
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
          
          const route = useRouter().currentRoute;
          useHead({
            htmlAttrs: {
              class: () => route.value.name
            }
          });
          useSeoMeta({
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
      export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "/home/harlan/packages/nuxt-head/playground/app.vue"]]);"
    `)

    expect(code).not.toMatch(USE_SERVER_HEAD_RE)
  })

  describe('scope tracking', () => {
    it('removes calls proven to be unhead imports', async () => {
      const code = await transform([
        'import { useServerHead } from \'unhead\'',
        'useServerHead({ title: \'Hello\' })',
        'console.log(\'kept\')',
      ])
      expect(code).toBeDefined()
      expect(code).not.toMatch(/useServerHead\(/)
      expect(code).toContain('console.log(\'kept\')')
    })

    it('removes aliased unhead imports', async () => {
      const code = await transform([
        'import { useServerHead as x } from \'@unhead/vue\'',
        'x({ title: \'Hello\' })',
        'console.log(\'kept\')',
      ])
      expect(code).toBeDefined()
      expect(code).not.toMatch(/x\(\{/)
      expect(code).toContain('console.log(\'kept\')')
    })

    it('removes undeclared bare names (auto-import)', async () => {
      const code = await transform([
        'useServerSeoMeta({ description: \'World\' })',
        'console.log(\'kept\')',
      ])
      expect(code).toBeDefined()
      expect(code).not.toMatch(/useServerSeoMeta/)
      expect(code).toContain('console.log(\'kept\')')
    })

    it('retains locally declared functions with matching names', async () => {
      expect(await transform([
        'function useServerHead(input) { return input }',
        'useServerHead({ title: \'Hello\' })',
      ])).toBeUndefined()

      expect(await transform([
        'const useServerSeoMeta = (input) => input',
        'useServerSeoMeta({ description: \'World\' })',
      ])).toBeUndefined()
    })

    it('retains calls above a hoisted local declaration', async () => {
      // Function declarations hoist: this call targets the local function
      // below it, not an auto-import.
      expect(await transform([
        'useServerHead({ title: \'Hello\' })',
        'function useServerHead(input) { return input }',
      ])).toBeUndefined()

      expect(await transform([
        'useServerSeoMeta({ description: \'World\' })',
        'var useServerSeoMeta = (input) => input',
      ])).toBeUndefined()
    })

    it('retains shadowed names in nested scopes', async () => {
      expect(await transform([
        'export function setup(useServerHead) {',
        '  useServerHead({ title: \'Hello\' })',
        '}',
      ])).toBeUndefined()
    })

    it('retains imports from non-unhead packages', async () => {
      expect(await transform([
        'import { useServerHead } from \'other-lib\'',
        'useServerHead({ title: \'Hello\' })',
      ])).toBeUndefined()
    })
  })

  describe('build target', () => {
    it('retains server composables in server environments', async () => {
      expect(await transform(couldTransform, 'some-id.js', environmentContext('server'))).toBeUndefined()
    })

    it('retains server composables when the target is unknown', async () => {
      expect(await transform(couldTransform, 'some-id.js', {})).toBeUndefined()
    })

    it('handles client and server environments independently on one plugin instance', async () => {
      const plugin = TreeshakeServerComposables.vite({}) as any
      expect(plugin.sharedDuringBuild).toBe(true)

      const client = await transformWith(plugin, couldTransform, 'some-id.js', environmentContext('client'))
      const server = await transformWith(plugin, couldTransform, 'some-id.js', environmentContext('server'))
      const clientAgain = await transformWith(plugin, couldTransform, 'some-id.js', environmentContext('client'))

      expect(client).toBeDefined()
      expect(client).not.toMatch(/useServerHead\(/)
      expect(server).toBeUndefined()
      expect(clientAgain).toEqual(client)
    })

    it('vite apply installs for client and SSR builds but not serve', () => {
      const plugin = TreeshakeServerComposables.vite({}) as any
      expect(plugin.apply({}, { command: 'build', isSsrBuild: false })).toBe(true)
      expect(plugin.apply({}, { command: 'build', isSsrBuild: true })).toBe(true)
      expect(plugin.apply({}, { command: 'serve', isSsrBuild: false })).toBe(false)
    })

    it('uses the apply() fallback when no environment is available', async () => {
      const clientPlugin = TreeshakeServerComposables.vite({}) as any
      clientPlugin.apply({}, { command: 'build', isSsrBuild: false })
      expect(await transformWith(clientPlugin, couldTransform, 'some-id.js', {})).toBeDefined()

      const ssrPlugin = TreeshakeServerComposables.vite({}) as any
      ssrPlugin.apply({}, { command: 'build', isSsrBuild: true })
      expect(await transformWith(ssrPlugin, couldTransform, 'some-id.js', {})).toBeUndefined()
    })
  })
})
