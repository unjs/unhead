import type { PropResolver } from 'unhead/types'

export const VueResolver: PropResolver = (_?: string, value?: any) => value && value.__v_isRef === true ? value.value : value
