import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * The greeting that arrives with you and then settles into being the page's
 * title.
 *
 *   1. cream covers the window from the first paint, and the greeting fades up
 *      in the middle of it
 *   2. it holds there, being read
 *   3. still on cream, it walks to where headings live, shrinking as it goes
 *   4. the cream dissolves and the panel is simply there behind it
 *   5. the page takes its title back
 *
 * There is no fade at the end. The greeting does not leave — it lands exactly
 * where the real heading sits, and the swap is one React commit, so the two are
 * never both on screen and never both absent.
 *
 * The cream is painted before anything is measured. Waiting for the
 * measurement to draw it meant one frame of the whole dashboard, which is the
 * flash that made the arrival look broken.
 *
 * The fade-in is a keyframe rather than a state flip on the next frame: a flip
 * waits on requestAnimationFrame, and a background tab never gives it one — the
 * greeting would sit invisible until the walk began.
 *
 * What travels is a copy, in a portal on the body. Moving the heading itself
 * meant moving something inside `main`, which scrolls, so it was clipped at the
 * edge of the pane and painted under the cream. And the copy is sized to its
 * own text: measuring the heading's box centres a full-width block, which puts
 * left-aligned text far off to one side.
 */

/** Standing still in the middle, being read. The fade-in happens inside this. */
const HOLD_MS = 2000
/** The walk. */
const FLIGHT_MS = 900
/** The cream giving way. */
const REVEAL_MS = 700

/** Slow out, gentle in — the curve the panel uses everywhere it moves. */
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

type Beat = 'holding' | 'flying' | 'revealing'

export function Welcome({
  greeting,
  name,
  onDone,
}: {
  greeting: string
  name: string
  /** Fired once the panel is uncovered and the page can take its title back. */
  onDone: () => void
}) {
  const ruler = useRef<HTMLSpanElement>(null)
  const [lands, setLands] = useState<{ top: number; left: number } | null>(null)
  const [beat, setBeat] = useState<Beat>('holding')

  useEffect(() => {
    const el = ruler.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDone()
      return
    }

    // Where the text itself ends up — measured on the span around the words,
    // not on the heading block, which is as wide as the column.
    const rect = el.getBoundingClientRect()
    setLands({ top: rect.top, left: rect.left })

    const timers = [
      window.setTimeout(() => setBeat('flying'), HOLD_MS),
      window.setTimeout(() => setBeat('revealing'), HOLD_MS + FLIGHT_MS),
      window.setTimeout(onDone, HOLD_MS + FLIGHT_MS + REVEAL_MS),
    ]
    return () => timers.forEach(window.clearTimeout)
  }, [onDone])

  const words = `${greeting}, ${name}`

  return (
    <>
      {/* A ruler: it holds the line's height and says where the copy has to
          land. Never seen — what is read is the copy. */}
      <h1 className="font-display text-3xl text-olive">
        <span ref={ruler} className="inline-block opacity-0">
          {words}
        </span>
      </h1>

      {createPortal(
        <>
          <div
            aria-hidden="true"
            style={{
              opacity: beat === 'revealing' ? 0 : 1,
              transition: `opacity ${REVEAL_MS}ms ease-out`,
            }}
            className="pointer-events-none fixed inset-0 z-[60] bg-cream"
          />

          {lands ? (
            <span
              aria-hidden="true"
              // The animation only belongs to the arrival. Left on, its filled
              // opacity would outrank anything set afterwards.
              className={`pointer-events-none fixed z-[61] font-display text-3xl whitespace-nowrap text-olive ${
                beat === 'holding' ? 'welcome-in' : ''
              }`}
              style={{
                top: lands.top,
                left: lands.left,
                // From where it will land to the middle of the window, in its
                // own coordinates: the copy is already in its final place, and
                // what moves is the offset.
                transform:
                  beat === 'holding'
                    ? `translate(calc(50vw - ${lands.left}px - 50%), calc(50svh - ${lands.top}px - 50%)) scale(1.6)`
                    : undefined,
                transition: beat === 'holding' ? undefined : `transform ${FLIGHT_MS}ms ${EASE}`,
              }}
            >
              {words}
            </span>
          ) : null}
        </>,
        document.body,
      )}
    </>
  )
}
