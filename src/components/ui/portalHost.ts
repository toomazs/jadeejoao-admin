import { useEffect, useState } from 'react'
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
 * `height` is what the panel needs. Given it, this opens upwards when the
 * field sits low and there is more room above, instead of off the bottom.
 */
export function useAnchoredSpot(
  open: boolean,
  anchor: RefObject<HTMLElement | null>,
  height: number,
): { top: number; left: number; width: number } | null {
  const [spot, setSpot] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    if (!open) {
      setSpot(null)
      return
    }
    const place = () => {
      const rect = anchor.current?.getBoundingClientRect()
      if (!rect) return
      const below = window.innerHeight - rect.bottom
      setSpot({
        top: below < height + 16 && rect.top > below ? rect.top - height - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
    place()
    // Capture, so the pane's own scrolling moves the panel with the field
    // rather than leaving it floating where the field used to be.
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchor, height])

  return spot
}
