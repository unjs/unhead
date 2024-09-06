export type Never<T> = {
  [P in keyof T]?: never
}

export type FalsyEntries<T> = {
  [key in keyof T]?: T[key] | null | false | undefined // false is soft deprecated
}
