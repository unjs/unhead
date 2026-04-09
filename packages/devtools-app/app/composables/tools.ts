const NON_WORD_RE = /[^\w\s]/g
const WHITESPACE_RE = /\s+/

export const SEO_LIMITS = {
  TITLE_MAX_CHARS: 60,
  TITLE_WARN_CHARS: 50,
  TITLE_MAX_PIXELS: 580,
  DESC_MAX_CHARS: 160,
  DESC_WARN_CHARS: 150,
  DESC_MAX_PIXELS: 920,
} as const

export const ENGINE_LIMITS = {
  google: { label: 'Google', titleMax: 60, descMax: 160, icon: 'i-carbon-search' },
  bing: { label: 'Bing', titleMax: 65, descMax: 150, icon: 'i-carbon-search-locate' },
  duckduckgo: { label: 'DuckDuckGo', titleMax: 65, descMax: 150, icon: 'i-carbon-search-locate-mirror' },
  ai: { label: 'AI Search', titleMax: 70, descMax: 200, icon: 'i-carbon-machine-learning-model' },
} as const

export type SearchEngine = keyof typeof ENGINE_LIMITS

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'can',
  'shall',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'i',
  'we',
  'you',
  'he',
  'she',
  'they',
  'me',
  'us',
  'him',
  'her',
  'them',
  'my',
  'our',
  'your',
  'his',
  'their',
  'from',
  'not',
  'no',
  'so',
  'if',
  'as',
  'up',
  'out',
  'about',
  'into',
  'over',
  'after',
  'how',
  'all',
  'new',
  'more',
  'when',
  'who',
  'what',
  'where',
])

export function extractKeywords(text: string): { word: string, count: number }[] {
  const words = text.toLowerCase().replace(NON_WORD_RE, '').split(WHITESPACE_RE).filter(Boolean)
  const freq = new Map<string, number>()
  for (const w of words) {
    if (w.length < 2 || STOPWORDS.has(w))
      continue
    freq.set(w, (freq.get(w) || 0) + 1)
  }
  return [...freq.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
}

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
