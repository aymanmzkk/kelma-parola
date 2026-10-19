import { supabase } from '@/lib/supabase'

export interface SignUpInput {
  email: string
  password: string
  name: string
  username: string
  native_lang: string
  learning_lang: string
  other_langs: string[]
}

/** The profile row is created by a database trigger from this metadata. */
export async function signUp(input: SignUpInput): Promise<{ needsConfirmation: boolean }> {
  const { email, password, ...meta } = input
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin, data: meta },
  })
  if (error) throw error
  return { needsConfirmation: !data.session }
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
