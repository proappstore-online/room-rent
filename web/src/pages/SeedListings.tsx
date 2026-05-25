import { useState } from 'react'
import type { User } from '@proappstore/sdk'
import { app } from '../lib/app'
import { createListing } from '../lib/db'

const SEEDS = [
  {
    title: 'Sunny Loft in Barcelona',
    location: 'Barcelona, Spain',
    lat: 41.3851, lng: 2.1734,
    price: 89, capacity: 4, bedrooms: 2, bathrooms: 1,
    amenities: ['WiFi', 'Kitchen', 'Air conditioning', 'Washer'],
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    ],
  },
  {
    title: 'Cozy Cabin in the Mountains',
    location: 'Chamonix, France',
    lat: 45.9237, lng: 6.8694,
    price: 120, capacity: 6, bedrooms: 3, bathrooms: 2,
    amenities: ['WiFi', 'Kitchen', 'Heating', 'Parking', 'Hot tub'],
    images: [
      'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80',
      'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=80',
    ],
  },
  {
    title: 'Beachfront Villa in Bali',
    location: 'Seminyak, Bali, Indonesia',
    lat: -8.6905, lng: 115.1685,
    price: 195, capacity: 8, bedrooms: 4, bathrooms: 3,
    amenities: ['WiFi', 'Kitchen', 'Pool', 'Air conditioning', 'Parking', 'TV'],
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
      'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80',
    ],
  },
  {
    title: 'Modern Studio in Tokyo',
    location: 'Shibuya, Tokyo, Japan',
    lat: 35.6595, lng: 139.7004,
    price: 65, capacity: 2, bedrooms: 1, bathrooms: 1,
    amenities: ['WiFi', 'Air conditioning', 'TV', 'Washer', 'Self check-in'],
    images: [
      'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&q=80',
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
    ],
  },
  {
    title: 'Rustic Farmhouse in Tuscany',
    location: 'Siena, Tuscany, Italy',
    lat: 43.3188, lng: 11.3308,
    price: 150, capacity: 10, bedrooms: 5, bathrooms: 3,
    amenities: ['WiFi', 'Kitchen', 'Pool', 'Parking', 'Pets allowed', 'Gym'],
    images: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
      'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=800&q=80',
    ],
  },
  {
    title: 'Downtown Penthouse in New York',
    location: 'Manhattan, New York, USA',
    lat: 40.7580, lng: -73.9855,
    price: 275, capacity: 4, bedrooms: 2, bathrooms: 2,
    amenities: ['WiFi', 'Kitchen', 'Air conditioning', 'TV', 'Elevator', 'Gym', 'Self check-in'],
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
    ],
  },
]

const HOUSE_RULES_POOL = [
  'No smoking', 'No pets', 'No parties or events', 'Quiet hours after 10 PM',
  'No shoes indoors', 'Take out trash before checkout', 'Respect the neighbors',
  'No unregistered guests', 'Lock the door when you leave',
]

const CANCELLATION_POLICIES: ('flexible' | 'moderate' | 'strict')[] = ['flexible', 'moderate', 'strict']

const CHECK_IN_TIMES = ['14:00', '15:00', '16:00']
const CHECK_OUT_TIMES = ['10:00', '11:00', '12:00']

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

export function SeedListings({
  user,
  onNavigate,
}: {
  user: User
  onNavigate: (hash: string) => void
}) {
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    setDone(false)

    try {
      for (let i = 0; i < SEEDS.length; i++) {
        const seed = SEEDS[i]
        setProgress(`Generating ${i + 1}/${SEEDS.length}...`)

        let description = ''
        try {
          const result = await app.ai.generate(
            `Write a 2-3 sentence Airbnb listing description for: ${seed.title} in ${seed.location}. ${seed.capacity} guests, ${seed.bedrooms} bedrooms. Mention the amenities: ${seed.amenities.join(', ')}. Be warm and inviting.`,
            { model: 'fast' },
          )
          description = result.text.trim()
        } catch {
          description = `Welcome to ${seed.title}! This lovely space in ${seed.location} comfortably hosts ${seed.capacity} guests across ${seed.bedrooms} bedrooms. Enjoy amenities like ${seed.amenities.join(', ')}.`
        }

        await createListing({
          host_id: user.id,
          host_name: user.login,
          host_avatar: user.avatarUrl || '',
          title: seed.title,
          description,
          price_per_night: seed.price,
          location: seed.location,
          lat: seed.lat,
          lng: seed.lng,
          capacity: seed.capacity,
          bedrooms: seed.bedrooms,
          bathrooms: seed.bathrooms,
          amenities: JSON.stringify(seed.amenities),
          images: JSON.stringify(seed.images),
          house_rules: JSON.stringify(pickN(HOUSE_RULES_POOL, 2 + Math.floor(Math.random() * 3))),
          cancellation_policy: pick(CANCELLATION_POLICIES),
          check_in_time: pick(CHECK_IN_TIMES),
          check_out_time: pick(CHECK_OUT_TIMES),
          instant_book: Math.random() > 0.5,
          cleaning_fee: 10 + Math.floor(Math.random() * 41),
          service_fee_pct: 12,
          ical_url: '',
        })
      }

      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate listings.')
    } finally {
      setGenerating(false)
      setProgress('')
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <button onClick={() => onNavigate('#/')} className="mb-4 text-sm font-medium" style={{ color: 'var(--accent)' }}>
        &larr; Back
      </button>

      <h1 className="display-font text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
        Generate sample listings
      </h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
        Creates 6 diverse listings with AI-generated descriptions and stock photos. Great for testing the app.
      </p>

      {!done && (
        <button
          type="button"
          disabled={generating}
          onClick={handleGenerate}
          className="mt-6 w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {generating ? progress || 'Starting...' : 'Generate sample listings'}
        </button>
      )}

      {generating && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
          />
          <span className="text-sm" style={{ color: 'var(--muted)' }}>{progress}</span>
        </div>
      )}

      {error && (
        <p className="mt-4 text-center text-sm" style={{ color: 'var(--error)' }}>{error}</p>
      )}

      {done && (
        <div className="mt-8 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
            All 6 listings created successfully!
          </p>
          <button
            type="button"
            onClick={() => onNavigate('#/')}
            className="mt-4 rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            Browse listings
          </button>
        </div>
      )}
    </div>
  )
}
