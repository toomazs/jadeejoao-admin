import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import { Button } from './primitives'

/**
 * Every dialog in the panel, built once.
 *
 * Focus is trapped and returned, Escape closes, and the page behind stops
 * scrolling — the things a native dialog would give and that hand-rolled
 * overlays keep forgetting.
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
  const panel = useRef<HTMLDivElement>(null)
  const restoreTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    restoreTo.current = document.activeElement as HTMLElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Focus lands inside so the keyboard is already in the dialog.
    panel.current?.querySelector<HTMLElement>(
      'input, select, textarea, button, [tabindex]:not([tabindex="-1"])',
    )?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panel.current) return
      // Keep Tab inside: escaping into the page behind a modal is how people
      // end up typing into a form they cannot see.
      const focusable = [
        ...panel.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.offsetParent !== null)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      restoreTo.current?.focus()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-ink/50 px-4 py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${width} border border-olive-line bg-cream shadow-[0_24px_60px_-30px_rgba(26,24,24,0.7)]`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-sand-line px-4 py-3">
          <div>
            <h2 className="font-display text-xl text-olive">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 font-body text-sm text-dark-gray">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 cursor-pointer px-2 font-body text-sm text-dark-gray transition-colors hover:text-olive"
          >
            fechar
          </button>
        </header>

        <div className="px-4 py-4">{children}</div>

        {footer ? (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-sand-line px-4 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
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
