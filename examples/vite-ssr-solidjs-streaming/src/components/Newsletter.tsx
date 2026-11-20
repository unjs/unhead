import { createMemo, Show } from 'solid-js'
import { useHead } from '@unhead/solid-js'

const DATA = { subscribers: 50000, discount: 10 }

const fetchData = async () => {
  await new Promise(r => setTimeout(r, 2250))
  return DATA
}

export default function Newsletter() {
  const data = createMemo(fetchData)

  return (
    <Show when={data()} keyed>
      {data => <NewsletterContent data={data} />}
    </Show>
  )
}

function NewsletterContent(props: { data: typeof DATA }) {
  useHead({
    title: 'StreamShop - Ready!',
    meta: [{ name: 'newsletter-status', content: 'loaded' }],
    style: [{ key: 'progress', innerHTML: '.stream-progress{opacity:0;transition:opacity 0.3s}' }],
  })

  return (
    <div class="newsletter">
      <h3>Join Our Newsletter</h3>
      <p>Get {props.data.discount}% off your first order! Join {props.data.subscribers.toLocaleString()}+ subscribers.</p>
      <div class="newsletter-form">
        <input type="email" placeholder="Enter your email" />
        <button>Subscribe</button>
      </div>
    </div>
  )
}
