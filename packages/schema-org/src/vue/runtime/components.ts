import type { DeepResolvableProperties } from '@unhead/vue'
import type { DefineComponent, VNode } from 'vue'
import type { Article } from '../../nodes/Article'
import type { Book } from '../../nodes/Book'
import type { BreadcrumbList } from '../../nodes/Breadcrumb'
import type { Comment } from '../../nodes/Comment'
import type { Course } from '../../nodes/Course'
import type { Event } from '../../nodes/Event'
import type { FoodEstablishment } from '../../nodes/FoodEstablishment'
import type { HowTo } from '../../nodes/HowTo'
import type { ImageObject } from '../../nodes/Image'
import type { ItemList } from '../../nodes/ItemList'
import type { JobPosting } from '../../nodes/JobPosting'
import type { LocalBusiness } from '../../nodes/LocalBusiness'
import type { Movie } from '../../nodes/Movie'
import type { Organization } from '../../nodes/Organization'
import type { Person } from '../../nodes/Person'
import type { Product } from '../../nodes/Product'
import type { Question } from '../../nodes/Question'
import type { Recipe } from '../../nodes/Recipe'
import type { Review } from '../../nodes/Review'
import type { SoftwareApp } from '../../nodes/SoftwareApp'
import type { VideoObject } from '../../nodes/Video'
import type { WebPage } from '../../nodes/WebPage'
import type { WebSite } from '../../nodes/WebSite'
import type { Thing } from '../../types'
import type { UseSchemaOrgInput } from './composables'
import { computed, defineComponent, h, ref, unref } from 'vue'
import {
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
  useSchemaOrg,
} from './composables'

const KEBAB_RE = /-./g
type SchemaOrgDefinition = (...args: never[]) => unknown
type SchemaOrgDefinitionProps<DefineFn extends SchemaOrgDefinition> = DefineFn extends (input: infer Props) => unknown
  ? NonNullable<Props> extends object
    ? NonNullable<Props>
    : Record<string, unknown>
  : Record<string, unknown>
type WithoutIndexSignature<T> = {
  [Key in keyof T as string extends Key ? never : number extends Key ? never : Key]: T[Key]
}
type SchemaOrgComponentInput<T extends Thing> = DeepResolvableProperties<WithoutIndexSignature<T>>
  & {
    id?: DeepResolvableProperties<T>['@id']
    type?: DeepResolvableProperties<T>['@type']
  }
type SchemaOrgComponentProps<Props extends object> = { as?: string } & Props
type SchemaOrgComponentInstance<Props extends object> = InstanceType<DefineComponent<SchemaOrgComponentProps<Props>>>
export type SchemaOrgComponent<Props extends object = Record<string, unknown>>
  = DefineComponent<SchemaOrgComponentProps<Props>>
    & (new () => SchemaOrgComponentInstance<Props> & {
      $props: SchemaOrgComponentInstance<Props>['$props'] & Record<string, unknown>
    })

function shallowVNodesToText(nodes: VNode[]) {
  let text = ''
  for (const node of nodes) {
    if (typeof node.children === 'string')
      text += node.children.trim()
  }
  return text
}

function fixKey(s: string) {
  // kebab case to camel case
  let key = s.replace(KEBAB_RE, x => x[1].toUpperCase())
  // supports @type & @id
  if (key === 'type' || key === 'id')
    key = `@${key}`
  return key
}

function ignoreKey(s: string) {
  // pretty hacky, need to setup all props
  if (s.startsWith('aria-') || s.startsWith('data-'))
    return false

  return s === 'class' || s === 'style'
}

export function defineSchemaOrgComponent<DefineFn extends SchemaOrgDefinition, Props extends object = SchemaOrgDefinitionProps<DefineFn>>(name: string, defineFn: DefineFn): SchemaOrgComponent<Props> {
  return defineComponent({
    name,
    props: {
      as: String,
    },
    setup(props, { slots, attrs }) {
      const node = ref(null)

      const nodePartial = computed(() => {
        const val: Record<string, unknown> = {}
        Object.entries(unref(attrs)).forEach(([key, value]) => {
          if (!ignoreKey(key)) {
            // keys may be passed with kebab case, and they aren't transformed
            val[fixKey(key)] = unref(value)
          }
        })
        // only render vnodes while we don't have a node
        if (!node.value) {
          // iterate through slots
          for (const [key, slot] of Object.entries(slots)) {
            if (!slot || key === 'default')
              continue
            // allow users to provide data via slots that aren't rendered
            val[fixKey(key)] = shallowVNodesToText(slot(props))
          }
        }
        return val
      })

      // may not be available
      if (defineFn) {
        // register via main schema composable for route watching
        useSchemaOrg(defineFn(unref(nodePartial) as never) as UseSchemaOrgInput)
      }

      return () => {
        const data = unref(nodePartial)
        // renderless component
        if (!slots.default)
          return null
        const childSlots = []
        if (slots.default)
          childSlots.push(slots.default(data))
        return h(props.as || 'div', {}, childSlots)
      }
    },
  }) as unknown as SchemaOrgComponent<Props>
}

