import { use } from 'react'
import { useHead } from '@unhead/react'

type Review = { author: string; rating: number; text: string; date: string }

const cache = new Map<string, Promise<{ reviews: Review[]; avgRating: number }>>()

export default function Reviews() {
  const cacheKey = 'reviews'
  if (!cache.has(cacheKey)) {
    const delay = typeof window === 'undefined' ? 2250 : 0
    cache.set(cacheKey, new Promise(resolve =>
      setTimeout(() => resolve({
        avgRating: 4.6,
        reviews: [
          { author: 'Alice M.', rating: 5, text: 'Excellent quality! Fast shipping and great customer service.', date: '2 days ago' },
          { author: 'Bob K.', rating: 4, text: 'Good product, works as expected. Would recommend.', date: '1 week ago' },
          { author: 'Carol S.', rating: 5, text: 'Best purchase I\'ve made this year. Absolutely love it!', date: '2 weeks ago' },
        ]
      }), delay)
    ))
    cache.get(cacheKey)!.finally(() => setTimeout(() => cache.delete(cacheKey), 100))
  }
  const data = use(cache.get(cacheKey)!)

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

  return (
    <>
    <script dangerouslySetInnerHTML={{ __html: `window.__streamLog?.('⭐ Reviews', '#fbbf24')` }} />
    <div className="reviews-section">
      <h3>Customer Reviews</h3>
      <div className="avg-rating">Average: {'★'.repeat(Math.floor(data.avgRating))} {data.avgRating}/5</div>
      <div className="reviews-list">
        {data.reviews.map((review, i) => (
          <div key={i} className="review">
            <div className="review-header">
              <strong>{review.author}</strong>
              <span className="review-rating">{'★'.repeat(review.rating)}</span>
              <span className="review-date">{review.date}</span>
            </div>
            <p>{review.text}</p>
          </div>
        ))}
      </div>
    </div>
    </>
  )
}
