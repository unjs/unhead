import type { Stringable } from '../../util'

export interface DataKeys {
  [key: `data-${string}`]: Stringable
}
