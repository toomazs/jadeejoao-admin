import { fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { BAND_WIDTH, FocusPicker, bandLeftFor, focusForBandLeft } from './FocusPicker'
import { DeviceContext } from './PayloadEditor'

const show = (x: number, onChange: (x: number) => void = () => {}) =>
  render(<FocusPicker src="/foto.webp" x={x} onChange={onChange} />).container

/** The window a phone keeps — the framed one, not the two dark sides. */
const window_ = (root: HTMLElement) => root.querySelector('.border-2') as HTMLElement

/** jsdom measures everything as zero, and the drag divides by the width. */
function sized(root: HTMLElement) {
  const frame = root.querySelector('.cursor-ew-resize') as HTMLElement
  frame.getBoundingClientRect = () =>
    ({ left: 100, top: 0, width: 400, height: 225 }) as DOMRect
  return frame
}

describe('a conta do enquadramento', () => {
  it('um 16:9 num celular guarda cerca de um quarto da largura', () => {
    expect(BAND_WIDTH).toBeGreaterThan(20)
    expect(BAND_WIDTH).toBeLessThan(30)
  })

  it('a porcentagem é um alinhamento, não uma coordenada', () => {
    // At 0% the picture's left edge meets the window's left edge; at 100% the
    // right meets the right. Treating it as a coordinate put the window half
    // off the picture at both ends.
    // 1% is "all but flush left", not exactly flush: it is one percent of the
    // slack, which is well under a pixel on screen.
    expect(bandLeftFor(1)).toBeLessThan(1)
    expect(bandLeftFor(100) + BAND_WIDTH).toBeCloseTo(100, 5)
    expect(bandLeftFor(50) + BAND_WIDTH / 2).toBeCloseTo(50, 5)
  })

  it('zero é o centro, para um payload antigo não saltar', () => {
    expect(bandLeftFor(0)).toBe(bandLeftFor(50))
  })

  it('a volta nunca devolve zero', () => {
    // Zero is what the API uses for "never set", so emitting it would make the
    // far-left framing snap silently back to the middle.
    expect(focusForBandLeft(-40)).toBe(1)
    expect(focusForBandLeft(0)).toBe(1)
    expect(focusForBandLeft(999)).toBe(100)
  })

  it('ida e volta fecha', () => {
    for (const x of [1, 17, 50, 83, 100]) {
      expect(focusForBandLeft(bandLeftFor(x))).toBe(x)
    }
  })
})

describe('o arrasto', () => {
  it('anda na horizontal, que é o único eixo que corta', () => {
    const seen: number[] = []
    const frame = sized(show(50, (x) => seen.push(x)))

    fireEvent.pointerDown(frame, { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(frame, { clientX: 300, pointerId: 1 })
    fireEvent.pointerMove(frame, { clientX: 500, pointerId: 1 })

    expect(seen).toEqual([1, 50, 100])
  })

  it('não anda com o ponteiro solto', () => {
    const seen: number[] = []
    const frame = sized(show(50, (x) => seen.push(x)))
    fireEvent.pointerMove(frame, { clientX: 300, pointerId: 1 })
    expect(seen).toEqual([])
  })

  it('o que você pega é o que se move', () => {
    // The grip and the window used to be two things worked out differently,
    // and they drifted apart as you dragged.
    const root = show(50)
    const box = window_(root)
    const left = Number.parseFloat(box.style.left)
    const width = Number.parseFloat(box.style.width)
    expect(box.querySelector('span')).not.toBeNull()
    expect(left + width / 2).toBeCloseTo(50, 1)
  })

  it('pede o celular ao preview, que é onde isso significa algo', () => {
    const asked = vi.fn()
    const { container } = render(
      <DeviceContext value={asked}>
        <FocusPicker src="/foto.webp" x={50} onChange={() => {}} />
      </DeviceContext>,
    )
    fireEvent.pointerDown(sized(container), { clientX: 300, pointerId: 1 })
    expect(asked).toHaveBeenCalledWith('phone')
  })
})

describe('o arrasto sobrevive ao que o arrasto causa', () => {
  /** The real screen: every change is stored, so every move re-renders this. */
  function Live({ onChange }: { onChange: (x: number) => void }) {
    const [x, setX] = useState(50)
    return (
      <FocusPicker
        src="/foto.webp"
        x={x}
        onChange={(next) => {
          setX(next)
          onChange(next)
        }}
      />
    )
  }

  it('continua depois do re-render que o primeiro movimento provoca', () => {
    // This is the bug the earlier tests could not see. With the drag kept in
    // component state and the handler on the element, the event after the first
    // one reached a handler still reading the flag from before that render:
    // one click landed and nothing followed it.
    const seen: number[] = []
    const { container } = render(<Live onChange={(x) => seen.push(x)} />)
    sized(container)

    fireEvent.pointerDown(container.querySelector('.cursor-ew-resize')!, {
      clientX: 100,
      pointerId: 1,
    })
    fireEvent.pointerMove(window, { clientX: 300, pointerId: 1 })
    fireEvent.pointerMove(window, { clientX: 500, pointerId: 1 })

    expect(seen).toEqual([1, 50, 100])
  })

  it('segue valendo com o ponteiro fora da imagem', () => {
    // Which it must: the window only reaches either end if the pointer may
    // leave the picture on the way there.
    const seen: number[] = []
    const { container } = render(<Live onChange={(x) => seen.push(x)} />)
    sized(container)

    fireEvent.pointerDown(container.querySelector('.cursor-ew-resize')!, {
      clientX: 300,
      pointerId: 1,
    })
    fireEvent.pointerMove(window, { clientX: 9000, pointerId: 1 })
    expect(seen.at(-1)).toBe(100)
  })

  it('para de ouvir quando o ponteiro é solto', () => {
    const seen: number[] = []
    const { container } = render(<Live onChange={(x) => seen.push(x)} />)
    sized(container)

    fireEvent.pointerDown(container.querySelector('.cursor-ew-resize')!, {
      clientX: 300,
      pointerId: 1,
    })
    fireEvent.pointerUp(window, { pointerId: 1 })
    const afterRelease = seen.length
    fireEvent.pointerMove(window, { clientX: 500, pointerId: 1 })
    expect(seen).toHaveLength(afterRelease)
  })
})
