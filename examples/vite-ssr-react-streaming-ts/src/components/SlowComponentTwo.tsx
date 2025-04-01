import { useState, useEffect } from 'react'

// Artificial delay function to simulate slow loading data
const createResource = () => {
  return new Promise<string>((resolve) => {
    // Simulate a network request that takes 3 seconds
    setTimeout(() => {
      resolve('Data loaded from second slow component!')
    }, 3000)
  })
}

function SlowComponentTwo() {
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
    <div className="slow-component second">
      <h3>Second Slow Component</h3>
      <p>This component took 3 seconds to load.</p>
      <p>Data: {data}</p>
      <p>This demonstrates how React streaming renders components as they become available.</p>
    </div>
  )
}

export default SlowComponentTwo