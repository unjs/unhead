import {
  createRouter as _createRouter,
  createMemoryHistory,
  createWebHistory,
} from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('./pages/HomePage.vue'),
  },
  {
    path: '/about',
    component: () => import('./pages/AboutPage.vue'),
  },
]

export function createRouter() {
  return _createRouter({
    history: import.meta.env.SSR
      ? createMemoryHistory()
      : createWebHistory(),
    routes,
  })
}
