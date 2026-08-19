import type { Money } from './types'

/**
 * Money is handled in integer minor units everywhere. Shopify returns
 * decimal strings; we parse once at the boundary and never do float
 * arithmetic on a price after that.
 */

export function toMinor(amount: string | number): number {
  if (typeof amount === 'number') return Math.round(amount * 100)
  // Avoid parseFloat rounding by working on the string.
  const trimmed = amount.trim()
  const negative = trimmed.startsWith('-')
  const [whole = '0', fraction = ''] = trimmed.replace('-', '').split('.')
  const cents = Number(`${whole}${fraction.padEnd(2, '0').slice(0, 2)}`)
  return negative ? -cents : cents
}

export function money(amount: string | number, currencyCode: string): Money {
  return { amountMinor: toMinor(amount), currencyCode }
}

const formatters = new Map<string, Intl.NumberFormat>()

function formatter(currencyCode: string, withDecimals: boolean): Intl.NumberFormat {
  const key = `${currencyCode}:${withDecimals}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: withDecimals ? 2 : 0,
      maximumFractionDigits: withDecimals ? 2 : 0,
    })
    formatters.set(key, f)
  }
  return f
}

/**
 * Whole euro prices render without the trailing ".00". A hamper is "€158",
 * not "€158.00": the decimals are noise on a gift purchase.
 */
export function formatMoney(value: Money): string {
  const hasCents = value.amountMinor % 100 !== 0
  return formatter(value.currencyCode, hasCents).format(value.amountMinor / 100)
}

export function formatMinor(amountMinor: number, currencyCode = 'EUR'): string {
  return formatMoney({ amountMinor, currencyCode })
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currencyCode !== b.currencyCode) {
    throw new Error(`Cannot add ${a.currencyCode} to ${b.currencyCode}`)
  }
  return { amountMinor: a.amountMinor + b.amountMinor, currencyCode: a.currencyCode }
}

export function multiplyMoney(value: Money, quantity: number): Money {
  return { amountMinor: value.amountMinor * quantity, currencyCode: value.currencyCode }
}

/** "From €95" for a product with a price range, "€95" for a single price. */
export function formatPriceRange(range: { min: Money; max: Money }): string {
  if (range.min.amountMinor === range.max.amountMinor) return formatMoney(range.min)
  return `From ${formatMoney(range.min)}`
}
