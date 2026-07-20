import type { ActiveHeadEntry, HeadEntryOptions, UseHeadInput } from 'unhead/types'
import type { UseSchemaOrgInput } from './index'
import { useHead, useUnhead } from '@unhead/react'
import { schemaAutoImports } from './imports'
import {
  normalizeSchemaOrgInput,
} from './index'
import { UnheadSchemaOrg } from './plugin'

export type { MetaInput, UserConfig } from './index'

export const schemaOrgAutoImports = [
  {
    from: '@unhead/schema-org/react',
    imports: schemaAutoImports,
  },
]

export {
  defineArticle,
  defineBook,
  defineBreadcrumb,
  defineComment,
  defineCourse,
  defineDataset,
  defineEvent,
  defineFoodEstablishment,
  defineHowTo,
  defineImage,
  defineItemList,
  defineJobPosting,
  defineLocalBusiness,
  defineMovie,
  defineMusicAlbum,
  defineMusicGroup,
  defineMusicPlaylist,
  defineMusicRecording,
  defineOrganization,
  definePerson,
  definePodcastEpisode,
  definePodcastSeason,
  definePodcastSeries,
  defineProduct,
  defineQuestion,
  defineRecipe,
  defineReview,
  defineService,
  defineSoftwareApp,
  defineTVEpisode,
  defineTVSeason,
  defineTVSeries,
  defineVideo,
  defineWebPage,
  defineWebSite,
} from './runtime'

type PatchedSchemaOrgEntry = ActiveHeadEntry<UseHeadInput> & { __patched?: boolean }
type PublicSchemaOrgEntry = ActiveHeadEntry<UseSchemaOrgInput> & { __patched?: boolean }
export function useSchemaOrg(input: UseSchemaOrgInput = [], options: HeadEntryOptions = {}): ActiveHeadEntry<UseSchemaOrgInput> {
  // lazy initialise the plugin
  const unhead = options.head || useUnhead()
  unhead.use(UnheadSchemaOrg())
  const entry = useHead(normalizeSchemaOrgInput(input) as unknown as UseHeadInput, options) as PatchedSchemaOrgEntry
  const corePatch = entry.patch
  const publicEntry = entry as unknown as PublicSchemaOrgEntry
  if (!publicEntry.__patched) {
    publicEntry.patch = input => corePatch(normalizeSchemaOrgInput(input) as unknown as UseHeadInput)
    publicEntry.__patched = true
  }
  return publicEntry
}
