import { Plus, Trash2 } from 'lucide-react'

import { DateTimeField, ImageField } from './fields'
import { Accordion, Checkbox, DateField } from './ui'
import { FIELD_HINT, FIELD_PT } from '../lib/labels-fields'

/**
 * An editor that reads the payload rather than a hand-written form per section.
 *
 * There are nine sections and their JSONB payloads differ a lot — one holds a
 * programme of eleven items, another two dress-code looks, another a list of
 * hotels. Writing nine forms means nine things to update every time the API
 * adds a field, and nine chances for the panel to quietly stop showing
 * something the couple can no longer edit.
 *
 * So the shape decides the controls: text for strings, a switch for booleans,
 * a repeatable group for arrays. What it costs is a generic look; what it buys
 * is that a new field in the API appears here without anyone doing anything.
 */

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

interface EditorProps {
  value: Json
  onChange: (next: Json) => void
  /** Dotted path, used for labels and for keying inputs. */
  path?: string
  /**
   * Saves the whole section. Offered inside each list item so a long
   * programme does not force a trip back to the top after every edit — what
   * it saves is still the section, because that is what the API stores.
   */
  onSave?: () => void
  saving?: boolean
}

/** Keys whose value is prose rather than a phrase. */
const LONG_TEXT = /body|bio|letter|notes|description|attire|parking/i
/** Keys holding a photograph the couple should be able to replace and crop. */
const IMAGE = /image_url|photo_url|logo_url/i
/** Keys holding a moment in time rather than a string that looks like one. */
const DATETIME = /datetime/i
/** Keys holding a plain calendar date. */
const DATE_ONLY = /^(date|deadline)$/i

