import type { DefineComponent, Ref, VNode } from 'vue'
import type { ReactiveHead } from './types'
import { defineComponent, onBeforeUnmount, ref, watchEffect } from 'vue'
import { useHead } from './composables'

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

  const props: Record<string, any> = (node.props) || {}
  if (node.children) {
    const childrenAttr = 'children'
    props.children = Array.isArray(node.children)
      // @ts-expect-error untyped
      ? node.children[0]![childrenAttr]
      : node[childrenAttr]
  }
  if (Array.isArray(obj[type]))
    (obj[type] as Record<string, any>[]).push(props)

  else if (type === 'title')
    obj.title = props.children

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
