import type { ReactNode } from 'react'

/**
 * The postage stamp frame.
 *
 * The signature device from the brand guidelines (page 7, "stamp shapes").
 * It carries the photography, so everything around it is allowed to stay
 * quiet. One element, a CSS mask, no extra markup.
 */
export function StampFrame({
  children,
  className = '',
  size = 'default',
}: {
  children: ReactNode
  className?: string
  size?: 'default' | 'small'
}) {
  return (
    <div
      className={`stamp-edge ${size === 'small' ? 'stamp-edge-sm' : ''} overflow-hidden ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * The "Premier Gift Delivery Ireland" roundel, redrawn as text on a path so
 * it stays crisp at any size and reads to a screen reader.
 *
 * The ring and its curved lettering turn slowly, like a rubber stamp being
 * lined up; GIFT DELIVERY stays level so the badge is readable at any point
 * of the turn. The motion lives in a CSS class (globals.css) so
 * prefers-reduced-motion stops it dead with everything else.
 */
export function PostmarkRoundel({
  label = 'Premier gift delivery Ireland',
  className = '',
  spin = true,
}: {
  label?: string
  className?: string
  spin?: boolean
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={label}
      focusable="false"
    >
      <defs>
        <path id="postmark-top" d="M 30 100 A 70 70 0 0 1 170 100" fill="none" />
        <path id="postmark-bottom" d="M 34 100 A 66 66 0 0 0 166 100" fill="none" />
      </defs>
      <g className={spin ? 'postmark-turn' : undefined}>
        <circle cx="100" cy="100" r="82" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="100" cy="100" r="72" fill="none" stroke="currentColor" strokeWidth="1" />
        <text
          fontSize="17"
          letterSpacing="4"
          fill="currentColor"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          <textPath href="#postmark-top" startOffset="50%" textAnchor="middle">
            PREMIER
          </textPath>
        </text>
        <text
          fontSize="17"
          letterSpacing="4"
          fill="currentColor"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          <textPath href="#postmark-bottom" startOffset="50%" textAnchor="middle">
            IRELAND
          </textPath>
        </text>
      </g>
      <text
        x="100"
        y="94"
        fontSize="16"
        letterSpacing="3"
        textAnchor="middle"
        fill="currentColor"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        GIFT
      </text>
      <text
        x="100"
        y="116"
        fontSize="16"
        letterSpacing="3"
        textAnchor="middle"
        fill="currentColor"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        DELIVERY
      </text>
    </svg>
  )
}

/**
 * The ink cancellation waves from the brand guidelines, used as a section
 * divider. Decorative, so it is hidden from assistive technology.
 */
export function InkWaves({ className = '', lines = 4 }: { className?: string; lines?: number }) {
  // The viewBox is wide and the waves repeat across it, so a full-bleed
  // divider on a large screen still reads as waves rather than as flat
  // lines stretched out of shape.
  const segments = 24
  const segment = 50

  return (
    <svg
      viewBox={`0 0 ${segments * segment} 120`}
      className={className}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
    >
      {Array.from({ length: lines }).map((_, i) => {
        const start = `M 0 ${22 + i * 24}`
        const first = `q ${segment / 2} -16 ${segment} 0`
        const rest = `t ${segment} 0 `.repeat(segments - 1).trim()
        return (
          <path
            key={i}
            d={`${start} ${first} ${rest}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
          />
        )
      })}
    </svg>
  )
}
