import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PostmarkRoundel } from '@/components/ui/Stamp'
import { getPage } from '@/lib/cms'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Guaranteed Irish',
  description:
    'We are proud members of Guaranteed Irish, supporting Irish suppliers and choosing quality products from businesses throughout Ireland wherever possible.',
  alternates: { canonical: '/about/guaranteed-irish' },
}

export default async function GuaranteedIrishPage() {
  const page = await getPage('guaranteed-irish')
  if (!page) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 lg:px-8">
      <PostmarkRoundel className="h-24 w-24 text-green" />
      <h1 className="mt-6 font-display text-[length:var(--text-hero)] text-navy">{page.title}</h1>
      <div
        className="prose-tpc mt-6 text-ink-muted"
        dangerouslySetInnerHTML={{ __html: page.body }}
      />
      <p className="mt-8">
        <Link href="/about/our-makers" className="text-navy underline underline-offset-4">
          Meet the producers
        </Link>
      </p>
    </div>
  )
}
