import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

/**
 * The panel's shared parts.
 *
 * Operate mode (AD-12): these are quieter and denser than the site's. The
 * couple comes here to get something done and leave, so nothing animates in,
 * nothing reveals on scroll, and every control says what it does.
 */

type ButtonTone = 'primary' | 'quiet' | 'danger'

const TONE: Record<ButtonTone, string> = {
  primary: 'border-olive bg-olive text-cream hover:bg-deep-olive',
  quiet: 'border-olive-line text-dark-gray hover:border-olive hover:text-olive',
  danger: 'border-terracotta text-terracotta hover:bg-terracotta hover:text-cream',
}

export function Button({
  tone = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone }) {
  return (
    <button
      type="button"
      {...rest}
      className={`min-h-10 cursor-pointer border px-4 font-body text-sm tracking-[0.04em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${TONE[tone]} ${className}`}
    />
  )
}

export function Field({
  label,
  hint,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="font-body text-sm text-dark-gray">{label}</span>
      <input
        {...rest}
        className="mt-1 min-h-10 w-full border border-olive-line bg-cream px-3 font-body text-base text-ink placeholder:text-dark-gray/45 focus:border-olive"
      />
      {hint ? <span className="mt-1 block font-body text-xs text-dark-gray">{hint}</span> : null}
    </label>
  )
}

export function Panel({
  title,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`border border-olive-line bg-cream ${className}`}>
      {title || actions ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-line px-4 py-3">
          <h2 className="font-body text-sm tracking-[0.16em] text-olive uppercase">{title}</h2>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  )
}

/** A number that matters, big enough to read across a table. */
export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'yes' | 'no' }) {
  const color = tone === 'yes' ? 'text-olive' : tone === 'no' ? 'text-terracotta' : 'text-ink'
  return (
    <div className="border border-olive-line bg-cream px-4 py-3">
      <p className="font-body text-xs tracking-[0.14em] text-dark-gray uppercase">{label}</p>
      <p className={`mt-1 font-display text-3xl ${color}`}>{value}</p>
    </div>
  )
}

/** Inline feedback that does not move the layout when it appears. */
export function Notice({ kind, children }: { kind: 'error' | 'ok'; children: ReactNode }) {
  if (!children) return null
  return (
    <p
      role={kind === 'error' ? 'alert' : 'status'}
      className={`font-body text-sm ${kind === 'error' ? 'text-terracotta' : 'text-olive'}`}
    >
      {children}
    </p>
  )
}

/** Placeholder rows while a table loads — never the word "carregando". */
export function SkeletonRows({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="border-t border-sand-line">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c} className="px-4 py-3">
              <span
                className="block h-3 animate-pulse bg-sand-line"
                style={{ width: `${45 + ((r * 7 + c * 13) % 40)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-10 text-center font-body text-sm text-dark-gray italic">{children}</p>
  )
}
