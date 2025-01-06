import { useState } from 'react'
import { useHead } from '@unhead/react'

export function ReactiveTitle({ initialTitle = 'Test' }) {
  const [title, setTitle] = useState(initialTitle)
  useHead({ title })
  return (
    <div>
      <span>{title}</span>
      <button onClick={() => setTitle('Updated')}>Update</button>
    </div>
  )
}
