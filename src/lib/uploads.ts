import { supabase } from './auth'

/**
 * Sending the photos a section is carrying to the bucket, on the way to saving.
 *
 * A photo picked and cropped in the panel lives in the draft as a data URL, so
 * the live preview can show it before anything is committed. That is the point
 * — trying a photo out should not litter storage with every one the couple
 * considered. But it also means the draft cannot be saved as-is: a base64 blob
 * inside the section payload would be a megabyte of JSON in Postgres, served
 * to every guest on every visit.
 *
 * So the last step before saving is turning those into real files.
 */

/** `data:image/jpeg;base64,...` → a File the multipart endpoint accepts. */
function dataUrlToFile(dataUrl: string, name: string): File {
  const [header, base64] = dataUrl.split(',')
  const type = /data:([^;]+)/.exec(header)?.[1] ?? 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  const extension = type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  return new File([bytes], `${name}.${extension}`, { type })
}

async function uploadOne(dataUrl: string, name: string, alt: string): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const form = new FormData()
  form.append('file', dataUrlToFile(dataUrl, name))
  // What a screen reader says in place of the photo. Nobody is going to type
  // one per upload, so it is derived from where the photo is going — poor
  // alt text still beats none, and none is what a silent default gives.
  form.append('alt', alt)

  const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/admin/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` },
    body: form,
  })
  const payload = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    throw new Error(
      typeof payload?.detail === 'string' ? payload.detail : 'Não conseguimos enviar a foto.',
    )
  }
  const url = payload?.public_url ?? payload?.media?.public_url
  if (typeof url !== 'string' || !url) {
    throw new Error('A foto subiu mas o endereço não voltou. Tente de novo.')
  }
  return url
}

/** True when this payload still holds a photo that has not reached the bucket. */
export function hasPendingImages(value: unknown): boolean {
  if (typeof value === 'string') return value.startsWith('data:')
  if (Array.isArray(value)) return value.some(hasPendingImages)
  if (value && typeof value === 'object') return Object.values(value).some(hasPendingImages)
  return false
}

/**
 * Walks the payload, uploads every data URL, and returns a copy with real
 * addresses in their place.
 *
 * Uploads run one after another rather than all at once: a section rarely
 * carries more than a couple of new photos, and a burst of parallel multipart
 * requests is the kind of thing the API's rate limiter is there to stop.
 */
export async function uploadPendingImages<T>(payload: T, slug: string): Promise<T> {
  let counter = 0

  const walk = async (value: unknown, path = ''): Promise<unknown> => {
    if (typeof value === 'string') {
      if (!value.startsWith('data:')) return value
      counter += 1
      return uploadOne(value, `${slug}-${Date.now()}-${counter}`, describe(slug, path))
    }
    if (Array.isArray(value)) {
      const out: unknown[] = []
      for (const item of value) out.push(await walk(item, path))
      return out
    }
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {}
      for (const [key, child] of Object.entries(value)) {
        out[key] = await walk(child, path ? `${path}.${key}` : key)
      }
      return out
    }
    return value
  }

  return (await walk(payload)) as T
}

/** Alt text from where the photo sits: "foto principal · Abertura". */
function describe(slug: string, path: string): string {
  const field = path.split('.').pop() ?? 'imagem'
  const words: Record<string, string> = {
    hero_image_url: 'foto principal',
    photo_url: 'retrato',
    image_url: 'imagem',
    logo_url: 'logo',
  }
  return `${words[field] ?? field} · ${slug}`
}
