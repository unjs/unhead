import type { AngularUnhead, UseHeadInput, UseHeadOptions, UseHeadSafeInput, UseSeoMetaInput } from '../unhead/types'
import { DOCUMENT } from '@angular/common'
// eslint-disable-next-line ts/consistent-type-imports
import { Inject, Injectable, Injector, runInInjectionContext } from '@angular/core'
import { renderSSRHead } from 'unhead/server'
import { useHead, useHeadSafe, useSeoMeta } from '../unhead/composables'
import { UnheadInjectionToken } from '../unhead/install'

// a token would be one of the following:
// ['lang="en"', 'class="test"', 'style="color: red; background: blue;"', 'data-foo', 'data-bar="baz"']
function attrToElement(element: HTMLElement, acc: string) {
  // Extract key-value using regex from some-key="some-value" or boolean attributes like disabled
  const [key, value] = acc.match(/([a-z0-9-]+)(?:="([^"]*)")?/i)?.slice(1, 3) || []
  if (!key) {
    return
  }

  if (value === undefined) {
    // Handle boolean attributes
    element.setAttribute(key, '')
  }
  else if (key === 'style') {
    // Handle style attribute
    const styleObj = value.split(';').reduce((acc, style) => {
      const [prop, val] = style.split(':').map(s => s.trim())
      if (prop && val) {
        // @ts-expect-error untyped
        acc[prop] = val
      }
      return acc
    }, {})
    Object.keys(styleObj).forEach((prop) => {
      // @ts-expect-error untyped
      element.style.setProperty(prop, styleObj[prop])
    })
  }
  else if (key === 'class') {
    // Handle class attribute
    value.split(' ').forEach((className) => {
      element.classList.add(className)
    })
  }
  else {
    // Handle other attributes
    element.setAttribute(key, value)
  }
}
const attrRegex = /([a-z0-9-]+(?:="[^"]*")?)/gi

@Injectable({
  providedIn: 'root',
})
export class Unhead {
  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(UnheadInjectionToken) private unhead: AngularUnhead,
    private injector: Injector,
  ) {}

  useHead(input: UseHeadInput, options: UseHeadOptions = {}) {
    return runInInjectionContext(this.injector, () => {
      return useHead(input, { head: this.unhead, ...options })
    })
  }

  useHeadSafe(input: UseHeadSafeInput, options: UseHeadOptions = {}) {
    return runInInjectionContext(this.injector, () => {
      return useHeadSafe(input, { head: this.unhead, ...options })
    })
  }

  useSeoMeta(input: UseSeoMetaInput, options: UseHeadOptions = {}) {
    return runInInjectionContext(this.injector, () => {
      return useSeoMeta(input, { head: this.unhead, ...options })
    })
  }

  async _ssrModifyResponse() {
    const { headTags, htmlAttrs, bodyAttrs, bodyTags, bodyTagsOpen } = await renderSSRHead(this.unhead, {
      omitLineBreaks: false,
    })
    htmlAttrs.match(attrRegex)?.forEach((attr) => {
      attrToElement(this.document.documentElement, attr)
    })
    bodyAttrs.match(attrRegex)?.forEach((attr) => {
      attrToElement(this.document.body, attr)
    })
    this.document.body.innerHTML = bodyTagsOpen + this.document.body.innerHTML + bodyTags
    this.document.head.innerHTML = headTags + this.document.head.innerHTML
  }
}
