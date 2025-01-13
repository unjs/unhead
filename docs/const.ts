export interface Module {
  slug: 'unhead' | 'scripts' | 'schema-org'
  label: string
  icon: string
  description: string
  repo: string
  npm: string
  frameworks: any[]
}

const Vue = { slug: 'vue', icon: 'i-logos-vue', label: 'Vue' }
const TypeScript = { slug: 'typescript', icon: 'i-logos-typescript-icon', label: 'TypeScript' }

export const Unhead = {
  slug: 'unhead',
  label: 'Head',
  icon: 'i-carbon-machine-learning',
  description: 'Full-stack &lt;head&gt; package built for any framework.',
  npm: 'unhead',
  frameworks: [
    TypeScript,
    Vue,
  ],
}

export const modules = [
  {
    slug: 'unhead',
    label: 'Head TypeScript',
    icon: 'i-carbon-machine-learning',
    description: 'Full-stack &lt;head&gt; package built for any framework.',
    npm: 'unhead',
    frameworks: [
      TypeScript,
      Vue,
    ],
  },
  {
    slug: 'vue',
    label: 'Vue',
    icon: 'unhead',
    description: 'Head management for Vue 3',
    npm: '@unhead/vue',
  },
  {
    slug: 'scripts',
    label: 'Scripts',
    icon: 'scripts',
    description: 'Scripts for Vue 3',
    npm: '@unhead/scripts',
  },
  {
    slug: 'schema-org',
    label: 'Schema.org',
    icon: 'schema-org',
    description: 'Schema.org for Vue 3',
    npm: '@unhead/schema-org',
  },
]
