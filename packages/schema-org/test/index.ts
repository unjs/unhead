import type { MetaInput } from '@unhead/schema-org'
import type { Unhead } from 'unhead/types'
import type { SchemaOrgNode } from '../src/types'
import { SchemaOrgUnheadPlugin } from '@unhead/schema-org'
import { createHead } from 'unhead/server'

export function injectSchemaOrg(unhead: Unhead<any>): Promise<SchemaOrgNode[]> {
  // filter for schema.org tag
  const schemaOrg = unhead.resolveTags().find(tag => tag.key === 'schema-org-graph')!.innerHTML
  return JSON.parse(<string> schemaOrg)['@graph']
}

export function findNode<T>(unhead: Unhead<any>, id: string) {
  const nodes = injectSchemaOrg(unhead)
  // @ts-expect-error untyped
  return nodes.find(node => node['@id'] === id || node['@id'].endsWith(id)) as T
}
export function useSetup(fn: (unhead: Unhead<any>) => void, meta: Partial<MetaInput> = {}) {
  const head = createHead({
    disableDefaults: true,
    plugins: [
      SchemaOrgUnheadPlugin({
        currency: 'AUD',
        host: 'https://example.com/',
        inLanguage: 'en-AU',
        ...meta,
      }, () => {
        return {
          path: '/',
          ...meta,
        }
      }),
    ],
  })
  fn(head)
  return head
}
