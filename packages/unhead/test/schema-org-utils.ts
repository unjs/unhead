import type { MetaInput, SchemaOrgNode } from 'unhead/schema-org'
import type { Unhead } from 'unhead/types'
import { createHead } from 'unhead/server'

export async function injectSchemaOrg(unhead: Unhead<any>): Promise<SchemaOrgNode[]> {
  // filter for schema.org tag
  const tags = (await unhead.resolveTags())
  const schemaOrg = tags.find(tag => tag.key === 'schema-org-graph')!.innerHTML
  return JSON.parse(<string> schemaOrg)['@graph']
}

export async function findNode<T>(unhead: Unhead<any>, id: string) {
  const nodes = await injectSchemaOrg(unhead)
  // @ts-expect-error untyped
  return nodes.find(node => node['@id'] === id || node['@id'].endsWith(id)) as T
}
export async function useSetup(fn: (unhead: Unhead<any>) => void, meta: Partial<MetaInput> = {}) {
  const head = createHead({
    disableDefaults: true,
    init: [
      {
        templateParams: {
          schemaOrg: {
            currency: 'AUD',
            host: 'https://example.com/',
            inLanguage: 'en-AU',
            path: '/',
            ...meta,
          },
        },
      },
    ],
  })
  await fn(head)
  return head
}
