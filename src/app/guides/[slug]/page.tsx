import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProductGrid } from '@/components/product/ProductCard'
import { JsonLd } from '@/components/seo/JsonLd'
import { getGuide, getGuides } from '@/lib/cms'
import { queryProducts } from '@/lib/commerce'
import { getCollectionByPath } from '@/lib/commerce/collections'
import { breadcrumbJsonLd } from '@/lib/seo/structured-data'

export const revalidate = 3600

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const guides = await getGuides()
  return guides.map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const guide = await getGuide(slug)
  if (!guide) return {}
  return {
    title: guide.title,
    description: guide.summary,
    alternates: { canonical: `/guides/${guide.slug}` },
  }
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params
  const guide = await getGuide(slug)
  if (!guide) notFound()

  const { items } = await queryProducts({
    handles: guide.productHandles,
    first: guide.productHandles.length,
  })

  const related = guide.relatedPaths
    .map((path) => getCollectionByPath(path))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)

  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-14 lg:px-8">
        <p className="text-xs uppercase tracking-[0.24em] text-green">Guide</p>
        <h1 className="mt-2 font-display text-[length:var(--text-hero)] text-navy">
          {guide.title}
        </h1>
        <p className="mt-4 text-lg text-ink-muted">{guide.summary}</p>
        <p className="mt-2 text-sm text-ink-muted">
          Updated <time dateTime={guide.updatedAt}>{formatDate(guide.updatedAt)}</time>
        </p>

        <div
          className="prose-tpc mt-10 text-ink-muted"
          dangerouslySetInnerHTML={{ __html: guide.body }}
        />

        {related.length ? (
          <nav aria-label="Related pages" className="mt-12 border-t border-rule pt-6">
            <h2 className="text-xs uppercase tracking-[0.18em] text-ink-muted">Go to</h2>
            <ul className="mt-3 flex flex-wrap gap-3">
              {related.map((collection) => (
                <li key={collection.path}>
                  <Link
                    href={collection.path}
                    className="inline-block border border-navy/25 px-4 py-2 text-sm text-navy hover:bg-navy hover:text-cream"
                  >
                    {collection.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </article>

      {items.length ? (
        <section className="border-t border-rule bg-beige">
          <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
            <h2 className="font-display text-[length:var(--text-display)] text-navy">
              What we mentioned
            </h2>
            <div className="mt-8">
              <ProductGrid products={items} />
            </div>
          </div>
        </section>
      ) : null}

      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Guides', path: '/guides' },
          { name: guide.title, path: `/guides/${guide.slug}` },
        ])}
      />
    </>
  )
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IE', { dateStyle: 'long' }).format(new Date(iso))
}
