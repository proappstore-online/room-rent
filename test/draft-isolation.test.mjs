// Component tests for ListingDetail draft isolation. The real App and
// ListingDetail are mounted with ReactDOM in jsdom; only the data layer,
// SDK hooks and app client are replaced with in-memory synthetic stubs, so
// no production reads or writes happen.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { after, afterEach, before, test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const webRoot = fileURLToPath(new URL('../web/', import.meta.url))
const requireWeb = createRequire(`${webRoot}package.json`)
const { JSDOM } = requireWeb('jsdom')

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://room-rent.proappstore.online/#/',
  pretendToBeVisual: true,
})
const { window } = dom
for (const key of ['window', 'document', 'location', 'navigator', 'HTMLElement', 'Node', 'Event']) {
  Object.defineProperty(globalThis, key, { value: key === 'window' ? window : window[key], configurable: true, writable: true })
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const React = requireWeb('react')
const { createRoot } = requireWeb('react-dom/client')
const { act } = React

const listings = {
  'loft-a': listing('loft-a', 'Loft A'),
  'cabin-b': listing('cabin-b', 'Cabin B'),
}
const alice = { id: 'alice', login: 'alice', avatarUrl: '' }
const bob = { id: 'bob', login: 'bob', avatarUrl: '' }

function listing(id, title) {
  return {
    id, title, host_id: 'host', host_name: 'Hosta', host_avatar: '', description: '', location: 'Somewhere',
    lat: 0, lng: 0, price_per_night: 100, capacity: 4, bedrooms: 1, bathrooms: 1, amenities: '[]',
    images: '[]', house_rules: '[]', cancellation_policy: 'flexible', check_in_time: '15:00',
    check_out_time: '11:00', instant_book: false, cleaning_fee: 0, service_fee_pct: 12, ical_url: '',
    created_at: 0, updated_at: 0,
  }
}

const authListeners = new Set()
let authState
const roomRent = {
  React,
  auth: {
    get: () => authState,
    subscribe: (listener) => { authListeners.add(listener); return () => authListeners.delete(listener) },
  },
  db: {},
}
globalThis.__roomRent = roomRent

function setUser(user) {
  authState = { user, loading: false, signOut: () => setUser(null) }
  for (const listener of authListeners) listener()
}

function resetDb() {
  const calls = { createBooking: [], createReview: [] }
  roomRent.db = {
    getListing: async (id) => listings[id] ?? null,
    getReviewsForListing: async () => [],
    canLeaveReview: async () => true,
    getBookingsForListing: async (listingId) => [alice, bob].map((u) => ({ id: `${listingId}-${u.id}`, guest_id: u.id, status: 'completed' })),
    createBooking: async (data) => { calls.createBooking.push(data); return 'booking-id' },
    createReview: async (data) => { calls.createReview.push(data); return 'review-id' },
  }
  return calls
}

// Every db export the app imports is routed to the per-test stubs above.
const dbExports = [...readFileSync(new URL('../web/src/lib/db/index.ts', import.meta.url), 'utf8')
  .matchAll(/^export async function (\w+)/gm)].map((m) => m[1])

const mocks = {
  name: 'room-rent-test-mocks',
  enforce: 'pre',
  resolveId(id) {
    if (id === '@proappstore/sdk/hooks') return '\0mock:hooks'
    const lib = id.match(/(?:^|\/)lib\/(db|app)$/)
    if (lib) return `\0mock:${lib[1]}`
  },
  load(id) {
    if (id === '\0mock:db') {
      return dbExports.map((name) => `export const ${name} = (...args) => globalThis.__roomRent.db.${name}(...args)`).join('\n')
    }
    if (id === '\0mock:app') return 'export const app = {}'
    if (id === '\0mock:hooks') {
      return `const { React, auth } = globalThis.__roomRent
export function useProAuth() { return React.useSyncExternalStore(auth.subscribe, auth.get) }
export function useProNotifications() { return { permission: 'default', isSubscribed: false, subscribe() {}, unsubscribe() {}, loading: false } }`
    }
  },
}

let server
let App
let root

before(async () => {
  const { createServer } = await import(pathToFileURL(requireWeb.resolve('vite')).href)
  server = await createServer({
    root: webRoot,
    configFile: false,
    logLevel: 'error',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, ws: false },
    oxc: { jsx: { runtime: 'automatic' } },
    // Let the stub resolver see SDK imports instead of externalizing them.
    ssr: { noExternal: ['@proappstore/sdk'] },
    plugins: [mocks],
  })
  App = (await server.ssrLoadModule('/src/App.tsx')).default
})

after(async () => {
  await server?.close()
  window.close()
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
})

async function flush() {
  for (let i = 0; i < 3; i++) await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
}

async function mount(hash, user) {
  window.location.hash = hash
  setUser(user)
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(React.createElement(App)))
  await flush()
}

