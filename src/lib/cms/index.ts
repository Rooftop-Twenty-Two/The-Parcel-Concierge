import 'server-only'

import { CONTENT } from './content'
import type {
  ContentPage,
  CuratedListing,
  Guide,
  Homepage,
  ListingCopy,
  Maker,
} from './types'

/**
 * The CMS read layer.
 *
 * Today it reads the local content store in ./content.ts. When Sanity is
 * provisioned, every function in this file swaps to a GROQ query and nothing
 * above it changes: pages never learn where the words came from.
 *
 * Swapping in Sanity:
 *   1. Add the client and a projectId/dataset to the environment.
 *   2. Replace each function body with its GROQ query, tagged with
 *      cmsTag(documentType) so the CMS webhook can revalidate it.
 *   3. Delete ./content.ts.
 *
 * The CMS never returns a price, a stock level or a variant. Products are
 * referenced by handle and resolved through the commerce layer, so a CMS
 * document cannot go stale against Shopify.
 */

export async function getHomepage(): Promise<Homepage> {
  return CONTENT.homepage
}

export async function getListingCopy(path: string): Promise<ListingCopy | null> {
  return CONTENT.listingCopy.find((c) => c.path === path) ?? null
}

export async function getCuratedListing(path: string): Promise<CuratedListing | null> {
  return CONTENT.curated.find((c) => c.path === path) ?? null
}

export async function getMakers(): Promise<Maker[]> {
  return CONTENT.makers
}

export async function getMaker(slug: string): Promise<Maker | null> {
  return CONTENT.makers.find((m) => m.slug === slug) ?? null
}

export async function getGuides(): Promise<Guide[]> {
  return [...CONTENT.guides].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

export async function getGuide(slug: string): Promise<Guide | null> {
  return CONTENT.guides.find((g) => g.slug === slug) ?? null
}

export async function getPage(slug: string): Promise<ContentPage | null> {
  return CONTENT.pages.find((p) => p.slug === slug) ?? null
}

/**
 * Listing routes that have no CMS copy yet.
 *
 * Read by scripts/content/report.ts so phase 7 has a work list rather than
 * a guess, and so nobody has to click every route to find the gaps.
 */
export function listingPathsWithCopy(): string[] {
  return CONTENT.listingCopy.map((c) => c.path)
}

export type { ContentPage, CuratedListing, Guide, Homepage, ListingCopy, Maker }
