import { bench, describe } from 'vitest'
import { emitEntryPlan } from '../packages/unhead/src/v4/emit'
import { createHead as createRuntimeHead, renderSSRHead as renderRuntimeHead } from '../packages/unhead/src/v4/server'
import { createHead as createCompiledHead, renderSSRHead as renderCompiledHead } from '../packages/unhead/src/v4/server-compiled'

const plan = emitEntryPlan({
  bodyAttrs: { class: 'page' },
  htmlAttrs: { lang: 'en' },
  link: [{ href: 'https://example.com', rel: 'canonical' }],
  meta: [
    { charset: 'utf-8' },
    { content: 'Compiled profile benchmark', name: 'description' },
    { content: 'Compiled profile benchmark', property: 'og:title' },
  ],
  script: [{ src: '/app.js', type: 'module' }],
  title: 'Compiled profile',
}).plan

const BATCH = 20

describe('v4 compiled server profile', () => {
  bench('normal head, sealed plan x20', () => {
    for (let i = 0; i < BATCH; i++) {
      const head = createRuntimeHead({ disableDefaults: true })
      head.push(plan)
      renderRuntimeHead(head)
    }
  }, { time: 1200, warmupTime: 400 })

  bench('compiled head, sealed plan x20', () => {
    for (let i = 0; i < BATCH; i++) {
      const head = createCompiledHead({ disableDefaults: true })
      head.push(plan)
      renderCompiledHead(head)
    }
  }, { time: 1200, warmupTime: 400 })

  bench('normal head creation x20', () => {
    for (let i = 0; i < BATCH; i++) createRuntimeHead({ disableDefaults: true })
  }, { time: 1200, warmupTime: 400 })

  bench('compiled head creation x20', () => {
    for (let i = 0; i < BATCH; i++) createCompiledHead({ disableDefaults: true })
  }, { time: 1200, warmupTime: 400 })
})
