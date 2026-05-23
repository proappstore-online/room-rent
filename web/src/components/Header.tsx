import type { User } from '@proappstore/sdk'

export function Header({
  user,
  onSignIn,
  onSignOut,
  onNavigate,
}: {
  user: User | null
  onSignIn: () => void
  onSignOut: () => void
  onNavigate: (hash: string) => void
}) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl" style={{ background: 'var(--glass-strong)', borderBottom: '1px solid var(--line)' }}>
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <button onClick={() => onNavigate('#/')} className="flex items-center gap-2">
          <span className="display-font text-xl font-semibold" style={{ color: 'var(--accent)' }}>Room Rent</span>
        </button>

        <nav className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('#/')}
            className="rounded-lg px-3 py-1.5 text-sm font-medium"
            style={{ color: 'var(--ink)' }}
          >
            Browse
          </button>
          {user && (
            <>
              <button
                onClick={() => onNavigate('#/host')}
                className="rounded-lg px-3 py-1.5 text-sm font-medium"
                style={{ color: 'var(--muted)' }}
              >
                Host
              </button>
              <button
                onClick={() => onNavigate('#/bookings')}
                className="rounded-lg px-3 py-1.5 text-sm font-medium"
                style={{ color: 'var(--muted)' }}
              >
                Trips
              </button>
            </>
          )}
          {user ? (
            <button
              onClick={onSignOut}
              className="flex items-center gap-2 rounded-full py-1 pr-3 pl-1"
              style={{ background: 'var(--glass)', border: '1px solid var(--line)' }}
            >
              <img src={user.avatarUrl ?? undefined} alt="" className="h-7 w-7 rounded-full" />
              <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{user.login}</span>
            </button>
          ) : (
            <button
              onClick={onSignIn}
              className="rounded-full px-4 py-1.5 text-sm font-semibold text-white"
              style={{ background: 'var(--accent)' }}
            >
              Sign in
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}
