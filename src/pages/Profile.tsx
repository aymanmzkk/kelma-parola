import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Camera, ChevronRight, LogOut, Moon, Shield, Sun, TrendingUp } from 'lucide-react'
import Avatar from '@/components/Avatar'
import AvatarPicker from '@/components/AvatarPicker'
import { LangBadge, LangSelect } from '@/components/Lang'
import NotificationSettings from '@/components/NotificationSettings'
import { SpaceIcon } from '@/components/SpaceSwitcher'
import { Button, Card, Chip, Field, PageHeader } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { signOut } from '@/services/auth'
import { updateProfile } from '@/services/profile'
import { disablePush } from '@/services/push'
import { leaveSpace, setMyLanguage, updateSpace } from '@/services/spaces'
import { uploadImage } from '@/services/storage'
import { errorMessage } from '@/lib/utils'

function SpaceSettings() {
  const { profile, space, me, refresh } = useAuth()
  const toast = useToast()
  const photoInput = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name: space?.name ?? '', language_a: space?.language_a ?? '', language_b: space?.language_b ?? '',
    common_lang: space?.common_lang ?? 'en', myLang: me?.lang ?? '',
  })
  const [busy, setBusy] = useState(false)
  if (!profile || !space || !me) return null

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true)
    try {
      await action()
      await refresh()
      toast(success, 'success')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    void run(async () => {
      await updateSpace(space.id, { name: form.name.trim(), language_a: form.language_a, language_b: form.language_b, common_lang: form.common_lang })
      if (form.myLang !== me.lang) await setMyLanguage(space.id, profile.id, form.myLang)
    }, 'Learning space saved')
  }
  const onPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    void run(async () => updateSpace(space.id, { photo_url: await uploadImage(profile.id, file) }), 'Photo updated')
  }
  const leave = () => {
    if (!window.confirm(`Leave “${space.name}”? You will lose access to its words and progress.`)) return
    void run(() => leaveSpace(space.id), 'You left the learning space')
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold">This learning space</h2>
      <div className="mt-4 flex items-center gap-3">
        <SpaceIcon space={space} size={52} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{space.name}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">{space.members.map((m) => m.name).join(' + ')}</p>
        </div>
        <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => photoInput.current?.click()}><Camera size={15} /> Photo</Button>
      </div>

      <ul className="mt-4 space-y-2">
        {space.members.map((m) => (
          <li key={m.user_id} className="flex items-center gap-3 rounded-xl bg-stone-900/[0.04] p-2.5 dark:bg-white/5">
            <Avatar value={m.avatar} name={m.name} size={32} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.user_id === profile.id ? `${m.name} (you)` : m.name}</span>
            <LangBadge code={m.lang} />
          </li>
        ))}
      </ul>
      {space.members.length < space.max_members && (
        <p className="mt-3 rounded-xl bg-brand-500/10 p-3 text-sm">
          Invitation code: <span className="font-mono font-bold tracking-widest">{space.invite_code}</span>
        </p>
      )}

      <form onSubmit={save} className="mt-4 space-y-3">
        <Field label="Name" required maxLength={60} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <div className="grid grid-cols-2 gap-3">
          <LangSelect label="Language A" value={form.language_a} onChange={(c) => setForm((f) => ({ ...f, language_a: c }))} />
          <LangSelect label="Language B" value={form.language_b} onChange={(c) => setForm((f) => ({ ...f, language_b: c }))} />
          <LangSelect label="My language here" value={form.myLang} onChange={(c) => setForm((f) => ({ ...f, myLang: c }))} />
          <LangSelect label="Daily word language" value={form.common_lang} onChange={(c) => setForm((f) => ({ ...f, common_lang: c }))} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" loading={busy} className="flex-1">Save space</Button>
          <Button type="button" variant="danger" disabled={busy} onClick={leave}>Leave</Button>
        </div>
      </form>
    </Card>
  )
}

export default function ProfilePage() {
  const { profile, space, languages, refresh } = useAuth()
  const { theme, toggle } = useTheme()
  const toast = useToast()
  const [form, setForm] = useState({
    name: profile?.name ?? '', username: profile?.username ?? '', avatar: profile?.avatar ?? '',
    native_lang: profile?.native_lang ?? 'en', learning_lang: profile?.learning_lang ?? 'en',
    other_langs: profile?.other_langs ?? [],
  })
  const [saving, setSaving] = useState(false)
  if (!profile) return null

  const toggleOther = (code: string) =>
    setForm((f) => ({ ...f, other_langs: f.other_langs.includes(code) ? f.other_langs.filter((c) => c !== code) : [...f.other_langs, code] }))

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile(profile.id, {
        ...form,
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        other_langs: form.other_langs.filter((c) => c !== form.native_lang && c !== form.learning_lang),
      })
      await refresh()
      toast('Profile saved', 'success')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  const logout = async () => {
    await disablePush().catch(() => undefined)
    await signOut().catch((err) => toast(errorMessage(err), 'error'))
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Profile" subtitle={`@${profile.username} · ${profile.email}`} />

      <Card>
        <h2 className="text-sm font-semibold">My profile</h2>
        <form onSubmit={save} className="mt-4 space-y-4">
          <AvatarPicker value={form.avatar} name={form.name} onChange={(avatar) => setForm((f) => ({ ...f, avatar }))} uploadAs={profile.id} />
          <Field label="Name" required maxLength={60} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Field label="Username" required minLength={2} maxLength={30} pattern="[A-Za-z0-9_]+" value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <LangSelect label="Native language" value={form.native_lang} onChange={(c) => setForm((f) => ({ ...f, native_lang: c }))} />
            <LangSelect label="Learning" value={form.learning_lang} onChange={(c) => setForm((f) => ({ ...f, learning_lang: c }))} />
          </div>
          <div>
            <span className="label">Other languages I know</span>
            <div className="flex flex-wrap gap-2">
              {languages.filter((l) => l.code !== form.native_lang && l.code !== form.learning_lang).map((l) => (
                <Chip key={l.code} active={form.other_langs.includes(l.code)} onClick={() => toggleOther(l.code)}>{l.name}</Chip>
              ))}
            </div>
          </div>
          <Button type="submit" full loading={saving}>Save profile</Button>
        </form>
      </Card>

      {/* Remounts when the active space changes so the form shows the right values. */}
      <SpaceSettings key={space?.id ?? 'none'} />

      <Card className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Appearance</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">{theme === 'dark' ? 'Dark' : 'Light'} mode</p>
        </div>
        <Button variant="secondary" onClick={toggle}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'dark' ? 'Light' : 'Dark'}
        </Button>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold">Notifications</h2>
        <NotificationSettings userId={profile.id} />
      </Card>

      <Card className="!p-2">
        <Link to="/progress" className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 transition hover:bg-stone-900/5 dark:hover:bg-white/5">
          <TrendingUp size={18} className="text-brand-600 dark:text-brand-300" />
          <span className="flex-1 text-sm font-medium">Progress and achievements</span>
          <ChevronRight size={16} className="text-stone-400" />
        </Link>
        {profile.is_admin && (
          <Link to="/admin" className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 transition hover:bg-stone-900/5 dark:hover:bg-white/5">
            <Shield size={18} className="text-brand-600 dark:text-brand-300" />
            <span className="flex-1 text-sm font-medium">Word bank (admin)</span>
            <ChevronRight size={16} className="text-stone-400" />
          </Link>
        )}
      </Card>

      <Button variant="danger" full onClick={() => void logout()}><LogOut size={16} /> Sign out</Button>
    </div>
  )
}
