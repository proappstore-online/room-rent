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
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)

  function toggleAmenity(a: string) {
    setAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !price) return
    setSaving(true)

    // Upload images to R2
    const imageUrls: string[] = []
    for (const file of imageFiles) {
      const result = await app.storage.uploadPublic(`listings/${crypto.randomUUID()}`, file, file.type)
      imageUrls.push(result.url)
    }

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
      images: JSON.stringify(imageUrls),
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

        {/* Images */}
        <label className="block">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Photos</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
            className="mt-1 w-full text-sm"
            style={{ color: 'var(--muted)' }}
          />
          {imageFiles.length > 0 && (
            <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{imageFiles.length} photo{imageFiles.length !== 1 ? 's' : ''} selected</p>
          )}
        </label>

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
          {saving ? 'Creating...' : 'Create listing'}
        </button>
      </form>
    </div>
  )
}
