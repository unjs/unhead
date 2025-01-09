declare module '@unhead/schema' {
  import type { ScriptInstance } from '@unhead/scripts'

  export interface HeadHooks {
    'script:updated': (ctx: { script: ScriptInstance<any> }) => void | Promise<void>
  }
}

export {}
