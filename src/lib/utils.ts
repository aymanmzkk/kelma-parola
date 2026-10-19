export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function errorMessage(e: unknown): string {
  let msg = 'Something went wrong. Please try again.'
  if (typeof e === 'string') msg = e
  else if (e && typeof e === 'object' && 'message' in e) msg = String((e as { message: unknown }).message)

  if (msg.includes('profiles_username_key')) return 'That username is already taken.'
  if (msg.includes('daily_words_word_key')) return 'That word is already in the word bank.'
  if (msg.includes('violates foreign key constraint')) return 'This word was already used in a daily challenge, so it cannot be deleted.'
  if (msg.includes('Failed to fetch')) return 'No connection. Check your internet and try again.'
  return msg
}

/** Accepts a full timestamp or a plain date (YYYY-MM-DD). */
export function formatDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 604800) return `${Math.floor(s / 86400)} d ago`
  return formatDate(iso)
}

/** 'YYYY-MM' -> 'Oct' */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short' })
}

export function isImageUrl(v: string | null | undefined): v is string {
  return !!v && /^https?:\/\//.test(v)
}

/** Center-crops to a square and shrinks, so uploads stay small. */
export async function resizeImage(file: File, size = 512): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Could not read that image.'))
      el.src = url
    })
    const side = Math.min(img.width, img.height)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not process that image.')
    ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process that image.'))), 'image/jpeg', 0.85),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
