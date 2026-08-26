import { $api } from '../api/client'
import { ScreenTitle } from '../components/Shell'
import { Empty, SkeletonRows } from '../components/ui'
import { shortDate } from '../lib/labels'

/**
 * The guestbook, which is write-only for guests (AD-14): they leave a recado
 * and only the couple ever reads it.
 *
 * There is nothing to do here, and that is the design. Approving and rejecting
 * used to sit under every message — deciding what would appear somewhere no
 * message appears, asking the couple to pass judgement on things written for
 * them in order to change nothing. Five had arrived and none had ever been
 * touched.
 */
export function Messages() {
  const messages = $api.useQuery('get', '/api/v1/admin/messages')
  const all = messages.data?.messages ?? []

  return (
    <>
      <ScreenTitle
        title="Recados"
        subtitle={
          all.length === 1
            ? '1 recado que deixaram para vocês.'
            : `${all.length} recados que deixaram para vocês.`
        }
      />

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
              className="flex min-h-44 flex-col border border-olive-line bg-cream px-5 py-4"
            >
              <p className="font-display text-lg text-olive">{message.author_name}</p>
              <p className="mt-2 flex-1 font-body text-base leading-relaxed whitespace-pre-line text-ink">
                {message.body}
              </p>
              <p className="mt-3 font-body text-xs tracking-[0.1em] text-dark-gray uppercase">
                {shortDate(message.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
