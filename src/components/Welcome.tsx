import { useEffect, useRef, useState } from 'react'

/**
 * The greeting that arrives with you and then settles into being the page's
 * title.
 *
 * Four beats, in order, and the order is the whole thing:
 *
 *   1. cream fills the window and the greeting stands in the middle of it
 *   2. still on cream, it walks to where headings live
 *   3. only then the cream fades, and the panel is simply there behind it
 *   4. the greeting is handed over to the page, which owns it from then on
 *
 * The first version faded the cream out *during* the walk, so the dashboard
 * came up underneath a heading that was still moving across it — two things
 * happening at once, both half-visible.
 *
 * The walk is a transform. It measures the distance to where the heading will
 * end up, starts there-plus-that-distance, and animates the distance to zero:
 * the element sits in its final place the whole time, which is what makes it
 * land exactly rather than approximately.
 */

/** Standing still in the middle, being read. */
const HOLD_MS = 2000
/** The walk. */
const FLIGHT_MS = 700
/** The cream giving way. */
const REVEAL_MS = 600

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
  const heading = useRef<HTMLHeadingElement>(null)
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null)
  const [beat, setBeat] = useState<Beat>('holding')

  useEffect(() => {
    const el = heading.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDone()
      return
    }

    // Where it ends up versus the middle of the window, measured now so the
    // journey is exact rather than a guess at a screen size.
    const rect = el.getBoundingClientRect()
    setOffset({
      x: window.innerWidth / 2 - (rect.left + rect.width / 2),
      y: window.innerHeight / 2 - (rect.top + rect.height / 2),
    })

    const timers = [
      window.setTimeout(() => setBeat('flying'), HOLD_MS),
      window.setTimeout(() => setBeat('revealing'), HOLD_MS + FLIGHT_MS),
      window.setTimeout(onDone, HOLD_MS + FLIGHT_MS + REVEAL_MS),
    ]
    return () => timers.forEach(window.clearTimeout)
  }, [onDone])

  const centred = offset !== null && beat === 'holding'

  return (
    <>
      {/* Opaque from the first paint, and only fading once the greeting has
          arrived. It also covers the single frame before the distance is
          measured, where the heading is still sitting in its final place. */}
      <div
        aria-hidden="true"
        style={{
          opacity: beat === 'revealing' ? 0 : 1,
          transition: `opacity ${REVEAL_MS}ms ease-out`,
        }}
        className="pointer-events-none fixed inset-0 z-30 bg-cream"
      />
      <h1
        ref={heading}
        className="relative z-40 font-display text-3xl text-olive"
        style={{
          transform: centred
            ? `translate(${offset.x}px, ${offset.y}px) scale(1.6)`
            : undefined,
          transition:
            beat === 'holding'
              ? undefined
              : `transform ${FLIGHT_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      >
        {greeting}, {name}
      </h1>
    </>
  )
}
