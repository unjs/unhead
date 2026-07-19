import { describe, expect, it } from 'vitest'
import { legacyPlugins } from '../../src/legacy'
import { AliasSortingPlugin, DeprecationsPlugin, PromisesPlugin, TemplateParamsPlugin } from '../../src/plugins'

describe('legacy', () => {
  it('exports the v2 compatibility plugin set', () => {
    expect(legacyPlugins).toEqual([
      DeprecationsPlugin,
      PromisesPlugin,
      TemplateParamsPlugin,
      AliasSortingPlugin,
    ])
  })
})
