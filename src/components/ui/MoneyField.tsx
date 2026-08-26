import { useEffect, useRef, useState } from 'react'

/**
 * Money, written the way money is written.
 *
 * Everything downstream counts in centavos, which is right — money in
 * fractions of a cent is money that quietly loses a cent. But that is the
 * database's unit, not anybody's. The field asked for a goal of six hundred
 * reais and expected `60000`, a sum nobody says out loud and one zero away
 * from six thousand.
 *
 * The field owns the text while it is being typed, and formats only on the way
 * out. It used to reformat on every keystroke, which sounds tidy and is a trap:
 * typing 5 gave "5,00", the next 0 landed after the comma making "5,000", which
 * reads as five thousand and redraws as "5.000,00" — so three keystrokes turned
 * 500 into five hundred thousand. What is on screen has to be what was typed
 * until the person is done typing it.
 */

/** Centavos as the couple would write them: `60000` becomes `600,00`. */
export function centavosToReais(centavos: number | null | undefined): string {
  if (centavos == null) return ''
  return (centavos / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * What they typed, as centavos. Blank stays blank — an absent goal is not a
 * goal of zero.
 *
 * Both separators are accepted because both get typed: `1.234,50`, `1234,50`
 * and `1234.50` are the same amount. A separator with one or two digits after
 * it, at the end, is the decimal one; every other separator is grouping.
 */
export function reaisToCentavos(text: string): number | undefined {
  const trimmed = text.trim()
  if (!trimmed) return undefined
  const decimal = /[.,](\d{1,2})$/.exec(trimmed)
  const whole = (decimal ? trimmed.slice(0, decimal.index) : trimmed).replace(/\D/g, '')
  if (!whole && !decimal) return undefined
  const cents = decimal ? decimal[1].padEnd(2, '0') : '00'
  const centavos = Number(`${whole || '0'}${cents}`)
  return Number.isFinite(centavos) ? centavos : undefined
}

export function MoneyField({
  label,
  hint,
  centavos,
  onChange,
}: {
  label: string
  hint?: string
  centavos: number | undefined
  onChange: (next: number | undefined) => void
}) {
  const [text, setText] = useState(() => centavosToReais(centavos))
  /** What we last reported, so an echo of our own value never rewrites the text. */
  const mine = useRef(centavos)

  useEffect(() => {
    if (centavos === mine.current) return
    mine.current = centavos
    setText(centavosToReais(centavos))
  }, [centavos])

  return (
    <label className="block">
      <span className="font-body text-sm text-dark-gray">{label}</span>
      <span className="mt-1 flex min-h-10 items-center border border-olive-line bg-cream focus-within:border-olive">
        <span className="pl-3 font-body text-base text-dark-gray/70">R$</span>
        <input
          value={text}
          onChange={(event) => {
            const raw = event.target.value
            setText(raw)
            const next = reaisToCentavos(raw)
            mine.current = next
            onChange(next)
          }}
          onBlur={() => setText(centavosToReais(reaisToCentavos(text)))}
          inputMode="decimal"
          placeholder="0,00"
          className="min-w-0 flex-1 bg-transparent px-2 font-body text-base text-ink placeholder:text-dark-gray/45 focus:outline-none"
        />
      </span>
      {hint ? <span className="mt-1 block font-body text-xs text-dark-gray">{hint}</span> : null}
    </label>
  )
}
