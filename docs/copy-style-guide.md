# Copy style guide

R22 writes the copy. The client reviews and amends afterwards.

Most of this is enforced by `scripts/ingest/validate.ts` rather than by
review, so a banned word or an em dash fails a command before it reaches a
person.

---

## House style, non-negotiable

- **UK English.**
- **No em dashes.** Use commas, colons or full stops. Also no en dashes.
- Plain, direct language. Short sentences.
- Sentence case for headings and buttons.
- Active voice.
- A button that says "Add to hamper" produces a confirmation that says
  "Added to hamper". Write the pair together.
- Write from the buyer's side of the screen. Name the producer, name the
  county, name what is in the box.

## Banned words

Rejected at ingest:

> robust, tailored, seamless, leverage, elevate, holistic, journey,
> game-changer, curated, indulge, treat yourself, perfect for, luxurious

"Curated" is on the list because the old site had it everywhere. The rest
are the usual e-commerce filler.

Also rejected: any popularity claim (`bestseller`, `best selling`, `most
popular`, `our most loved`). No sales, traffic or conversion data was
available for the June review, so there is nothing behind such a claim. The
mechanism to render one exists and is data driven; it stays empty until real
numbers fill it.

## What good looks like

The test is whether a sentence could appear on any other gifting site. If it
could, rewrite it.

> Kilbeg Dairy make their cheddar three miles from us.

is worth more than three paragraphs about quality and passion, because
nobody else can write it.

---

## Hamper template, 150 to 220 words rendered

Most of that is not prose. "What's inside" renders from the `contents`
metafield, and allergens, personalisation and delivery render from their own
fields. What you actually write is 50 to 140 words in three paragraphs.

1. **Opening line.** What this hamper is and who it is for. One sentence, no
   throat clearing.
2. **The story.** Why these items go together and where they come from. Name
   the Irish makers.
3. **Presentation.** What the box looks like when it arrives. This is the
   thing shoppers are paying for and it was unsaid on the old site.

The contents list, the allergen accordion and the delivery block are
rendered from metafields. Do not repeat them in the prose.

## Wine template, 100 to 150 words

1. What it tastes like, in language a gift buyer understands, not a
   sommelier.
2. Producer and region, one or two sentences.
3. Food pairing or occasion.
4. Where it applies, **and only where we hold evidence**: the exclusivity
   line, or the value line.

### The claims rules

- The exclusivity line ("we are the only Irish stockist") renders only where
  `wine.is_exclusive_import` is set.
- The value line renders only from `wine.rrp_comparison`, and that field is
  only populated where we hold a dated, verified comparison.
- **Never name a competitor. Never quote a competitor's price.** Prices
  move, and a claim that was true last month is a problem this month. The
  validator warns on any price-shaped string in `rrp_comparison`.

## Add-on band, 40 to 60 words

Short. Their job is to be added to a hamper, not to be discovered on their
own. Say what it is, where it is made, and which kind of box it goes in.

## Listing pages

Two blocks, both from the CMS:

- **Intro**, 60 to 100 words, above the grid. Intent matching. It should
  read as if it were written for somebody who typed that exact search.
- **SEO block**, 150 to 250 words, below the grid. Room to name producers,
  explain the range and link sideways to related listings.

---

## Generating descriptions at volume

1. Export the retained catalogue to a working file with all metafields
   populated.
2. Generate in batches of 25, grouped by category so the voice stays
   consistent.
3. Self-check every batch against the banned-word list and the em dash rule
   before writing out. `npm run ingest -- --input <file> --offline` does this
   for you and reports every problem in one pass.
4. **Flag any product where the metafield data is too thin to write
   honestly.** Set `needsReview` with the reason. The ingest tool refuses to
   publish it, so a gap in the data can never become invented copy on the
   site. If we do not know the allergens, the description says nothing about
   allergens and the product does not go live.
5. Output to a review file for client sign-off, then feed the approved file
   into the ingest tool.
