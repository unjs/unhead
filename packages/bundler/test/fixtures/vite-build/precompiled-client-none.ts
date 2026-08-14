import { useHead, useSeoMeta } from 'unhead/precompiled/client'

declare const head: never

useHead({ title: 'ERASED_CLIENT_NONE_TITLE' }, { head })
useSeoMeta({ description: 'ERASED_CLIENT_NONE_DESCRIPTION' }, { head })

export const CLIENT_NONE_MARKER = 'CLIENT_NONE_MARKER'
