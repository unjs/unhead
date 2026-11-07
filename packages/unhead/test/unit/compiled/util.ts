import type { CreateServerHeadOptions, HeadTag, RenderSSRHeadOptions } from '../../../src/types'
import type { Scenario, ScenarioEntry } from './corpus'
import { compileTags } from '../../../src/compiled/compile'
import { createHead as createCompiledHead, renderSSRHead as renderCompiled } from '../../../src/compiled/server'
import { TemplateParamsPlugin } from '../../../src/plugins'
import { createHead as createV3Head, renderSSRHead as renderV3 } from '../../../src/server'
import { resolveTags } from '../../../src/utils'
import { sanitizeTags } from '../../../src/utils/resolve'

export type Mode = 'compiled' | 'loose' | 'mixed-even' | 'mixed-odd'
export const MODES: Mode[] = ['compiled', 'loose', 'mixed-even', 'mixed-odd']

export function usesCompiledTags(mode: Mode, index: number): boolean {
  if (mode === 'compiled')
    return true
  if (mode === 'loose')
    return false
  return mode === 'mixed-even' ? index % 2 === 0 : index % 2 === 1
}

export function toCompiledTags(input: any): any {
  const result = compileTags(input)
  return result._tag === 'Ok' ? result.tags : input
}

// compiled tags with values for an entry that has a template, otherwise `toCompiledTags`
function toCompiledEntry({ input, template, values, options }: ScenarioEntry): [any, any] {
  if (!template)
    return [toCompiledTags(input), options]
  const result = compileTags(template, { dynamicValues: values!.length })
  return result._tag === 'Ok' ? [result.tags, { ...options, values }] : [input, options]
}

// every head state a reader can observe after a render
export function headState(head: any) {
  return {
    title: head._title,
    titleTemplate: head._titleTemplate,
    templateParams: head._templateParams,
    separator: head._separator,
  }
}

export function attempt<T>(fn: () => T): { value: T } | { threw: true } {
  try {
    return { value: fn() }
  }
  catch {
    return { threw: true }
  }
}

function applyEntries(head: any, scenario: Scenario, compiledTags: (input: any, index: number) => any, compiledEntry?: (entry: ScenarioEntry, index: number) => [any, any] | undefined) {
  scenario.entries.forEach((scenarioEntry, index) => {
    const { input, options, dispose, patch } = scenarioEntry
    const [pushed, pushOptions] = compiledEntry?.(scenarioEntry, index) || [compiledTags(input, index), options]
    const entry = head.push(pushed, pushOptions)
    if (dispose)
      entry.dispose()
    if (patch !== undefined)
      entry.patch(compiledTags(patch, index))
  })
}

function headOptions(scenario: Scenario, tp: boolean, init: (input: any) => any, seen?: unknown[]): CreateServerHeadOptions {
  return {
    disableDefaults: true,
    ...scenario.head,
    init: scenario.head?.init?.map(input => input && init(input)),
    plugins: tp ? [TemplateParamsPlugin] : [],
    // a listener moves a compiled head to the v3 tier, and it records what a module would see.
    // Compiled tags drop a tag that sanitize drops and that has no identity, so the record does too
    hooks: seen && {
      'tags:resolve': ({ tags }: { tags: HeadTag[] }) => {
        const kept = tags.filter(tag => tag._d || sanitizeTags([tag]).length)
        seen.push(projectTags(kept).map((projected, i) => ({
          ...projected,
          h: kept[i]!._h,
          classIsSet: kept[i]!.props.class === undefined || (kept[i]!.props.class as unknown) instanceof Set,
          styleIsMap: kept[i]!.props.style === undefined || (kept[i]!.props.style as unknown) instanceof Map,
        })))
      },
    },
  }
}

export function renderScenarioV3(scenario: Scenario, tp: boolean, seen?: unknown[]) {
  const head = createV3Head(headOptions(scenario, tp, input => input, seen))
  applyEntries(head, scenario, input => input)
  return renderAll(head, renderV3, scenario.render)
}

export function renderScenarioCompiled(scenario: Scenario, tp: boolean, mode: Mode, seen?: unknown[]) {
  const head = createCompiledHead<any>(headOptions(scenario, tp, input => usesCompiledTags(mode, 0) ? toCompiledTags(input) : input, seen))
  applyEntries(head, scenario, (input, index) => usesCompiledTags(mode, index) ? toCompiledTags(input) : input, (entry, index) => usesCompiledTags(mode, index) ? toCompiledEntry(entry) : undefined)
  return renderAll(head, renderCompiled, scenario.render)
}

function renderAll(head: any, render: (head: any, options?: RenderSSRHeadOptions) => any, options?: RenderSSRHeadOptions) {
  return attempt(() => ({
    first: render(head, options),
    state: headState(head),
    again: render(head, options),
    method: head.render(),
    stateAfter: headState(head),
  }))
}

// the resolved tag fields a reader of resolveTags() sees. `_p` is left out: compiled tags
// drop inert tags, so a later tag index may shift while its relative order holds
export function projectTags(tags: HeadTag[]) {
  return tags.map(tag => ({
    tag: tag.tag,
    props: tag.props,
    textContent: tag.textContent,
    innerHTML: tag.innerHTML,
    tagPosition: tag.tagPosition,
    tagPriority: tag.tagPriority,
    w: tag._w,
    d: tag._d,
  }))
}

export function resolveScenarioV3(scenario: Scenario, tp: boolean) {
  const head = createV3Head(headOptions(scenario, tp, input => input))
  applyEntries(head, scenario, input => input)
  return attempt(() => projectTags(resolveTags(head)))
}

export function resolveScenarioCompiled(scenario: Scenario, tp: boolean, mode: Mode) {
  const head = createCompiledHead<any>(headOptions(scenario, tp, input => usesCompiledTags(mode, 0) ? toCompiledTags(input) : input))
  applyEntries(head, scenario, (input, index) => usesCompiledTags(mode, index) ? toCompiledTags(input) : input, (entry, index) => usesCompiledTags(mode, index) ? toCompiledEntry(entry) : undefined)
  return attempt(() => projectTags(resolveTags(head)))
}
