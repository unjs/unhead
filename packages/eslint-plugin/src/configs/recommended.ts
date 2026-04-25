import type { Linter } from 'eslint'

const recommendedRules: Linter.RulesRecord = {
  '@unhead/defer-on-module-script': 'warn',
  '@unhead/empty-meta-content': 'warn',
  '@unhead/no-deprecated-props': 'error',
  '@unhead/no-html-in-title': 'warn',
  '@unhead/no-unknown-meta': 'warn',
  '@unhead/non-absolute-canonical': 'warn',
  '@unhead/numeric-tag-priority': 'warn',
  '@unhead/preload-font-crossorigin': 'error',
  '@unhead/preload-missing-as': 'error',
  '@unhead/robots-conflict': 'error',
  '@unhead/script-src-with-content': 'error',
  '@unhead/twitter-handle-missing-at': 'warn',
  '@unhead/viewport-user-scalable': 'warn',
}

export const recommended: Linter.Config = {
  plugins: {},
  rules: recommendedRules,
}

export const migration: Linter.Config = {
  plugins: {},
  rules: {
    ...recommendedRules,
    '@unhead/prefer-define-helpers': 'warn',
  },
}
