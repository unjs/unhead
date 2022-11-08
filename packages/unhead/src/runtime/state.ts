import type { HeadClient } from '@unhead/schema'

export let activeHead: HeadClient<any> | undefined

export const setActiveHead = <T extends HeadClient> (head: T | undefined) => (activeHead = head)

export const getActiveHead = <T extends HeadClient> () => activeHead as T
