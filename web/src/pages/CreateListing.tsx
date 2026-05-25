import { useState } from 'react'
import type { User } from '@proappstore/sdk'
import { createListing } from '../lib/db'
import { app } from '../lib/app'
import { ListingForm, DEFAULT_FORM, type ListingFormData } from '../components/ListingForm'

export function CreateListing({
  user,
  onNavigate,
}: {
  user: User
  onNavigate: (hash: string) => void
}) {
  const [data, setData] = useState<ListingFormData>({ ...DEFAULT_FORM })
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [submitError, setSubmitError] = useState('')

  function onChange(patch: Partial<ListingFormData>) {
    setData((prev) => ({ ...prev, ...patch }))
  }

  function onAddFiles(files: File[]) {
    setMediaFiles((prev) => [...prev, ...files])
    setPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
  }

  function onRemoveNew(i: number) {
    URL.revokeObjectURL(previews[i])
    setMediaFiles((prev) => prev.filter((_, j) => j !== i))
    setPreviews((prev) => prev.filter((_, j) => j !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!data.title || !data.price) return
    setSaving(true)
    setSubmitError('')

    try {
      let lat = 0
      let lng = 0
      if (data.location.trim()) {
        try {
          const results = await app.maps.geocode(data.location.trim())
          if (results.length > 0) { lat = results[0].lat; lng = results[0].lng }
        } catch { /* fallback to 0,0 */ }
      }

      const mediaUrls: string[] = []
      for (let i = 0; i < mediaFiles.length; i++) {
        setUploadProgress(`Uploading ${i + 1}/${mediaFiles.length}...`)
        const result = await app.storage.uploadPublic(`listings/${crypto.randomUUID()}`, mediaFiles[i], mediaFiles[i].type)
        mediaUrls.push(result.url)
      }

      const id = await createListing({
        host_id: user.id, host_name: user.login, host_avatar: user.avatarUrl || '',
        title: data.title, description: data.description,
        price_per_night: parseFloat(data.price), location: data.location, lat, lng,
        capacity: data.capacity, bedrooms: data.bedrooms, bathrooms: data.bathrooms,
        amenities: JSON.stringify(data.amenities), images: JSON.stringify(mediaUrls),
        house_rules: JSON.stringify(data.rules), cancellation_policy: data.cancellationPolicy,
        check_in_time: data.checkInTime, check_out_time: data.checkOutTime,
        instant_book: data.instantBook, cleaning_fee: parseFloat(data.cleaningFee || '0'),
        service_fee_pct: 12, ical_url: data.icalUrl,
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
      <button onClick={() => onNavigate('#/host')} className="mb-4 text-sm font-medium" style={{ color: 'var(--accent)' }}>&larr; Back</button>
      <h1 className="display-font text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Create a listing</h1>
      <ListingForm
        data={data} onChange={onChange}
        newFiles={mediaFiles} newPreviews={previews} onAddFiles={onAddFiles} onRemoveNew={onRemoveNew}
        saving={saving} uploadProgress={uploadProgress} submitError={submitError}
        submitLabel="Create listing" onSubmit={handleSubmit}
      />
    </div>
  )
}
