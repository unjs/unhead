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
        message: /Numeric tagPriority \(1\)/,
        suggestions: [
          { desc: `Replace with 'critical'`, output: `useHead({ link: [{ rel: 'preload', href: '/a.js', tagPriority: 'critical' }] })` },
          { desc: `Replace with 'high'`, output: `useHead({ link: [{ rel: 'preload', href: '/a.js', tagPriority: 'high' }] })` },
          { desc: `Replace with 'low'`, output: `useHead({ link: [{ rel: 'preload', href: '/a.js', tagPriority: 'low' }] })` },
        ],
      }],
    },
    {
      code: `defineScript({ src: '/x.js', tagPriority: 100 })`,
      errors: [{
        message: /Numeric tagPriority \(100\)/,
        suggestions: [
          { desc: `Replace with 'critical'`, output: `defineScript({ src: '/x.js', tagPriority: 'critical' })` },
          { desc: `Replace with 'high'`, output: `defineScript({ src: '/x.js', tagPriority: 'high' })` },
          { desc: `Replace with 'low'`, output: `defineScript({ src: '/x.js', tagPriority: 'low' })` },
        ],
      }],
    },
  ],
})
