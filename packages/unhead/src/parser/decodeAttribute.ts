/*!
 * @license MIT named character reference data from html5lib
 * https://github.com/html5lib/html5lib-python/blob/01b7dea9a378d69ae66767183a42e602d7a468cd/html5lib/constants.py
 *
 * Copyright (c) 2006-2013 James Graham and other contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import namedReferences from './namedReferences.json'

const REFERENCE = /&(?:#(?:x[a-f\d]+|\d+);?|[a-z\d]+;?)/gi
const AMBIGUOUS_ATTRIBUTE_END = /[a-z\d=]/i
const LEGACY_CODE_POINTS = /* @__PURE__ */ [
  0x20AC,
  0x81,
  0x201A,
  0x192,
  0x201E,
  0x2026,
  0x2020,
  0x2021,
  0x2C6,
  0x2030,
  0x160,
  0x2039,
  0x152,
  0x8D,
  0x17D,
  0x8F,
  0x90,
  0x2018,
  0x2019,
  0x201C,
  0x201D,
  0x2022,
  0x2013,
  0x2014,
  0x2DC,
  0x2122,
  0x161,
  0x203A,
  0x153,
  0x9D,
  0x17E,
  0x178,
]

export function decodeAttribute(value: string, inAttribute = true): string {
  return value.replace(REFERENCE, (reference, offset: number) => {
    if (reference[1] === '#') {
      const hex = reference[2].toLowerCase() === 'x'
      let point = Number.parseInt(reference.slice(hex ? 3 : 2), hex ? 16 : 10)
      if (point === 0 || point > 0x10FFFF || (point >= 0xD800 && point <= 0xDFFF))
        return '\uFFFD'
      if (point >= 0x80 && point <= 0x9F)
        point = LEGACY_CODE_POINTS[point - 0x80]
      return String.fromCodePoint(point)
    }

    const name = reference.slice(1) as keyof typeof namedReferences
    if (!inAttribute) {
      for (let end = name.length; end > 0; end--) {
        const prefix = name.slice(0, end) as keyof typeof namedReferences
        if (Object.hasOwn(namedReferences, prefix))
          return namedReferences[prefix] + name.slice(end)
      }
      return reference
    }
    if (!Object.hasOwn(namedReferences, name)
      || (!reference.endsWith(';') && AMBIGUOUS_ATTRIBUTE_END.test(value[offset + reference.length] ?? ''))) {
      return reference
    }
    return namedReferences[name]
  })
}
