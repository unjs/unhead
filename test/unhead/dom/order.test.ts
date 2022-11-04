import { describe, it } from 'vitest'
import { createHead, getActiveHead, useHead } from '../../../packages/unhead/src'
import {useDom} from "../../fixtures";
import {renderDOMHead} from "../../../packages/unhead/src/runtime/client";
import {HeadTag} from "@unhead/schema";

describe('dom order', () => {
  it('renders in registered order', async () => {
    let firstTagRendered: HeadTag | null = null
    createHead({
      hooks: {
        'dom:renderTag': (ctx) => {
          console.log('rendering tag', ctx.tag)
          firstTagRendered = firstTagRendered || ctx.tag
        }
      }
    })

    useHead({
      htmlAttrs: {
        class: 'no-js'
      },
      script: [{ children:   'document.documentElement.classList.remove("no-js")'}]
    })

    const head = getActiveHead()

    const dom = useDom()

    await renderDOMHead(head, { document: dom.window.document })

    expect(firstTagRendered).toMatchInlineSnapshot(`
      {
        "_d": "htmlAttrs",
        "_e": 0,
        "_p": 0,
        "props": {
          "class": "no-js",
        },
        "tag": "htmlAttrs",
      }
    `)
  })
})
