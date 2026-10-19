import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '@/lib/utils'

/**
 * Runs an async loader on mount and whenever `deps` change.
 * `loading` is only true for the first load, so refreshes never blank the screen.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fnRef = useRef(fn)
  fnRef.current = fn
  const callId = useRef(0)

  const reload = useCallback(async () => {
    const id = ++callId.current
    try {
      const result = await fnRef.current()
      if (id === callId.current) {
        setData(result)
        setError(null)
      }
    } catch (e) {
      if (id === callId.current) setError(errorMessage(e))
    } finally {
      if (id === callId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, reload }
}
