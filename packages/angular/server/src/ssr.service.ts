import type { Unhead as UnheadSchema } from 'unhead/types'
import { DOCUMENT } from '@angular/common'
import { Inject, Injectable } from '@angular/core'
import { UnheadInjectionToken } from '@unhead/angular'
import { parseHtmlForUnheadExtraction } from 'unhead/parser'
import { renderSSRHead } from 'unhead/server'

function attrToElement(element: HTMLElement, attrs: string) {
  const container = element.ownerDocument.createElement('div')
  container.innerHTML = `<div${attrs}></div>`
  const parsed = container.firstElementChild!
  for (const { name } of Array.from(element.attributes)) {
    if (!parsed.hasAttribute(name))
      element.removeAttribute(name)
  }
  for (const { name, value } of Array.from(parsed.attributes))
    element.setAttribute(name, value)
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
    attrToElement(this.document.documentElement, htmlAttrs)
    attrToElement(this.document.body, bodyAttrs)
    this.document.body.innerHTML = bodyTagsOpen + this.document.body.innerHTML + bodyTags
    this.document.head.innerHTML = headTags
  }
}
