function extractAttributes(tag: string) {
  const attrs = tag.match(/([a-z-]+)="([^"]*)"/g)
  return attrs?.reduce((acc, attr) => {
    const [key, ...valueParts] = attr.split('=')
    // join value parts to support '=' within the quoted values
    const val = valueParts.join('=').slice(1, -1)
    return { ...acc, [key]: val, tagPriority: 'low' }
  }, {})
}

export function extractTagsFromHtml(html: string) {
  const input = {}
  // i should be able to give it a string of html and it should convert it to input for useHead()
  // parse htmlAttrs, bodyAttrs
  input.htmlAttrs = extractAttributes(html.match(/<html[^>]*>/)?.[0] || '')

  html = html.replace(/<html[^>]*>/, '<html>')
  input.bodyAttrs = extractAttributes(html.match(/<body[^>]*>/)?.[0] || '')
  html = html.replace(/<body[^>]*>/, '<body>')
  // parse headTags, need to split on /> and seperate each tag
  const innerHead = html.match(/<head[^>]*>([\s\S]*)<\/head>/)?.[1]
  // replace ['meta', 'link', 'base'] tags first because they're unique in that they don't have a closing tag
  innerHead?.match(/<meta[^>]*>|<link[^>]*>|<base[^>]*>/g).forEach((s) => {
    html = html.replace(s, '')
    const tag = s.split(' ')[0].slice(1)
    input[tag] = input[tag] || []
    input[tag].push(extractAttributes(s))
  })
  innerHead?.match(/<title[^>]*>[\s\S]*?<\/title>|<script[^>]*>[\s\S]*?<\/script>|<style[^>]*>[\s\S]*?<\/style>/g)
    .map(tag => tag.trim())
    .filter(Boolean)
    .forEach((tag) => {
      html = html.replace(tag, '')
      const type = tag.match(/<([a-z-]+)/)?.[1]
      const res = {
        tagPriority: 'low',
        [type !== 'script' ? 'textContent' : 'innerHTML']: tag.match(/>([\s\S]*)</)?.[1],
        ...extractAttributes(tag),
      }
      if (type === 'title') {
        input.title = res
      }
      else {
        input[type] = input[type] || []
        input[type].push(res)
      }
    })
  // remove duplicate new lines from html, could be 2, 5 or 20 in a row
  html = html.replace(/(\n\s*)+/g, '\n')
  // we leave any body tags as the order is out of our control
  return { html, input }
}
