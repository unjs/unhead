import type { InteractionCounter, PropertyValue } from '../types'
import { withBase } from '../utils'
import { defineSchemaOrgResolver } from './define'

export const interactionCounterResolver = defineSchemaOrgResolver<InteractionCounter>({
  defaults: {
    '@type': 'InteractionCounter',
  },
  resolve(node) {
    if (typeof node.interactionType === 'string')
      node.interactionType = withBase(node.interactionType, 'https://schema.org/') as InteractionCounter['interactionType']
    return node
  },
})

export const propertyValueResolver = defineSchemaOrgResolver<PropertyValue>({
  defaults: {
    '@type': 'PropertyValue',
  },
})
