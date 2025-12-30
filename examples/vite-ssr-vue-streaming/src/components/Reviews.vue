<script setup lang="ts">
import { useHead } from '@unhead/vue'

type Review = { author: string; rating: number; text: string; date: string }

const delay = typeof window === 'undefined' ? 2250 : 0
const data = await new Promise<{ reviews: Review[]; avgRating: number }>(resolve =>
  setTimeout(() => resolve({
    avgRating: 4.6,
    reviews: [
      { author: 'Alice M.', rating: 5, text: 'Excellent quality! Fast shipping and great customer service.', date: '2 days ago' },
      { author: 'Bob K.', rating: 4, text: 'Good product, works as expected. Would recommend.', date: '1 week ago' },
      { author: 'Carol S.', rating: 5, text: "Best purchase I've made this year. Absolutely love it!", date: '2 weeks ago' },
    ]
  }), delay)
)

const avgStars = '*'.repeat(Math.floor(data.avgRating))

useHead({
  title: 'StreamShop 10/11 - Almost there...',
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'AggregateRating',
        ratingValue: data.avgRating,
        reviewCount: data.reviews.length,
      }),
    },
  ],
  style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:91%}' }],
})
</script>

<template>
  <component :is="'script'" v-html="`window.__streamLog?.('Reviews', '#fbbf24')`" />
  <div class="reviews-section">
    <h3>Customer Reviews</h3>
    <div class="avg-rating">Average: {{ avgStars }} {{ data.avgRating }}/5</div>
    <div class="reviews-list">
      <div v-for="(review, i) in data.reviews" :key="i" class="review">
        <div class="review-header">
          <strong>{{ review.author }}</strong>
          <span class="review-rating">{{ '*'.repeat(review.rating) }}</span>
          <span class="review-date">{{ review.date }}</span>
        </div>
        <p>{{ review.text }}</p>
      </div>
    </div>
  </div>
</template>
