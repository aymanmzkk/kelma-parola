import type { ReactNode } from 'react'
import { Languages } from 'lucide-react'

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-sm">
          <Languages size={26} />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">Kelma &amp; Parola</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">{subtitle}</p>
      </div>
      <div className="card animate-fade-up">{children}</div>
    </div>
  )
}
