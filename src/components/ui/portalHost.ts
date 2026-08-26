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
