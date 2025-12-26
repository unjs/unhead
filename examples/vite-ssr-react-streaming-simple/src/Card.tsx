import { useState } from 'react'
import { useHead } from '@unhead/react'

function Card() {
  const [count, setCount] = useState(0)
  useHead({
    title: () => `Head: ${count}`,
    meta: [
      { name: 'description', content: 'This meta tag was added via streaming' },
    ],
  })
  return (
    <div className="card">
      <button onClick={() => setCount((count) => count + 1)}>
        count is {count}
      </button>
      <p>
        Edit <code>src/App.tsx</code> and save to test HMR
      </p>
    </div>
  )
}

export default Card
