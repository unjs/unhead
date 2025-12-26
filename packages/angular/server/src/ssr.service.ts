import type { Unhead as UnheadSchema } from 'unhead/types'
import { DOCUMENT } from '@angular/common'
import { Inject, Injectable } from '@angular/core'
import { UnheadInjectionToken } from '@unhead/angular'
import { parseHtmlForUnheadExtraction } from 'unhead/parser'
import { renderSSRHead } from 'unhead/server'

function attrToElement(element: HTMLElement, acc: string) {
  const [key, value] = acc.match(/([a-z0-9-]+)(?:="([^"]*)")?/i)?.slice(1, 3) || []
  if (!key)
    return

  if (value === undefined) {
    element.setAttribute(key, '')
  }
  else if (key === 'style') {
    const styleObj = value.split(';').reduce((acc, style) => {
      const [prop, val] = style.split(':').map(s => s.trim())
      if (prop && val)
        acc[prop] = val
      return acc
    }, {} as Record<string, string>)
    Object.entries(styleObj).forEach(([prop, val]) => {
      element.style.setProperty(prop, val)
    })
  }
  else if (key === 'class') {
    value.split(' ').forEach(className => element.classList.add(className))
  }
  else {
    element.setAttribute(key, value)
  }
}

const attrRegex = /([a-z0-9-]+(?:="[^"]*")?)/gi

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
    const { headTags, htmlAttrs, bodyAttrs, bodyTags, bodyTagsOpen } = await renderSSRHead(this.unhead, {
      omitLineBreaks: false,
    })
    htmlAttrs.match(attrRegex)?.forEach(attr => attrToElement(this.document.documentElement, attr))
    bodyAttrs.match(attrRegex)?.forEach(attr => attrToElement(this.document.body, attr))
    this.document.body.innerHTML = bodyTagsOpen + this.document.body.innerHTML + bodyTags
    this.document.head.innerHTML = headTags
  }
}
