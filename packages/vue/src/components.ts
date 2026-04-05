import type { DefineComponent, Ref, VNode } from 'vue'
import type { ReactiveHead } from './types'
import { defineComponent, onBeforeUnmount, ref, watchEffect } from 'vue'
import { useHead } from './composables'

function extractTextContent(children: VNode['children']): string | undefined {
  if (!children)
    return undefined
  if (typeof children === 'string')
    return children
  if (Array.isArray(children)) {
    // @ts-expect-error untyped vnode children
    const first = children[0]
    if (typeof first === 'string')
      return first
    if (first && typeof first === 'object' && 'children' in first)
      return extractTextContent(first.children as VNode['children'])
  }
  return undefined
}

function addVNodeToHeadObj(node: VNode, obj: ReactiveHead) {
  const nodeType = node.type
  const type
    = nodeType === 'html'
      ? 'htmlAttrs'
      : nodeType === 'body'
        ? 'bodyAttrs'
        : (nodeType as keyof ReactiveHead)

  if (typeof type !== 'string' || !(type in obj))
    return

  const props: Record<string, any> = { ...(node.props || {}) }

  // script uses innerHTML; style, noscript, title use textContent
  const innerKey = type === 'script' ? 'innerHTML' : 'textContent'

  // Map legacy `children` prop to the appropriate inner content key
  if (props.children !== undefined) {
    props[innerKey] = props.children
    delete props.children
  }

  // Extract slot/vnode text content and map to the appropriate inner content key
  if (node.children) {
    const textContent = extractTextContent(node.children)
    if (textContent !== undefined)
      props[innerKey] = textContent
  }

  if (Array.isArray(obj[type]))
    (obj[type] as Record<string, any>[]).push(props)

  else if (type === 'title')
    obj.title = props.textContent ?? props.innerHTML

  else
    (obj[type] as Record<string, any>) = props
}

function vnodesToHeadObj(nodes: VNode[]) {
  const obj: ReactiveHead = {
    title: undefined,
    htmlAttrs: undefined,
    bodyAttrs: undefined,
    base: undefined,
    meta: [],
    link: [],
    style: [],
    script: [],
    noscript: [],
  }

  for (const node of nodes) {
    if (typeof node.type === 'symbol' && Array.isArray(node.children)) {
      for (const childNode of node.children)
        addVNodeToHeadObj(childNode as VNode, obj)
    }
    else {
      addVNodeToHeadObj(node, obj)
    }
  }

  return obj
}

export const Head: DefineComponent = /* @__PURE__ */ defineComponent({

  name: 'Head',

  setup(_, { slots }) {
    const obj: Ref<ReactiveHead> = ref({})

    const entry = useHead(obj)

    onBeforeUnmount(() => {
      entry.dispose()
    })

    return () => {
      watchEffect(() => {
        if (!slots.default)
          return
        entry.patch(vnodesToHeadObj(slots.default()))
      })
      return null
    }
  },
})
