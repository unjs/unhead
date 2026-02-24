import { createResource, Show } from 'solid-js'
import { useHead } from '@unhead/solid-js'

const DATA = { subscribers: 50000, discount: 10 }

const fetchData = async () => {
  await new Promise(r => setTimeout(r, 1750))
  return DATA
}

export default function Newsletter() {
  const [data] = createResource(fetchData)

  useHead({
    title: 'StreamShop - Ready!',
    meta: [{ name: 'newsletter-status', content: 'loaded' }],
    style: [{ key: 'progress', innerHTML: '.stream-progress{opacity:0;transition:opacity 0.3s}' }],
  })

  return (
    <Show when={data()}>
      <div class="newsletter">
        <h3>Join Our Newsletter</h3>
        <p>Get {data()?.discount}% off your first order! Join {data()?.subscribers?.toLocaleString()}+ subscribers.</p>
        <div class="newsletter-form">
          <input type="email" placeholder="Enter your email" />
          <button>Subscribe</button>
        </div>
      </div>
    </Show>
  )
}
