import { useEffect, useRef, useState } from 'react'

/**
 * The greeting that arrives with you and then settles into being the page's
 * title.
 *
 * Not a splash that plays and disappears — nothing is hidden behind it and no
 * time is spent waiting. It is the heading, drawn where the eye already is
 * (the middle of the screen) and then walking to where headings live. The
 * panel is the couple's, and the first thing it says should be their name.
 *
 * The flight is done with a transform, so the browser moves it on the
 * compositor and the text is never re-laid-out mid-journey. It measures the
 * distance to where the heading will end up, starts there-plus-the-offset, and
 * animates the offset to zero — the element is in its final place the whole
 * time, which is what makes it land exactly and not approximately.
 */

/** How long the greeting holds still before it goes. */
const HOLD_MS = 1000
/** The flight itself. Kept here rather than in CSS because the JS waits on it. */
const FLIGHT_MS = 700

export function Welcome({
  greeting,
  name,
  onDone,
}: {
  greeting: string
  name: string
  /** Fired when the greeting has landed and the page can take over. */
  onDone: () => void
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const [offset, setOffset] = useState<{ x: number; y: number; scale: number } | null>(null)
  const [flying, setFlying] = useState(false)

  useEffect(() => {
    const el = heading.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      onDone()
      return
    }

    // Where it ends up versus the middle of the window, measured now so the
    // journey is exact rather than a guess at a screen size.
    const rect = el.getBoundingClientRect()
    setOffset({
      x: window.innerWidth / 2 - (rect.left + rect.width / 2),
      y: window.innerHeight / 2 - (rect.top + rect.height / 2),
      scale: 1.6,
    })

    const goes = window.setTimeout(() => setFlying(true), HOLD_MS)
    const lands = window.setTimeout(onDone, HOLD_MS + FLIGHT_MS)
    return () => {
      window.clearTimeout(goes)
      window.clearTimeout(lands)
    }
  }, [onDone])

  const away = offset && !flying

  return (
    <>
      {/* Opaque from the first paint and fading only on the way out. Faded in
          instead, it would have left the dashboard showing underneath a
          greeting floating over it for half a second — and it also covers the
          one frame before the distance is measured, where the heading is still
          sitting in its final place. */}
      <div
        aria-hidden="true"
        style={{ opacity: flying ? 0 : 1, transition: `opacity ${FLIGHT_MS}ms ease-out` }}
        className="pointer-events-none fixed inset-0 z-30 bg-cream"
      />
      <h1
        ref={heading}
        className="relative z-40 font-display text-3xl text-olive"
        style={{
          transform: away
            ? `translate(${offset.x}px, ${offset.y}px) scale(${offset.scale})`
            : undefined,
          transition: flying
            ? `transform ${FLIGHT_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
            : undefined,
        }}
      >
        {greeting}, {name}
      </h1>
    </>
  )
}
