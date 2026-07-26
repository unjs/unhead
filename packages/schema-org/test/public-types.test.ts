import type {
  DefinedRegion,
  MerchantReturnPolicy,
  MerchantReturnPolicySimple,
  MonetaryAmount,
  MonetaryAmountSimple,
  OfferShippingDetails,
  Place,
  PlaceSimple,
  QuantitativeSimple,
  QuantitativeValue,
  ResolverOptions,
  ShippingDeliveryTime,
  VirtualLocation,
  VirtualLocationSimple,
} from '../src'
import { expectTypeOf, it } from 'vitest'

it('exports schema resolver options from the package entry', () => {
  expectTypeOf<ResolverOptions>().toHaveProperty('array')
  expectTypeOf<ResolverOptions>().toHaveProperty('root')
  expectTypeOf<ResolverOptions>().toHaveProperty('generateId')
  expectTypeOf<ResolverOptions>().toHaveProperty('afterResolve')
})

it('exports schema node types used by public helpers', () => {
  expectTypeOf<DefinedRegion>().toHaveProperty('addressCountry')
  expectTypeOf<MerchantReturnPolicy>().toEqualTypeOf<MerchantReturnPolicySimple>()
  expectTypeOf<MonetaryAmount>().toEqualTypeOf<MonetaryAmountSimple>()
  expectTypeOf<QuantitativeValue>().toEqualTypeOf<QuantitativeSimple>()
  expectTypeOf<OfferShippingDetails>().toHaveProperty('shippingDestination')
  expectTypeOf<Place>().toEqualTypeOf<PlaceSimple>()
  expectTypeOf<ShippingDeliveryTime>().toHaveProperty('transitTime')
  expectTypeOf<VirtualLocation>().toEqualTypeOf<VirtualLocationSimple>()
})
