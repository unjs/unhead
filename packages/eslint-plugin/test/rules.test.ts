import { RuleTester } from 'eslint'
import { nonAbsoluteCanonical } from '../src/rules/canonical-rules'
import { emptyMetaContent } from '../src/rules/empty-meta-content'
import { preloadFontCrossorigin, preloadMissingAs } from '../src/rules/preload-rules'
import { robotsConflict } from '../src/rules/robots-conflict'
import { deferOnModuleScript, scriptSrcWithContent } from '../src/rules/script-rules'
import { noHtmlInTitle } from '../src/rules/title-rules'
import { twitterHandleMissingAt } from '../src/rules/twitter-handle-missing-at'
import { viewportUserScalable } from '../src/rules/viewport-user-scalable'

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
})

tester.run('viewport-user-scalable', viewportUserScalable, {
  valid: [
    `useHead({ meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }] })`,
  ],
  invalid: [
    {
      code: `useHead({ meta: [{ name: 'viewport', content: 'width=device-width, user-scalable=no' }] })`,
      errors: [{ message: /user-scalable=no/ }],
    },
    {
      code: `useHead({ meta: [{ name: 'viewport', content: 'maximum-scale=1' }] })`,
      errors: [{ message: /maximum-scale=1/ }],
    },
  ],
})

tester.run('twitter-handle-missing-at', twitterHandleMissingAt, {
  valid: [
    `useHead({ meta: [{ name: 'twitter:site', content: '@harlan_zw' }] })`,
    `useHead({ meta: [{ name: 'twitter:creator', content: '12345' }] })`,
  ],
  invalid: [
    {
      code: `useHead({ meta: [{ name: 'twitter:site', content: 'harlan_zw' }] })`,
      output: `useHead({ meta: [{ name: 'twitter:site', content: '@harlan_zw' }] })`,
      errors: [{ message: /should start with "@"/ }],
    },
  ],
})

tester.run('robots-conflict', robotsConflict, {
  valid: [
    `useHead({ meta: [{ name: 'robots', content: 'index, follow' }] })`,
    `useHead({ meta: [{ name: 'robots', content: 'noindex' }] })`,
  ],
  invalid: [
    {
      code: `useHead({ meta: [{ name: 'robots', content: 'index, noindex' }] })`,
      errors: [{ message: /"index" and "noindex"/ }],
    },
    {
      code: `useHead({ meta: [{ name: 'robots', content: 'follow, nofollow' }] })`,
      errors: [{ message: /"follow" and "nofollow"/ }],
    },
  ],
})

tester.run('defer-on-module-script', deferOnModuleScript, {
  valid: [
    `useHead({ script: [{ src: '/x.js', type: 'module' }] })`,
    `useHead({ script: [{ src: '/x.js', defer: true }] })`,
  ],
  invalid: [
    {
      code: `useHead({ script: [{ src: '/x.js', type: 'module', defer: true }] })`,
      output: `useHead({ script: [{ src: '/x.js', type: 'module' }] })`,
      errors: [{ message: /redundant on module scripts/ }],
    },
  ],
})

tester.run('script-src-with-content', scriptSrcWithContent, {
  valid: [
    `useHead({ script: [{ src: '/x.js' }] })`,
    `useHead({ script: [{ innerHTML: 'console.log(1)' }] })`,
  ],
  invalid: [
    {
      code: `useHead({ script: [{ src: '/x.js', innerHTML: 'console.log(1)' }] })`,
      errors: [{ message: /both "src" and inline content/ }],
    },
  ],
})

tester.run('preload-missing-as', preloadMissingAs, {
  valid: [
    `useHead({ link: [{ rel: 'preload', href: '/a.js', as: 'script' }] })`,
    `useHead({ link: [{ rel: 'stylesheet', href: '/a.css' }] })`,
  ],
  invalid: [
    {
      code: `useHead({ link: [{ rel: 'preload', href: '/a.woff2' }] })`,
      errors: [{ message: /missing the required "as"/ }],
    },
  ],
})

tester.run('preload-font-crossorigin', preloadFontCrossorigin, {
  valid: [
    `useHead({ link: [{ rel: 'preload', href: '/f.woff2', as: 'font', crossorigin: 'anonymous' }] })`,
    `useHead({ link: [{ rel: 'preload', href: '/a.js', as: 'script' }] })`,
  ],
  invalid: [
    {
      code: `useHead({ link: [{ rel: 'preload', href: '/f.woff2', as: 'font' }] })`,
      output: `useHead({ link: [{ rel: 'preload', href: '/f.woff2', as: 'font', crossorigin: 'anonymous' }] })`,
      errors: [{ message: /Font preload requires "crossorigin"/ }],
    },
  ],
})

tester.run('non-absolute-canonical', nonAbsoluteCanonical, {
  valid: [
    `useHead({ link: [{ rel: 'canonical', href: 'https://example.com/' }] })`,
    `useHead({ link: [{ rel: 'canonical', href: someVar }] })`,
  ],
  invalid: [
    {
      code: `useHead({ link: [{ rel: 'canonical', href: '/about' }] })`,
      errors: [{ message: /Canonical URL should be absolute/ }],
    },
  ],
})

tester.run('no-html-in-title', noHtmlInTitle, {
  valid: [
    `useHead({ title: 'Hello world' })`,
    `useSeoMeta({ title: 'Plain' })`,
  ],
  invalid: [
    {
      code: `useHead({ title: 'Hello <b>world</b>' })`,
      errors: [{ message: /HTML characters/ }],
    },
    {
      code: `useSeoMeta({ title: '<b>x</b>' })`,
      errors: [{ message: /HTML characters/ }],
    },
  ],
})

tester.run('empty-meta-content', emptyMetaContent, {
  valid: [
    `useHead({ meta: [{ name: 'description', content: 'hi' }] })`,
    `useHead({ meta: [{ charset: 'utf-8' }] })`,
  ],
  invalid: [
    {
      code: `useHead({ meta: [{ name: 'description', content: '' }] })`,
      errors: [{ message: /"description" has empty content/ }],
    },
  ],
})
