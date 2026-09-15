'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addBuiltHamperAction } from '@/app/actions/hamper-builder'
import { AgeGateDialog } from '@/components/commerce/AgeGateDialog'
import { ItemsPicker, type PickerItem } from '@/components/builder/ItemsPicker'
import { Button } from '@/components/ui/Button'
import { trackHamperBuilderStep } from '@/lib/analytics/events'
import { formatMinor } from '@/lib/commerce/money'
import type { Product } from '@/lib/commerce/types'
import { BOX_OPTIONS, boxById } from '@/lib/hamper-builder'
import { AGE_GATE } from '@/lib/site-config'

/**
 * The builder, as a four step wizard.
 *
 * Box, items, extras, review: the same order the shop walks a customer
 * through at the counter. There is no delivery-country step: the
 * destination comes from the address at checkout, which is where the buyer
 * is typing it anyway. The running total never leaves the
 * screen; it lives in a bar pinned to the bottom, with the step controls,
 * so the two things a buyer actually watches (what it costs, what is
 * next) are always in the same place.
 *
 * The whole shop is behind the fill-it step. Everything the client publishes
 * that is not a hamper is either on the main site (wine) or a quarantined
 * builder item, and the picker serves both from one API.
 *
 * State survives a reload via sessionStorage: four steps is enough
 * invested time that losing it to a stray swipe would be rude.
 */

const STEPS = [
  { id: 'box', label: 'Box or basket' },
  { id: 'items', label: 'Fill it' },
  { id: 'extras', label: 'Finishing touches' },
  { id: 'review', label: 'Review' },
] as const

type StepId = (typeof STEPS)[number]['id']

type Chosen = { item: PickerItem; quantity: number }

type PersistedState = {
  step: StepId
  boxId: string
  chosen: Record<string, Chosen>
  giftMessage: string
  /** Optional so a state persisted before the bow existed still restores. */
  bowAdded?: boolean
}

const STORAGE_KEY = 'tpc-builder-wizard'

function loadPersisted(): PersistedState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedState
    if (!STEPS.some((s) => s.id === parsed.step)) return null
    return parsed
  } catch {
    return null
  }
}

