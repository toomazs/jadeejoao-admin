import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { createContext, use } from 'react'
import type { ReactNode } from 'react'

import { ImageField } from './fields'
import { MarkdownField } from './MarkdownField'
import {
  Accordion,
  Button,
  Field,
  MoneyField,
  Toggle,
  centavosToReais,
  reaisToCentavos,
} from './ui'

/**
 * The gift list, edited where it appears: inside the Presentes section.
 *
 * It had a screen of its own, with its own preview and its own save button,
 * for a thing that is one block of the page. Here it is one accordion under
 * the section's text, and the screen's one bar saves it along with everything
 * else.
 *
 * The two kinds do not mix (AD-6). A `link` gift sends the guest to a store
 * and no money touches this system; a `pix` gift carries a goal and quotas.
 * Only the chosen kind's fields are shown, because the API answers 422 to the
 * others — better not to offer them at all. And the kind is frozen once a gift
 * exists: money may already have been counted against it.
 */

export interface Gift {
  gift_id?: string
  kind?: string
  title?: string
  description?: string
  image_url?: string
  external_url?: string
  platform?: string
  goal_centavos?: number
  quota_centavos?: number
  max_units?: number
  active?: boolean
  sort?: number
  /** Read-only, from the API — what guests have actually sent. */
  confirmed_centavos?: number
  /** Read-only: quotas minus the ones already taken. The API works it out. */
  units_left?: number
}

/** Lets the payload editor drop the list in without knowing what it is. */
export const GiftsContext = createContext<(() => ReactNode) | null>(null)

export function GiftListSlot() {
  const render = use(GiftsContext)
  return <>{render?.()}</>
}

/** A gift the panel has made up and the API has not seen yet. */
export const isNew = (gift: Gift) => !gift.gift_id || gift.gift_id.startsWith('novo:')

function summarize(gift: Gift): string {
  if (gift.kind === 'pix') {
    const goal = gift.goal_centavos ? ` · meta R$ ${centavosToReais(gift.goal_centavos)}` : ''
    const got = gift.confirmed_centavos
      ? ` · recebido R$ ${centavosToReais(gift.confirmed_centavos)}`
      : ''
    return `PIX${goal}${got}`
  }
  return `Lista${gift.platform ? ` · ${gift.platform}` : ''}`
}

