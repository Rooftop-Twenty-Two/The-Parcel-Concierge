import { readFileSync } from 'node:fs'

/**
 * Reads data/redirects/redirects.csv.
 *
 * Plain JavaScript on purpose. This module is on the production build path
 * (`npm run build` generates the redirect map before `next build` runs), and
 * TypeScript here would mean the build needs Node's type-stripping flag,
 * which only exists on Node 22.6 and later. Hosts that default to an older
 * Node then fail the build on `bad option: --experimental-strip-types`.
 * Types are carried in JSDoc instead, and `npm run typecheck` still checks
 * them.
 *
 * Deliberately a tiny hand-rolled parser rather than a dependency: the file
 * is ours, the format is fixed, and comment lines starting with # are part
 * of the format because the notes in that file are for the client to read
 * at review.
 */

/**
 * @typedef {object} RedirectRow
 * @property {string} source
 * @property {string} destination
 * @property {boolean} permanent
 * @property {string} note
 * @property {number} line 1-based line number in the CSV, for error messages.
 */

/**
 * @typedef {object} ParseResult
 * @property {RedirectRow[]} rows
 * @property {{ line: number, message: string }[]} errors
 */

/**
 * @param {string} path
 * @returns {ParseResult}
 */
export function parseRedirects(path) {
  const text = readFileSync(path, 'utf8')
  /** @type {RedirectRow[]} */
  const rows = []
  /** @type {{ line: number, message: string }[]} */
  const errors = []

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

/**
 * @param {string} line
 * @returns {string[]}
 */
function splitCsvLine(line) {
  /** @type {string[]} */
  const cells = []
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
