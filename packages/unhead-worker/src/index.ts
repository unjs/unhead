import { DedupePlugin, NormalizePlugin, SortPlugin, TemplateParamsPlugin, TitleTemplatePlugin, XSSPlugin } from 'unhead/plugins'

self.addEventListener('message', (_event) => {
  const plugins = [
    NormalizePlugin,
    DedupePlugin,
    SortPlugin,
    TemplateParamsPlugin,
    TitleTemplatePlugin,
    XSSPlugin,
  ]
  const event = _event.data as { type: string, payload: any }
  const ctx = event.payload
  if (event.type === 'entries:resolve') {
    plugins.forEach((_p) => {
      // @ts-expect-error untyped
      const p = _p(ctx)
      if ('entries:resolve' in p.hooks) {
        p.hooks['entries:resolve'](ctx)
      }
    })
  }
})
