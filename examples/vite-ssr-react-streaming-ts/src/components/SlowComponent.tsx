import { useState, useEffect } from 'react'
import { Head } from '@unhead/react'

// Artificial delay function to simulate slow loading data
const createResource = () => {
  return new Promise<string>((resolve) => {
    // Simulate a network request that takes 1.5 seconds
    setTimeout(() => {
      resolve('Data loaded from first slow component!')
    }, 1500)
  })
}

async function SlowComponent() {
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
    <div className="slow-component first">
      <h3>First Slow Component</h3>
      <p>This component took 1.5 seconds to load.</p>
      <p>Data: {data}</p>
      <p>Notice how this component appeared before the others.</p>
      <Head>
        <title>First Slow Component</title>
        <meta name="description" content="This is the first slow component." />
        <link rel="stylesheet" href="/styles/slow-component.css" />
      </Head>
    </div>
  )
}

export default SlowComponent