export function GiftList({
  gifts,
  onChange,
}: {
  gifts: Gift[]
  onChange: (next: Gift[]) => void
}) {
  const update = (at: number, patch: Partial<Gift>) =>
    onChange(gifts.map((gift, i) => (i === at ? { ...gift, ...patch } : gift)))

  const move = (at: number, delta: number) => {
    const to = at + delta
    if (to < 0 || to >= gifts.length) return
    const next = [...gifts]
    ;[next[at], next[to]] = [next[to], next[at]]
    onChange(next)
  }

  return (
    <div className="grid gap-2">
      {gifts.map((gift, at) => (
        <Accordion
          key={gift.gift_id ?? at}
          title={gift.title || 'Presente sem nome'}
          subtitle={summarize(gift)}
          defaultOpen={isNew(gift)}
          right={
            <div className="flex items-center">
              <button
                type="button"
                aria-label="Mover para antes"
                disabled={at === 0}
                onClick={() => move(at, -1)}
                className="cursor-pointer p-1 text-dark-gray/60 transition-colors hover:text-olive disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Mover para depois"
                disabled={at === gifts.length - 1}
                onClick={() => move(at, 1)}
                className="cursor-pointer p-1 text-dark-gray/60 transition-colors hover:text-olive disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Remover ${gift.title || 'presente'}`}
                onClick={() => onChange(gifts.filter((_, i) => i !== at))}
                className="cursor-pointer p-1 text-dark-gray/60 transition-colors hover:text-terracotta"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          }
        >
          <div className="grid gap-3">
            <div className="flex gap-2">
              {(['link', 'pix'] as const).map((kind) => (
                <Button
                  key={kind}
                  tone={(gift.kind ?? 'link') === kind ? 'primary' : 'quiet'}
                  // Frozen once the gift exists: a PIX gift with money against
                  // it cannot become a link, and the API refuses it anyway.
                  disabled={!isNew(gift)}
                  onClick={() => update(at, { kind })}
                >
                  {kind === 'link' ? 'Lista de loja' : 'Meta por PIX'}
                </Button>
              ))}
            </div>

            <Field
              label="Título"
              value={gift.title ?? ''}
              onChange={(event) => update(at, { title: event.target.value })}
            />

            {/* The same field the rest of the panel uses: it takes the height
                the text needs instead of a fixed three rows with a scrollbar
                inside, and the card on the site reads the formatting. */}
            <div>
              <span className="block font-body text-sm text-dark-gray">Descrição</span>
              <MarkdownField
                value={gift.description ?? ''}
                onChange={(description) => update(at, { description })}
              />
            </div>

            <div>
              <span className="block font-body text-xs tracking-[0.1em] text-dark-gray uppercase">
                Imagem
              </span>
              <ImageField
                fieldKey="image_url"
                value={gift.image_url ?? ''}
                onChange={(image_url) => update(at, { image_url })}
              />
            </div>

            {(gift.kind ?? 'link') === 'link' ? (
              <>
                <Field
                  label="Link da lista"
                  type="url"
                  value={gift.external_url ?? ''}
                  onChange={(event) => update(at, { external_url: event.target.value })}
                  hint="Precisa começar com https://"
                />
                <Field
                  label="Loja"
                  value={gift.platform ?? ''}
                  onChange={(event) => update(at, { platform: event.target.value })}
                  hint="Camicado, Mercado Livre…"
                />
              </>
            ) : (
              <>
                <MoneyField
                  label="Meta"
                  value={centavosToReais(gift.goal_centavos)}
                  onChange={(reais) => update(at, { goal_centavos: reaisToCentavos(reais) })}
                />
                <MoneyField
                  label="Valor da cota"
                  hint="Vazio: o convidado escolhe quanto dar."
                  value={centavosToReais(gift.quota_centavos)}
                  onChange={(reais) => update(at, { quota_centavos: reaisToCentavos(reais) })}
                />
                <Field
                  label="Quantas cotas"
                  inputMode="numeric"
                  value={gift.max_units == null ? '' : String(gift.max_units)}
                  onChange={(event) => {
                    const n = Number(event.target.value.replace(/\D/g, ''))
                    update(at, { max_units: n > 0 ? n : undefined })
                  }}
                />
              </>
            )}

            {/* No "Ordem" box. It held a number whose only job was to sort a
                list that is right here — asking someone to work out that 20
                comes after 10 in order to put one card before another. The
                arrows in the header do it, and the position becomes the
                number on the way out. */}
            <Toggle
              checked={gift.active !== false}
              onChange={(on) => update(at, { active: on })}
              label="Aparece no site"
            />
          </div>
        </Accordion>
      ))}

      <div>
        <Button
          tone="quiet"
          onClick={() =>
            onChange([
              ...gifts,
              {
                // A key React can hold on to until the API gives it a real one.
                gift_id: `novo:${gifts.length}:${gifts.reduce((n, g) => n + (g.title?.length ?? 0), 0)}`,
                kind: 'link',
                title: '',
                active: true,
              },
            ])
          }
        >
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar presente
          </span>
        </Button>
      </div>
    </div>
  )
}

/**
 * One gift as the API wants it.
 *
 * Not simply the object the panel holds: it carries a made-up id and a
 * confirmed total that is the API's to report, and the two kinds each refuse
 * the other's fields outright (422). Sending only what the chosen kind uses is
 * what keeps the request from being rejected for describing a gift that could
 * not exist.
 */
export function giftBody(gift: Gift, at: number) {
  const common = {
    title: (gift.title ?? '').trim(),
    description: (gift.description ?? '').trim(),
    image_url: gift.image_url?.trim() || undefined,
    active: gift.active !== false,
    // The place in the list is the order. Nothing else decides it.
    sort: at,
  }
  if ((gift.kind ?? 'link') === 'pix') {
    return {
      ...common,
      kind: 'pix' as const,
      goal_centavos: gift.goal_centavos,
      quota_centavos: gift.quota_centavos,
      // Quotas are what max_units counts; without one there is nothing to
      // count, and the API says so.
      max_units: gift.quota_centavos ? gift.max_units : undefined,
    }
  }
  return {
    ...common,
    kind: 'link' as const,
    external_url: (gift.external_url ?? '').trim(),
    platform: gift.platform?.trim() || undefined,
  }
}
