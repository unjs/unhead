/*!
 * @license Named character reference data from https://html.spec.whatwg.org/entities.json
 * Copyright © WHATWG (Apple, Google, Mozilla, Microsoft).
 * BSD 3-Clause License
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
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

export function decodeAttribute(value: string): string {
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
    if (!Object.hasOwn(namedReferences, name)
      || (!reference.endsWith(';') && AMBIGUOUS_ATTRIBUTE_END.test(value[offset + reference.length] ?? ''))) {
      return reference
    }
    return namedReferences[name]
  })
}
