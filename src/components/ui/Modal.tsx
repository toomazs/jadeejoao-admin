import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { Button } from './primitives'

/** Kept in step with the .modal-out animation in global.css. */
const EXIT_MS = 220
/** Kept in step with .modal-in. */
const ENTER_MS = 260

/**
 * Every dialog in the panel, built once — and built the way the site builds
 * its own.
 *
 * On a real <dialog> opened with showModal(), so the browser handles the focus
 * trap, the inert background and Escape. This used to be a positioned div with
 * a hand-written Tab cycle, which is a well-known way to get focus subtly
 * wrong; the platform does it correctly and for free.
 *
 * It arrives and leaves like the gift sheet on the site: the same rise, the
 * same blurred backdrop, the same easing. Callers mount and unmount it, so the
 * exit has to finish before `onClose` reaches the parent — otherwise the parent
 * removes the element mid-animation and the sheet vanishes instead of leaving.
 */
export function Modal({
  title,
  subtitle,
  onClose,
  footer,
  children,
  width = 'max-w-lg',
}: {
  title: string
  subtitle?: string
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
  width?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [closing, setClosing] = useState(false)
  /**
   * Whether the arrival has finished.
   *
   * The class has to come off once it has. Its keyframes end on `transform:
   * none`, and `both` keeps that applied — a transform, even the identity one,
   * makes an element the containing block for everything `fixed` inside it. So
   * a dropdown portalled in here was positioned from the sheet's own corner
   * instead of the window's, and opened a few hundred pixels below where the
   * field was.
   */
  const [arrived, setArrived] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  // A ref, not the state: state settles on the next render, so Escape followed
  // quickly by a click on "fechar" both saw `closing` still false and each
  // scheduled its own close.
  const leaving = useRef(false)

  const leave = useCallback(() => {
    if (leaving.current) return
    leaving.current = true
    document.body.style.overflow = ''
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose()
      return
    }
    setClosing(true)
    timer.current = window.setTimeout(onClose, EXIT_MS)
  }, [onClose])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    dialog.showModal()
    // The page must not scroll behind the sheet.
    document.body.style.overflow = 'hidden'
    // Focus lands on the first thing there is to fill in, and only falls back
    // to a button if there is nothing. A single selector would have picked
    // whatever comes first in the DOM, which is the close button in the header
    // — opening "Novo convidado" would put the cursor on "fechar".
    const field = dialog.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]), select, textarea, [contenteditable="true"]',
    )
    ;(field ?? dialog.querySelector<HTMLElement>('button:not([disabled])'))?.focus()
    // Belt as well as the animationend below. An animation that never
    // finishes — or never starts — would otherwise leave the transform on
    // forever, and with it the wrong containing block.
    const entered = window.setTimeout(() => setArrived(true), ENTER_MS)
    return () => {
      document.body.style.overflow = ''
      window.clearTimeout(timer.current)
      window.clearTimeout(entered)
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      // Escape fires this rather than closing outright, so it leaves the same
      // way the close button makes it leave.
      onCancel={(event) => {
        event.preventDefault()
        leave()
      }}
      onClick={(event) => {
        if (event.target === ref.current) leave()
      }}
      onAnimationEnd={(event) => {
        if (event.animationName === 'modal-in') setArrived(true)
      }}
      className={`m-auto w-full ${width} border border-olive-line bg-cream p-0 text-ink backdrop:bg-ink/55 backdrop:backdrop-blur-sm ${
        closing ? 'modal-out' : arrived ? '' : 'modal-in'
      }`}
    >
      <div className="max-h-[85svh] overflow-y-auto">
        <header className="flex items-start justify-between gap-3 border-b border-sand-line px-4 py-3">
          <div>
            <h2 className="font-display text-xl text-olive">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 font-body text-sm text-dark-gray">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={leave}
            aria-label="Fechar"
            className="-mt-1 -mr-1 shrink-0 cursor-pointer p-2 text-dark-gray transition-colors hover:text-terracotta"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="px-4 py-4">{children}</div>

        {footer ? (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-sand-line px-4 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  )
}

/**
 * Asking before something irreversible.
 *
 * Replaces window.confirm, which cannot be styled, cannot say much, and on a
 * phone looks like the browser is warning about the site rather than the panel
 * asking a question.
 */
export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Apagar',
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      width="max-w-md"
      footer={
        <>
          <Button tone="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            tone="danger"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="font-body text-base text-ink">{message}</p>
    </Modal>
  )
}
