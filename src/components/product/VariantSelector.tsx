'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { cheapestAvailableVariant, formatMoney } from '@/lib/commerce/money'
import type { Product, ProductVariant } from '@/lib/commerce/types'

/**
 * Variant selection for a product detail page.
 *
 * The selected variant has to drive two DOM regions that sit far apart in
 * every template: the price line near the top and the add-to-cart form near
 * the bottom, separated by static server-rendered content (stars, delivery
 * promise, description, specs). Client state cannot be prop-drilled across
 * those server components, so it is shared through this small page-scoped
 * context. The static content stays server-rendered and is passed through the
 * provider as children.
 *
 * The control is one native <select> of variant titles that selects a variant
 * directly, not one control per option axis. The live catalogue is
 * overwhelmingly single-axis and its option *names* are inconsistent and
 * sometimes wrong, whereas each variant's `title` is always exactly the clean,
 * customer-facing option value(s). A single title dropdown scales from 2 to
 * 30+ variants, is keyboard and screen-reader friendly, and needs no
 * option-combination logic. The lone two-axis product still reads correctly as
 * one dropdown ("M / BEER").
 */

type VariantSelectionValue = {
  product: Product
  selectedVariant: ProductVariant | undefined
  selectVariant: (id: string) => void
}

const VariantSelectionContext = createContext<VariantSelectionValue | null>(null)

export function useVariantSelection(): VariantSelectionValue {
  const value = useContext(VariantSelectionContext)
  if (!value) {
    throw new Error('useVariantSelection must be used within a VariantSelectionProvider')
  }
  return value
}

/** Non-throwing variant: for components (like the gallery) that read the
 *  selection when a provider is present but must still work without one. */
export function useVariantSelectionOptional(): VariantSelectionValue | null {
  return useContext(VariantSelectionContext)
}

export function VariantSelectionProvider({
  product,
  children,
}: {
  product: Product
  children: ReactNode
}) {
  // Open on the cheapest variant a shopper can actually buy, per the shared
  // initial-selection rule used across the site.
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => cheapestAvailableVariant(product.variants)?.id,
  )

  // Deep link: a product card links with ?variant=<id> so the PDP opens on the
  // variant the shopper clicked (e.g. the in-band price from a budget listing).
  // Read it client-side after mount, so the page stays static and the server
  // render matches hydration before the selection snaps to the linked variant.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('variant')
    if (!raw) return
    const match = product.variants.find((v) => v.id === raw || v.id.split('/').pop() === raw)
    if (match?.availableForSale) setSelectedId(match.id)
  }, [product])

  const value = useMemo<VariantSelectionValue>(() => {
    const selectedVariant =
      product.variants.find((v) => v.id === selectedId) ??
      cheapestAvailableVariant(product.variants)
    return {
      product,
      selectedVariant,
      selectVariant: setSelectedId,
    }
  }, [product, selectedId])

  return (
    <VariantSelectionContext.Provider value={value}>{children}</VariantSelectionContext.Provider>
  )
}

/**
 * The price of the currently selected variant. Renders the exact markup the
 * templates rendered before, so a single-variant page is byte-identical. The
 * live region announces the change to screen readers now that the price moves
 * on selection.
 */
export function VariantPrice() {
  const { selectedVariant } = useVariantSelection()
  if (!selectedVariant) return null
  return (
    <p className="mt-2 font-serif text-2xl text-navy" aria-live="polite">
      {formatMoney(selectedVariant.price)}
    </p>
  )
}

/**
 * The variant chooser. Renders nothing for a single-variant product, so those
 * pages behave exactly as before. Sold-out variants are shown but disabled and
 * labelled, so they can never be selected or added.
 */
const VISIBLE_VARIANTS = 12

export function VariantSelector() {
  const { product, selectedVariant, selectVariant } = useVariantSelection()
  const [showAll, setShowAll] = useState(false)

  if (product.variants.length <= 1) return null

  const name = `variant-${product.handle}`
  // "Options" reads better than "Title" for a single-axis product; if there is
  // a real multi-axis option name, use it.
  const optionName = product.variants[0]?.selectedOptions.map((o) => o.name).join(' / ') || 'Options'
  const legend = /title/i.test(optionName) ? 'Options' : optionName

  // Big variant sets (30+ necklace styles) collapse to a first row plus a
  // "show all". The selected variant is always kept visible even when
  // collapsed, so a deep-linked or picked option beyond the fold still shows.
  let shown = showAll ? product.variants : product.variants.slice(0, VISIBLE_VARIANTS)
  if (!showAll && selectedVariant && !shown.some((v) => v.id === selectedVariant.id)) {
    shown = [selectedVariant, ...shown.slice(0, VISIBLE_VARIANTS - 1)]
  }
  const hiddenCount = product.variants.length - shown.length

  return (
    <fieldset className="mt-8 border-t border-rule pt-6">
      <legend className="text-sm font-medium text-navy">
        {legend}
        {selectedVariant ? (
          <span className="ml-2 font-normal text-ink-muted">{selectedVariant.title}</span>
        ) : null}
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {shown.map((variant) => {
          const selected = variant.id === selectedVariant?.id
          const soldOut = !variant.availableForSale
          return (
            <label
              key={variant.id}
              className={[
                'inline-flex cursor-pointer select-none items-center border px-4 py-2 text-sm transition-colors',
                'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-navy',
                selected
                  ? 'border-navy bg-navy text-cream'
                  : 'border-rule bg-white text-navy hover:border-navy',
                soldOut ? 'cursor-not-allowed text-ink-muted/50 line-through hover:border-rule' : '',
              ].join(' ')}
            >
              <input
                type="radio"
                name={name}
                value={variant.id}
                checked={selected}
                disabled={soldOut}
                onChange={() => selectVariant(variant.id)}
                className="sr-only"
              />
              {variant.title}
              {soldOut ? <span className="ml-1 no-underline">(sold out)</span> : null}
            </label>
          )
        })}
        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="inline-flex items-center border border-dashed border-navy/50 px-4 py-2 text-sm text-navy transition-colors hover:border-navy hover:bg-beige"
          >
            Show all {product.variants.length}
          </button>
        ) : null}
        {showAll && product.variants.length > VISIBLE_VARIANTS ? (
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="inline-flex items-center px-4 py-2 text-sm text-ink-muted underline underline-offset-4 hover:text-navy"
          >
            Show fewer
          </button>
        ) : null}
      </div>
    </fieldset>
  )
}
