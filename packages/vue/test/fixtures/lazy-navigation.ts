import { createStreamableHead } from '@unhead/vue/stream/client'
import { createSSRApp, h } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { useHead } from '../../src'

function page(name: string) {
  return {
    setup() {
      useHead({ link: [{ rel: 'stylesheet', href: `/${name}.css` }] })
      return () => h('div', name)
    },
  }
}

export async function start() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: page('initial') }, { path: '/destination', component: page('destination') }, { path: '/blocked', component: page('blocked') }],
  })
  router.beforeEach(to => to.path !== '/blocked')
  const head = createStreamableHead()!
  const app = createSSRApp({ render: () => h(RouterView) }).use(router).use(head)
  await router.push('/')
  await router.isReady()
  app.mount('#app')
  return { app, navigate: () => router.push('/destination'), abort: () => router.push('/blocked') }
}
