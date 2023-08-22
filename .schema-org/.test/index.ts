import { createHead } from 'unhead'
import type { MetaInput } from '../src'
import { SchemaOrgUnheadPlugin } from '../src'
import type { SchemaOrgNode } from '../src/types'

let head
export async function injectSchemaOrg(): Promise<SchemaOrgNode[]> {
  // filter for schema.org tag
  const schemaOrg = (await head!.resolveTags()).find(tag => tag.key === 'schema-org-graph')!.innerHTML
  return JSON.parse(<string> schemaOrg)['@graph']
}

export async function findNode<T>(id: string) {
  const nodes = await injectSchemaOrg()
  // @ts-expect-error untyped
  return nodes.find(node => node['@id'] === id || node['@id'].endsWith(id)) as T
}
export async function useSetup(fn: () => void, meta: Partial<MetaInput> = {}) {
  head = createHead({
    plugins: [
      SchemaOrgUnheadPlugin({
        currency: 'AUD',
        host: 'https://example.com/',
        inLanguage: 'en-AU',
        ...meta,
      },
      () => {
        return {
          path: '/',
          ...meta,
        }
      },
      ),
    ],
  })
  return fn()
}
