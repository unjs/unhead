// Keep the server entry reachable for Node dependency tracers when multiple
// Unhead versions are installed. The package is side-effect free, so bundlers
// can discard this compatibility edge while Node tracers retain server.mjs.
import 'unhead/server'

export * from './index'
