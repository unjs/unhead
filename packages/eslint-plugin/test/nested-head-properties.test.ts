import { RuleTester } from 'eslint'
import { nestedHeadProperties } from '../src/rules/nested-head-properties'

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
})

tester.run('nested-head-properties', nestedHeadProperties, {
  valid: [
    `useHead({ bodyAttrs: { title: 'Tooltip', style: 'color: red', 'data-theme': 'dark' } })`,
    `useHead({ htmlAttrs: { lang: 'en', title: 'Tooltip', style: 'color-scheme: dark' } })`,
    `useHead({ bodyAttrs: { style: ['color: red'], titleTemplate: null } })`,
    `useHead({ bodyAttrs: { meta: 'custom-value', script: 'module', link: '/feed' } })`,
    `useHead({ bodyAttrs: { title: 'Tooltip', meta: metadata } })`,
    `useHead({ bodyAttrs })`,
    `useSeoMeta({ title: 'Home', description: 'Hello' })`,
  ],
  invalid: [
    {
      code: `useHead({ bodyAttrs: { title: 'Home', titleTemplate: '%s | Site', meta: [] } })`,
      errors: [{
        message: /bodyAttrs looks like a nested head input because its shape includes "title", "titleTemplate", "meta"/,
      }],
    },
    {
      code: `useServerHead({ htmlAttrs: { lang: 'en', script: [{ src: '/analytics.js' }] } })`,
      errors: [{
        message: /htmlAttrs looks like a nested head input because its shape includes "script"/,
      }],
    },
    {
      code: `useHead({ bodyAttrs: { title: \`Page \${id}\`, titleTemplate: \`\${site} | %s\` } })`,
      errors: [{
        message: /bodyAttrs looks like a nested head input because its shape includes "title", "titleTemplate"/,
      }],
    },
  ],
})
