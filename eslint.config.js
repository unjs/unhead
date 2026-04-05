import antfu from '@antfu/eslint-config'
import harlanzw from 'eslint-plugin-harlanzw'

export default antfu(
  {
    rules: {
      'no-use-before-define': 'off',
      'ts/ban-ts-comment': 'off',
    },
  },
  {
    ignores: [
      'examples/*',
      '**/*.md',
    ],
  },
  ...harlanzw(),
  {
    rules: {
      'harlanzw/vue-no-faux-composables': 'off',
    },
  },
  {
    files: ['**/test/**/*.ts'],
    rules: {
      'harlanzw/vue-no-nested-reactivity': 'off',
    },
  },
)
