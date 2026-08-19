# Design direction

## Where it came from

The supplied brand guidelines (October 2023, in `docs/reference/`) already
contain a strong and specific visual language, and it is the right one for
this business. We have built on it rather than around it.

The centre of it is the postal metaphor: vintage ink stamp marks,
perforated stamp edges, cancellation waves, and a circular "Premier Gift
Delivery Ireland" postmark. That is a company called The Parcel Concierge
whose owners get in the van and hand deliver the boxes. It is grounded in
the subject the way the brief asks for, and no other gifting store in
Ireland looks like it.

## The palette

Straight from the guidelines, page 5. No shade has been invented.

| | |
|---|---|
| Navy `#2C4349` | Ink. Body text, the header bar, dark bands |
| Green `#326A68` | The hero ground and the hub headers |
| Light green `#9BB7A8` | |
| Cream `#F5F2E9` | Paper. The page ground |
| Gold `#D7B371` | The logo, thin rules, eyebrow text on dark |
| Beige `#F5E4D2` | Card and section grounds |
| Red `#E1472F` | Postal ink. Primary buttons and the builder's entry point |
| Wine `#9F3226` | Button hover |

### On the "AI-design defaults" warning

The brief warns against landing on cream with a terracotta accent by
accident. We have landed on cream with a red-orange accent, and it is worth
saying plainly why that is a choice rather than a default.

It is the client's actual brand, defined in 2023, before this project. The
red is used narrowly and deliberately: buttons, the builder's border, the
focus ring, and one full-bleed band. It is postal ink, not a decorative
accent, and it never becomes a large field of colour. The dominant
relationship on the site is deep green against cream, with gold as a hairline.

If we had arrived at this palette ourselves, the warning would apply. We
did not.

## Type

The guidelines specify four faces: Bebas Kai (headings), Salfish (headings
and supporting), South Epic (accents) and Futura (body). **None of the
licensed files were supplied with the asset pack.**

We load the nearest open substitutes and list the licensed face first in
every CSS stack, so the moment the real files exist the browser picks them.
Swapping them in is one file, `src/lib/brand/fonts.ts`, and nothing else in
the codebase changes.

| Role | Brand face | Currently loaded |
|---|---|---|
| Display, headings | Bebas Kai | Bebas Neue |
| Serif, product titles, editorial | Salfish | Fraunces |
| Body | Futura | Jost |
| Accents | South Epic | not used until the file arrives |

The pairing is a condensed display face against a geometric body face, which
is what the guidelines specify and is not the pairing every gifting store
uses.

## The stamp device

The perforated stamp edge is the signature. It is one CSS mask
(`.stamp-edge` in `globals.css`), so it works over photography and over flat
colour with no extra markup and no image assets.

It carries every image on the site: the hero, product cards, the gallery,
the mega-menu promo, the builder tiles. That is deliberate. The brief asks
for the boldness to be spent in one place and for the photography to carry
the design, so everything around the frames stays quiet: flat colour, hairline
rules, no shadows, no gradients, no rounded corners beyond 2px.

The cancellation waves are section dividers. The postmark roundel is the
trust device, and it appears on the hero, the exclusive-import flag, the
delivery page and the 404.

## Motion

Restrained, as the brief asks:

- A page-load sequence on the hero and hub headers (`.animate-rise`, 700ms,
  one 120ms stagger)
- A 3% scale on product card images on hover
- Nothing else. No autoplay, no carousels, no scroll-triggered anything

All of it is disabled outright under `prefers-reduced-motion: reduce`.

## Mobile

Mobile first, because most gift buying happens on a phone.

- Product grids are two columns on mobile, three at medium, four at large
- The mega-menu collapses to a flat two-level list, never a three-deep
  accordion
- The hamper builder's summary is sticky beside the content on desktop and
  scrolls in place on mobile, so the running total and the add button are
  never far away
- Tap targets are at least 44px

## Photography

**The 12 new hamper shots have not arrived.** The placeholders in
`/public/placeholder` are deliberately not photographs: they are brand-styled
stamp cards, so nobody mistakes a placeholder for the shoot, and no page
design has been signed off against them.

When the shoot lands we need the shot list mapping each image to a SKU. The
product pages assume four shots per hamper (styled, contents flat-lay,
packaging, scale) and the ingest tool refuses a hamper with fewer, so the
shot list is what makes the ingest run possible.
