import type { DefineComponent, Ref, VNode } from 'vue'
import { defineComponent, onBeforeUnmount, ref, watchEffect } from 'vue'
import type { ReactiveHead } from '../types'
import { injectHead } from '../composables/injectHead'

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

  const props: Record<string, any> = node.props || {}
  // handle class and style attrs
  if (node.children) {
    props.children = node.children[0]!.children
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
  // eslint-disable-next-line vue/no-reserved-component-names
  name: 'Head',

  setup(_, { slots }) {
    const head = injectHead()
    if (!head) {
      return () => {
        return null
      }
    }

    const obj: Ref<ReactiveHead> = ref({})

    const entry = head.push(obj)

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
