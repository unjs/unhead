// Internal prototype-pollution guard. NOT re-exported by utils/index.ts, so it
// stays out of the public `unhead/utils` subpath (adding it to const.ts would
// have leaked it into the export snapshot).
//
// Only `__proto__` can pollute via `[[Set]]` (Object.prototype's __proto__
// setter); `constructor`/`prototype` are guarded too so a deep-merge can't walk
// into the prototype chain. Use this ONLY at assignment sites that copy
// untrusted keys into a plain object — reads, object spread, Map keys and
// Object.create(null) targets are already pollution-safe and need no guard.
//
// A 3-way `===` chain beats a regex or Set.has here (hot path, three literals).
/* @__NO_SIDE_EFFECTS__ */
export function isUnsafeKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype'
}
