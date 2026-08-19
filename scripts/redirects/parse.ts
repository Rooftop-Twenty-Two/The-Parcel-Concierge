import { readFileSync } from 'node:fs'

/**
 * Reads data/redirects/redirects.csv.
 *
 * Deliberately a tiny hand-rolled parser rather than a dependency: the file
 * is ours, the format is fixed, and comment lines starting with # are part
 * of the format because the notes in that file are for the client to read
 * at review.
 */

export type RedirectRow = {
  source: string
  destination: string
  permanent: boolean
  note: string
  /** 1-based line number in the CSV, for error messages. */
  line: number
}

export type ParseResult = {
  rows: RedirectRow[]
  errors: { line: number; message: string }[]
}

export function parseRedirects(path: string): ParseResult {
  const text = readFileSync(path, 'utf8')
  const rows: RedirectRow[] = []
  const errors: { line: number; message: string }[] = []

  const lines = text.split(/\r?\n/)

  lines.forEach((raw, index) => {
    const line = index + 1
    const trimmed = raw.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    if (line === 1 && trimmed.startsWith('source,')) return

    const cells = splitCsvLine(trimmed)
    const [source, destination, type = '301', ...noteParts] = cells

    if (!source || !destination) {
      errors.push({ line, message: `Needs both a source and a destination: "${trimmed}"` })
      return
    }

    if (!source.startsWith('/')) {
      errors.push({ line, message: `Source "${source}" must start with a slash and carry no domain.` })
      return
    }

    if (!destination.startsWith('/') && !destination.startsWith('http')) {
      errors.push({ line, message: `Destination "${destination}" must start with a slash.` })
      return
    }

    if (type !== '301' && type !== '302') {
      errors.push({ line, message: `Type must be 301 or 302, found "${type}".` })
      return
    }

    rows.push({
      source,
      destination,
      permanent: type === '301',
      note: noteParts.join(',').trim(),
      line,
    })
  })

  return { rows, errors }
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}
