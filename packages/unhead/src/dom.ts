import {CreateHeadOptions, Head} from "@unhead/schema";
import {PatchDomOnEntryUpdatesPlugin} from "unhead/src/plugin";
import {IsBrowser} from "unhead/src/env";
import {setActiveHead} from "unhead/src/runtime";
import {createHeadCore} from "unhead/src/createHead";

export const DOMPlugins = (options: CreateHeadOptions = {}) => [
  PatchDomOnEntryUpdatesPlugin({ document: options?.document, delayFn: options?.domDelayFn }),
]

export function createHead<T extends {} = Head>(options: CreateHeadOptions = {}) {
  const head = createHeadCore<T>({
    document: IsBrowser ? document : undefined,
    ...options,
    plugins: [...DOMPlugins(options), ...(options?.plugins || [])],
  })
  if (head.resolvedOptions.document) {
    // set initial state from DOM payload
    const json = head.resolvedOptions.document.querySelector('meta[name="unhead:state"]')?.getAttribute('content')
    if (json)
      head.state = JSON.parse(json)
  }
  setActiveHead(head)
  return head
}
