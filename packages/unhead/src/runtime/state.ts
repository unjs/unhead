import type { Unhead } from '@unhead/schema'

// eslint-disable-next-line import/no-mutable-exports
export let activeHead: Unhead<any> | undefined

export function setActiveHead(head: Unhead<any> | undefined) {
  return activeHead = head
}

export function getActiveHead() {
  return activeHead
}
