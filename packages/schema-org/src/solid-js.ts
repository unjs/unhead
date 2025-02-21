import type { ActiveHeadEntry, HeadEntryOptions } from 'unhead/types'
import type { UseSchemaOrgInput } from './index'
import { useHead, useUnhead } from '@unhead/solid-js'
import { schemaAutoImports } from './imports'
import {
  normalizeSchemaOrgInput,
} from './index'
import { UnheadSchemaOrg } from './plugin'

export type { MetaInput, UserConfig } from './index'

export const schemaOrgAutoImports = [
  {
    from: '@unhead/schema-org/solid-js',
    imports: schemaAutoImports,
  },
]

export {
  defineArticle,
  defineBook,
  defineBreadcrumb,
  defineComment,
  defineCourse,
  defineEvent,
  defineFoodEstablishment,
  defineHowTo,
  defineImage,
  defineItemList,
  defineJobPosting,
  defineLocalBusiness,
  defineMovie,
  defineOrganization,
  definePerson,
  defineProduct,
  defineQuestion,
  defineRecipe,
  defineReview,
  defineSoftwareApp,
  defineVideo,
  defineWebPage,
  defineWebSite,
} from './runtime'

export function useSchemaOrg(input: UseSchemaOrgInput = [], options: HeadEntryOptions = {}): ActiveHeadEntry<UseSchemaOrgInput> {
  // lazy initialise the plugin
  const unhead = options.head || useUnhead()
  unhead.use(UnheadSchemaOrg())
  // @ts-expect-error untyped
  const entry = useHead(normalizeSchemaOrgInput(input), options) as ActiveHeadEntry<UseSchemaOrgInput>
  const corePatch = entry.patch
  // @ts-expect-error runtime
  if (!entry.__patched) {
    entry.patch = input => corePatch(normalizeSchemaOrgInput(input))
    // @ts-expect-error runtime
    entry.__patched = true
  }
  return entry
}
