import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { $api, problemDetail } from '../api/client'
import { ScreenTitle } from '../components/Shell'
import { SitePreview } from '../components/SitePreview'
import type { Draft } from '../components/SitePreview'
import { Button, Empty, Field, Notice, Panel } from '../components/ui'
import { money } from '../lib/labels'

type Kind = 'link' | 'pix'

interface GiftForm {
  gift_id?: string
  kind: Kind
  title: string
  description: string
  image_url: string
  external_url: string
  platform: string
  goal_centavos: string
  quota_centavos: string
  max_units: string
  active: boolean
  sort: string
}

const BLANK: GiftForm = {
  kind: 'link',
  title: '',
  description: '',
  image_url: '',
  external_url: '',
  platform: '',
  goal_centavos: '',
  quota_centavos: '',
  max_units: '',
  active: true,
  sort: '0',
}

const num = (v: string): number | undefined => {
  const n = Number(v)
  return v.trim() === '' || Number.isNaN(n) ? undefined : n
}

/**
 * The gift list: outbound cards to a store, and PIX goals.
 *
 * The two kinds do not mix (AD-6). A `link` gift sends the guest to Camicado or
 * Mercado Livre and no money touches this system; a `pix` gift carries a goal
 * and quotas. The form shows only the fields the chosen kind actually uses,
 * because the API answers 422 to the other ones — better to not offer them.
 */
