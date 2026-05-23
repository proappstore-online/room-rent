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
