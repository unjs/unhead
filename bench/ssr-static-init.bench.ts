import { createHead } from '@unhead/vue/server'
import { TemplateParamsPlugin } from 'unhead/plugins'
import { prepareHeadInput, renderSSRHead } from 'unhead/server'
import { it } from 'vitest'

// Nuxt-style `app.head`: static config shared by every request
const appHead = {
  htmlAttrs: { lang: 'en' },
  title: 'My App',
  titleTemplate: '%s %separator %siteName',
  templateParams: { separator: '|', siteName: 'My App' },
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'description', content: 'A description of my app' },
    { name: 'theme-color', content: '#00dc82' },
    { property: 'og:site_name', content: 'My App' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter' },
  ],
  script: [
    { src: '/analytics.js', defer: true },
  ],
}

const preparedAppHead = prepareHeadInput({ ...appHead })

function render(init: typeof appHead) {
  const head = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin], init: [init] })
  head.push({
    title: 'Page title',
    meta: [{ name: 'description', content: 'Page description' }],
  })
  return renderSSRHead(head)
}

it('ssr static init per-request', async ({ bench }) => {
  await bench.compare(
    bench('init: [appHead]', () => {
      render(appHead)
    }),
    bench('init: [prepareHeadInput(appHead)]', () => {
      render(preparedAppHead)
    }),
  )
})