export const SchemaOrgArticle = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineArticle, SchemaOrgComponentInput<Article>>('SchemaOrgArticle', defineArticle)
export const SchemaOrgBreadcrumb = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineBreadcrumb, SchemaOrgComponentInput<BreadcrumbList>>('SchemaOrgBreadcrumb', defineBreadcrumb)
export const SchemaOrgComment = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineComment, SchemaOrgComponentInput<Comment>>('SchemaOrgComment', defineComment)
export const SchemaOrgEvent = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineEvent, SchemaOrgComponentInput<Event>>('SchemaOrgEvent', defineEvent)
export const SchemaOrgFoodEstablishment = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineFoodEstablishment, SchemaOrgComponentInput<FoodEstablishment>>('SchemaOrgFoodEstablishment', defineFoodEstablishment)
export const SchemaOrgHowTo = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineHowTo, SchemaOrgComponentInput<HowTo>>('SchemaOrgHowTo', defineHowTo)
export const SchemaOrgImage = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineImage, SchemaOrgComponentInput<ImageObject>>('SchemaOrgImage', defineImage)
export const SchemaOrgJobPosting = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineJobPosting, SchemaOrgComponentInput<JobPosting>>('SchemaOrgJobPosting', defineJobPosting)
export const SchemaOrgLocalBusiness = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineLocalBusiness, SchemaOrgComponentInput<LocalBusiness>>('SchemaOrgLocalBusiness', defineLocalBusiness)
export const SchemaOrgOrganization = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineOrganization, SchemaOrgComponentInput<Organization>>('SchemaOrgOrganization', defineOrganization)
export const SchemaOrgPerson = /* @__PURE__ */ defineSchemaOrgComponent<typeof definePerson, SchemaOrgComponentInput<Person>>('SchemaOrgPerson', definePerson)
export const SchemaOrgProduct = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineProduct, SchemaOrgComponentInput<Product>>('SchemaOrgProduct', defineProduct)
export const SchemaOrgQuestion = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineQuestion, SchemaOrgComponentInput<Question>>('SchemaOrgQuestion', defineQuestion)
export const SchemaOrgRecipe = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineRecipe, SchemaOrgComponentInput<Recipe>>('SchemaOrgRecipe', defineRecipe)
export const SchemaOrgReview = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineReview, SchemaOrgComponentInput<Review>>('SchemaOrgReview', defineReview)
export const SchemaOrgVideo = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineVideo, SchemaOrgComponentInput<VideoObject>>('SchemaOrgVideo', defineVideo)
export const SchemaOrgWebPage = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineWebPage, SchemaOrgComponentInput<WebPage>>('SchemaOrgWebPage', defineWebPage)
export const SchemaOrgWebSite = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineWebSite, SchemaOrgComponentInput<WebSite>>('SchemaOrgWebSite', defineWebSite)
export const SchemaOrgMovie = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineMovie, SchemaOrgComponentInput<Movie>>('SchemaOrgMovie', defineMovie)
export const SchemaOrgCourse = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineCourse, SchemaOrgComponentInput<Course>>('SchemaOrgCourse', defineCourse)
export const SchemaOrgItemList = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineItemList, SchemaOrgComponentInput<ItemList>>('SchemaOrgItemList', defineItemList)
export const SchemaOrgBook = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineBook, SchemaOrgComponentInput<Book>>('SchemaOrgBook', defineBook)
export const SchemaOrgSoftwareApp = /* @__PURE__ */ defineSchemaOrgComponent<typeof defineSoftwareApp, SchemaOrgComponentInput<SoftwareApp>>('SchemaOrgSoftwareApp', defineSoftwareApp)
