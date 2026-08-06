/**
 * Live-document DOM mutation counters for a JSDOM window: wraps prototype
 * methods (setAttribute, appendChild, remove, classList, title, text setters)
 * and counts only mutations that hit connected nodes, so scratch/detached
 * work does not inflate the numbers. No MutationObserver involved.
 */

export interface OpCounts {
  /** connected element insertions (fragments count their children) */
  insert: number
  /** connected element removals */
  remove: number
  /** elements created (any, connected or not: element churn signal) */
  create: number
  setAttr: number
  removeAttr: number
  class: number
  style: number
  /** textContent/innerHTML writes on connected nodes */
  content: number
  /** document.title writes */
  title: number
}

export interface Instrumented {
  counts: OpCounts
  reset: () => void
  snap: () => OpCounts
  total: () => number
}

function zero(): OpCounts {
  return { insert: 0, remove: 0, create: 0, setAttr: 0, removeAttr: 0, class: 0, style: 0, content: 0, title: 0 }
}

function findDesc(proto: any, key: string): { owner: any, desc: PropertyDescriptor } | null {
  let o = proto
  while (o) {
    const desc = Object.getOwnPropertyDescriptor(o, key)
    if (desc)
      return { owner: o, desc }
    o = Object.getPrototypeOf(o)
  }
  return null
}

export function instrument(win: any): Instrumented {
  const counts = zero()
  const E = win.Element.prototype
  const N = win.Node.prototype
  const D = win.Document.prototype

  const setAttribute = E.setAttribute
  E.setAttribute = function (k: string, v: string) {
    this.isConnected && counts.setAttr++
    return setAttribute.call(this, k, v)
  }
  const removeAttribute = E.removeAttribute
  E.removeAttribute = function (k: string) {
    this.isConnected && counts.removeAttr++
    return removeAttribute.call(this, k)
  }
  const appendChild = N.appendChild
  N.appendChild = function (n: any) {
    this.isConnected && (counts.insert += n.nodeType === 11 ? n.childNodes.length : 1)
    return appendChild.call(this, n)
  }
  const insertBefore = N.insertBefore
  N.insertBefore = function (n: any, ref: any) {
    this.isConnected && (counts.insert += n.nodeType === 11 ? n.childNodes.length : 1)
    return insertBefore.call(this, n, ref)
  }
  const removeChild = N.removeChild
  N.removeChild = function (n: any) {
    this.isConnected && counts.remove++
    return removeChild.call(this, n)
  }
  const remove = E.remove
  E.remove = function () {
    this.isConnected && counts.remove++
    return remove.call(this)
  }
  const createElement = D.createElement
  D.createElement = function (...args: any[]) {
    counts.create++
    return createElement.apply(this, args)
  }
  const TL = win.DOMTokenList?.prototype
  if (TL) {
    const add = TL.add
    TL.add = function (...args: any[]) {
      counts.class += args.length
      return add.apply(this, args)
    }
    const rm = TL.remove
    TL.remove = function (...args: any[]) {
      counts.class += args.length
      return rm.apply(this, args)
    }
  }
  const CS = win.CSSStyleDeclaration?.prototype
  if (CS?.setProperty) {
    const sp = CS.setProperty
    CS.setProperty = function (...args: any[]) {
      counts.style++
      return sp.apply(this, args)
    }
    const rp = CS.removeProperty
    CS.removeProperty = function (...args: any[]) {
      counts.style++
      return rp.apply(this, args)
    }
  }

  const title = findDesc(D, 'title')!
  Object.defineProperty(title.owner, 'title', {
    configurable: true,
    get: title.desc.get,
    set(v) {
      counts.title++
      title.desc.set!.call(this, v)
    },
  })
  const tc = findDesc(N, 'textContent')!
  Object.defineProperty(tc.owner, 'textContent', {
    configurable: true,
    get: tc.desc.get,
    set(v) {
      this.isConnected && counts.content++
      tc.desc.set!.call(this, v)
    },
  })
  const ih = findDesc(E, 'innerHTML')!
  Object.defineProperty(ih.owner, 'innerHTML', {
    configurable: true,
    get: ih.desc.get,
    set(v) {
      this.isConnected && counts.content++
      ih.desc.set!.call(this, v)
    },
  })

  return {
    counts,
    reset() {
      Object.assign(counts, zero())
    },
    snap() {
      return { ...counts }
    },
    total() {
      let t = 0
      for (const k in counts) t += counts[k as keyof OpCounts]
      return t
    },
  }
}
