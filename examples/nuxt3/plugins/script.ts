import { defineNuxtPlugin, useHead, ref } from '#imports'
import {EffectScope} from "vue";

const configure = [
  'window.loadTurnstile = new Promise(resolve => {',
  '  window.onloadTurnstileCallback = function () {',
  '    resolve();',
  '    delete window.onloadTurnstileCallback;',
  '    delete window.loadTurnstile;',
  '  }',
  '})',
]
  .map(l => l.trim())
  .join(' ')

const script = {
  src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback',
  async: true,
  defer: true,
}

export default defineNuxtPlugin(() => {
  const addScript = ref(false)

  let scope : EffectScope | null = effectScope()

  scope.run(() => {
    useHead({
      script: () => {
        return [
          {children: configure},
          addScript.value && script,
        ].filter((s): s is typeof script => !!s)
      },
    })
  })

  setInterval(() => {
    addScript.value = !addScript.value
    if (scope) {
      scope.stop()
      scope = null
    }
  }, 1000)
})
