declare global {
  interface Window {
    __streamLog?: (name: string, color?: string) => void
    __headLog?: (desc: string) => void
  }
}

export {}
