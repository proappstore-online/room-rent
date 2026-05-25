import { useState } from 'react'

const AMENITY_OPTIONS = [
  'WiFi', 'Kitchen', 'Washer', 'Dryer', 'Air conditioning', 'Heating',
  'TV', 'Parking', 'Pool', 'Hot tub', 'Gym', 'Elevator',
  'Pets allowed', 'Smoke alarm', 'First aid kit', 'Self check-in',
]

export interface ListingFormData {
  title: string
  description: string
  price: string
  location: string
  capacity: number
  bedrooms: number
  bathrooms: number
  amenities: string[]
  rules: string[]
  cancellationPolicy: 'flexible' | 'moderate' | 'strict'
  checkInTime: string
  checkOutTime: string
  instantBook: boolean
  cleaningFee: string
  icalUrl: string
}

export const DEFAULT_FORM: ListingFormData = {
  title: '', description: '', price: '', location: '',
  capacity: 2, bedrooms: 1, bathrooms: 1,
  amenities: [], rules: [],
  cancellationPolicy: 'flexible',
  checkInTime: '15:00', checkOutTime: '11:00',
  instantBook: false, cleaningFee: '', icalUrl: '',
}

export function ListingForm({
  data, onChange, existingImages, onRemoveExisting, newFiles, newPreviews, onAddFiles, onRemoveNew,
  saving, uploadProgress, submitError, submitLabel,
  onSubmit,
}: {
  data: ListingFormData
  onChange: (patch: Partial<ListingFormData>) => void
  existingImages?: string[]
  onRemoveExisting?: (i: number) => void
  newFiles: File[]
  newPreviews: string[]
  onAddFiles: (files: File[]) => void
  onRemoveNew: (i: number) => void
  saving: boolean
  uploadProgress: string
  submitError: string
  submitLabel: string
  onSubmit: (e: React.FormEvent) => void
}) {
  const [ruleInput, setRuleInput] = useState('')

  function toggleAmenity(a: string) {
    const next = data.amenities.includes(a)
      ? data.amenities.filter((x) => x !== a)
      : [...data.amenities, a]
    onChange({ amenities: next })
  }

  function addRule() {
    if (!ruleInput.trim()) return
    onChange({ rules: [...data.rules, ruleInput.trim()] })
    setRuleInput('')
  }

  const inputStyle = { background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5">
      <label className="block">
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Title</span>
        <input type="text" value={data.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Cozy apartment in downtown" required className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={inputStyle} />
      </label>

      <label className="block">
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Description</span>
        <textarea value={data.description} onChange={(e) => onChange({ description: e.target.value })} rows={4} placeholder="Describe your space..." className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none" style={inputStyle} />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Price / night ($)</span>
          <input type="number" value={data.price} onChange={(e) => onChange({ price: e.target.value })} min="1" step="0.01" required className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={inputStyle} />
        </label>
        <label className="block">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Location</span>
          <input type="text" value={data.location} onChange={(e) => onChange({ location: e.target.value })} placeholder="Paris, France" className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={inputStyle} />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="block">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Guests</span>
          <input type="number" value={data.capacity} onChange={(e) => onChange({ capacity: Number(e.target.value) })} min="1" max="20" className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={inputStyle} />
        </label>
        <label className="block">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Bedrooms</span>
          <input type="number" value={data.bedrooms} onChange={(e) => onChange({ bedrooms: Number(e.target.value) })} min="0" max="20" className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={inputStyle} />
        </label>
        <label className="block">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Bathrooms</span>
          <input type="number" value={data.bathrooms} onChange={(e) => onChange({ bathrooms: Number(e.target.value) })} min="0" max="20" className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={inputStyle} />
        </label>
      </div>

      {/* Media upload */}
      <div>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Photos & Videos</span>
        <label className="mt-1 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="text-sm">Tap to upload photos or videos</span>
          <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => onAddFiles(Array.from(e.target.files || []))} />
        </label>
        {((existingImages?.length ?? 0) > 0 || newPreviews.length > 0) && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {existingImages?.map((url, i) => {
              const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(url) || url.includes('video')
              return (
                <div key={`ex-${i}`} className="group relative aspect-square overflow-hidden rounded-lg" style={{ background: 'var(--paper-deep)' }}>
                  {isVideo ? <video src={url} className="h-full w-full object-cover" muted /> : <img src={url} alt="" className="h-full w-full object-cover" />}
                  {onRemoveExisting && (
                    <button type="button" onClick={() => onRemoveExisting(i)} className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">×</button>
                  )}
                </div>
              )
            })}
            {newPreviews.map((url, i) => {
              const file = newFiles[i]
              const isVideo = file?.type.startsWith('video/')
              return (
                <div key={`new-${i}`} className="group relative aspect-square overflow-hidden rounded-lg" style={{ background: 'var(--paper-deep)' }}>
                  {isVideo ? <video src={url} className="h-full w-full object-cover" muted /> : <img src={url} alt="" className="h-full w-full object-cover" />}
                  {isVideo && <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">Video</div>}
                  <button type="button" onClick={() => onRemoveNew(i)} className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">×</button>
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
            <button key={a} type="button" onClick={() => toggleAmenity(a)} className="rounded-full px-3 py-1 text-xs font-medium transition-colors" style={{
              background: data.amenities.includes(a) ? 'var(--accent)' : 'var(--glass)',
              color: data.amenities.includes(a) ? 'white' : 'var(--ink)',
              border: `1px solid ${data.amenities.includes(a) ? 'var(--accent)' : 'var(--line)'}`,
            }}>{a}</button>
          ))}
        </div>
      </div>

      {/* House rules */}
      <div>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>House rules</span>
        <div className="mt-1 flex gap-2">
          <input type="text" value={ruleInput} onChange={(e) => setRuleInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRule() } }} placeholder="e.g. No smoking" className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none" style={inputStyle} />
          <button type="button" onClick={addRule} className="rounded-xl px-4 py-2.5 text-sm font-medium" style={{ ...inputStyle }}>Add</button>
        </div>
        {data.rules.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {data.rules.map((rule, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium" style={{ ...inputStyle }}>
                {rule}
                <button type="button" onClick={() => onChange({ rules: data.rules.filter((_, j) => j !== i) })} className="ml-0.5 text-xs" style={{ color: 'var(--muted)' }}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Cancellation policy */}
      <label className="block">
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Cancellation policy</span>
        <select value={data.cancellationPolicy} onChange={(e) => onChange({ cancellationPolicy: e.target.value as 'flexible' | 'moderate' | 'strict' })} className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={inputStyle}>
          <option value="flexible">Flexible</option>
          <option value="moderate">Moderate</option>
          <option value="strict">Strict</option>
        </select>
      </label>

      {/* Check-in / Check-out */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Check-in time</span>
          <input type="time" value={data.checkInTime} onChange={(e) => onChange({ checkInTime: e.target.value })} className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={inputStyle} />
        </label>
        <label className="block">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Check-out time</span>
          <input type="time" value={data.checkOutTime} onChange={(e) => onChange({ checkOutTime: e.target.value })} className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={inputStyle} />
        </label>
      </div>

      {/* Instant book + Cleaning fee */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Instant book</span>
          <label className="mt-1 flex items-center gap-3 cursor-pointer">
            <div onClick={() => onChange({ instantBook: !data.instantBook })} className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" style={{ background: data.instantBook ? 'var(--accent)' : 'var(--line)' }}>
              <span className="inline-block h-4 w-4 rounded-full bg-white transition-transform" style={{ transform: data.instantBook ? 'translateX(24px)' : 'translateX(4px)' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>{data.instantBook ? 'On' : 'Off'}</span>
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Cleaning fee ($)</span>
          <input type="number" value={data.cleaningFee} onChange={(e) => onChange({ cleaningFee: e.target.value })} min="0" step="0.01" placeholder="0" className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={inputStyle} />
        </label>
      </div>

      {/* Service fee */}
      <label className="block">
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Platform service fee</span>
        <input type="number" value={12} readOnly className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={{ background: 'var(--paper-deep)', border: '1px solid var(--line)', color: 'var(--muted)' }} />
        <span className="mt-1 block text-xs" style={{ color: 'var(--muted)' }}>Service fee is 12% and cannot be changed.</span>
      </label>

      {/* iCal */}
      <label className="block">
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>External calendar (iCal URL)</span>
        <input type="url" value={data.icalUrl} onChange={(e) => onChange({ icalUrl: e.target.value })} placeholder="https://www.airbnb.com/calendar/ical/..." className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={inputStyle} />
        <span className="mt-1 block text-xs" style={{ color: 'var(--muted)' }}>Paste your Airbnb or Booking.com iCal link to sync availability</span>
      </label>

      <button type="submit" disabled={saving || !data.title || !data.price} className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>
        {saving ? (uploadProgress || 'Saving...') : submitLabel}
      </button>
      {submitError && <p className="mt-2 text-center text-sm" style={{ color: 'var(--error)' }}>{submitError}</p>}
    </form>
  )
}