export function BuilderWizard({
  parent,
  bow,
}: {
  parent: Product
  /** The gift-bow product's buyable variant, or null when the store has none. */
  bow: { variantId: string; priceMinor: number } | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [step, setStep] = useState<StepId>('box')
  const [boxId, setBoxId] = useState(BOX_OPTIONS[1]?.id ?? BOX_OPTIONS[0]!.id)
  const [chosen, setChosen] = useState<Record<string, Chosen>>({})
  const [giftMessage, setGiftMessage] = useState('')
  const [bowAdded, setBowAdded] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null)
  const [showAgeGate, setShowAgeGate] = useState(false)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // The age cookie is httpOnly, so the only way to know is to ask. Asked
  // once on mount; confirming through the dialog updates it directly.
  useEffect(() => {
    fetch('/api/age-check')
      .then((r) => (r.ok ? r.json() : { confirmed: false }))
      .then((body: { confirmed?: boolean }) => setAgeConfirmed(Boolean(body.confirmed)))
      .catch(() => setAgeConfirmed(false))
  }, [])

  // Restore a half-built box after a reload.
  useEffect(() => {
    const persisted = loadPersisted()
    if (persisted) {
      setStep(persisted.step)
      setBoxId(persisted.boxId)
      setChosen(persisted.chosen)
      setGiftMessage(persisted.giftMessage)
      setBowAdded(Boolean(persisted.bowAdded))
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step, boxId, chosen, giftMessage, bowAdded }),
      )
    } catch {
      // A full store loses persistence, not the builder.
    }
  }, [hydrated, step, boxId, chosen, giftMessage, bowAdded])

  const box = boxById(boxId) ?? BOX_OPTIONS[0]!
  const boxVariant = parent.variants.find((v) => v.title === box.variantTitle) ?? parent.variants[0]

  const chosenList = useMemo(
    () => Object.values(chosen).filter((c) => c.quantity > 0 && c.item.variantId),
    [chosen],
  )
  const itemCount = chosenList.reduce((sum, c) => sum + c.quantity, 0)
  const contentsMinor = chosenList.reduce((sum, c) => sum + c.item.priceMinor * c.quantity, 0)
  const bowMinor = bowAdded && bow ? bow.priceMinor : 0
  const totalMinor = contentsMinor + bowMinor + (boxVariant?.price.amountMinor ?? 0)
  const overCapacity = itemCount > box.capacity
  const containsAlcohol = chosenList.some((c) => c.item.alcohol)

  function adjust(item: PickerItem, delta: number) {
    setStatus(null)
    setChosen((current) => {
      const existing = current[item.id]?.quantity ?? 0
      const next = Math.max(0, existing + delta)
      trackHamperBuilderStep('adjust_component', { handle: item.handle, quantity: next })
      if (next === 0) {
        const { [item.id]: _removed, ...rest } = current
        return rest
      }
      return { ...current, [item.id]: { item, quantity: next } }
    })
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  function goTo(next: StepId) {
    setStatus(null)
    setStep(next)
    trackHamperBuilderStep(`step_${next}`)
    // A new step starts at the top, like a new page would.
    window.scrollTo({ top: 0 })
  }

  /** Why Continue is disabled, or null when it is not. */
  const blocked: string | null = (() => {
    switch (step) {
      case 'box':
        return null
      case 'items':
        if (itemCount === 0) return 'Put something in it'
        if (overCapacity) return `${box.capacity} fit in this one`
        return null
      case 'extras':
        return null
      case 'review':
        return null
    }
  })()

  function addToCart() {
    if (!boxVariant) return
    if (containsAlcohol && !ageConfirmed) {
      setShowAgeGate(true)
      return
    }

    startTransition(async () => {
      const result = await addBuiltHamperAction({
        boxVariantId: boxVariant.id,
        boxId: box.id,
        components: chosenList.map((c) => ({ variantId: c.item.variantId!, quantity: c.quantity })),
        giftMessage,
        bowVariantId: bowAdded && bow ? bow.variantId : null,
        bottlesAdded: chosenList.reduce((sum, c) => sum + (c.item.alcohol ? c.quantity : 0), 0),
      })

      if (result.ok) {
        trackHamperBuilderStep('added_to_cart', { itemCount, totalMinor })
        setStatus({ kind: 'ok', message: 'Your hamper is in the cart.' })
        try {
          window.sessionStorage.removeItem(STORAGE_KEY)
        } catch {
          // Losing the cleanup is harmless.
        }
        router.refresh()
      } else {
        setStatus({ kind: 'error', message: result.message })
        router.refresh()
      }
    })
  }

  return (
    <>
      {showAgeGate ? (
        <AgeGateDialog
          minimumAge={AGE_GATE.minimumAge}
          context="cart"
          onConfirmed={() => {
            setShowAgeGate(false)
            setAgeConfirmed(true)
          }}
        />
      ) : null}

      <header className="bg-navy py-10 text-cream">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
          <p className="mb-2 text-xs uppercase tracking-[0.24em] text-gold">Made to order</p>
          <h1 className="font-display text-[length:var(--text-display)] leading-[0.95]">
            Build your own hamper
          </h1>
          <p className="mt-3 max-w-2xl text-cream/85">
            Everything we sell online is on these shelves, and the shop in Dunshaughlin carries
            even more. Pick a hamper box or wicker basket, fill it, write the card, and we pack it by hand.
          </p>
        </div>
      </header>

      <Progress current={stepIndex} onJump={(i) => i < stepIndex && goTo(STEPS[i]!.id)} />

      {/* pb clears the sticky bar. */}
      <main className="mx-auto max-w-[1400px] px-4 pb-44 pt-10 lg:px-8">
        {step === 'box' ? (
          <StepShell title="Choose your hamper box or wicker basket" lede="Every size is packed the same way: by hand, hand tied, built so nothing moves.">
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {BOX_OPTIONS.map((option) => {
                const variant = parent.variants.find((v) => v.title === option.variantTitle)
                return (
                  <li key={option.id}>
                    <CardChoice
                      selected={boxId === option.id}
                      onSelect={() => setBoxId(option.id)}
                      title={option.variantTitle}
                      price={variant ? formatMinor(variant.price.amountMinor) : undefined}
                      body={option.description}
                    />
                  </li>
                )
              })}
            </ul>
          </StepShell>
        ) : null}

        {step === 'items' ? (
          <StepShell
            title="Fill it"
            lede={`${box.variantTitle} holds up to ${box.capacity} things. Browse the shelves or search the whole shop.`}
          >
            <ItemsPicker
              quantities={Object.fromEntries(chosenList.map((c) => [c.item.id, c.quantity]))}
              onAdjust={adjust}
            />
          </StepShell>
        ) : null}

        {step === 'extras' ? (
          <StepShell title="Finishing touches" lede="We write your personal message on our Parcel Concierge postcards, however if you would like a more personal greeting card please choose from the greeting card section and we can write it for you.">
            <div className="max-w-2xl space-y-8">
              {bow ? (
                <div>
                  <h3 className="font-serif text-xl text-navy">Bow</h3>
                  <button
                    type="button"
                    onClick={() => setBowAdded(!bowAdded)}
                    aria-pressed={bowAdded}
                    className={`mt-3 border px-4 py-2 text-sm transition-colors ${
                      bowAdded
                        ? 'border-navy bg-navy text-cream'
                        : 'border-navy/25 text-navy hover:border-navy'
                    }`}
                  >
                    Hand tied bow, {formatMinor(bow.priceMinor)}
                  </button>
                  <p className="mt-2 text-sm text-ink-muted">
                    Hand tied on top when your hamper is packed.
                  </p>
                </div>
              ) : null}

              <label className="block">
                <span className="font-serif text-xl text-navy">Gift message</span>
                <span className="mt-1 block text-sm text-ink-muted">
                  We write it out by hand and never print the price.
                </span>
                <textarea
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value.slice(0, 250))}
                  rows={4}
                  className="mt-3 w-full border border-navy/25 bg-cream p-3 text-navy outline-none focus:border-navy"
                  placeholder="Dear Aoife, congratulations on the new house…"
                />
                <span className="mt-1 block text-right text-xs text-ink-muted">
                  {giftMessage.length}/250
                </span>
              </label>
            </div>
          </StepShell>
        ) : null}

        {step === 'review' ? (
          <StepShell title="Look it over" lede="Change anything before it goes in the cart.">
            <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
              <div>
                <ReviewRow
                  label="Box or basket"
                  value={`${box.variantTitle}${boxVariant ? `, ${formatMinor(boxVariant.price.amountMinor)}` : ''}`}
                  onEdit={() => goTo('box')}
                />
                <ReviewRow
                  label="Finishing touches"
                  value={[
                    bowAdded && bow ? `Hand tied bow, ${formatMinor(bow.priceMinor)}` : null,
                    giftMessage ? 'Gift message written' : 'No gift message',
                  ]
                    .filter(Boolean)
                    .join('. ')}
                  onEdit={() => goTo('extras')}
                />

                <h3 className="mt-8 border-b border-rule pb-2 font-serif text-xl text-navy">
                  Inside ({itemCount} {itemCount === 1 ? 'thing' : 'things'})
                </h3>
                <ul className="divide-y divide-rule">
                  {chosenList.map(({ item, quantity }) => (
                    <li key={item.id} className="flex items-center gap-4 py-3">
                      {item.image ? (
                        <Image
                          src={item.image.url}
                          alt={item.image.alt}
                          width={64}
                          height={64}
                          className="h-16 w-16 shrink-0 object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 shrink-0 bg-beige" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-navy">{item.title}</p>
                        <p className="text-sm text-ink-muted">{formatMinor(item.priceMinor)}</p>
                      </div>
                      <div className="flex items-center border border-navy/40">
                        <button type="button" onClick={() => adjust(item, -1)} className="px-3 py-1 text-navy" aria-label={`One fewer ${item.title}`}>
                          −
                        </button>
                        <span className="px-2 text-sm">{quantity}</span>
                        <button type="button" onClick={() => adjust(item, 1)} className="px-3 py-1 text-navy" aria-label={`One more ${item.title}`}>
                          +
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                {itemCount === 0 ? (
                  <p className="mt-4 text-ink-muted">
                    Nothing in it yet.{' '}
                    <button type="button" className="underline" onClick={() => goTo('items')}>
                      Go and fill it
                    </button>
                    .
                  </p>
                ) : null}
              </div>

              <aside className="h-fit border border-navy/20 bg-beige p-6 lg:sticky lg:top-40">
                <h3 className="font-serif text-xl text-navy">Your hamper</h3>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-muted">{box.variantTitle}</dt>
                    <dd className="text-navy">{boxVariant ? formatMinor(boxVariant.price.amountMinor) : ''}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-muted">
                      Contents, {itemCount} {itemCount === 1 ? 'thing' : 'things'}
                    </dt>
                    <dd className="text-navy">{formatMinor(contentsMinor)}</dd>
                  </div>
                  {bowMinor > 0 ? (
                    <div className="flex justify-between">
                      <dt className="text-ink-muted">Hand tied bow</dt>
                      <dd className="text-navy">{formatMinor(bowMinor)}</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="mt-4 flex items-baseline justify-between border-t border-rule pt-4">
                  <span className="font-serif text-lg text-navy">Total</span>
                  <span className="font-serif text-2xl text-navy">{formatMinor(totalMinor)}</span>
                </div>

                {containsAlcohol ? (
                  <p className="mt-3 text-xs text-ink-muted">
                    There is alcohol in this hamper, so somebody over 18 has to take the delivery in.
                  </p>
                ) : null}

                <Button
                  type="button"
                  size="large"
                  className="mt-5 w-full"
                  onClick={addToCart}
                  disabled={pending || itemCount === 0 || overCapacity}
                >
                  {pending ? 'One moment' : 'Add hamper to cart'}
                </Button>

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
              </aside>
            </div>
          </StepShell>
        ) : null}
      </main>

      {/* The bar: total on the left, movement on the right, always on screen. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 lg:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm text-navy">
              {box.variantTitle}
              <span className={overCapacity ? 'text-red' : 'text-ink-muted'}>
                {' '}
                · {itemCount}/{box.capacity} things
              </span>
            </p>
            <p className="font-serif text-xl text-navy">{formatMinor(totalMinor)}</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {stepIndex > 0 ? (
              <Button type="button" variant="secondary" onClick={() => goTo(STEPS[stepIndex - 1]!.id)}>
                Back
              </Button>
            ) : null}
            {step !== 'review' ? (
              <Button
                type="button"
                onClick={() => goTo(STEPS[stepIndex + 1]!.id)}
                disabled={blocked !== null}
              >
                {blocked ?? 'Continue'}
              </Button>
            ) : (
              <Button type="button" onClick={addToCart} disabled={pending || itemCount === 0 || overCapacity}>
                {pending ? 'One moment' : 'Add to cart'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function Progress({ current, onJump }: { current: number; onJump: (index: number) => void }) {
  return (
    <nav aria-label="Steps" className="border-b border-rule bg-beige">
      <ol className="mx-auto flex max-w-[1400px] items-center gap-1 overflow-x-auto px-4 py-3 lg:px-8">
        {STEPS.map((s, index) => {
          const done = index < current
          const active = index === current
          return (
            <li key={s.id} className="flex shrink-0 items-center gap-1">
              {index > 0 ? <span aria-hidden="true" className="mx-1 h-px w-6 bg-navy/30 sm:w-10" /> : null}
              <button
                type="button"
                onClick={() => onJump(index)}
                disabled={!done}
                aria-current={active ? 'step' : undefined}
                className={`flex items-center gap-2 px-1 py-1 text-sm ${
                  active ? 'font-medium text-navy' : done ? 'text-navy underline-offset-4 hover:underline' : 'text-ink-muted'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                    active
                      ? 'border-navy bg-navy text-cream'
                      : done
                        ? 'border-navy bg-navy/10 text-navy'
                        : 'border-navy/30 text-ink-muted'
                  }`}
                >
                  {done ? '✓' : index + 1}
                </span>
                {s.label}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function StepShell({ title, lede, children }: { title: string; lede: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="font-display text-[length:var(--text-display)] text-navy">{title}</h2>
      <p className="mt-2 max-w-2xl text-ink-muted">{lede}</p>
      <div className="mt-8">{children}</div>
    </section>
  )
}

function CardChoice({
  selected,
  onSelect,
  title,
  price,
  body,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  price?: string
  body: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex h-full w-full flex-col border p-5 text-left transition-colors ${
        selected ? 'border-navy bg-beige' : 'border-navy/20 hover:border-navy/60'
      }`}
    >
      <span className="flex w-full items-baseline justify-between gap-3">
        <span className="font-serif text-lg text-navy">{title}</span>
        {price ? <span className="font-serif text-lg text-navy">{price}</span> : null}
      </span>
      <span className="mt-2 text-sm text-ink-muted">{body}</span>
      <span className={`mt-4 text-xs uppercase tracking-[0.14em] ${selected ? 'text-navy' : 'text-ink-muted'}`}>
        {selected ? '✓ Chosen' : 'Choose'}
      </span>
    </button>
  )
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-rule py-3">
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">{label}</p>
        <p className="mt-1 text-navy">{value}</p>
      </div>
      <button type="button" onClick={onEdit} className="text-sm text-navy underline underline-offset-4">
        Change
      </button>
    </div>
  )
}

