import type { ProAppStore } from '@proappstore/sdk'

const migrations: { up: string; safe?: boolean }[] = [
  {
    up: `CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      host_id TEXT NOT NULL,
      host_name TEXT NOT NULL DEFAULT '',
      host_avatar TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price_per_night REAL NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      lat REAL NOT NULL DEFAULT 0,
      lng REAL NOT NULL DEFAULT 0,
      capacity INTEGER NOT NULL DEFAULT 1,
      bedrooms INTEGER NOT NULL DEFAULT 1,
      bathrooms INTEGER NOT NULL DEFAULT 1,
      amenities TEXT NOT NULL DEFAULT '[]',
      images TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
  },
  {
    up: `CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      guest_id TEXT NOT NULL,
      guest_name TEXT NOT NULL DEFAULT '',
      check_in TEXT NOT NULL,
      check_out TEXT NOT NULL,
      guests INTEGER NOT NULL DEFAULT 1,
      total_price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (listing_id) REFERENCES listings(id)
    )`,
  },
  {
    up: `CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      booking_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL DEFAULT '',
      author_avatar TEXT NOT NULL DEFAULT '',
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (listing_id) REFERENCES listings(id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    )`,
  },
  {
    up: `CREATE INDEX IF NOT EXISTS idx_listings_host ON listings(host_id)`,
  },
  {
    up: `CREATE INDEX IF NOT EXISTS idx_bookings_listing ON bookings(listing_id)`,
  },
  {
    up: `CREATE INDEX IF NOT EXISTS idx_bookings_guest ON bookings(guest_id)`,
  },
  {
    up: `CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id)`,
  },
  { up: `ALTER TABLE listings ADD COLUMN house_rules TEXT NOT NULL DEFAULT '[]'`, safe: true },
  { up: `ALTER TABLE listings ADD COLUMN cancellation_policy TEXT NOT NULL DEFAULT 'flexible'`, safe: true },
  { up: `ALTER TABLE listings ADD COLUMN check_in_time TEXT NOT NULL DEFAULT '15:00'`, safe: true },
  { up: `ALTER TABLE listings ADD COLUMN check_out_time TEXT NOT NULL DEFAULT '11:00'`, safe: true },
  { up: `ALTER TABLE listings ADD COLUMN instant_book INTEGER NOT NULL DEFAULT 0`, safe: true },
  { up: `ALTER TABLE listings ADD COLUMN cleaning_fee REAL NOT NULL DEFAULT 0`, safe: true },
  { up: `ALTER TABLE listings ADD COLUMN service_fee_pct REAL NOT NULL DEFAULT 12`, safe: true },
  {
    up: `CREATE TABLE IF NOT EXISTS favorites (
      user_id TEXT NOT NULL,
      listing_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, listing_id)
    )`,
  },
  { up: `CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id)` },
  {
    up: `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL DEFAULT '',
      recipient_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
  },
  { up: `CREATE INDEX IF NOT EXISTS idx_messages_listing ON messages(listing_id)` },
  { up: `CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id)` },
]

let migrated = false

export async function ensureMigrated(app: ProAppStore) {
  if (migrated) return
  for (const m of migrations) {
    if (m.safe) {
      try { await app.db.execute(m.up) } catch { /* column already exists */ }
    } else {
      await app.db.execute(m.up)
    }
  }
  migrated = true
}
