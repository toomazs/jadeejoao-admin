import { Monitor, RefreshCw, Smartphone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * The real site, showing edits that have not been saved.
 *
 * Not a mockup and not a rebuild: this is `jadeejoao.com.br` in an iframe,
 * running the same bundle guests get. It boots in preview mode, where its API
 * transport answers `/content` and `/gifts` from whatever draft we post here
 * and passes everything else through to the real API.
 *
 * The alternative — save, switch tabs, refresh, hope — means finding out that
 * a long title broke the layout only after the guests could see it.
 */

/** Where the published site lives. Overridable for local development. */
const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'https://jadeejoao.com.br'

const DEVICES = {
  desktop: { label: 'Computador', width: '100%', icon: Monitor },
  phone: { label: 'Celular', width: '390px', icon: Smartphone },
} as const

export type Device = keyof typeof DEVICES

export interface Draft {
  /** The public `/content` shape — sections already filtered by `enabled`. */
  content?: unknown
  /** The public `/gifts` shape. */
  gifts?: unknown
  /** The chapter galleries by person, in the public `/instagram/{person}` shape. */
  instagram?: Record<string, unknown>
}

interface SitePreviewProps {
  draft: Draft
  /** Section to scroll to, so editing a section shows that section. */
  focusSlug?: string
  /** A finer target inside the section — one album frame, say. */
  focusAnchor?: string
  /** Bumped on every request, so asking for the same place scrolls again. */
  focusNonce?: number
  /**
   * When set, the site waits for a click on that photo and reports back where.
   * Beats asking anyone to guess a percentage.
   */
  picking?: string
  onPicked?: (x: number, y: number) => void
  /**
   * Which shape the preview is wearing, owned by the screen so that a field
   * meant for one of them can ask to be shown in it. The focal point is for
   * phones; touching it with the preview on a desktop shows nothing.
   */
  device: Device
  onDevice: (next: Device) => void
  className?: string
}

export function SitePreview({
  draft,
  focusSlug,
  focusAnchor,
  focusNonce,
  picking,
  onPicked,
  device,
  onDevice,
  className = '',
}: SitePreviewProps) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const [nonce, setNonce] = useState(0)

  // The site announces when its bundle has booted. Posting before that would
  // send the first draft into a page not yet listening.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return
      if (event.data?.type === 'preview-ready') setReady(true)
      if (event.data?.type === 'preview-picked' && typeof event.data.x === 'number') {
        onPicked?.(event.data.x, event.data.y)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onPicked])

  useEffect(() => {
    if (!ready) return
    frame.current?.contentWindow?.postMessage({ type: 'preview-draft', draft }, SITE_URL)
  }, [ready, draft])

  useEffect(() => {
    if (!ready) return
    const slug = focusAnchor || focusSlug
    if (!slug) return
    frame.current?.contentWindow?.postMessage({ type: 'preview-scroll', slug }, SITE_URL)
  }, [ready, focusSlug, focusAnchor, focusNonce])

  useEffect(() => {
    if (!ready) return
    frame.current?.contentWindow?.postMessage(
      picking ? { type: 'preview-pick', target: picking } : { type: 'preview-pick-cancel' },
      SITE_URL,
    )
  }, [ready, picking])

  return (
    <div className={`flex min-h-0 flex-col border border-olive-line bg-cream ${className}`}>
      <header className="flex items-center justify-between gap-2 border-b border-sand-line px-3 py-2">
        <p className="font-body text-xs tracking-[0.14em] text-olive uppercase">
          Como vai ficar
        </p>
        <div className="flex items-center gap-1">
          {(Object.keys(DEVICES) as Device[]).map((key) => {
            const { label, icon: Icon } = DEVICES[key]
            return (
              <button
                key={key}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={device === key}
                onClick={() => onDevice(key)}
                className={`cursor-pointer border p-1.5 transition-colors ${
                  device === key
                    ? 'border-olive bg-olive text-cream'
                    : 'border-transparent text-dark-gray hover:text-olive'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            )
          })}
          <button
            type="button"
            title="Recarregar o preview"
            aria-label="Recarregar o preview"
            onClick={() => {
              setReady(false)
              setNonce((n) => n + 1)
            }}
            className="cursor-pointer border border-transparent p-1.5 text-dark-gray transition-colors hover:text-olive"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {picking ? (
        <p className="border-b border-sand-line bg-gold-sand/25 px-3 py-2 font-body text-sm text-ink">
          Clique no olho fechado da Catarina, na foto ao lado.
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-veil p-3">
        <iframe
          key={nonce}
          ref={frame}
          // The query mark plus being framed is what puts the site into preview
          // mode; it refuses to accept a draft without both.
          src={`${SITE_URL}/?preview=1`}
          title="Preview do site"
          className="h-full min-h-0 border border-sand-line bg-cream"
          style={{ width: DEVICES[device].width, maxWidth: '100%' }}
        />
      </div>
    </div>
  )
}
