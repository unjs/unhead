import type { Diagnostic, TagPredicate } from './types'

export const deferOnModuleScript: TagPredicate = (tag) => {
  if (tag.tagType !== 'script')
    return []
  if (tag.props.type !== 'module')
    return []
  if (tag.props.defer !== true)
    return []
  const diag: Diagnostic = {
    ruleId: 'defer-on-module-script',
    message: '"defer" is redundant on module scripts. Modules are deferred by default.',
    at: { kind: 'prop', key: 'defer' },
    fix: { type: 'remove-prop', key: 'defer' },
  }
  return [diag]
}

export const scriptSrcWithContent: TagPredicate = (tag) => {
  if (tag.tagType !== 'script')
    return []
  if (typeof tag.props.src !== 'string')
    return []
  if (!tag.keys.has('innerHTML') && !tag.keys.has('textContent'))
    return []
  const diag: Diagnostic = {
    ruleId: 'script-src-with-content',
    message: 'Script has both "src" and inline content. The browser will ignore the inline content.',
  }
  return [diag]
}
