'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { createCampaignAction, type CreateCampaignInput } from '@/app/actions/corporate-campaign'
import { Button } from '@/components/ui/Button'
import { trackCorporateEnquiry } from '@/lib/analytics/events'
import { formatMinor } from '@/lib/commerce/money'
import {
  BRAND_COLOUR_CHOICES,
  campaignValueMinor,
  volumeTierFor,
} from '@/lib/corporate/types'

/**
 * The campaign builder: Company → Recipients → Budget → Gifts → Branding →
 * Review, with the estimated campaign value pinned to the bottom the whole
 * way, because "recipients times allowance" is the number the buyer is
 * clearing with somebody.
 *
 * It ends in an invoice or quotation request rather than a card form:
 * corporate orders at this size want paper, and nothing goes live until a
 * person has confirmed payment terms and activated the campaign.
 */

export type WizardGift = {
  handle: string
  title: string
  priceMinor: number
  image: { url: string; alt: string } | null
  containsAlcohol: boolean
}

const STEPS = [
  { id: 'company', label: 'Company' },
  { id: 'recipients', label: 'Recipients' },
  { id: 'budget', label: 'Budget' },
  { id: 'gifts', label: 'Gifts' },
  { id: 'branding', label: 'Branding' },
  { id: 'review', label: 'Review' },
] as const

type StepId = (typeof STEPS)[number]['id']

const RECIPIENT_QUICK = [10, 25, 50, 100, 250, 500]
const RECIPIENT_TYPES = ['Employees', 'Customers', 'Clients', 'Partners', 'Other']
const ALLOWANCE_CARDS = [4000, 5000, 7500, 10000, 15000]

const BUILDER_GIFT: WizardGift = {
  handle: 'build-your-own-hamper',
  title: 'Build Your Own Hamper',
  priceMinor: 0,
  image: null,
  containsAlcohol: false,
}

