import { useEffect, useRef, useState } from 'react'
import type { User } from '@proappstore/sdk'
import type { Booking } from '../types'
import { getMyBookings } from '../lib/db'
import { createLifecycleScope, settleIfCurrent } from '../lib/lifecycle'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'var(--accent-soft)', text: 'var(--accent)' },
  confirmed: { bg: 'var(--mint-soft)', text: 'var(--mint)' },
  cancelled: { bg: 'var(--line)', text: 'var(--muted)' },
  completed: { bg: 'var(--sky-soft)', text: 'var(--sky)' },
}

export function MyBookings({
  user,
  onNavigate,
}: {
  user: User
  onNavigate: (hash: string) => void
}) {
  const [bookings, setBookings] = useState<(Booking & { listing_title: string; listing_location: string; listing_images: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const bookingsScope = useRef(createLifecycleScope(user.id))

  // This runs during render, so a previous account's trips are hidden before
  // effects have a chance to clear state.
  bookingsScope.current.updateContext(user.id)

  useEffect(() => {
    setBookings([])
    setLoading(true)
    setLoadError('')
    setLoadedUserId(null)
    const request = bookingsScope.current.begin(user.id)

    void settleIfCurrent(request, getMyBookings(user.id), {
      onSuccess: (nextBookings) => {
        setBookings(nextBookings)
        setLoadedUserId(user.id)
        setLoading(false)
      },
      onError: () => {
        setBookings([])
        setLoadedUserId(user.id)
        setLoadError('Unable to load your trips. Please try again.')
        setLoading(false)
      },
    })
  }, [user.id, loadAttempt])

  const isCurrentAccount = loadedUserId === user.id

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="display-font text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
        My trips
      </h1>

      {loading || !isCurrentAccount ? (
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : loadError ? (
        <div className="py-20 text-center">
          <p className="text-sm" style={{ color: 'var(--error)' }}>{loadError}</p>
          <button onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="mt-3 text-sm font-medium" style={{ color: 'var(--accent)' }}>
            Try again
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No trips yet.</p>
          <button onClick={() => onNavigate('#/')} className="mt-3 text-sm font-medium" style={{ color: 'var(--accent)' }}>
            Browse listings &rarr;
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {bookings.map((b) => {
            const images: string[] = JSON.parse(b.listing_images || '[]')
            const colors = STATUS_COLORS[b.status] || STATUS_COLORS.pending
            return (
              <button
                key={b.id}
                onClick={() => onNavigate(`#/listing/${b.listing_id}`)}
                className="flex w-full items-center gap-4 rounded-xl p-3 text-left"
                style={{ background: 'var(--panel-strong)', border: '1px solid var(--line)' }}
              >
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg" style={{ background: 'var(--paper-deep)' }}>
                  {images[0] ? (
                    <img src={images[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center" style={{ color: 'var(--muted)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>{b.listing_title}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{b.listing_location}</p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
                    {b.check_in} &rarr; {b.check_out} · {b.guests} guest{b.guests !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: colors.bg, color: colors.text }}>
                    {b.status}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>${b.total_price.toFixed(2)}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
