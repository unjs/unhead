import type { OnDestroy } from '@angular/core'
import type { UseHeadInput } from 'unhead/types'
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { useHead } from './composables'

export type HeadNodeChild = HeadNode | number | string

export interface HeadNode {
  type: string | symbol
  props?: Readonly<Record<string, unknown>>
  children?: readonly HeadNodeChild[]
}

@Component({
  selector: 'unhead-head',
  standalone: true,
  template: '<ng-content></ng-content>',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Head implements OnDestroy {
  private headEntry = useHead({})

  updateHead(nodes: readonly HeadNode[]): void {
    const transformed = this.transformNodes(nodes)
    this.headEntry.patch(transformed)
  }

  private transformNodes(nodes: readonly HeadNode[]): UseHeadInput {
    const result: Record<string, unknown> = {}

    const processNode = (node: HeadNode) => {
      if (typeof node.type === 'symbol') {
        node.children?.forEach((child) => {
          if (typeof child === 'object')
            processNode(child)
        })
        return
      }

      const type = node.type as string
      if (node.children?.length === 1) {
        result[type] = node.children[0]
      }
      else if (Object.keys(node.props || {}).length) {
        const entries = Array.isArray(result[type]) ? result[type] : []
        entries.push(node.props)
        result[type] = entries
      }
    }

    nodes.forEach(processNode)
    return result as UseHeadInput
  }

  ngOnDestroy() {
    this.headEntry.dispose()
  }
}
