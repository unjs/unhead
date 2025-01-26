import type { ReactiveHead } from '../unhead/types/index'
// eslint-disable-next-line ts/consistent-type-imports
import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core'
import { useHead } from '../unhead/composables'

interface NodeProps {
  type: string
  props?: Record<string, any>
  children?: any[]
}

function addNodeToHeadObj(node: NodeProps, obj: ReactiveHead) {
  const nodeType = node.type
  const type = nodeType === 'html'
    ? 'htmlAttrs'
    : nodeType === 'body'
      ? 'bodyAttrs'
      : nodeType as keyof ReactiveHead

  if (typeof type !== 'string' || !(type in obj))
    return

  const props: Record<string, any> = node.props || {}
  if (node.children) {
    props.children = Array.isArray(node.children)
      ? node.children[0]?.children
      : node.children
  }

  if (Array.isArray(obj[type]))
    (obj[type] as Record<string, any>[]).push(props)
  else if (type === 'title')
    obj.title = props.children
  else
    (obj[type] as Record<string, any>) = props
}

function nodesToHeadObj(nodes: NodeProps[]) {
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
        addNodeToHeadObj(childNode as NodeProps, obj)
    }
    else {
      addNodeToHeadObj(node, obj)
    }
  }

  return obj
}

@Component({
  selector: 'lib-ngx-unhead',
  template: '<ng-content></ng-content>',
})
export class Head implements OnDestroy {
  private headEntry = useHead({})

  constructor(private cdr: ChangeDetectorRef) {
  }

  updateHead(nodes: NodeProps[]) {
    this.headEntry.patch(nodesToHeadObj(nodes))
    this.cdr.detectChanges()
  }

  ngOnDestroy() {
    this.headEntry.dispose()
  }
}
