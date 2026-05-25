import { useEffect, useState } from 'react'
import type { User } from '@proappstore/sdk'
import type { Listing } from '../types'
import { getFavoriteListings, toggleFavorite } from '../lib/db'
import { ListingCard } from '../components/ListingCard'

export function Wishlists({
  user,
  onNavigate,
}: {
  user: User
  onNavigate: (hash: string) => void
}) {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFavoriteListings(user.id)
      .then((l) => { setListings(l); setLoading(false) })
      .catch(() => { setLoading(false) })
  }, [user.id])

  async function handleUnfavorite(listingId: string) {
    await toggleFavorite(user.id, listingId)
    setListings((prev) => prev.filter((l) => l.id !== listingId))
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="display-font text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
        Wishlists
      </h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : listings.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No saved listings yet.</p>
          <button onClick={() => onNavigate('#/')} className="mt-3 text-sm font-medium" style={{ color: 'var(--accent)' }}>
            Browse listings &rarr;
          </button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onClick={() => onNavigate(`#/listing/${listing.id}`)}
              isFavorite={true}
              onToggleFavorite={() => handleUnfavorite(listing.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
