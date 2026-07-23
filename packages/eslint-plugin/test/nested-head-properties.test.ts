import { RuleTester } from 'eslint'
import { nestedHeadProperties } from '../src/rules/nested-head-properties'

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
})

tester.run('nested-head-properties', nestedHeadProperties, {
  valid: [
    `useHead({ bodyAttrs: { title: 'Tooltip', style: 'color: red', 'data-theme': 'dark' } })`,
    `useHead({ htmlAttrs: { lang: 'en', title: 'Tooltip', style: 'color-scheme: dark' } })`,
    `useHead({ bodyAttrs })`,
    `useSeoMeta({ title: 'Home', description: 'Hello' })`,
  ],
  invalid: [
    {
      code: `useHead({ bodyAttrs: { title: 'Home', titleTemplate: '%s | Site', meta: [] } })`,
      errors: [{
        message: /bodyAttrs contains head configuration properties "titleTemplate", "meta"/,
      }],
    },
    {
      code: `useServerHead({ htmlAttrs: { lang: 'en', script: [{ src: '/analytics.js' }] } })`,
      errors: [{
        message: /htmlAttrs contains head configuration property "script"/,
      }],
    },
  ],
})