async function navigate(hash) {
  window.location.hash = hash
  await flush()
}

async function changeUser(user) {
  await act(async () => setUser(user))
  await flush()
}

const $ = (selector) => document.querySelector(selector)
const dateInputs = () => document.querySelectorAll('#booking-card input[type="date"]')
const reviewBox = () => $('textarea[aria-label="Review comment"]')
const starButtons = () => [...reviewBox().parentElement.querySelectorAll('button[type="button"]')]

async function setValue(el, value) {
  const proto = Object.getPrototypeOf(el)
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
  await act(async () => el.dispatchEvent(new window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })))
}

async function click(el) {
  await act(async () => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })))
  await flush()
}

function drafts() {
  const [checkIn, checkOut] = dateInputs()
  return {
    title: $('h1')?.textContent,
    checkIn: checkIn.value,
    checkOut: checkOut.value,
    guests: $('#booking-card select').value,
    rating: reviewBox() ? starButtons().filter((b) => b.textContent === '★').length : null,
    comment: reviewBox()?.value ?? null,
  }
}

async function fillDrafts({ review = true } = {}) {
  const [checkIn, checkOut] = dateInputs()
  await setValue(checkIn, '2026-11-02')
  await setValue(checkOut, '2026-11-05')
  await setValue($('#booking-card select'), '3')
  if (review) {
    await click(starButtons()[3])
    await setValue(reviewBox(), 'Lovely stay')
  }
}

const filled = { checkIn: '2026-11-02', checkOut: '2026-11-05', guests: '3', rating: 4, comment: 'Lovely stay' }
const defaults = { checkIn: '', checkOut: '', guests: '1', rating: 0, comment: '' }

test('switching listings resets booking and review drafts to defaults', async () => {
  resetDb()
  await mount('#/listing/loft-a', alice)
  await fillDrafts()
  assert.deepEqual(drafts(), { title: 'Loft A', ...filled })

  await navigate('#/listing/cabin-b')
  assert.deepEqual(drafts(), { title: 'Cabin B', ...defaults })

  await navigate('#/listing/loft-a')
  assert.deepEqual(drafts(), { title: 'Loft A', ...defaults })
})

test('switching accounts on the same listing resets drafts to defaults', async () => {
  resetDb()
  await mount('#/listing/loft-a', alice)
  await fillDrafts()
  assert.deepEqual(drafts(), { title: 'Loft A', ...filled })

  await changeUser(bob)
  assert.deepEqual(drafts(), { title: 'Loft A', ...defaults })
})

test('signing out and back in resets drafts at each transition', async () => {
  resetDb()
  await mount('#/listing/loft-a', alice)
  await fillDrafts()
  assert.deepEqual(drafts(), { title: 'Loft A', ...filled })

  await changeUser(null)
  assert.deepEqual(drafts(), { title: 'Loft A', ...defaults, rating: null, comment: null })
  assert.ok($('button[aria-label="Sign in to book"]'))

  await fillDrafts({ review: false })
  await changeUser(alice)
  assert.deepEqual(drafts(), { title: 'Loft A', ...defaults })
})

test('a rejected booking keeps the same-context draft for a successful retry', async () => {
  const calls = resetDb()
  let fail = true
  roomRent.db.createBooking = async (data) => {
    calls.createBooking.push(data)
    if (fail) throw new Error('Dates are no longer available.')
    return 'booking-id'
  }
  await mount('#/listing/loft-a', alice)
  await fillDrafts()

  await click($('button[aria-label="Request to book"]'))
  assert.match($('#booking-card').textContent, /Dates are no longer available\./)
  assert.deepEqual(drafts(), { title: 'Loft A', ...filled })

  fail = false
  await click($('button[aria-label="Request to book"]'))
  assert.match($('#booking-card').textContent, /Booking requested!/)
  assert.equal(calls.createBooking.length, 2)
  for (const call of calls.createBooking) {
    assert.deepEqual([call.check_in, call.check_out, call.guests], ['2026-11-02', '2026-11-05', 3])
  }
})

test('a rejected review keeps the same-context draft for a successful retry', async () => {
  const calls = resetDb()
  let fail = true
  roomRent.db.createReview = async (data) => {
    calls.createReview.push(data)
    if (fail) throw new Error('offline')
    return 'review-id'
  }
  await mount('#/listing/loft-a', alice)
  await fillDrafts()

  await click($('button[aria-label="Submit review"]'))
  assert.match($('#booking-card').textContent, /Failed to submit review\./)
  assert.deepEqual(drafts(), { title: 'Loft A', ...filled })

  fail = false
  await click($('button[aria-label="Submit review"]'))
  assert.equal(reviewBox(), null)
  assert.equal(calls.createReview.length, 2)
  for (const call of calls.createReview) {
    assert.deepEqual([call.rating, call.comment, call.booking_id], [4, 'Lovely stay', 'loft-a-alice'])
  }
})
