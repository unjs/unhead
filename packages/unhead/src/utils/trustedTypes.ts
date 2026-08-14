interface TrustedTypePolicyFactoryLike {
  emptyHTML?: unknown
  isHTML?: (value: unknown) => boolean
}

function getTrustedTypes(): TrustedTypePolicyFactoryLike | undefined {
  return (globalThis as typeof globalThis & { trustedTypes?: TrustedTypePolicyFactoryLike }).trustedTypes
}

export function isTrustedHTML(value: unknown): boolean {
  return typeof value === 'object' && value !== null && getTrustedTypes()?.isHTML?.(value) === true
}

export function getEmptyTrustedHTML(): unknown {
  return getTrustedTypes()?.emptyHTML ?? ''
}
