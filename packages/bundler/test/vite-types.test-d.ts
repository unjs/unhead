import { Unhead } from '@unhead/bundler/vite'
import { createStreamingPlugin } from 'unhead/stream/unplugin'
import { defineConfig } from 'vite'
import { defineConfig as defineTestConfig } from 'vitest/config'

// Both consumers must accept the plugins without casts across workspace peers.
const plugins = [Unhead({ devtools: false }), createStreamingPlugin.vite({ framework: '@unhead/vue' })]

defineConfig({ plugins })
defineTestConfig({ plugins })
