import { createHead, useHead } from 'unhead/precompiled/client'

const head = createHead()

export const entry = useHead({
  title: 'CLIENT_PRECOMPILE_MARKER',
  meta: [{ name: 'description', content: 'static client fixture' }],
}, { head })
