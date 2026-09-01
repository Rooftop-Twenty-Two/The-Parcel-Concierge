'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import {
  identifyRecipientAction,
  redeemGiftAction,
} from '@/app/actions/corporate-campaign'
import { Button } from '@/components/ui/Button'

/**
 * The recipient's ninety seconds, mobile first.
 *
 * Welcome → who are we sending to → choose the gift → where does it go →
 * confirm → done. No navigation, no cart, and no prices anywhere: every
 * gift on the page is fully covered, so a price would only turn a present
 * back into a transaction.
 *
 * The company's accent colour and logo carry the page; the fulfilment is
 * ours. It should feel like being handed a gift, because it is one.
 */

export type RecipientCampaign = {
  slug: string
  companyName: string
  title: string
  message: string | null
  colour: string
  logoDataUri: string | null
  deadline: string
  giftMessagesAllowed: boolean
  gifts: {
    handle: string
    title: string
    image: { url: string; alt: string } | null
    containsAlcohol: boolean
  }[]
}

type Step = 'welcome' | 'identify' | 'choose' | 'address' | 'confirm' | 'done'

export function RecipientFlow({
  campaign,
  open,
  pendingActivation,
}: {
  campaign: RecipientCampaign
  open: boolean
  pendingActivation: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [step, setStep] = useState<Step>('welcome')
  const [error, setError] = useState<string | null>(null)

  const [identity, setIdentity] = useState({ firstName: '', lastName: '', email: '' })
  const [alcoholFreeOnly, setAlcoholFreeOnly] = useState(false)
  const [giftHandle, setGiftHandle] = useState<string | null>(null)
  const [address, setAddress] = useState({
    firstName: '', lastName: '', line1: '', line2: '', town: '', county: '',
    eircode: '', phone: '', isBusinessAddress: false,
  })
  const [giftMessage, setGiftMessage] = useState('')
  const [doneReference, setDoneReference] = useState<string | null>(null)

  const gift = campaign.gifts.find((g) => g.handle === giftHandle) ?? null
  const shownGifts = alcoholFreeOnly
    ? campaign.gifts.filter((g) => !g.containsAlcohol)
    : campaign.gifts

  function go(next: Step) {
    setError(null)
    setStep(next)
    window.scrollTo({ top: 0 })
  }

  function identify() {
    startTransition(async () => {
      const result = await identifyRecipientAction(campaign.slug, identity)
      if (!result.ok) {
        setError(result.message)
        return
      }
      if (result.state === 'already-chosen') {
        setError(
          `A gift (${result.giftTitle}) has already been chosen with this email. If that was not you, contact whoever sent you the link.`,
        )
        return
      }
      // Their own name is the likeliest delivery name; prefill, editable.
      setAddress((a) => ({ ...a, firstName: identity.firstName, lastName: identity.lastName }))
      go('choose')
    })
  }

  function confirm() {
    if (!gift) return
    startTransition(async () => {
      const result = await redeemGiftAction(campaign.slug, {
        email: identity.email,
        giftHandle: gift.handle,
        giftMessage: giftMessage || undefined,
        address: { ...address, email: identity.email },
      })
      if (result.ok) {
        setDoneReference(result.orderReference)
        go('done')
      } else {
        setError(result.message)
      }
    })
  }

  const closed = !open && !pendingActivation

  return (
    <main id="main" className="min-h-screen bg-cream">
      {/* The company's colour owns the top of the page. */}
      <header className="px-4 pb-10 pt-12 text-center text-cream" style={{ backgroundColor: campaign.colour }}>
        {campaign.logoDataUri ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={campaign.logoDataUri} alt={campaign.companyName} className="mx-auto mb-6 h-12 w-auto" />
        ) : (
          <p className="mb-4 text-xs uppercase tracking-[0.24em] opacity-80">{campaign.companyName}</p>
        )}
        <h1 className="mx-auto max-w-xl font-display text-4xl leading-[0.95] sm:text-5xl">
          {campaign.title}
        </h1>
        {step === 'welcome' && campaign.message ? (
          <p className="mx-auto mt-4 max-w-md text-base opacity-90">{campaign.message}</p>
        ) : null}
      </header>

      <div className="mx-auto max-w-xl px-4 pb-20 pt-8">
        {closed ? (
          <section className="text-center">
            <h2 className="font-serif text-2xl text-navy">This gifting page has closed</h2>
            <p className="mt-3 text-ink-muted">
              The selection deadline has passed. Contact whoever sent you the link and they can
              arrange things with us directly.
            </p>
          </section>
        ) : pendingActivation ? (
          <section className="text-center">
            <h2 className="font-serif text-2xl text-navy">Nearly ready</h2>
            <p className="mt-3 text-ink-muted">
              This gifting page is being set up and will open very soon. Try the link again
              shortly.
            </p>
          </section>
        ) : (
          <>
            {step === 'welcome' ? (
              <section className="text-center">
                <p className="text-ink-muted">
                  We have picked out a selection of gifts for you. Choose your favourite and tell
                  us where you would like it delivered. It takes about a minute.
                </p>
                <Button type="button" size="large" className="mt-8 w-full sm:w-auto" onClick={() => go('identify')}>
                  Choose my gift
                </Button>
                <p className="mt-4 text-xs text-ink-muted">
                  Please choose before {formatDeadline(campaign.deadline)}.
                </p>
              </section>
            ) : null}

            {step === 'identify' ? (
              <section>
                <h2 className="font-serif text-2xl text-navy">Who are we sending your gift to?</h2>
                <p className="mt-2 text-sm text-ink-muted">
                  Your details go to The Parcel Concierge for delivery only. They are not shared
                  back to {campaign.companyName}.
                </p>
                <div className="mt-6 grid gap-4">
                  <FlowField label="First name" autoComplete="given-name" value={identity.firstName} onChange={(v) => setIdentity({ ...identity, firstName: v })} />
                  <FlowField label="Last name" autoComplete="family-name" value={identity.lastName} onChange={(v) => setIdentity({ ...identity, lastName: v })} />
                  <FlowField label="Email" type="email" autoComplete="email" value={identity.email} onChange={(v) => setIdentity({ ...identity, email: v })} />
                </div>
                <Button type="button" size="large" className="mt-6 w-full" disabled={pending} onClick={identify}>
                  {pending ? 'One moment' : 'Continue'}
                </Button>
              </section>
            ) : null}

            {step === 'choose' ? (
              <section>
                <h2 className="font-serif text-2xl text-navy">Choose your hamper</h2>
                {campaign.gifts.some((g) => g.containsAlcohol) &&
                campaign.gifts.some((g) => !g.containsAlcohol) ? (
                  <label className="mt-3 flex items-center gap-2 text-sm text-navy">
                    <input
                      type="checkbox"
                      checked={alcoholFreeOnly}
                      onChange={(e) => setAlcoholFreeOnly(e.target.checked)}
                    />
                    Alcohol-free options only
                  </label>
                ) : null}
                <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                  {shownGifts.map((g) => (
                    <li key={g.handle}>
                      <button
                        type="button"
                        onClick={() => {
                          setGiftHandle(g.handle)
                          go('address')
                        }}
                        className="w-full border border-navy/15 text-left transition-colors hover:border-navy"
                      >
                        {g.image ? (
                          <Image src={g.image.url} alt={g.image.alt} width={480} height={360} className="aspect-4/3 w-full object-cover" />
                        ) : (
                          <div className="flex aspect-4/3 w-full items-center justify-center bg-beige px-4 text-center font-serif text-navy">
                            You build it yourself, from the whole shop
                          </div>
                        )}
                        <span className="block p-4">
                          <span className="block font-serif text-lg text-navy">{g.title}</span>
                          <span className="mt-1 block text-sm" style={{ color: campaign.colour }}>
                            Included in your gift
                          </span>
                          {g.containsAlcohol ? (
                            <span className="mt-1 block text-xs text-ink-muted">
                              Contains alcohol; somebody over 18 takes the delivery in
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {step === 'address' && gift ? (
              <section>
                <h2 className="font-serif text-2xl text-navy">Where would you like your gift delivered?</h2>
                <p className="mt-1 text-sm text-ink-muted">{gift.title}</p>
                <div className="mt-6 grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FlowField label="First name" autoComplete="given-name" value={address.firstName} onChange={(v) => setAddress({ ...address, firstName: v })} />
                    <FlowField label="Last name" autoComplete="family-name" value={address.lastName} onChange={(v) => setAddress({ ...address, lastName: v })} />
                  </div>
                  <FlowField label="Address line 1" autoComplete="address-line1" value={address.line1} onChange={(v) => setAddress({ ...address, line1: v })} />
                  <FlowField label="Address line 2" autoComplete="address-line2" value={address.line2} onChange={(v) => setAddress({ ...address, line2: v })} />
                  <div className="grid grid-cols-2 gap-4">
                    <FlowField label="Town or city" autoComplete="address-level2" value={address.town} onChange={(v) => setAddress({ ...address, town: v })} />
                    <FlowField label="County" autoComplete="address-level1" value={address.county} onChange={(v) => setAddress({ ...address, county: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FlowField label="Eircode" autoComplete="postal-code" value={address.eircode} onChange={(v) => setAddress({ ...address, eircode: v })} />
                    <FlowField label="Mobile number" type="tel" autoComplete="tel" value={address.phone} onChange={(v) => setAddress({ ...address, phone: v })} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-navy">
                    <input
                      type="checkbox"
                      checked={address.isBusinessAddress}
                      onChange={(e) => setAddress({ ...address, isBusinessAddress: e.target.checked })}
                    />
                    This is a business address
                  </label>
                  <p className="text-xs text-ink-muted">
                    Delivery within the Republic of Ireland. Your mobile number is only used for
                    the delivery itself.
                  </p>
                  {campaign.giftMessagesAllowed ? (
                    <label className="block">
                      <span className="text-sm text-ink-muted">Add a personal gift message (optional)</span>
                      <textarea
                        rows={3}
                        maxLength={250}
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        className="mt-1 w-full border border-navy/25 bg-cream px-3 py-2 text-navy outline-none focus:border-navy"
                      />
                      <span className="mt-1 block text-right text-xs text-ink-muted">{giftMessage.length}/250</span>
                    </label>
                  ) : null}
                </div>
                <div className="mt-6 flex gap-3">
                  <Button type="button" variant="ghost" onClick={() => go('choose')}>
                    Back
                  </Button>
                  <Button type="button" size="large" className="flex-1" onClick={() => go('confirm')}>
                    Continue
                  </Button>
                </div>
              </section>
            ) : null}

            {step === 'confirm' && gift ? (
              <section>
                <h2 className="font-serif text-2xl text-navy">Your gift</h2>
                <div className="mt-5 border border-navy/15 bg-beige p-5">
                  <p className="font-serif text-xl text-navy">{gift.title}</p>
                  <p className="mt-3 text-sm text-ink-muted">Delivering to</p>
                  <p className="text-navy">
                    {address.firstName} {address.lastName}
                    <br />
                    {address.line1}
                    {address.line2 ? <><br />{address.line2}</> : null}
                    <br />
                    {address.town}, {address.county}
                    <br />
                    {address.eircode}
                  </p>
                  {giftMessage ? (
                    <>
                      <p className="mt-3 text-sm text-ink-muted">Your message</p>
                      <p className="text-navy">{giftMessage}</p>
                    </>
                  ) : null}
                </div>
                <div className="mt-6 flex gap-3">
                  <Button type="button" variant="ghost" onClick={() => go('address')}>
                    Back
                  </Button>
                  <Button type="button" size="large" className="flex-1" disabled={pending} onClick={confirm}>
                    {pending ? 'One moment' : 'Confirm my gift'}
                  </Button>
                </div>
              </section>
            ) : null}

            {step === 'done' ? (
              <section className="text-center">
                <p aria-hidden="true" className="font-display text-5xl" style={{ color: campaign.colour }}>✓</p>
                <h2 className="mt-3 font-serif text-3xl text-navy">Your gift is on its way</h2>
                <p className="mt-3 text-ink-muted">
                  Thank you, {identity.firstName}. We have received your selection and will take
                  care of everything from here. You will get delivery information by email when
                  your hamper has been dispatched.
                </p>
                {doneReference ? (
                  <p className="mt-4 text-xs text-ink-muted">Reference {doneReference}</p>
                ) : null}
              </section>
            ) : null}

            {error ? (
              <p role="alert" className="mt-6 text-center text-red">
                {error}
              </p>
            ) : null}
          </>
        )}

        <footer className="mt-16 border-t border-rule pt-6 text-center text-xs text-ink-muted">
          Gifts packed and delivered by The Parcel Concierge, Dunshaughlin, Co. Meath. Your
          details are used for delivery only, kept no longer than fulfilment needs, and never
          added to a marketing list.
        </footer>
      </div>
    </main>
  )
}

function formatDeadline(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('en-IE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  } catch {
    return iso
  }
}

function FlowField({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="text-sm text-ink-muted">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-navy/25 bg-cream px-3 py-3 text-navy outline-none focus:border-navy"
      />
    </label>
  )
}
