import { NextRequest, NextResponse } from 'next/server'
import { WINE_PROFILES, type WineType } from '@/lib/wine-club/profiles'
import {
  alternatives,
  browseAll,
  recommend,
  type Mix,
  type RecommendRequest,
} from '@/lib/wine-club/recommend'
import { emptyProfile, type TasteProfile } from '@/lib/wine-club/taste'
import { SIZES } from '@/lib/wine-club'

export const dynamic = 'force-dynamic'

/**
 * The wine club's recommendation endpoint.
 *
 * POST { mode, tasteProfile, mix, budgetTierId, excludeHandles, wineType }
 *
 * Three modes on one endpoint because they share every input:
 *   - "box":          the full personalised case
 *   - "alternatives": three swaps for one bottle
 *   - "browse":       every eligible wine, scored, for the escape hatch
 *
 * The engine is deterministic and runs in-process against the profiled
 * catalogue. Nothing here is stored: the taste profile lives with the
 * visitor, not with us.
 */

const WINE_TYPES: WineType[] = ['red', 'white', 'rose', 'sparkling']

/** The largest case we sell, read from the club sizes rather than typed twice. */
const MAX_BOTTLES = Math.max(...SIZES.map((s) => s.bottles))

type Body = {
  mode?: 'box' | 'alternatives' | 'browse'
  tasteProfile?: Partial<TasteProfile>
  mix?: Record<string, number>
  budgetTierId?: string
  excludeHandles?: string[]
  wineType?: string
}

export async function POST(request: NextRequest) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Send JSON.' }, { status: 400 })
  }

  const profile = sanitiseProfile(body.tasteProfile)
  const excludeHandles = Array.isArray(body.excludeHandles)
    ? body.excludeHandles.filter((h): h is string => typeof h === 'string').slice(0, 100)
    : []
  const budgetTierId = typeof body.budgetTierId === 'string' ? body.budgetTierId : 'everyday'

  const base: RecommendRequest = { tasteProfile: profile, mix: {}, budgetTierId, excludeHandles }

  switch (body.mode ?? 'box') {
    case 'box': {
      const mix = sanitiseMix(body.mix)
      const total = Object.values(mix).reduce((s, n) => s + (n ?? 0), 0)
      if (total < 1 || total > MAX_BOTTLES) {
        return NextResponse.json(
          { error: `The box holds 1 to ${MAX_BOTTLES} bottles.` },
          { status: 400 },
        )
      }
      return NextResponse.json(recommend({ ...base, mix }, WINE_PROFILES))
    }
    case 'alternatives': {
      const wineType = WINE_TYPES.find((t) => t === body.wineType)
      if (!wineType) return NextResponse.json({ error: 'Say which colour to swap.' }, { status: 400 })
      return NextResponse.json({
        recommendations: alternatives({ ...base, wineType, count: 3 }, WINE_PROFILES),
      })
    }
    case 'browse': {
      const wineType = WINE_TYPES.find((t) => t === body.wineType)
      return NextResponse.json({
        recommendations: browseAll({ ...base, wineType }, WINE_PROFILES).slice(0, 120),
      })
    }
    default:
      return NextResponse.json({ error: 'Unknown mode.' }, { status: 400 })
  }
}

function sanitiseProfile(raw: Partial<TasteProfile> | undefined): TasteProfile {
  const profile = emptyProfile()
  if (!raw) return profile
  for (const key of Object.keys(profile) as (keyof TasteProfile)[]) {
    const value = raw[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      profile[key] = Math.min(100, Math.max(0, Math.round(value)))
    }
  }
  return profile
}

function sanitiseMix(raw: Record<string, number> | undefined): Mix {
  const mix: Mix = {}
  if (!raw) return mix
  for (const type of WINE_TYPES) {
    const value = raw[type]
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      mix[type] = Math.min(12, Math.floor(value))
    }
  }
  return mix
}
