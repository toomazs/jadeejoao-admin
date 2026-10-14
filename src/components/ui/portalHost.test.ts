import { describe, expect, it } from 'vitest'

import { placeAnchored } from './portalHost'

/**
 * The field in the screenshot that started this: PRAZO, low in the editor pane,
 * a calendar that would not fit below it.
 */
const prazo = { top: 640, bottom: 680, left: 48, width: 224 }
const WINDOW = 760

describe('placeAnchored', () => {
  it('abre abaixo quando cabe', () => {
    const roomy = { top: 120, bottom: 160, left: 48, width: 224 }
    expect(placeAnchored(roomy, 253, WINDOW).top).toBe(164)
  })

  it('abre acima, encostado no campo, quando não cabe abaixo', () => {
    // The whole point: the panel's bottom edge must land just above the field,
    // whatever its height. 640 - 253 - 4 = 383, and 383 + 253 = 636, four
    // pixels above the field at 640.
    const { top } = placeAnchored(prazo, 253, WINDOW)
    expect(top).toBe(383)
    expect(top + 253).toBe(prazo.top - 4)
  })

  it('encosta no campo em qualquer altura de mês', () => {
    // A month grid is four, five or six rows depending on the month. The old
    // constant was right for none of them, and left exactly this gap.
    for (const height of [222, 253, 284]) {
      const { top } = placeAnchored(prazo, height, WINDOW)
      expect(top + height).toBe(prazo.top - 4)
    }
  })

  it('vai para baixo enquanto a altura é desconhecida', () => {
    expect(placeAnchored(prazo, 0, WINDOW).top).toBe(684)
  })

  it('não sai pelo topo da janela', () => {
    // Field low in a short window, so it does open upwards — and the panel is
    // taller than the whole space above it. It stops at the edge and overlaps
    // the field, rather than being drawn where nobody can reach it.
    const low = { top: 300, bottom: 340, left: 48, width: 224 }
    expect(placeAnchored(low, 400, 360).top).toBe(8)
  })

  it('fica embaixo quando abaixo é apertado mas acima é pior', () => {
    const high = { top: 30, bottom: 70, left: 48, width: 224 }
    expect(placeAnchored(high, 253, 300).top).toBe(74)
  })

  it('leva a horizontal do campo sem mexer', () => {
    const { left, width } = placeAnchored(prazo, 253, WINDOW)
    expect([left, width]).toEqual([48, 224])
  })
})
