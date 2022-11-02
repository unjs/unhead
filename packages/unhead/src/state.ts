import type { HeadClient } from './types'

export let activeHead: HeadClient<any> | undefined

export const setActiveHead = <T> (head: HeadClient<T> | undefined) => (activeHead = head)

export const getActiveHead = <T> () => activeHead as HeadClient<T>
