import type { ElementNode, Node, TransformerSync } from 'ultrahtml'
import type { SerializableHead } from '../../types'
import { ELEMENT_NODE, TEXT_NODE, transformSync, walkSync } from 'ultrahtml'

export interface PreparedHtmlTemplate {
  html: string
  input: SerializableHead
}

function extractAttributesFromNode(node: ElementNode): Record<string, any> {
  if (!node.attributes)
    return {}

  const attrs: Record<string, any> = {}
  for (const [key, value] of Object.entries(node.attributes)) {
    attrs[key] = value === '' ? true : value
  }
  return attrs
}

function createHeadElementExtractor(extractedData: SerializableHead): TransformerSync {
  return (node: Node): Node => {
    const operations: Array<() => void> = []

    // Walk through all nodes and collect operations
    walkSync(node, (currentNode, parent) => {
      if (currentNode.type !== ELEMENT_NODE)
        return

      const element = currentNode as ElementNode

      // Handle HTML and BODY attribute extraction (keep the element but strip attributes)
      if (element.name === 'html' && Object.keys(element.attributes).length > 0) {
        extractedData.htmlAttrs = extractAttributesFromNode(element)
        operations.push(() => {
          element.attributes = {}
        })
      }

      if (element.name === 'body' && Object.keys(element.attributes).length > 0) {
        extractedData.bodyAttrs = extractAttributesFromNode(element)
        operations.push(() => {
          element.attributes = {}
        })
      }

      // Skip if we're not in the head section or if we don't have a parent
      if (!parent || !isInHead(element, parent))
        return

      // Extract and remove head elements
      switch (element.name) {
        case 'title':
          if (!extractedData.title) {
            const textContent = element.children
              ?.find(child => child.type === TEXT_NODE)
              ?.value || ''
            extractedData.title = textContent
          }
          operations.push(() => removeNodeFromParent(element, parent))
          break

        case 'meta':
          if (!extractedData.meta)
            extractedData.meta = []
          extractedData.meta.push(extractAttributesFromNode(element))
          operations.push(() => removeNodeFromParent(element, parent))
          break

        case 'link':
          if (!extractedData.link)
            extractedData.link = []
          extractedData.link.push(extractAttributesFromNode(element))
          operations.push(() => removeNodeFromParent(element, parent))
          break

        case 'script': {
          if (!extractedData.script)
            extractedData.script = []
          const innerHTML = element.children
            ?.find(child => child.type === TEXT_NODE)
            ?.value || ''
          extractedData.script.push({
            ...extractAttributesFromNode(element),
            innerHTML,
          })
          operations.push(() => removeNodeFromParent(element, parent))
          break
        }

        case 'style': {
          if (!extractedData.style)
            extractedData.style = []
          const textContent = element.children
            ?.find(child => child.type === TEXT_NODE)
            ?.value || ''
          extractedData.style.push({
            ...extractAttributesFromNode(element),
            textContent,
          })
          operations.push(() => removeNodeFromParent(element, parent))
          break
        }

        case 'base':
          if (!extractedData.base) {
            extractedData.base = extractAttributesFromNode(element)
          }
          operations.push(() => removeNodeFromParent(element, parent))
          break
      }
    })

    // Apply all operations in reverse order to avoid index issues
    for (let i = operations.length - 1; i >= 0; i--) {
      operations[i]()
    }

    return node
  }
}

function isInHead(_element: ElementNode, parent: Node): boolean {
  let current: Node | undefined = parent
  while (current) {
    if (current.type === ELEMENT_NODE && (current as ElementNode).name === 'head') {
      return true
    }
    current = current.parent
  }
  return false
}

function removeNodeFromParent(node: Node, parent: Node): void {
  if ('children' in parent && Array.isArray(parent.children)) {
    const index = parent.children.indexOf(node)
    if (index !== -1) {
      parent.children.splice(index, 1)
    }
  }
}

export function extractUnheadInputFromHtml(html: string): PreparedHtmlTemplate {
  const input = {} as SerializableHead

  // Use transformSync with our custom transformer - completely regex-free approach
  const processedHtml = transformSync(html, [
    createHeadElementExtractor(input),
  ])

  return { html: processedHtml, input }
}
