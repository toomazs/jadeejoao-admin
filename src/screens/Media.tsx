import { useQueryClient } from '@tanstack/react-query'
import { Copy, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'

import { $api, problemDetail } from '../api/client'
import { ScreenTitle } from '../components/Shell'
import { Button, Card, ConfirmModal, Empty, Notice } from '../components/ui'

/**
 * The image library. Every photo the site shows lives in the bucket, and the
 * content screens reference them by URL — so this is where a new one is put
 * before it can be used anywhere else.
 */
export function Media() {
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const media = $api.useQuery('get', '/api/v1/admin/media')
  const remove = $api.useMutation('delete', '/api/v1/admin/media/{media_id}')
  const [uploading, setUploading] = useState(false)

  const items = media.data?.media ?? []

  /**
   * Uploads go through fetch rather than the generated client: this endpoint
   * is multipart, and openapi-fetch would try to JSON-encode the body.
   */
  const upload = async (file: File) => {
    setError('')
    setUploading(true)
    try {
      const { supabase } = await import('../lib/auth')
      const { data } = await supabase.auth.getSession()
      const form = new FormData()
      form.append('file', file)
      // The file name is a poor description, but it is what the couple chose
      // and it beats an empty string in a screen reader.
      form.append('alt', file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/admin/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` },
        body: form,
      })
      if (!resp.ok) {
        const problem = await resp.json().catch(() => ({}))
        setError(problemDetail(problem, 'Não conseguimos enviar a imagem.'))
        return
      }
      await queryClient.invalidateQueries()
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <>
      <ScreenTitle
        title="Mídia"
        subtitle="As imagens do site. Copie o endereço de uma para usar em alguma seção."
        actions={
          <>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void upload(file)
              }}
            />
            <Button onClick={() => fileInput.current?.click()} disabled={uploading}>
              <span className="flex items-center gap-2">
                <Upload className="h-4 w-4" aria-hidden="true" />
                {uploading ? 'Enviando…' : 'Enviar imagem'}
              </span>
            </Button>
          </>
        }
      />

      <Notice kind="error">{error}</Notice>

      <Card className="mt-2">
        {media.isPending ? (
          <Empty>·</Empty>
        ) : items.length === 0 ? (
          <Empty>Nenhuma imagem enviada ainda.</Empty>
        ) : (
          <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((m) => (
              <li key={m.media_id} className="row-in border border-olive-line bg-veil">
                <div className="aspect-4/3 overflow-hidden bg-sand-line">
                  <img
                    src={m.public_url}
                    alt={m.alt ?? ''}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 px-2 py-2">
                  <button
                    type="button"
                    title="Copiar endereço"
                    onClick={() => {
                      void navigator.clipboard.writeText(m.public_url)
                      setCopied(m.media_id)
                      setTimeout(() => setCopied(''), 1500)
                    }}
                    className="flex cursor-pointer items-center gap-1.5 font-body text-xs text-dark-gray transition-colors hover:text-olive"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    {copied === m.media_id ? 'copiado' : 'copiar link'}
                  </button>
                  <button
                    type="button"
                    title="Apagar"
                    aria-label={`Apagar imagem ${m.alt ?? ''}`}
                    onClick={() => setConfirming(m.media_id)}
                    className="cursor-pointer text-dark-gray/60 transition-colors hover:text-terracotta"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {confirming ? (
        <ConfirmModal
          title="Apagar imagem"
          message="Onde esta imagem estiver em uso, o site fica sem ela. Confira antes nas seções de conteúdo."
          onClose={() => setConfirming(null)}
          onConfirm={() =>
            remove.mutate(
              { params: { path: { media_id: confirming } } },
              {
                onSuccess: () => void queryClient.invalidateQueries(),
                onError: (err) => setError(problemDetail(err)),
              },
            )
          }
        />
      ) : null}
    </>
  )
}
