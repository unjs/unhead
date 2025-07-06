import type { HeadTag, SSRHeadPayload, Unhead } from '../types'
import { renderSSRHead } from './renderSSRHead'
import { ssrRenderTags } from './util/ssrRenderTags'

/**
 * @experimental This API is experimental and may change in future versions
 *
 * Renders head components for streaming SSR chunks.
 * Processes HTML chunks to inject or update head tags dynamically during streaming.
 *
 * @param head - The Unhead instance containing head configuration
 * @param html - The HTML chunk to process
 * @returns Processed HTML with head updates applied
 */
export async function renderSSRStreamComponents(head: Unhead, html: string): Promise<string> {
  head._rootStreamedTags = head._rootStreamedTags || {}
  // we always need a <title> tag set
  const tags: HeadTag[] = await head.resolveTags()
  const isTemplateChunk: boolean = html.includes('<html') || html.includes('</head>') || html.includes('<body')
  const isAppChunk: boolean = html.includes('<!--[unhead-stream]-->')

  if (isTemplateChunk) {
    for (const tag of tags) {
      if (tag._d) {
        head._rootStreamedTags[tag._d] = tag
      }
    }
    const ssr: SSRHeadPayload = ssrRenderTags(tags)
    if (html.includes('</head>')) {
      if (!ssr.headTags.includes('<title>')) {
        // prepend with empty title tag
        ssr.headTags = `<title></title>${ssr.headTags}`
      }
      html = html.replace('</head>', `${ssr.headTags}
<script>function __unheadNormalizeAttrs(t,k,v){
  if(k==="class"&&v)for(const c of v)!t.classList.contains(c)&&t.classList.add(c);
  else if(k==="style"&&v){for(const[p,q]of v)t.style.setProperty(p,q);}
  else if(v!==false&&v!==null)t.getAttribute(k)!==v&&t.setAttribute(k,v===true?"":String(v))
}</script></head>`)
    }
    if (html.includes('<body') && ssr.bodyAttrs) {
      html = html.replace('<body', `<body ${ssr.bodyAttrs}`)
    }
    if (html.includes('<html') && ssr.htmlAttrs) {
      html = html.replace('<html', `<html ${ssr.htmlAttrs}`)
    }
  }

  if (isAppChunk) {
    const dedupeTags: Set<HeadTag> = new Set()
    // tags that can be rendered inline (i.e <script>, <style>, etc)
    const inlineTags: HeadTag[] = tags.filter((tag) => {
      // needs special handling
      if (tag.tag === 'bodyAttrs' || tag.tag === 'htmlAttrs' || tag.tag === 'title') {
        return false
      }
      if (tag._d && tag._d in head._rootStreamedTags!) {
        if (tag.key) {
          dedupeTags.add(tag)
          return true
        }
        return false
      }
      if (tag.tag === 'script') {
        return tag.props.id !== 'unhead:payload'
      }
      return true
    }).map((t) => {
      t.props['data-unhead-streamed'] = ''
      return t
    })

    for (const tag of inlineTags) {
      if (tag._d) {
        head._rootStreamedTags[tag._d] = tag
      }
    }

    const titleTag: HeadTag | undefined = tags.find(tag => tag.tag === 'title')
    const htmlAttrTag: HeadTag | undefined = tags.find(tag => tag.tag === 'htmlAttrs')
    const bodyAttrTag: HeadTag | undefined = tags.find(tag => tag.tag === 'bodyAttrs')

    function normalizeAttrProps(props: Record<string, any>): Record<string, any> {
      props.style = Array.from(props.style || [])
      if (!props.style.length) {
        delete props.style
      }
      props.class = Array.from(props.class || [])
      if (!props.class.length) {
        delete props.class
      }
      return props
    }

    const { bodyTags, headTags, bodyTagsOpen } = ssrRenderTags(inlineTags)
    const inlineTagHtml: string = [
      titleTag ? `  document.title = ${JSON.stringify(titleTag.textContent)}` : false,
      dedupeTags.size ? [...dedupeTags.values()].map((t) => {
        // Properly escape the data-hid value to prevent XSS
        const escapedHid = JSON.stringify(t.props['data-hid'])
        return `  document.${t.tagPosition?.startsWith('body') ? 'body' : 'head'}.querySelector('[data-hid=' + ${escapedHid} + ']')?.remove();`
      }) : false,
      headTags ? `  document.head.insertAdjacentHTML('beforeend', ${JSON.stringify(headTags)})` : false,
      bodyTags ? `  document.body.insertAdjacentHTML('beforeend', ${JSON.stringify(bodyTags)})` : false,
      bodyTagsOpen ? `  document.body.insertAdjacentHTML('afterbegin', ${JSON.stringify(bodyTagsOpen)})` : false,
      bodyAttrTag ? `  Object.entries(${JSON.stringify(normalizeAttrProps(bodyAttrTag.props))}).forEach(([k,v]) => __unheadNormalizeAttrs(document.body, k,v))` : false,
      htmlAttrTag ? `  Object.entries(${JSON.stringify(normalizeAttrProps(htmlAttrTag.props))}).forEach(([k,v]) => __unheadNormalizeAttrs(document.documentElement, k,v))` : false,
    ].filter(Boolean).join('\n')

    html = html.replaceAll('<!--[unhead-stream]-->', `
(function() {
${inlineTagHtml}
})();
`)
  }

  return html
}

/**
 * @experimental This API is experimental and may change in future versions
 *
 * Streams an SSR application with dynamic head management.
 * Processes app chunks and injects head updates as they become available during streaming.
 *
 * @param appStream - The async iterable stream of app chunks
 * @param htmlStart - The initial HTML including <html>, <head>, and opening <body>
 * @param htmlEnd - The closing HTML including </body> and </html>
 * @param head - The Unhead instance for this request (should be unique per request)
 * @yields Processed HTML chunks with head updates applied
 *
 * @example
 * ```ts
 * const head = createHead()
 * const appStream = renderToNodeStream(app)
 * const htmlStart = '<html><head></head><body>'
 * const htmlEnd = '</body></html>'
 *
 * for await (const chunk of streamAppWithUnhead(appStream, htmlStart, htmlEnd, head)) {
 *   res.write(chunk)
 * }
 * res.end()
 * ```
 */
export async function* streamAppWithUnhead(
  appStream: AsyncIterable<Uint8Array | string>,
  htmlStart: string,
  htmlEnd: string,
  head: Unhead<any>,
): AsyncGenerator<string> {
  // Track state
  let firstChunk = true
  // let hasStarted = false

  // Process and yield chunks
  for await (const chunk of appStream) {
    const chunkStr = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk)

    if (firstChunk) {
      firstChunk = false
      // hasStarted = true
      // Process the first chunk with head tags
      const processedContent = await renderSSRStreamComponents(head, `${htmlStart}${chunkStr}`)
      yield processedContent
    }
    else if (chunkStr.includes('data-unhead-stream')) {
      // Process chunks with unhead-stream markers
      const processedChunk = await renderSSRStreamComponents(head, chunkStr)
      yield processedChunk
    }
    else {
      // Pass through other chunks unchanged
      yield chunkStr
    }
  }

  // Add the final HTML
  const headHtml = await renderSSRHead(head)
  yield htmlEnd.replace('</body>', `${headHtml.bodyTags}</body>`)
}
