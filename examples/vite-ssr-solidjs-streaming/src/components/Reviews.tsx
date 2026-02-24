import { createResource, For, Show } from 'solid-js'
import { useHead } from '@unhead/solid-js'

const DATA = {
  avgRating: 4.6,
  reviews: [
    { author: 'Alice M.', rating: 5, text: 'Excellent quality! Fast shipping and great customer service.', date: '2 days ago' },
    { author: 'Bob K.', rating: 4, text: 'Good product, works as expected. Would recommend.', date: '1 week ago' },
    { author: 'Carol S.', rating: 5, text: "Best purchase I've made this year. Absolutely love it!", date: '2 weeks ago' },
  ],
}

const fetchData = async () => {
  await new Promise(r => setTimeout(r, 1500))
  return DATA
}

export default function Reviews() {
  const [data] = createResource(fetchData)

  const avgStars = () => '★'.repeat(Math.floor(data()?.avgRating || 0))

  // Only add progress style during loading, add JSON-LD when data is ready
  useHead({
    title: 'StreamShop 10/11 - Almost there...',
    script: data() ? [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'AggregateRating',
          ratingValue: data()!.avgRating,
          reviewCount: data()!.reviews.length,
        }),
      },
    ] : [],
    style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:91%}' }],
  })

  return (
    <Show when={data()}>
      <div class="reviews-section">
        <h3>Customer Reviews</h3>
        <div class="avg-rating">Average: {avgStars()} {data()?.avgRating}/5</div>
        <div class="reviews-list">
          <For each={data()?.reviews}>
            {review => (
              <div class="review">
                <div class="review-header">
                  <strong>{review.author}</strong>
                  <span class="review-rating">{'★'.repeat(review.rating)}</span>
                  <span class="review-date">{review.date}</span>
                </div>
                <p>{review.text}</p>
              </div>
            )}
          </For>
        </div>
      </div>
    </Show>
  )
}
