throw new Error(
  '[unhead] `@unhead/addons/webpack` has been removed. '
  + 'Use your framework bundler entry instead, e.g. '
  + '`import { Unhead } from \'@unhead/{vue,react,svelte,solid-js}/bundler\'` '
  + 'and `Unhead().webpack()`.',
)
