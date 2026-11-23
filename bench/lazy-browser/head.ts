export function pageHead(title: string) {
  return {
    title,
    meta: Array.from({ length: 40 }, (_, i) => ({
      name: `page-meta-${i}`,
      content: `${title} ${i}`,
    })),
  }
}
