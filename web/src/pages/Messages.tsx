import { useEffect, useRef, useState } from 'react'
import type { User } from '@proappstore/sdk'
import { getConversations, getMessages, sendMessage } from '../lib/db'

type Conversation = { listing_id: string; listing_title: string; other_id: string; other_name: string; last_message: string; last_at: number }
type Message = { id: string; listing_id: string; sender_id: string; sender_name: string; recipient_id: string; body: string; created_at: number }

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}

export function Messages({
  user,
  onNavigate,
  listingId,
  recipientId,
}: {
  user: User
  onNavigate: (hash: string) => void
  listingId?: string
  recipientId?: string
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const inThread = listingId && recipientId

  useEffect(() => {
    setLoading(true)
    if (inThread) {
      getMessages(listingId, user.id, recipientId).then((m) => { setMessages(m); setLoading(false) })
    } else {
      getConversations(user.id).then((c) => { setConversations(c); setLoading(false) })
    }
  }, [user.id, listingId, recipientId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!body.trim() || !listingId || !recipientId) return
    setSending(true)
    try {
      await sendMessage({
        listing_id: listingId,
        sender_id: user.id,
        sender_name: user.login,
        recipient_id: recipientId,
        body: body.trim(),
      })
      setBody('')
      const updated = await getMessages(listingId, user.id, recipientId)
      setMessages(updated)
    } catch {
      // send failed — user can retry
    } finally {
      setSending(false)
    }
  }

  // --- Thread view ---
  if (inThread) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col px-4 py-6 pb-16 lg:pb-0" style={{ minHeight: 'calc(100dvh - 3.5rem)' }}>
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => onNavigate('#/messages')}
            className="rounded-lg p-1.5"
            style={{ color: 'var(--muted)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="display-font text-lg font-semibold" style={{ color: 'var(--ink)' }}>
            Conversation
          </h1>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No messages yet. Say hello!</p>
          </div>
        ) : (
          <div className="flex-1 space-y-3 overflow-y-auto">
            {messages.map((m) => {
              const isMe = m.sender_id === user.id
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[75%] rounded-2xl px-4 py-2.5"
                    style={{
                      background: isMe ? 'var(--accent)' : 'var(--glass)',
                      color: isMe ? 'white' : 'var(--ink)',
                    }}
                  >
                    {!isMe && (
                      <p className="mb-0.5 text-xs font-medium" style={{ color: 'var(--muted)' }}>{m.sender_name}</p>
                    )}
                    <p className="text-sm">{m.body}</p>
                    <p className="mt-1 text-[10px] text-right" style={{ opacity: 0.6 }}>{relativeTime(m.created_at)}</p>
                  </div>
                </div>
              )
            })}
            <div ref={endRef} />
          </div>
        )}

        <div
          className="sticky bottom-[56px] lg:bottom-0 mt-4 flex items-center gap-2 rounded-xl p-2"
          style={{ background: 'var(--glass-strong)', border: '1px solid var(--line)', backdropFilter: 'blur(20px)' }}
        >
          <input
            type="text"
            placeholder="Type a message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            className="flex-1 bg-transparent px-2 py-1.5 text-sm outline-none"
            style={{ color: 'var(--ink)' }}
          />
          <button
            onClick={handleSend}
            disabled={!body.trim() || sending}
            className="rounded-lg px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
          >
            Send
          </button>
        </div>
      </div>
    )
  }

  // --- Conversation list ---
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="display-font text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
        Messages
      </h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : conversations.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No messages yet.</p>
          <button onClick={() => onNavigate('#/')} className="mt-3 text-sm font-medium" style={{ color: 'var(--accent)' }}>
            Browse listings &rarr;
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {conversations.map((c) => (
            <button
              key={`${c.listing_id}-${c.other_id}`}
              onClick={() => onNavigate(`#/messages/${c.listing_id}/${c.other_id}`)}
              className="flex w-full items-center gap-3 rounded-xl p-3 text-left"
              style={{ background: 'var(--panel-strong)', border: '1px solid var(--line)' }}
            >
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {(c.other_name || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    {c.other_name || 'User'}
                  </p>
                  <span className="flex-shrink-0 text-[11px]" style={{ color: 'var(--muted)' }}>
                    {relativeTime(c.last_at)}
                  </span>
                </div>
                <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>{c.listing_title}</p>
                <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--muted)' }}>{c.last_message}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
