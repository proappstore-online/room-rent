import { useEffect, useState } from 'react'
import type { User } from '@proappstore/sdk'
import type { Booking } from '../types'
import { getMyBookings } from '../lib/db'

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

  useEffect(() => {
    getMyBookings(user.id).then((b) => { setBookings(b); setLoading(false) })
  }, [user.id])

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="display-font text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
        My trips
      </h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
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
                  <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>${b.total_price}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
