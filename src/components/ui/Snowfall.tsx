/**
 * Seasonal snow.
 *
 * Pure CSS: no library, no canvas, no client component. The flakes are
 * spans with custom properties and one keyframe, so this ships no
 * JavaScript at all and cannot block the hero's paint.
 *
 * Three depths make it read as weather rather than as confetti: a far
 * layer of small slow flakes, a mid layer that does most of the work, and
 * a handful of large, soft, faster flakes close to the glass. The far
 * layer is dropped on phones, where the screen is small enough that the
 * other two already fill it.
 *
 * The values come from a seeded generator rather than Math.random().
 * Random values would differ between the server render and the client
 * hydration, which React treats as a mismatch, and it would also mean the
 * page looked different on every request for no gain. The seed is fixed,
 * so the field is the same on every render everywhere.
 *
 * Under prefers-reduced-motion the keyframes are never defined and the
 * spans keep their opacity of 0, so the page renders clean rather than
 * with a static field of dots stuck on it.
 *
 * Seasonal: the homepage only renders this while the Christmas band is in
 * the CMS slot list, so removing that band in January takes the snow with
 * it. See src/app/(site)/page.tsx.
 */

type Layer = 'far' | 'mid' | 'near'

type Flake = {
  layer: Layer
  /** Percentage across the field. */
  left: number
  /** Pixel diameter. */
  size: number
  /** Seconds for one fall. */
  duration: number
  /** Negative so the field is already mid-fall on first paint. */
  delay: number
  /** Horizontal travel over the fall, in pixels. */
  drift: number
  opacity: number
  /** Pixel blur, for the flakes nearest the viewer. */
  blur: number
}

type Range = [min: number, max: number]

const LAYERS: Record<
  Layer,
  { count: number; size: Range; duration: Range; opacity: Range; blur: number }
> = {
  far: { count: 32, size: [3, 4.5], duration: [24, 34], opacity: [0.45, 0.65], blur: 0 },
  mid: { count: 30, size: [5.5, 8], duration: [15, 23], opacity: [0.75, 0.95], blur: 0 },
  near: { count: 12, size: [11, 15], duration: [10, 15], opacity: [0.35, 0.5], blur: 1.5 },
}

/** Mulberry32: a small deterministic PRNG, plenty for a snow field. */
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function between(random: () => number, [min, max]: Range): number {
  return min + (max - min) * random()
}

function buildFlakes(): Flake[] {
  const random = seeded(2026_12_25)
  const flakes: Flake[] = []

  for (const layer of Object.keys(LAYERS) as Layer[]) {
    const spec = LAYERS[layer]
    for (let i = 0; i < spec.count; i += 1) {
      const duration = between(random, spec.duration)
      flakes.push({
        layer,
        // Spread evenly across the width with a jitter, so there are no
        // bare stripes and no clumps.
        left: Math.round(((i + random()) / spec.count) * 1000) / 10,
        size: Math.round(between(random, spec.size) * 2) / 2,
        duration: Math.round(duration),
        delay: -Math.round(random() * duration),
        drift: Math.round((random() * 2 - 1) * 48),
        opacity: Math.round(between(random, spec.opacity) * 100) / 100,
        blur: spec.blur,
      })
    }
  }

  return flakes
}

const FLAKES = buildFlakes()

/**
 * `page` pins the field to the viewport so it falls over the whole
 * homepage, behind the sticky header. `hero` fills its nearest positioned
 * ancestor, for a single band.
 */
export function Snowfall({
  variant = 'hero',
  className = '',
}: {
  variant?: 'hero' | 'page'
  className?: string
}) {
  const position = variant === 'page' ? 'fixed inset-0 z-40' : 'absolute inset-0'

  return (
    <div
      aria-hidden="true"
      className={`snowfall snowfall-${variant} pointer-events-none overflow-hidden ${position} ${className}`}
    >
      {FLAKES.map((flake, index) => (
        <span
          key={index}
          data-layer={flake.layer}
          style={
            {
              left: `${flake.left}%`,
              filter: flake.blur ? `blur(${flake.blur}px)` : undefined,
              '--tpc-snow-size': `${flake.size}px`,
              '--tpc-snow-duration': `${flake.duration}s`,
              '--tpc-snow-delay': `${flake.delay}s`,
              '--tpc-snow-drift': `${flake.drift}px`,
              '--tpc-snow-opacity': flake.opacity,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
