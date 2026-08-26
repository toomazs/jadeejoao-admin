/**
 * Money, written the way money is written.
 *
 * Everything downstream counts in centavos, which is right — money in
 * fractions of a cent is money that quietly loses a cent. But that is the
 * database's unit, not anybody's. The field asked for a goal of six hundred
 * reais and expected `60000`, which is a sum nobody would ever say out loud
 * and one zero away from six thousand.
 *
 * So the panel speaks reais and converts at the edge.
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
 * and `1234.50` are the same amount. The last separator with two digits after
 * it is the decimal one; anything else is grouping and goes.
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
  value,
  onChange,
}: {
  label: string
  hint?: string
  /** Reais, as typed. The caller converts with `reaisToCentavos` on the way out. */
  value: string
  onChange: (next: string) => void
}) {
  return (
    <label className="block">
      <span className="font-body text-sm text-dark-gray">{label}</span>
      <span className="mt-1 flex min-h-10 items-center border border-olive-line bg-cream focus-within:border-olive">
        <span className="pl-3 font-body text-base text-dark-gray/70">R$</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          placeholder="0,00"
          className="min-w-0 flex-1 bg-transparent px-2 font-body text-base text-ink placeholder:text-dark-gray/45 focus:outline-none"
        />
      </span>
      {hint ? <span className="mt-1 block font-body text-xs text-dark-gray">{hint}</span> : null}
    </label>
  )
}
