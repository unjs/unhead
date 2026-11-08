import { useSeoMeta } from 'unhead'
import { compileTags, dynamicValue } from 'unhead/compiled'
import { createHead as createCompiledHead, renderSSRHead as renderCompiled } from 'unhead/compiled/server'
import { TemplateParamsPlugin } from 'unhead/plugins'
import { createHead as createV3Head, renderSSRHead as renderV3 } from 'unhead/server'
import { unpackMeta } from 'unhead/utils'
import { it } from 'vitest'
// @ts-expect-error untyped fixture shared with the dist harness
import { createFixtures } from './compiled-server-fixtures.mjs'

const groups = createFixtures({ compileTags, dynamicValue, unpackMeta, useSeoMeta, createV3Head, renderV3, createCompiledHead, renderCompiled, TemplateParamsPlugin })

for (const group of groups) {
  it(`compiled server, ${group.name} fixture, ${group.tier} tier`, async ({ bench }) => {
    await bench.compare(bench('v3', () => {
      group.v3()
    }), bench('compiled', () => {
      group.compiled()
    }))
  })
}
