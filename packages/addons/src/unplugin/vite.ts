import { TreeshakeServerComposables } from './TreeshakeServerComposables'
import { UseSeoMetaTransform } from './UseSeoMetaTransform'

export default () => {
  return [
    TreeshakeServerComposables.vite(),
    UseSeoMetaTransform.vite(),
  ]
}
