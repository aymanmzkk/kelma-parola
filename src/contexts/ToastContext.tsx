import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ToastKind = 'info' | 'success' | 'error'
interface Toast {
  id: number
  message: string
  kind: ToastKind
}
type ToastFn = (message: string, kind?: ToastKind) => void

const ToastContext = createContext<ToastFn>(() => undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback<ToastFn>((message, kind = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((list) => [...list, { id, message, kind }])
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3800)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'animate-fade-up rounded-2xl px-4 py-2.5 text-sm font-medium shadow-lg',
              t.kind === 'error' && 'bg-red-600 text-white',
              t.kind === 'success' && 'bg-emerald-600 text-white',
              t.kind === 'info' && 'bg-stone-900 text-white dark:bg-white dark:text-stone-900',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastFn {
  return useContext(ToastContext)
}
