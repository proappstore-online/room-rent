import { useProNotifications } from '@proappstore/sdk/hooks'
import { app } from '../lib/app'

export function NotificationBell() {
  const { permission, isSubscribed, subscribe, unsubscribe, loading } = useProNotifications(app)

  if (permission === 'denied') return null

  return (
    <button
      onClick={() => (isSubscribed ? unsubscribe() : subscribe())}
      disabled={loading}
      className="relative flex items-center justify-center rounded-full p-1.5"
      style={{ color: isSubscribed ? 'var(--accent)' : 'var(--muted)' }}
      aria-label={isSubscribed ? 'Disable notifications' : 'Enable notifications'}
    >
      {isSubscribed ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C10.9 2 10 2.9 10 4V4.29C7.12 5.14 5 7.82 5 11V17L3 19V20H21V19L19 17V11C19 7.82 16.88 5.14 14 4.29V4C14 2.9 13.1 2 12 2ZM10 21C10 22.1 10.9 23 12 23S14 22.1 14 21H10Z" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )}
      {!isSubscribed && !loading && (
        <span
          className="absolute top-1 right-1 h-2 w-2 rounded-full"
          style={{ background: 'var(--accent)' }}
        />
      )}
    </button>
  )
}
