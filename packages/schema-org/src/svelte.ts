import type { ActiveHeadEntry, HeadEntryOptions, HeadEntryTarget, UseHeadInput } from 'unhead/types'
import type { UseSchemaOrgInput } from './index'
import { useHead, useUnhead } from '@unhead/svelte'
import { schemaAutoImports } from './imports'
import {
  normalizeSchemaOrgInput,
} from './index'
import { UnheadSchemaOrg } from './plugin'

interface SchemaOrgPluginHost { use: (plugin: ReturnType<typeof UnheadSchemaOrg>) => void }
type UseSchemaOrgOptions = Omit<HeadEntryOptions<UseHeadInput>, 'head'> & {
  head?: HeadEntryTarget<UseHeadInput> & SchemaOrgPluginHost
}

export function useSchemaOrg(input: UseSchemaOrgInput = [], options: UseSchemaOrgOptions = {}): ActiveHeadEntry<UseSchemaOrgInput> {
  // lazy initialise the plugin
  const unhead = options.head || useUnhead()
  unhead.use(UnheadSchemaOrg())
  const entry = useHead(normalizeSchemaOrgInput(input) as unknown as UseHeadInput, options)
  const corePatch = entry.patch
  const publicEntry = entry as unknown as ActiveHeadEntry<UseSchemaOrgInput>
  publicEntry.patch = input => corePatch(normalizeSchemaOrgInput(input) as unknown as UseHeadInput)
  return publicEntry
}

export type { MetaInput, UserConfig } from './index'

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

export const schemaOrgAutoImports = [
  {
    from: '@unhead/schema-org/svelte',
    imports: schemaAutoImports,
  },
]
