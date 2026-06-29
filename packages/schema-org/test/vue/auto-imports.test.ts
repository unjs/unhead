import { schemaAutoImports as schemaAutoImportsSubpath } from '@unhead/schema-org/imports'
import * as vueExports from '@unhead/schema-org/vue'
import { schemaOrgAutoImports, SchemaOrgResolver } from '@unhead/schema-org/vue/meta'
import { describe, expect, it } from 'vitest'
import { schemaAutoImports } from '../../src/imports'

describe('vue auto-imports', () => {
  it('every entry in schemaAutoImports is exported from @unhead/schema-org/vue', () => {
    const missing = schemaAutoImports.filter(name => !(name in vueExports))
    expect(missing, `Missing Vue exports: ${missing.join(', ')}`).toEqual([])
  })

  it('exposes data-only auto-import metadata from public subpaths', () => {
    expect(schemaAutoImportsSubpath).toBe(schemaAutoImports)
    expect(schemaOrgAutoImports).toEqual([{
      from: '@unhead/schema-org/vue',
      imports: schemaAutoImports,
    }])
    const resolver = SchemaOrgResolver() as { resolve: (name: string) => unknown }
    expect(resolver.resolve('SchemaOrgWebPage')).toEqual({
      name: 'SchemaOrgWebPage',
      from: '@unhead/schema-org/vue',
    })
  })
})
