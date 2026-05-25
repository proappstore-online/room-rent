import { app } from '../app'
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
  const now = Date.now()
  await app.db.execute(
    `INSERT INTO listings (id, host_id, host_name, host_avatar, title, description, price_per_night, location, lat, lng, capacity, bedrooms, bathrooms, amenities, images, house_rules, cancellation_policy, check_in_time, check_out_time, instant_book, cleaning_fee, service_fee_pct, ical_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.host_id, data.host_name, data.host_avatar, data.title, data.description, data.price_per_night, data.location, data.lat, data.lng, data.capacity, data.bedrooms, data.bathrooms, data.amenities, data.images, data.house_rules, data.cancellation_policy, data.check_in_time, data.check_out_time, data.instant_book ? 1 : 0, data.cleaning_fee, data.service_fee_pct, data.ical_url, now, now],
  )
  return id
}

export async function getListings(): Promise<Listing[]> {
  await ensureMigrated(app)
  const { rows } = await app.db.query('SELECT * FROM listings ORDER BY created_at DESC')
  return rows as unknown as Listing[]
}

export async function getListing(id: string): Promise<Listing | null> {
  await ensureMigrated(app)
  const { rows } = await app.db.query('SELECT * FROM listings WHERE id = ?', [id])
  return (rows[0] as unknown as Listing) ?? null
}

export async function getMyListings(hostId: string): Promise<Listing[]> {
  await ensureMigrated(app)
  const { rows } = await app.db.query('SELECT * FROM listings WHERE host_id = ? ORDER BY created_at DESC', [hostId])
  return rows as unknown as Listing[]
}

export async function updateListing(
  id: string,
  data: Partial<Pick<Listing, 'title' | 'description' | 'price_per_night' | 'location' | 'lat' | 'lng' | 'capacity' | 'bedrooms' | 'bathrooms' | 'amenities' | 'images' | 'house_rules' | 'cancellation_policy' | 'check_in_time' | 'check_out_time' | 'instant_book' | 'cleaning_fee' | 'service_fee_pct' | 'ical_url'>>,
): Promise<void> {
  await ensureMigrated(app)
  const ALLOWED_COLS = new Set(['title','description','price_per_night','location','lat','lng','capacity','bedrooms','bathrooms','amenities','images','house_rules','cancellation_policy','check_in_time','check_out_time','instant_book','cleaning_fee','service_fee_pct','ical_url'])
  const sets: string[] = []
  const vals: unknown[] = []
  for (const [k, v] of Object.entries(data)) {
    if (!ALLOWED_COLS.has(k)) continue
    sets.push(`${k} = ?`)
    vals.push(k === 'instant_book' ? (v ? 1 : 0) : v)
  }
  sets.push('updated_at = ?')
  vals.push(Date.now())
  vals.push(id)
  await app.db.execute(`UPDATE listings SET ${sets.join(', ')} WHERE id = ?`, vals)
}

export async function deleteListing(id: string, hostId: string): Promise<void> {
  await ensureMigrated(app)
  await app.db.execute('DELETE FROM favorites WHERE listing_id = ?', [id])
  await app.db.execute('DELETE FROM messages WHERE listing_id = ?', [id])
  await app.db.execute('DELETE FROM reviews WHERE listing_id = ?', [id])
  await app.db.execute('DELETE FROM bookings WHERE listing_id = ?', [id])
  await app.db.execute('DELETE FROM listings WHERE id = ? AND host_id = ?', [id, hostId])
}

// --- Bookings ---

export async function canLeaveReview(listingId: string, userId: string): Promise<boolean> {
  await ensureMigrated(app)
  const { rows } = await app.db.query(
    `SELECT 1 FROM bookings WHERE listing_id = ? AND guest_id = ? AND status = 'completed'
     AND id NOT IN (SELECT booking_id FROM reviews WHERE author_id = ?) LIMIT 1`,
    [listingId, userId, userId],
  )
  return rows.length > 0
}

export async function createBooking(
  data: Omit<Booking, 'id' | 'created_at' | 'status'>,
): Promise<string> {
  await ensureMigrated(app)
  const { rows: [listingRow] } = await app.db.query('SELECT host_id FROM listings WHERE id = ?', [data.listing_id])
  const hostId = (listingRow as unknown as { host_id: string })?.host_id
  const { rows: conflicts } = await app.db.query(
    `SELECT 1 FROM bookings WHERE listing_id = ? AND status IN ('pending','confirmed') AND check_in < ? AND check_out > ? LIMIT 1`,
    [data.listing_id, data.check_out, data.check_in],
  )
  if (conflicts.length > 0) throw new Error('These dates overlap with an existing booking.')
  const id = uid()
  await app.db.execute(
    `INSERT INTO bookings (id, listing_id, guest_id, guest_name, check_in, check_out, guests, total_price, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [id, data.listing_id, data.guest_id, data.guest_name, data.check_in, data.check_out, data.guests, data.total_price, Date.now()],
  )
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
  const { rows } = await app.db.query(
    'SELECT * FROM bookings WHERE listing_id = ? ORDER BY check_in ASC',
    [listingId],
  )
  return rows as unknown as Booking[]
}

export async function getMyBookings(guestId: string): Promise<(Booking & { listing_title: string; listing_location: string; listing_images: string })[]> {
  await ensureMigrated(app)
  const { rows } = await app.db.query(
    `SELECT b.*, l.title as listing_title, l.location as listing_location, l.images as listing_images
     FROM bookings b JOIN listings l ON b.listing_id = l.id
     WHERE b.guest_id = ? ORDER BY b.created_at DESC`,
    [guestId],
  )
  return rows as unknown as (Booking & { listing_title: string; listing_location: string; listing_images: string })[]
}

