import { useEffect, useState } from 'react'
import { useProAuth } from '@proappstore/sdk/hooks'
import { app } from './lib/app'
import { Header } from './components/Header'
import { Browse } from './pages/Browse'
import { ListingDetail } from './pages/ListingDetail'
import { CreateListing } from './pages/CreateListing'
import { MyBookings } from './pages/MyBookings'
import { HostDashboard } from './pages/HostDashboard'
import { EditListing } from './pages/EditListing'

type Route =
  | { name: 'browse' }
  | { name: 'listing'; id: string }
  | { name: 'host' }
  | { name: 'host-new' }
  | { name: 'host-edit'; id: string }
  | { name: 'bookings' }

function parseHash(): Route {
  const h = location.hash
  let m = h.match(/^#\/listing\/([\w-]+)$/)
  if (m) return { name: 'listing', id: m[1] }
  m = h.match(/^#\/host\/edit\/([\w-]+)$/)
  if (m) return { name: 'host-edit', id: m[1] }
  if (h === '#/host/new') return { name: 'host-new' }
  if (h === '#/host') return { name: 'host' }
  if (h === '#/bookings') return { name: 'bookings' }
  return { name: 'browse' }
}

export default function App() {
  const { user, loading, signIn, signOut } = useProAuth(app)
  const [route, setRoute] = useState<Route>(parseHash)

  useEffect(() => {
    function onHash() { setRoute(parseHash()) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function navigate(hash: string) {
    location.hash = hash
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <>
      <Header user={user} onSignIn={signIn} onSignOut={signOut} onNavigate={navigate} />
      {route.name === 'browse' && <Browse onNavigate={navigate} />}
      {route.name === 'listing' && (
        <ListingDetail listingId={route.id} user={user} onSignIn={signIn} onNavigate={navigate} />
      )}
      {route.name === 'host' && user && (
        <HostDashboard user={user} onNavigate={navigate} />
      )}
      {route.name === 'host-new' && user && (
        <CreateListing user={user} onNavigate={navigate} />
      )}
      {route.name === 'host-edit' && user && (
        <EditListing listingId={route.id} user={user} onNavigate={navigate} />
      )}
      {route.name === 'bookings' && user && (
        <MyBookings user={user} onNavigate={navigate} />
      )}
      {(route.name === 'host' || route.name === 'host-new' || route.name === 'host-edit' || route.name === 'bookings') && !user && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Sign in to continue.</p>
          <button
            onClick={signIn}
            className="mt-4 rounded-full px-6 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            Sign in
          </button>
        </div>
      )}
    </>
  )
}
