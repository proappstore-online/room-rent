import type { Listing } from '../types'

export function ListingCard({ listing, onClick }: { listing: Listing; onClick: () => void }) {
  const media: string[] = JSON.parse(listing.images || '[]')
  const thumb = media[0]
  const isVideo = thumb && (/\.(mp4|mov|webm|ogg)$/i.test(thumb) || thumb.includes('video'))

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl text-left transition-shadow hover:shadow-lg"
      style={{ background: 'var(--panel-strong)', border: '1px solid var(--line)' }}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl" style={{ background: 'var(--paper-deep)' }}>
        {thumb ? (
          isVideo ? (
            <>
              <video src={thumb} muted playsInline className="h-full w-full object-cover" />
              <div className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">Video</div>
            </>
          ) : (
            <img src={thumb} alt={listing.title} className="h-full w-full object-cover" />
          )
        ) : (
          <div className="flex h-full items-center justify-center" style={{ color: 'var(--muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight" style={{ color: 'var(--ink)' }}>{listing.title}</h3>
        </div>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>{listing.location}</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
          {listing.capacity} guest{listing.capacity !== 1 ? 's' : ''} · {listing.bedrooms} bed{listing.bedrooms !== 1 ? 's' : ''} · {listing.bathrooms} bath{listing.bathrooms !== 1 ? 's' : ''}
        </p>
        <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          ${listing.price_per_night}<span className="font-normal" style={{ color: 'var(--muted)' }}> / night</span>
        </p>
      </div>
    </button>
  )
}
