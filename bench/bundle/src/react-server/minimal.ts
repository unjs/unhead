import { useHead } from '@unhead/react'
import { createHead, renderSSRHead } from '@unhead/react/server'

// Minimal server usage: the renderSSRHead path. head is passed explicitly so the
// entry doesn't depend on React context (never executed, only built).
async function doHead() {
  const head = createHead()

  useHead({
    title: 'Test',
    titleTemplate: '%s | Site',
    meta: [
      { name: 'description', content: 'Test' },
    ],
    link: [
      { rel: 'icon', href: '/favicon.ico' },
    ],
    script: [
      { src: '/test.js', defer: true },
    ],
  }, { head })

  return renderSSRHead(head)
}

doHead()
