import { useEffect, useRef, useState } from 'react'
import type { User } from '@proappstore/sdk'
import type { Listing, Booking } from '../types'
import { getMyListings, getHostBookings, updateBookingStatus, deleteListing } from '../lib/db'
import { createLifecycleScope, settleIfCurrent } from '../lib/lifecycle'

function omit<T>(record: Record<string, T>, key: string) {
  const next = { ...record }
  delete next[key]
  return next
}

export function HostDashboard({
  user,
  onNavigate,
}: {
  user: User
  onNavigate: (hash: string) => void
}) {
  const [tab, setTab] = useState<'listings' | 'bookings'>('listings')
  const [listings, setListings] = useState<Listing[]>([])
  const [bookings, setBookings] = useState<(Booking & { listing_title: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  // Keyed by `booking:<id>` / `listing:<id>`: one in-flight mutation per row.
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({})
  const dashboardScope = useRef(createLifecycleScope(user.id))

  // This runs during render, so a previous account's dashboard is hidden and
  // its in-flight loads/mutations are invalidated before effects run.
  dashboardScope.current.updateContext(user.id)

  useEffect(() => {
    setListings([])
    setBookings([])
    setPending({})
    setActionErrors({})
    setLoading(true)
    setLoadError('')
    setLoadedUserId(null)
    const request = dashboardScope.current.begin(user.id)

    void settleIfCurrent(request, Promise.all([getMyListings(user.id), getHostBookings(user.id)]), {
      onSuccess: ([l, b]) => {
        setListings(l)
        setBookings(b)
        setLoadedUserId(user.id)
        setLoading(false)
      },
      onError: () => {
        setLoadedUserId(user.id)
        setLoadError('Unable to load your dashboard. Please try again.')
        setLoading(false)
      },
    })
  }, [user.id, loadAttempt])

  function runAction(key: string, operation: () => Promise<void>, onSuccess: () => void, failure: string) {
    if (pending[key]) return
    const request = dashboardScope.current.capture()
    setPending((prev) => ({ ...prev, [key]: true }))
    setActionErrors((prev) => omit(prev, key))
    void settleIfCurrent(request, operation(), {
      onSuccess: () => {
        onSuccess()
        setPending((prev) => omit(prev, key))
      },
      onError: () => {
        setActionErrors((prev) => ({ ...prev, [key]: failure }))
        setPending((prev) => omit(prev, key))
      },
    })
  }

  function setBookingStatus(bookingId: string, status: 'confirmed' | 'cancelled' | 'completed', failure: string) {
    runAction(
      `booking:${bookingId}`,
      () => updateBookingStatus(bookingId, status),
      () => setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status } : b)),
      failure,
    )
  }

  function handleConfirm(bookingId: string) {
    setBookingStatus(bookingId, 'confirmed', 'Could not confirm this booking. Please try again.')
  }

  function handleCancel(bookingId: string) {
    setBookingStatus(bookingId, 'cancelled', 'Could not decline this booking. Please try again.')
  }

  function handleComplete(bookingId: string) {
    setBookingStatus(bookingId, 'completed', 'Could not mark this booking completed. Please try again.')
  }

  function handleDelete(listingId: string) {
    if (pending[`listing:${listingId}`]) return
    if (!confirm('Delete this listing? All bookings, reviews, and messages will be permanently removed.')) return
    runAction(
      `listing:${listingId}`,
      () => deleteListing(listingId, user.id),
      () => setListings((prev) => prev.filter((l) => l.id !== listingId)),
      'Could not delete this listing. Please try again.',
    )
  }

  if (loading || loadedUserId !== user.id) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-sm" style={{ color: 'var(--error)' }}>{loadError}</p>
        <button onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="mt-3 text-sm font-medium" style={{ color: 'var(--accent)' }}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="display-font text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Host</h1>
        <button
          onClick={() => onNavigate('#/host/new')}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}
        >
          + New listing
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 rounded-lg p-0.5" style={{ background: 'var(--glass)' }}>
        {(['listings', 'bookings'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize"
            style={{
              background: tab === t ? 'var(--panel-strong)' : 'transparent',
              color: tab === t ? 'var(--ink)' : 'var(--muted)',
              boxShadow: tab === t ? 'var(--shadow-card)' : 'none',
            }}
          >
            {t} ({t === 'listings' ? listings.length : bookings.length})
          </button>
        ))}
      </div>

      {tab === 'listings' ? (
        listings.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No listings yet.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {listings.map((l) => {
              const images: string[] = JSON.parse(l.images || '[]')
              return (
                <div
                  key={l.id}
                  className="flex items-center gap-4 rounded-xl p-3"
                  style={{ background: 'var(--panel-strong)', border: '1px solid var(--line)' }}
                >
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg" style={{ background: 'var(--paper-deep)' }}>
                    {images[0] ? (
                      <img src={images[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center" style={{ color: 'var(--muted)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <button onClick={() => onNavigate(`#/listing/${l.id}`)} className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      {l.title}
                    </button>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{l.location} · ${l.price_per_night}/night</p>
                    {actionErrors[`listing:${l.id}`] && (
                      <p role="alert" className="mt-0.5 text-xs" style={{ color: 'var(--error)' }}>{actionErrors[`listing:${l.id}`]}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onNavigate(`#/host/edit/${l.id}`)}
                      className="rounded-lg px-2 py-1 text-xs font-medium"
                      style={{ color: 'var(--accent)', background: 'var(--glass)' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(l.id)}
                      disabled={!!pending[`listing:${l.id}`]}
                      className="rounded-lg px-2 py-1 text-xs font-medium disabled:opacity-50"
                      style={{ color: 'var(--error)', background: 'var(--glass)' }}
                    >
                      {pending[`listing:${l.id}`] ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        bookings.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No booking requests yet.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="rounded-xl p-3"
                style={{ background: 'var(--panel-strong)', border: '1px solid var(--line)' }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{b.guest_name}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{b.listing_title}</p>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
                      {b.check_in} &rarr; {b.check_out} · {b.guests} guest{b.guests !== 1 ? 's' : ''} · ${b.total_price.toFixed(2)}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                    style={{
                      background: b.status === 'completed' ? 'var(--mint-soft)' : b.status === 'confirmed' ? 'var(--mint-soft)' : b.status === 'cancelled' ? 'var(--line)' : 'var(--accent-soft)',
                      color: b.status === 'completed' ? 'var(--mint-deep, var(--mint))' : b.status === 'confirmed' ? 'var(--mint)' : b.status === 'cancelled' ? 'var(--muted)' : 'var(--accent)',
                    }}
                  >
                    {b.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {b.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleConfirm(b.id)}
                        disabled={!!pending[`booking:${b.id}`]}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        style={{ background: 'var(--mint)' }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => handleCancel(b.id)}
                        disabled={!!pending[`booking:${b.id}`]}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                        style={{ color: 'var(--error)', background: 'var(--glass)', border: '1px solid var(--line)' }}
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {b.status === 'confirmed' && (
                    <button
                      onClick={() => handleComplete(b.id)}
                      disabled={!!pending[`booking:${b.id}`]}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      style={{ background: 'var(--mint)' }}
                    >
                      Mark completed
                    </button>
                  )}
                  <button
                    onClick={() => onNavigate(`#/messages/${b.listing_id}/${b.guest_id}`)}
                    className="text-xs font-medium"
                    style={{ color: 'var(--accent)' }}
                  >
                    Message guest
                  </button>
                </div>
                {actionErrors[`booking:${b.id}`] && (
                  <p role="alert" className="mt-2 text-xs" style={{ color: 'var(--error)' }}>{actionErrors[`booking:${b.id}`]}</p>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
