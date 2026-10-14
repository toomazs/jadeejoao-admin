import { useEffect, useRef, useState, use } from 'react'

import { DeviceContext } from './PayloadEditor'

/**
 * Which part of the opening photograph a phone keeps, chosen by dragging it.
 *
 * The photograph is cropped to 16:9 on the way in and then shown in whatever
 * shape the screen is. On a desk those are nearly the same and almost nothing
 * is lost. On a phone the window is far taller than it is wide, so roughly a
 * quarter of the picture's width survives — and which quarter had never been
 * anybody's decision. It was the middle, and the middle of a photograph of two
 * people is frequently neither of them.
 *
 * Horizontal only, because that is the only axis that crops. A 16:9 picture in
 * a tall window is scaled to fill the height, so the full height is always
 * kept and a vertical control would be a handle that does nothing.
 *
 * The window and its handle are one object. They were two — a dot at the point
 * and a band worked out from it — and they drifted apart as you dragged,
 * because `object-position` is not a coordinate: at 0% the picture's left edge
 * meets the window's left edge, not "the point sits on the left". So the band
 * travels across the slack while a dot placed at the raw percentage travels
 * across the whole picture. Here the band is what you grab, and the percentage
 * is worked back out of where it lands.
 */

/** The shape of a phone's window, near enough: a tall 9:19.5. */
const PHONE_RATIO = 9 / 19.5
/** The shape every opening photograph is cropped to on upload. */
const PHOTO_RATIO = 16 / 9

/** What a phone keeps, as a share of the picture's width. */
export const BAND_WIDTH = (PHONE_RATIO / PHOTO_RATIO) * 100

/**
 * Where the band sits, given the stored percentage — and back again.
 *
 * Never zero on the way out: the API omits a focal point that is zero and the
 * site reads a missing one as the middle, so emitting nought would mean the
 * far-left framing silently snapped back to centre. One percent is as far as it
 * goes, and the difference on screen is under a pixel.
 */
export function bandLeftFor(focusX: number): number {
  return ((focusX || 50) / 100) * (100 - BAND_WIDTH)
}

export function focusForBandLeft(left: number): number {
  const slack = 100 - BAND_WIDTH
  const clamped = Math.min(slack, Math.max(0, left))
  return Math.max(1, Math.round((clamped / slack) * 100))
}

export function FocusPicker({
  src,
  x,
  onChange,
}: {
  src: string
  /** Percent across the photo; 0 means unset, which is the middle. */
  x: number
  onChange: (x: number) => void
}) {
  const frame = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const askFor = use(DeviceContext)

  /**
   * The newest onChange, so a drag in flight always reports to it.
   *
   * The listeners below are attached once, when the drag starts, and would
   * otherwise keep calling whichever handler existed at that instant — which
   * closes over the payload as it was before the first pixel moved.
   */
  const latest = useRef(onChange)
  useEffect(() => {
    latest.current = onChange
  })

  const left = bandLeftFor(x)

  const moveTo = (event: { clientX: number }) => {
    const box = frame.current?.getBoundingClientRect()
    if (!box || box.width === 0) return
    const across = ((event.clientX - box.left) / box.width) * 100
    // The pointer is where the middle of the window should be, which is how
    // dragging a window over a picture behaves everywhere else.
    latest.current(focusForBandLeft(across - BAND_WIDTH / 2))
  }

  /**
   * The drag lives on the window, not on this element.
   *
   * It was a `dragging` flag read inside onPointerMove, and it did not work:
   * every move writes to the payload, every write re-renders this screen, and
   * the handler that the next event reached was reading the flag from before
   * that render. One click landed and nothing followed it. Listeners put on
   * the window at the start of the drag survive all of it, and they also mean
   * the pointer can leave the picture — which it must, to drag the window all
   * the way to either end.
   */
  const startDrag = (event: { clientX: number }) => {
    moveTo(event)
    setDragging(true)
    const move = (moved: PointerEvent) => moveTo(moved)
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
      setDragging(false)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
  }

  return (
    <div className="mt-3">
      <span className="block font-body text-xs tracking-[0.1em] text-dark-gray uppercase">
        Enquadramento no celular
      </span>

      <div
        ref={frame}
        onPointerDown={(event) => {
          event.preventDefault()
          // This control only means anything against the phone, so it puts the
          // preview into one rather than letting somebody drag at a desktop
          // and conclude it is broken.
          askFor?.('phone')
          startDrag(event)
        }}
        className="relative mt-1.5 w-full max-w-sm cursor-ew-resize touch-none overflow-hidden border border-olive-line select-none"
        style={{ aspectRatio: String(PHOTO_RATIO) }}
      >
        <img src={src} alt="" draggable={false} className="h-full w-full object-cover" />

        {/* Everything outside the window is what a phone throws away. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 bg-ink/60"
          style={{ width: `${left}%` }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 bg-ink/60"
          style={{ width: `${100 - left - BAND_WIDTH}%` }}
        />

        {/* The window itself, and the grip in the middle of it — one object, so
            what you take hold of is what moves. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 flex items-center justify-center border-2 transition-colors ${
            dragging ? 'border-gold-sand' : 'border-cream/85'
          }`}
          style={{ left: `${left}%`, width: `${BAND_WIDTH}%` }}
        >
          <span className="h-9 w-1 rounded-full bg-cream/90 shadow-[0_0_0_1px_rgba(26,24,24,0.45)]" />
        </div>
      </div>

      <p className="mt-1.5 font-body text-xs text-dark-gray italic">
        Arraste para o lado: a parte clara é o que aparece no celular, o escuro é
        cortado. No computador a foto aparece quase inteira de qualquer jeito.
      </p>

      {(x || 50) !== 50 ? (
        <button
          type="button"
          onClick={() => onChange(50)}
          className="mt-1 cursor-pointer font-body text-xs text-dark-gray underline decoration-1 underline-offset-4 transition-colors hover:text-olive"
        >
          Voltar ao centro
        </button>
      ) : null}
    </div>
  )
}
