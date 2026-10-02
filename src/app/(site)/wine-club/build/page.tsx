import type { Metadata } from 'next'
import { WineClubFlow } from '@/components/wine-club/Flow'
import { isClubBuyable } from '@/lib/wine-club'

export const metadata: Metadata = {
  title: 'Build your wine subscription',
  description: 'Seven quick questions, then a case chosen around your taste.',
  alternates: { canonical: '/wine-club/build' },
  // The builder is a tool, not a page to rank: the landing page carries
  // the search weight, and personalised states must not be indexed.
  robots: { index: false, follow: true },
}

export default function WineClubBuildPage() {
  return <WineClubFlow clubBuyable={isClubBuyable()} />
}
