import type { HeadEntry, HeadPlugin, HeadTag, Unhead } from 'unhead/types'
import type { SchemaOrgGraph } from './core/graph'
import type { MetaInput, ResolvedMeta } from './types'
import { defineHeadPlugin, TemplateParamsPlugin } from 'unhead/plugins'
import { hasOwn, processTemplateParams } from 'unhead/utils'
import { isBuiltinSchemaNode } from './core/define'
import {
  createSchemaOrgGraph,
} from './core/graph'
import { resolveMeta } from './core/resolve'

type InputSnapshot
  = | { _tag: 'value', value: unknown }
    | { _tag: 'date', value: number }
    | { _tag: 'array', keys: string[], length: number, values: InputSnapshot[] }
    | { _tag: 'object', keys: string[], values: InputSnapshot[] }
type EntrySnapshot = [entry: HeadEntry<any>, input: unknown, tags: HeadTag[] | undefined, value: InputSnapshot]
type GraphCache = { _tag: 'empty' } | {
  _tag: 'ready'
  entries: EntrySnapshot[]
  html: string
  minify: boolean
  year: number
}
const StaticHook = Symbol.for('unhead:static-hook')
const TagMutationHook = /^(?:entries:(?:resolve|normalize)|tags?:)/

function hooksAreCacheable(head: Unhead, ownHooks: Set<(...args: any[]) => any>): boolean {
  const hooks = (head.hooks as any)?._hooks || {}
  for (const name in hooks) {
    if (!TagMutationHook.test(name))
      continue
    for (const hook of hooks[name] || []) {
      if (!ownHooks.has(hook) && !(hook as any)[StaticHook])
        return false
    }
  }
  return true
}

function hasDynamicInput(value: unknown, seen = new WeakSet<object>()): boolean {
  if (typeof value === 'function')
    return true
  if (!value || typeof value !== 'object')
    return false
  if (seen.has(value))
    return true
  if (!(Array.isArray(value) || value instanceof Date || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null))
    return true
  seen.add(value)
  if (Object.hasOwn(value, '_resolver') && !isBuiltinSchemaNode(value))
    return true
  for (const key in value) {
    if (key !== '_resolver' && Object.hasOwn(value, key) && hasDynamicInput((value as Record<string, unknown>)[key], seen))
      return true
  }
  return false
}

function snapshotInput(value: unknown): InputSnapshot {
  if (!value || typeof value !== 'object')
    return { _tag: 'value', value }
  if (value instanceof Date)
    return { _tag: 'date', value: value.getTime() }
  const keys = Object.keys(value)
  const values = keys.map((key) => {
    const child = (value as Record<string, unknown>)[key]
    return key === '_resolver' ? { _tag: 'value', value: child } as const : snapshotInput(child)
  })
  return Array.isArray(value)
    ? { _tag: 'array', keys, length: value.length, values }
    : { _tag: 'object', keys, values }
}

function inputMatches(value: unknown, snapshot: InputSnapshot): boolean {
  if (snapshot._tag === 'value')
    return Object.is(value, snapshot.value)
  if (snapshot._tag === 'date')
    return value instanceof Date && value.getTime() === snapshot.value
  if (!value || typeof value !== 'object' || Array.isArray(value) !== (snapshot._tag === 'array'))
    return false
  if (snapshot._tag === 'array' && (value as unknown[]).length !== snapshot.length)
    return false
  let keyCount = 0
  for (const key in value) {
    if (Object.hasOwn(value, key))
      keyCount++
  }
  if (keyCount !== snapshot.keys.length)
    return false
  for (let i = 0; i < snapshot.keys.length; i++) {
    const key = snapshot.keys[i]
    if (!Object.hasOwn(value, key)
      || !inputMatches((value as Record<string, unknown>)[key], snapshot.values[i])) {
      return false
    }
  }
  return true
}

function captureEntries(entries: HeadEntry<any>[]): EntrySnapshot[] {
  return entries.map(entry => [entry, entry.input, entry._tags, snapshotInput(entry.input)])
}

