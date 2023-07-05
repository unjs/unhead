import { defineNuxtPlugin, ref, useHead } from '#imports'

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

  useHead({
    script: () => [
      { children: configure },
      addScript.value && script,
    ].filter((s): s is typeof script => !!s),
  })

  setTimeout(() => {
    addScript.value = true
  }, 1000)
})
