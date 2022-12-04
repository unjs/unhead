import type { Unhead } from '@unhead/schema'

// eslint-disable-next-line import/no-mutable-exports
export let activeHead: Unhead<any> | undefined

export const setActiveHead = (head: Unhead<any> | undefined) => (activeHead = head)

export const getActiveHead = () => activeHead
