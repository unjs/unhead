import type { Unhead } from '@unhead/schema'

export let activeHead: Unhead<any> | undefined

export const setActiveHead = (head: Unhead<any> | undefined) => (activeHead = head)

export const getActiveHead = () => activeHead
