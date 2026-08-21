/** @experimental v4 preview surface: semver-exempt until v4 stabilizes. See packages/unhead/V4_DESIGN.md. */
/**
 * v4 plugin surface for Vue apps. These are plain v4 slot plugins (no Vue
 * coupling); re-exported here so Nuxt's `@unhead/vue/plugins` import maps
 * onto `@unhead/vue/v4/plugins` under the alias. There is no CapoPlugin:
 * capo weights are built into the v4 compiler.
 */
export type {
  CanonicalPluginOptions,
  InferSeoMetaPluginOptions,
  TemplateParams,
} from 'unhead/v4/plugins'
export {
  CanonicalPlugin,
  InferSeoMetaPlugin,
  TemplateParamsPlugin,
  useTemplateParams,
} from 'unhead/v4/plugins'
