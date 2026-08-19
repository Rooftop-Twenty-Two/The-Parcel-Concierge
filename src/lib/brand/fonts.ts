import { Bebas_Neue, Fraunces, Jost } from 'next/font/google'

/**
 * Font loading, and the single place the licensed brand faces get swapped in.
 *
 * The brand guidelines specify Bebas Kai (headings), Salfish
 * (headings/supporting), South Epic (accents) and Futura (body). None of
 * those files came with the asset pack, so we load the nearest open
 * substitutes and expose them as CSS variables. globals.css lists the
 * licensed face first in every stack, so the moment the real files exist the
 * browser picks them.
 *
 * To swap in the licensed files:
 *   1. Drop the woff2 files into src/assets/fonts/.
 *   2. Replace the next/font/google calls below with next/font/local calls
 *      pointing at them, keeping the same `variable` names.
 *   3. Nothing else in the codebase changes.
 */

const display = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display-loaded',
})

const serif = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--font-serif-loaded',
})

const body = Jost({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body-loaded',
})

export const fontVariables = [display.variable, serif.variable, body.variable].join(' ')
