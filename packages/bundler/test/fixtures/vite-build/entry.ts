import { useSeoMeta } from 'unhead'

// bare call, Nuxt-style auto-import (no local declaration in scope)

// @ts-ignore
useServerSeoMeta({ description: 'SERVER_ONLY_MARKER' })

useSeoMeta({ title: 'CLIENT_MARKER' })
