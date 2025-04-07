import { useState, useEffect } from 'react'

// Artificial delay function to simulate slow loading data
const createResource = () => {
  return new Promise<string>((resolve) => {
    // Simulate a network request that takes 5 seconds
    setTimeout(() => {
      resolve('Data loaded from third slow component!')
    }, 5000)
  })
}

function SlowComponentThree() {
  const [data, setData] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    
    // Load data with artificial delay
    createResource().then((result) => {
      if (isMounted) {
        setData(result)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return <div>Loading data...</div>
  }

  return (
    <div className="slow-component third">
      <h3>Third Slow Component</h3>
      <p>This component took 5 seconds to load.</p>
      <p>Data: {data}</p>
      <p>This is the slowest component, demonstrating progressive streaming.</p>
      <p>With streaming SSR, the user can see and interact with the page before all components have loaded.</p>
    </div>
  )
}

export default SlowComponentThree