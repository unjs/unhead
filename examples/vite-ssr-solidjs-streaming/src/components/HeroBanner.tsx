import { createMemo, Show } from 'solid-js'
import { useHead } from '@unhead/solid-js'

const DATA = { title: 'Summer Sale!', subtitle: 'Up to 50% off selected items', code: 'SUMMER50' }

const fetchData = async () => {
  await new Promise(r => setTimeout(r, 1000))
  return DATA
}

export default function HeroBanner() {
  const data = createMemo(fetchData)

  return (
    <Show when={data()} keyed>
      {data => <HeroBannerContent data={data} />}
    </Show>
  )
}

function HeroBannerContent(props: { data: typeof DATA }) {
  useHead({
    title: 'StreamShop 3/11 - Loading...',
    meta: [{ name: 'promo-code', content: props.data.code }],
    style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:27%}' }],
  })

  return (
    <div class="hero-banner">
      <h1>{props.data.title}</h1>
      <p>{props.data.subtitle}</p>
      <button class="cta-button">Use code: {props.data.code}</button>
    </div>
  )
}
