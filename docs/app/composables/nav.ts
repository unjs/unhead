import { useStorage } from '@vueuse/core'
import { Unhead } from '~~/const'

export const selectedFramework = useStorage('framework', 'typescript')

// const ecosystemLinks = [
//   {
//     label: 'Unlighthouse',
//     icon: 'i-custom-unlighthouse',
//     to: 'https://unlighthouse.dev',
//     description: 'Unlighthouse is a tool to scan your entire site with Google Lighthouse in 2 minutes (on average). Open source, fully configurable with minimal setup.',
//     target: '_blank',
//   },
//   {
//     label: 'Request Indexing',
//     icon: 'i-custom-request-indexing',
//     to: 'https://requestindexing.com',
//     description: 'A free, open-source tool to request pages to be indexed using the Web Search Indexing API and view your Google Search Console data.',
//     target: '_blank',
//   },
// ]

/*
[

          {
            label: 'Vue',
            icon: 'i-vscode-icons-file-type-vue',
            description: 'Get started with Unhead using Vue.',
            to: `/docs/getting-started/introduction`,
          },
          {
            label: 'React',
            icon: 'i-vscode-icons-file-type-reactts',
            description: 'Get started with Unhead using React.',
            to: `/docs/getting-started/introduction`,
          },
          {
            label: 'Preact',
            icon: 'i-vscode-icons-file-type-reactts',
            description: 'Get started with Unhead using React.',
            to: `/docs/getting-started/introduction`,
          },
          {
            label: 'Svelte',
            icon: 'i-vscode-icons-file-type-svelte',
            description: 'Get started with Unhead using Svelte.',
            to: `/docs/getting-started/introduction`,
          },
          {
            label: 'Angular',
            icon: 'i-vscode-icons-file-type-angular',
            description: 'Get started with Unhead using Svelte.',
            to: `/docs/getting-started/introduction`,
          },
        ]
 */

export const menu = computed(() => {
  return [
    {
      label: Unhead.label,
      // icon: 'i-carbon-code',
      icon: Unhead.icon,
      children: Unhead.frameworks.map((f) => {
        return {
          ...f,
          description: `Get started with Unhead using ${f.label}.`,
          to: `/docs/unhead/${f.slug}/introduction`,
        }
      }),
    },
    {
      label: 'Schema.org',
      icon: 'i-carbon-chart-relationship',
      children: [
        {
          label: 'TypeScript',
          icon: 'i-vscode-icons-file-type-typescript-official',
          description: 'Get started with Unhead using TypeScript.',
          to: `/docs/getting-started/introduction`,
        },
        {
          label: 'Vue',
          icon: 'i-vscode-icons-file-type-vue',
          description: 'Get started with Unhead using Vue.',
          to: `/docs/getting-started/introduction`,
        },
      ],
    },
    {
      label: 'Scripts',
      icon: 'i-carbon-script',
      children: [
        {
          label: 'TypeScript',
          icon: 'i-vscode-icons-file-type-typescript-official',
          description: 'Get started with Unhead using TypeScript.',
          to: `/docs/getting-started/introduction`,
        },
        {
          label: 'Vue',
          icon: 'i-vscode-icons-file-type-vue',
          description: 'Get started with Unhead using Vue.',
          to: `/docs/getting-started/introduction`,
        },
      ],
    },
    {
      label: 'Releases',
      icon: 'i-carbon-version',
      to: '/releases',
    },
  ]
})
