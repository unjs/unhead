import { useSeoMeta } from 'unhead'

// bare call, Nuxt-style auto-import (no local declaration in scope)

// @ts-ignore
useServerSeoMeta({ description: 'SERVER_ONLY_MARKER' })

// @ts-ignore
useSeoMeta({ title: 'CLIENT_MARKER' })

// @ts-ignore Nuxt-style auto-import
useHead({
  script: [{
    innerHTML: 'window.INLINE_MARKER = window.payload?.value ?? "fallback"',
  }],
})
