import Image from 'next/image'
import Link from 'next/link'
import { ButtonLink } from '@/components/ui/Button'
import { StampFrame } from '@/components/ui/Stamp'
import { SITE } from '@/lib/site-config'

/**
 * The invitation to visit the actual shop.
 *
 * The website is deliberately the narrow end of the business: hampers and
 * wine, plus everything else through the hamper builder. The shop in
 * Dunshaughlin carries far more than we could ever usefully list, and the
 * client wants that said plainly rather than letting the site read as the
 * whole offer. This band says it, with the shopfront, wherever it is
 * placed.
 *
 * Opening hours and the phone number are deliberately absent: they are
 * unconfirmed client details (docs/build-status.md), and the sign in the
 * photograph carries them in the meantime without us committing them to
 * copy that could go stale.
 */
export function VisitTheShop({
  title = 'The shop holds far more than the website',
  body,
}: {
  title?: string
  body?: string
}) {
  return (
    <section className="bg-green text-cream">
      <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 py-16 lg:grid-cols-[1fr_1.1fr] lg:px-8">
        <StampFrame className="bg-beige">
          <Image
            src="/photography/tpc-may-1-2.jpg"
            alt={`The Parcel Concierge shopfront in ${SITE.town}, with wine barrel tables outside`}
            width={1600}
            height={1067}
            sizes="(min-width: 1024px) 46vw, 92vw"
            className="aspect-3/2 w-full object-cover"
          />
        </StampFrame>

        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.24em] text-gold">
            {SITE.town}, {SITE.county}
          </p>
          <h2 className="font-display text-[length:var(--text-display)] leading-[0.95]">{title}</h2>
          {/* The red cancellation waves from the brand asset pack. */}
          <Image
            src="/brand/graphic-element-1.svg"
            alt=""
            aria-hidden="true"
            width={304}
            height={156}
            className="mt-4 h-10 w-auto"
          />
          <p className="mt-4 max-w-xl text-lg text-cream/90">
            {body ??
              'What you see online is the edit: our hampers, the wine, and everything you can put in a box you build. The shelves in Dunshaughlin go much further, with jewellery, skincare, candles, homeware, cards and a wine room you can browse bottle by bottle, and one of us on the floor to help you choose.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <ButtonLink href="/contact" variant="primary">
              Plan a visit
            </ButtonLink>
            <Link href="/about" className="text-sm text-cream/85 underline underline-offset-4">
              Our story
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
