import { app } from '../app'
import { q, x } from '../actions'
import { ensureMigrated } from './core'
import type { Listing, Booking, Review } from '../../types'

function uid() {
  return crypto.randomUUID()
}

// --- Listings ---

export async function createListing(
  data: Omit<Listing, 'id' | 'created_at' | 'updated_at'>,
): Promise<string> {
  await ensureMigrated(app)
  const id = uid()
  await x('create_listing', {
    id,
    host_name: data.host_name,
    host_avatar: data.host_avatar,
    title: data.title,
    description: data.description,
    price_per_night: data.price_per_night,
    location: data.location,
    lat: data.lat,
    lng: data.lng,
    capacity: data.capacity,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    amenities: data.amenities,
    images: data.images,
    house_rules: data.house_rules,
    cancellation_policy: data.cancellation_policy,
    check_in_time: data.check_in_time,
    check_out_time: data.check_out_time,
    instant_book: data.instant_book ? 1 : 0,
    cleaning_fee: data.cleaning_fee,
    service_fee_pct: data.service_fee_pct,
    ical_url: data.ical_url,
  })
  return id
}

export async function getListings(): Promise<Listing[]> {
  await ensureMigrated(app)
  return q<Listing>('list_listings')
}

export async function getListing(id: string): Promise<Listing | null> {
  await ensureMigrated(app)
  const rows = await q<Listing>('get_listing', { id })
  return rows[0] ?? null
}

export async function getMyListings(_hostId: string): Promise<Listing[]> {
  await ensureMigrated(app)
  return q<Listing>('list_my_listings')
}

export async function updateListing(
  id: string,
  data: Partial<Pick<Listing, 'title' | 'description' | 'price_per_night' | 'location' | 'lat' | 'lng' | 'capacity' | 'bedrooms' | 'bathrooms' | 'amenities' | 'images' | 'house_rules' | 'cancellation_policy' | 'check_in_time' | 'check_out_time' | 'instant_book' | 'cleaning_fee' | 'service_fee_pct' | 'ical_url'>>,
): Promise<void> {
  await ensureMigrated(app)
  // The registered action updates the full editable column set; callers pass a
  // complete edit form, so read the current row to fill any omitted fields.
  const current = await getListing(id)
  if (!current) return
  const merged = { ...current, ...data }
  await x('update_listing', {
    id,
    title: merged.title,
    description: merged.description,
    price_per_night: merged.price_per_night,
    location: merged.location,
    lat: merged.lat,
    lng: merged.lng,
    capacity: merged.capacity,
    bedrooms: merged.bedrooms,
    bathrooms: merged.bathrooms,
    amenities: merged.amenities,
    images: merged.images,
    house_rules: merged.house_rules,
    cancellation_policy: merged.cancellation_policy,
    check_in_time: merged.check_in_time,
    check_out_time: merged.check_out_time,
    instant_book: merged.instant_book ? 1 : 0,
    cleaning_fee: merged.cleaning_fee,
    service_fee_pct: merged.service_fee_pct,
    ical_url: merged.ical_url,
  })
}

export async function deleteListing(id: string, _hostId: string): Promise<void> {
  await ensureMigrated(app)
  await x('delete_listing', { id })
}

// --- Bookings ---

export async function canLeaveReview(listingId: string, _userId: string): Promise<boolean> {
  await ensureMigrated(app)
  const rows = await q<{ ok: number }>('can_leave_review', { listing_id: listingId })
  return rows.length > 0
}

export async function createBooking(
  data: Omit<Booking, 'id' | 'created_at' | 'status'>,
): Promise<string> {
  await ensureMigrated(app)
  const hostRows = await q<{ host_id: string }>('get_listing_host', { id: data.listing_id })
  const hostId = hostRows[0]?.host_id
  const id = uid()
  const meta = await x('create_booking', {
    id,
    listing_id: data.listing_id,
    guest_name: data.guest_name,
    check_in: data.check_in,
    check_out: data.check_out,
    guests: data.guests,
    total_price: data.total_price,
  })
  if (meta.changes === 0) throw new Error('These dates overlap with an existing booking.')
  if (hostId) {
    try {
      await app.notifications.notifyUser(hostId, {
        title: 'New booking request',
        body: `${data.guest_name} wants to book ${data.check_in} → ${data.check_out}`,
        url: '/#/host',
      })
    } catch { /* notification delivery is best-effort */ }
  }
  return id
}

