import Image from 'next/image'
import Link from 'next/link'
import { NewsletterSignup } from '@/components/marketing/NewsletterSignup'
import { TrustpilotStars } from '@/components/trust/TrustpilotStars'
import { InkWaves } from '@/components/ui/Stamp'
import { FOOTER_LINKS } from '@/lib/routes'
import { SITE } from '@/lib/site-config'

export function Footer() {
  return (
    <footer className="mt-24 bg-navy text-cream">
      <InkWaves className="h-14 w-full text-green-light/40" lines={4} />

      <div className="mx-auto max-w-[1400px] px-4 pb-14 lg:px-8">
        <div className="grid gap-12 border-b border-cream/15 pb-12 lg:grid-cols-[320px_1fr]">
          <div>
            <Image
              src="/brand/logo-gold.svg"
              alt="The Parcel Concierge"
              width={206}
              height={92}
              className="h-16 w-auto"
            />
            <p className="mt-5 max-w-xs text-sm text-cream/80">
              Hampers packed by hand in {SITE.town}, {SITE.county}, from Irish producers we buy from
              directly. Run by {SITE.owners}.
            </p>
            <p className="mt-3 max-w-xs text-sm text-cream/80">
              The shop in {SITE.town} carries far more than the website.{' '}
              <Link href="/contact" className="underline underline-offset-4 hover:text-cream">
                Come and see us
              </Link>
              .
            </p>
            <div className="mt-5">
              <TrustpilotStars variant="light" />
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FOOTER_LINKS.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h2 className="mb-3 text-xs uppercase tracking-[0.18em] text-gold">{group.title}</h2>
                <ul className="space-y-2">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm text-cream/85 hover:underline">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="border-b border-cream/15 py-12">
          <NewsletterSignup variant="dark" />
        </div>

        <div className="flex flex-col gap-3 pt-8 text-xs text-cream/65 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.legalName}. {SITE.town}, {SITE.county}, Ireland.
          </p>
          <p>
            Member of {SITE.memberships.join(', ')}. You must be over 18 to buy alcohol from this
            site.
          </p>
        </div>
      </div>
    </footer>
  )
}
