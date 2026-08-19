'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { joinWineClubAction } from '@/app/actions/wine-club'
import { Button } from '@/components/ui/Button'
import { trackWineClubEvent } from '@/lib/analytics/events'
import { formatMinor } from '@/lib/commerce/money'
import type { WineType } from '@/lib/wine-club/profiles'
import type { Recommendation } from '@/lib/wine-club/recommend'
import type { TasteProfile } from '@/lib/wine-club/taste'
import type { ClubBand, ClubCadence, ClubSize } from '@/lib/wine-club'

/**
 * The personalised box: the payoff screen, the swap drawer, the browse
 * escape hatch, and the review before checkout.
 *
 * Swapping and browsing both go back to the same deterministic engine via
 * /api/wine-recommendations, always excluding everything already in the
 * box and everything swapped out this session, so a rejected wine never
 * reappears two clicks later.
 */

export type BoxState = {
  box: Recommendation[]
  tasteProfile: TasteProfile
  bandId: string
  mix: Partial<Record<WineType, number>>
  swappedOut: string[]
  mixLabel: string
  cadenceId: string
  sizeId: string
}

const TYPE_LABEL: Record<WineType, string> = {
  red: 'Red',
  white: 'White',
  rose: 'Rosé',
  sparkling: 'Sparkling',
}

export function BoxScreen({
  state,
  relaxed,
  firstName,
  chargeMinor,
  cadenceLabel,
  onSwap,
  onReview,
  onBack,
}: {
  state: BoxState
  relaxed: string | null
  firstName: string
  chargeMinor: number
  cadenceLabel: string
  onSwap: (index: number, replacement: Recommendation, swappedOutHandle: string) => void
  onReview: () => void
  onBack: () => void
}) {
  const [swapping, setSwapping] = useState<number | null>(null)
  const [details, setDetails] = useState<Recommendation | null>(null)

  return (
    <section className="mx-auto max-w-[1100px] px-4 pt-4">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-gold">Your personalised wine box</p>
        <h1 className="mt-3 font-display text-[length:var(--text-display)] text-navy">
          {firstName ? `${firstName}, we found your wines` : 'We found your wines'}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-ink-muted">
          Chosen around your taste, your budget and your mix. Swap anything you are not sure about.
        </p>
        {relaxed === 'budget' ? (
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink-muted">
            We widened your price range slightly to fill the box from what is in stock.
          </p>
        ) : null}
      </header>

      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {state.box.map((wine, index) => (
          <li key={wine.handle}>
            <WineCard
              wine={wine}
              onDetails={() => {
                trackWineClubEvent('wine_details_viewed', { handle: wine.handle })
                setDetails(wine)
              }}
              onSwap={() => {
                trackWineClubEvent('wine_swap_started', { handle: wine.handle })
                setSwapping(index)
              }}
            />
          </li>
        ))}
      </ul>

      <div className="mt-10 flex justify-center gap-3 pb-6">
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button type="button" size="large" onClick={onReview}>
          Review subscription, {formatMinor(chargeMinor)} {cadenceLabel.toLowerCase()}
        </Button>
      </div>

      {swapping !== null && state.box[swapping] ? (
        <SwapDrawer
          state={state}
          index={swapping}
          onClose={() => setSwapping(null)}
          onSwap={(replacement) => {
            onSwap(swapping, replacement, state.box[swapping]!.handle)
            setSwapping(null)
          }}
        />
      ) : null}

      {details ? <DetailsDrawer wine={details} onClose={() => setDetails(null)} /> : null}
    </section>
  )
}

