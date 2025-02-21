import type { ActiveHeadEntry, HeadEntryOptions } from 'unhead/types'
import type { UseSchemaOrgInput } from '../index'
import { useHead, useUnhead } from '@unhead/svelte'
import {
  normalizeSchemaOrgInput,
} from '../index'
import { UnheadSchemaOrg } from '../plugin'

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
} from '../runtime'

export function useSchemaOrg(input: UseSchemaOrgInput = [], options: HeadEntryOptions = {}): ActiveHeadEntry<UseSchemaOrgInput> {
  // lazy initialise the plugin
  const unhead = options.head || useUnhead()
  unhead.use(UnheadSchemaOrg())
  const entry = useHead(normalizeSchemaOrgInput(input), options) as ActiveHeadEntry<UseSchemaOrgInput>
  const corePatch = entry.patch
  entry.patch = input => corePatch(normalizeSchemaOrgInput(input))
  return entry
}
