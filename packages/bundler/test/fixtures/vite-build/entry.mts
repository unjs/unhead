// `.mts` entry: the transforms must treat it exactly like `entry.ts`.

// @ts-ignore Nuxt-style auto-import
useServerSeoMeta({ description: 'SERVER_ONLY_MARKER' })

// @ts-ignore Nuxt-style auto-import
useSeoMeta({ title: 'CLIENT_MARKER' })