export async function getBookingsForListing(listingId: string): Promise<Booking[]> {
  await ensureMigrated(app)
  return q<Booking>('list_bookings_for_listing', { listing_id: listingId })
}

export async function getMyBookings(_guestId: string): Promise<(Booking & { listing_title: string; listing_location: string; listing_images: string })[]> {
  await ensureMigrated(app)
  return q<Booking & { listing_title: string; listing_location: string; listing_images: string }>('list_my_bookings')
}

export async function getHostBookings(_hostId: string): Promise<(Booking & { listing_title: string })[]> {
  await ensureMigrated(app)
  return q<Booking & { listing_title: string }>('list_host_bookings')
}

export async function updateBookingStatus(id: string, status: Booking['status']): Promise<void> {
  await ensureMigrated(app)
  await x('update_booking_status', { id, status })
  if (status === 'confirmed' || status === 'cancelled') {
    try {
      const rows = await q<{ guest_id: string; guest_name: string; title: string }>('get_booking_notify_info', { id })
      const info = rows[0]
      if (info?.guest_id) {
        await app.notifications.notifyUser(info.guest_id, {
          title: status === 'confirmed' ? 'Booking confirmed!' : 'Booking cancelled',
          body: status === 'confirmed'
            ? `Your booking for "${info.title}" has been confirmed.`
            : `Your booking for "${info.title}" has been cancelled.`,
          url: '/#/bookings',
        })
      }
    } catch { /* notification delivery is best-effort */ }
  }
}

// --- Reviews ---

export async function createReview(
  data: Omit<Review, 'id' | 'created_at'>,
): Promise<string> {
  await ensureMigrated(app)
  const id = uid()
  await x('create_review', {
    id,
    listing_id: data.listing_id,
    booking_id: data.booking_id,
    author_name: data.author_name,
    author_avatar: data.author_avatar,
    rating: data.rating,
    comment: data.comment,
  })
  return id
}

export async function getReviewsForListing(listingId: string): Promise<Review[]> {
  await ensureMigrated(app)
  return q<Review>('list_reviews_for_listing', { listing_id: listingId })
}

// --- Favorites ---

export async function toggleFavorite(_userId: string, listingId: string): Promise<boolean> {
  await ensureMigrated(app)
  const existing = await q<{ ok: number }>('is_favorited', { listing_id: listingId })
  if (existing.length > 0) {
    await x('remove_favorite', { listing_id: listingId })
    return false
  }
  await x('add_favorite', { listing_id: listingId })
  return true
}

export async function getFavorites(_userId: string): Promise<string[]> {
  await ensureMigrated(app)
  const rows = await q<{ listing_id: string }>('list_my_favorite_ids')
  return rows.map((r) => r.listing_id)
}

export async function getFavoriteListings(_userId: string): Promise<Listing[]> {
  await ensureMigrated(app)
  return q<Listing>('list_my_favorite_listings')
}

// --- Messages ---

export async function sendMessage(data: { listing_id: string; sender_id: string; sender_name: string; recipient_id: string; body: string }): Promise<string> {
  await ensureMigrated(app)
  const id = uid()
  await x('send_message', {
    id,
    listing_id: data.listing_id,
    sender_name: data.sender_name,
    recipient_id: data.recipient_id,
    body: data.body,
  })
  return id
}

export async function getMessages(listingId: string, _userId1: string, userId2: string): Promise<{ id: string; listing_id: string; sender_id: string; sender_name: string; recipient_id: string; body: string; created_at: number }[]> {
  await ensureMigrated(app)
  return q<{ id: string; listing_id: string; sender_id: string; sender_name: string; recipient_id: string; body: string; created_at: number }>('list_messages', { listing_id: listingId, other_id: userId2 })
}

export async function getConversations(_userId: string): Promise<{ listing_id: string; listing_title: string; other_id: string; other_name: string; last_message: string; last_at: number }[]> {
  await ensureMigrated(app)
  return q<{ listing_id: string; listing_title: string; other_id: string; other_name: string; last_message: string; last_at: number }>('list_conversations')
}
