import type { Unhead } from 'unhead/types'
import type { MetaInput, SchemaOrgNode } from '../../schema-org/src/types'
import { createHead } from 'unhead/server'
import { resolveTags } from '../src/utils/resolve'

export async function injectSchemaOrg(unhead: Unhead<any>): Promise<SchemaOrgNode[]> {
  // filter for schema.org tag
  const tags = resolveTags(unhead)
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
          // @ts-expect-error untyped
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
