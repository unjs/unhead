import { useHead } from '@unhead/solid-js'

export default function HeroBanner() {
  const promo = { title: 'Summer Sale!', subtitle: 'Up to 50% off selected items', code: 'SUMMER50' }

  useHead({
    title: 'StreamShop 3/11 - Loading...',
    meta: [{ name: 'promo-code', content: promo.code }],
    style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:27%}' }],
  })

  return (
    <div class="hero-banner">
      <h1>{promo.title}</h1>
      <p>{promo.subtitle}</p>
      <button class="cta-button">Use code: {promo.code}</button>
    </div>
  )
}
