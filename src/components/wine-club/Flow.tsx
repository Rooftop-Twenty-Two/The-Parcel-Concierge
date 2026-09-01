'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BoxScreen, ReviewScreen, type BoxState } from '@/components/wine-club/Box'
import { Button } from '@/components/ui/Button'
import { trackWineClubEvent } from '@/lib/analytics/events'
import { formatMinor } from '@/lib/commerce/money'
import type { WineType } from '@/lib/wine-club/profiles'
import { BUDGET_TIERS } from '@/lib/wine-club/recommend'
import type { Recommendation } from '@/lib/wine-club/recommend'
import { QUIZ, describeProfile, scoreQuiz } from '@/lib/wine-club/taste'
import { CADENCES, SIZES } from '@/lib/wine-club'

/**
 * The wine club builder: a guided flow, not a form.
 *
 * The order is the one that converts: taste first, commerce second,
 * because "tell us what you like" earns the right to ask "how much".
 * The payoff moment the whole thing is built around is the turn from the
 * last commercial question into "we found your wines".
 *
 * Mechanics worth knowing:
 *   - The browser back button works. Every step change pushes a history
 *     entry, and popstate walks the flow backwards without losing answers.
 *   - A reload resumes where they left off: the whole state persists to
 *     localStorage on every change.
 *   - Recommendations come from POST /api/wine-recommendations, the
 *     deterministic engine. Nothing here scores anything; this file is
 *     choreography.
 */

const WINE_TYPES: { id: WineType; label: string; blurb: string }[] = [
  { id: 'red', label: 'Red', blurb: 'From light and juicy to big and structured.' },
  { id: 'white', label: 'White', blurb: 'Crisp and zesty through to rich and rounded.' },
  { id: 'rose', label: 'Rosé', blurb: 'Dry, pale and made for daylight.' },
  { id: 'sparkling', label: 'Sparkling', blurb: 'Champagne, Crémant, Prosecco and Cava.' },
]

type StepId =
  | 'name'
  | `q-${string}`
  | 'reveal'
  | 'types'
  | 'frequency'
  | 'quantity'
  | 'mix'
  | 'budget'
  | 'finding'
  | 'box'
  | 'review'

const QUESTION_STEPS = QUIZ.map((q) => `q-${q.id}` as StepId)

/** The full walk, in order. Sections drive the top progress indicator. */
const STEP_ORDER: StepId[] = [
  'name',
  ...QUESTION_STEPS,
  'reveal',
  'types',
  'frequency',
  'quantity',
  'mix',
  'budget',
  'finding',
  'box',
  'review',
]

const SECTIONS: { label: string; steps: StepId[] }[] = [
  { label: 'Your taste', steps: ['name', ...QUESTION_STEPS, 'reveal'] },
  { label: 'Your box', steps: ['types', 'frequency', 'quantity', 'mix', 'budget'] },
  { label: 'Your wines', steps: ['finding', 'box'] },
  { label: 'Checkout', steps: ['review'] },
]

type FlowState = {
  step: StepId
  firstName: string
  answers: Record<string, string>
  wineTypes: WineType[]
  chooseForMe: boolean
  cadenceId: string
  sizeId: string
  mix: Partial<Record<WineType, number>>
  bandId: string
  box: Recommendation[]
  /** Wines swapped out this session; never recommended again. */
  swappedOut: string[]
  relaxed: string | null
}

const FRESH: FlowState = {
  step: 'name',
  firstName: '',
  answers: {},
  wineTypes: [],
  chooseForMe: false,
  cadenceId: 'every-two-months',
  sizeId: '6',
  mix: {},
  bandId: 'everyday',
  box: [],
  swappedOut: [],
  relaxed: null,
}

const STORAGE_KEY = 'tpc-wine-club-flow'

function loadPersisted(): FlowState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = { ...FRESH, ...(JSON.parse(raw) as Partial<FlowState>) }
    return STEP_ORDER.includes(parsed.step) ? parsed : null
  } catch {
    return null
  }
}

/** Even split of `total` bottles across `types`, remainder to the front. */
export function allocateMix(types: WineType[], total: number): Partial<Record<WineType, number>> {
  if (!types.length) return {}
  const each = Math.floor(total / types.length)
  const mix: Partial<Record<WineType, number>> = {}
  let remainder = total - each * types.length
  for (const type of types) {
    mix[type] = each + (remainder > 0 ? 1 : 0)
    remainder -= 1
  }
  return mix
}