function entriesMatch(entries: HeadEntry<any>[], snapshot: EntrySnapshot[]): boolean {
  if (entries.length !== snapshot.length)
    return false
  for (let i = 0; i < entries.length; i++) {
    if (entries[i] !== snapshot[i][0]
      || entries[i].input !== snapshot[i][1]
      || entries[i]._tags !== snapshot[i][2]
      || !inputMatches(entries[i].input, snapshot[i][3])) {
      return false
    }
  }
  return true
}

function hasDynamicEntries(entries: HeadEntry<any>[]): boolean {
  const seen = new WeakSet<object>()
  return entries.some(entry => hasDynamicInput(entry.input, seen))
}

// Simple merge utility that recursively merges objects
function mergeObjects(target: any, source: any): any {
  const result = { ...target }
  for (const key in source) {
    if (!hasOwn(source, key) || source[key] === undefined || key === '__proto__' || key === 'constructor' || key === 'prototype')
      continue

    const isNestedObject = result[key]
      && typeof result[key] === 'object'
      && typeof source[key] === 'object'
      && !Array.isArray(result[key])
      && !Array.isArray(source[key])

    if (isNestedObject)
      result[key] = mergeObjects(result[key], source[key])
    else if (!result[key])
      result[key] = source[key]
  }
  return result
}

function isSchemaOrgTag(tag: HeadTag) {
  return (tag.tag === 'script' && tag.props.type === 'application/ld+json' && tag.props.nodes) || tag.key === 'schema-org-graph'
}

export interface PluginSchemaOrgOptions {
  minify?: boolean
  trailingSlash?: boolean
}

