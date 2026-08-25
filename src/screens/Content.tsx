import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import { $api, problemDetail } from '../api/client'
import { PayloadEditor } from '../components/PayloadEditor'
import { ScreenTitle } from '../components/Shell'
import { SitePreview } from '../components/SitePreview'
import type { Draft } from '../components/SitePreview'
import { Button, Notice, Toggle } from '../components/ui'
import { SECTION_PT } from '../lib/labels-fields'

type Section = Record<string, unknown> & { slug: string; enabled?: boolean }

/**
 * Editing the words of the site, with the site alongside.
 *
 * Everything the couple can change lives in one `sections` table as a typed
 * JSONB payload per slug (AD-8), and the slug set is closed: this screen
 * updates, it never creates or deletes.
 *
 * The preview is the reason this screen is worth using. Text that is fine in a
 * form can still break a layout, and finding that out after publishing is the
 * thing the panel exists to prevent.
 */
export function Content() {
  const [slug, setSlug] = useState('hero')
  const [draft, setDraft] = useState<Section | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const queryClient = useQueryClient()

  const sections = $api.useQuery('get', '/api/v1/admin/sections')
  const save = $api.useMutation('put', '/api/v1/admin/sections/{slug}')

  const all = useMemo(() => (sections.data?.sections ?? []) as unknown as Section[], [sections.data])
  const stored = all.find((s) => s.slug === slug)

  // Reset the draft whenever the couple switches section, or when a fresh copy
  // arrives from the server after saving.
  useEffect(() => {
    if (stored) setDraft(structuredClone(stored))
    setError('')
    setSaved('')
  }, [stored])

  /**
   * What the preview renders: the whole site, with this section replaced by the
   * unsaved draft and the disabled ones dropped — which is exactly what the
   * public endpoint does server-side, so the preview matches production.
   */
  const previewDraft: Draft = useMemo(() => {
    const merged = all.map((s) => (s.slug === slug && draft ? draft : s))
    return { content: { sections: merged.filter((s) => s.enabled !== false) } }
  }, [all, slug, draft])

  const dirty = draft && stored ? JSON.stringify(draft) !== JSON.stringify(stored) : false

  const submit = () => {
    if (!draft || !dirty) return
    setError('')
    setSaved('')
    save.mutate(
      // The path decides the slug; the API ignores the one in the body.
      { params: { path: { slug: slug as never } }, body: draft as never },
      {
        onSuccess: () => {
          setSaved('Salvo. O site já está com essa versão.')
          void queryClient.invalidateQueries()
        },
        onError: (err) => setError(problemDetail(err, 'Não conseguimos salvar essa seção.')),
      },
    )
  }

  // The payload sits under a key named after the slug; `enabled` rides beside
  // it. Editing them separately keeps the switch out of the generic editor,
  // where it would read as just another field.
  const payload = (draft?.[slug] ?? null) as never

  return (
    <>
      <ScreenTitle
        title="Conteúdo"
        subtitle="Os textos e as fotos do site. O que você digitar aparece ao lado antes de salvar."
        actions={
          <>
            <Notice kind="error">{error}</Notice>
            <Notice kind="ok">{saved}</Notice>
            <Button onClick={submit} disabled={!dirty || save.isPending}>
              {save.isPending ? 'Salvando…' : dirty ? 'Salvar' : 'Sem alterações'}
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {all.map((s) => (
          <Button key={s.slug} tone={slug === s.slug ? 'primary' : 'quiet'} onClick={() => setSlug(s.slug)}>
            {SECTION_PT[s.slug] ?? s.slug}
            {s.enabled === false ? ' · oculta' : ''}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,26rem)_1fr]">
        <div className="min-w-0 border border-olive-line bg-cream px-4 py-4">
          {draft ? (
            <>
              <div className="border-b border-sand-line pb-3">
                <Toggle
                  checked={draft.enabled !== false}
                  onChange={(on) => setDraft({ ...draft, enabled: on })}
                  label="Mostrar esta seção no site"
                  hint="Desligada, ela some do site inteiro."
                />
              </div>
              <div className="mt-4">
                <PayloadEditor
                  value={payload}
                  path={slug}
                  onChange={(next) => setDraft({ ...draft, [slug]: next as never })}
                  onSave={submit}
                  saving={save.isPending}
                />
              </div>
            </>
          ) : (
            <p className="font-body text-sm text-dark-gray italic">·</p>
          )}
        </div>

        <SitePreview draft={previewDraft} focusSlug={slug} className="min-h-[36rem] xl:sticky xl:top-4 xl:h-[calc(100svh-2rem)]" />
      </div>
    </>
  )
}
