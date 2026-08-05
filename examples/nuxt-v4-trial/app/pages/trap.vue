<script setup lang="ts">
// Deliberate trap for the sidestep's blind spot (V4_DESIGN.md 15.3): the
// top-level useHead is fully static and SSR-visible (recordRouteHead and the
// double-render hash both see it and call it deterministic), but the
// onMounted useHead only ever runs in the browser. A prerender trace alone
// would happily bake this route's payload and omit the client head runtime,
// then break silently the moment a real browser mounts this page and
// useHead() finds no injected head instance. scanScriptForClientOnlyHead
// exists to catch exactly this shape before it ships.
import { onMounted } from 'vue'

useHead({
  title: 'Trap',
  meta: [
    { name: 'description', content: 'Looks static to SSR, is not client-safe' },
  ],
})

onMounted(() => {
  useHead({
    meta: [
      { name: 'client-injected', content: String(Date.now()) },
    ],
  })
})
</script>

<template>
  <main>
    <h1>Trap</h1>
    <p>Static-looking head, plus a client-only useHead call in onMounted.</p>
  </main>
</template>
