import { createStreamableHead } from '@unhead/vue/stream/server'
import { computed, ref } from 'vue'

describe('vue streaming server types', () => {
  it('accepts Vue reactive input and rejects unknown head fields', () => {
    const { head } = createStreamableHead()
    const title = ref('Reactive title')

    head.push({ title })
    head.push(computed(() => ({ title: title.value })))

    // @ts-expect-error Unknown head fields are invalid
    head.push({ invalid: true })
  })
})
