import * as ui from '#build/ui'
import type { TVConfig } from '@nuxt/ui'
import type { defaultConfig } from 'tailwind-variants'
import colors from 'tailwindcss/colors'

type IconsConfig = Record<"arrowDown" | "arrowLeft" | "arrowRight" | "arrowUp" | "caution" | "check" | "chevronDoubleLeft" | "chevronDoubleRight" | "chevronDown" | "chevronLeft" | "chevronRight" | "chevronUp" | "close" | "copy" | "copyCheck" | "dark" | "drag" | "ellipsis" | "error" | "external" | "eye" | "eyeOff" | "file" | "folder" | "folderOpen" | "hash" | "info" | "light" | "loading" | "menu" | "minus" | "panelClose" | "panelOpen" | "plus" | "reload" | "search" | "stop" | "success" | "system" | "tip" | "upload" | "warning" | (string & {}), string>

type NeutralColor = 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone' | 'taupe' | 'mauve' | 'mist' | 'olive'
type Color = Exclude<keyof typeof colors, 'inherit' | 'current' | 'transparent' | 'black' | 'white' | NeutralColor> | (string & {})

type AppConfigUI = {
  colors?: {
    'primary'?: Color
		'secondary'?: Color
		'success'?: Color
		'info'?: Color
		'warning'?: Color
		'error'?: Color
    neutral?: NeutralColor | (string & {})
  }
  icons?: Partial<IconsConfig>
  prefix?: string
  tv?: typeof defaultConfig
} & TVConfig<typeof ui>

declare module '@nuxt/schema' {
  interface AppConfigInput {
    /**
     * Nuxt UI theme configuration
     * @see https://ui.nuxt.com/docs/getting-started/theme/components
     */
    ui?: AppConfigUI
  }
}

export {}
