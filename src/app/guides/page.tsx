import type { Metadata } from 'next'
import Link from 'next/link'
import { getGuides } from '@/lib/cms'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Guides',
  description:
    'Practical notes on choosing a hamper, sending something after a bereavement, and corporate gifting that does not embarrass anyone.',
  alternates: { canonical: '/guides' },
}

export default async function GuidesIndex() {
  const guides = await getGuides()

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
      <h1 className="font-display text-[length:var(--text-hero)] text-navy">Guides</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-muted">
        Things we get asked often enough that they are worth writing down properly, written by the
        people who pack the boxes.
      </p>

      <ul className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => (
          <li key={guide.slug} className="border-t-2 border-gold pt-5">
            <h2 className="font-serif text-2xl font-semibold text-navy">
              <Link href={`/guides/${guide.slug}`} className="hover:underline">
                {guide.title}
              </Link>
            </h2>
            <p className="mt-2 text-ink-muted">{guide.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
