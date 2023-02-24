import { TreeshakeServerComposables } from './TreeshakeServerComposables'
import { UseSeoMetaTransform } from './UseSeoMetaTransform'

export default () => {
  return [
    TreeshakeServerComposables.webpack(),
    UseSeoMetaTransform.webpack(),
  ]
}
