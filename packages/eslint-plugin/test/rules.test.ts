import { RuleTester } from 'eslint'
import { nonAbsoluteCanonical } from '../src/rules/canonical-rules'
import { emptyMetaContent } from '../src/rules/empty-meta-content'
import { noUnknownMeta } from '../src/rules/no-unknown-meta'
import { preferDefineHelpers } from '../src/rules/prefer-define-helpers'
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
      output: `useHead({ meta: [{ name: 'twitter:site', content: "@harlan_zw" }] })`,
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

tester.run('no-unknown-meta', noUnknownMeta, {
  valid: [
    `useHead({ meta: [{ name: 'description', content: 'A page' }] })`,
    // `meta[name]` is case-insensitive, so mixed-case known names stay silent.
    `useHead({ meta: [{ name: 'Description', content: 'A page' }] })`,
    `useHead({ meta: [{ property: 'og:title', content: 'My page' }] })`,
    // Non-OG namespaces are out of scope for `property` typo detection.
    `useHead({ meta: [{ property: 'music:musician', content: 'Somebody' }] })`,
    // Dynamic values can't be typo-checked.
    `useHead({ meta: [{ name: someName, content: 'A page' }] })`,
  ],
  invalid: [
    {
      code: `useHead({ meta: [{ name: 'descripton', content: 'A page' }] })`,
      output: `useHead({ meta: [{ name: 'description', content: 'A page' }] })`,
      errors: [{ message: /Unknown meta name "descripton"\. Did you mean "description"\?/ }],
    },
    {
      code: `useHead({ meta: [{ property: 'og:titel', content: 'My page' }] })`,
      output: `useHead({ meta: [{ property: 'og:title', content: 'My page' }] })`,
      errors: [{ message: /Unknown meta property "og:titel"\. Did you mean "og:title"\?/ }],
    },
    {
      // Both sides of the tag are flagged in one pass: property first, then name.
      code: `useHead({ meta: [{ property: 'og:descrption', name: 'descripton' }] })`,
      output: `useHead({ meta: [{ property: 'og:description', name: 'description' }] })`,
      errors: [
        { message: /Unknown meta property "og:descrption"\. Did you mean "og:description"\?/ },
        { message: /Unknown meta name "descripton"\. Did you mean "description"\?/ },
      ],
    },
    {
      // The message quotes the original casing; the fix writes the canonical value.
      code: `useHead({ meta: [{ name: 'Descripton', content: 'A page' }] })`,
      output: `useHead({ meta: [{ name: 'description', content: 'A page' }] })`,
      errors: [{ message: /Unknown meta name "Descripton"\. Did you mean "description"\?/ }],
    },
  ],
})

tester.run('prefer-define-helpers', preferDefineHelpers, {
  valid: [
    `import { defineLink } from 'unhead'
useHead({ link: [defineLink({ rel: 'icon' })] })`,
    // Only link/script entries are in scope.
    `useHead({ meta: [{ name: 'description', content: 'A page' }] })`,
    // The object (non-array) form is not flagged, only array entries.
    `useHead({ link: { rel: 'canonical', href: 'https://example.com/' } })`,
    // Inputs outside head composables are not scanned.
    `makeTags({ link: [{ rel: 'icon' }] })`,
  ],
  invalid: [
    {
      // Without an import there is no safe autofix, only a suggestion.
      code: `useHead({ link: [{ rel: 'icon', href: '/favicon.png' }] })`,
      errors: [{
        message: /Wrap this link entry in `defineLink\(\)`/,
        suggestions: [{
          desc: 'Wrap in `defineLink()` (you may need to import it).',
          output: `useHead({ link: [defineLink({ rel: 'icon', href: '/favicon.png' })] })`,
        }],
      }],
    },
    {
      // An imported helper turns the report into a plain autofix.
      code: `import { defineLink } from 'unhead'
useHead({ link: [{ rel: 'icon', href: '/i.png' }] })`,
      output: `import { defineLink } from 'unhead'
useHead({ link: [defineLink({ rel: 'icon', href: '/i.png' })] })`,
      errors: [{ message: /Wrap this link entry in `defineLink\(\)`/ }],
    },
    {
      // Renamed imports wrap with the local binding name.
      code: `import { defineScript as ds } from '@unhead/vue'
useHead({ script: [{ src: '/x.js' }] })`,
      output: `import { defineScript as ds } from '@unhead/vue'
useHead({ script: [ds({ src: '/x.js' })] })`,
      errors: [{ message: /Wrap this script entry in `defineScript\(\)`/ }],
    },
    {
      // Helpers imported from unrelated packages don't count.
      code: `import { defineLink } from 'some-other-lib'
useHead({ link: [{ rel: 'icon' }] })`,
      errors: [{
        message: /Wrap this link entry in `defineLink\(\)`/,
        suggestions: [{
          desc: 'Wrap in `defineLink()` (you may need to import it).',
          output: `import { defineLink } from 'some-other-lib'
useHead({ link: [defineLink({ rel: 'icon' })] })`,
        }],
      }],
    },
    {
      // Every unhelped entry in the array is reported.
      code: `useHead({ script: [{ src: '/a.js' }, { src: '/b.js' }] })`,
      errors: [
        {
          message: /Wrap this script entry in `defineScript\(\)`/,
          suggestions: [{
            desc: 'Wrap in `defineScript()` (you may need to import it).',
            output: `useHead({ script: [defineScript({ src: '/a.js' }), { src: '/b.js' }] })`,
          }],
        },
        {
          message: /Wrap this script entry in `defineScript\(\)`/,
          suggestions: [{
            desc: 'Wrap in `defineScript()` (you may need to import it).',
            output: `useHead({ script: [{ src: '/a.js' }, defineScript({ src: '/b.js' })] })`,
          }],
        },
      ],
    },
  ],
})
