import antfu from '@antfu/eslint-config'

export default antfu({
  rules: {
    'no-use-before-define': 'off',
    'ts/ban-ts-comment': 'off',
  },
}, {
  ignores: [
    'examples/*',
  ],
})
