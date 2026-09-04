import type { Metadata } from 'next'
import { getMakers } from '@/lib/cms'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Our makers',
  description:
    'The Irish brands and producers we stock. The Handmade Soap Company, Filligan’s and McNutt of Donegal, The Chocolate Garden of Ireland, Rathbornes 1488, Tipperary Crystal, Kybalion, Pestle and Mortar, Butlers, Julie Clarke and La Bougie.',
  alternates: { canonical: '/about/our-makers' },
}

export default async function MakersPage() {
  const makers = await getMakers()

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
      <h1 className="font-display text-[length:var(--text-hero)] text-navy">Our makers</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-muted">
        The Irish brands and producers we are proudest to stock. Their work goes into our hampers
        and sits on our shelves in Dunshaughlin.
      </p>

      <div className="mt-14 space-y-16">
        {makers.map((maker) => (
          <section key={maker.slug} id={maker.slug}>
            <div className="flex flex-wrap items-baseline gap-x-4">
              <h2 className="font-display text-[length:var(--text-display)] text-navy">
                {maker.name}
              </h2>
              {maker.county ? (
                <p className="text-sm uppercase tracking-[0.18em] text-green">Co. {maker.county}</p>
              ) : null}
            </div>

            <div
              className="prose-tpc mt-4 text-ink-muted"
              dangerouslySetInnerHTML={{ __html: maker.body }}
            />

            {maker.flags?.length ? (
              <ul className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-green">
                {maker.flags.map((flag, index) => (
                  <li key={flag} className="flex items-center gap-3">
                    {index > 0 ? (
                      <span aria-hidden="true" className="text-gold">
                        &bull;
                      </span>
                    ) : null}
                    {flag}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  )
}
