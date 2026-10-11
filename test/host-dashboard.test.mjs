// Component tests for HostDashboard load and mutation lifecycle, run through
// the shared jsdom/ReactDOM App harness with synthetic data stubs.
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { $, alice, bob, changeUser, click, deferred, flush, listing, mount, roomRent } from './support/app-harness.mjs'

const aliceListing = listing('loft-a', 'Alice Loft', { host_id: 'alice' })
const bobListing = listing('cabin-b', 'Bob Cabin', { host_id: 'bob' })
const pendingBooking = {
  id: 'bk-1', listing_id: 'loft-a', listing_title: 'Alice Loft', guest_id: 'guest', guest_name: 'Gus Guest',
  check_in: '2026-11-02', check_out: '2026-11-05', guests: 2, total_price: 336, status: 'pending', created_at: 0,
}

function stubDb(overrides = () => ({})) {
  const calls = { getMyListings: [], updateBookingStatus: [], deleteListing: [] }
  roomRent.db = {
    getMyListings: async (hostId) => { calls.getMyListings.push(hostId); return [aliceListing] },
    getHostBookings: async () => [{ ...pendingBooking }],
    updateBookingStatus: async (...args) => { calls.updateBookingStatus.push(args) },
    deleteListing: async (...args) => { calls.deleteListing.push(args) },
    ...overrides(calls),
  }
  return calls
}

// `confirm` is a browser global; each test queues the answers it expects.
let confirmAnswers = []
globalThis.confirm = () => confirmAnswers.shift() ?? assert.fail('unexpected confirm()')
afterEach(() => { confirmAnswers = [] })

const text = () => $('#root').textContent
const button = (label) => [...document.querySelectorAll('#root button')].find((b) => b.textContent.trim() === label)
const bookingStatus = () => $('#root span.capitalize')?.textContent

async function openBookings() {
  await click([...document.querySelectorAll('#root button')].find((b) => b.textContent.startsWith('bookings')))
}

test('a rejected initial load shows an error and retry renders listings', async () => {
  let fail = true
  const calls = stubDb((calls) => ({
    getMyListings: async (hostId) => {
      calls.getMyListings.push(hostId)
      if (fail) throw new Error('offline')
      return [aliceListing]
    },
  }))
  await mount('#/host', alice)
  assert.match(text(), /Unable to load your dashboard\. Please try again\./)
  assert.doesNotMatch(text(), /Alice Loft/)

  fail = false
  await click(button('Try again'))
  assert.match(text(), /Alice Loft/)
  assert.doesNotMatch(text(), /Unable to load/)
  assert.deepEqual(calls.getMyListings, ['alice', 'alice'])
})

for (const outcome of ['resolve', 'reject']) {
  test(`a late ${outcome} from the previous account is ignored after switching accounts`, async () => {
    const aliceLoad = deferred()
    stubDb((calls) => ({
      getMyListings: (hostId) => {
        calls.getMyListings.push(hostId)
        return hostId === 'alice' ? aliceLoad.promise : Promise.resolve([bobListing])
      },
    }))
    await mount('#/host', alice)
    assert.doesNotMatch(text(), /Alice Loft|Bob Cabin/)

    await changeUser(bob)
    assert.match(text(), /Bob Cabin/)

    if (outcome === 'resolve') aliceLoad.resolve([aliceListing])
    else aliceLoad.reject(new Error('late failure'))
    await flush()
    assert.match(text(), /Bob Cabin/)
    assert.doesNotMatch(text(), /Alice Loft|Unable to load/)
    assert.match(text(), /listings \(1\)/)
  })
}

test('a failed booking action shows an error, re-enables the button and keeps the booking', async () => {
  const calls = stubDb((calls) => ({
    updateBookingStatus: async (...args) => { calls.updateBookingStatus.push(args); throw new Error('denied') },
  }))
  await mount('#/host', alice)
  await openBookings()

  await click(button('Confirm'))
  assert.match(text(), /Could not confirm this booking\. Please try again\./)
  assert.equal(button('Confirm').disabled, false)
  assert.equal(button('Decline').disabled, false)
  assert.equal(bookingStatus(), 'pending')
  assert.deepEqual(calls.updateBookingStatus, [['bk-1', 'confirmed']])
})

test('repeating a booking action while it is pending is a no-op', async () => {
  const update = deferred()
  const calls = stubDb((calls) => ({
    updateBookingStatus: (...args) => { calls.updateBookingStatus.push(args); return update.promise },
  }))
  await mount('#/host', alice)
  await openBookings()

  await click(button('Confirm'))
  assert.equal(button('Confirm').disabled, true)
  assert.equal(button('Decline').disabled, true)
  await click(button('Confirm'))
  await click(button('Decline'))
  assert.deepEqual(calls.updateBookingStatus, [['bk-1', 'confirmed']])

  update.resolve()
  await flush()
  assert.equal(bookingStatus(), 'confirmed')
  assert.ok(button('Mark completed'))
  assert.deepEqual(calls.updateBookingStatus, [['bk-1', 'confirmed']])
})

test('a rejected delete keeps the listing and shows an error; a declined confirm never deletes', async () => {
  const calls = stubDb((calls) => ({
    deleteListing: async (...args) => { calls.deleteListing.push(args); throw new Error('denied') },
  }))
  await mount('#/host', alice)

  confirmAnswers = [false]
  await click(button('Delete'))
  assert.deepEqual(calls.deleteListing, [])
  assert.match(text(), /Alice Loft/)

  confirmAnswers = [true]
  await click(button('Delete'))
  assert.deepEqual(calls.deleteListing, [['loft-a', 'alice']])
  assert.match(text(), /Alice Loft/)
  assert.match(text(), /Could not delete this listing\. Please try again\./)
  assert.equal(button('Delete').disabled, false)
})

test('a delete that succeeds after a prior failure removes the listing', async () => {
  let fail = true
  const calls = stubDb((calls) => ({
    deleteListing: async (...args) => {
      calls.deleteListing.push(args)
      if (fail) throw new Error('denied')
    },
  }))
  await mount('#/host', alice)

  confirmAnswers = [true]
  await click(button('Delete'))
  assert.match(text(), /Could not delete this listing/)

  fail = false
  confirmAnswers = [true]
  await click(button('Delete'))
  assert.doesNotMatch(text(), /Alice Loft|Could not delete/)
  assert.match(text(), /No listings yet\./)
  assert.deepEqual(calls.deleteListing, [['loft-a', 'alice'], ['loft-a', 'alice']])
})
