import { RuleTester } from 'eslint'
import { inputShape } from '../src/rules/input-shape'

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
})

tester.run('invalid-input-shape', inputShape, {
  valid: [
    `useHead({ bodyAttrs: { title: 'Tooltip', style: 'color: red', 'data-theme': 'dark' } })`,
    `useHead({ htmlAttrs: { lang: 'en', title: 'Tooltip', style: 'color-scheme: dark' } })`,
    `useHead({ bodyAttrs: { style: ['color: red'], titleTemplate: null } })`,
    `useHead({ bodyAttrs: { meta: 'custom-value', script: 'module', link: '/feed' } })`,
    `useHead({ bodyAttrs: { title: 'Tooltip', meta: metadata } })`,
    `useHead({ meta: computed(() => []), bodyAttrs: ref({ title: 'Tooltip' }) })`,
    `useHead({ bodyAttrs })`,
    `useSeoMeta({ title: 'Home', description: 'Hello' })`,
  ],
  invalid: [
    {
      code: `useHead({ bodyAttrs: { title: 'Home', titleTemplate: '%s | Site', meta: [] } })`,
      errors: [
        { message: /"titleTemplate" has a head input shape but appears in bodyAttrs/ },
        { message: /"meta" has a head input shape but appears in bodyAttrs/ },
      ],
    },
    {
      code: `useServerHead({ htmlAttrs: { lang: 'en', script: [{ src: '/analytics.js' }] } })`,
      errors: [{
        message: /"script" has a head input shape but appears in htmlAttrs/,
      }],
    },
    {
      code: `useHead({ bodyAttrs: { title: \`Page \${id}\`, titleTemplate: \`\${site} | %s\` } })`,
      errors: [{
        message: /"titleTemplate" has a head input shape but appears in bodyAttrs/,
      }],
    },
    {
      code: `useHead({ htmlAttrs: [], meta: {} })`,
      errors: [
        { message: /"htmlAttrs" in a head input must be one of/ },
        { message: /"meta" in a head input must be one of/ },
      ],
    },
    {
      code: `useHead({ bodyAttrs: { 'data-options': {} } })`,
      errors: [{ message: /"data-options" in bodyAttrs must resolve to a scalar attribute value/ }],
    },
    {
      code: `useSeoMeta({ title: 'Home', meta: [] })`,
      errors: [{ message: /"meta" has a head input shape but appears in seoMeta/ }],
    },
  ],
})
