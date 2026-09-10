import type { Unhead as UnheadSchema } from 'unhead/types'
import { DOCUMENT } from '@angular/common'
import { Inject, Injectable } from '@angular/core'
import { UnheadInjectionToken } from '@unhead/angular'
import { parseAttributes, parseHtmlForUnheadExtraction } from 'unhead/parser'
import { renderSSRHead } from 'unhead/server'

function attrsToElement(element: HTMLElement, attributes: string) {
  // Unhead already merges template attributes. DOM setters require decoded values.
  for (const [key, value] of Object.entries(parseAttributes(attributes)))
    element.setAttribute(key, value)
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
    attrsToElement(this.document.documentElement, htmlAttrs)
    attrsToElement(this.document.body, bodyAttrs)
    this.document.body.innerHTML = bodyTagsOpen + this.document.body.innerHTML + bodyTags
    this.document.head.innerHTML = headTags
  }
}
