import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

/**
 * Buttons.
 *
 * Sentence case labels, always. A button that says "Add to hamper" produces
 * a confirmation that says "Added to hamper", so the label and the response
 * are written as a pair.
 */

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'default' | 'large' | 'small'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-red text-cream hover:bg-wine',
  secondary: 'bg-navy text-cream hover:bg-green',
  ghost: 'bg-transparent text-navy border border-navy hover:bg-navy hover:text-cream',
}

const SIZES: Record<Size, string> = {
  small: 'px-4 py-2 text-sm',
  default: 'px-6 py-3 text-base',
  large: 'px-8 py-4 text-lg',
}

function classes(variant: Variant, size: Size, className: string): string {
  return [
    'inline-flex items-center justify-center gap-2 rounded-[2px] font-medium tracking-wide',
    'transition-colors duration-200',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    VARIANTS[variant],
    SIZES[size],
    className,
  ].join(' ')
}

export function Button({
  variant = 'primary',
  size = 'default',
  className = '',
  children,
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <button className={classes(variant, size, className)} {...props}>
      {children}
    </button>
  )
}

export function ButtonLink({
  variant = 'primary',
  size = 'default',
  className = '',
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <Link className={classes(variant, size, className)} {...props}>
      {children}
    </Link>
  )
}
