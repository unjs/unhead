import { describe, expect, it } from 'vitest'
import { defineProduct, useSchemaOrg } from '../..'
import { injectSchemaOrg, useSetup } from '../../../test'

async function resolveReviewRating(ratingValue: number | string) {
  let reviewRating: unknown
  await useSetup(async (head) => {
    useSchemaOrg(head, [
      defineProduct({
        name: 'Desk chair',
        image: '/chair.png',
        review: {
          author: { name: 'Ada' },
          reviewRating: { ratingValue },
        },
      }),
    ])

    const graph = await injectSchemaOrg(head)
    const review = graph.find(node => node['@type'] === 'Product')!.review as Record<string, unknown>
    reviewRating = review.reviewRating
  })
  return reviewRating
}

describe('rating', () => {
  it.each([
    [4],
    ['4.5'],
  ])('assumes a 1 to 5 scale for the numeric rating %s', async (ratingValue) => {
    expect(await resolveReviewRating(ratingValue)).toEqual({
      '@type': 'Rating',
      ratingValue,
      'bestRating': 5,
      'worstRating': 1,
    })
  })

  it.each([
    ['60%'],
    ['6 / 10'],
  ])('adds no scale to the rating %s, which implies its own', async (ratingValue) => {
    expect(await resolveReviewRating(ratingValue)).toEqual({
      '@type': 'Rating',
      ratingValue,
    })
  })
})
