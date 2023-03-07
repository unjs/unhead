export const resolveTitleTemplate = (
  template: string | ((title?: string) => string | null) | null,
  title?: string,
): string | null => {
  if (template == null)
    return title || null
  if (typeof template === 'function')
    return template(title)

  return template
}
