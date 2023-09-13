import {defineHeadPlugin, tagWeight} from '@unhead/shared'

const importRe = /@import/

/* @__NO_SIDE_EFFECTS__ */ export function CapoPlugin(options: { track?: boolean }) {
  return defineHeadPlugin({
    hooks: {
      'tags:beforeResolve': function ({ tags }) {
        // handle 9 and down in capo
        for (const tag of tags) {
          if (tag.tagPosition && tag.tagPosition !== 'head')
            continue
          tag.tagPriority = tag.tagPriority || tagWeight(tag)
          // skip if already prioritised
          if (tag.tagPriority !== 100)
            continue

          const isTruthy = (val?: string | boolean) => val === '' || val === true

          const isScript = tag.tag === 'script'
          const isLink = tag.tag === 'link'
          if (isScript && isTruthy(tag.props.async)) {
            // ASYNC_SCRIPT
            tag.tagPriority = 30
            // SYNC_SCRIPT
          }
          else if (tag.tag === 'style' && tag.innerHTML && importRe.test(tag.innerHTML)) {
            // IMPORTED_STYLES
            tag.tagPriority = 40
          }
          else if (isScript && tag.props.src && !isTruthy(tag.props.defer) && !isTruthy(tag.props.async) && tag.props.type !== 'module' && !tag.props.type?.endsWith('json')) {
            tag.tagPriority = 50
          }
          else if ((isLink && tag.props.rel === 'stylesheet') || tag.tag === 'style') {
            // SYNC_STYLES
            tag.tagPriority = 60
          }
          else if (isLink && ['preload', 'modulepreload'].includes(tag.props.rel)) {
            // PRELOAD
            tag.tagPriority = 70
          }
          else if (isScript && isTruthy(tag.props.defer) && tag.props.src && !isTruthy(tag.props.async)) {
            // DEFER_SCRIPT
            tag.tagPriority = 80
          }
          else if (isLink && ['prefetch', 'dns-prefetch', 'prerender'].includes(tag.props.rel)) {
            tag.tagPriority = 90
          }
        }
        options?.track && tags.push({
          tag: 'htmlAttrs',
          props: {
            'data-capo': '',
          },
        })
      },
    },
  })
}
