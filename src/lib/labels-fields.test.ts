import { describe, expect, it } from 'vitest'

import { SECTION_GROUPS } from './labels-fields'

describe('SECTION_GROUPS', () => {
  it('mantém o ponto focal no mesmo grupo da foto da abertura', () => {
    // A group is handed a copy of the payload holding only its own keys. The
    // dragger lives under the photograph and reads the framing off that copy —
    // so a framing key outside the photograph's group can be written (the
    // preview moves) and never read back (the window sits still in the middle).
    const withPhoto = SECTION_GROUPS.hero?.find((g) => g.keys.includes('hero_image_url'))
    expect(withPhoto).toBeDefined()
    expect(withPhoto?.keys).toContain('focus_x')
    expect(withPhoto?.keys).toContain('focus_y')
  })

  it('não reivindica a mesma chave em dois grupos', () => {
    // Everything a group does not claim falls through to a catch-all editor at
    // the bottom; claiming one twice would draw it in both places.
    for (const [section, groups] of Object.entries(SECTION_GROUPS)) {
      const all = groups.flatMap((g) => g.keys)
      expect(new Set(all).size, `${section} repete uma chave`).toBe(all.length)
    }
  })
})