export async function getHostBookings(hostId: string): Promise<(Booking & { listing_title: string })[]> {
  await ensureMigrated(app)
  const { rows } = await app.db.query(
    `SELECT b.*, l.title as listing_title
     FROM bookings b JOIN listings l ON b.listing_id = l.id
     WHERE l.host_id = ? ORDER BY b.created_at DESC`,
    [hostId],
  )
  return rows as unknown as (Booking & { listing_title: string })[]
}

export async function updateBookingStatus(id: string, status: Booking['status']): Promise<void> {
  await ensureMigrated(app)
  await app.db.execute('UPDATE bookings SET status = ? WHERE id = ?', [status, id])
  if (status === 'confirmed' || status === 'cancelled') {
    try {
      const { rows: [info] } = await app.db.query(
        'SELECT b.guest_id, b.guest_name, l.title FROM bookings b JOIN listings l ON b.listing_id = l.id WHERE b.id = ?',
        [id],
      )
      const { guest_id, title } = info as unknown as { guest_id: string; guest_name: string; title: string }
      if (guest_id) {
        await app.notifications.notifyUser(guest_id, {
          title: status === 'confirmed' ? 'Booking confirmed!' : 'Booking cancelled',
          body: status === 'confirmed'
            ? `Your booking for "${title}" has been confirmed.`
            : `Your booking for "${title}" has been cancelled.`,
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
  await app.db.execute(
    `INSERT INTO reviews (id, listing_id, booking_id, author_id, author_name, author_avatar, rating, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.listing_id, data.booking_id, data.author_id, data.author_name, data.author_avatar, data.rating, data.comment, Date.now()],
  )
  return id
}

export async function getReviewsForListing(listingId: string): Promise<Review[]> {
  await ensureMigrated(app)
  const { rows } = await app.db.query(
    'SELECT * FROM reviews WHERE listing_id = ? ORDER BY created_at DESC',
    [listingId],
  )
  return rows as unknown as Review[]
}

// --- Favorites ---

export async function toggleFavorite(userId: string, listingId: string): Promise<boolean> {
  await ensureMigrated(app)
  const { rows } = await app.db.query(
    'SELECT 1 FROM favorites WHERE user_id = ? AND listing_id = ?',
    [userId, listingId],
  )
  if (rows.length > 0) {
    await app.db.execute('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?', [userId, listingId])
    return false
  }
  await app.db.execute(
    'INSERT INTO favorites (user_id, listing_id, created_at) VALUES (?, ?, ?)',
    [userId, listingId, Date.now()],
  )
  return true
}

export async function getFavorites(userId: string): Promise<string[]> {
  await ensureMigrated(app)
  const { rows } = await app.db.query('SELECT listing_id FROM favorites WHERE user_id = ?', [userId])
  return (rows as unknown as { listing_id: string }[]).map((r) => r.listing_id)
}

export async function getFavoriteListings(userId: string): Promise<Listing[]> {
  await ensureMigrated(app)
  const { rows } = await app.db.query(
    'SELECT l.* FROM listings l JOIN favorites f ON l.id = f.listing_id WHERE f.user_id = ? ORDER BY f.created_at DESC',
    [userId],
  )
  return rows as unknown as Listing[]
}

// --- Messages ---

export async function sendMessage(data: { listing_id: string; sender_id: string; sender_name: string; recipient_id: string; body: string }): Promise<string> {
  await ensureMigrated(app)
  const id = uid()
  await app.db.execute(
    'INSERT INTO messages (id, listing_id, sender_id, sender_name, recipient_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, data.listing_id, data.sender_id, data.sender_name, data.recipient_id, data.body, Date.now()],
  )
  return id
}

export async function getMessages(listingId: string, userId1: string, userId2: string): Promise<{ id: string; listing_id: string; sender_id: string; sender_name: string; recipient_id: string; body: string; created_at: number }[]> {
  await ensureMigrated(app)
  const { rows } = await app.db.query(
    `SELECT * FROM messages WHERE listing_id = ? AND ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)) ORDER BY created_at ASC`,
    [listingId, userId1, userId2, userId2, userId1],
  )
  return rows as unknown as { id: string; listing_id: string; sender_id: string; sender_name: string; recipient_id: string; body: string; created_at: number }[]
}

export async function getConversations(userId: string): Promise<{ listing_id: string; listing_title: string; other_id: string; other_name: string; last_message: string; last_at: number }[]> {
  await ensureMigrated(app)
  const { rows } = await app.db.query(
    `SELECT sub.listing_id, l.title as listing_title, sub.other_id,
       COALESCE(
         (SELECT sender_name FROM messages WHERE listing_id = sub.listing_id AND sender_id = sub.other_id LIMIT 1),
         'User'
       ) as other_name,
       m2.body as last_message, m2.created_at as last_at
     FROM (
       SELECT listing_id,
         CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END as other_id,
         MAX(created_at) as max_at
       FROM messages
       WHERE sender_id = ? OR recipient_id = ?
       GROUP BY listing_id, other_id
     ) sub
     JOIN messages m2 ON m2.listing_id = sub.listing_id AND m2.created_at = sub.max_at
       AND ((m2.sender_id = ? AND m2.recipient_id = sub.other_id) OR (m2.sender_id = sub.other_id AND m2.recipient_id = ?))
     JOIN listings l ON l.id = sub.listing_id
     ORDER BY sub.max_at DESC`,
    [userId, userId, userId, userId, userId],
  )
  return rows as unknown as { listing_id: string; listing_title: string; other_id: string; other_name: string; last_message: string; last_at: number }[]
}
