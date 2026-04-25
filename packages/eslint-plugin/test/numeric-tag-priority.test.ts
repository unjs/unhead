import { RuleTester } from 'eslint'
import { numericTagPriority } from '../src/rules/numeric-tag-priority'

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
})

tester.run('numeric-tag-priority', numericTagPriority, {
  valid: [
    `useHead({ link: [{ rel: 'preload', href: '/a.js', tagPriority: 'critical' }] })`,
    `defineLink({ rel: 'preload', href: '/a.js', tagPriority: 'before:my-tag' })`,
    `useHead({ link: [{ rel: 'preload', href: '/a.js' }] })`,
  ],
  invalid: [
    {
      code: `useHead({ link: [{ rel: 'preload', href: '/a.js', tagPriority: 1 }] })`,
      errors: [{
        messageId: 'numeric',
        suggestions: [
          { messageId: 'suggestCritical', output: `useHead({ link: [{ rel: 'preload', href: '/a.js', tagPriority: 'critical' }] })` },
          { messageId: 'suggestHigh', output: `useHead({ link: [{ rel: 'preload', href: '/a.js', tagPriority: 'high' }] })` },
          { messageId: 'suggestLow', output: `useHead({ link: [{ rel: 'preload', href: '/a.js', tagPriority: 'low' }] })` },
        ],
      }],
    },
    {
      code: `defineScript({ src: '/x.js', tagPriority: 100 })`,
      errors: [{
        messageId: 'numeric',
        suggestions: [
          { messageId: 'suggestCritical', output: `defineScript({ src: '/x.js', tagPriority: 'critical' })` },
          { messageId: 'suggestHigh', output: `defineScript({ src: '/x.js', tagPriority: 'high' })` },
          { messageId: 'suggestLow', output: `defineScript({ src: '/x.js', tagPriority: 'low' })` },
        ],
      }],
    },
  ],
})
