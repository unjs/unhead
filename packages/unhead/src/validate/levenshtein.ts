export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const d: number[] = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = i - 1
    d[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = d[j]
      d[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, d[j], d[j - 1])
      prev = tmp
    }
  }
  return d[n]
}

export function findClosestMatch(value: string, knownSet: Set<string>): string | undefined {
  const threshold = value.length <= 8 ? 2 : 3
  let best: string | undefined
  let bestDist = threshold + 1
  for (const known of knownSet) {
    if (Math.abs(known.length - value.length) > threshold)
      continue
    const dist = levenshtein(value, known)
    if (dist < bestDist) {
      bestDist = dist
      best = known
    }
  }
  return best
}
