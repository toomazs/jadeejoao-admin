import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { $api } from '../api/client'
import { ScreenTitle } from '../components/Shell'
import { ConfirmModal, Empty, Markdown, Notice, SkeletonRows } from '../components/ui'
import { shortDate } from '../lib/labels'

/**
 * The guestbook, which now appears on the site as it is written (AD-14).
 *
 * Which is what puts the one control here. Approving used to sit under every
 * message and decided nothing, because no message appeared anywhere; five had
 * arrived and none had ever been touched. Deleting is the opposite: it is the
 * only thing standing between what a stranger types and what the couple's
 * families read, so it is one click away and it asks first.
 *
 * Every message is listed, including the ones past the wall's own cap — the
 * site shows the most recent sixty, and the couple keeps all of them.
 */
export function Messages() {
  const messages = $api.useQuery('get', '/api/v1/admin/messages')
  const all = messages.data?.messages ?? []
  const [doomed, setDoomed] = useState<{ id: string; author: string } | null>(null)
  const [error, setError] = useState('')

  const remove = $api.useMutation('delete', '/api/v1/admin/messages/{message_id}', {
    onSuccess: () => {
      setError('')
      void messages.refetch()
    },
    // A message the couple meant to take down and that is still there is worth
    // saying out loud: silence would read as "done".
    onError: () => setError('Não conseguimos apagar o recado. Tente de novo.'),
  })

  return (
    <>
      <ScreenTitle
        title="Recados"
        subtitle={
          all.length === 1
            ? '1 recado, no site e aqui.'
            : `${all.length} recados, no site e aqui.`
        }
      />

      {error ? (
        <div className="mb-4">
          <Notice kind="error">{error}</Notice>
        </div>
      ) : null}

      {messages.isPending ? (
        <SkeletonRows rows={3} />
      ) : all.length === 0 ? (
        <Empty>Ninguém escreveu ainda.</Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {all.map((message) => (
            <li
              key={message.message_id}
              // Cards of a height, so a short recado does not read as less of
              // one than a long one.
              className="group flex min-h-44 flex-col border border-olive-line bg-cream px-5 py-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-lg text-olive">{message.author_name}</p>
                <button
                  type="button"
                  aria-label={`Apagar o recado de ${message.author_name}`}
                  title="Apagar"
                  disabled={remove.isPending}
                  onClick={() =>
                    setDoomed({ id: message.message_id, author: message.author_name })
                  }
                  className="-mt-1 -mr-1 shrink-0 cursor-pointer p-2 text-dark-gray/50 transition-colors hover:text-terracotta disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {/* Read, not shown raw. The guest writes the same asterisks the
                  site renders, so a recado that reads "Vai ser **lindo**" on
                  the wall must not read "**lindo**" here. */}
              <Markdown
                text={message.body}
                className="mt-2 flex-1 font-body text-base leading-relaxed text-ink"
              />
              <p className="mt-3 font-body text-xs tracking-[0.1em] text-dark-gray uppercase">
                {shortDate(message.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {doomed ? (
        <ConfirmModal
          title="Apagar este recado?"
          message={`O recado de ${doomed.author} sai do site e daqui, e não dá para trazer de volta.`}
          onConfirm={() => remove.mutate({ params: { path: { message_id: doomed.id } } })}
          onClose={() => setDoomed(null)}
        />
      ) : null}
    </>
  )
}
