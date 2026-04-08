export const SEO_LIMITS = {
  TITLE_MAX_CHARS: 60,
  TITLE_WARN_CHARS: 50,
  TITLE_MAX_PIXELS: 580,
  DESC_MAX_CHARS: 160,
  DESC_WARN_CHARS: 150,
  DESC_MAX_PIXELS: 920,
} as const

export function estimatePixelWidth(text: string, fontSize: number = 16): number {
  return Math.round(text.length * fontSize * 0.55)
}

export function titleColor(length: number) {
  if (length > SEO_LIMITS.TITLE_MAX_CHARS)
    return 'error'
  if (length < 30)
    return 'warning'
  return 'success'
}

export function descColor(length: number) {
  if (length > SEO_LIMITS.DESC_MAX_CHARS)
    return 'error'
  if (length > SEO_LIMITS.DESC_WARN_CHARS || length < 70)
    return 'warning'
  return 'success'
}
