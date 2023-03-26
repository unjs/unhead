import {CreateHeadOptions, Head} from "@unhead/schema";
import {SSRPayloadPlugin} from "unhead/src/plugin";
import {setActiveHead} from "unhead/src/runtime";
import {createHeadCore} from "unhead/src/createHead";

export function createServerHead<T extends {} = Head>(options: CreateHeadOptions = {}) {
  const head = createHeadCore<T>({
    ...options,
    plugins: [SSRPayloadPlugin(), ...(options?.plugins || [])],
  })
  setActiveHead(head)
  return head
}
