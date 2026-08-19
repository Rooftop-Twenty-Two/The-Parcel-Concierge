#!/usr/bin/env node
/**
 * Turns the supplied photography into web assets.
 *
 * Source: docs/reference/photography (the originals, up to 25MB each).
 * Output: public/photography (what the site serves).
 *
 * The originals must never be served. next/image resizes and re-encodes to
 * AVIF and WebP from whatever master it is given, but handing it a 6700px
 * 25MB JPEG makes every first request to a new size slow and blows the
 * build cache out. A sensibly sized master keeps the responsive pipeline
 * cheap and keeps the repo working tree usable.
 *
 * The ten studio shots are one frame each, so this also cuts three
 * additional framings from every one: a tighter view of the contents, a
 * view of the box itself, and a squarer detail crop. Those are real,
 * useful views and the product gallery uses all four. What they are NOT is
 * a substitute for a scale shot, which cannot be cropped out of a frame
 * that does not contain one: see docs/build-status.md.
 *
 * Requires sharp, which is not a project dependency:
 *   npm install --no-save sharp
 *   node scripts/photography/optimise.mjs
 */

import { mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const SRC = join(process.cwd(), 'docs/reference/photography')
const OUT = join(process.cwd(), 'public/photography')

/**
 * Where the box sits in the studio frames, as fractions of the whole. The
 * set is shot consistently on one table against one wall, so one set of
 * ratios works for all ten.
 * @type {Record<string, [number, number, number, number]>}
 */
const CROPS = {
  full: [0, 0, 1, 1],
  contents: [0.1, 0.24, 0.82, 0.92],
  packaging: [0.13, 0.55, 0.8, 0.98],
  detail: [0.16, 0.14, 0.74, 0.99],
}

/** Studio product shots. Everything else is treated as lifestyle. */
const isStudio = (name) => /^TPC-\d+\.jpg$/i.test(name)

mkdirSync(OUT, { recursive: true })

const files = readdirSync(SRC).filter((f) => /\.jpe?g$/i.test(f)).sort()
let written = 0

for (const file of files) {
  const slug = file.replace(/\.jpe?g$/i, '').toLowerCase().replace(/_+/g, '-').replace(/-+/g, '-')
  const input = join(SRC, file)
  const meta = await sharp(input).metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0

  if (!isStudio(file)) {
    // Lifestyle: one master, long edge 2200. Used full bleed in places, so
    // it needs to hold up wider than a product card does.
    const out = join(OUT, `${slug}.jpg`)
    await sharp(input)
      .resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true, mozjpeg: true })
      .toFile(out)
    written += 1
    console.log(`lifestyle  ${slug}.jpg`)
    continue
  }

  for (const [name, [x0, y0, x1, y1]] of Object.entries(CROPS)) {
    const left = Math.round(x0 * width)
    const top = Math.round(y0 * height)
    const cropWidth = Math.round((x1 - x0) * width)
    const cropHeight = Math.round((y1 - y0) * height)

    const out = join(OUT, `${slug}-${name}.jpg`)
    await sharp(input)
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true, mozjpeg: true })
      .toFile(out)
    written += 1
  }
  console.log(`studio     ${slug} (${Object.keys(CROPS).length} framings)`)
}

console.log(`\nWrote ${written} files to ${OUT}`)
