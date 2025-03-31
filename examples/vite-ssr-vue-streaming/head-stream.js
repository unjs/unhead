import { renderSSRHead } from '@unhead/vue/server'

export async function headStream(res, vueStream, htmlStart, htmlEnd, head) {
  res.status(200).set({
    'Content-Type': 'text/html; charset=utf-8'
  })

  let bufferChunks = []
  let flushTimer = null
  let isStreaming = false

  async function writeFirstChunk() {
    const s = Buffer.from(bufferChunks).toString('utf8')
    bufferChunks = []
    const headHtml = await renderSSRHead(head)
    res.write((htmlStart.replace('</head>', `${headHtml.headTags}</head>`) + s))
  }

  for await (const chunk of vueStream) {
    if (res.closed) break

    if (isStreaming) {
      res.write(chunk)
      continue
    }

    bufferChunks.push(...chunk)

    if (flushTimer) clearTimeout(flushTimer)

    flushTimer = setTimeout(async () => {
      isStreaming = true
      if (bufferChunks.length > 0) {
        await writeFirstChunk()
      }
    }, 3) // 3ms is an arbitrary choice as we figure it's not within a suspense boundary
  }

  if (bufferChunks.length > 0) {
    await writeFirstChunk()
  }

  const headHtml = await renderSSRHead(head)
  res.write((htmlEnd.replace('</body>', `${headHtml.bodyTags}</body>`)))
  res.end()
}
