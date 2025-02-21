import { createSignal } from 'solid-js'
import { useHead } from '../../src'

export function ReactiveTitle({ initialTitle = 'Test' }) {
  const [title, setTitle] = createSignal(initialTitle)
  useHead({ title })
  return (
    <div>
      <span>{title()}</span>
      <button onClick={() => setTitle('Updated')}>Update</button>
    </div>
  )
}
