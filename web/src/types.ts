export interface Listing {
  id: string
  host_id: string
  host_name: string
  host_avatar: string
  title: string
  description: string
  price_per_night: number
  location: string
  lat: number
  lng: number
  capacity: number
  bedrooms: number
  bathrooms: number
  amenities: string // JSON array
  images: string // JSON array of storage URLs
  house_rules: string // JSON array of strings
  cancellation_policy: 'flexible' | 'moderate' | 'strict'
  check_in_time: string // e.g. "15:00"
  check_out_time: string // e.g. "11:00"
  instant_book: boolean
  cleaning_fee: number
  service_fee_pct: number // percentage, e.g. 12
  ical_url: string
  created_at: number
  updated_at: number
}

export interface Booking {
  id: string
  listing_id: string
  guest_id: string
  guest_name: string
  check_in: string // YYYY-MM-DD
  check_out: string // YYYY-MM-DD
  guests: number
  total_price: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  created_at: number
}

export interface Review {
  id: string
  listing_id: string
  booking_id: string
  author_id: string
  author_name: string
  author_avatar: string
  rating: number // 1-5
  comment: string
  created_at: number
}
