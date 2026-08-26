import { Button } from './primitives'

/**
 * The bar that turns up when there is something to save.
 *
 * A "Salvar" button inside every accordion meant the couple had to find the
 * one nearest whatever they had just typed, and a button at the top of a long
 * form is off screen by the time it is needed. This waits at the bottom of the
 * window instead: it appears when the section is dirty, and it is the only
 * place the section is saved from.
 *
 * It also shakes. Clicking another tab with unsaved work is the one moment the
 * panel can lose something the couple wrote, and a bar that has been sitting
 * there quietly needs a way to say so. Discord's does the same, and — the part
 * worth copying — theirs holds still for anyone who has asked the system for
 * less movement.
 */
export function SaveBar({
  visible,
  saving,
  label,
  onSave,
  onReset,
}: {
  visible: boolean
  saving?: boolean
  /** Overrides the button text while something is happening. */
  label?: string
  onSave: () => void
  onReset: () => void
}) {
  return (
    <div
      // Fixed to the window, not the form: the point is to be reachable
      // without scrolling back anywhere.
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        visible ? 'pb-4 opacity-100' : 'translate-y-4 pb-0 opacity-0'
      }`}
      aria-hidden={!visible}
    >
      {/* The shake is driven by an attribute this component never writes, so a
          re-render cannot wipe it mid-animation. */}
      <div
        className="save-bar pointer-events-auto flex w-full max-w-2xl items-center gap-3 border border-olive-line bg-ink px-4 py-3 shadow-[0_10px_30px_-8px_rgba(26,24,24,0.55)]"
        role="status"
      >
        <p className="min-w-0 flex-1 font-body text-sm text-cream">
          Você tem alterações que ainda não foram salvas.
        </p>
        <button
          type="button"
          onClick={onReset}
          disabled={saving}
          className="min-h-9 shrink-0 cursor-pointer px-2 font-body text-sm text-cream/70 transition-colors hover:text-cream disabled:cursor-not-allowed disabled:opacity-40"
        >
          Descartar
        </button>
        <Button onClick={onSave} disabled={saving}>
          {label ?? (saving ? 'Salvando…' : 'Salvar')}
        </Button>
      </div>
    </div>
  )
}

/**
 * Asks a mounted SaveBar to shake, and says whether one was there to ask.
 *
 * The thing that knows a navigation is about to throw work away is the tab
 * being clicked, several components away from the bar — and it needs the
 * answer, because a shake only counts as a warning if it happened.
 */
export function shakeSaveBar(): boolean {
  const bar = document.querySelector<HTMLElement>('.save-bar')
  if (!bar) return false
  bar.removeAttribute('data-shaking')
  // Reading layout between the two writes is what restarts the animation; a
  // remove and an add in the same frame is no change at all.
  void bar.offsetWidth
  bar.setAttribute('data-shaking', '')
  return true
}