export function Gifts() {
  const [form, setForm] = useState<GiftForm | null>(null)
  const [error, setError] = useState('')
  const queryClient = useQueryClient()

  const gifts = $api.useQuery('get', '/api/v1/admin/gifts')
  const create = $api.useMutation('post', '/api/v1/admin/gifts')
  const update = $api.useMutation('put', '/api/v1/admin/gifts/{gift_id}')
  const remove = $api.useMutation('delete', '/api/v1/admin/gifts/{gift_id}')

  const all = gifts.data?.gifts ?? []
  const previewDraft: Draft = useMemo(() => ({ gifts: { gifts: all } }), [all])

  const done = () => {
    setForm(null)
    void queryClient.invalidateQueries()
  }
  const fail = (err: unknown) => setError(problemDetail(err, 'Não conseguimos salvar esse presente.'))

  const submit = () => {
    if (!form || !form.title.trim()) return
    setError('')
    const common = {
      title: form.title.trim(),
      description: form.description.trim(),
      image_url: form.image_url.trim() || undefined,
      active: form.active,
      sort: num(form.sort) ?? 0,
    }
    const body =
      form.kind === 'link'
        ? {
            ...common,
            kind: 'link' as const,
            external_url: form.external_url.trim(),
            platform: form.platform.trim() || undefined,
          }
        : {
            ...common,
            kind: 'pix' as const,
            goal_centavos: num(form.goal_centavos),
            quota_centavos: num(form.quota_centavos),
            max_units: num(form.max_units),
          }

    if (form.gift_id) {
      update.mutate(
        { params: { path: { gift_id: form.gift_id } }, body: body as never },
        { onSuccess: done, onError: fail },
      )
    } else {
      create.mutate({ body: body as never }, { onSuccess: done, onError: fail })
    }
  }

  const edit = (g: (typeof all)[number]) =>
    setForm({
      gift_id: g.gift_id,
      kind: (g.kind as Kind) ?? 'link',
      title: g.title ?? '',
      description: g.description ?? '',
      image_url: g.image_url ?? '',
      external_url: g.external_url ?? '',
      platform: g.platform ?? '',
      goal_centavos: g.goal_centavos != null ? String(g.goal_centavos) : '',
      quota_centavos: g.quota_centavos != null ? String(g.quota_centavos) : '',
      max_units: g.max_units != null ? String(g.max_units) : '',
      active: g.active !== false,
      sort: String(g.sort ?? 0),
    })

  return (
    <>
      <ScreenTitle
        title="Presentes"
        subtitle="Cards que levam a uma loja, e metas por PIX."
        actions={
          <>
            <Notice kind="error">{error}</Notice>
            <Button onClick={() => setForm({ ...BLANK })}>Novo presente</Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,30rem)_1fr]">
        <div className="min-w-0">
          {form ? (
            <Panel title={form.gift_id ? 'Editando' : 'Novo presente'} className="mb-4">
              <div className="grid gap-3 px-4 py-4">
                {/* Kind is chosen once and shapes everything below it. The API
                    freezes it after the first contribution, so an existing PIX
                    gift with money against it cannot be turned into a link. */}
                <div className="flex gap-2">
                  {(['link', 'pix'] as const).map((k) => (
                    <Button
                      key={k}
                      tone={form.kind === k ? 'primary' : 'quiet'}
                      disabled={Boolean(form.gift_id)}
                      onClick={() => setForm({ ...form, kind: k })}
                    >
                      {k === 'link' ? 'Lista de loja' : 'Meta por PIX'}
                    </Button>
                  ))}
                </div>

                <Field
                  label="Título"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <label className="block">
                  <span className="font-body text-sm text-dark-gray">Descrição</span>
                  <textarea
                    value={form.description}
                    rows={3}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="mt-1 w-full resize-y border border-olive-line bg-cream px-3 py-2 font-body text-sm text-ink focus:border-olive"
                  />
                </label>
                <Field
                  label="Imagem (endereço)"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  hint="Copie de Mídia."
                />

                {form.kind === 'link' ? (
                  <>
                    <Field
                      label="Link da lista"
                      value={form.external_url}
                      onChange={(e) => setForm({ ...form, external_url: e.target.value })}
                      hint="Precisa começar com https://"
                    />
                    <Field
                      label="Loja"
                      value={form.platform}
                      onChange={(e) => setForm({ ...form, platform: e.target.value })}
                      hint="Camicado, Mercado Livre…"
                    />
                  </>
                ) : (
                  <>
                    <Field
                      label="Meta (centavos)"
                      value={form.goal_centavos}
                      onChange={(e) => setForm({ ...form, goal_centavos: e.target.value })}
                      hint="60000 = R$ 600,00"
                    />
                    <Field
                      label="Valor da cota (centavos)"
                      value={form.quota_centavos}
                      onChange={(e) => setForm({ ...form, quota_centavos: e.target.value })}
                      hint="Vazio = o convidado escolhe o valor."
                    />
                    <Field
                      label="Quantas cotas"
                      value={form.max_units}
                      onChange={(e) => setForm({ ...form, max_units: e.target.value })}
                    />
                  </>
                )}

                <div className="flex flex-wrap items-end gap-4">
                  <Field
                    label="Ordem"
                    value={form.sort}
                    onChange={(e) => setForm({ ...form, sort: e.target.value })}
                    className="w-28"
                  />
                  <label className="flex min-h-10 cursor-pointer items-center gap-2 font-body text-sm text-dark-gray">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="h-4 w-4 accent-olive"
                    />
                    Aparece no site
                  </label>
                </div>

                <div className="mt-1 flex gap-2">
                  <Button onClick={submit} disabled={create.isPending || update.isPending}>
                    {create.isPending || update.isPending ? 'Salvando…' : 'Salvar'}
                  </Button>
                  <Button tone="quiet" onClick={() => setForm(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </Panel>
          ) : null}

          <Panel title={`${all.length} presentes`}>
            {gifts.isPending ? (
              <Empty>·</Empty>
            ) : all.length === 0 ? (
              <Empty>Nenhum presente cadastrado.</Empty>
            ) : (
              <ul className="divide-y divide-sand-line">
                {all.map((g) => (
                  <li key={g.gift_id} className="row-in flex items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => edit(g)}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                    >
                      <p className="truncate font-body text-sm text-ink">
                        {g.title}
                        {g.active === false ? (
                          <span className="ml-2 font-body text-xs text-dark-gray">· oculto</span>
                        ) : null}
                      </p>
                      <p className="font-body text-xs text-dark-gray">
                        {g.kind === 'pix'
                          ? `PIX${g.goal_centavos ? ` · meta ${money(g.goal_centavos)}` : ''}${
                              g.confirmed_centavos ? ` · recebido ${money(g.confirmed_centavos)}` : ''
                            }`
                          : `Lista${g.platform ? ` · ${g.platform}` : ''}`}
                      </p>
                    </button>
                    <button
                      type="button"
                      aria-label={`Remover ${g.title}`}
                      onClick={() => {
                        if (!window.confirm(`Remover "${g.title}" do site?`)) return
                        remove.mutate(
                          { params: { path: { gift_id: g.gift_id } } },
                          { onSuccess: done, onError: fail },
                        )
                      }}
                      className="shrink-0 cursor-pointer text-dark-gray/60 transition-colors hover:text-terracotta"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <SitePreview
          draft={previewDraft}
          focusSlug="gifts_intro"
          className="min-h-[36rem] xl:sticky xl:top-4 xl:h-[calc(100svh-2rem)]"
        />
      </div>
    </>
  )
}
