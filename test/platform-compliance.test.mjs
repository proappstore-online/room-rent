import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('the checked-in manifest declares an orientation and minimum viewport width', () => {
  const manifest = JSON.parse(read('web/public/manifest.json'))

  assert.equal(manifest.orientation, 'any')
  assert.equal(manifest.min_viewport_width, 360)
})

test('the document head exposes absolute Open Graph and Twitter image URLs', () => {
  const html = read('web/index.html')
  const imageUrl = 'https://room-rent.proappstore.online/icon-512.png'

  assert.match(html, new RegExp(`<meta property="og:image" content="${imageUrl}"`))
  assert.match(html, new RegExp(`<meta name="twitter:image" content="${imageUrl}"`))
})

test('the service worker leaves PAS-reserved routes to the platform', () => {
  const config = read('web/vite.config.ts')

  assert.match(config, /navigateFallbackDenylist:\s*\[\/\^\\\/\\\.pas\\\//)
})

test('controls previously lacking accessible names retain explicit labels', () => {
  const labelledControls = [
    ['web/src/components/Header.tsx', 'aria-label="Sign out"'],
    ['web/src/components/ListingForm.tsx', 'aria-label="New house rule"'],
    ['web/src/components/ListingForm.tsx', 'aria-label={submitLabel}'],
    ['web/src/pages/Browse.tsx', 'aria-label="Search listings"'],
    ['web/src/pages/Browse.tsx', 'aria-label="Sort listings"'],
    ['web/src/pages/Browse.tsx', 'aria-label="Minimum price per night"'],
    ['web/src/pages/Browse.tsx', 'aria-label="Maximum price per night"'],
    ['web/src/pages/Browse.tsx', 'aria-label="Minimum guests"'],
    ['web/src/pages/ListingDetail.tsx', 'aria-label="Review comment"'],
    ['web/src/pages/ListingDetail.tsx', 'aria-label="Submit review"'],
    ['web/src/pages/ListingDetail.tsx', "aria-label={user ? (listing.instant_book ? 'Book now' : 'Request to book') : 'Sign in to book'}"],
    ['web/src/pages/Messages.tsx', 'aria-label="Back to messages"'],
    ['web/src/pages/Messages.tsx', 'aria-label="Message"'],
    ['web/src/pages/SeedListings.tsx', 'aria-label="Generate sample listings"'],
  ]

  for (const [path, label] of labelledControls) {
    assert.ok(read(path).includes(label), `${path} must include ${label}`)
  }
})
