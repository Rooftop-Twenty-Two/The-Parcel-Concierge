import Image from 'next/image'
import Link from 'next/link'
import { ButtonLink } from '@/components/ui/Button'
import { InkWaves } from '@/components/ui/Stamp'

/**
 * A full-bleed hero for a listing that earns one.
 *
 * The same treatment as the homepage hero: the photograph fills the
 * section and the copy sits on top of it, with a brand-green wash under
 * the words on the left that is gone by the middle so the hamper shows
 * clean. Most listings do not get this. A seasonal landing page that
 * people arrive on from an ad or a newsletter does, which is why it is a
 * prop rather than the default header.
 */
export type ListingHeroContent = {
  image: { src: string; alt: string }
  eyebrow: string
  /** Falls back to the listing's own h1 when absent. */
  headline?: string
  cta: { label: string; href: string }
  secondary?: { label: string; href: string }
}

export function ListingHero({
  content,
  h1,
  intro,
}: {
  content: ListingHeroContent
  h1: string
  intro: string | null
}) {
  return (
    <section className="relative isolate overflow-hidden bg-green">
      <Image
        src={content.image.src}
        alt={content.image.alt}
        fill
        priority
        sizes="100vw"
        // The hamper sits on the right of the frame and the left is dark
        // and empty, which is where the copy goes. On a phone the frame is
        // tall and narrow, so the focal point moves in to keep the box in
        // shot rather than cropping to the tree behind it.
        className="object-cover object-[72%_center] lg:object-right"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-0 bg-green/60 lg:bg-transparent lg:bg-linear-to-r lg:from-green/90 lg:via-green/55 lg:via-30% lg:to-green/0 lg:to-55%"
      />

      <div className="relative mx-auto flex max-w-[1400px] items-center px-4 py-16 lg:min-h-[560px] lg:px-8 lg:py-24">
        <div className="max-w-xl animate-rise text-cream">
          <p className="mb-4 text-xs uppercase tracking-[0.24em] text-gold">{content.eyebrow}</p>
          <h1 className="font-display text-[length:var(--text-hero)] leading-[0.92]">
            {content.headline ?? h1}
          </h1>
          {intro ? <p className="mt-5 max-w-md text-lg text-cream/90">{intro}</p> : null}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ButtonLink href={content.cta.href} size="large">
              {content.cta.label}
            </ButtonLink>
            {content.secondary ? (
              <Link
                href={content.secondary.href}
                className="text-cream underline underline-offset-4 hover:text-gold"
              >
                {content.secondary.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <InkWaves className="relative h-16 w-full text-cream/25" lines={4} />
    </section>
  )
}
