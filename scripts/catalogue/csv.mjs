/**
 * A CSV parser for Shopify product exports, shared by the catalogue
 * importers.
 *
 * Hand rolled rather than a dependency because the export puts raw HTML in
 * quoted fields, newlines and all, and the one thing the parser must get
 * right is that a quoted cell keeps its newlines. Everything else is plain
 * RFC 4180.
 */
import { createReadStream } from 'node:fs'

export async function readCsv(path) {
  const text = await new Promise((resolve, reject) => {
    let out = ''
    createReadStream(path, { encoding: 'utf8' })
      .on('data', (c) => (out += c))
      .on('end', () => resolve(out))
      .on('error', reject)
  })

  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1 } else { quoted = false }
      } else cell += ch
      continue
    }
    if (ch === '"') { quoted = true; continue }
    if (ch === ',') { row.push(cell); cell = ''; continue }
    if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue }
    if (ch === '\r') continue
    cell += ch
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }

  const header = rows.shift().map((h) => h.replace(/^﻿/, '').trim())
  return rows
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}
