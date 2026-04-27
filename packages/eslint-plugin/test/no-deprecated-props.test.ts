import { RuleTester } from 'eslint'
import { noDeprecatedProps } from '../src/rules/no-deprecated-props'

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
})

tester.run('no-deprecated-props', noDeprecatedProps, {
  valid: [
    `useHead({ script: [{ innerHTML: 'x', key: 'a' }] })`,
    `useHead({ script: [{ src: '/x.js', body: false }] })`,
  ],
  invalid: [
    {
      code: `useHead({ script: [{ children: 'console.log(1)' }] })`,
      output: `useHead({ script: [{ innerHTML: 'console.log(1)' }] })`,
      errors: [{ message: /"children" was removed/ }],
    },
    {
      code: `useHead({ meta: [{ hid: 'desc', name: 'description' }] })`,
      output: `useHead({ meta: [{ key: 'desc', name: 'description' }] })`,
      errors: [{ message: /"hid" was removed/ }],
    },
    {
      code: `useHead({ script: [{ src: '/x.js', body: true }] })`,
      output: `useHead({ script: [{ src: '/x.js', tagPosition: 'bodyClose' }] })`,
      errors: [{ message: /"body" was removed/ }],
    },
  ],
})
