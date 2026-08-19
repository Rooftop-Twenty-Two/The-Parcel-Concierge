'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { joinWineClubAction } from '@/app/actions/wine-club'
import { Button } from '@/components/ui/Button'
import { formatMinor } from '@/lib/commerce/money'
import {
  BANDS,
  CADENCES,
  DEFAULT_SELECTION,
  SIZES,
  STYLES,
  caseFromMinor,
  isClubBuyable,
  resolve,
  type ClubSelection,
} from '@/lib/wine-club'

/**
 * Choosing a subscription.
 *
 * Four decisions, all visible at once, with the price updating as they
 * change. No wizard: the price is the thing people are deciding on and a
 * wizard hides it.
 *
 * Every price is a floor, not an estimate. "From €150" means there are
 * wines in stock at that price, and the band tells you how many.
 */
export function WineClubBuilder({
  bandCounts,
}: {
  bandCounts: { bandId: string; count: number }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selection, setSelection] = useState<ClubSelection>(DEFAULT_SELECTION)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null)

  const { cadence, size, band, style } = useMemo(() => resolve(selection), [selection])
  const perCase = caseFromMinor(size, band)
  const perYear = perCase * cadence.perYear
  const buyable = isClubBuyable()

  const counts = useMemo(
    () => Object.fromEntries(bandCounts.map((b) => [b.bandId, b.count])),
    [bandCounts],
  )

  function set<K extends keyof ClubSelection>(key: K, value: ClubSelection[K]) {
    setStatus(null)
    setSelection((current) => ({ ...current, [key]: value }))
  }

  function join() {
    startTransition(async () => {
      const result = await joinWineClubAction(selection)
      if (result.ok) {
        setStatus({ kind: 'ok', message: 'Added to cart' })
        router.refresh()
      } else {
        setStatus({ kind: 'error', message: result.message })
      }
    })
  }

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8" aria-label="Build your subscription">
      <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <Choice
            legend="How many bottles"
            name="size"
            options={SIZES.map((s) => ({
              value: s.id,
              label: s.label,
              description: s.description,
            }))}
            value={selection.sizeId}
            onChange={(v) => set('sizeId', v)}
          />

          <Choice
            legend="Roughly what per bottle"
            name="band"
            options={BANDS.map((b) => ({
              value: b.id,
              label: `${b.label}, from ${formatMinor(b.fromMinor)} a bottle`,
              description: `${b.description} ${counts[b.id] ?? 0} wines in stock at this level right now.`,
            }))}
            value={selection.bandId}
            onChange={(v) => set('bandId', v)}
          />

          <Choice
            legend="What kind of wine"
            name="style"
            options={STYLES.map((s) => ({ value: s.id, label: s.label, description: s.description }))}
            value={selection.styleId}
            onChange={(v) => set('styleId', v)}
          />

          <Choice
            legend="How often"
            name="cadence"
            options={CADENCES.map((c) => ({
              value: c.id,
              label: c.label,
              description: c.description,
            }))}
            value={selection.cadenceId}
            onChange={(v) => set('cadenceId', v)}
          />
        </div>

        <aside className="lg:sticky lg:top-40 lg:self-start">
          <div className="border border-navy/20 bg-beige p-6">
            <h2 className="font-display text-2xl text-navy">Your subscription</h2>

            <dl className="mt-4 space-y-2 border-b border-rule pb-4 text-sm">
              <Row term="Case" detail={`${size.bottles} bottles, ${style.label.toLowerCase()}`} />
              <Row term="Level" detail={`${band.label}, from ${formatMinor(band.fromMinor)} a bottle`} />
              <Row term="Delivered" detail={cadence.label.toLowerCase()} />
            </dl>

            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-serif text-lg text-navy">Each case</span>
              <span className="font-serif text-2xl text-navy">from {formatMinor(perCase)}</span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {formatMinor(perYear)} a year at {cadence.perYear}{' '}
              {cadence.perYear === 1 ? 'case' : 'cases'}. You are charged per case, not up front.
            </p>

            {buyable ? (
              <Button type="button" size="large" className="mt-5 w-full" disabled={pending} onClick={join}>
                {pending ? 'One moment' : 'Start the subscription'}
              </Button>
            ) : (
              <div className="mt-5 border border-gold bg-cream px-4 py-4 text-sm text-ink-muted">
                <p className="font-medium text-navy">Not open for sign-ups yet</p>
                <p className="mt-1">
                  Subscriptions are billed by Shopify, and that has to be switched on for the store
                  before anyone can join. Everything on this page is ready for the day it is.
                </p>
              </div>
            )}

            {status ? (
              <p
                role="status"
                className={`mt-3 text-sm ${status.kind === 'error' ? 'text-red' : 'text-green'}`}
              >
                {status.message}
                {status.kind === 'ok' ? (
                  <>
                    {' '}
                    <a href="/cart" className="underline underline-offset-4">
                      Go to your cart
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}

            <p className="mt-4 border-t border-rule pt-4 text-xs text-ink-muted">
              Pause, skip a case or cancel any time from your account. You must be over 18, and
              somebody over 18 has to take the delivery in.
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}

function Row({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-navy">{term}</dt>
      <dd className="text-right text-ink-muted">{detail}</dd>
    </div>
  )
}

function Choice({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string
  name: string
  options: { value: string; label: string; description: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <fieldset>
      <legend className="border-b border-rule pb-3 font-display text-2xl text-navy">
        {legend}
      </legend>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {options.map((option) => {
          const selected = option.value === value
          return (
            <li key={option.value}>
              <label
                className={`flex h-full cursor-pointer flex-col border p-4 transition-colors ${
                  selected ? 'border-navy bg-beige' : 'border-rule hover:border-navy/50'
                }`}
              >
                <span className="flex items-start gap-2 font-serif text-base text-navy">
                  <input
                    type="radio"
                    name={name}
                    value={option.value}
                    checked={selected}
                    onChange={() => onChange(option.value)}
                    className="mt-1.5"
                  />
                  {option.label}
                </span>
                <span className="mt-2 text-sm text-ink-muted">{option.description}</span>
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
