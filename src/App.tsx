import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { isConfigured } from '@/lib/supabase'
import { signOut } from '@/services/auth'
import { Button, FullScreenLoader } from '@/components/ui'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import SpaceSetup from '@/pages/SpaceSetup'
import Home from '@/pages/Home'
import Learn from '@/pages/Learn'
import Challenges from '@/pages/Challenges'
import Vocabulary from '@/pages/Vocabulary'
import Progress from '@/pages/Progress'
import ProfilePage from '@/pages/Profile'
import Admin from '@/pages/Admin'

function Notice({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="card max-w-md text-center">
        <Wrench className="mx-auto text-brand-600" size={28} />
        <h1 className="mt-3 text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{text}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  )
}

export default function App() {
  const { session, profile, spaces, loading } = useAuth()

  if (!isConfigured) {
    return (
      <Notice
        title="Almost there"
        text="Create a .env file next to package.json with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then restart “npm run dev”."
      />
    )
  }
  if (loading) return <FullScreenLoader />

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (!profile) {
    return (
      <Notice
        title="We could not load your profile"
        text="Check your connection and that all SQL migrations (including 0003) were run in Supabase, then sign in again."
        action={<Button onClick={() => void signOut()}>Sign out</Button>}
      />
    )
  }

  if (spaces.length === 0) return <SpaceSetup />

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route path="learn" element={<Learn />} />
        <Route path="challenges" element={<Challenges />} />
        <Route path="words" element={<Vocabulary />} />
        <Route path="progress" element={<Progress />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="admin" element={profile.is_admin ? <Admin /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
