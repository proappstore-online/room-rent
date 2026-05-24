import type { Listing } from '../types'

export function ListingCard({ listing, onClick, isFavorite, onToggleFavorite, avgRating }: {
  listing: Listing; onClick: () => void; isFavorite?: boolean; onToggleFavorite?: () => void; avgRating?: number
}) {
  const media: string[] = JSON.parse(listing.images || '[]')
  const thumb = media[0]
  const isVideo = thumb && (/\.(mp4|mov|webm|ogg)$/i.test(thumb) || thumb.includes('video'))

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(window.location.origin + '#/listing/' + listing.id)
  }

  function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation()
    onToggleFavorite?.()
  }

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl text-left transition-shadow hover:shadow-lg"
      style={{ background: 'var(--panel-strong)', border: '1px solid var(--line)' }}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl" style={{ background: 'var(--paper-deep)' }}>
        {/* Share button */}
        <div
          className="absolute top-2 right-10 z-10 flex h-8 w-8 items-center justify-center rounded-full cursor-pointer"
          style={{ background: 'var(--glass)', color: 'var(--ink)' }}
          onClick={handleShare}
          role="button"
          title="Copy link"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </div>
        {/* Favorite button */}
        {onToggleFavorite && (
          <div
            className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full cursor-pointer"
            style={{ background: 'var(--glass)' }}
            onClick={handleFavorite}
            role="button"
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" stroke={isFavorite ? 'var(--error)' : 'var(--ink)'} strokeWidth="2" fill={isFavorite ? 'var(--error)' : 'none'}>
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          </div>
        )}
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
          {avgRating != null && (
            <span className="flex items-center gap-0.5 text-xs whitespace-nowrap" style={{ color: 'var(--warning)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {avgRating.toFixed(1)}
            </span>
          )}
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
