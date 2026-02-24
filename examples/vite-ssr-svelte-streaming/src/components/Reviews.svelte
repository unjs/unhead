<script lang="ts">
import { useHead } from '@unhead/svelte'

const avgRating = 4.6
const REVIEWS = [
  { author: 'Alice M.', rating: 5, text: 'Excellent quality! Fast shipping and great customer service.', date: '2 days ago' },
  { author: 'Bob K.', rating: 4, text: 'Good product, works as expected. Would recommend.', date: '1 week ago' },
  { author: 'Carol S.', rating: 5, text: "Best purchase I've made this year. Absolutely love it!", date: '2 weeks ago' },
]

const fetchReviews = async () => {
  await new Promise(r => setTimeout(r, 2250))
  return REVIEWS
}

const reviews = await fetchReviews()

useHead({
  title: 'StreamShop 10/11 - Almost there...',
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'AggregateRating',
        ratingValue: avgRating,
        reviewCount: reviews.length,
      }),
    },
  ],
  style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:91%}' }],
})
</script>

<svelte:boundary>
  <div class="reviews-section">
    <h3>Customer Reviews</h3>
    <div class="avg-rating">Average: {'★'.repeat(Math.floor(avgRating))}{'☆'.repeat(5 - Math.floor(avgRating))} {avgRating}/5</div>
    <div class="reviews-list">
      {#each reviews as review}
        <div class="review">
          <div class="review-header">
            <strong>{review.author}</strong>
            <span class="review-rating">{'★'.repeat(review.rating)}</span>
            <span class="review-date">{review.date}</span>
          </div>
          <p>{review.text}</p>
        </div>
      {/each}
    </div>
  </div>
  {#snippet pending()}
    <div class="reviews-section skeleton reviews-skeleton">Loading reviews...</div>
  {/snippet}
</svelte:boundary>
