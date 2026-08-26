import { useEffect, useRef, useState } from 'react'

import { Button, Slider } from './ui'

/**
 * Framing a photo before it becomes part of the site.
 *
 * A wedding photo arrives as whatever the camera gave; the site wants a
 * particular shape. Without this the couple would have to crop somewhere else
 * first, or accept whatever `object-cover` decides to keep — which is how you
 * end up with the top of somebody's head missing.
 *
 * The result is a data URL rather than a blob. The live preview runs on
 * another origin, and a blob URL is scoped to the origin that made it: it
 * would show here and be a broken image there. Base64 travels.
 */

/** Longest side of the exported image. Beyond this is weight nobody sees. */
const MAX_OUTPUT = 2000

interface CropModalProps {
  file: File
  /** Width / height the site will show this in. */
  aspect: number
  onCancel: () => void
  onDone: (dataUrl: string) => void
}

export function CropModal({ file, aspect, onCancel, onDone }: CropModalProps) {
  const [src, setSrc] = useState('')
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)
  const frame = useRef<HTMLDivElement>(null)
  const dragging = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    const img = new Image()
    img.onload = () => setImage(img)
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Escape closes, like every other dialog on the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  /**
   * `cover` is the scale at which the photo exactly fills the frame — the
   * floor for zoom, so panning can never expose an empty corner.
   */
  const coverScale = (): number => {
    const box = frame.current
    if (!image || !box) return 1
    return Math.max(box.clientWidth / image.width, box.clientHeight / image.height)
  }

  const clampOffset = (next: { x: number; y: number }, scale: number) => {
    const box = frame.current
    if (!image || !box) return next
    const drawnW = image.width * scale
    const drawnH = image.height * scale
    const maxX = Math.max(0, (drawnW - box.clientWidth) / 2)
    const maxY = Math.max(0, (drawnH - box.clientHeight) / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    }
  }

  const scale = coverScale() * zoom

  const confirm = () => {
    const box = frame.current
    if (!image || !box) return
    setBusy(true)

    const viewW = box.clientWidth
    const viewH = box.clientHeight
    // Which part of the original the frame is showing, in source pixels.
    const srcW = viewW / scale
    const srcH = viewH / scale
    const srcX = (image.width - srcW) / 2 - offset.x / scale
    const srcY = (image.height - srcH) / 2 - offset.y / scale

    const outW = Math.min(MAX_OUTPUT, Math.round(srcW))
    const outH = Math.round(outW / aspect)
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setBusy(false)
      return
    }
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, outW, outH)
    // JPEG: these are photographs, and PNG would triple the payload that has
    // to travel through postMessage on every keystroke.
    onDone(canvas.toDataURL('image/jpeg', 0.85))
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Ajustar a foto"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div className="flex max-h-full w-full max-w-2xl flex-col border border-olive-line bg-cream">
        <header className="shrink-0 border-b border-sand-line px-4 py-3">
          <h2 className="font-display text-xl text-olive">Ajustar a foto</h2>
          <p className="mt-0.5 font-body text-sm text-dark-gray">
            Arraste para escolher o que aparece e use a barra para aproximar.
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div
            ref={frame}
            className="relative mx-auto cursor-grab overflow-hidden border border-olive-line bg-veil select-none active:cursor-grabbing"
            // The frame keeps the site's exact shape — the crop is computed
            // from what it measures, so a frame that lied about its ratio
            // would hand back a photo cropped differently from the one being
            // looked at. So the height is capped by capping the WIDTH: a
            // portrait at full width came out taller than the screen and put
            // the buttons somewhere nobody could reach.
            style={{
              aspectRatio: String(aspect),
              width: `min(100%, calc(48vh * ${aspect}))`,
            }}
            onPointerDown={(event) => {
              dragging.current = { x: event.clientX - offset.x, y: event.clientY - offset.y }
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerMove={(event) => {
              const start = dragging.current
              if (!start) return
              setOffset(
                clampOffset({ x: event.clientX - start.x, y: event.clientY - start.y }, scale),
              )
            }}
            onPointerUp={() => {
              dragging.current = null
            }}
          >
            {src ? (
              <img
                src={src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute top-1/2 left-1/2"
                style={{
                  width: image ? image.width * scale : undefined,
                  maxWidth: 'none',
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                }}
              />
            ) : null}
          </div>

          <div className="mt-4">
            <Slider
              label="Aproximar"
              min={1}
              max={4}
              step={0.02}
              value={zoom}
              onChange={(next) => {
                setZoom(next)
                setOffset((o) => clampOffset(o, coverScale() * next))
              }}
            />
          </div>
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t border-sand-line px-4 py-3">
          <Button tone="quiet" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={!image || busy}>
            {busy ? 'Recortando…' : 'Usar esta foto'}
          </Button>
        </footer>
      </div>
    </div>
  )
}
