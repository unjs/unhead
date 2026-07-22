import type {
  DefinedRegion,
  HowTo,
  IdReference,
  MerchantReturnPolicy,
  Merge,
  MonetaryAmount,
  NodeRelation,
  Offer,
  OfferShippingDetails,
  Person,
  PodcastEpisode,
  PodcastSeason,
  PodcastSeries,
  Rating,
  ResolverOptions,
  SchemaOrgHeadInput,
  SchemaOrgNode,
  SchemaOrgNodeDefinition,
  ShippingDeliveryTime,
  Thing,
} from '@unhead/schema-org'
import type { SchemaOrgArticle } from '@unhead/schema-org/vue'
import type { DeepResolvableProperties } from '@unhead/vue'
import type { HeadPluginInput } from 'unhead/types'
import type { ComputedRef } from 'vue'
import {
  createSchemaOrgGraph,
  defineArticle,
  definePerson,
  merge,
  normalizeSchemaOrgInput,
  personResolver,
  ratingResolver,
  resolveMeta,
  resolveNode,
  resolveRelation,
  UnheadSchemaOrg,
} from '@unhead/schema-org'
import {
  defineSchemaOrgComponent,
  defineArticle as defineVueArticle,
  definePerson as defineVuePerson,
  defineWebSite as defineVueWebSite,
} from '@unhead/schema-org/vue'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { computed, ref } from 'vue'

type IsAny<T> = 0 extends (1 & T) ? true : false

