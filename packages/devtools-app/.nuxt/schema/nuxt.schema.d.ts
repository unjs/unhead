export interface NuxtCustomSchema {
 appConfig?: {
  /**
   * Nuxt Icon
   * 
   * Configure Nuxt Icon module preferences.
   * 
   * 
   * @studioIcon material-symbols:star
  */
  icon?: {
   /**
    * Icon Size
    * 
    * Set the default icon size.
    * 
    * 
    * @studioIcon material-symbols:format-size-rounded
   */
   size?: string | undefined,

   /**
    * CSS Class
    * 
    * Set the default CSS class.
    * 
    * @default ""
    * 
    * @studioIcon material-symbols:css
   */
   class?: string,

   /**
    * Default Attributes
    * 
    * Attributes applied to every icon component.
    * 
    * @default { "aria-hidden": true }
    * 
    * 
    * @studioIcon material-symbols:settings
   */
   attrs?: Record<string, string | number | boolean>,

   /**
    * Default Rendering Mode
    * 
    * Set the default rendering mode for the icon component
    * 
    * @default "css"
    * 
    * @enum css,svg
    * 
    * @studioIcon material-symbols:move-down-rounded
   */
   mode?: string,

   /**
    * Icon aliases
    * 
    * Define Icon aliases to update them easily without code changes.
    * 
    * 
    * @studioIcon material-symbols:star-rounded
   */
   aliases?: { [alias: string]: string },

   /**
    * CSS Selector Prefix
    * 
    * Set the default CSS selector prefix.
    * 
    * @default "i-"
    * 
    * @studioIcon material-symbols:format-textdirection-l-to-r
   */
   cssSelectorPrefix?: string,

   /**
    * CSS Layer Name
    * 
    * Set the default CSS `@layer` name.
    * 
    * 
    * @studioIcon material-symbols:layers
   */
   cssLayer?: string | undefined,

   /**
    * Use CSS `:where()` Pseudo Selector
    * 
    * Use CSS `:where()` pseudo selector to reduce specificity.
    * 
    * @default true
    * 
    * @studioIcon material-symbols:low-priority
   */
   cssWherePseudo?: boolean,

   /**
    * Icon Collections
    * 
    * List of known icon collections name. Used to resolve collection name ambiguity.
    * e.g. `simple-icons-github` -> `simple-icons:github` instead of `simple:icons-github`
    * 
    * When not provided, will use the full Iconify collection list.
    * 
    * 
    * @studioIcon material-symbols:format-list-bulleted
   */
   collections?: string[] | null,

   /**
    * Custom Icon Collections
    * 
    * 
    * @studioIcon material-symbols:format-list-bulleted
   */
   customCollections?: string[] | null,

   /**
    * Icon Provider
    * 
    * Provider to use for fetching icons
    * 
    * - `server` - Fetch icons with a server handler
    * - `iconify` - Fetch icons with Iconify API, purely client-side
    * - `none` - Do not fetch icons (use client bundle only)
    * 
    * `server` by default; `iconify` when `ssr: false`
    * 
    * 
    * @enum server,iconify,none
    * 
    * @studioIcon material-symbols:cloud
   */
   provider?: "server" | "iconify" | "none" | undefined,

   /**
    * Iconify API Endpoint URL
    * 
    * Define a custom Iconify API endpoint URL. Useful if you want to use a self-hosted Iconify API. Learn more: https://iconify.design/docs/api.
    * 
    * @default "https://api.iconify.design"
    * 
    * @studioIcon material-symbols:api
   */
   iconifyApiEndpoint?: string,

   /**
    * Fallback to Iconify API
    * 
    * Fallback to Iconify API if server provider fails to found the collection.
    * 
    * @default true
    * 
    * @enum true,false,server-only,client-only
    * 
    * @studioIcon material-symbols:public
   */
   fallbackToApi?: boolean | "server-only" | "client-only",

   /**
    * Local API Endpoint Path
    * 
    * Define a custom path for the local API endpoint.
    * 
    * @default "/api/_nuxt_icon"
    * 
    * @studioIcon material-symbols:api
   */
   localApiEndpoint?: string,

   /**
    * Fetch Timeout
    * 
    * Set the timeout for fetching icons.
    * 
    * @default 1500
    * 
    * @studioIcon material-symbols:timer
   */
   fetchTimeout?: number,

   /**
    * Customize callback
    * 
    * Customize icon content (replace stroke-width, colors, etc...).
    * 
    * 
    * @studioIcon material-symbols:edit
   */
   customize?: IconifyIconCustomizeCallback,
  },
 },
}
export type CustomAppConfig = Exclude<NuxtCustomSchema['appConfig'], undefined>
type _CustomAppConfig = CustomAppConfig

declare module '@nuxt/schema' {
  interface NuxtConfig extends Omit<NuxtCustomSchema, 'appConfig'> {}
  interface NuxtOptions extends Omit<NuxtCustomSchema, 'appConfig'> {}
  interface CustomAppConfig extends _CustomAppConfig {}
}

declare module 'nuxt/schema' {
  interface NuxtConfig extends Omit<NuxtCustomSchema, 'appConfig'> {}
  interface NuxtOptions extends Omit<NuxtCustomSchema, 'appConfig'> {}
  interface CustomAppConfig extends _CustomAppConfig {}
}
