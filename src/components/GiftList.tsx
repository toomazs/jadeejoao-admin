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
 * The two kinds do not mix (AD-6) and the page keeps them apart — the PIX
 * cards on top, the store lists below under "Ou escolha nas nossas listas".
 * So the panel keeps them apart too, and each is reordered within its own
 * block: moving a store list above a goal would rearrange nothing anyone can
 * see. The kind stops being a field as well. It is decided by which list the
 * gift is added to, and it never changes — money may already have been counted
 * against it, and the API refuses.
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

const isList = (gift: Gift) => (gift.kind ?? 'link') === 'link'

function summarize(gift: Gift): string {
  if (isList(gift)) return gift.platform || 'sem loja'
  const goal = gift.goal_centavos ? `meta R$ ${centavosToReais(gift.goal_centavos)}` : 'sem meta'
  const got = gift.confirmed_centavos
    ? ` · recebido R$ ${centavosToReais(gift.confirmed_centavos)}`
    : ''
  return `${goal}${got}`
}

const GROUPS = [
  {
    kind: 'pix' as const,
    title: 'Metas por PIX',
    hint: 'Os cards de cima, com a barra de quanto já veio.',
    add: 'Adicionar meta',
    holds: (gift: Gift) => !isList(gift),
  },
  {
    kind: 'link' as const,
    title: 'Listas de loja',
    hint: 'A fileira de baixo, em "Ou escolha nas nossas listas".',
    add: 'Adicionar lista',
    holds: isList,
  },
]

export function GiftList({
  gifts,
  onChange,
}: {
  gifts: Gift[]
  onChange: (next: Gift[]) => void
}) {
  const update = (at: number, patch: Partial<Gift>) =>
    onChange(gifts.map((gift, i) => (i === at ? { ...gift, ...patch } : gift)))

  const swap = (at: number, to: number) => {
    const next = [...gifts]
    ;[next[at], next[to]] = [next[to], next[at]]
    onChange(next)
  }

  return (
    <div className="grid gap-5">
      {GROUPS.map((group) => {
        // Carrying the position in the whole list, so editing and swapping
        // still address the right gift once the list has been split in two.
        const mine = gifts
          .map((gift, at) => ({ gift, at }))
          .filter(({ gift }) => group.holds(gift))

        return (
          <div key={group.kind}>
            <p className="font-body text-xs tracking-[0.1em] text-dark-gray uppercase">
              {group.title}
            </p>
            <p className="mt-0.5 font-body text-xs text-dark-gray/70">{group.hint}</p>

            <div className="mt-2 grid gap-2">
              {mine.length === 0 ? (
                <p className="font-body text-sm text-dark-gray italic">nenhum ainda</p>
              ) : null}

              {mine.map(({ gift, at }, nth) => (
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
                        disabled={nth === 0}
                        onClick={() => swap(at, mine[nth - 1].at)}
                        className="cursor-pointer p-1 text-dark-gray/60 transition-colors hover:text-olive disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Mover para depois"
                        disabled={nth === mine.length - 1}
                        onClick={() => swap(at, mine[nth + 1].at)}
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
                  <GiftFields gift={gift} at={at} update={update} />
                </Accordion>
              ))}

              <div>
                <Button
                  tone="quiet"
                  onClick={() =>
                    onChange([
                      ...gifts,
                      {
                        // A key React can hold on to until the API gives it a
                        // real one.
                        gift_id: `novo:${group.kind}:${gifts.length}`,
                        kind: group.kind,
                        title: '',
                        active: true,
                      },
                    ])
                  }
                >
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {group.add}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function GiftFields({
  gift,
  at,
  update,
}: {
  gift: Gift
  at: number
  update: (at: number, patch: Partial<Gift>) => void
}) {
  return (
    <div className="grid gap-3">
      <Field
        label="Título"
        value={gift.title ?? ''}
        onChange={(event) => update(at, { title: event.target.value })}
      />

      {/* The same field the rest of the panel uses: it takes the height the
          text needs instead of a fixed three rows with a scrollbar inside, and
          the card on the site reads the formatting. */}
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

      {isList(gift) ? (
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

      <Toggle
        checked={gift.active !== false}
        onChange={(on) => update(at, { active: on })}
        label="Aparece no site"
      />
    </div>
  )
}

/**
 * One gift as the API wants it.
 *
 * Not simply the object the panel holds: it carries a made-up id and totals
 * that are the API's to report, and the two kinds each refuse the other's
 * fields outright (422). Sending only what the chosen kind uses is what keeps
 * the request from being rejected for describing a gift that could not exist.
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
  if (isList(gift)) {
    return {
      ...common,
      kind: 'link' as const,
      external_url: (gift.external_url ?? '').trim(),
      platform: gift.platform?.trim() || undefined,
    }
  }
  return {
    ...common,
    kind: 'pix' as const,
    goal_centavos: gift.goal_centavos,
    quota_centavos: gift.quota_centavos,
    // Quotas are what max_units counts; without one there is nothing to count,
    // and the API says so.
    max_units: gift.quota_centavos ? gift.max_units : undefined,
  }
}
