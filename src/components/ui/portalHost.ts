import { useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'

/**
 * Where a floating panel should be rendered so nothing clips it.
 *
 * Normally the body: a panel inside a scroll container gets cut off at the
 * container's edge, and only leaving the container fixes that.
 *
 * Inside a dialog it has to be the dialog. A dialog opened with showModal()
 * is painted in the browser's top layer, which sits above every z-index in the
 * ordinary DOM — so a panel portalled to the body renders *behind* the sheet
 * that opened it. The dialog element itself does not scroll (its inner div
 * does), so a fixed panel in there escapes the clipping and keeps the layer.
 */
export function portalHost(from: Element | null | undefined): HTMLElement {
  return from?.closest('dialog') ?? document.body
}

/**
 * Where an anchored panel should be drawn, in window coordinates.
 *
 * A panel opened from a field cannot be positioned against that field once it
 * is portalled away — it has no parent left to be `absolute` inside. That is
 * the point: the parent it left behind was a scrolling pane, and a panel is
 * clipped at the edge of whatever scrolls around it. The editor pane is one,
 * so a calendar opened on a field near the bottom simply never appeared.
 *
 * The panel is measured, never guessed. A month grid is four, five or six rows
 * tall depending on where the month's days fall, so a constant is wrong most of
 * the year — and when it is too large, the panel that opens upwards floats well
 * above the field it belongs to. Measuring also means it re-places itself when
 * paging from a short month to a tall one with the panel still open.
 *
 * Attach `setPanel` as the panel's ref. `panel` comes back so the caller can
 * tell a click inside it from a click away — portalled, it is no longer inside
 * the wrapper that would otherwise answer that.
 */

/** A box in window coordinates: what getBoundingClientRect gives back. */
export interface AnchorBox {
  top: number
  bottom: number
  left: number
  width: number
}

/**
 * Where the panel goes, as arithmetic alone.
 *
 * Pulled out of the hook so it can be checked without a browser. The first
 * version of this guessed the panel's height from a constant and opened the
 * calendar a good inch above the field it belonged to — the kind of mistake
 * that is obvious in a table of numbers and easy to miss by eye.
 *
 * `panelHeight` of 0 means it has not been measured yet: nothing is known about
 * whether it fits, so it goes below and a later pass corrects it.
 */
export function placeAnchored(
  box: AnchorBox,
  panelHeight: number,
  viewportHeight: number,
): { top: number; left: number; width: number } {
  const below = viewportHeight - box.bottom
  const fitsBelow = panelHeight === 0 || below >= panelHeight + GAP + MARGIN
  const roomierAbove = box.top > below
  return {
    top:
      fitsBelow || !roomierAbove
        ? box.bottom + GAP
        : // Never off the top of the window, even if the panel is taller than
          // everything above the field.
          Math.max(MARGIN, box.top - panelHeight - GAP),
    left: box.left,
    width: box.width,
  }
}

/** The breath between the field and its panel. */
const GAP = 4
/** And between the panel and the edge of the window. */
const MARGIN = 8

export function useAnchoredSpot(
  open: boolean,
  anchor: RefObject<HTMLElement | null>,
): {
  spot: { top: number; left: number; width: number } | null
  panel: HTMLElement | null
  setPanel: (el: HTMLElement | null) => void
} {
  const [panel, setPanel] = useState<HTMLElement | null>(null)
  const [spot, setSpot] = useState<{ top: number; left: number; width: number } | null>(null)

  // Layout, not effect: this runs after the DOM is in place but before the
  // browser paints, so the one commit where the panel sits at its unmeasured
  // position is never shown.
  useLayoutEffect(() => {
    if (!open) {
      setSpot(null)
      return
    }
    const place = () => {
      const rect = anchor.current?.getBoundingClientRect()
      if (!rect) return
      const next = placeAnchored(
        rect,
        panel?.getBoundingClientRect().height ?? 0,
        window.innerHeight,
      )
      setSpot((old) =>
        old && old.top === next.top && old.left === next.left && old.width === next.width
          ? old
          : next,
      )
    }
    place()

    // Capture, so the pane's own scrolling moves the panel with the field
    // rather than leaving it floating where the field used to be.
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    // The panel changing shape under its own steam — a taller month — has to
    // move it too.
    const observer = panel ? new ResizeObserver(place) : null
    if (panel && observer) observer.observe(panel)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      observer?.disconnect()
    }
  }, [open, anchor, panel])

  return { spot, panel, setPanel }
}
