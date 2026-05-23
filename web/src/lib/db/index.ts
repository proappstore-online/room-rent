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
    `INSERT INTO listings (id, host_id, host_name, host_avatar, title, description, price_per_night, location, lat, lng, capacity, bedrooms, bathrooms, amenities, images, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.host_id, data.host_name, data.host_avatar, data.title, data.description, data.price_per_night, data.location, data.lat, data.lng, data.capacity, data.bedrooms, data.bathrooms, data.amenities, data.images, now, now],
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
  data: Partial<Pick<Listing, 'title' | 'description' | 'price_per_night' | 'location' | 'lat' | 'lng' | 'capacity' | 'bedrooms' | 'bathrooms' | 'amenities' | 'images'>>,
): Promise<void> {
  await ensureMigrated(app)
  const sets: string[] = []
  const vals: unknown[] = []
  for (const [k, v] of Object.entries(data)) {
    sets.push(`${k} = ?`)
    vals.push(v)
  }
  sets.push('updated_at = ?')
  vals.push(Date.now())
  vals.push(id)
  await app.db.execute(`UPDATE listings SET ${sets.join(', ')} WHERE id = ?`, vals)
}

export async function deleteListing(id: string): Promise<void> {
  await ensureMigrated(app)
  await app.db.execute('DELETE FROM listings WHERE id = ?', [id])
}

// --- Bookings ---

export async function createBooking(
  data: Omit<Booking, 'id' | 'created_at' | 'status'>,
): Promise<string> {
  await ensureMigrated(app)
  const id = uid()
  await app.db.execute(
    `INSERT INTO bookings (id, listing_id, guest_id, guest_name, check_in, check_out, guests, total_price, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [id, data.listing_id, data.guest_id, data.guest_name, data.check_in, data.check_out, data.guests, data.total_price, Date.now()],
  )
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
