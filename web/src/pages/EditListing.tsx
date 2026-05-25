import { useEffect, useState } from 'react'
import type { User } from '@proappstore/sdk'
import { getListing, updateListing } from '../lib/db'
import { app } from '../lib/app'
import { ListingForm, DEFAULT_FORM, type ListingFormData } from '../components/ListingForm'

export function EditListing({
  listingId,
  user,
  onNavigate,
}: {
  listingId: string
  user: User
  onNavigate: (hash: string) => void
}) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ListingFormData>({ ...DEFAULT_FORM })
  const [origLat, setOrigLat] = useState(0)
  const [origLng, setOrigLng] = useState(0)
  const [origLocation, setOrigLocation] = useState('')
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    getListing(listingId).then((l) => {
      if (!l) { onNavigate('#/host'); return }
      if (l.host_id !== user.id) { onNavigate('#/host'); return }
      setData({
        title: l.title, description: l.description,
        price: String(l.price_per_night), location: l.location,
        capacity: l.capacity, bedrooms: l.bedrooms, bathrooms: l.bathrooms,
        amenities: JSON.parse(l.amenities || '[]'),
        rules: JSON.parse(l.house_rules || '[]'),
        cancellationPolicy: (l.cancellation_policy as 'flexible' | 'moderate' | 'strict') || 'flexible',
        checkInTime: l.check_in_time || '15:00',
        checkOutTime: l.check_out_time || '11:00',
        instantBook: !!l.instant_book,
        cleaningFee: String(l.cleaning_fee || 0),
        icalUrl: l.ical_url || '',
      })
      setOrigLocation(l.location)
      setOrigLat(l.lat)
      setOrigLng(l.lng)
      setExistingImages(JSON.parse(l.images || '[]'))
      setLoading(false)
    })
  }, [listingId, user.id, onNavigate])

  function onChange(patch: Partial<ListingFormData>) {
    setData((prev) => ({ ...prev, ...patch }))
  }

  function onAddFiles(files: File[]) {
    setMediaFiles((prev) => [...prev, ...files])
    setNewPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
  }

  function onRemoveNew(i: number) {
    URL.revokeObjectURL(newPreviews[i])
    setMediaFiles((prev) => prev.filter((_, j) => j !== i))
    setNewPreviews((prev) => prev.filter((_, j) => j !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!data.title || !data.price) return
    setSaving(true)
    setSubmitError('')

    try {
      let lat = origLat
      let lng = origLng
      if (data.location.trim() && data.location !== origLocation) {
        try {
          const results = await app.maps.geocode(data.location.trim())
          if (results.length > 0) { lat = results[0].lat; lng = results[0].lng }
        } catch { /* keep existing coords */ }
      }

      const newUrls: string[] = []
      for (let i = 0; i < mediaFiles.length; i++) {
        setUploadProgress(`Uploading ${i + 1}/${mediaFiles.length}...`)
        const result = await app.storage.uploadPublic(`listings/${crypto.randomUUID()}`, mediaFiles[i], mediaFiles[i].type)
        newUrls.push(result.url)
      }

      await updateListing(listingId, {
        title: data.title, description: data.description,
        price_per_night: parseFloat(data.price), location: data.location, lat, lng,
        capacity: data.capacity, bedrooms: data.bedrooms, bathrooms: data.bathrooms,
        amenities: JSON.stringify(data.amenities), images: JSON.stringify([...existingImages, ...newUrls]),
        house_rules: JSON.stringify(data.rules), cancellation_policy: data.cancellationPolicy,
        check_in_time: data.checkInTime, check_out_time: data.checkOutTime,
        instant_book: data.instantBook, cleaning_fee: parseFloat(data.cleaningFee || '0'),
        service_fee_pct: 12, ical_url: data.icalUrl,
      })
      onNavigate(`#/listing/${listingId}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save listing.')
    } finally {
      setSaving(false)
      setUploadProgress('')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <button onClick={() => onNavigate('#/host')} className="mb-4 text-sm font-medium" style={{ color: 'var(--accent)' }}>&larr; Back</button>
      <h1 className="display-font text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Edit listing</h1>
      <ListingForm
        data={data} onChange={onChange}
        existingImages={existingImages} onRemoveExisting={(i) => setExistingImages((prev) => prev.filter((_, j) => j !== i))}
        newFiles={mediaFiles} newPreviews={newPreviews} onAddFiles={onAddFiles} onRemoveNew={onRemoveNew}
        saving={saving} uploadProgress={uploadProgress} submitError={submitError}
        submitLabel="Save changes" onSubmit={handleSubmit}
      />
    </div>
  )
}
