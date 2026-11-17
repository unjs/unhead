import type { Unhead } from 'unhead/types'
import type { MetaInput, SchemaOrgNode } from '../../schema-org/src/types'
import type { ServerUnhead } from '../src/server'
import type { ResolvableHead } from '../src/types'
import { createHead } from 'unhead/server'
import { resolveTags } from '../src/utils/resolve'

type SchemaOrgMetaHeadInput = ResolvableHead | {
  templateParams: {
    schemaOrg: MetaInput & { currency: string, host: string, inLanguage: string, path: string }
  }
}

export async function injectSchemaOrg<Input, RenderResult>(unhead: Unhead<Input, RenderResult>): Promise<SchemaOrgNode[]> {
  // filter for schema.org tag
  const tags = resolveTags(unhead)
  const schemaOrg = tags.find(tag => tag.key === 'schema-org-graph')!.innerHTML
  return JSON.parse(<string> schemaOrg)['@graph']
}

export async function findNode<T>(unhead: unknown, id: string) {
  const nodes = await injectSchemaOrg(unhead as Unhead<unknown, unknown>)
  // @ts-expect-error untyped
  return nodes.find(node => node['@id'] === id || node['@id'].endsWith(id)) as T
}
export async function useSetup(fn: (unhead: ServerUnhead<SchemaOrgMetaHeadInput>) => void, meta: Partial<MetaInput> = {}) {
  const head = createHead<SchemaOrgMetaHeadInput>({
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
