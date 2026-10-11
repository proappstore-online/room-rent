// Component tests for ListingDetail draft isolation, run through the shared
// jsdom/ReactDOM App harness with synthetic data stubs.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { $, alice, bob, changeUser, click, listing, mount, navigate, roomRent, setValue } from './support/app-harness.mjs'

const listings = {
  'loft-a': listing('loft-a', 'Loft A'),
  'cabin-b': listing('cabin-b', 'Cabin B'),
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

const dateInputs = () => document.querySelectorAll('#booking-card input[type="date"]')
const reviewBox = () => $('textarea[aria-label="Review comment"]')
const starButtons = () => [...reviewBox().parentElement.querySelectorAll('button[type="button"]')]

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
