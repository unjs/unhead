// Single source of truth for the bundles we track. analyze.ts (PR comment) and
// update.ts (last.json baseline) both iterate this list, so adding a bundle is a
// one-line change here plus a build-config entry.

export interface BundleSpec {
  /** stable key used in last.json */
  id: string
  /** display name in the report */
  name: string
  category: 'Core' | 'Vue' | 'React' | 'Schema.org'
  /** path under bench/bundle/dist */
  file: string
  /** build must emit it; throw if missing (catches a broken build instead of hiding it) */
  required?: boolean
}

export const BUNDLES: BundleSpec[] = [
  { id: 'client', name: 'Client (Minimal)', category: 'Core', file: 'client/client/minimal.mjs', required: true },
  { id: 'clientFull', name: 'Client (Full)', category: 'Core', file: 'client-full/client/full.mjs' },
  { id: 'clientSelfContained', name: 'Client (Self-Contained)', category: 'Core', file: 'client-sc/client/minimal.mjs' },
  { id: 'server', name: 'Server (Minimal)', category: 'Core', file: 'server/server/minimal.mjs', required: true },
  { id: 'serverSelfContained', name: 'Server (Self-Contained)', category: 'Core', file: 'server-sc/server/minimal.mjs' },
  { id: 'vueClient', name: 'Vue Client (Minimal)', category: 'Vue', file: 'vue-client/vue-client/minimal.mjs', required: true },
  { id: 'vueClientFull', name: 'Vue Client (Full)', category: 'Vue', file: 'vue-client-full/vue-client/full.mjs' },
  { id: 'vueServer', name: 'Vue Server (Minimal)', category: 'Vue', file: 'vue-server/vue-server/minimal.mjs', required: true },
  { id: 'vueClientSeoTransform', name: 'Vue SEO Transform', category: 'Vue', file: 'vue-client-seo-plugin-base/vue-client/minimal-seo.mjs' },
  { id: 'vueClientSeoPrecompile', name: 'Vue SEO Precompiled', category: 'Vue', file: 'vue-client-seo-plugin/vue-client/minimal-seo.mjs' },
  { id: 'reactClient', name: 'React Client (Minimal)', category: 'React', file: 'react-client/react-client/minimal.mjs' },
  { id: 'reactClientFull', name: 'React Client (Full)', category: 'React', file: 'react-client-full/react-client/full.mjs' },
  { id: 'reactServer', name: 'React Server (Minimal)', category: 'React', file: 'react-server/react-server/minimal.mjs' },
  { id: 'schemaOrg', name: 'Schema.org (Minimal)', category: 'Schema.org', file: 'schema-org/schema-org/minimal.mjs' },
  { id: 'schemaOrgImports', name: 'Schema.org Imports', category: 'Schema.org', file: 'schema-org/schema-org/imports.mjs' },
  { id: 'schemaOrgVueMeta', name: 'Schema.org Vue Meta', category: 'Schema.org', file: 'schema-org/schema-org/vue-meta.mjs' },
]
