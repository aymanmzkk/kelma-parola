import { useRef, useState, type ChangeEvent } from 'react'
import { Camera } from 'lucide-react'
import Avatar from '@/components/Avatar'
import { Button } from '@/components/ui'
import { useToast } from '@/contexts/ToastContext'
import { uploadImage } from '@/services/storage'
import { errorMessage } from '@/lib/utils'

interface AvatarPickerProps {
  value: string
  name: string
  onChange: (value: string) => void
  uploadAs: string
}

export default function AvatarPicker({ value, name, onChange, uploadAs }: AvatarPickerProps) {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      onChange(await uploadImage(uploadAs, file))
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar value={value} name={name} size={64} />
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" loading={busy} onClick={() => input.current?.click()}>
          <Camera size={15} /> Upload photo
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
            Use initials
          </Button>
        )}
      </div>
    </div>
  )
}