describe('public types', () => {
  it('keeps arbitrary graph data open without leaking any', () => {
    const thing = { customProperty: 42 } satisfies Thing
    expectTypeOf(thing.customProperty).toEqualTypeOf<number>()

    const arbitraryThing = {} as Thing
    expectTypeOf(arbitraryThing.customProperty).toBeUnknown()

    const graphNode = {} as SchemaOrgNode
    expectTypeOf(graphNode._resolver).toBeUnknown()

    const reference: IdReference = { '@id': '#person' }
    expectTypeOf(reference).toMatchTypeOf<Thing>()
    expectTypeOf(reference.customProperty).toBeUnknown()
  })

  it('keeps optional define inputs honest without weakening provided inputs', () => {
    const emptyPerson = definePerson()
    expectTypeOf(emptyPerson.name).toEqualTypeOf<string | undefined>()
    expect(emptyPerson.name).toBeUndefined()

    const explicitUndefinedPerson = definePerson(undefined)
    expectTypeOf(explicitUndefinedPerson.name).toEqualTypeOf<string | undefined>()

    const person = definePerson({ name: 'Ada', customProperty: 42 })
    expectTypeOf(person.name).toEqualTypeOf<string>()
    expectTypeOf(person.customProperty).toEqualTypeOf<number>()

    // @ts-expect-error provided Person inputs still require a name
    definePerson({})
    // @ts-expect-error known Person properties remain validated
    definePerson({ name: 42 })
  })

  it('exposes honest graph metadata and synchronous plugin metadata', () => {
    const graph = createSchemaOrgGraph()
    expectTypeOf(graph.meta.host).toEqualTypeOf<string | undefined>()
    expectTypeOf(graph.meta.path).toEqualTypeOf<string>()
    expectTypeOf(graph.meta.url).toEqualTypeOf<string>()
    expectTypeOf(graph.meta.tagPosition).toEqualTypeOf<'body' | 'head' | undefined>()
    expect(graph.meta).toEqual(resolveMeta({}))
    expect(resolveMeta({ tagPosition: 'head' })).toMatchObject({ path: '/', tagPosition: 'head' })

    const unresolvedNode = graph.find('#person')
    expectTypeOf(unresolvedNode).toEqualTypeOf<SchemaOrgNode | null>()
    // @ts-expect-error callers cannot forge a result type without a runtime guard
    graph.find<Person>('#person')

    graph.push({ '@id': '#person', 'name': 'Ada' })
    const person = graph.find('#person', (node): node is Person => typeof node.name === 'string')
    expectTypeOf(person).toEqualTypeOf<Person | null>()
    expect(person?.name).toBe('Ada')
    expect(graph.find('#person', (node): node is Person => typeof node.name === 'string' && node.name === 'Grace')).toBeNull()

    const plugin = UnheadSchemaOrg({ trailingSlash: true })
    expectTypeOf(plugin).toMatchTypeOf<HeadPluginInput>()
    // @ts-expect-error schema tag resolution is synchronous, so metadata cannot be async
    UnheadSchemaOrg({}, async () => ({ host: 'https://example.com' }))
  })

  it('preserves helper inputs and normalized head input', () => {
    const article = defineArticle({
      headline: 'Typed headline',
      customProperty: 42,
    })
    expectTypeOf<IsAny<typeof article>>().toEqualTypeOf<false>()
    expectTypeOf(article.customProperty).toEqualTypeOf<number>()

    const nodes = [article]
    const normalized = normalizeSchemaOrgInput(nodes)
    expectTypeOf(normalized.script[0].nodes).toEqualTypeOf<typeof nodes>()
    expectTypeOf(normalizeSchemaOrgInput(normalized)).toEqualTypeOf<typeof normalized>()

    const readonlyNormalized = {
      script: [{
        type: 'application/ld+json',
        key: 'schema-org-graph',
        nodes,
      }],
    } as const
    expectTypeOf(normalizeSchemaOrgInput(readonlyNormalized)).toEqualTypeOf<typeof readonlyNormalized>()

    const regularHeadInput = { script: [{ src: '/app.js' }] }
    const wrapped = normalizeSchemaOrgInput(regularHeadInput)
    expect(wrapped.script[0].nodes).toBe(regularHeadInput)

    const widenedHeadInput: {
      readonly script: readonly { readonly type: string, readonly key: string, readonly nodes: unknown }[]
    } = readonlyNormalized
    expectTypeOf(normalizeSchemaOrgInput(widenedHeadInput))
      .toEqualTypeOf<typeof widenedHeadInput | SchemaOrgHeadInput<typeof widenedHeadInput>>()
  })

  it('preserves Vue values, refs, and component types', () => {
    const emptyPerson = defineVuePerson()
    expectTypeOf(emptyPerson.name).toEqualTypeOf<Partial<DeepResolvableProperties<Person>>['name']>()
    expect(emptyPerson.name).toBeUndefined()

    // @ts-expect-error known schema properties remain validated
    defineVueArticle({ headline: 42 })

    const headline = ref('Reactive headline')
    const article = defineVueArticle({
      headline,
      customProperty: computed(() => 42),
    })
    expectTypeOf<IsAny<typeof article>>().toEqualTypeOf<false>()
    expectTypeOf(article.headline).toMatchTypeOf<typeof headline>()

    const website = ref({ name: 'Typed site' })
    const definedWebsite = defineVueWebSite(website)
    expectTypeOf(definedWebsite).toMatchTypeOf<ComputedRef<{ name: string }>>()
    expectTypeOf(definedWebsite.value.name).toEqualTypeOf<string>()
    expect(definedWebsite).not.toBe(website)
    expectTypeOf<IsAny<typeof SchemaOrgArticle>>().toEqualTypeOf<false>()

    type ArticleComponentProps = InstanceType<typeof SchemaOrgArticle>['$props']
    const componentProps: ArticleComponentProps = {
      headline: 'Typed component',
      customProperty: 42,
      id: '#article',
      type: 'Article',
    }
    expectTypeOf(componentProps.headline).not.toBeAny()
    expectTypeOf(componentProps.customProperty).toEqualTypeOf<unknown>()
    // @ts-expect-error component props are derived from defineArticle
    const invalidComponentProps: ArticleComponentProps = { headline: 42 }
    expectTypeOf(invalidComponentProps).not.toBeAny()

    const _CustomSchemaOrg = defineSchemaOrgComponent('CustomSchemaOrg', (input?: { name: string }) => input)
    type CustomComponentProps = InstanceType<typeof _CustomSchemaOrg>['$props']
    const customComponentProps: CustomComponentProps = { name: 'Typed custom component' }
    expectTypeOf(customComponentProps.name).toEqualTypeOf<string>()
    // @ts-expect-error define function input drives custom component props
    const invalidCustomComponentProps: CustomComponentProps = { name: 42 }
    expectTypeOf(invalidCustomComponentProps).not.toBeAny()
  })

  it('types resolver callbacks and results from their resolver', () => {
    const graph = createSchemaOrgGraph()
    graph.meta = resolveMeta({ host: 'https://example.com', path: '/' })
    const options: ResolverOptions<Person> = {
      afterResolve(person) {
        expectTypeOf(person).toEqualTypeOf<Person>()
      },
    }
    const relation = resolveRelation({ name: 'Ada' } satisfies Person, graph, personResolver, options)
    expectTypeOf(relation).toMatchTypeOf<NodeRelation<Person> | NodeRelation<Person>[]>()

    const scalar = resolveRelation({ name: 'Ada' } satisfies Person, graph, personResolver)
    expectTypeOf(scalar).toEqualTypeOf<NodeRelation<Person>>()
    const array = resolveRelation({ name: 'Ada' } satisfies Person, graph, personResolver, { array: true })
    expectTypeOf(array).toEqualTypeOf<NodeRelation<Person>[]>()

    expectTypeOf(resolveNode('Ada', graph, personResolver)).toEqualTypeOf<Person>()
    expectTypeOf(resolveRelation('Ada', graph, personResolver)).toEqualTypeOf<NodeRelation<Person>>()
    const maybePersonResolver = personResolver as typeof personResolver | undefined
    expectTypeOf(resolveRelation('Ada', graph, maybePersonResolver)).toMatchTypeOf<NodeRelation<Person | string>>()
    expectTypeOf(resolveRelation(0, graph, personResolver)).toEqualTypeOf<0>()
    expectTypeOf(resolveRelation(false, graph, personResolver)).toEqualTypeOf<false>()
    expectTypeOf(resolveRelation('' as string, graph, personResolver)).toEqualTypeOf<NodeRelation<Person> | ''>()
    expectTypeOf(resolveRelation(0 as number, graph, ratingResolver)).toEqualTypeOf<NodeRelation<Rating> | 0>()
    expectTypeOf(resolveRelation([''] as const, graph, personResolver)).toEqualTypeOf<''>()
    expectTypeOf(resolveRelation([null] as const, graph, personResolver)).toEqualTypeOf<null>()
    expectTypeOf(resolveRelation([undefined] as const, graph, personResolver)).toEqualTypeOf<undefined>()
    expectTypeOf(resolveRelation([{ name: 'Ada' }] as const, graph, personResolver)).toEqualTypeOf<NodeRelation<Person>>()
    expectTypeOf(resolveRelation([{ name: 'Ada' }] as const, graph, personResolver, { array: true }))
      .toEqualTypeOf<NodeRelation<Person>[]>()
    expectTypeOf(resolveRelation([] as string[], graph, personResolver))
      .toEqualTypeOf<NodeRelation<Person> | '' | (NodeRelation<Person> | '')[]>()
    expectTypeOf(resolveRelation([] as string[], graph, personResolver, { array: true }))
      .toEqualTypeOf<(NodeRelation<Person> | '')[]>()
    // @ts-expect-error personResolver does not accept numeric input
    resolveRelation(123, graph, personResolver)

    expect(resolveNode(4, graph, ratingResolver)).toEqual({
      '@type': 'Rating',
      'bestRating': 5,
      'ratingValue': 4,
      'worstRating': 1,
    })

    const merged = merge({ name: 'Ada' }, { url: 'https://example.com/ada' })
    expectTypeOf(merged).toEqualTypeOf<{ name: string } & { url: string }>()

    const overwritten = merge({ value: 'old' }, { value: 1 })
    expectTypeOf(overwritten.value).toEqualTypeOf<number>()
    expect(overwritten.value).toBe(1)

    const mergedArrays = merge({ values: ['old'] }, { values: [1] })
    expectTypeOf(mergedArrays).toEqualTypeOf<Merge<{ values: string[] }, { values: number[] }>>()
    expectTypeOf(mergedArrays.values).toEqualTypeOf<(string | number)[]>()
    expect(mergedArrays.values).toEqual(['old', 1])

    const mergedArrayAndScalar = merge({ values: ['old', 'retained'] }, { values: 1 })
    expectTypeOf(mergedArrayAndScalar.values).toEqualTypeOf<(string | number)[]>()
    expect(mergedArrayAndScalar.values).toEqual([1, 'retained'])

    const mergedObjects = merge({ nested: { retained: 1 } }, { nested: { added: 'yes' } })
    expectTypeOf(mergedObjects.nested).toEqualTypeOf<{ retained: number } & { added: string }>()
    expect(mergedObjects.nested).toEqual({ retained: 1, added: 'yes' })

    const resolverWithCast: SchemaOrgNodeDefinition<Person, string> = {
      cast: name => ({ name }),
    }
    expectTypeOf(resolverWithCast.cast).not.toBeUndefined()
    // @ts-expect-error differing resolver input types require a cast function
    const resolverWithoutCast: SchemaOrgNodeDefinition<Person, string> = {}
    expectTypeOf(resolverWithoutCast).not.toBeAny()
  })

  it('preserves falsy relation inputs and requested array shapes at runtime', () => {
    const graph = createSchemaOrgGraph()
    graph.meta = resolveMeta({ host: 'https://example.com', path: '/' })
    const emptyName: string = ''
    const zeroRating: number = 0

    expect(resolveRelation(emptyName, graph, personResolver)).toBe('')
    expect(resolveRelation(zeroRating, graph, ratingResolver)).toBe(0)
    expect(resolveRelation([null] as const, graph, personResolver)).toBeNull()
    expect(resolveRelation([undefined] as const, graph, personResolver)).toBeUndefined()
    expect(resolveRelation([{ name: 'Ada' }] as const, graph, personResolver)).toEqual({
      '@type': 'Person',
      'name': 'Ada',
    })
    expect(resolveRelation([{ name: 'Ada' }] as const, graph, personResolver, { array: true })).toEqual([{
      '@type': 'Person',
      'name': 'Ada',
    }])
  })

  it('exposes concrete podcast relations', () => {
    const series: PodcastSeries = { name: 'Series' }
    const season: PodcastSeason = { partOfSeries: series }
    const episode: PodcastEpisode = {
      name: 'Episode',
      partOfSeason: season,
      partOfSeries: series,
    }
    expectTypeOf(episode.partOfSeason).toEqualTypeOf<NodeRelation<PodcastSeason> | undefined>()
  })

  it('exports concrete commerce node types', () => {
    const money: MonetaryAmount = { currency: 'USD', value: '100' }
    const region: DefinedRegion = { addressCountry: 'US' }
    const delivery: ShippingDeliveryTime = {}
    const shipping: OfferShippingDetails = {
      deliveryTime: delivery,
      shippingDestination: region,
      shippingRate: money,
    }
    const returns: MerchantReturnPolicy = {
      applicableCountry: 'US',
      returnPolicyCategory: 'MerchantReturnFiniteReturnWindow',
    }
    const offer: Offer = {
      price: 100,
      shippingDetails: [shipping],
      hasMerchantReturnPolicy: returns,
    }
    const howTo: HowTo = {
      name: 'Build a desk',
      step: [],
      estimatedCost: money,
    }
    expectTypeOf([offer, howTo]).not.toBeAny()
  })
})
