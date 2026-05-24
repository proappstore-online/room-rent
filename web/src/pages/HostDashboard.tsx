import { useEffect, useState } from 'react'
import type { User } from '@proappstore/sdk'
import type { Listing, Booking } from '../types'
import { getMyListings, getHostBookings, updateBookingStatus, deleteListing } from '../lib/db'

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

  useEffect(() => {
    Promise.all([getMyListings(user.id), getHostBookings(user.id)]).then(([l, b]) => {
      setListings(l)
      setBookings(b)
      setLoading(false)
    })
  }, [user.id])

  async function handleConfirm(bookingId: string) {
    await updateBookingStatus(bookingId, 'confirmed')
    setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: 'confirmed' as const } : b))
  }

  async function handleCancel(bookingId: string) {
    await updateBookingStatus(bookingId, 'cancelled')
    setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: 'cancelled' as const } : b))
  }

  async function handleDelete(listingId: string) {
    await deleteListing(listingId, user.id)
    setListings((prev) => prev.filter((l) => l.id !== listingId))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
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
                      className="rounded-lg px-2 py-1 text-xs font-medium"
                      style={{ color: 'var(--error)', background: 'var(--glass)' }}
                    >
                      Delete
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
                      {b.check_in} &rarr; {b.check_out} · {b.guests} guest{b.guests !== 1 ? 's' : ''} · ${b.total_price}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                    style={{
                      background: b.status === 'confirmed' ? 'var(--mint-soft)' : b.status === 'cancelled' ? 'var(--line)' : 'var(--accent-soft)',
                      color: b.status === 'confirmed' ? 'var(--mint)' : b.status === 'cancelled' ? 'var(--muted)' : 'var(--accent)',
                    }}
                  >
                    {b.status}
                  </span>
                </div>
                {b.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleConfirm(b.id)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                      style={{ background: 'var(--mint)' }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => handleCancel(b.id)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium"
                      style={{ color: 'var(--error)', background: 'var(--glass)', border: '1px solid var(--line)' }}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
