import { useState } from 'react'
import type { User } from '@proappstore/sdk'
import { createListing } from '../lib/db'
import { app } from '../lib/app'

const AMENITY_OPTIONS = [
  'WiFi', 'Kitchen', 'Washer', 'Dryer', 'Air conditioning', 'Heating',
  'TV', 'Parking', 'Pool', 'Hot tub', 'Gym', 'Elevator',
  'Pets allowed', 'Smoke alarm', 'First aid kit', 'Self check-in',
]

export function CreateListing({
  user,
  onNavigate,
}: {
  user: User
  onNavigate: (hash: string) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [capacity, setCapacity] = useState(2)
  const [bedrooms, setBedrooms] = useState(1)
  const [bathrooms, setBathrooms] = useState(1)
  const [amenities, setAmenities] = useState<string[]>([])
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  function toggleAmenity(a: string) {
    setAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !price) return
    setSaving(true)

    // Upload media to R2
    const mediaUrls: string[] = []
    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i]
      setUploadProgress(`Uploading ${i + 1}/${mediaFiles.length}...`)
      const result = await app.storage.uploadPublic(`listings/${crypto.randomUUID()}`, file, file.type)
      mediaUrls.push(result.url)
    }
    setUploadProgress('')

    const id = await createListing({
      host_id: user.id,
      host_name: user.login,
      host_avatar: user.avatarUrl || '',
      title,
      description,
      price_per_night: parseFloat(price),
      location,
      lat: 0,
      lng: 0,
      capacity,
      bedrooms,
      bathrooms,
      amenities: JSON.stringify(amenities),
      images: JSON.stringify(mediaUrls),
    })

    onNavigate(`#/listing/${id}`)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <button onClick={() => onNavigate('#/host')} className="mb-4 text-sm font-medium" style={{ color: 'var(--accent)' }}>
        &larr; Back
      </button>

      <h1 className="display-font text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
        Create a listing
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <label className="block">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Cozy apartment in downtown"
            required
            className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe your space..."
            className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none"
            style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Price / night ($)</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="1"
              step="0.01"
              required
              className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Location</span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Paris, France"
              className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <label className="block">
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Guests</span>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              min="1"
              max="20"
              className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Bedrooms</span>
            <input
              type="number"
              value={bedrooms}
              onChange={(e) => setBedrooms(Number(e.target.value))}
              min="0"
              max="20"
              className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Bathrooms</span>
            <input
              type="number"
              value={bathrooms}
              onChange={(e) => setBathrooms(Number(e.target.value))}
              min="0"
              max="20"
              className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            />
          </label>
        </div>

        {/* Photos & Videos */}
        <div>
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Photos & Videos</span>
          <label
            className="mt-1 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6"
            style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="text-sm">Tap to upload photos or videos</span>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                setMediaFiles((prev) => [...prev, ...files])
                const newPreviews = files.map((f) => URL.createObjectURL(f))
                setPreviews((prev) => [...prev, ...newPreviews])
              }}
            />
          </label>
          {previews.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {previews.map((url, i) => {
                const file = mediaFiles[i]
                const isVideo = file?.type.startsWith('video/')
                return (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-lg" style={{ background: 'var(--paper-deep)' }}>
                    {isVideo ? (
                      <video src={url} className="h-full w-full object-cover" muted />
                    ) : (
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    )}
                    {isVideo && (
                      <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                        Video
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(url)
                        setMediaFiles((prev) => prev.filter((_, j) => j !== i))
                        setPreviews((prev) => prev.filter((_, j) => j !== i))
                      }}
                      className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          )}
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
                  background: amenities.includes(a) ? 'var(--accent)' : 'var(--glass)',
                  color: amenities.includes(a) ? 'white' : 'var(--ink)',
                  border: `1px solid ${amenities.includes(a) ? 'var(--accent)' : 'var(--line)'}`,
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !title || !price}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {saving ? (uploadProgress || 'Creating...') : 'Create listing'}
        </button>
      </form>
    </div>
  )
}
