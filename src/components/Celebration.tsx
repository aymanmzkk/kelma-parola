import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Flame } from 'lucide-react'

export interface CelebrationData {
  title: string
  subtitle?: string
}

/** A short success moment, e.g. when the streak continues. */
export default function Celebration({ data, onDone }: { data: CelebrationData | null; onDone: () => void }) {
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    if (!data) return
    const timer = window.setTimeout(() => done.current(), 2800)
    return () => window.clearTimeout(timer)
  }, [data])

  if (!data) return null
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/40 p-6" onClick={onDone} role="dialog" aria-live="polite">
      <div className="animate-pop rounded-3xl bg-white px-8 py-8 text-center shadow-2xl dark:bg-stone-900">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-500/15 text-amber-500">
          <Flame size={28} />
        </span>
        <h2 className="mt-4 text-xl font-bold">{data.title}</h2>
        {data.subtitle && <p className="mt-1 max-w-xs text-sm text-stone-500 dark:text-stone-400">{data.subtitle}</p>}
      </div>
    </div>,
    document.body,
  )
}
