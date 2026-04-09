<script setup lang="ts">
useHead({
  title: 'Scripts Demo',
})

useScript('https://www.googletagmanager.com/gtag/js?id=G-DEMO123456', {
  trigger: 'client',
})

const { $script: confetti } = useScript<{ confetti: (opts: any) => void }>({
  src: 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js',
}, {
  trigger: 'manual',
  use: () => ({ confetti: window.confetti }),
})

function fireConfetti() {
  confetti.load().then(() => {
    window.confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
    })
  })
}
</script>

<template>
  <div>
    <h1>Scripts Demo</h1>
    <p>This page demonstrates third-party script loading with <code>useScript</code>.</p>

    <div class="card">
      <h2>Google Analytics</h2>
      <p>Loaded via <code>useScript</code> on client hydration. Check the network tab to verify.</p>
    </div>

    <div class="card">
      <h2>Confetti</h2>
      <p>Loaded manually on demand.</p>
      <button type="button" @click="fireConfetti">
        Fire Confetti 🎉
      </button>
    </div>
  </div>
</template>

<style scoped>
.card {
  padding: 2rem;
}
</style>
