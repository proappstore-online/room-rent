import { useEffect, useState } from 'react'
import type { Listing } from '../types'
import { getListings } from '../lib/db'
import { ListingCard } from '../components/ListingCard'

export function Browse({ onNavigate }: { onNavigate: (hash: string) => void }) {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getListings().then((l) => { setListings(l); setLoading(false) })
  }, [])

  const filtered = search
    ? listings.filter((l) =>
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.location.toLowerCase().includes(search.toLowerCase()),
      )
    : listings

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
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {search ? 'No listings match your search.' : 'No listings yet. Be the first to host!'}
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
