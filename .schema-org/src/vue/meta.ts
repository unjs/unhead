import type { ComponentResolver } from 'unplugin-vue-components'

export interface SchemaOrgResolverOptions {
  /**
   * prefix for headless ui components used in templates
   *
   * @default ""
   */
  prefix?: string
}

export const schemaAutoImports = [
  'defineAddress',
  'defineAggregateOffer',
  'defineAggregateRating',
  'defineArticle',
  'defineBook',
  'defineBookEdition',
  'defineBreadcrumb',
  'defineComment',
  'defineCourse',
  'defineEvent',
  'defineHowTo',
  'defineHowToStep',
  'defineImage',
  'defineItemList',
  'defineJobPosting',
  'defineListItem',
  'defineLocalBusiness',
  'defineMovie',
  'defineOffer',
  'defineOpeningHours',
  'defineOrganization',
  'definePerson',
  'definePlace',
  'defineProduct',
  'defineQuestion',
  'defineReadAction',
  'defineRecipe',
  'defineReview',
  'defineSearchAction',
  'defineSoftwareApp',
  'defineVideo',
  'defineVirtualLocation',
  'defineWebPage',
  'defineWebSite',
  'useSchemaOrg',
]

export const schemaOrgAutoImports = [
  {
    from: '@unhead/schema-org/vue',
    imports: schemaAutoImports,
  },
]

export const schemaOrgComponents = [
  'SchemaOrgDebug',
  'SchemaOrgArticle',
  'SchemaOrgBreadcrumb',
  'SchemaOrgComment',
  'SchemaOrgEvent',
  'SchemaOrgHowTo',
  'SchemaOrgImage',
  'SchemaOrgJobPosting',
  'SchemaOrgLocalBusiness',
  'SchemaOrgOrganization',
  'SchemaOrgPerson',
  'SchemaOrgProduct',
  'SchemaOrgQuestion',
  'SchemaOrgRecipe',
  'SchemaOrgReview',
  'SchemaOrgVideo',
  'SchemaOrgWebPage',
  'SchemaOrgWebSite',
  'SchemaOrgMovie',
  'SchemaOrgCourse',
  'SchemaOrgItemList',
  'SchemaOrgBook',
  'SchemaOrgSoftwareApp',
]

export function SchemaOrgResolver(options: SchemaOrgResolverOptions = {}): ComponentResolver {
  const { prefix = '' } = options
  return {
    type: 'component',
    resolve: (name: string) => {
      if (name.startsWith(prefix)) {
        const componentName = name.substring(prefix.length)
        if (schemaOrgComponents.includes(componentName)) {
          return {
            name: componentName,
            from: '@unhead/schema-org/vue',
          }
        }
      }
    },
  }
}
