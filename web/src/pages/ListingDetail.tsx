import { useEffect, useState } from 'react'
import type { User } from '@proappstore/sdk'
import type { Listing, Review } from '../types'
import { getListing, getReviewsForListing, createBooking, createReview, hasCompletedBooking } from '../lib/db'

export function ListingDetail({
  listingId,
  user,
  onSignIn,
  onNavigate,
}: {
  listingId: string
  user: User | null
  onSignIn: () => void
  onNavigate: (hash: string) => void
}) {
  const [listing, setListing] = useState<Listing | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(1)
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState(false)
  const [bookError, setBookError] = useState('')
  const [canReview, setCanReview] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    Promise.all([getListing(listingId), getReviewsForListing(listingId)]).then(
      ([l, r]) => {
        setListing(l)
        setReviews(r)
        setLoading(false)
      },
    )
  }, [listingId])

  useEffect(() => {
    if (user) {
      hasCompletedBooking(listingId, user.id).then(setCanReview)
    } else {
      setCanReview(false)
    }
  }, [listingId, user])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p style={{ color: 'var(--muted)' }}>Listing not found.</p>
        <button onClick={() => onNavigate('#/')} className="mt-4 text-sm font-medium" style={{ color: 'var(--accent)' }}>
          Back to browse
        </button>
      </div>
    )
  }

  const images: string[] = JSON.parse(listing.images || '[]')
  const amenities: string[] = JSON.parse(listing.amenities || '[]')
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const nights = checkIn && checkOut
    ? Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0
  const totalPrice = nights * listing.price_per_night

  async function handleBook() {
    if (!user) { onSignIn(); return }
    if (!checkIn || !checkOut || nights <= 0) return
    setBooking(true)
    setBookError('')
    try {
      await createBooking({
        listing_id: listing!.id,
        guest_id: user.id,
        guest_name: user.login,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        total_price: totalPrice,
      })
      setBooked(true)
    } catch (err) {
      setBookError(err instanceof Error ? err.message : 'Booking failed.')
    }
    setBooking(false)
  }

  async function handleReview() {
    if (!user || !reviewRating) return
    setSubmittingReview(true)
    await createReview({
      listing_id: listingId,
      booking_id: '',
      author_id: user.id,
      author_name: user.login,
      author_avatar: user.avatarUrl || '',
      rating: reviewRating,
      comment: reviewComment,
    })
    const updated = await getReviewsForListing(listingId)
    setReviews(updated)
    setReviewRating(0)
    setReviewComment('')
    setSubmittingReview(false)
    setCanReview(false)
  }

  const isOwner = user?.id === listing.host_id

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <button onClick={() => onNavigate('#/')} className="mb-4 text-sm font-medium" style={{ color: 'var(--accent)' }}>
        &larr; Back
      </button>

      {/* Media */}
      {images.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {images.slice(0, 4).map((url, i) => {
            const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(url) || url.includes('video')
            return (
              <div key={i} className={`overflow-hidden rounded-xl ${i === 0 ? 'sm:col-span-2 aspect-[16/9]' : 'aspect-[4/3]'}`}>
                {isVideo ? (
                  <video src={url} controls playsInline className="h-full w-full object-cover" />
                ) : (
                  <img src={url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center rounded-xl" style={{ background: 'var(--paper-deep)' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--muted)' }}>
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        {/* Details */}
        <div>
          <h1 className="display-font text-2xl font-semibold" style={{ color: 'var(--ink)' }}>{listing.title}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{listing.location}</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            {listing.capacity} guest{listing.capacity !== 1 ? 's' : ''} · {listing.bedrooms} bedroom{listing.bedrooms !== 1 ? 's' : ''} · {listing.bathrooms} bathroom{listing.bathrooms !== 1 ? 's' : ''}
          </p>

          {/* Host */}
          <div className="mt-6 flex items-center gap-3 border-t border-b py-4" style={{ borderColor: 'var(--line)' }}>
            {listing.host_avatar ? (
              <img src={listing.host_avatar} alt="" className="h-10 w-10 rounded-full" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                {listing.host_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Hosted by {listing.host_name}</p>
              {avgRating && (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {avgRating} avg rating · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>About this place</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {listing.description || 'No description provided.'}
            </p>
          </div>

          {/* Map */}
          {listing.lat !== 0 && listing.lng !== 0 && (
            <div className="mt-6">
              <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Location</h2>
              <div className="mt-2 overflow-hidden rounded-xl" style={{ border: '1px solid var(--line)' }}>
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${listing.lng - 0.01},${listing.lat - 0.01},${listing.lng + 0.01},${listing.lat + 0.01}&layer=mapnik&marker=${listing.lat},${listing.lng}`}
                  style={{ width: '100%', height: '300px', border: 'none' }}
                  title="Listing location"
                />
              </div>
            </div>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <div className="mt-6">
              <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Amenities</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {amenities.map((a) => (
                  <span key={a} className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="mt-8">
              <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
                Reviews ({reviews.length})
              </h2>
              <div className="mt-3 space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-xl p-3" style={{ background: 'var(--glass)', border: '1px solid var(--line)' }}>
                    <div className="flex items-center gap-2">
                      {r.author_avatar ? (
                        <img src={r.author_avatar} alt="" className="h-7 w-7 rounded-full" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                          {r.author_name.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{r.author_name}</span>
                      <span className="text-xs" style={{ color: 'var(--warning)' }}>
                        {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm" style={{ color: 'var(--muted)' }}>{r.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leave a review */}
          {canReview && (
            <div className="mt-8">
              <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Leave a review</h2>
              <div className="mt-3 rounded-xl p-4" style={{ background: 'var(--glass)', border: '1px solid var(--line)' }}>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="text-xl"
                      style={{ color: star <= reviewRating ? 'var(--warning)' : 'var(--muted)', cursor: 'pointer', background: 'none', border: 'none', padding: '2px' }}
                    >
                      {star <= reviewRating ? '\u2605' : '\u2606'}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience..."
                  rows={3}
                  className="mt-3 w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                  style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                />
                <button
                  onClick={handleReview}
                  disabled={submittingReview || reviewRating === 0}
                  className="mt-3 rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: 'var(--accent)' }}
                >
                  {submittingReview ? 'Submitting...' : 'Submit review'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Booking card */}
        <div className="lg:sticky lg:top-20 self-start">
          <div className="rounded-2xl p-5" style={{ background: 'var(--panel-strong)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-card)' }}>
            <p className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>
              ${listing.price_per_night}<span className="text-sm font-normal" style={{ color: 'var(--muted)' }}> / night</span>
            </p>

            {booked ? (
              <div className="mt-4 rounded-xl p-4 text-center" style={{ background: 'var(--mint-soft)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--mint-deep)' }}>Booking requested!</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--mint)' }}>The host will confirm shortly.</p>
                <button onClick={() => onNavigate('#/bookings')} className="mt-3 text-xs font-medium" style={{ color: 'var(--accent)' }}>
                  View my trips &rarr;
                </button>
              </div>
            ) : isOwner ? (
              <p className="mt-4 text-center text-sm" style={{ color: 'var(--muted)' }}>This is your listing.</p>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Check-in</span>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Check-out</span>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      min={checkIn || new Date().toISOString().split('T')[0]}
                      className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                    />
                  </label>
                </div>
                <label className="mt-2 block">
                  <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Guests</span>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                  >
                    {Array.from({ length: listing.capacity }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1} guest{i > 0 ? 's' : ''}</option>
                    ))}
                  </select>
                </label>

                {nights > 0 && (
                  <div className="mt-3 flex justify-between text-sm" style={{ color: 'var(--ink)' }}>
                    <span>{nights} night{nights !== 1 ? 's' : ''}</span>
                    <span className="font-semibold">${totalPrice.toFixed(2)}</span>
                  </div>
                )}

                <button
                  onClick={handleBook}
                  disabled={booking || nights <= 0}
                  className="mt-4 w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: 'var(--accent)' }}
                >
                  {booking ? 'Booking...' : user ? 'Request to book' : 'Sign in to book'}
                </button>
                {bookError && (
                  <p className="mt-2 text-center text-sm" style={{ color: 'var(--error)' }}>{bookError}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
