import { createHead, renderSSRHead, useHead } from 'unhead/precompiled/server'

export function render() {
  const head = createHead({ disableDefaults: true })
  useHead({ title: 'Rollup precompile' }, { head })
  return renderSSRHead(head)
}
