import type { User } from '@proappstore/sdk'

const tabs = [
  {
    label: 'Browse',
    hash: '#/',
    route: 'browse',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" />
      </svg>
    ),
    requiresAuth: false,
  },
  {
    label: 'Wishlists',
    hash: '#/wishlists',
    route: 'wishlists',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    requiresAuth: true,
  },
  {
    label: 'Host',
    hash: '#/host',
    route: 'host',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 4l9 5.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <line x1="12" y1="14" x2="12" y2="18" />
        <line x1="10" y1="16" x2="14" y2="16" />
      </svg>
    ),
    requiresAuth: true,
  },
  {
    label: 'Trips',
    hash: '#/bookings',
    route: 'bookings',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    ),
    requiresAuth: true,
  },
  {
    label: 'Messages',
    hash: '#/messages',
    route: 'messages',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    requiresAuth: true,
  },
]

export function BottomNav({
  user,
  onNavigate,
  onSignIn,
  activeRoute,
}: {
  user: User | null
  onNavigate: (hash: string) => void
  onSignIn: () => void
  activeRoute: string
}) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around backdrop-blur-xl lg:hidden"
      style={{
        height: '56px',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--glass-strong)',
        borderTop: '1px solid var(--line)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeRoute === tab.route
        return (
          <button
            key={tab.route}
            onClick={() => {
              if (tab.requiresAuth && !user) {
                onSignIn()
              } else {
                onNavigate(tab.hash)
              }
            }}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1"
            style={{ color: isActive ? 'var(--accent)' : 'var(--muted)' }}
          >
            {tab.icon}
            <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
