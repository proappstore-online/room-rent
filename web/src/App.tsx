import { useCallback, useEffect, useState } from 'react'
import { useProAuth } from '@proappstore/sdk/hooks'
import { app } from './lib/app'
import { Header } from './components/Header'
import { BottomNav } from './components/BottomNav'
import { Browse } from './pages/Browse'
import { ListingDetail } from './pages/ListingDetail'
import { CreateListing } from './pages/CreateListing'
import { MyBookings } from './pages/MyBookings'
import { HostDashboard } from './pages/HostDashboard'
import { EditListing } from './pages/EditListing'
import { Wishlists } from './pages/Wishlists'
import { Messages } from './pages/Messages'
import { SignIn } from './pages/SignIn'
import { SeedListings } from './pages/SeedListings'

type Route =
  | { name: 'browse' }
  | { name: 'listing'; id: string }
  | { name: 'host' }
  | { name: 'host-new' }
  | { name: 'host-edit'; id: string }
  | { name: 'bookings' }
  | { name: 'wishlists' }
  | { name: 'messages'; listingId?: string; recipientId?: string }
  | { name: 'signin' }
  | { name: 'seed' }

function parseHash(): Route {
  const h = location.hash
  let m = h.match(/^#\/listing\/([\w-]+)$/)
  if (m) return { name: 'listing', id: m[1] }
  m = h.match(/^#\/host\/edit\/([\w-]+)$/)
  if (m) return { name: 'host-edit', id: m[1] }
  if (h === '#/host/new') return { name: 'host-new' }
  if (h === '#/host') return { name: 'host' }
  if (h === '#/bookings') return { name: 'bookings' }
  if (h === '#/wishlists') return { name: 'wishlists' }
  m = h.match(/^#\/messages\/([\w-]+)\/([\w-]+)$/)
  if (m) return { name: 'messages', listingId: m[1], recipientId: m[2] }
  if (h === '#/messages') return { name: 'messages' }
  if (h === '#/signin') return { name: 'signin' }
  if (h === '#/seed') return { name: 'seed' }
  return { name: 'browse' }
}

export default function App() {
  const { user, loading, signOut } = useProAuth(app)
  const [route, setRoute] = useState<Route>(parseHash)

  useEffect(() => {
    function onHash() { setRoute(parseHash()) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = useCallback((hash: string) => {
    location.hash = hash
  }, [])

  useEffect(() => {
    if (route.name === 'signin' && user) navigate('#/')
  }, [route.name, user, navigate])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <>
      <Header user={user} onSignIn={() => navigate('#/signin')} onSignOut={signOut} onNavigate={navigate} />
      {route.name === 'browse' && <Browse onNavigate={navigate} user={user} />}
      {route.name === 'listing' && (
        <ListingDetail listingId={route.id} user={user} onNavigate={navigate} />
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
      {route.name === 'wishlists' && user && (
        <Wishlists user={user} onNavigate={navigate} />
      )}
      {route.name === 'messages' && user && (
        <Messages user={user} onNavigate={navigate} listingId={route.listingId} recipientId={route.recipientId} />
      )}
      {route.name === 'seed' && user && (
        <SeedListings user={user} onNavigate={navigate} />
      )}
      {route.name === 'signin' && !user && <SignIn />}
      {(route.name === 'host' || route.name === 'host-new' || route.name === 'host-edit' || route.name === 'bookings' || route.name === 'wishlists' || route.name === 'messages' || route.name === 'seed') && !user && (
        <SignIn />
      )}
      <BottomNav user={user} onNavigate={navigate} onSignIn={() => navigate('#/signin')} activeRoute={route.name} />
    </>
  )
}
