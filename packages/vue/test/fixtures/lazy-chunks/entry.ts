import { useCompiledHead } from '@unhead/vue/compiled'
import { createLazyHead } from '@unhead/vue/lazy'
import { readEntry } from 'unhead/compiled'

// The client of a Nuxt module in compiler mode: it reads compiled entries eagerly, and
// the template params plugin loads with the runtime.
const head = createLazyHead({ lazyPlugins: () => import('unhead/plugins').then(m => [m.TemplateParamsPlugin]) })
const entry = useCompiledHead([['title', 0, 10, 'title', { textContent: 'Home' }, 1]] as any, undefined, { head })
;(globalThis as any).__read = readEntry(head.entries.get(entry._i)!, head)
