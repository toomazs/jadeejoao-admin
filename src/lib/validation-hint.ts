import { FIELD_PT, SECTION_PT } from './labels-fields'

/**
 * Turns Huma's machine-readable error locations into the field the couple is
 * looking at.
 *
 * A schema refusal arrives as `{"detail":"validation failed","errors":[
 * {"location":"body.big_day.programme[3].icon"}]}`. The panel only ever showed
 * the detail — in English, naming nothing — so "os dados estão inválidos" was
 * the entire diagnosis. The couple spent days unable to save a schedule
 * because one icon out of four was not in the contract, with no way to tell
 * which of the thirty fields on screen was at fault.
 *
 * Positions are counted from one, because item 0 is not a thing anyone sees.
 */
export function fieldsAtFault(error: unknown): string[] {
  if (!error || typeof error !== 'object' || !('errors' in error)) return []
  const list = (error as { errors?: unknown }).errors
  if (!Array.isArray(list)) return []

  const named: string[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object' || !('location' in item)) continue
    const location = (item as { location?: unknown }).location
    if (typeof location !== 'string') continue
    const pretty = humanize(location)
    if (pretty && !named.includes(pretty)) named.push(pretty)
  }
  return named
}

/** `body.big_day.programme[3].icon` → `Programação, item 4 → Ícone`. */
function humanize(location: string): string {
  const parts: string[] = []
  for (const raw of location.split('.')) {
    // The envelope the panel never sees: the request body and the payload
    // wrapper named after the slug.
    if (raw === 'body' || raw === '') continue
    const match = /^([^[]+)((?:\[\d+\])*)$/.exec(raw)
    if (!match) continue
    const [, key, indexes] = match
    // The payload wrapper is named after the slug — `big_day`, `hero` — and
    // it is the screen the couple is already looking at. Naming it again only
    // pushes the field that actually failed further down the sentence.
    if (parts.length === 0 && !indexes && key in SECTION_PT) continue
    let piece = FIELD_PT[key] ?? key
    for (const [, n] of indexes.matchAll(/\[(\d+)\]/g)) {
      piece += `, item ${Number(n) + 1}`
    }
    parts.push(piece)
  }
  return parts.join(' → ')
}

/** The sentence appended to a save failure, or '' when nothing is named. */
export function validationHint(error: unknown): string {
  const fields = fieldsAtFault(error)
  if (fields.length === 0) return ''
  return ` Confira: ${fields.join('; ')}.`
}
