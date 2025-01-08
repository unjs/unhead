import { parse } from 'acorn-loose'
import { describe, expect, it } from 'vitest'
import { TreeshakeServerComposables } from '../src/unplugin/TreeshakeServerComposables'

async function transform(code: string | string[], id = 'some-id.js') {
  const plugin = TreeshakeServerComposables.vite() as any
  const res = await plugin.transform.call(
    { parse: (code: string) => parse(code, { ecmaVersion: 2022, sourceType: 'module' }) },
    Array.isArray(code) ? code.join('\n') : code,
    id,
  )
  return res?.code
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
          ;
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

    expect(code).not.toMatch(/useServerHead/)
  })
})
