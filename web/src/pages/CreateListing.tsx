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
  const [rules, setRules] = useState<string[]>([])
  const [ruleInput, setRuleInput] = useState('')
  const [cancellationPolicy, setCancellationPolicy] = useState<'flexible' | 'moderate' | 'strict'>('flexible')
  const [checkInTime, setCheckInTime] = useState('15:00')
  const [checkOutTime, setCheckOutTime] = useState('11:00')
  const [instantBook, setInstantBook] = useState(false)
  const [cleaningFee, setCleaningFee] = useState('')
  const [icalUrl, setIcalUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  function toggleAmenity(a: string) {
    setAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])
  }

  const [submitError, setSubmitError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !price) return
    setSaving(true)
    setSubmitError('')

    try {
    // Geocode location
    let lat = 0
    let lng = 0
    if (location.trim()) {
      try {
        const results = await app.maps.geocode(location.trim())
        if (results.length > 0) {
          lat = results[0].lat
          lng = results[0].lng
        }
      } catch {
        // fallback to 0,0
      }
    }

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
      lat,
      lng,
      capacity,
      bedrooms,
      bathrooms,
      amenities: JSON.stringify(amenities),
      images: JSON.stringify(mediaUrls),
      house_rules: JSON.stringify(rules),
      cancellation_policy: cancellationPolicy,
      check_in_time: checkInTime,
      check_out_time: checkOutTime,
      instant_book: instantBook,
      cleaning_fee: parseFloat(cleaningFee || '0'),
      service_fee_pct: 12,
      ical_url: icalUrl,
    })

    onNavigate(`#/listing/${id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create listing.')
    } finally {
      setSaving(false)
      setUploadProgress('')
    }
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        {/* House rules */}
        <div>
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>House rules</span>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={ruleInput}
              onChange={(e) => setRuleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (ruleInput.trim()) {
                    setRules((prev) => [...prev, ruleInput.trim()])
                    setRuleInput('')
                  }
                }
              }}
              placeholder="e.g. No smoking"
              className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            />
            <button
              type="button"
              onClick={() => {
                if (ruleInput.trim()) {
                  setRules((prev) => [...prev, ruleInput.trim()])
                  setRuleInput('')
                }
              }}
              className="rounded-xl px-4 py-2.5 text-sm font-medium"
              style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            >
              Add
            </button>
          </div>
          {rules.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {rules.map((rule, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                  {rule}
                  <button type="button" onClick={() => setRules((prev) => prev.filter((_, j) => j !== i))} className="ml-0.5 text-xs" style={{ color: 'var(--muted)' }}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Cancellation policy */}
        <label className="block">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Cancellation policy</span>
          <select
            value={cancellationPolicy}
            onChange={(e) => setCancellationPolicy(e.target.value as 'flexible' | 'moderate' | 'strict')}
            className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          >
            <option value="flexible">Flexible</option>
            <option value="moderate">Moderate</option>
            <option value="strict">Strict</option>
          </select>
        </label>

        {/* Check-in / Check-out times */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Check-in time</span>
            <input
              type="time"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Check-out time</span>
            <input
              type="time"
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            />
          </label>
        </div>

        {/* Instant book + Cleaning fee */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Instant book</span>
            <label className="mt-1 flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setInstantBook(!instantBook)}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{ background: instantBook ? 'var(--accent)' : 'var(--line)' }}
              >
                <span
                  className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
                  style={{ transform: instantBook ? 'translateX(24px)' : 'translateX(4px)' }}
                />
              </div>
              <span className="text-sm" style={{ color: 'var(--muted)' }}>{instantBook ? 'On' : 'Off'}</span>
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Cleaning fee ($)</span>
            <input
              type="number"
              value={cleaningFee}
              onChange={(e) => setCleaningFee(e.target.value)}
              min="0"
              step="0.01"
              placeholder="0"
              className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            />
          </label>
        </div>

        {/* Service fee */}
        <label className="block">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Platform service fee</span>
          <input
            type="number"
            value={12}
            readOnly
            className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{ background: 'var(--paper-deep)', border: '1px solid var(--line)', color: 'var(--muted)' }}
          />
          <span className="mt-1 block text-xs" style={{ color: 'var(--muted)' }}>Service fee is 12% and cannot be changed.</span>
        </label>

        {/* External calendar */}
        <label className="block">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>External calendar (iCal URL)</span>
          <input
            type="url"
            value={icalUrl}
            onChange={(e) => setIcalUrl(e.target.value)}
            placeholder="https://www.airbnb.com/calendar/ical/..."
            className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
          <span className="mt-1 block text-xs" style={{ color: 'var(--muted)' }}>Paste your Airbnb or Booking.com iCal link to sync availability</span>
        </label>

        <button
          type="submit"
          disabled={saving || !title || !price}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {saving ? (uploadProgress || 'Creating...') : 'Create listing'}
        </button>
        {submitError && (
          <p className="mt-2 text-center text-sm" style={{ color: 'var(--error)' }}>{submitError}</p>
        )}
      </form>
    </div>
  )
}
