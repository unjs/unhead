import { defineComponent } from 'vue'
import type { VNode } from 'vue'
import { Vue2 } from './env'
import type { ReactiveHead, UseHeadInput } from './types'
import { useHead } from './composables'

export type Props = Readonly<Record<string, any>>

const addVNodeToHeadObj = (node: VNode, obj: ReactiveHead) => {
  // @ts-expect-error vue2 vnode API
  const nodeType = Vue2 ? node.tag : node.type
  const type
    = nodeType === 'html'
      ? 'htmlAttrs'
      : nodeType === 'body'
        ? 'bodyAttrs'
        : (nodeType as keyof ReactiveHead)

  if (typeof type !== 'string' || !(type in obj))
    return

  // @ts-expect-error untyped
  const nodeData = Vue2 ? node.data : node
  const props: Record<string, any> = (Vue2 ? nodeData.attrs : node.props) || {}
  // handle class and style attrs
  if (Vue2) {
    if (nodeData.staticClass)
      props.class = nodeData.staticClass
    if (nodeData.staticStyle)
      props.style = Object.entries(nodeData.staticStyle).map(([key, value]) => `${key}:${value}`).join(';')
  }
  if (node.children) {
    const childrenAttr = Vue2 ? 'text' : 'children'
    props.children = Array.isArray(node.children)
      // @ts-expect-error untyped
      ? node.children[0]![childrenAttr]
      // @ts-expect-error vue2 vnode API
      : node[childrenAttr]
  }
  if (Array.isArray(obj[type])) {
    // @ts-expect-error untyped
    obj[type].push(props)
  }
  else if (type === 'title') { obj.title = props.children }
  else {
    // @ts-expect-error untyped
    obj[type] = props
  }
}

const vnodesToHeadObj = (nodes: VNode[]) => {
  const obj: UseHeadInput = {
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

export const Head = /* @__PURE__ */ defineComponent({
  // eslint-disable-next-line vue/no-reserved-component-names
  name: 'Head',

  setup(_, { slots }) {
    return () => {
      // @ts-expect-error untyped
      useHead(() => vnodesToHeadObj(slots.default()))
      return null
    }
  },
})
