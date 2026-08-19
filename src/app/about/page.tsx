import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { StampFrame } from '@/components/ui/Stamp'
import { getPage } from '@/lib/cms'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'About us',
  description:
    'Karen and Ciaran McBride run The Parcel Concierge from Dunshaughlin, Co. Meath. We buy from small Irish producers directly and pack every hamper by hand.',
  alternates: { canonical: '/about' },
}

export default async function AboutPage() {
  const page = await getPage('about')
  if (!page) notFound()

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="font-display text-[length:var(--text-hero)] text-navy">{page.title}</h1>
          {page.intro ? <p className="mt-4 text-lg text-ink-muted">{page.intro}</p> : null}
          <div
            className="prose-tpc mt-8 text-ink-muted"
            dangerouslySetInnerHTML={{ __html: page.body }}
          />

          <nav className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/about/our-makers"
              className="border-2 border-navy px-5 py-3 text-navy transition-colors hover:bg-navy hover:text-cream"
            >
              Meet our makers
            </Link>
            <Link
              href="/about/guaranteed-irish"
              className="border-2 border-navy px-5 py-3 text-navy transition-colors hover:bg-navy hover:text-cream"
            >
              Guaranteed Irish
            </Link>
          </nav>
        </div>

        <StampFrame className="bg-beige">
          <Image
            src="/photography/tpc-christmas-6.jpg"
            alt="Karen and Ciaran McBride outside The Parcel Concierge in Dunshaughlin"
            width={2200}
            height={1239}
            priority
            sizes="(min-width: 1024px) 42vw, 92vw"
            className="aspect-3/2 w-full object-cover"
          />
        </StampFrame>
      </div>
    </div>
  )
}
