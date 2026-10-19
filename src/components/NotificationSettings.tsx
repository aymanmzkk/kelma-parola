import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui'
import { useToast } from '@/contexts/ToastContext'
import { disablePush, enablePush, getPushStatus, sendTestPush, type PushStatus } from '@/services/push'
import { errorMessage } from '@/lib/utils'

const HELP: Record<PushStatus | 'loading', string> = {
  loading: 'Checking this device…',
  unsupported:
    'This browser cannot receive notifications. On iPhone, first add the app to your Home Screen (Share → Add to Home Screen), then open it from there.',
  unconfigured: 'Push is not configured yet. Follow “Enable notifications” in the setup guide.',
  denied: 'Notifications are blocked for this app. Allow them in your phone or browser settings, then come back.',
  enabled: 'This device will be notified about new words, challenges and your streak.',
  disabled: 'Get a gentle nudge when today’s word is ready or your partner sends a challenge.',
}

export default function NotificationSettings({ userId }: { userId: string }) {
  const toast = useToast()
  const [status, setStatus] = useState<PushStatus | 'loading'>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getPushStatus()
      .then(setStatus)
      .catch(() => setStatus('unsupported'))
  }, [])

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true)
    try {
      await action()
      toast(success, 'success')
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setStatus(await getPushStatus().catch(() => 'unsupported' as PushStatus))
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="text-sm text-stone-500 dark:text-stone-400">{HELP[status]}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {status === 'disabled' && (
          <Button loading={busy} onClick={() => run(() => enablePush(userId), 'Notifications enabled')}>
            <Bell size={16} /> Enable notifications
          </Button>
        )}
        {status === 'enabled' && (
          <>
            <Button variant="secondary" loading={busy} onClick={() => run(sendTestPush, 'Test sent — check your notifications')}>
              <Bell size={16} /> Send a test
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => run(disablePush, 'Notifications turned off')}>
              <BellOff size={16} /> Turn off
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
