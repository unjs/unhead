import type { Unhead } from '@unhead/schema'

export let activeHead: Unhead<any> | undefined

export const setActiveHead = <T extends Unhead> (head: T | undefined) => (activeHead = head)

export const getActiveHead = <T extends Unhead> () => activeHead as T
