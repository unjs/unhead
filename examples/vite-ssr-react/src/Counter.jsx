import { useHead, injectHead } from '@unhead/react'
import { useEffect } from "react";

export function Counter({ count }) {
  useHead({
    title: `${count}`
  })
  return <div>{ count }</div>;
}
