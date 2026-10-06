import type { HeadHooks, SerializableHead } from 'unhead/types'
import { useHead } from '@unhead/vue'
import { createSSRApp, h, ref } from 'vue'

export interface FixtureRequest {
  nonce: string
  baseURL: string
}

export interface FixturePayload {
  request: FixtureRequest
  input: SerializableHead
}

export function requestHooks(request: FixtureRequest, observe?: (props: Record<string, unknown>) => void): Partial<HeadHooks> {
  return {
    'tags:afterResolve': ({ tags }) => {
      for (const tag of tags) {
        if (tag.props.id === 'fixture-module')
          observe?.({ ...tag.props })
        if (tag.tag === 'base')
          tag.props.href = request.baseURL
        if (tag.tag === 'script')
          tag.props.nonce = request.nonce
        for (const prop of ['href', 'src']) {
          if (typeof tag.props[prop] === 'string' && tag.props[prop].startsWith('/assets/'))
            tag.props[prop] = new URL(tag.props[prop], request.baseURL).href
        }
      }
    },
  }
}

export function createFixtureApp() {
  const route = ref('Home')
  const app = createSSRApp({
    setup() {
      useHead(() => ({
        title: route.value,
        meta: [{ name: 'description', content: `${route.value} & Vue` }],
        htmlAttrs: { lang: 'en' },
        script: [{
          key: 'component-data',
          attrs: {
            'id': 'component-data',
            'type': 'application/json',
            'innerHTML': 'literal-content-attribute',
            'data-route': `${route.value}&literal=&amp;`,
            'nonce': 'replace-me',
          },
          innerHTML: JSON.stringify({ route: route.value }),
          tagPosition: 'bodyClose',
        }],
      }))
      return () => h('main', [
        h('h1', route.value),
        h('button', { id: 'navigate', onClick: () => { route.value = 'About' } }, 'About'),
      ])
    },
  })
  return app
}
