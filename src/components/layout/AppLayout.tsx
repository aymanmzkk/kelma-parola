import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BookOpen, Home, Languages, Library, MessagesSquare, TrendingUp, User, type LucideIcon } from 'lucide-react'
import SpaceSwitcher from '@/components/SpaceSwitcher'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/learn', label: 'Learn', icon: BookOpen },
  { to: '/challenges', label: 'Challenges', icon: MessagesSquare },
  { to: '/words', label: 'Vocabulary', icon: Library },
  { to: '/profile', label: 'Profile', icon: User },
]
const DESKTOP_EXTRA: NavItem[] = [{ to: '/progress', label: 'Progress', icon: TrendingUp }]

export default function AppLayout() {
  const location = useLocation()
  const { space } = useAuth()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-1 p-5 md:flex">
        <div className="mb-3 flex items-center gap-2.5 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
            <Languages size={18} />
          </span>
          <span className="text-sm font-bold tracking-tight">Kelma &amp; Parola</span>
        </div>
        <div className="mb-3 rounded-2xl border border-stone-200 bg-white p-1 dark:border-white/10 dark:bg-white/5">
          <SpaceSwitcher />
        </div>
        {[...NAV, ...DESKTOP_EXTRA].map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-brand-500/10 text-brand-700 dark:text-brand-200'
                  : 'text-stone-600 hover:bg-stone-900/5 dark:text-stone-400 dark:hover:bg-white/5',
              )
            }
          >
            <n.icon size={18} />
            {n.label}
          </NavLink>
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar: always shows which learning space is active */}
        <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#fbf6f3] px-2 pb-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] dark:border-white/10 dark:bg-[#151218] md:hidden">
          <SpaceSwitcher />
        </header>

        <main className="w-full flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-8">
          <div key={location.pathname + (space?.id ?? '')} className="mx-auto w-full max-w-xl animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-white/10 dark:bg-[#1b1820] md:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition active:scale-95',
                  isActive ? 'text-brand-600 dark:text-brand-300' : 'text-stone-400',
                )
              }
            >
              <n.icon size={20} />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
