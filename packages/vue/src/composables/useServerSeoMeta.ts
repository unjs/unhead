import type { ActiveHeadEntry } from '@unhead/schema'
import { useSeoMeta } from './useSeoMeta'
import type { UseHeadOptions, UseSeoMetaInput } from '../types'

export function useServerSeoMeta(input: UseSeoMetaInput, options?: UseHeadOptions): ActiveHeadEntry<any> | void {
  return useSeoMeta(input, { ...options, mode: 'server' })
}
