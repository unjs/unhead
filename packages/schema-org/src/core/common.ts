import type { InteractionCounter, PropertyValue } from '../types'
import { defineSchemaOrgResolver } from './define'

export const interactionCounterResolver = defineSchemaOrgResolver<InteractionCounter>({
  defaults: {
    '@type': 'InteractionCounter',
  },
})

export const propertyValueResolver = defineSchemaOrgResolver<PropertyValue>({
  defaults: {
    '@type': 'PropertyValue',
  },
})
