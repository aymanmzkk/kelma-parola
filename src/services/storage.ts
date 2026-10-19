import { supabase } from '@/lib/supabase'
import { resizeImage } from '@/lib/utils'

/**
 * Uploads a square JPEG into the user's own folder of the public "avatars" bucket.
 * Future feature hook: vocabulary photos can reuse this with another bucket.
 */
export async function uploadImage(userId: string, file: File): Promise<string> {
  const blob = await resizeImage(file, 512)
  const path = `${userId}/${Date.now()}.jpg`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (error) throw error
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}