function humanize(key: string): string {
  return FIELD_PT[key] ?? key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

function TextInput({
  keyName,
  value,
  onChange,
}: {
  keyName: string
  value: string
  onChange: (v: string) => void
}) {
  if (LONG_TEXT.test(keyName) || value.length > 90 || value.includes('\n')) {
    return (
      <textarea
        value={value}
        rows={Math.min(12, Math.max(3, value.split('\n').length + 1))}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full resize-y border border-olive-line bg-cream px-3 py-2 font-body text-sm text-ink focus:border-olive"
      />
    )
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 min-h-9 w-full border border-olive-line bg-cream px-3 font-body text-sm text-ink focus:border-olive"
    />
  )
}

export function PayloadEditor({ value, onChange, path = '', onSave, saving }: EditorProps) {
  if (value === null) {
    return <p className="font-body text-xs text-dark-gray italic">vazio</p>
  }

  if (typeof value === 'string') {
    const key = path.split('.').pop() ?? ''
    // Some strings are not text. A date typed by hand breaks the countdown
    // with one wrong digit, and a photo pasted as a URL means cropping it
    // somewhere else first.
    if (DATETIME.test(key)) {
      return <DateTimeField value={value} onChange={onChange} />
    }
    if (DATE_ONLY.test(key)) {
      return <DateField value={value} onChange={onChange} className="mt-0 w-56" />
    }
    if (IMAGE.test(key)) {
      return <ImageField fieldKey={key} value={value} onChange={onChange} />
    }
    return <TextInput keyName={key} value={value} onChange={(v) => onChange(v)} />
  }

  if (typeof value === 'number') {
    return (
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 min-h-9 w-40 border border-olive-line bg-cream px-3 font-body text-sm text-ink focus:border-olive"
      />
    )
  }

  if (typeof value === 'boolean') {
    return (
      <div className="mt-1">
        <Checkbox checked={value} onChange={onChange} label={value ? 'sim' : 'não'} />
      </div>
    )
  }

  if (Array.isArray(value)) {
    return <ArrayEditor items={value} onChange={onChange} path={path} onSave={onSave} saving={saving} />
  }

  return (
    <div className="grid gap-3">
      {Object.entries(value).map(([key, child]) => {
        const childPath = path ? `${path}.${key}` : key
        const editor = (
          <PayloadEditor
            value={child}
            path={childPath}
            onChange={(next) => onChange({ ...value, [key]: next })}
            onSave={onSave}
            saving={saving}
          />
        )

        // Anything with an inside of its own folds away: the bride's chapter is
        // a name, a bio, a portrait and a letter, and flattened it buries the
        // shape of the section under one long column.
        if (child && typeof child === 'object') {
          return (
            <Accordion key={key} title={humanize(key)} subtitle={summarize(child)}>
              {editor}
              <SaveRow onSave={onSave} saving={saving} />
            </Accordion>
          )
        }

        // A plain field labels itself. Deliberately NOT a <label> wrapping the
        // whole thing: some of these render as a group of buttons, and a label
        // around them makes clicking the caption open the first one.
        return (
          <div key={key}>
            <span className="block font-body text-xs tracking-[0.1em] text-dark-gray uppercase">
              {humanize(key)}
            </span>
            {/* Some field names promise more than they deliver — the hint says
                where the value actually lands, so nobody edits it twice
                wondering why the site did not move. */}
            {FIELD_HINT[key] ? (
              <span className="mt-0.5 block font-body text-xs text-dark-gray italic">
                {FIELD_HINT[key]}
              </span>
            ) : null}
            {editor}
          </div>
        )
      })}
    </div>
  )
}

/** A one-line hint of what is folded away, so a closed row still says something. */
function summarize(value: Json): string {
  if (Array.isArray(value)) {
    return value.length === 1 ? '1 item' : `${value.length} itens`
  }
  if (value && typeof value === 'object') {
    for (const key of ['name', 'title', 'label']) {
      const v = value[key]
      if (typeof v === 'string' && v) return v
    }
    const filled = Object.values(value).filter(
      (v) => v !== '' && v !== null && v !== undefined,
    ).length
    return filled === 1 ? '1 campo' : `${filled} campos`
  }
  return ''
}

/**
 * A list the couple can grow and shrink — the programme, the hotels, the
 * gift cards. New entries are cloned from the first one so the shape stays
 * whatever the API expects, instead of an empty object the server rejects.
 */
function ArrayEditor({
  items,
  onChange,
  path,
  onSave,
  saving,
}: {
  items: Json[]
  onChange: (next: Json) => void
  path: string
  onSave?: () => void
  saving?: boolean
}) {
  const blankLike = (sample: Json | undefined): Json => {
    if (sample === undefined) return ''
    if (Array.isArray(sample)) return []
    if (sample && typeof sample === 'object') {
      return Object.fromEntries(
        Object.entries(sample).map(([k, v]) => [
          k,
          typeof v === 'string' ? '' : typeof v === 'number' ? 0 : typeof v === 'boolean' ? false : v,
        ]),
      )
    }
    return typeof sample === 'number' ? 0 : typeof sample === 'boolean' ? false : ''
  }

  const title = (item: Json, index: number): string => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      for (const key of ['title', 'label', 'name', 'time', 'date']) {
        const v = item[key]
        if (typeof v === 'string' && v) return v
      }
    }
    return `Item ${index + 1}`
  }

  return (
    <div className="mt-1 grid gap-2">
      {items.map((item, index) => (
        <Accordion
          key={index}
          title={title(item, index)}
          right={
            <button
              type="button"
              aria-label={`Remover ${title(item, index)}`}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className="cursor-pointer p-1 text-dark-gray/60 transition-colors hover:text-terracotta"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          }
          defaultOpen={items.length === 1}
        >
          <PayloadEditor
            value={item}
            path={path}
            onChange={(next) => onChange(items.map((old, i) => (i === index ? next : old)))}
          />
          <SaveRow onSave={onSave} saving={saving} />
        </Accordion>
      ))}

      <button
        type="button"
        onClick={() => onChange([...items, blankLike(items[0])])}
        className="flex min-h-10 cursor-pointer items-center justify-center gap-2 border border-dashed border-olive-line font-body text-sm text-dark-gray transition-colors hover:border-olive hover:text-olive"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Adicionar
      </button>
    </div>
  )
}

/**
 * The save button, repeated at the foot of every folded group.
 *
 * It saves the whole section, because that is what the API stores — but a
 * section can be a long column, and making the couple scroll back to the top
 * after editing one hotel is the kind of small friction that adds up.
 */
export function SaveRow({ onSave, saving }: { onSave?: () => void; saving?: boolean }) {
  if (!onSave) return null
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={saving}
      className="mt-3 min-h-10 cursor-pointer border border-olive bg-olive px-4 font-body text-sm text-cream transition-colors hover:bg-deep-olive disabled:cursor-not-allowed disabled:opacity-40"
    >
      {saving ? 'Salvando…' : 'Salvar'}
    </button>
  )
}
