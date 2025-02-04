import type { ActiveHeadEntry } from '@unhead/schema'
import type { ReactNode } from 'react'
import type { UseHeadInput } from 'unhead'
import { HasElementTags, TagsWithInnerContent, ValidHeadTags } from '@unhead/shared'
import React, { useEffect, useRef } from 'react'
import { useUnhead } from './composables'

interface HeadProps {
  children: ReactNode
}

const Head: React.FC<HeadProps> = ({ children }) => {
  const headRef = useRef<ActiveHeadEntry<any> | null>(null)
  const head = useUnhead()

  useEffect(() => {
    return () => {
      if (headRef.current?.dispose()) {
        headRef.current.dispose()
      }
      headRef.current = null
    }
  }, [])

  useEffect(() => {
    const input: UseHeadInput<any> = {}
    const elements = React.Children.toArray(children).filter(React.isValidElement)

    elements.forEach((element: React.ReactElement) => {
      const { type, props } = element

      if (!ValidHeadTags.has(type as string)) {
        return
      }
      const data = { ...props }
      if (TagsWithInnerContent.has(type as string) && props.children) {
        data[type === 'script' ? 'innerHTML' : 'textContent'] = Array.isArray(props.children) ? props.children.map(String).join('') : props.children
      }
      delete data.children
      if (HasElementTags.has(type as string)) {
        input[type as 'meta'] = input[type as 'meta'] || []
        input[type as 'meta']!.push(data)
      }
      else {
        input[type] = data
      }
    })

    if (!headRef.current) {
      headRef.current = head.push(input)
    }
    else {
      headRef.current.patch(input)
    }
  }, [children])

  return null
}

export { Head }