function WineCard({
  wine,
  onDetails,
  onSwap,
}: {
  wine: Recommendation
  onDetails: () => void
  onSwap: () => void
}) {
  return (
    <article className="flex h-full flex-col border border-navy/15 bg-cream">
      <div className="relative bg-beige">
        {wine.image ? (
          <Image
            src={wine.image.url}
            alt={wine.image.alt}
            width={600}
            height={600}
            sizes="(min-width: 1024px) 30vw, 45vw"
            className="aspect-square w-full object-contain"
          />
        ) : (
          <div className="aspect-square w-full" />
        )}
        <span className="absolute left-3 top-3 bg-navy px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-cream">
          {wine.matchLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="font-serif text-lg leading-snug text-navy">{wine.title}</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {[wine.region, wine.country].filter(Boolean).join(', ') || TYPE_LABEL[wine.wineType]}
          {wine.grapes.length ? ` · ${wine.grapes.join(', ')}` : ''}
        </p>
        <p className="mt-1 font-medium text-navy">{formatMinor(wine.priceMinor)}</p>

        {wine.tasteTags.length ? (
          <p className="mt-2 text-sm text-ink-muted">{wine.tasteTags.join(' · ')}</p>
        ) : null}

        <p className="mt-3 border-t border-rule pt-3 text-sm text-ink-muted">{wine.reason}</p>

        <div className="mt-auto flex gap-2 pt-4">
          <button
            type="button"
            onClick={onDetails}
            className="flex-1 border border-navy/30 py-2 text-sm text-navy hover:border-navy"
          >
            Wine details
          </button>
          <button
            type="button"
            onClick={onSwap}
            className="flex-1 border border-navy/30 py-2 text-sm text-navy hover:border-navy"
          >
            Swap wine
          </button>
        </div>
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Drawers. One overlay pattern, focus returned on close.
// ---------------------------------------------------------------------------

function Drawer({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-100 flex justify-end bg-navy/60" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="flex-1" onClick={onClose} />
      <div className="h-full w-full max-w-lg overflow-y-auto bg-cream p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl text-navy">{title}</h2>
          <button type="button" onClick={onClose} className="px-2 py-1 text-navy underline underline-offset-4">
            Close
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

function SwapDrawer({
  state,
  index,
  onClose,
  onSwap,
}: {
  state: BoxState
  index: number
  onClose: () => void
  onSwap: (replacement: Recommendation) => void
}) {
  const current = state.box[index]!
  const [alts, setAlts] = useState<Recommendation[] | null>(null)
  const [browse, setBrowse] = useState<Recommendation[] | null>(null)
  const [browsing, setBrowsing] = useState(false)
  const [failed, setFailed] = useState(false)

  const exclude = [...state.box.map((w) => w.handle), ...state.swappedOut]

  useEffect(() => {
    let cancelled = false
    fetch('/api/wine-recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'alternatives',
        tasteProfile: state.tasteProfile,
        budgetTierId: state.bandId,
        wineType: current.wineType,
        excludeHandles: exclude,
      }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((body: { recommendations: Recommendation[] }) => {
        if (!cancelled) setAlts(body.recommendations)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openBrowse() {
    setBrowsing(true)
    trackWineClubEvent('browse_all_wines_opened')
    try {
      const r = await fetch('/api/wine-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'browse',
          tasteProfile: state.tasteProfile,
          budgetTierId: state.bandId,
          wineType: current.wineType,
          excludeHandles: exclude,
        }),
      })
      if (!r.ok) throw new Error()
      const body = (await r.json()) as { recommendations: Recommendation[] }
      setBrowse(body.recommendations)
    } catch {
      setFailed(true)
    }
  }

  return (
    <Drawer title="Swap this wine" onClose={onClose}>
      <p className="text-sm text-ink-muted">
        Swapping <span className="text-navy">{current.title}</span>. Same colour, same budget.
      </p>

      {failed ? <p className="mt-6 text-sm text-red">That did not load. Close and try again.</p> : null}

      {!browsing ? (
        <>
          <h3 className="mt-6 text-xs uppercase tracking-[0.18em] text-ink-muted">
            Recommended alternatives
          </h3>
          <ul className="mt-3 space-y-3">
            {(alts ?? []).map((wine) => (
              <SwapRow key={wine.handle} wine={wine} current={current} onChoose={() => onSwap(wine)} />
            ))}
            {alts === null && !failed ? <li className="text-sm text-ink-muted">Finding alternatives…</li> : null}
            {alts?.length === 0 ? (
              <li className="text-sm text-ink-muted">
                Nothing else in this colour at this budget right now. Browse the full list instead.
              </li>
            ) : null}
          </ul>
          <Button type="button" variant="secondary" className="mt-6 w-full" onClick={openBrowse}>
            Browse all {TYPE_LABEL[current.wineType].toLowerCase()} wines
          </Button>
        </>
      ) : (
        <>
          <h3 className="mt-6 text-xs uppercase tracking-[0.18em] text-ink-muted">
            Every {TYPE_LABEL[current.wineType].toLowerCase()} at this budget, best match first
          </h3>
          <ul className="mt-3 space-y-3">
            {(browse ?? []).map((wine) => (
              <SwapRow key={wine.handle} wine={wine} current={current} onChoose={() => onSwap(wine)} />
            ))}
            {browse === null && !failed ? <li className="text-sm text-ink-muted">Loading the list…</li> : null}
          </ul>
        </>
      )}
    </Drawer>
  )
}

function SwapRow({
  wine,
  current,
  onChoose,
}: {
  wine: Recommendation
  current: Recommendation
  onChoose: () => void
}) {
  const diff = wine.priceMinor - current.priceMinor
  return (
    <li className="flex gap-3 border border-navy/15 p-3">
      {wine.image ? (
        <Image src={wine.image.url} alt={wine.image.alt} width={64} height={64} className="h-16 w-16 shrink-0 object-contain" />
      ) : (
        <div className="h-16 w-16 shrink-0 bg-beige" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-navy">{wine.title}</p>
        <p className="text-xs text-ink-muted">
          {[wine.region, wine.country].filter(Boolean).join(', ')}
          {wine.grapes.length ? ` · ${wine.grapes[0]}` : ''}
        </p>
        <p className="text-xs text-ink-muted">{wine.tasteTags.join(' · ')}</p>
        <p className="mt-1 text-sm text-navy">
          {formatMinor(wine.priceMinor)}
          {diff !== 0 ? (
            <span className="text-ink-muted">
              {' '}
              ({diff > 0 ? '+' : '−'}{formatMinor(Math.abs(diff))})
            </span>
          ) : null}
        </p>
      </div>
      <button
        type="button"
        onClick={onChoose}
        className="self-center border border-navy px-3 py-2 text-sm text-navy hover:bg-navy hover:text-cream"
      >
        Choose
      </button>
    </li>
  )
}

function DetailsDrawer({ wine, onClose }: { wine: Recommendation; onClose: () => void }) {
  return (
    <Drawer title={wine.title} onClose={onClose}>
      {wine.image ? (
        <Image src={wine.image.url} alt={wine.image.alt} width={400} height={400} className="mx-auto h-56 w-56 object-contain" />
      ) : null}
      <dl className="mt-6 space-y-2 text-sm">
        {[
          ['Type', TYPE_LABEL[wine.wineType]],
          ['Grape', wine.grapes.join(', ') || null],
          ['Country', wine.country],
          ['Region', wine.region],
          ['Vintage', wine.vintage],
          ['Producer', wine.producer],
          ['Price', formatMinor(wine.priceMinor)],
        ]
          .filter(([, v]) => v)
          .map(([term, value]) => (
            <div key={term as string} className="flex justify-between border-b border-rule pb-2">
              <dt className="text-ink-muted">{term}</dt>
              <dd className="text-right text-navy">{value}</dd>
            </div>
          ))}
      </dl>
      <h3 className="mt-6 text-xs uppercase tracking-[0.18em] text-ink-muted">Why we picked it</h3>
      <p className="mt-2 text-sm text-navy">{wine.reason}</p>
      {wine.exclusive ? (
        <p className="mt-2 text-sm text-ink-muted">We import this ourselves; no other Irish retailer lists it.</p>
      ) : null}
      <Button type="button" className="mt-8 w-full" onClick={onClose}>
        Keep this wine
      </Button>
    </Drawer>
  )
}

// ---------------------------------------------------------------------------
// Review: the last honest look before Shopify takes over.
// ---------------------------------------------------------------------------

export function ReviewScreen({
  state,
  clubBuyable,
  chargeMinor,
  cadence,
  size,
  tier,
  onEdit,
  onDone,
}: {
  state: BoxState
  clubBuyable: boolean
  chargeMinor: number
  cadence: ClubCadence
  size: ClubSize
  tier: { label: string }
  onEdit: (step: string) => void
  onDone: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null)

  function checkout() {
    trackWineClubEvent('subscription_checkout_started', {
      bottle_count: size.bottles,
      frequency: state.cadenceId,
      budget_tier: state.bandId,
    })
    startTransition(async () => {
      const result = await joinWineClubAction({
        cadenceId: state.cadenceId,
        sizeId: state.sizeId,
        bandId: state.bandId,
        mixLabel: state.mixLabel,
        bottleHandles: state.box.map((w) => w.handle),
      })
      if (result.ok) {
        setStatus({ kind: 'ok', message: 'Your subscription is in the cart.' })
        onDone()
        router.refresh()
      } else {
        setStatus({ kind: 'error', message: result.message })
      }
    })
  }

  return (
    <section className="mx-auto max-w-[900px] px-4 pt-4">
      <h1 className="text-center font-display text-[length:var(--text-display)] text-navy">
        Your wine subscription
      </h1>

      <div className="mt-10 grid gap-10 md:grid-cols-[1fr_320px]">
        <div>
          <h2 className="border-b border-rule pb-2 font-serif text-xl text-navy">Your wines</h2>
          <ul className="divide-y divide-rule">
            {state.box.map((wine) => (
              <li key={wine.handle} className="flex items-center gap-4 py-3">
                {wine.image ? (
                  <Image src={wine.image.url} alt={wine.image.alt} width={56} height={56} className="h-14 w-14 shrink-0 object-contain" />
                ) : (
                  <div className="h-14 w-14 shrink-0 bg-beige" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-navy">{wine.title}</p>
                  <p className="text-xs text-ink-muted">
                    {[wine.grapes[0], wine.country].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="text-sm text-ink-muted">{formatMinor(wine.priceMinor)}</span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => onEdit('box')} className="mt-3 text-sm text-navy underline underline-offset-4">
            Change wines
          </button>

          <h2 className="mt-8 border-b border-rule pb-2 font-serif text-xl text-navy">Your plan</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <PlanRow term="Case" value={`${size.bottles} bottles, ${state.mixLabel.toLowerCase()}`} onEdit={() => onEdit('quantity')} />
            <PlanRow term="Level" value={tier.label} onEdit={() => onEdit('budget')} />
            <PlanRow term="Delivered" value={cadence.label.toLowerCase()} onEdit={() => onEdit('frequency')} />
          </dl>
        </div>

        <aside className="h-fit border border-navy/20 bg-beige p-6">
          <h2 className="font-serif text-xl text-navy">Subscription total</h2>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-sm text-ink-muted">Each delivery</span>
            <span className="font-serif text-2xl text-navy">{formatMinor(chargeMinor)}</span>
          </div>
          <p className="mt-2 text-sm text-navy">
            {formatMinor(chargeMinor)} {cadence.label.toLowerCase()}, until you pause or cancel.
            This is recurring billing, handled by Shopify.
          </p>

          {clubBuyable ? (
            <Button type="button" size="large" className="mt-5 w-full" disabled={pending} onClick={checkout}>
              {pending ? 'One moment' : 'Continue to checkout'}
            </Button>
          ) : (
            <div className="mt-5 border border-gold bg-cream px-4 py-4 text-sm text-ink-muted">
              <p className="font-medium text-navy">Not open for sign-ups yet</p>
              <p className="mt-1">
                Subscriptions are billed by Shopify, and that has to be switched on for the store
                before anyone can join. Everything here is ready for the day it is.
              </p>
            </div>
          )}

          {status ? (
            <p role="status" className={`mt-3 text-sm ${status.kind === 'error' ? 'text-red' : 'text-green'}`}>
              {status.message}
              {status.kind === 'ok' ? (
                <>
                  {' '}
                  <Link href="/cart" className="underline underline-offset-4">
                    Go to the cart
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}

          <ul className="mt-5 space-y-1 border-t border-rule pt-4 text-xs text-ink-muted">
            <li>Swap wines before each delivery</li>
            <li>Skip a box or change your frequency</li>
            <li>Pause or cancel any time from your account</li>
            <li>Over 18s only; somebody over 18 takes the delivery in</li>
          </ul>
        </aside>
      </div>
    </section>
  )
}

function PlanRow({ term, value, onEdit }: { term: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-muted">{term}</dt>
      <dd className="flex items-center gap-3 text-right text-navy">
        {value}
        <button type="button" onClick={onEdit} className="text-xs text-navy underline underline-offset-4">
          Change
        </button>
      </dd>
    </div>
  )
}

export type { ClubBand }