export function CampaignWizard({ gifts }: { gifts: WizardGift[] }) {
  const [pending, startTransition] = useTransition()
  const [step, setStep] = useState<StepId>('company')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ slug: string; dashboardToken: string } | null>(null)

  // Company
  const [company, setCompany] = useState({
    companyName: '', firstName: '', lastName: '', email: '', phone: '',
    website: '', billingAddress: '', vatNumber: '', purchaseOrder: '',
    wantsBespoke: false,
  })
  // Recipients
  const [recipientLimit, setRecipientLimit] = useState(50)
  const [recipientType, setRecipientType] = useState('Employees')
  // Budget
  const [allowanceMinor, setAllowanceMinor] = useState(7500)
  const [customAllowance, setCustomAllowance] = useState('')
  // Gifts
  const [selectedGifts, setSelectedGifts] = useState<string[]>([])
  const [upgradeAllowed, setUpgradeAllowed] = useState(false)
  const [giftMessagesAllowed, setGiftMessagesAllowed] = useState(true)
  // Branding
  const [branding, setBranding] = useState({ title: '', message: '', colourId: 'green' })
  const [logoDataUri, setLogoDataUri] = useState<string | undefined>(undefined)
  // Deadline
  const [deadline, setDeadline] = useState('')
  const [deliveryWindow, setDeliveryWindow] = useState('')
  const [paymentPreference, setPaymentPreference] = useState<'invoice' | 'quote'>('invoice')

  const affordable = useMemo(
    () =>
      [...gifts.filter((g) => g.priceMinor <= allowanceMinor), BUILDER_GIFT].map((g) =>
        g.handle === 'build-your-own-hamper' ? { ...g, priceMinor: allowanceMinor } : g,
      ),
    [gifts, allowanceMinor],
  )

  const valueMinor = campaignValueMinor(recipientLimit, allowanceMinor)
  const tier = volumeTierFor(recipientLimit)
  const stepIndex = STEPS.findIndex((s) => s.id === step)

  function goTo(next: StepId) {
    setError(null)
    setStep(next)
    window.scrollTo({ top: 0 })
  }

  function next() {
    const validation = validateStep()
    if (validation) {
      setError(validation)
      return
    }
    if (stepIndex < STEPS.length - 1) goTo(STEPS[stepIndex + 1]!.id)
  }

  function validateStep(): string | null {
    switch (step) {
      case 'company':
        if (!company.companyName.trim()) return 'Tell us the company name.'
        if (!company.firstName.trim() || !company.lastName.trim()) return 'Tell us your name.'
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(company.email)) return 'That work email does not look right.'
        if (!company.phone.trim()) return 'We need a phone number.'
        return null
      case 'recipients':
        if (recipientLimit < 1) return 'How many people are you gifting?'
        return null
      case 'budget':
        if (allowanceMinor < 1000) return 'The allowance starts at €10 per person.'
        return null
      case 'gifts':
        if (!selectedGifts.length) return 'Pick at least one hamper.'
        return null
      case 'branding':
        if (!deadline) return 'Pick the date recipients should choose by.'
        if (new Date(`${deadline}T23:59:59`) < new Date()) return 'The deadline has to be in the future.'
        return null
      default:
        return null
    }
  }

  function submit() {
    const input: CreateCampaignInput = {
      company,
      recipientLimit,
      recipientType,
      allowanceMinor,
      giftHandles: selectedGifts,
      upgradeAllowed,
      giftMessagesAllowed,
      deadline,
      deliveryWindow: deliveryWindow || undefined,
      branding: { ...branding, logoDataUri },
      paymentPreference,
    }
    startTransition(async () => {
      const result = await createCampaignAction(input)
      if (result.ok) {
        trackCorporateEnquiry({ kind: 'campaign_created', recipients: recipientLimit })
        setDone({ slug: result.slug, dashboardToken: result.dashboardToken })
        window.scrollTo({ top: 0 })
      } else {
        setError(result.message)
      }
    })
  }

  function onLogoFile(file: File | undefined) {
    if (!file) return
    if (file.size > 150_000) {
      setError('That logo is over 150KB. A small PNG or SVG is plenty for a page header.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setLogoDataUri(String(reader.result))
    reader.readAsDataURL(file)
  }

  if (done) {
    return <DoneScreen slug={done.slug} dashboardToken={done.dashboardToken} company={company.companyName} deadline={deadline} />
  }

  return (
    <div className="bg-cream pb-40">
      <header className="bg-navy py-10 text-cream">
        <div className="mx-auto max-w-[900px] px-4">
          <p className="mb-2 text-xs uppercase tracking-[0.24em] text-gold">Corporate gifting made easy</p>
          <h1 className="font-display text-[length:var(--text-display)] leading-[0.95]">
            Create your corporate gift campaign
          </h1>
        </div>
      </header>

      <nav aria-label="Steps" className="border-b border-rule bg-beige">
        <ol className="mx-auto flex max-w-[900px] items-center gap-1 overflow-x-auto px-4 py-3 text-sm">
          {STEPS.map((s, index) => (
            <li key={s.id} className="flex shrink-0 items-center gap-1">
              {index > 0 ? <span aria-hidden="true" className="mx-1 h-px w-4 bg-navy/25 sm:w-6" /> : null}
              <button
                type="button"
                disabled={index >= stepIndex}
                onClick={() => index < stepIndex && goTo(s.id)}
                aria-current={index === stepIndex ? 'step' : undefined}
                className={
                  index === stepIndex
                    ? 'font-medium text-navy'
                    : index < stepIndex
                      ? 'text-navy underline-offset-4 hover:underline'
                      : 'text-ink-muted'
                }
              >
                {index < stepIndex ? '✓ ' : ''}{s.label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mx-auto max-w-[900px] px-4 pt-10">
        {step === 'company' ? (
          <section>
            <h2 className="font-display text-3xl text-navy">Tell us about your company</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Company name*" value={company.companyName} onChange={(v) => setCompany({ ...company, companyName: v })} />
              <Field label="Work email*" type="email" value={company.email} onChange={(v) => setCompany({ ...company, email: v })} />
              <Field label="First name*" value={company.firstName} onChange={(v) => setCompany({ ...company, firstName: v })} />
              <Field label="Last name*" value={company.lastName} onChange={(v) => setCompany({ ...company, lastName: v })} />
              <Field label="Phone number*" type="tel" value={company.phone} onChange={(v) => setCompany({ ...company, phone: v })} />
              <Field label="Company website" value={company.website} onChange={(v) => setCompany({ ...company, website: v })} />
              <Field label="Billing address" value={company.billingAddress} onChange={(v) => setCompany({ ...company, billingAddress: v })} className="sm:col-span-2" />
              <Field label="VAT number" value={company.vatNumber} onChange={(v) => setCompany({ ...company, vatNumber: v })} />
              <Field label="Purchase order number" value={company.purchaseOrder} onChange={(v) => setCompany({ ...company, purchaseOrder: v })} />
            </div>
            <label className="mt-5 flex items-start gap-3 text-sm text-navy">
              <input
                type="checkbox"
                checked={company.wantsBespoke}
                onChange={(e) => setCompany({ ...company, wantsBespoke: e.target.checked })}
                className="mt-1"
              />
              I would like to speak to someone about a bespoke corporate gifting package.
            </label>
          </section>
        ) : null}

        {step === 'recipients' ? (
          <section>
            <h2 className="font-display text-3xl text-navy">How many people are you gifting?</h2>
            <div className="mt-6 flex flex-wrap gap-3">
              {RECIPIENT_QUICK.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRecipientLimit(n)}
                  aria-pressed={recipientLimit === n}
                  className={`border px-6 py-4 font-serif text-xl transition-colors ${
                    recipientLimit === n ? 'border-navy bg-beige text-navy' : 'border-navy/20 text-navy hover:border-navy/60'
                  }`}
                >
                  {n === 500 ? '500+' : n}
                </button>
              ))}
            </div>
            <label className="mt-5 block max-w-xs">
              <span className="text-sm text-ink-muted">Or enter the exact number</span>
              <input
                type="number"
                min={1}
                max={10000}
                value={recipientLimit}
                onChange={(e) => setRecipientLimit(Math.max(1, Number(e.target.value) || 1))}
                className="mt-1 w-full border border-navy/25 bg-cream px-3 py-2 text-navy outline-none focus:border-navy"
              />
            </label>
            <p className="mt-2 text-sm text-ink-muted">You can increase your recipient allocation later if required.</p>

            <h3 className="mt-8 font-serif text-xl text-navy">Who are they?</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {RECIPIENT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRecipientType(t)}
                  aria-pressed={recipientType === t}
                  className={`border px-4 py-2 text-sm ${
                    recipientType === t ? 'border-navy bg-navy text-cream' : 'border-navy/25 text-navy hover:border-navy'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {step === 'budget' ? (
          <section>
            <h2 className="font-display text-3xl text-navy">Set your gift budget</h2>
            <p className="mt-2 text-ink-muted">How much would you like to spend per person?</p>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ALLOWANCE_CARDS.map((minor) => (
                <li key={minor}>
                  <button
                    type="button"
                    onClick={() => { setAllowanceMinor(minor); setCustomAllowance('') }}
                    aria-pressed={allowanceMinor === minor && !customAllowance}
                    className={`w-full border px-4 py-6 text-center transition-colors ${
                      allowanceMinor === minor && !customAllowance
                        ? 'border-navy bg-beige'
                        : 'border-navy/20 hover:border-navy/60'
                    }`}
                  >
                    <span className="font-serif text-2xl text-navy">{formatMinor(minor)}</span>
                    <span className="block text-sm text-ink-muted">per person</span>
                  </button>
                </li>
              ))}
              <li>
                <label className={`block h-full border px-4 py-4 ${customAllowance ? 'border-navy bg-beige' : 'border-navy/20'}`}>
                  <span className="text-sm text-ink-muted">Custom budget (€)</span>
                  <input
                    type="number"
                    min={10}
                    value={customAllowance}
                    onChange={(e) => {
                      setCustomAllowance(e.target.value)
                      const euros = Number(e.target.value)
                      if (Number.isFinite(euros) && euros >= 10) setAllowanceMinor(Math.round(euros * 100))
                    }}
                    className="mt-1 w-full border border-navy/25 bg-cream px-3 py-2 text-navy outline-none focus:border-navy"
                  />
                </label>
              </li>
            </ul>

            <div className="mt-8 border border-navy/20 bg-beige p-6">
              <p className="text-sm text-ink-muted">Estimated campaign value</p>
              <p className="mt-1 font-serif text-3xl text-navy">{formatMinor(valueMinor)}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {recipientLimit} recipients × {formatMinor(allowanceMinor)} allowance, excluding
                delivery and VAT where appropriate. {tier.discountPercent > 0 ? `${tier.label} applies to your invoice.` : tier.label}.
              </p>
            </div>
          </section>
        ) : null}

        {step === 'gifts' ? (
          <section>
            <h2 className="font-display text-3xl text-navy">
              Which hampers can your recipients choose from?
            </h2>
            <p className="mt-2 text-ink-muted">
              Everything shown fits inside your {formatMinor(allowanceMinor)} allowance. Your
              recipients will only see the gifts you select here. Three to six choices works best.
            </p>
            <div className="mt-4 flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setSelectedGifts(affordable.map((g) => g.handle))}>
                Select all
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSelectedGifts([])}>
                Clear
              </Button>
            </div>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {affordable.map((gift) => {
                const on = selectedGifts.includes(gift.handle)
                return (
                  <li key={gift.handle}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedGifts((current) =>
                          on ? current.filter((h) => h !== gift.handle) : [...current, gift.handle],
                        )
                      }
                      aria-pressed={on}
                      className={`w-full border text-left transition-colors ${on ? 'border-navy bg-beige' : 'border-navy/15 hover:border-navy/50'}`}
                    >
                      {gift.image ? (
                        <Image src={gift.image.url} alt={gift.image.alt} width={480} height={360} className="aspect-4/3 w-full object-cover" />
                      ) : (
                        <div className="flex aspect-4/3 w-full items-center justify-center bg-beige px-4 text-center font-serif text-lg text-navy">
                          They build their own, up to {formatMinor(allowanceMinor)}
                        </div>
                      )}
                      <span className="block p-3">
                        <span className="block font-serif text-navy">{on ? '✓ ' : ''}{gift.title}</span>
                        <span className="text-sm text-ink-muted">
                          {gift.handle === 'build-your-own-hamper' ? `Up to ${formatMinor(allowanceMinor)}` : formatMinor(gift.priceMinor)}
                          {gift.containsAlcohol ? ' · contains alcohol' : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="mt-8 space-y-4 border-t border-rule pt-6">
              <Toggle
                on={upgradeAllowed}
                onChange={setUpgradeAllowed}
                label="Allow recipients to upgrade their hamper"
                detail="They pay the difference themselves by card for a dearer hamper. Off means everything on the page is fully covered."
              />
              <Toggle
                on={giftMessagesAllowed}
                onChange={setGiftMessagesAllowed}
                label="Allow personal gift messages"
                detail="Recipients can add a message of up to 250 characters to their delivery."
              />
              {upgradeAllowed ? (
                <p className="text-sm text-ink-muted">
                  Upgrades need the card checkout, which switches on when the Shopify store is
                  connected. Until then upgrade choices are recorded and invoiced with the campaign.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {step === 'branding' ? (
          <section>
            <h2 className="font-display text-3xl text-navy">Make it yours</h2>
            <div className="mt-6 grid gap-4">
              <Field label="Campaign title" placeholder={`${company.companyName || 'Acme'} Christmas Gift 2026`} value={branding.title} onChange={(v) => setBranding({ ...branding, title: v })} />
              <label className="block">
                <span className="text-sm text-ink-muted">Personal message to your recipients</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={branding.message}
                  onChange={(e) => setBranding({ ...branding, message: e.target.value })}
                  placeholder="Happy Christmas from everyone at Acme. Thank you for everything you have contributed this year."
                  className="mt-1 w-full border border-navy/25 bg-cream px-3 py-2 text-navy outline-none focus:border-navy"
                />
              </label>

              <div>
                <span className="text-sm text-ink-muted">Accent colour</span>
                <div className="mt-2 flex gap-2">
                  {BRAND_COLOUR_CHOICES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setBranding({ ...branding, colourId: c.id })}
                      aria-pressed={branding.colourId === c.id}
                      aria-label={c.label}
                      className={`h-10 w-10 rounded-full border-2 ${branding.colourId === c.id ? 'border-navy' : 'border-transparent'}`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-sm text-ink-muted">Company logo (PNG or SVG, up to 150KB)</span>
                <input
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  onChange={(e) => onLogoFile(e.target.files?.[0])}
                  className="mt-1 block w-full text-sm text-ink-muted file:mr-3 file:border file:border-navy file:bg-cream file:px-4 file:py-2 file:text-navy"
                />
                {logoDataUri ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logoDataUri} alt="Your logo" className="mt-3 h-12 w-auto" />
                ) : null}
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm text-ink-muted">Recipients should choose their gift by*</span>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="mt-1 w-full border border-navy/25 bg-cream px-3 py-2 text-navy outline-none focus:border-navy"
                  />
                  <span className="mt-1 block text-xs text-ink-muted">
                    After this date the gifting page closes automatically.
                  </span>
                </label>
                <Field label="Requested delivery window" placeholder="15 to 18 December" value={deliveryWindow} onChange={setDeliveryWindow} />
              </div>
            </div>
          </section>
        ) : null}

        {step === 'review' ? (
          <section>
            <h2 className="font-display text-3xl text-navy">Your corporate gifting campaign</h2>
            <dl className="mt-6 divide-y divide-rule border-y border-rule">
              {[
                ['Company', company.companyName],
                ['Recipients', `${recipientLimit} ${recipientType.toLowerCase()}`],
                ['Gift allowance', `${formatMinor(allowanceMinor)} per person`],
                ['Available hampers', String(selectedGifts.length)],
                ['Recipient upgrades', upgradeAllowed ? 'Enabled' : 'Off'],
                ['Gift messages', giftMessagesAllowed ? 'Allowed' : 'Off'],
                ['Campaign deadline', deadline],
                ...(deliveryWindow ? [['Requested delivery', deliveryWindow] as const] : []),
                ['Campaign value', `${formatMinor(valueMinor)} excluding delivery and VAT`],
                ...(tier.discountPercent > 0 ? [['Volume pricing', tier.label] as const] : []),
              ].map(([term, value]) => (
                <div key={term} className="flex justify-between gap-4 py-3">
                  <dt className="text-ink-muted">{term}</dt>
                  <dd className="text-right text-navy">{value}</dd>
                </div>
              ))}
            </dl>

            <fieldset className="mt-8">
              <legend className="font-serif text-xl text-navy">How would you like to settle it?</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentPreference('invoice')}
                  aria-pressed={paymentPreference === 'invoice'}
                  className={`border p-5 text-left ${paymentPreference === 'invoice' ? 'border-navy bg-beige' : 'border-navy/20'}`}
                >
                  <span className="font-serif text-lg text-navy">Request an invoice</span>
                  <span className="mt-1 block text-sm text-ink-muted">
                    We confirm the details, raise one invoice and activate your link.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentPreference('quote')}
                  aria-pressed={paymentPreference === 'quote'}
                  className={`border p-5 text-left ${paymentPreference === 'quote' ? 'border-navy bg-beige' : 'border-navy/20'}`}
                >
                  <span className="font-serif text-lg text-navy">Submit for quotation</span>
                  <span className="mt-1 block text-sm text-ink-muted">
                    For procurement, credit terms, branded packaging or custom products. We come
                    back with a full quote.
                  </span>
                </button>
              </div>
            </fieldset>

            <Button type="button" size="large" className="mt-8" disabled={pending} onClick={submit}>
              {pending ? 'One moment' : 'Confirm campaign'}
            </Button>
            <p className="mt-3 text-sm text-ink-muted">
              Nothing is charged now. Your gifting link is created immediately and goes live once
              we have confirmed payment with you, which for most campaigns is the same working day.
            </p>
          </section>
        ) : null}

        {error ? (
          <p role="alert" className="mt-6 text-red">
            {error}
          </p>
        ) : null}
      </div>

      {/* Value bar: the number the buyer is clearing with somebody. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-[900px] flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3">
          <p className="text-sm text-navy">
            {recipientLimit} recipients · {formatMinor(allowanceMinor)} each ·{' '}
            <span className="font-serif text-lg">{formatMinor(valueMinor)}</span>
          </p>
          <div className="ml-auto flex items-center gap-3">
            {stepIndex > 0 ? (
              <Button type="button" variant="ghost" onClick={() => goTo(STEPS[stepIndex - 1]!.id)}>
                Back
              </Button>
            ) : null}
            {step !== 'review' ? (
              <Button type="button" onClick={next}>
                Continue
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function DoneScreen({
  slug,
  dashboardToken,
  company,
  deadline,
}: {
  slug: string
  dashboardToken: string
  company: string
  deadline: string
}) {
  const [copied, setCopied] = useState<string | null>(null)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const giftUrl = `${origin}/gift/${slug}`
  const dashboardUrl = `${origin}/corporate-gifting/dashboard/${slug}?token=${dashboardToken}`

  const suggestedEmail = `Your gift from ${company}

As a thank you from everyone at ${company}, we would love you to choose a gift.

Use the private link below, select your preferred hamper and tell us where you would like it delivered.

${giftUrl}

Please make your selection before ${deadline}. We will take care of everything else.`

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div className="mx-auto max-w-[800px] px-4 py-16">
      <p className="text-xs uppercase tracking-[0.24em] text-gold">Campaign created</p>
      <h1 className="mt-3 font-display text-[length:var(--text-display)] text-navy">
        Your gifting link is ready
      </h1>
      <p className="mt-4 text-ink-muted">
        The link below is private and will not appear in search engines. It goes live for your
        recipients once we confirm payment with you, usually the same working day. Your dashboard
        works right away.
      </p>

      <div className="mt-8 space-y-4">
        <LinkCard label="Your recipients' gifting link" url={giftUrl} copied={copied} onCopy={copy} />
        <LinkCard label="Your private dashboard (keep this safe, it is your access)" url={dashboardUrl} copied={copied} onCopy={copy} />
      </div>

      <section className="mt-10 border border-navy/20 bg-beige p-6">
        <h2 className="font-serif text-xl text-navy">Ready-to-send wording for your recipients</h2>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-ink-muted">{suggestedEmail}</pre>
        <Button type="button" variant="secondary" className="mt-4" onClick={() => copy('email', suggestedEmail)}>
          {copied === 'email' ? 'Copied' : 'Copy the wording'}
        </Button>
      </section>

      <p className="mt-8 text-sm text-ink-muted">
        We have your details and will be in touch about the invoice.{' '}
        <Link href="/corporate-gifting" className="underline underline-offset-4">
          Back to corporate gifting
        </Link>
        .
      </p>
    </div>
  )
}

function LinkCard({
  label,
  url,
  copied,
  onCopy,
}: {
  label: string
  url: string
  copied: string | null
  onCopy: (label: string, text: string) => void
}) {
  return (
    <div className="border border-navy/20 bg-cream p-4">
      <p className="text-sm text-ink-muted">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <code className="min-w-0 flex-1 truncate bg-beige px-3 py-2 text-sm text-navy">{url}</code>
        <Button type="button" variant="secondary" onClick={() => onCopy(label, url)}>
          {copied === label ? 'Copied' : 'Copy link'}
        </Button>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  className = '',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm text-ink-muted">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-navy/25 bg-cream px-3 py-2 text-navy outline-none placeholder:text-ink-muted/60 focus:border-navy"
      />
    </label>
  )
}

function Toggle({
  on,
  onChange,
  label,
  detail,
}: {
  on: boolean
  onChange: (on: boolean) => void
  label: string
  detail: string
}) {
  return (
    <label className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-navy' : 'bg-navy/25'}`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-cream transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
      <span>
        <span className="block text-navy">{label}</span>
        <span className="text-sm text-ink-muted">{detail}</span>
      </span>
    </label>
  )
}
