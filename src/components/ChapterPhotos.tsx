import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { createContext, use } from 'react'

import { ImageField } from './fields'
import { Button, Field } from './ui'

/**
 * The six photos that sit under a chapter.
 *
 * They were imported once from Instagram and then edited nowhere — the name of
 * the endpoint is all that is left of that. What they are now is a small
 * gallery the couple keeps by hand, each photo linking back to the post it
 * came from.
 *
 * They live next to the person, under her Instagram handle, because that is
 * where they appear on the site. That they are two files in the bucket rather
 * than part of the section payload is the panel's problem to hide, not
 * something to make the couple think about: one bar saves the screen.
 */

export interface ChapterPhoto {
  id?: string
  caption?: string
  media_type?: string
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  timestamp?: string
}

/** Lets the payload editor drop the gallery in without knowing what it is. */
export const GalleryContext = createContext<
  ((person: 'bride' | 'groom') => React.ReactNode) | null
>(null)

/** Renders the gallery for a person, if the screen offered one. */
export function ChapterPhotosSlot({ person }: { person: 'bride' | 'groom' }) {
  const render = use(GalleryContext)
  return <>{render?.(person)}</>
}

export function ChapterPhotos({
  posts,
  onChange,
}: {
  posts: ChapterPhoto[]
  onChange: (next: ChapterPhoto[]) => void
}) {
  const update = (at: number, patch: Partial<ChapterPhoto>) =>
    onChange(posts.map((post, i) => (i === at ? { ...post, ...patch } : post)))

  const move = (at: number, delta: number) => {
    const to = at + delta
    if (to < 0 || to >= posts.length) return
    const next = [...posts]
    ;[next[at], next[to]] = [next[to], next[at]]
    onChange(next)
  }

  return (
    <div>
      <span className="block font-body text-xs tracking-[0.1em] text-dark-gray uppercase">
        Fotos do Instagram
      </span>

      <ul className="mt-1 grid gap-2">
        {posts.map((post, at) => (
          <li
            key={post.id ?? at}
            className="flex gap-2 border border-olive-line bg-veil px-2.5 py-2.5"
          >
            {/* photo_url so the cropper uses the 4/5 the chapter draws these
                in — any other shape hands back a photo the grid crops again. */}
            <ImageField
              stacked
              fieldKey="photo_url"
              value={post.media_url ?? ''}
              onChange={(media_url) => update(at, { media_url })}
            />

            {/* The caption is not edited here. It names the link for a screen
                reader and shows nowhere, so it is not worth the row: the ones
                that came from Instagram are kept as they are, and a photo
                added here falls back to a generic label on the site. */}
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <Field
                label="Link do post"
                type="url"
                value={post.permalink ?? ''}
                onChange={(event) => update(at, { permalink: event.target.value })}
                placeholder="https://www.instagram.com/p/…"
              />
            </div>

            <div className="flex shrink-0 flex-col">
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
                disabled={at === posts.length - 1}
                onClick={() => move(at, 1)}
                className="cursor-pointer p-1 text-dark-gray/60 transition-colors hover:text-olive disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Tirar a ${at + 1}ª foto`}
                onClick={() => onChange(posts.filter((_, i) => i !== at))}
                className="cursor-pointer p-1 text-dark-gray/60 transition-colors hover:text-terracotta"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-2">
        <Button
          tone="quiet"
          onClick={() => onChange([...posts, { media_type: 'IMAGE', media_url: '' }])}
        >
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar foto
          </span>
        </Button>
      </div>
    </div>
  )
}
