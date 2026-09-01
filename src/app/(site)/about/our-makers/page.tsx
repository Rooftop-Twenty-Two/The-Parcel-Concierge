import type { Metadata } from 'next'
import { ProductGrid } from '@/components/product/ProductCard'
import { getMakers } from '@/lib/cms'
import { queryProducts } from '@/lib/commerce'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Our makers',
  description:
    'The small Irish producers whose work goes into our hampers. The Handmade Soap Company in Slane, Filligan’s and McNutt of Donegal, Julie Clarke, Pestle and Mortar, Kybalion and Jo Browne.',
  alternates: { canonical: '/about/our-makers' },
}

export default async function MakersPage() {
  const makers = await getMakers()

  const withProducts = await Promise.all(
    makers.map(async (maker) => ({
      maker,
      products: (await queryProducts({ handles: maker.productHandles, first: 4 })).items,
    })),
  )

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
      <h1 className="font-display text-[length:var(--text-hero)] text-navy">Our makers</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-muted">
        We buy directly from the people who make what is in our boxes. Most of them are within an
        hour of us, and we have driven to nearly all of them.
      </p>

      <div className="mt-14 space-y-16">
        {withProducts.map(({ maker, products }) => (
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

            {products.length ? (
              <div className="mt-8">
                <h3 className="mb-4 text-xs uppercase tracking-[0.18em] text-ink-muted">
                  Where you will find their work
                </h3>
                <ProductGrid products={products} />
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  )
}
