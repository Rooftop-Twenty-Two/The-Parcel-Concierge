/**
 * Seasonal snow, for the hero.
 *
 * Pure CSS: no library, no canvas, no client component. The flakes are
 * spans with custom properties and one keyframe, so this ships no
 * JavaScript at all and cannot block the hero's paint.
 *
 * The values are a fixed table rather than Math.random(). Random values
 * would differ between the server render and the client hydration, which
 * React treats as a mismatch, and it would also mean the hero looked
 * different on every request for no gain. Twenty six flakes across the
 * full width is enough to read as snow and few enough to stay quiet.
 *
 * Under prefers-reduced-motion the keyframes are never defined and the
 * spans keep their opacity of 0, so the hero renders clean rather than
 * with a static field of dots stuck on it.
 *
 * Seasonal: the homepage only renders this while the Christmas band is in
 * the CMS slot list, so removing that band in January takes the snow with
 * it. See src/app/(site)/page.tsx.
 */

type Flake = {
  /** Percentage across the hero. */
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
}

const FLAKES: Flake[] = [
  { left: 2, size: 5, duration: 23, delay: -4, drift: 16, opacity: 0.61 },
  { left: 7, size: 7, duration: 18, delay: -11, drift: -12, opacity: 0.85 },
  { left: 11, size: 4, duration: 27, delay: -1, drift: 22, opacity: 0.49 },
  { left: 16, size: 6, duration: 21, delay: -16, drift: -18, opacity: 0.73 },
  { left: 21, size: 5, duration: 25, delay: -7, drift: 10, opacity: 0.58 },
  { left: 25, size: 8, duration: 16, delay: -13, drift: -24, opacity: 0.81 },
  { left: 30, size: 4, duration: 29, delay: -20, drift: 14, opacity: 0.46 },
  { left: 34, size: 6, duration: 19, delay: -3, drift: 20, opacity: 0.7 },
  { left: 39, size: 5, duration: 24, delay: -9, drift: -16, opacity: 0.63 },
  { left: 43, size: 7, duration: 17, delay: -15, drift: 12, opacity: 0.84 },
  { left: 48, size: 4, duration: 28, delay: -6, drift: -20, opacity: 0.47 },
  { left: 52, size: 6, duration: 22, delay: -18, drift: 18, opacity: 0.72 },
  { left: 57, size: 5, duration: 26, delay: -2, drift: -10, opacity: 0.6 },
  { left: 61, size: 8, duration: 15, delay: -12, drift: 24, opacity: 0.79 },
  { left: 66, size: 4, duration: 30, delay: -8, drift: -14, opacity: 0.44 },
  { left: 70, size: 6, duration: 20, delay: -17, drift: 16, opacity: 0.75 },
  { left: 75, size: 5, duration: 23, delay: -5, drift: -22, opacity: 0.56 },
  { left: 79, size: 7, duration: 18, delay: -14, drift: 10, opacity: 0.82 },
  { left: 84, size: 4, duration: 27, delay: -10, drift: 20, opacity: 0.51 },
  { left: 88, size: 6, duration: 21, delay: -19, drift: -16, opacity: 0.68 },
  { left: 92, size: 5, duration: 25, delay: -4, drift: 14, opacity: 0.61 },
  { left: 96, size: 7, duration: 19, delay: -11, drift: -12, opacity: 0.77 },
  { left: 19, size: 4, duration: 31, delay: -22, drift: 18, opacity: 0.42 },
  { left: 46, size: 5, duration: 32, delay: -25, drift: -18, opacity: 0.53 },
  { left: 63, size: 4, duration: 33, delay: -21, drift: 12, opacity: 0.46 },
  { left: 82, size: 5, duration: 29, delay: -24, drift: -20, opacity: 0.54 },
]

export function Snowfall({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`snowfall pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {FLAKES.map((flake, index) => (
        <span
          key={index}
          style={
            {
              left: `${flake.left}%`,
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
