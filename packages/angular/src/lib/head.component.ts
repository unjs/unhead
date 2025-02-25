import type { OnDestroy } from '@angular/core'
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { useHead } from '../unhead/composables'

interface NodeProps {
  type: string | symbol
  props?: Record<string, any>
  children?: NodeProps[]
}

@Component({
  selector: 'unhead-head',
  standalone: true,
  template: '<ng-content></ng-content>',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Head implements OnDestroy {
  private headEntry = useHead({})

  updateHead(nodes: NodeProps[]) {
    const transformed = this.transformNodes(nodes)
    this.headEntry.patch(transformed)
  }

  private transformNodes(nodes: NodeProps[]) {
    const result: Record<string, any> = {}

    const processNode = (node: NodeProps) => {
      if (typeof node.type === 'symbol') {
        node.children?.forEach(child => processNode(child as NodeProps))
        return
      }

      const type = node.type as string
      if (node.children?.length === 1) {
        result[type] = node.children[0]
      }
      else if (Object.keys(node.props || {}).length) {
        result[type] = result[type] || []
        result[type].push(node.props)
      }
    }

    nodes.forEach(processNode)
    return result
  }

  ngOnDestroy() {
    this.headEntry.dispose()
  }
}
