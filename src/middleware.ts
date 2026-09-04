import { NextResponse, type NextRequest } from 'next/server'

/**
 * Coming soon mode.
 *
 * With SITE_COMING_SOON=true, every page request is rewritten to the
 * holding page. A rewrite rather than a redirect, so the visitor keeps the
 * URL they asked for and the moment the flag comes off, that URL works.
 *
 * Done in middleware rather than in a layout because a layout only covers
 * the pages inside it: the gifting pages under /gift, the fulfilment admin
 * and the route handlers all sit outside the shop's own group, and a
 * holding page that half the site can be clicked past is not a holding
 * page.
 *
 * The env var is read directly rather than through site-config, to keep the
 * middleware bundle to what the edge actually needs.
 *
 * Deliberately still reachable while it is on:
 *   /api/*   so anything already integrated fails honestly rather than
 *            being served HTML where it expects JSON
 *   robots and sitemap, which say noindex for themselves
 *   static assets, or the holding page would have no logo and no font
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|api|brand|photography|robots.txt|sitemap.xml|favicon.ico|icon.svg).*)'],
}

export function middleware(request: NextRequest) {
  if (process.env.SITE_COMING_SOON !== 'true') return NextResponse.next()
  if (request.nextUrl.pathname === '/coming-soon') return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = '/coming-soon'
  url.search = ''
  // 503 rather than 200: this is temporary, and a crawler that sees 503
  // comes back rather than recording the holding page as the site.
  return NextResponse.rewrite(url, { status: 503, headers: { 'Retry-After': '604800' } })
}
