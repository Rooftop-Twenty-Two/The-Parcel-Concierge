'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { CartCount } from '@/components/layout/CartCount'
import { SearchForm } from '@/components/layout/SearchForm'
import { formatMinor } from '@/lib/commerce/money'
import { NAV } from '@/lib/routes'
import { DELIVERY, handDeliveryZone, ukDeliveryPrice } from '@/lib/site-config'

/**
 * Site header.
 *
 * Seven top level items, maximum two levels deep. The old mega-menu was
 * three deep and unusable on a phone, and most gift buying happens on a
 * phone.
 *
 * "Build your own hamper" gets its own persistent, visually distinct entry
 * point, because it is the highest-intent thing on the site and it used to
 * live on another domain entirely.
 */
export function Header() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenIndex(null)
        setMobileOpen(false)
        setSearchOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    // The dropdown closes when the pointer leaves the HEADER, not the nav.
    // The panel hangs below the nav with the header's own padding in
    // between: closing on nav mouseleave meant the pointer fell off the
    // menu in that padding, before it ever reached the panel. The panel is
    // a DOM descendant of the header, so moving into it never counts as
    // leaving, however far below the bar it extends.
    <header
      className="sticky top-0 z-50 border-b border-rule bg-cream/95 backdrop-blur"
      onMouseLeave={() => setOpenIndex(null)}
    >
      <DeliveryBar />

      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 lg:px-8">
        <Link href="/" className="shrink-0" aria-label="The Parcel Concierge, home">
          <Image
            src="/brand/logo.svg"
            alt="The Parcel Concierge"
            width={145}
            height={66}
            priority
            className="h-11 w-auto lg:h-14"
          />
        </Link>

        <nav ref={navRef} aria-label="Main" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-7">
            {NAV.map((item, index) => (
              <li key={item.href} className="static">
                <Link
                  href={item.href}
                  className="inline-flex items-center py-3 text-sm tracking-wide text-navy hover:underline"
                  onMouseEnter={() => setOpenIndex(item.columns.length ? index : null)}
                  onFocus={() => setOpenIndex(item.columns.length ? index : null)}
                  aria-expanded={item.columns.length ? openIndex === index : undefined}
                >
                  {item.label}
                </Link>

                {item.columns.length && openIndex === index ? (
                  <MegaPanel item={item} onClose={() => setOpenIndex(null)} />
                ) : null}
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-3 lg:ml-6">
          <Link
            href="/build-your-own-hamper"
            className="hidden items-center gap-2 border-2 border-red px-4 py-2 text-sm font-medium text-red transition-colors hover:bg-red hover:text-cream md:inline-flex"
          >
            Build your own hamper
          </Link>

          {/* Search opens a row under the bar rather than an input in it:
              the bar is full at desktop width, and a box wide enough to
              type a wine's name into would not fit. Same control at every
              width, so it is where a phone user expects it too. */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-2 py-2 text-sm text-navy"
            aria-expanded={searchOpen}
            aria-controls="site-search-row"
            onClick={() => {
              setSearchOpen((open) => !open)
              setMobileOpen(false)
            }}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M13 13l4.5 4.5" strokeLinecap="round" />
            </svg>
            {/* Icon only on the narrowest phones (320px), where the label
                pushed the Menu button off the side of the screen. The word
                stays for screen readers. */}
            <span className="max-[359px]:sr-only">Search</span>
          </button>

          <Link
            href="/cart"
            className="relative inline-flex items-center gap-2 px-2 py-2 text-sm text-navy"
          >
            Cart
            <CartCount />
          </Link>

          <button
            type="button"
            className="inline-flex items-center px-2 py-2 text-sm text-navy lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => {
              setMobileOpen((open) => !open)
              setSearchOpen(false)
            }}
          >
            {mobileOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      {searchOpen ? (
        <div id="site-search-row" className="border-t border-rule bg-cream">
          <div className="mx-auto max-w-[1400px] px-4 py-3 lg:px-8">
            <div className="max-w-2xl">
              {/* No close-on-submit: a form unmounted inside its own submit
                  event is never sent. The GET is a full navigation, which
                  resets the header anyway. */}
              <SearchForm autoFocus />
            </div>
          </div>
        </div>
      ) : null}

      {mobileOpen ? <MobileNav onNavigate={() => setMobileOpen(false)} /> : null}
    </header>
  )
}

/**
 * The delivery offer, on every page. Built from site-config rather than
 * typed out, so the day a rate or the hand-delivery area changes it
 * changes here too.
 */
function DeliveryBar() {
  const zone = handDeliveryZone()
  // The free-over threshold is a clause of the national rate, not a
  // sentence of its own: joined with the others it read "with An Post.
  // free over €100.", lowercase after a full stop.
  const national = [
    `${formatMinor(DELIVERY.national.priceMinor)} elsewhere in Ireland with ${DELIVERY.carrier}`,
    DELIVERY.freeDeliveryThresholdMinor === null
      ? null
      : `free over ${formatMinor(DELIVERY.freeDeliveryThresholdMinor)}`,
  ]
    .filter((clause): clause is string => clause !== null)
    .join(', ')

  const ukPrice = ukDeliveryPrice(formatMinor)
  const parts = [
    zone ? `Free local delivery in ${zone}` : 'Free hand delivery in our local area',
    national,
    ukPrice ? `UK ${ukPrice}` : null,
  ].filter((part): part is string => part !== null)

  return (
    <div className="bg-navy text-cream">
      <p className="mx-auto max-w-[1400px] px-4 py-2 text-center text-[13px] tracking-wide lg:px-8">
        {parts.join('. ')}.
      </p>
    </div>
  )
}

type NavItem = (typeof NAV)[number]

function MegaPanel({ item, onClose }: { item: NavItem; onClose: () => void }) {
  return (
    <div
      className="absolute inset-x-0 top-full border-b border-rule bg-cream shadow-[0_18px_40px_-28px_rgba(44,67,73,0.5)]"
      onMouseLeave={onClose}
    >
      <div className="mx-auto grid max-w-[1400px] gap-10 px-8 py-9 lg:grid-cols-[1fr_1fr_1fr_320px]">
        {item.columns.map((column) => (
          <div key={column.title}>
            <h2 className="mb-3 text-xs uppercase tracking-[0.18em] text-ink-muted">
              {column.title}
            </h2>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-navy hover:underline" onClick={onClose}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/*
          Every panel carries one hamper image and one promoted listing.
          A wall of links is what the old menu was.
        */}
        {item.promo ? (
          <Link href={item.promo.href} className="group block" onClick={onClose}>
            <div className="stamp-edge stamp-edge-sm overflow-hidden bg-beige">
              <Image
                src={item.promo.imageSrc}
                alt={item.promo.imageAlt}
                width={640}
                height={800}
                className="aspect-4/3 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <h3 className="mt-3 font-serif text-lg font-semibold text-navy group-hover:underline">
              {item.promo.title}
            </h3>
            <p className="mt-1 text-sm text-ink-muted">{item.promo.body}</p>
          </Link>
        ) : null}
      </div>
    </div>
  )
}

function MobileNav({ onNavigate }: { onNavigate: () => void }) {
  return (
    <nav
      id="mobile-nav"
      aria-label="Main"
      className="max-h-[75vh] overflow-y-auto border-t border-rule bg-cream lg:hidden"
    >
      {/* The box is in the bar too, but the drawer is where a phone user
          goes looking for anything, so it is the first thing in it. */}
      <div className="px-4 pt-4">
        <SearchForm />
      </div>
      <ul className="divide-y divide-rule px-4 pb-8">
        {NAV.map((item) => (
          <li key={item.href} className="py-3">
            <Link
              href={item.href}
              className="block py-1 font-serif text-lg font-semibold text-navy"
              onClick={onNavigate}
            >
              {item.label}
            </Link>
            {item.columns.length ? (
              <ul className="mt-1 space-y-1">
                {item.columns.flatMap((column) =>
                  column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="block py-1 text-sm text-ink-muted"
                        onClick={onNavigate}
                      >
                        {link.label}
                      </Link>
                    </li>
                  )),
                )}
              </ul>
            ) : null}
          </li>
        ))}
        <li className="pt-5">
          <Link
            href="/build-your-own-hamper"
            className="block border-2 border-red px-4 py-3 text-center font-medium text-red"
            onClick={onNavigate}
          >
            Build your own hamper
          </Link>
        </li>
      </ul>
    </nav>
  )
}