export function UnheadSchemaOrg(config: MetaInput = {} as MetaInput, meta?: () => Partial<MetaInput>, options?: PluginSchemaOrgOptions) {
  config = resolveMeta({ ...config })
  let graph: SchemaOrgGraph
  let resolvedMeta: Partial<ResolvedMeta> = {}
  let cache: GraphCache = { _tag: 'empty' }
  let entries: HeadEntry<any>[] = []
  let reuseGraph = false
  return defineHeadPlugin((head: Unhead): HeadPlugin => {
    head.use(TemplateParamsPlugin)
    const ownHooks = new Set<(...args: any[]) => any>()
    function collectTag(tag: HeadTag) {
      if (tag.tag === 'script' && tag.props.type === 'application/ld+json' && tag.props.nodes) {
        // this is a bit expensive, load in seperate chunk
        const nodes = tag.props.nodes
        for (const node of Array.isArray(nodes) ? nodes : [nodes]) {
          // malformed input - skip null/undefined but allow empty objects
          if (typeof node !== 'object' || node === null) {
            continue
          }

          const newNode = {
            ...node,
            _dedupeStrategy: tag.tagDuplicateStrategy,
          }
          // Push node (it already has _resolver if it came from a defineXXX function)
          graph.push(newNode)
        }
        tag.tagPosition = tag.tagPosition || (config.tagPosition === 'head' ? 'head' : 'bodyClose')
      }
      if (tag.tag === 'htmlAttrs' && typeof tag.props.lang === 'string') {
        resolvedMeta.inLanguage = tag.props.lang
      }
      else if (tag.tag === 'title' && tag.textContent != null && typeof tag.textContent !== 'function') {
        resolvedMeta.title = String(tag.textContent)
      }
      else if (tag.tag === 'meta' && tag.props.name === 'description' && typeof tag.props.content === 'string') {
        resolvedMeta.description = tag.props.content
      }
      else if (tag.tag === 'link' && tag.props.rel === 'canonical' && typeof tag.props.href === 'string') {
        resolvedMeta.url = tag.props.href
        // may be using template params that aren't resolved
        if (resolvedMeta.url && !resolvedMeta.host) {
          try {
            resolvedMeta.host = new URL(resolvedMeta.url).origin
          }
          catch {
            // Canonical URLs may contain unresolved template params; leave host unset.
          }
        }
      }
      else if (tag.tag === 'meta' && tag.props.property === 'og:image' && typeof tag.props.content === 'string') {
        resolvedMeta.image = tag.props.content
      }
      // use template params
      else if (tag.tag === 'templateParams' && tag.props.schemaOrg) {
        resolvedMeta = {
          ...resolvedMeta,
          ...(tag.props.schemaOrg as unknown as Record<string, any>),
        }
      }
    }
    const plugin: HeadPlugin = {
      key: 'schema-org',
      hooks: {
        'entries:resolve': (ctx) => {
          entries = ctx.entries
          // eslint-disable-next-line node/prefer-global/process
          const minify = options?.minify || process.env.NODE_ENV === 'production'
          const year = new Date().getFullYear()
          reuseGraph = hooksAreCacheable(head, ownHooks)
            && cache._tag === 'ready'
            && cache.minify === minify
            && cache.year === year
            && entriesMatch(entries, cache.entries)
          if (reuseGraph)
            return
          cache = { _tag: 'empty' }
          graph = graph || createSchemaOrgGraph()
          // Reset graph nodes each cycle so disposed entries don't leave stale nodes.
          graph.nodes = []
          graph.nodeIndex.clear()
          resolvedMeta = {}
          for (const entry of ctx.entries) {
            if (entry._tags) {
              if (entry._tags.some(isSchemaOrgTag)) {
                delete entry._tags
                continue
              }
              for (const tag of entry._tags)
                collectTag(tag)
            }
          }
        },
        'entries:normalize': ({ tags }) => {
          if (reuseGraph)
            return
          for (const tag of tags)
            collectTag(tag)
        },
        'tags:resolve': (ctx) => {
          // find the schema.org node, should be a single instance
          for (const k in ctx.tags) {
            const tag = ctx.tags[k]
            if (tag.tag === 'script' && tag.props.type === 'application/ld+json' && tag.props.nodes) {
              delete tag.props.nodes
              if (cache._tag === 'ready' && reuseGraph) {
                tag.innerHTML = cache.html
                return
              }
              const resolvedGraph = graph.resolveGraph({ ...(meta?.() || {}), ...config, ...resolvedMeta })
              if (!resolvedGraph.length) {
                // removes the tag
                tag.props = {}
                return
              }
              // eslint-disable-next-line node/prefer-global/process
              const minify = options?.minify || process.env.NODE_ENV === 'production'
              tag.innerHTML = JSON.stringify({
                '@context': 'https://schema.org',
                '@graph': resolvedGraph,
              }, (_, value) => {
                // process template params here
                if (typeof value === 'string')
                  return processTemplateParams(value, head._templateParams!, head._separator!)
                return value
              }, minify ? 0 : 2)
              if (!meta
                && !head.resolvedOptions.propResolvers?.length
                && hooksAreCacheable(head, ownHooks)
                && !hasDynamicEntries(entries)) {
                cache = {
                  _tag: 'ready',
                  entries: captureEntries(entries),
                  html: tag.innerHTML,
                  minify,
                  year: new Date().getFullYear(),
                }
              }
              return
            }
          }
        },
        'tags:afterResolve': (ctx) => {
          let firstNodeIdx: number | undefined
          let toRemove: Set<number> | undefined
          for (let i = 0; i < ctx.tags.length; i++) {
            const tag = ctx.tags[i]
            if (!tag?.props)
              continue
            if (isSchemaOrgTag(tag)) {
              delete tag.props.nodes
              if (typeof firstNodeIdx === 'undefined') {
                firstNodeIdx = i
                continue
              }
              // merge props on to first node and delete
              ctx.tags[firstNodeIdx].props = mergeObjects(ctx.tags[firstNodeIdx].props, tag.props)
              delete ctx.tags[firstNodeIdx].props.nodes
              ;(toRemove ||= new Set()).add(i)
            }
          }
          // there may be multiple script nodes within the same entry
          if (toRemove)
            ctx.tags = ctx.tags.filter((_: unknown, i: number) => !toRemove.has(i))
        },
      },
    }
    for (const hook of Object.values(plugin.hooks || {})) ownHooks.add(hook)
    return plugin
  }, 'schema-org')
}
