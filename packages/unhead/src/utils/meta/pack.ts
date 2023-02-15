import type { Head, MetaFlatInput } from '@unhead/schema'
import { packArray } from 'packrup'
import { MetaPackingSchema } from './utils'

/**
 * Convert an array of meta entries to a flat object.
 * @param inputs
 */
export function packMeta<T extends Required<Head>['meta']>(inputs: T): MetaFlatInput {
  const mappedPackingSchema = Object.entries(MetaPackingSchema)
    .map(([key, value]) => [key, value.keyValue])

  return packArray(inputs, {
    key: ['name', 'property', 'httpEquiv', 'http-equiv', 'charset'],
    value: ['content', 'charset'],
    resolveKey(k) {
      let key = (mappedPackingSchema.filter(sk => sk[1] === k)?.[0]?.[0] || k) as string
      // turn : into a capital letter
      // @ts-expect-error untyped
      const replacer = (_, letter) => letter?.toUpperCase()
      key = key
        .replace(/:([a-z])/g, replacer)
        .replace(/-([a-z])/g, replacer)
      return key as string
    },
  })
}
