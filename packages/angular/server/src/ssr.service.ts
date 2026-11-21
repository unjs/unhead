import type { Unhead as UnheadSchema } from 'unhead/types'
import { DOCUMENT } from '@angular/common'
import { Inject, Injectable } from '@angular/core'
import { UnheadInjectionToken } from '@unhead/angular'
import { parseHtmlForUnheadExtraction } from 'unhead/parser'
import { renderSSRHead } from 'unhead/server'

const HTML_WHITESPACE_RE = /[\t\n\f\r ]+/

function applyAttributes(element: HTMLElement, attrs: string) {
  if (!attrs)
    return

  const container = element.ownerDocument.createElement('div')
  container.innerHTML = `<div${attrs}></div>`
  for (const attribute of Array.from(container.firstElementChild!.attributes)) {
    const { name, value } = attribute
    if (name === 'style') {
      for (const declaration of value.split(';')) {
        const [prop, val] = declaration.split(':').map(s => s.trim())
        if (prop && val)
          element.style.setProperty(prop, val)
      }
    }
    else if (name === 'class' && value) {
      value.split(HTML_WHITESPACE_RE).filter(Boolean).forEach(className => element.classList.add(className))
    }
    else {
      try {
        element.setAttribute(name, value)
      }
      catch (error) {
        if ((error as DOMException | null)?.name !== 'InvalidCharacterError')
          throw error
        // The HTML parser accepts some names that setAttribute rejects.
        element.setAttributeNode(attribute.cloneNode() as Attr)
      }
    }
  }
}

@Injectable({
  providedIn: 'root',
})
export class UnheadSSRService {
  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(UnheadInjectionToken) private unhead: UnheadSchema,
  ) {}

  async render() {
    const { input } = parseHtmlForUnheadExtraction(this.document.documentElement.outerHTML)
    this.unhead.entries.set(0, { _i: 0, input, options: {} })
    const { headTags, htmlAttrs, bodyAttrs, bodyTags, bodyTagsOpen } = renderSSRHead(this.unhead, {
      omitLineBreaks: false,
    })
    applyAttributes(this.document.documentElement, htmlAttrs)
    applyAttributes(this.document.body, bodyAttrs)
    this.document.body.innerHTML = bodyTagsOpen + this.document.body.innerHTML + bodyTags
    this.document.head.innerHTML = headTags
  }
}
