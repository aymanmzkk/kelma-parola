import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { fallbackLanguage } from '@/lib/languages'
import { listLanguages } from '@/services/languages'
import { getProfile } from '@/services/profile'
import { getMySpaces, setActiveSpace } from '@/services/spaces'
import type { Language, Profile, Space, SpaceMember } from '@/types'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  /** Increases whenever shared data changed (realtime event, app resumed, space switched). */
  version: number
  languages: Language[]
  lang: (code: string | null | undefined) => Language
  spaces: Space[]
  /** The learning space currently selected. Everything on screen belongs to it. */
  space: Space | null
  me: SpaceMember | null
  partner: SpaceMember | null
  switchSpace: (spaceId: string) => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [checked, setChecked] = useState(false)
  const [languages, setLanguages] = useState<Language[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const userId = session?.user.id ?? null

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecked(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setChecked(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Languages are public configuration: needed on the sign-up screen too.
  useEffect(() => {
    listLanguages().then(setLanguages).catch((e) => console.error('Could not load languages', e))
  }, [])

  const refresh = useCallback(async () => {
    if (!userId) return
    try {
      const [p, s] = await Promise.all([getProfile(userId), getMySpaces()])
      setProfile(p)
      setSpaces(s)
    } catch (e) {
      console.error('Could not load your account', e)
    } finally {
      setLoadedFor(userId)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setSpaces([])
      setLoadedFor(null)
      setActiveId(null)
      return
    }
    void refresh()
  }, [userId, refresh])

  const space =
    spaces.find((s) => s.id === activeId) ??
    spaces.find((s) => s.id === profile?.active_space_id) ??
    spaces[0] ??
    null
  const me = space?.members.find((m) => m.user_id === userId) ?? null
  const partner = space?.members.find((m) => m.user_id !== userId) ?? null
  const spaceId = space?.id ?? null

  // Live updates for the active space.
  useEffect(() => {
    if (!spaceId) return
    const bump = () => {
      setVersion((v) => v + 1)
      void refresh()
    }
    const channel = supabase
      .channel(`space:${spaceId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity', filter: `space_id=eq.${spaceId}` }, bump)
      .subscribe()
    const onVisible = () => {
      if (document.visibilityState === 'visible') bump()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [spaceId, refresh])

  const switchSpace = useCallback(async (id: string) => {
    setActiveId(id)
    setVersion((v) => v + 1)
    await setActiveSpace(id).catch((e) => console.warn('Could not remember the active space', e))
  }, [])

  const lang = useCallback(
    (code: string | null | undefined) => languages.find((l) => l.code === code) ?? fallbackLanguage(code ?? 'en'),
    [languages],
  )

  const value: AuthState = {
    session, profile, version, languages, lang, spaces, space, me, partner, switchSpace, refresh,
    loading: !checked || (userId !== null && loadedFor !== userId),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
