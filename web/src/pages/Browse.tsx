import { useEffect, useState } from 'react'
import type { Listing } from '../types'
import { getListings } from '../lib/db'
import { ListingCard } from '../components/ListingCard'

export function Browse({ onNavigate }: { onNavigate: (hash: string) => void }) {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [minGuests, setMinGuests] = useState('')
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])

  const AMENITY_OPTIONS = [
    'WiFi', 'Kitchen', 'Washer', 'Dryer', 'Air conditioning', 'Heating',
    'TV', 'Parking', 'Pool', 'Hot tub', 'Gym', 'Elevator',
    'Pets allowed', 'Smoke alarm', 'First aid kit', 'Self check-in',
  ]

  function toggleAmenity(a: string) {
    setSelectedAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])
  }

  const activeFilterCount =
    (priceMin ? 1 : 0) + (priceMax ? 1 : 0) + (minGuests ? 1 : 0) + selectedAmenities.length

  useEffect(() => {
    getListings().then((l) => { setListings(l); setLoading(false) })
  }, [])

  const filtered = listings.filter((l) => {
    if (search) {
      const q = search.toLowerCase()
      if (!l.title.toLowerCase().includes(q) && !l.location.toLowerCase().includes(q)) return false
    }
    if (priceMin && l.price_per_night < Number(priceMin)) return false
    if (priceMax && l.price_per_night > Number(priceMax)) return false
    if (minGuests && l.capacity < Number(minGuests)) return false
    if (selectedAmenities.length > 0) {
      const listingAmenities: string[] = (() => { try { return JSON.parse(l.amenities) } catch { return [] } })()
      if (!selectedAmenities.every((a) => listingAmenities.includes(a))) return false
    }
    return true
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="display-font text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
          Find your next stay
        </h1>
        <div className="mt-3">
          <input
            type="text"
            placeholder="Search by title or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
            }}
          />
        </div>

        {/* Filters toggle */}
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="mt-2 flex items-center gap-1.5 text-sm font-medium"
          style={{ color: 'var(--accent)' }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>

        {filtersOpen && (
          <div
            className="mt-3 rounded-xl p-4 space-y-4"
            style={{ background: 'var(--glass)', border: '1px solid var(--line)' }}
          >
            {/* Price range */}
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Price per night ($)</span>
              <div className="mt-1.5 flex items-center gap-3">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  min="0"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                />
                <span className="text-sm" style={{ color: 'var(--muted)' }}>–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  min="0"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                />
              </div>
            </div>

            {/* Guest capacity */}
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Minimum guests</span>
              <input
                type="number"
                placeholder="Any"
                value={minGuests}
                onChange={(e) => setMinGuests(e.target.value)}
                min="1"
                className="mt-1.5 w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
              />
            </div>

            {/* Amenities */}
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Amenities</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                    style={{
                      background: selectedAmenities.includes(a) ? 'var(--accent)' : 'var(--glass)',
                      color: selectedAmenities.includes(a) ? 'white' : 'var(--ink)',
                      border: `1px solid ${selectedAmenities.includes(a) ? 'var(--accent)' : 'var(--line)'}`,
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => { setPriceMin(''); setPriceMax(''); setMinGuests(''); setSelectedAmenities([]) }}
                className="text-xs font-medium"
                style={{ color: 'var(--muted)' }}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {search || activeFilterCount > 0 ? 'No listings match your search.' : 'No listings yet. Be the first to host!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onClick={() => onNavigate(`#/listing/${listing.id}`)}
            />
          ))}
        </div>
      )}

      <footer className="mt-12 pb-6 text-center">
        <a
          href="https://proappstore.online"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs"
          style={{ color: 'var(--muted)' }}
        >
          Built for proappstore.online
        </a>
      </footer>
    </div>
  )
}
