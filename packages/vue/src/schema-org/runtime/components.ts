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
} from './index'

function shallowVNodesToText(nodes: any) {
  let text = ''
  for (const node of nodes) {
    if (typeof node.children === 'string')
      text += node.children.trim()
  }
  return text
}

function fixKey(s: string) {
  // kebab case to camel case
  let key = s.replace(/-./g, x => x[1].toUpperCase())
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

export function defineSchemaOrgComponent(name: string, defineFn: (input: any) => any): ReturnType<typeof defineComponent> {
  return defineComponent({
    name,
    props: {
      as: String,
    },
    setup(props, { slots, attrs }) {
      const node = ref(null)

      const nodePartial = computed(() => {
        const val: Record<string, any> = {}
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
        useSchemaOrg(defineFn(unref(nodePartial)))
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
  })
}

export const SchemaOrgArticle = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgArticle', defineArticle)
export const SchemaOrgBreadcrumb = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgBreadcrumb', defineBreadcrumb)
export const SchemaOrgComment = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgComment', defineComment)
export const SchemaOrgEvent = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgEvent', defineEvent)
export const SchemaOrgFoodEstablishment = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgFoodEstablishment', defineFoodEstablishment)
export const SchemaOrgHowTo = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgHowTo', defineHowTo)
export const SchemaOrgImage = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgImage', defineImage)
export const SchemaOrgJobPosting = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgJobPosting', defineJobPosting)
export const SchemaOrgLocalBusiness = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgLocalBusiness', defineLocalBusiness)
export const SchemaOrgOrganization = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgOrganization', defineOrganization)
export const SchemaOrgPerson = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgPerson', definePerson)
export const SchemaOrgProduct = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgProduct', defineProduct)
export const SchemaOrgQuestion = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgQuestion', defineQuestion)
export const SchemaOrgRecipe = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgRecipe', defineRecipe)
export const SchemaOrgReview = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgReview', defineReview)
export const SchemaOrgVideo = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgVideo', defineVideo)
export const SchemaOrgWebPage = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgWebPage', defineWebPage)
export const SchemaOrgWebSite = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgWebSite', defineWebSite)
export const SchemaOrgMovie = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgMovie', defineMovie)
export const SchemaOrgCourse = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgCourse', defineCourse)
export const SchemaOrgItemList = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgItemList', defineItemList)
export const SchemaOrgBook = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgBook', defineBook)
export const SchemaOrgSoftwareApp = /* @__PURE__ */ defineSchemaOrgComponent('SchemaOrgSoftwareApp', defineSoftwareApp)
