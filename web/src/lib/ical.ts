export interface BlockedRange {
  start: string // YYYY-MM-DD
  end: string   // YYYY-MM-DD
}

function parseIcalDate(raw: string): string {
  // Handle VALUE=DATE:20260601, plain 20260601, or 20260601T150000Z
  const digits = raw.replace(/^.*:/, '').replace(/T.*$/, '')
  if (digits.length !== 8) return ''
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

export function parseIcal(text: string): BlockedRange[] {
  const today = new Date().toISOString().split('T')[0]
  const ranges: BlockedRange[] = []
  const events = text.split('BEGIN:VEVENT')

  for (let i = 1; i < events.length; i++) {
    const block = events[i].split('END:VEVENT')[0]
    if (!block) continue

    let start = ''
    let end = ''
    for (const line of block.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (trimmed.startsWith('DTSTART')) {
        start = parseIcalDate(trimmed)
      } else if (trimmed.startsWith('DTEND')) {
        end = parseIcalDate(trimmed)
      }
    }

    if (start && end && end >= today) {
      ranges.push({ start, end })
    }
  }

  return ranges
}

export function isDateBlocked(date: string, ranges: BlockedRange[]): boolean {
  for (const r of ranges) {
    if (date >= r.start && date < r.end) return true
  }
  return false
}