export function WineClubFlow({ clubBuyable }: { clubBuyable: boolean }) {
  const [state, setState] = useState<FlowState>(FRESH)
  const [hydrated, setHydrated] = useState(false)
  const [findError, setFindError] = useState(false)
  const skipNextPush = useRef(false)

  // Restore, then let the browser's back button drive the step.
  useEffect(() => {
    const persisted = loadPersisted()
    if (persisted) setState(persisted)
    setHydrated(true)
    trackWineClubEvent('wine_builder_started')

    function onPop(event: PopStateEvent) {
      const step = (event.state?.wineClubStep ?? 'name') as StepId
      if (!STEP_ORDER.includes(step)) return
      skipNextPush.current = true
      setState((current) => ({ ...current, step: step === 'finding' ? 'budget' : step }))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Losing persistence loses the resume, not the session.
    }
  }, [hydrated, state])

  const goTo = useCallback((step: StepId) => {
    setState((current) => ({ ...current, step }))
    if (skipNextPush.current) {
      skipNextPush.current = false
    } else {
      window.history.pushState({ wineClubStep: step }, '', `?step=${step}`)
    }
    window.scrollTo({ top: 0 })
  }, [])

  const stepIndex = STEP_ORDER.indexOf(state.step)
  const back = () => {
    if (stepIndex > 0) goTo(STEP_ORDER[stepIndex - 1] === 'finding' ? 'budget' : STEP_ORDER[stepIndex - 1]!)
  }

  const tasteProfile = useMemo(() => scoreQuiz(state.answers), [state.answers])
  const size = SIZES.find((s) => s.id === state.sizeId) ?? SIZES[1]!
  const cadence = CADENCES.find((c) => c.id === state.cadenceId) ?? CADENCES[1]!
  const tier = BUDGET_TIERS.find((t) => t.id === state.bandId) ?? BUDGET_TIERS[0]!
  const chargeMinor = tier.chargeMinor * size.bottles
  const mixTotal = Object.values(state.mix).reduce((sum, n) => sum + (n ?? 0), 0)

  // ----- recommendations -------------------------------------------------

  const findWines = useCallback(
    async (mix: Partial<Record<WineType, number>>) => {
      goTo('finding')
      setFindError(false)
      const started = Date.now()
      try {
        const response = await fetch('/api/wine-recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'box',
            tasteProfile,
            mix,
            budgetTierId: state.bandId,
            excludeHandles: state.swappedOut,
          }),
        })
        if (!response.ok) throw new Error(`${response.status}`)
        const body = (await response.json()) as { recommendations: Recommendation[]; relaxed: string | null }
        trackWineClubEvent('recommendations_generated', {
          bottle_count: size.bottles,
          frequency: state.cadenceId,
          budget_tier: state.bandId,
        })
        // The reveal moment is allowed to breathe, but never to dawdle.
        const wait = Math.max(0, 1800 - (Date.now() - started))
        setTimeout(() => {
          setState((current) => ({ ...current, box: body.recommendations, relaxed: body.relaxed }))
          goTo('box')
        }, wait)
      } catch {
        setFindError(true)
      }
    },
    [goTo, size.bottles, state.bandId, state.cadenceId, state.swappedOut, tasteProfile],
  )

  if (!hydrated) {
    return <div className="mx-auto min-h-[60vh] max-w-[800px] px-4 py-16" aria-busy="true" />
  }

  const section = SECTIONS.findIndex((s) => s.steps.includes(state.step))
  const questionNumber = QUESTION_STEPS.indexOf(state.step) + 1

  return (
    <main className="min-h-[70vh] bg-cream pb-40">
      {/* Light progress: four words, not a breadcrumb trail. */}
      <nav aria-label="Progress" className="border-b border-rule bg-beige">
        <ol className="mx-auto flex max-w-[800px] items-center justify-center gap-2 px-4 py-3 text-xs sm:gap-4 sm:text-sm">
          {SECTIONS.map((s, index) => (
            <li key={s.label} className="flex items-center gap-2 sm:gap-4">
              {index > 0 ? <span aria-hidden="true" className="h-px w-4 bg-navy/25 sm:w-8" /> : null}
              <span
                aria-current={index === section ? 'step' : undefined}
                className={index === section ? 'font-medium text-navy' : index < section ? 'text-navy/70' : 'text-ink-muted'}
              >
                {index + 1}. {s.label}
              </span>
            </li>
          ))}
        </ol>
        {questionNumber > 0 ? (
          <p className="pb-2 text-center text-xs text-ink-muted">
            {questionNumber} of {QUIZ.length}
          </p>
        ) : null}
      </nav>

      <div className="mx-auto max-w-[800px] px-4 pt-10">
        {state.step === 'name' ? (
          <NameStep
            firstName={state.firstName}
            onSubmit={(firstName) => {
              setState((c) => ({ ...c, firstName }))
              goTo(QUESTION_STEPS[0]!)
            }}
          />
        ) : null}

        {QUIZ.map((question, index) =>
          state.step === `q-${question.id}` ? (
            <QuestionStep
              key={question.id}
              title={
                index === 0 && state.firstName
                  ? `Great, ${state.firstName}. ${question.title.charAt(0).toLowerCase()}${question.title.slice(1)}`
                  : question.title
              }
              lede={question.lede}
              options={question.options}
              selected={state.answers[question.id]}
              onPick={(optionId) => {
                trackWineClubEvent('wine_quiz_answered', { question: question.id })
                setState((c) => ({ ...c, answers: { ...c.answers, [question.id]: optionId } }))
                const next = QUESTION_STEPS[index + 1] ?? 'reveal'
                if (next === 'reveal') trackWineClubEvent('wine_quiz_completed')
                goTo(next)
              }}
            />
          ) : null,
        )}

        {state.step === 'reveal' ? (
          <RevealStep
            firstName={state.firstName}
            words={describeProfile(tasteProfile)}
            onContinue={() => goTo('types')}
          />
        ) : null}

        {state.step === 'types' ? (
          <TypesStep
            selected={state.wineTypes}
            chooseForMe={state.chooseForMe}
            onToggle={(type) =>
              setState((c) => ({
                ...c,
                chooseForMe: false,
                wineTypes: c.wineTypes.includes(type)
                  ? c.wineTypes.filter((t) => t !== type)
                  : [...c.wineTypes, type],
              }))
            }
            onChooseForMe={() =>
              setState((c) => ({ ...c, chooseForMe: true, wineTypes: ['red', 'white'] }))
            }
            onContinue={() => {
              trackWineClubEvent('wine_type_selected', { types: state.wineTypes.join(',') })
              goTo('frequency')
            }}
          />
        ) : null}

        {state.step === 'frequency' ? (
          <ChoiceStep
            title="How often should we send your wine?"
            options={CADENCES.map((c) => ({ id: c.id, label: c.label, detail: c.description }))}
            selected={state.cadenceId}
            onPick={(cadenceId) => {
              trackWineClubEvent('subscription_frequency_selected', { frequency: cadenceId })
              setState((c) => ({ ...c, cadenceId }))
              goTo('quantity')
            }}
          />
        ) : null}

        {state.step === 'quantity' ? (
          <ChoiceStep
            title="How many bottles would you like?"
            options={SIZES.map((s) => ({
              id: s.id,
              label: s.label,
              detail: s.description,
              flag: s.id === '6' ? 'Our standard case' : undefined,
            }))}
            selected={state.sizeId}
            onPick={(sizeId) => {
              trackWineClubEvent('bottle_quantity_selected', { bottle_count: Number(sizeId) })
              setState((c) => ({
                ...c,
                sizeId,
                // The mix follows the new bottle count so the totals always
                // agree; the mix step lets them reshape it.
                mix: allocateMix(c.wineTypes, SIZES.find((s) => s.id === sizeId)?.bottles ?? 6),
              }))
              goTo(state.wineTypes.length > 1 ? 'mix' : 'budget')
            }}
          />
        ) : null}

        {state.step === 'mix' ? (
          <MixStep
            types={state.wineTypes}
            mix={state.mix}
            total={size.bottles}
            onChange={(mix) => setState((c) => ({ ...c, mix }))}
            onChooseForMe={() => setState((c) => ({ ...c, mix: allocateMix(c.wineTypes, size.bottles) }))}
            onContinue={() => {
              trackWineClubEvent('wine_mix_completed')
              goTo('budget')
            }}
          />
        ) : null}

        {state.step === 'budget' ? (
          <ChoiceStep
            title="What is your ideal spend?"
            lede={`For ${size.bottles} bottles, the case price updates as you choose.`}
            options={BUDGET_TIERS.map((t) => ({
              id: t.id,
              label: t.label,
              detail: `${t.detail} Your case: ${formatMinor(t.chargeMinor * size.bottles)} per delivery.`,
            }))}
            selected={state.bandId}
            continueLabel="Find my wines"
            onPick={(bandId) => setState((c) => ({ ...c, bandId }))}
            onContinue={() => {
              trackWineClubEvent('budget_selected', { budget_tier: state.bandId })
              const mix =
                state.wineTypes.length > 1
                  ? state.mix
                  : allocateMix(state.wineTypes.length ? state.wineTypes : ['red', 'white'], size.bottles)
              void findWines(mix)
            }}
          />
        ) : null}

        {state.step === 'finding' ? (
          <FindingStep
            firstName={state.firstName}
            failed={findError}
            onRetry={() => void findWines(state.mix)}
          />
        ) : null}
      </div>

      {state.step === 'box' ? (
        <BoxScreen
          state={boxState(state, tasteProfile)}
          relaxed={state.relaxed}
          firstName={state.firstName}
          chargeMinor={chargeMinor}
          cadenceLabel={cadence.label}
          onSwap={(index, replacement, swappedOutHandle) => {
            trackWineClubEvent('wine_swapped', { out: swappedOutHandle, in: replacement.handle })
            setState((c) => {
              const box = [...c.box]
              box[index] = replacement
              return { ...c, box, swappedOut: [...c.swappedOut, swappedOutHandle] }
            })
          }}
          onReview={() => {
            trackWineClubEvent('subscription_review_viewed')
            goTo('review')
          }}
          onBack={back}
        />
      ) : null}

      {state.step === 'review' ? (
        <ReviewScreen
          state={boxState(state, tasteProfile)}
          clubBuyable={clubBuyable}
          chargeMinor={chargeMinor}
          cadence={cadence}
          size={size}
          tier={tier}
          onEdit={(step) => goTo(step as StepId)}
          onDone={() => {
            try {
              window.localStorage.removeItem(STORAGE_KEY)
            } catch {
              // Cleanup only.
            }
          }}
        />
      ) : null}

      {/* Sticky summary once money is on the table. */}
      {['types', 'frequency', 'quantity', 'mix', 'budget', 'box'].includes(state.step) ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-cream/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3">
            <p className="text-sm text-navy">
              {size.bottles} bottles · {cadence.label.toLowerCase()} ·{' '}
              <span className="font-serif text-lg">{formatMinor(chargeMinor)}</span> per delivery
            </p>
            <div className="ml-auto flex items-center gap-3">
              {stepIndex > 0 ? (
                <Button type="button" variant="ghost" onClick={back}>
                  Back
                </Button>
              ) : null}
              {state.step === 'mix' && mixTotal !== size.bottles ? (
                <span className="text-sm text-red">
                  {mixTotal}/{size.bottles} bottles
                </span>
              ) : null}
              {state.step === 'box' ? (
                <Button type="button" onClick={() => goTo('review')}>
                  Review subscription
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function boxState(
  state: FlowState,
  tasteProfile: ReturnType<typeof scoreQuiz>,
): BoxState {
  return {
    box: state.box,
    tasteProfile,
    bandId: state.bandId,
    mix: state.mix,
    swappedOut: state.swappedOut,
    mixLabel: state.chooseForMe
      ? 'Chosen for me'
      : state.wineTypes.map((t) => WINE_TYPES.find((w) => w.id === t)?.label ?? t).join(', ') || 'A mix',
    cadenceId: state.cadenceId,
    sizeId: state.sizeId,
  }
}

// ---------------------------------------------------------------------------
// The small steps. Each one is a heading, cards, and a single decision.
// ---------------------------------------------------------------------------

function NameStep({ firstName, onSubmit }: { firstName: string; onSubmit: (name: string) => void }) {
  const [value, setValue] = useState(firstName)
  return (
    <form
      className="text-center"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(value.trim().slice(0, 40))
      }}
    >
      <h1 className="font-display text-[length:var(--text-display)] text-navy">
        First things first, what should we call you?
      </h1>
      <p className="mt-3 text-ink-muted">
        So the rest of this feels less like a form. We do not ask for an email.
      </p>
      <input
        type="text"
        autoComplete="given-name"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Your first name"
        aria-label="Your first name"
        className="mx-auto mt-8 block w-full max-w-sm border border-navy/30 bg-cream px-4 py-3 text-center text-lg text-navy outline-none focus:border-navy"
      />
      <Button type="submit" size="large" className="mt-6">
        {value.trim() ? 'Let’s go' : 'Skip, just show me wine'}
      </Button>
      <p className="mt-6 text-xs text-ink-muted">
        Or head back to <Link href="/wine-club" className="underline">the club page</Link>.
      </p>
    </form>
  )
}

function QuestionStep({
  title,
  lede,
  options,
  selected,
  onPick,
}: {
  title: string
  lede?: string
  options: { id: string; label: string; detail?: string }[]
  selected: string | undefined
  onPick: (id: string) => void
}) {
  return (
    <section className="text-center">
      <h1 className="font-display text-[length:var(--text-display)] text-navy">{title}</h1>
      {lede ? <p className="mt-3 text-ink-muted">{lede}</p> : null}
      <ul className={`mt-8 grid gap-3 ${options.length > 4 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {options.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              onClick={() => onPick(option.id)}
              aria-pressed={selected === option.id}
              className={`h-full w-full border px-5 py-6 font-serif text-lg transition-all hover:-translate-y-0.5 ${
                selected === option.id
                  ? 'border-navy bg-beige text-navy'
                  : 'border-navy/20 bg-cream text-navy hover:border-navy/60'
              }`}
            >
              {option.label}
              {selected === option.id ? <span aria-hidden="true"> ✓</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function RevealStep({
  firstName,
  words,
  onContinue,
}: {
  firstName: string
  words: string[]
  onContinue: () => void
}) {
  return (
    <section className="text-center">
      <p className="text-xs uppercase tracking-[0.24em] text-gold">We’ve got your taste</p>
      <h1 className="mt-3 font-display text-[length:var(--text-display)] text-navy">
        {firstName ? `${firstName}, you` : 'You'} are leaning towards wines that are
      </h1>
      <ul className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-3">
        {words.map((word) => (
          <li key={word} className="border border-gold bg-beige px-4 py-2 font-serif text-lg text-navy">
            {word}
          </li>
        ))}
      </ul>
      <Button type="button" size="large" className="mt-10" onClick={onContinue}>
        Build my subscription
      </Button>
    </section>
  )
}

function TypesStep({
  selected,
  chooseForMe,
  onToggle,
  onChooseForMe,
  onContinue,
}: {
  selected: WineType[]
  chooseForMe: boolean
  onToggle: (type: WineType) => void
  onChooseForMe: () => void
  onContinue: () => void
}) {
  return (
    <section className="text-center">
      <h1 className="font-display text-[length:var(--text-display)] text-navy">
        What would you like in your box?
      </h1>
      <p className="mt-3 text-ink-muted">Pick as many as you like.</p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {WINE_TYPES.map((type) => {
          const on = selected.includes(type.id)
          return (
            <li key={type.id}>
              <button
                type="button"
                onClick={() => onToggle(type.id)}
                aria-pressed={on}
                className={`h-full w-full border px-5 py-6 text-left transition-colors ${
                  on ? 'border-navy bg-beige' : 'border-navy/20 hover:border-navy/60'
                }`}
              >
                <span className="font-serif text-xl text-navy">
                  {type.label}
                  {on ? ' ✓' : ''}
                </span>
                <span className="mt-1 block text-sm text-ink-muted">{type.blurb}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        onClick={onChooseForMe}
        aria-pressed={chooseForMe}
        className={`mt-4 w-full border px-5 py-4 text-sm transition-colors ${
          chooseForMe ? 'border-navy bg-navy text-cream' : 'border-navy/20 text-navy hover:border-navy/60'
        }`}
      >
        I’m happy for you to choose
      </button>
      <Button type="button" size="large" className="mt-8" disabled={!selected.length} onClick={onContinue}>
        {selected.length ? 'Continue' : 'Pick at least one'}
      </Button>
    </section>
  )
}

function ChoiceStep({
  title,
  lede,
  options,
  selected,
  onPick,
  onContinue,
  continueLabel,
}: {
  title: string
  lede?: string
  options: { id: string; label: string; detail: string; flag?: string }[]
  selected: string
  onPick: (id: string) => void
  onContinue?: () => void
  continueLabel?: string
}) {
  return (
    <section className="text-center">
      <h1 className="font-display text-[length:var(--text-display)] text-navy">{title}</h1>
      {lede ? <p className="mt-3 text-ink-muted">{lede}</p> : null}
      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
        {options.map((option) => (
          <li key={option.id} className="relative">
            {option.flag ? (
              <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 bg-gold px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-navy">
                {option.flag}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => {
                onPick(option.id)
              }}
              aria-pressed={selected === option.id}
              className={`h-full w-full border px-5 py-6 text-left transition-colors ${
                selected === option.id ? 'border-navy bg-beige' : 'border-navy/20 hover:border-navy/60'
              }`}
            >
              <span className="font-serif text-lg text-navy">
                {option.label}
                {selected === option.id ? ' ✓' : ''}
              </span>
              <span className="mt-1 block text-sm text-ink-muted">{option.detail}</span>
            </button>
          </li>
        ))}
      </ul>
      {onContinue ? (
        <Button type="button" size="large" className="mt-8" onClick={onContinue}>
          {continueLabel ?? 'Continue'}
        </Button>
      ) : null}
    </section>
  )
}

function MixStep({
  types,
  mix,
  total,
  onChange,
  onChooseForMe,
  onContinue,
}: {
  types: WineType[]
  mix: Partial<Record<WineType, number>>
  total: number
  onChange: (mix: Partial<Record<WineType, number>>) => void
  onChooseForMe: () => void
  onContinue: () => void
}) {
  const current = Object.values(mix).reduce((sum, n) => sum + (n ?? 0), 0)
  const complete = current === total

  return (
    <section className="text-center">
      <h1 className="font-display text-[length:var(--text-display)] text-navy">Build your mix</h1>
      <p className="mt-3 text-ink-muted">
        {total} bottles. Split them however you like.
      </p>
      <ul className="mx-auto mt-8 max-w-md space-y-3">
        {types.map((type) => {
          const label = WINE_TYPES.find((w) => w.id === type)?.label ?? type
          const count = mix[type] ?? 0
          return (
            <li key={type} className="flex items-center justify-between border border-navy/20 px-5 py-4">
              <span className="font-serif text-lg text-navy">{label}</span>
              <span className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => onChange({ ...mix, [type]: Math.max(0, count - 1) })}
                  className="border border-navy/40 px-3 py-1 text-navy hover:bg-navy hover:text-cream"
                  aria-label={`One fewer ${label}`}
                >
                  −
                </button>
                <span className="w-6 text-lg text-navy" aria-live="polite">
                  {count}
                </span>
                <button
                  type="button"
                  onClick={() => current < total && onChange({ ...mix, [type]: count + 1 })}
                  className="border border-navy/40 px-3 py-1 text-navy hover:bg-navy hover:text-cream disabled:opacity-40"
                  disabled={current >= total}
                  aria-label={`One more ${label}`}
                >
                  +
                </button>
              </span>
            </li>
          )
        })}
      </ul>
      <p className={`mt-4 text-sm ${complete ? 'text-green' : 'text-ink-muted'}`} aria-live="polite">
        {current} / {total} bottles
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button type="button" variant="secondary" onClick={onChooseForMe}>
          Choose the mix for me
        </Button>
        <Button type="button" size="large" disabled={!complete} onClick={onContinue}>
          {complete ? 'Continue' : `Allocate ${total - current} more`}
        </Button>
      </div>
    </section>
  )
}

const FINDING_LINES = [
  'Matching your taste profile…',
  'Walking the shelves…',
  'Building your mix…',
]

function FindingStep({
  firstName,
  failed,
  onRetry,
}: {
  firstName: string
  failed: boolean
  onRetry: () => void
}) {
  const [line, setLine] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setLine((l) => (l + 1) % FINDING_LINES.length), 650)
    return () => clearInterval(t)
  }, [])

  if (failed) {
    return (
      <section className="text-center">
        <h1 className="font-display text-[length:var(--text-display)] text-navy">
          That did not work
        </h1>
        <p className="mt-3 text-ink-muted">Check your connection and try again.</p>
        <Button type="button" size="large" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      </section>
    )
  }

  return (
    <section className="py-20 text-center" aria-live="polite">
      <div aria-hidden="true" className="mx-auto h-14 w-14 animate-spin rounded-full border-2 border-navy/20 border-t-navy" />
      <p className="mt-8 font-serif text-2xl text-navy">
        {firstName ? `${firstName}, one moment.` : 'One moment.'}
      </p>
      <p className="mt-2 text-ink-muted">{FINDING_LINES[line]}</p>
    </section>
  )
}
