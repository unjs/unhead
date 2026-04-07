import * as vueExports from '@unhead/schema-org/vue'
import { describe, expect, it } from 'vitest'
import { schemaAutoImports } from '../../src/imports'

describe('vue auto-imports', () => {
  it('every entry in schemaAutoImports is exported from @unhead/schema-org/vue', () => {
    const missing = schemaAutoImports.filter(name => !(name in vueExports))
    expect(missing, `Missing Vue exports: ${missing.join(', ')}`).toEqual([])
  })
})
