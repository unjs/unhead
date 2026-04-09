export function useCopy(timeout = 2000): { copy: (text: string) => Promise<void>, copied: Ref<boolean> } {
  const { copy, copied } = useClipboard({ legacy: true, copiedDuring: timeout })
  return { copy, copied }
}
