import { defineBuildConfig } from 'unbuild'

// Built separately so the strict resolver graph can exclude the normal entry's
// dynamic normalizer instead of sharing its code-split chunk.
export default defineBuildConfig({
  clean: true,
  declaration: true,
  // This first pass intentionally emits the precompiled entries before the
  // rest of the package exists; the ordinary build immediately follows and
  // validates the complete package surface.
  failOnWarn: false,
  entries: [
    { input: 'src/precompiled/client', name: 'precompiled/client' },
    { input: 'src/precompiled/client-csr', name: 'precompiled/client-csr' },
    { input: 'src/precompiled/client-deferred', name: 'precompiled/client-deferred' },
    { input: 'src/precompiled/client-snapshot', name: 'precompiled/client-snapshot' },
    { input: 'src/precompiled/server', name: 'precompiled/server' },
    { input: 'src/precompiled/server-snapshot', name: 'precompiled/server-snapshot' },
    { input: 'src/precompiled/server-unique', name: 'precompiled/server-unique' },
  ],
  externals: [/^unhead\//],
  rollup: {
    dts: { respectExternal: true },
    inlineDependencies: true,
  },
})
