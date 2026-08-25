import { ImageUp, X } from 'lucide-react'
import { useRef, useState } from 'react'

import { CropModal } from './CropModal'
import { Button, DateField, TimeField } from './ui'

/**
 * The fields the generic payload editor hands off to.
 *
 * Most of a section is text, and a text box is the right control for text. A
 * date and a photograph are not text: typing `2027-08-07T15:00:00-03:00` by
 * hand is an invitation to break the countdown with a typo, and pasting a
 * bucket URL means cropping the photo somewhere else first.
 */

/** How the site frames each kind of photo, so the crop matches what it will do. */
const ASPECTS: { test: RegExp; aspect: number }[] = [
  { test: /hero_image_url/, aspect: 16 / 9 },
  { test: /photo_url/, aspect: 4 / 5 },
  { test: /logo_url/, aspect: 3 / 1 },
]

export function aspectFor(key: string): number {
  return ASPECTS.find((a) => a.test.test(key))?.aspect ?? 4 / 3
}

/**
 * A date and time, split into the two controls a person actually thinks in.
 *
 * The stored value keeps its timezone offset: the countdown on the site counts
 * to a moment, not to a wall clock, and dropping the offset would move the
 * ceremony by three hours for anyone reading from another country.
 */
export function DateTimeField({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  // `2027-08-07T15:00:00-03:00` → date, time, and the offset we must preserve.
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?(.*)$/.exec(value.trim())
  const date = match?.[1] ?? ''
  const time = match?.[2] ?? ''
  const offset = match?.[3] || '-03:00'

  const emit = (nextDate: string, nextTime: string) => {
    if (!nextDate || !nextTime) return
    onChange(`${nextDate}T${nextTime}:00${offset}`)
  }

  return (
    <div className="mt-1 flex flex-wrap items-end gap-3">
      <DateField label="Dia" value={date} onChange={(next) => emit(next, time)} className="w-56" />
      <TimeField label="Hora" value={time} onChange={(next) => emit(date, next)} className="w-36" />
      <p className="pb-2.5 font-body text-xs text-dark-gray">horário de Brasília</p>
    </div>
  )
}

/**
 * A photograph: what is there now, and a way to replace it.
 *
 * The chosen file is cropped here and carried in the draft as a data URL, so
 * it shows in the live preview immediately. It only reaches the bucket when
 * the section is saved — trying a photo out should not litter storage with
 * every one the couple considered and dropped.
 */
export function ImageField({
  fieldKey,
  value,
  onChange,
}: {
  fieldKey: string
  value: string
  onChange: (next: string) => void
}) {
  const [picked, setPicked] = useState<File | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const pending = value.startsWith('data:')

  return (
    <div className="mt-1">
      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt=""
            className="h-24 w-auto max-w-full border border-sand-line object-cover"
          />
          {pending ? (
            <span className="absolute -top-2 -right-2 border border-gold-sand bg-cream px-1.5 font-body text-xs text-olive">
              não salva
            </span>
          ) : null}
        </div>
      ) : (
        <p className="font-body text-xs text-dark-gray italic">sem foto</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) setPicked(file)
            event.target.value = ''
          }}
        />
        <Button tone="quiet" onClick={() => input.current?.click()}>
          <span className="flex items-center gap-2">
            <ImageUp className="h-4 w-4" aria-hidden="true" />
            {value ? 'Trocar foto' : 'Escolher foto'}
          </span>
        </Button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Tirar a foto"
            className="flex min-h-9 cursor-pointer items-center gap-1.5 px-2 font-body text-sm text-dark-gray transition-colors hover:text-terracotta"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            tirar
          </button>
        ) : null}
      </div>

      {picked ? (
        <CropModal
          file={picked}
          aspect={aspectFor(fieldKey)}
          onCancel={() => setPicked(null)}
          onDone={(dataUrl) => {
            onChange(dataUrl)
            setPicked(null)
          }}
        />
      ) : null}
    </div>
  )
}
