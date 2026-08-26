import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { $api, problemDetail } from '../api/client'
import { ImageField } from '../components/fields'
import { ScreenTitle } from '../components/Shell'
import { Button, Field, Notice, SaveBar, shakeSaveBar, SkeletonRows, Tabs } from '../components/ui'
import { hasPendingImages, uploadPendingImages } from '../lib/uploads'

/**
 * The six photos under each chapter.
 *
 * They were imported once by a script and then edited nowhere: changing one
 * meant re-running the import or writing JSON into the bucket by hand. They
 * are not an Instagram feed — nothing here talks to Instagram — they are a
 * small gallery the couple keeps, each photo linking back to the post it came
 * from.
 *
 * Its own screen rather than a corner of Conteúdo: the galleries are not part
 * of any section payload, they are two files in the bucket, and the section
 * editor is built to edit sections.
 */

interface Post {
  id?: string
  caption?: string
  media_type?: string
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  timestamp?: string
}

const PESSOAS = [
  { value: 'bride', label: 'Jade' },
  { value: 'groom', label: 'João' },
] as const

type Person = (typeof PESSOAS)[number]['value']

export function Instagram() {
  const [person, setPerson] = useState<Person>('bride')
  const [draft, setDraft] = useState<Post[] | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [uploading, setUploading] = useState(false)
  const queryClient = useQueryClient()

  const feed = $api.useQuery('get', '/api/v1/admin/instagram/{person}', {
    params: { path: { person } },
  })
  const save = $api.useMutation('put', '/api/v1/admin/instagram/{person}')

  const stored = useMemo(() => (feed.data?.posts ?? []) as Post[], [feed.data])

  useEffect(() => {
    setDraft(structuredClone(stored))
    setError('')
    setSaved('')
  }, [stored])

  const dirty = draft ? JSON.stringify(draft) !== JSON.stringify(stored) : false

  const submit = async () => {
    if (!draft || !dirty || uploading) return
    setError('')
    setSaved('')

    // A photo chosen here rides in the draft as a data URL so it can be seen
    // before it exists anywhere. It becomes a file in the bucket on the way
    // out — the manifest holds URLs, not megabytes of base64.
    let posts = draft
    if (hasPendingImages(draft)) {
      setUploading(true)
      try {
        posts = await uploadPendingImages(draft, `instagram-${person}`)
        setDraft(posts)
      } catch (err) {
        setUploading(false)
        setError(err instanceof Error ? err.message : 'Não conseguimos enviar a foto.')
        return
      }
      setUploading(false)
    }

    save.mutate(
      { params: { path: { person } }, body: { posts: posts as never } },
      {
        onSuccess: () => {
          setSaved('Salvo. O site já está com essas fotos.')
          void queryClient.invalidateQueries()
        },
        onError: (err) => setError(problemDetail(err, 'Não conseguimos salvar as fotos.')),
      },
    )
  }

  const update = (at: number, patch: Partial<Post>) =>
    setDraft((posts) => posts?.map((post, i) => (i === at ? { ...post, ...patch } : post)) ?? null)

  const move = (at: number, delta: number) =>
    setDraft((posts) => {
      if (!posts) return posts
      const to = at + delta
      if (to < 0 || to >= posts.length) return posts
      const next = [...posts]
      ;[next[at], next[to]] = [next[to], next[at]]
      return next
    })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <ScreenTitle
          title="Fotos dos capítulos"
          subtitle="As fotos que aparecem embaixo da Jade e do João, e para onde cada uma leva."
          actions={
            <>
              <Notice kind="error">{error}</Notice>
              <Notice kind="ok">{saved}</Notice>
            </>
          }
        />
      </div>

      <Tabs
        className="mb-3 shrink-0"
        tabs={PESSOAS.map((p) => ({ value: p.value, label: p.label }))}
        value={person}
        onChange={(next) => {
          if (next === person) return false
          if (dirty && shakeSaveBar()) return false
          setPerson(next as Person)
        }}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {feed.isPending ? (
          <SkeletonRows rows={3} />
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(draft ?? []).map((post, at) => (
                <li
                  key={post.id ?? at}
                  className="flex flex-col gap-2 border border-olive-line bg-cream px-3 py-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-body text-xs tracking-[0.1em] text-dark-gray uppercase">
                      {at + 1}ª
                    </span>
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
                        disabled={at === (draft?.length ?? 0) - 1}
                        onClick={() => move(at, 1)}
                        className="cursor-pointer p-1 text-dark-gray/60 transition-colors hover:text-olive disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Tirar a ${at + 1}ª foto`}
                        onClick={() => setDraft((posts) => posts?.filter((_, i) => i !== at) ?? null)}
                        className="cursor-pointer p-1 text-dark-gray/60 transition-colors hover:text-terracotta"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* photo_url, so the cropper uses the 4/5 the chapter draws
                      these in — cropping to anything else would hand back a
                      photo the grid then crops again. */}
                  <ImageField
                    fieldKey="photo_url"
                    value={post.media_url ?? ''}
                    onChange={(media_url) => update(at, { media_url })}
                  />

                  <Field
                    label="Link do post"
                    type="url"
                    value={post.permalink ?? ''}
                    onChange={(event) => update(at, { permalink: event.target.value })}
                    placeholder="https://www.instagram.com/p/…"
                  />

                  <Field
                    label="Descrição"
                    hint="Não aparece na tela — é o que um leitor de tela anuncia."
                    value={post.caption ?? ''}
                    onChange={(event) => update(at, { caption: event.target.value })}
                  />
                </li>
              ))}
            </ul>

            <div className="mt-3">
              <Button
                tone="quiet"
                onClick={() =>
                  setDraft((posts) => [...(posts ?? []), { media_type: 'IMAGE', media_url: '' }])
                }
              >
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Adicionar foto
                </span>
              </Button>
            </div>
          </>
        )}
      </div>

      <SaveBar
        visible={dirty}
        saving={save.isPending || uploading}
        label={uploading ? 'Enviando a foto…' : undefined}
        onSave={() => void submit()}
        onReset={() => setDraft(structuredClone(stored))}
      />
    </div>
  )
}
