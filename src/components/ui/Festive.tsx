/**
 * Seasonal decoration, drawn rather than pasted.
 *
 * The brief warns off cheap Christmas graphics, so everything here is
 * thin line work in the brand palette, in the same register as the
 * postmark roundel and the cancellation waves. Nothing is an image asset
 * and nothing needs JavaScript. Both pieces are decorative and hidden from
 * assistive technology.
 *
 * Like the snow, these only appear while the Christmas band is in the CMS
 * slot list: see src/app/(site)/page.tsx.
 */

// ---------------------------------------------------------------------------
// Fairy lights
// ---------------------------------------------------------------------------

/** One wire span between two hooks, in SVG units (1 unit = 1px). */
const SPAN = 240
/** Number of spans across the drawing. Wider than any screen we serve. */
const SPANS = 12
/** Wire hook height and maximum sag, in units. */
const HOOK_Y = 6
const SAG = 24
/** Where on each span a bulb hangs, as a fraction of the way along. */
const BULB_STOPS = [0.14, 0.32, 0.5, 0.68, 0.86]

const WIDTH = SPAN * SPANS
const HEIGHT = 60

/**
 * Bulb colours cycle through the brand palette. `fill-*` utilities resolve
 * to the theme tokens, so a palette change reaches the bulbs too.
 */
const BULB_CLASSES = ['fill-gold', 'fill-cream', 'fill-red', 'fill-green-light']

type Bulb = { x: number; y: number; colour: string; delay: number; duration: number }

function buildBulbs(): Bulb[] {
  const bulbs: Bulb[] = []
  let n = 0

  for (let span = 0; span < SPANS; span += 1) {
    const x0 = span * SPAN
    const x2 = x0 + SPAN
    // The wire is a quadratic curve whose control point sits at twice the
    // sag, so the visible low point lands exactly SAG below the hooks.
    const cx = x0 + SPAN / 2
    const cy = HOOK_Y + SAG * 2

    for (const t of BULB_STOPS) {
      const u = 1 - t
      const x = u * u * x0 + 2 * u * t * cx + t * t * x2
      const y = u * u * HOOK_Y + 2 * u * t * cy + t * t * HOOK_Y
      bulbs.push({
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        colour: BULB_CLASSES[n % BULB_CLASSES.length] ?? 'fill-gold',
        // A fixed pattern of offsets rather than a random one, so the
        // server and the client agree and no two neighbours twinkle in
        // step.
        delay: -((n * 7) % 11) * 0.35,
        duration: 2.2 + ((n * 3) % 5) * 0.3,
      })
      n += 1
    }
  }

  return bulbs
}

const BULBS = buildBulbs()

const WIRE = Array.from({ length: SPANS }, (_, span) => {
  const x0 = span * SPAN
  return `${span === 0 ? `M ${x0} ${HOOK_Y}` : ''} Q ${x0 + SPAN / 2} ${HOOK_Y + SAG * 2} ${x0 + SPAN} ${HOOK_Y}`
}).join(' ')

/**
 * A string of lights along the top of a band.
 *
 * Drawn at 1:1 and clipped rather than scaled, so the bulbs are the same
 * size on a phone and on a wide monitor, and a phone simply sees fewer of
 * them. The wire takes the band's text colour at low opacity; the glow
 * around each bulb twinkles slowly in CSS and holds still under reduced
 * motion.
 */
export function FairyLights({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMin slice"
      className={`fairy-lights pointer-events-none block w-full ${className}`}
      style={{ height: HEIGHT }}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={WIRE}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeOpacity="0.45"
      />
      {BULBS.map((bulb, index) => (
        <g key={index} transform={`translate(${bulb.x} ${bulb.y})`}>
          {/* The glow, animated. */}
          <circle
            cy="15"
            r="10"
            className={`fairy-glow ${bulb.colour}`}
            style={{ animationDelay: `${bulb.delay}s`, animationDuration: `${bulb.duration}s` }}
          />
          {/* Stem and cap. */}
          <line y1="0" y2="6" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.25" />
          <rect x="-2" y="6" width="4" height="3" fill="currentColor" fillOpacity="0.6" />
          {/* The bulb itself. */}
          <ellipse cy="15" rx="3.5" ry="5.5" className={bulb.colour} />
        </g>
      ))}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Holly
// ---------------------------------------------------------------------------

/**
 * A holly leaf drawn along the x axis from the stem at the origin to the
 * tip at x=56, with three spikes a side and a midrib. Rotated into place
 * by the sprig below.
 */
const LEAF =
  'M 0 0 C 4 -7 9 -8 14 -14 Q 19 -9 22 -8 L 31 -16 Q 36 -9 39 -8 L 47 -12 Q 51 -6 56 0 ' +
  'Q 51 6 47 12 L 39 8 Q 36 9 31 16 L 22 8 Q 19 9 14 14 C 9 8 4 7 0 0 Z'

const MIDRIB = 'M 3 0 L 51 0'

/**
 * A sprig of holly: two leaves and three berries, in line work only.
 * Takes the text colour, so it is gold on the wine band and would be
 * green on cream.
 */
export function HollySprig({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 130 100"
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <g transform="translate(66 72) rotate(-38)">
        <path d={LEAF} />
        <path d={MIDRIB} strokeOpacity="0.6" strokeWidth="1" />
      </g>
      <g transform="translate(64 72) rotate(-142)">
        <path d={LEAF} />
        <path d={MIDRIB} strokeOpacity="0.6" strokeWidth="1" />
      </g>
      {/* Berries, with a dot of light on each. */}
      <circle cx="58" cy="64" r="5" />
      <circle cx="70" cy="62" r="5" />
      <circle cx="64" cy="73" r="5" />
      <circle cx="56.5" cy="62.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="68.5" cy="60.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="62.5" cy="71.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
