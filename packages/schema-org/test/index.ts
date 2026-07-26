import type { MetaInput } from '@unhead/schema-org'
import type { ServerUnhead } from 'unhead/server'
import type { ResolvableHead, Unhead } from 'unhead/types'
import type { SchemaOrgNode } from '../src/types'
import { UnheadSchemaOrg } from '@unhead/schema-org'
import { createHead } from 'unhead/server'
import { resolveTags } from 'unhead/utils'

export function injectSchemaOrg(unhead: unknown): SchemaOrgNode[] {
  // filter for schema.org tag
  const schemaOrg = resolveTags(unhead as Unhead<unknown, unknown>).find(tag => tag.key === 'schema-org-graph')!.innerHTML
  return JSON.parse(<string> schemaOrg)['@graph']
}

export function findNode<T>(unhead: unknown, id: string) {
  const nodes = injectSchemaOrg(unhead)
  const node = nodes.find(node => node['@id'] === id || node['@id']?.endsWith(id))
  if (!node)
    throw new Error(`Could not find Schema.org node "${id}".`)
  return node as T
}
export function useSetup(fn: (unhead: ServerUnhead<ResolvableHead>) => void, meta: Partial<MetaInput> = {}) {
  const head = createHead({
    disableDefaults: true,
    plugins: [
      UnheadSchemaOrg({
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
