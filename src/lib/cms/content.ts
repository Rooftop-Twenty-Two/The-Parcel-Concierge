import type { CmsData } from './types'

/**
 * The local content store.
 *
 * This is the stand-in for the headless CMS (Sanity is the recommendation).
 * It holds the same shapes the CMS will serve, so swapping in Sanity is a
 * change to src/lib/cms/index.ts alone: the pages never learn where the
 * words came from.
 *
 * Everything here follows docs/copy-style-guide.md: UK English, no em
 * dashes, no banned words. scripts/copy/check-style.ts enforces that in CI.
 *
 * Listing copy is written for the routes that carry the most search and
 * commercial weight. Routes without copy still render, minus the intro and
 * SEO block, and `npm run content:report` lists what is still outstanding
 * for phase 7 sign-off.
 */
export const CONTENT: CmsData = {
  homepage: {
    /**
     * Slot order carries the August 2026 launch brief: the site is a
     * gifting, hamper and wine business with a real shop, not a hamper
     * catalogue. Hampers keep the hero (the wine-led hero was tried and
     * reverted), Christmas gets the second band because it is the
     * immediate commercial priority, and the Wine Vault, the builder, the
     * corporate service and the physical shop all sit above the fold-adjacent
     * bands they used to trail behind.
     */
    slots: [
      {
        kind: 'hero',
        headline: 'Christmas has arrived',
        subhead:
          'Visit us in our bricks and mortar store in Dunshaughlin or shop with us online from anywhere. Enjoy free local delivery within the A85 eircode area, personally delivered by our team, with nationwide delivery through An Post, free on orders over €100.',
        ctaLabel: 'Shop Christmas',
        ctaHref: '/occasions/christmas',
        // The Christmas listing's hero photograph (October 2026), in place
        // of the everyday hamper table shot, which is
        // /photography/tpc-hero-hamper-table.webp when the season ends. The
        // separate Christmas band ("Christmas coming soon") came off at the
        // same time: the hero now says it.
        imageHandle: null,
        image: {
          src: '/photography/christmas/hero.webp',
          alt: 'A Christmas hamper on a wooden table, holding a Butlers festive chocolate collection, Keogh’s crisps, Hadji Bey’s caramels, a Filligan’s chutney, Shines smoked salmon pâté, Isle of Crackers and a box of mince pies, with pine, holly and pinecones around it',
          // A 16:9 frame, centred like the Christmas listing's hero.
          position: 'center',
        },
      },
      { kind: 'budget-bands' },
      {
        kind: 'featured-hampers',
        title: 'Hampers to start with',
      },
      {
        kind: 'wine-vault',
        title: 'The Wine Vault',
        body: 'Weeknight bottles, fine wine and Champagne, chosen by us. Buy a bottle, send a gift set, or join the Wine Vault Club and we will build a case around your own taste.',
        // A spread across styles and prices rather than a Champagne shelf,
        // so the band reads as a wine list and not a trophy cabinet. The
        // exclusive import flag is still not in the Shopify export, so the
        // homepage does not claim the eight exclusives the June review found
        // until somebody marks them: see docs/build-status.md.
        handles: [
          'dom-perignon-champagne',
          'chateau-mont-redon-chateauneuf-du-pape',
          'cyclus',
          'minuty-rose',
          'bourgogne-pinot-noir',
          'la-bascula-albarino',
          'lanson-champagne',
          'taylors-classic-vintage-port-2003',
        ],
      },
      {
        kind: 'hamper-builder',
        title: 'Build your own hamper',
        body: 'Create a gift as unique as the person receiving it. Choose from our carefully selected range of fine wines, chocolates and artisan foods. Make your gift even more special by adding a personal note: include your message when ordering and we will make sure it goes in. We take care of the finishing touches, presenting and wrapping your hamper beautifully.',
      },
      {
        kind: 'corporate',
        title: 'Reward your team without collecting a single address',
        body: 'Choose the gifts and the budget, share one private link, and everyone picks their own gift and enters their own delivery details. No spreadsheets, no chasing home addresses, one invoice. Whether you are sending 30 gifts or 2,000, we have you covered.',
      },
      {
        kind: 'visit-shop',
        title: 'There is even more to discover in store',
        body: 'Browse our carefully chosen collection of homewares, jewellery, skincare, candles, greeting cards, accessories, chocolates, gifts and much more, with something special for every occasion and plenty of treats for yourself too. Whether you shop online or pop in for a browse, we are here to make gifting easy, personal and beautifully presented. More than hampers. More than wine. A whole world of gifting under one roof.',
      },
      {
        kind: 'occasions',
        title: 'Shop by occasion',
        paths: [
          '/occasions/christmas',
          '/hampers/new-baby',
          '/hampers/sympathy',
          '/hampers/anniversary',
          '/hampers/thank-you',
          '/occasions/wedding-engagement',
        ],
      },
      { kind: 'trustpilot' },
      {
        kind: 'makers',
        title: 'The people who make what is in the box',
        body: 'We buy directly from small Irish producers and we are members of Guaranteed Irish.',
        makerSlugs: ['the-handmade-soap-company', 'filligans-of-donegal', 'mcnutt-of-donegal'],
      },
      { kind: 'newsletter' },
    ],
  },

  listingCopy: [
    {
      path: '/hampers',
      intro:
        'Every hamper on this page is packed by hand in Dunshaughlin. Pick by budget, by occasion or by what is in the box, and we will write the card by hand before it goes out.',
      // Emptied at the client's request, September 2026. It had also gone
      // stale twice over: it pointed at "the four bands above", which the
      // Christmas-only range removed, and it quoted the pre-An Post
      // delivery wording. An empty seoBlock renders nothing at all rather
      // than an empty band.
      seoBlock: '',
      metaTitle: 'Irish hampers, packed by hand',
      metaDescription:
        'Hampers packed by hand in Dunshaughlin, from makers we choose ourselves. Shop by budget, occasion or contents. Free local hand delivery, €8.95 nationwide.',
    },
    {
      path: '/hampers/under-75',
      intro:
        'Hampers under €75, which is where most people start. Everything here is still hand packed, and none of it looks like a budget gift when the lid comes off.',
      seoBlock:
        '<p>The temptation at this price is to pad a box out with filler. We would rather send four things worth having than eight things nobody wants, so the boxes in this band are smaller and better rather than bigger and thinner.</p><p>The Perfect Duo at €55 is a bottle of rosé and a box of Baileys chocolates, and it does exactly what it needs to. For the Guinness Lover at €68 packs Guinness chocolates, caramel fudge and coffee around an enamel mug he will keep.</p><p>Both arrive hand packed and hand tied, with your message written on a card inside the lid. Free hand delivery locally, €8.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/hampers/75-125',
      intro:
        'Hampers from €75 to €125. This is the band for a gift that has to carry a bit of weight: a proper thank you, a milestone birthday, a client you want to keep.',
      seoBlock:
        '<p>Between €75 and €125 a hamper stops being a nice gesture and starts being a real present. There is room in the box for a bottle worth opening, a full Irish spread or a proper bit of knitwear.</p><p>Bubbles and Bliss at €80 pairs two bottles of Prosecco with Jo Browne body oils. The All Ireland Food Hamper at €105.95 holds McEntee’s tea, Keogh’s crisps, Hassetts biscuits and three jars from Filligan’s of Donegal. The Classic Gentleman’s Hamper at €105 wraps a McNutt lambswool scarf around a Sicilian red, and the Taste of Ireland Gluten Free Hamper at €92 feeds the house nobody can usually buy for.</p><p>Every box in this band is packed by hand and hand tied with ribbon. Free hand delivery locally, €8.95 anywhere else in Ireland, free over €100.</p>',
    },
    {
      path: '/hampers/125-200',
      intro:
        'Hampers from €125 to €200. Bigger boxes, better bottles, and gifts that stay in the house after the food is gone. This is the band for an anniversary, a new arrival, or a client list where the names matter.',
      seoBlock:
        '<p>At this level the box is built around one or two things worth talking about rather than a longer list of small ones. The Italian Job at €134.95 sets two Italian wines beside a Caulfield Country walnut serving board. Because You’re Amazing at €139 is the pamper answer: Prosecco, chocolates, a Herb Dublin candle trio and a body care set from The Handmade Soap Company.</p><p>Hello Baby Boy and Hello Baby Girl, both €189.95, welcome the newest arrivals with a McNutt of Donegal lambswool blanket, a bedtime bear and a bottle for the parents. If nothing here fits, the hamper builder will let you put exactly the right things in a box, and we will pack it the same way we pack everything else.</p><p>Free hand delivery locally, €8.95 anywhere else in Ireland, free over €100.</p>',
    },
    {
      path: '/hampers/luxury-200-plus',
      intro:
        'Hampers at €200 and over. Champagne, Rioja, crystal and the biggest baskets we pack.',
      seoBlock:
        '<p>Above €200 the boxes get deeper rather than louder. The New Home Luxury Hamper at €216 marks a move properly, with Henriot Champagne, Galway Crystal flutes, a Rathbournes diffuser and an Ogham print for the wall. A Taste of Luxury at €280 fills a basket with Italian wine, Prosecco, Shines pâté, chocolates and a La Bougie candle and diffuser.</p><p>The Grand Indulgence at €495 is the biggest thing we pack: Louis Roederer Champagne, Bordeaux and Rioja, Butlers chocolates, Mienas nougat, and fragrance for the house and the car, all in one basket.</p><p>Free delivery on these anywhere in Ireland, and we can deliver to a business address if that is easier.</p>',
    },
    {
      path: '/hampers/wine',
      intro:
        'Wine hampers, from a single bottle with glassware up to a six bottle wooden case. Every wine in them is one we list in the Wine Vault, so you can read the tasting note before you buy.',
      seoBlock:
        '<p>A wine hamper is only as good as the wine in it, which is why ours are built out of the same list we sell bottle by bottle rather than from whatever was cheap that month.</p><p>The current range is small and growing. If nothing here fits, the hamper builder carries the whole wine room: pick the bottles, pick what goes alongside them, and we pack it the same way.</p><p>All of these contain alcohol, so we can only deliver them to somebody over 18. Free hand delivery locally, €8.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/hampers/food',
      intro:
        'Food hampers built around Irish makers. Tea, coffee, crisps, biscuits, chocolate and preserves, boxed and hand tied.',
      seoBlock:
        '<p>Our food hampers start from the maker rather than a theme. The All Ireland box holds McEntee’s tea, Keogh’s crisps, Hassetts biscuits, Butlers chocolates and three jars from Filligan’s of Donegal. The gluten free box leans on The Foods of Athenry, Blanco Niño and The Chocolate Garden of Ireland, so the house that usually gets flowers can get fed instead.</p><p>The boxes change a little with what is available, and we can tell you where everything came from. If somebody in the house has an allergy, ring us before you order and we will go through the box with you.</p><p>Free hand delivery locally, €8.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/hampers/pamper',
      intro:
        'Pamper hampers built around The Handmade Soap Company range from Slane, ten minutes up the road from us, with candles poured in Ireland.',
      seoBlock:
        '<p>Most pamper hampers are full of things nobody uses. Ours are built around products we would use ourselves, from Irish makers we buy from directly, with nothing in the box that exists to fill space.</p><p>If you want a particular mix, the hamper builder carries the full beauty and bath shelf and you can build the box yourself.</p>',
    },
    {
      path: '/hampers/sympathy',
      intro:
        'Sympathy hampers, sent plain. No branding on the outer wrap, food that does not need cooking, and a card we write by hand.',
      seoBlock:
        '<p>These boxes have one job, which is to be useful in a house where nobody is thinking about food. Everything in them can be eaten without cooking, and there is enough in the larger ones to feed whoever calls in, which is usually the practical problem in the days after a funeral.</p><p>We send them in unbranded packaging. There is no logo on the outer wrap and no marketing insert. The card is written by hand, and if you tell us what to write we will write exactly that.</p><p>If you need one delivered quickly, ring us rather than ordering online and we will tell you honestly what we can do. Free hand delivery locally, €8.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/hampers/new-baby',
      intro:
        'New baby hampers with something in them for the parents as well. Lambswool blankets, bedtime bears, and a bottle to wet the baby’s head.',
      seoBlock:
        '<p>Every other new baby gift forgets the two people who have not slept. Ours do not: the baby gets a McNutt of Donegal lambswool blanket and a bedtime bear, and the parents get a bottle worth opening once the house is quiet.</p><p>Hello Baby Boy and Hello Baby Girl are both €189.95. The New Baby Celebration at €190 adds Pestle and Mortar skincare for Mum, and the New Mum and Baby Girl hamper at €195 is built around her rather than the baby, with Moët Rosé and a Jo Browne sleep set. For anything else, the baby shelf in the hamper builder has the blankets, teddies and keepsakes.</p><p>The bottle makes these alcohol deliveries, so somebody over 18 has to take one in.</p>',
    },
    {
      path: '/hampers/corporate',
      intro:
        'Corporate hampers with your branding on the card inside the lid. Alcohol free options, volume pricing over ten units, and we handle the address list.',
      seoBlock:
        '<p>These are the boxes we send by the hundred every December. They are built from Irish producers, which is usually the point of sending one, and they go out with a printed card carrying your logo inside the lid rather than plastered across the outside.</p><p>Alcohol free options are available for lists where you cannot check first. For more than ten units, send us your numbers through the corporate gifting enquiry form and we will come back with a price, a lead time and what we need from you.</p>',
    },
    {
      path: '/wine',
      intro:
        'Discover over three hundred bottles in The Wine Vault, with something to suit every taste, occasion and budget. Filter by grape, country, wine style or budget, whether you are looking for a favourite, discovering something new, choosing for a special occasion or finding the right bottle to add to a gift.',
      seoBlock:
        '<p>We are a gifting business that takes wine seriously, which is an unusual combination and the reason this list looks the way it does. We buy directly from estates where we can. Everything else on the list is here because we drank it and wanted to sell it.</p><p>Grape, region and style are filters on this page rather than separate sections, so you can start from Malbec, or from Spain, or from "something full bodied under €25", and get to the same place. If you would rather start from the money, the three budget pages will do it faster.</p><p>Wine is alcohol, so we can only deliver to somebody over 18 and there are places we cannot ship to. The delivery page sets out exactly where.</p>',
      metaTitle: 'Wine and Champagne, chosen by us',
      metaDescription:
        'Over three hundred wines and Champagnes chosen by us. Filter by grape, country, style or budget.',
    },
    {
      path: '/wine/fine-wines',
      intro:
        'The part of the list we would put in front of somebody who knows what they are drinking. Growers rather than brands, a lot of it bought direct, and every bottle here is one we have opened ourselves.',
      seoBlock:
        '<p>Fine wine means something different in every shop that uses the phrase. Here it means the bottles we buy in small quantities from producers we deal with directly, plus the classics we keep because people ask for them by name. It is the widest part of our list and the part that changes most.</p><p>Use the filters. Grape, country and style are all filters on this page rather than separate sections, so you can start from Malbec, or from Italy, or from something full bodied under €40, and get to the same place. If you would rather we chose, the Wine Vault Club sends a case as often as you like.</p><p>Wine is alcohol, so we can only deliver it to somebody over 18 and there are addresses we cannot ship to at all.</p>',
      metaTitle: 'Fine wine, chosen by us',
      metaDescription:
        'The considered part of our list: growers rather than brands, much of it bought direct. Filter by grape, country, style or budget.',
    },
    {
      path: '/wine/gift-sets',
      intro:
        'Boxed sets of two or three bottles, ready to send as they are. No hamper, no packing, just wine in a carton that looks like it was meant to be given.',
      seoBlock:
        '<p>A gift set is the middle ground between sending one bottle, which can look thin, and sending a hamper, which is a bigger gesture and a bigger price. Most of these are two or three bottles from the same producer in a printed carton.</p><p>If you want the wine in a proper box with food alongside it, the wine hampers do that instead, and the hamper builder will let you put any bottle on this site into a box with whatever else you like.</p><p>Over 18 only. Somebody over 18 has to take the delivery in.</p>',
    },
    {
      path: '/wine-club',
      intro:
        'A case of wine, chosen by us from the list on this site, as often as you want it. You set the size, the budget per bottle and the style.',
      seoBlock:
        '<p>Everything about the club is built on the list we already sell. There is no separate subscription range bought in cheap: the bottles that turn up are the bottles on this site, chosen for you rather than by you.</p><p>You decide four things. How many bottles, roughly what per bottle, red or white or a mix, and how often it arrives. We do the rest, and every case comes with a card explaining each bottle and what to eat with it.</p><p>Pause, skip a case or cancel from your account, with no notice period. Over 18 only, and somebody over 18 has to take the delivery in.</p>',
      metaTitle: 'Wine subscription from Co. Meath',
      metaDescription:
        'A case of wine chosen by us, as often as you want it. Set the size, the budget per bottle and the style. Pause or cancel any time.',
    },
    // ------------------------------------------------------------------
    // Metadata-only entries.
    //
    // These listings had a bare registry title and no meta description at
    // all, so a search result for them read "Red wine | The Parcel
    // Concierge" with whatever sentence Google chose to scrape underneath.
    // Seventeen of the twenty-seven listings were in that state.
    //
    // They carry no intro and no seoBlock on purpose. Page copy is a
    // separate job and an invented paragraph about a range we have not
    // described is worse than none; the entries above show what a finished
    // one looks like. Adding an intro here is additive and changes nothing
    // else.
    //
    // Each description leads with what the page is, names the filters that
    // page actually offers, and ends on the delivery line that applies —
    // written to sit under 155 characters so it is not cut in the result.
    // ------------------------------------------------------------------
    {
      path: '/wine/red',
      metaTitle: 'Red wine, chosen by us',
      metaDescription:
        'Red wine from growers we buy from directly, with Malbec, Rioja, Bordeaux and Chianti among them. Filter by grape, country or budget. Over 18s only.',
    },
    {
      path: '/wine/white',
      metaTitle: 'White wine, chosen by us',
      metaDescription:
        'White wine from Sancerre and Chablis to Albariño and Chenin Blanc. Filter by grape, country or budget, and send any bottle in a hamper. Over 18s only.',
    },
    {
      path: '/wine/rose',
      metaTitle: 'Rosé wine',
      metaDescription:
        'Rosé from Provence and beyond, dry to fruity, chosen for drinking rather than for the bottle. Filter by country or budget. Over 18s only.',
    },
    {
      path: '/wine/champagne-sparkling',
      metaTitle: 'Champagne and sparkling wine',
      metaDescription:
        'Champagne, Prosecco, Cava and Crémant for celebrating, gifting or a Tuesday. Add a bottle to any hamper you build. Over 18s only.',
    },
    {
      path: '/wine/port-dessert',
      metaTitle: 'Port, sherry and dessert wine',
      metaDescription:
        'Port, sherry and dessert wine: the after-dinner end of the list, and one of the easiest gifts to get right. Over 18s only.',
    },
    {
      path: '/wine/liqueurs-cider',
      metaTitle: 'Liqueurs and cider',
      metaDescription:
        'Liqueurs for after dinner and Irish cider for the table, from the shop in Dunshaughlin. Add a bottle to any hamper you build. Over 18s only.',
    },
    {
      path: '/wine/organic-biodynamic',
      metaTitle: 'Organic and biodynamic wine',
      metaDescription:
        'Certified organic and biodynamic wine from growers working that way by conviction, not by marketing. Filter by grape, country or budget. Over 18s only.',
    },
    {
      path: '/wine/alcohol-free',
      metaTitle: 'Non alcoholic wine and drinks',
      // Shown only when the Shopify collection has no description of its own.
      intro:
        'Alcohol-free wine and sparkling worth putting on the table, for the driver, the pregnant guest and anyone off it this month.',
      metaDescription:
        'Alcohol free wine and sparkling worth putting on the table, for the driver, the pregnant guest and anyone off it this month. No age restriction.',
    },
    {
      path: '/wine/under-25',
      metaTitle: 'Wine under €25',
      metaDescription:
        'Every wine on our list under €25, the everyday end of the Wine Vault. Filter by grape, country or style. Free delivery over €100. Over 18s only.',
    },
    {
      path: '/wine/25-50',
      metaTitle: 'Wine from €25 to €50',
      metaDescription:
        'Wine between €25 and €50, the range most gift bottles come from. Filter by grape, country or style. Free delivery over €100. Over 18s only.',
    },
    {
      path: '/wine/50-plus',
      metaTitle: 'Wine over €50',
      metaDescription:
        'Wine over €50: the bottles we buy in small quantities and open ourselves before listing. Free delivery over €100. Over 18s only.',
    },

    // The occasions listings below are dark while their Shopify collections
    // are retired (September 2026) and are excluded from the sitemap, so
    // none of this is indexed today. It is written now because restoring a
    // collection turns the page back on within the hour, and a page that
    // returns without a description is a page nobody remembers to fix.
    {
      path: '/occasions/new-baby',
      metaTitle: 'New baby gifts and hampers',
      metaDescription:
        'New baby hampers and gifts, for the baby and for whoever did the work. Hand packed in Co. Meath, delivered anywhere in Ireland from €8.95.',
    },
    {
      path: '/occasions/sympathy',
      metaTitle: 'Sympathy gifts and hampers',
      metaDescription:
        'Sympathy hampers chosen to be useful rather than showy, with a handwritten card. Hand packed in Co. Meath and delivered anywhere in Ireland.',
    },
    {
      path: '/occasions/wedding-engagement',
      metaTitle: 'Wedding and engagement gifts',
      metaDescription:
        'Wedding and engagement gifts, from Champagne and glassware to a hamper you build yourself. Hand packed in Co. Meath, delivered across Ireland.',
    },
    {
      path: '/occasions/get-well',
      metaTitle: 'Get well gifts and hampers',
      metaDescription:
        'Get well hampers of things worth having when you are stuck at home. Hand packed in Co. Meath, delivered anywhere in Ireland from €8.95.',
    },
    {
      path: '/occasions/mothers-day',
      metaTitle: 'Mother’s Day gifts and hampers',
      metaDescription:
        'Mother’s Day hampers, wine and pamper gifts, hand packed in Co. Meath. Free local delivery, €8.95 anywhere else in Ireland and free over €100.',
    },
    {
      path: '/occasions/fathers-day',
      metaTitle: 'Father’s Day gifts and hampers',
      metaDescription:
        'Father’s Day hampers, wine, whiskey and Guinness gifts, hand packed in Co. Meath. Free local delivery and €8.95 anywhere else in Ireland.',
    },
    {
      path: '/occasions/valentines',
      metaTitle: 'Valentine’s gifts and hampers',
      metaDescription:
        'Valentine’s hampers, Champagne and chocolate, hand packed in Co. Meath with a handwritten card. Free local delivery, €8.95 across Ireland.',
    },
    {
      path: '/occasions/easter',
      metaTitle: 'Easter gifts and hampers',
      metaDescription:
        'Easter hampers and Irish chocolate, hand packed in Co. Meath. Free local delivery, €8.95 anywhere else in Ireland and free over €100.',
    },

    {
      path: '/wine/exclusive-to-us',
      intro:
        'Eight wines we import ourselves. No other retailer in Ireland lists them, which means nobody can price check the bottle you send and nobody else is sending the same one.',
      seoBlock:
        '<p>Importing directly is slow and it ties up money, so most retailers our size do not do it. We do it because it is the only way to sell something that is genuinely ours. These bottles come from estates we deal with directly, in quantities small enough that a larger importer would not bother.</p><p>The practical effect for a gift buyer is straightforward. The person opening the bottle cannot find it in a supermarket and cannot look up what you paid. The wine is good on its own terms, but the fact that it is only here is part of what you are sending.</p><p>Several of these appear in our wine hampers as well, if you would rather send the bottle with glassware and something to eat alongside it.</p>',
    },
    {
      path: '/wine/value-edit',
      intro:
        'Bottles where we checked our price against every other Irish retailer stocking the same wine, and came out at or below the cheapest. We only list a wine here when we hold the evidence.',
      seoBlock:
        '<p>We compared our list against the other Irish retailers stocking the same wines, bottle for bottle and vintage for vintage. On the matches we could verify, we were at or below the cheapest Irish price about seven times out of ten. This page is the part of that we can stand over.</p><p>A wine only appears here when we hold a dated, verified comparison for it, and it comes off the page when the comparison goes stale. We do not name other retailers or quote their prices, because prices move and a claim that was true last month is a problem this month.</p><p>Everything on this page is also in the main list, filtered and sorted the usual way.</p>',
    },
    {
      path: '/occasions/christmas',
      intro:
        'Christmas hampers and gifts. We are working on more Christmas hampers now and they will be ready to go from November, once all the Christmas stock has arrived. Everything on this page is ready to send today.',
      seoBlock:
        '<p>If you are buying for a list rather than a person, the corporate section has volume pricing and will take your address list in one go. If you are buying one box for one house, the budget bands are the fastest way in.</p><p>Christmas delivery dates are published on the delivery page as soon as An Post confirm them. Order ahead of the last posting date rather than on it, because the last week is the week things go wrong.</p>',
    },
  ],

  curated: [
    {
      path: '/wine/value-edit',
      // Only wines we hold a dated, verified price comparison for. No
      // comparison has been run against the real list yet, so the list is
      // empty and the route stays dark (the four-product floor redirects
      // it) until the evidence exists. Never fill this from memory.
      handles: [],
    },
    {
      // Curated while the full Christmas range lands: the trio is the one
      // hamper that names Christmas, and the rest are the boxes that suit
      // a December list. Swap in the Christmas collection as it arrives.
      path: '/occasions/christmas',
      handles: [
        'french-wine-port-christmas-trio',
        'large-basket',
        '2-1',
        'luxury-home-amp-indulgence-hamper',
        'all-ireland-food-hamper',
        'the-classic-gentleman-s-hamper',
        'taste-of-ireland-gluten-free-hamper',
        'because-you-re-amazing-hamper',
      ],
    },
    {
      path: '/occasions/mothers-day',
      handles: [
        'because-you-re-amazing-hamper',
        'bubbles-bliss-hamper',
        'the-rose-crystal-celebration-hamper',
        'bubbles-bliss-luxury-hamper',
        'the-perfect-duo',
        'chateau-minuty-rose-et-or',
      ],
    },
    {
      path: '/occasions/fathers-day',
      handles: [
        'the-classic-gentleman-s-hamper',
        'for-the-guinness-lover',
        '5-2',
        'all-ireland-food-hamper',
        'chateau-mont-redon-chateauneuf-du-pape',
        'dows-ruby-port',
      ],
    },
    {
      path: '/occasions/valentines',
      handles: [
        'the-rose-crystal-celebration-hamper',
        'the-perfect-duo',
        'bubbles-bliss-luxury-hamper',
        'because-you-re-amazing-hamper',
        'moet-chandon-rose-375ml',
        'veuve-clicquot-rose',
      ],
    },
    {
      path: '/occasions/easter',
      // The export's Easter range (eggs, chocolate) is builder-only stock
      // with no product URLs, so there is nothing honest to curate yet.
      // Empty keeps the route dark until the client picks a real line-up.
      handles: [],
    },
    {
      // Get well is a no-alcohol listing, so only the alcohol-free boxes
      // appear here.
      path: '/occasions/get-well',
      handles: [
        'luxury-home-amp-indulgence-hamper',
        'all-ireland-food-hamper',
        'taste-of-ireland-gluten-free-hamper',
        'for-the-guinness-lover',
      ],
    },
  ],

  /**
   * Maker copy.
   *
   * RULE, learned the hard way in September 2026: a maker description
   * states only what we can check. That means the products we actually
   * stock (the catalogue export is the source), which of our hampers they
   * appear in (the listing copy above is the source), and where the client
   * has confirmed they are based. It does NOT mean founding dates,
   * ownership, process, provenance or "the one people come back for".
   *
   * A first pass at these six carried invented founding years and a
   * popularity claim, on a page whose whole job is to say we know our
   * producers. If a fact is not in the catalogue, in the copy above or
   * confirmed by the client, leave it out and add it to the client list.
   */
  /**
   * Maker copy.
   *
   * RULE, learned the hard way in September 2026: a maker description
   * states only what we can check, and the descriptions below are the
   * client's own words, supplied in full. Do not embellish them, and do
   * not add founding dates, ownership, process or provenance we cannot
   * source. A first pass written here carried invented founding years and
   * a popularity claim, on the page whose whole job is to say we know our
   * producers.
   *
   * `county` is set only where the client has stated it. The pages leave
   * the line off rather than guessing.
   *
   * `flags` is the short "Irish made | Beautifully scented" line the
   * client writes under each one. Optional, and rendered as its own row.
   */
  makers: [
    {
      slug: 'the-handmade-soap-company',
      name: 'The Handmade Soap Company',
      county: 'Meath',
      body: '<p>We are delighted to stock The Handmade Soap Company, a beautiful Irish local brand creating natural products designed to make everyday moments feel a little more special.</p><p>From beautifully scented hand washes and lotions to gift sets, their products are made with care in Co. Meath and are a firm favourite at The Parcel Concierge.</p><p>Perfect as a thoughtful gift on their own, or as an addition to one of our bespoke hampers.</p>',
      flags: ['Irish made', 'Beautifully scented', 'Naturally luxurious'],
      productHandles: [],
    },
    {
      slug: 'filligans-of-donegal',
      name: 'Filligan\u2019s of Donegal',
      county: 'Donegal',
      body: '<p>We are delighted to have Filligan\u2019s of Donegal at The Parcel Concierge, a wonderful Irish brand that fits perfectly with our love of quality, locally produced products.</p><p>Based in Donegal, Filligan\u2019s creates a delicious range of chutneys, relishes, jams and preserves using carefully selected ingredients and traditional recipes. Their products are a lovely addition to our hampers and gift sets, bringing a true taste of Ireland to every gift.</p>',
      productHandles: [],
    },
    {
      slug: 'chocolate-garden-of-ireland',
      name: 'The Chocolate Garden of Ireland',
      body: '<p>No hamper or gift is complete without a little chocolate.</p><p>We are proud to feature treats from The Chocolate Garden of Ireland, an Irish family run business creating handmade gluten free chocolates and confectionery.</p><p>Their chocolates make a gorgeous addition to our gift hampers, adding the touch that makes a gift extra special.</p>',
      flags: ['Irish made', 'Deliciously indulgent', 'Perfect for gifting'],
      productHandles: [],
    },
    {
      slug: 'rathbornes-1488',
      name: 'Rathbornes 1488',
      body: '<p>We love adding a touch of luxury to our gifts, and Rathbornes 1488 candles do exactly that.</p><p>One of Ireland\u2019s most celebrated candle makers, Rathbornes has a wonderful heritage dating back centuries. Their beautifully presented candles and home fragrances combine sophisticated scents with timeless style.</p><p>A gorgeous gift by itself, or the finishing touch to one of our hampers.</p>',
      flags: ['Irish heritage', 'Beautiful fragrance', 'Timeless luxury'],
      productHandles: [],
    },
    {
      slug: 'tipperary-crystal',
      name: 'Tipperary Crystal',
      body: '<p>We are delighted to stock a selection from Tipperary Crystal, one of Ireland\u2019s best known giftware brands.</p><p>With beautiful pieces designed for gifting and the home, Tipperary Crystal is perfect for birthdays, celebrations, thank yous and those occasions when you want to give something a little extra special.</p><p>Beautifully presented and easy to gift, it is a lovely addition to our collection at The Parcel Concierge.</p>',
      flags: ['Beautiful Irish design', 'Elegant gifting', 'Made for special occasions'],
      productHandles: [],
    },
    {
      slug: 'mcnutt-of-donegal',
      name: 'McNutt of Donegal',
      county: 'Donegal',
      body: '<p>We are delighted to stock McNutt of Donegal, a family run Irish business creating beautiful woven pieces from their home on the rugged Donegal coast.</p><p>Known for their colours, textures and timeless designs, McNutt products combine traditional Irish craftsmanship with a contemporary feel.</p><p>Beautifully made and wonderfully giftable, they are a perfect choice when you are looking for something special with a true touch of Donegal.</p>',
      flags: ['Irish made', 'Donegal craftsmanship', 'Beautifully timeless'],
      productHandles: [],
    },
    {
      slug: 'kybalion',
      name: 'Kybalion Jewellery',
      body: '<p>We are delighted to have Kybalion Jewellery as part of our carefully selected jewellery collection at The Parcel Concierge.</p><p>With stylish pieces designed to add the finishing touch, Kybalion Jewellery makes a wonderful gift for birthdays, celebrations, thank yous, or simply as a little treat for yourself.</p><p>We love pieces that feel special while still being easy to wear every day, which makes Kybalion a beautiful addition to our gifting range.</p>',
      flags: ['Stylish', 'Beautifully giftable', 'Made to be treasured'],
      productHandles: [],
    },
    {
      slug: 'pestle-and-mortar',
      name: 'Pestle and Mortar',
      body: '<p>We are proud to stock Pestle and Mortar, an award winning Irish skincare brand known for its beautifully simple approach to skincare.</p><p>Combining high performance ingredients with elegant, uncomplicated formulations, their skincare products are designed to fit effortlessly into everyday routines.</p><p>Beautifully packaged and a pleasure to use, Pestle and Mortar products make a gorgeous gift on their own or an addition to one of our bespoke gift hampers.</p>',
      flags: ['Irish skincare', 'Simple luxury', 'Beautiful gifting'],
      productHandles: [],
    },
    {
      slug: 'butlers-chocolates',
      name: 'Butlers Chocolates',
      body: '<p>We are delighted to feature Butlers Chocolates, one of Ireland\u2019s best loved chocolate brands, in our gifting collection at The Parcel Concierge.</p><p>Beautifully presented and wonderfully indulgent, Butlers chocolates suit every occasion, from birthdays and celebrations to thank you gifts or simply a well deserved treat.</p><p>They are also a favourite addition to our bespoke hampers, adding the touch of chocolate luxury that makes a gift feel extra special.</p>',
      flags: ['Irish chocolate', 'Deliciously indulgent', 'Perfect for gifting'],
      productHandles: [],
    },
    {
      slug: 'julie-clarke',
      name: 'Julie Clarke Candles',
      body: '<p>We are delighted to stock the Julie Clarke candle collection at The Parcel Concierge.</p><p>With gorgeous fragrances and stylish presentation, these candles are perfect for creating a warm and welcoming atmosphere at home. From fresh and uplifting scents to rich and comforting fragrances, there is something to suit every taste.</p><p>Beautiful as a standalone present or added to one of our bespoke hampers, Julie Clarke candles bring fragrance and luxury to any gift.</p>',
      flags: ['Beautiful fragrance', 'Stylish gifting', 'A little everyday luxury'],
      productHandles: [],
    },
    {
      slug: 'la-bougie',
      name: 'La Bougie',
      body: '<p>We are proud to stock La Bougie, a luxury Irish fragrance brand known for its beautifully crafted candles and sophisticated scents.</p><p>Created in Ireland by perfumer Lucy Hagerty, La Bougie combines distinctive fragrances with elegant presentation, making each candle feel wonderfully luxurious.</p><p>Perfect for birthdays, housewarmings, thank you gifts or simply treating yourself, La Bougie is a beautiful addition to our carefully selected gifting collection.</p>',
      flags: ['Irish fragrance', 'Sophisticated scents', 'Luxurious gifting'],
      productHandles: [],
    },
  ],

  /**
   * PAUSED, September 2026: the client asked for the guides section to
   * come off the site for now and to come back to it later. The routes,
   * the nav and footer rows and the sitemap entries are gone, and
   * /guides and both article URLs redirect (data/redirects/redirects.csv).
   *
   * The copy stays here on purpose. Bringing the section back is
   * restoring src/app/(site)/guides, one NAV row, one FOOTER_LINKS row and
   * the sitemap entries, then dropping the three redirects. Nothing here
   * needs rewriting.
   */
  guides: [
    {
      slug: 'how-to-choose-a-hamper',
      title: 'How to choose a hamper',
      summary:
        'Start from the budget, not the category. A short guide to picking a hamper that lands, written by the people who pack them.',
      body: '<p>Most people start from a category and work towards a price, which is backwards. Start from what you want to spend, because that decides everything else, and work out from there.</p><h2>Under €75</h2><p>You are buying a gesture done properly. A bottle of rosé with chocolates, or a mug and a bar for the Guinness fan, boxed and tied so it lands like more than the sum of it.</p><h2>€75 to €125</h2><p>Room for a bottle with a name on it, a full Irish food spread or a pamper set. This is the band where a gift stops needing an apology.</p><h2>€125 to €200</h2><p>The box is built around one or two things worth talking about. Crystal, Italian wine with a board to serve on, a lambswool blanket.</p><h2>Over €200</h2><p>Champagne with the glasses to drink it from, and the biggest baskets we pack.</p><h2>Then check three things</h2><p>Does it contain alcohol, and can it? Are there allergies in the house? And when does it need to arrive? The last one catches more people than the other two put together, especially in December.</p>',
      publishedAt: '2026-08-01',
      updatedAt: '2026-08-01',
      productHandles: [],
      relatedPaths: ['/hampers/under-75', '/hampers/75-125', '/hampers/125-200'],
    },
    {
      slug: 'corporate-gifting-that-does-not-embarrass-anyone',
      title: 'Corporate gifting that does not embarrass anyone',
      summary:
        'What to send a client list, what to avoid, and the three things that go wrong every December.',
      body: '<p>We send a lot of these boxes and we see the same three problems every year.</p><h2>Alcohol on an unchecked list</h2><p>Sending wine to a list nobody has checked is a risk. Our alcohol free corporate boxes exist for exactly this, and they are not a lesser gift.</p><h2>Branding in the wrong place</h2><p>A logo across the outside of the box makes it look like swag. A printed card inside the lid makes it look like a gift from a person. We do the second.</p><h2>Leaving it until December</h2><p>Volume orders need five working days, and in the first two weeks of December that is a floor rather than a promise. Book the slot in October and confirm the address list in November.</p><h2>One more thing</h2><p>Send the address list as a spreadsheet with a column for each of name, address, eircode and phone. We will do the rest, and the phone number is the difference between a delivery and a redelivery.</p>',
      publishedAt: '2026-08-10',
      updatedAt: '2026-08-10',
      productHandles: [],
      relatedPaths: ['/corporate-gifting', '/hampers/corporate'],
    },
  ],

  pages: [
    {
      slug: 'about',
      title: 'About us',
      intro:
        'Welcome to The Parcel Concierge, proudly run by Ciaran and Karen McBride along with our amazing team in the heart of Dunshaughlin, Co. Meath.',
      body: '<p>Our passion for exceptional gifting and personal service drives our dedicated team, both in our welcoming bricks and mortar store at No 1 Supple House, Dunshaughlin, and online.</p><p>At The Parcel Concierge we specialise in crafting bespoke hampers tailored to your needs, for any occasion. Our offerings extend to an extensive selection of fine wines housed in our Wine Vault, so you can find the right pairing for your special moments.</p><p>We also have a great selection of homewares, skincare, food and a collection of handmade Irish jewellery that reflects quality craftsmanship and unique designs, making every piece a treasure.</p><p>We are proud members of Guaranteed Irish, supporting Irish businesses and our local community.</p><h2>Proudly Irish, delivered with care</h2><p>For deliveries within the A85 eircode area, your order is delivered personally by The Parcel Concierge team, giving it that extra bit of care from our door to yours.</p><p>For all deliveries outside the A85 area, we trust An Post to deliver your order safely and reliably throughout Ireland within two to three working days.</p><p>Whether it is a thoughtful gift, a beautiful hamper or something special just for you, every order is carefully prepared and beautifully presented before it leaves us. Join us in celebrating life’s moments with thoughtful gifts that leave a lasting impression.</p><p>Thank you for being part of our journey.</p>',
      updatedAt: '2026-09-02',
    },
    {
      slug: 'guaranteed-irish',
      title: 'Proud members of Guaranteed Irish',
      body: '<p>At The Parcel Concierge we are incredibly proud to be members of Guaranteed Irish, a symbol that represents businesses committed to supporting Ireland, its communities and its economy.</p><p>For us, being part of Guaranteed Irish reflects the values at the heart of our business: shopping Irish, supporting Irish suppliers and choosing quality products from businesses throughout Ireland wherever possible.</p><p>From beautiful Irish made chocolates, candles and skincare to artisan foods, jewellery and gifts, we are proud to showcase so many wonderful Irish brands both in store and throughout our bespoke hampers.</p><p>Being a Guaranteed Irish member is more than displaying a symbol. It represents our commitment to local business, Irish enterprise, sustainable employment and keeping communities thriving.</p><p>When you shop with The Parcel Concierge you are supporting an independent Irish business that, in turn, proudly supports many other Irish businesses.</p><p>Proudly Irish. Supporting local. Gifting with care.</p>',
      updatedAt: '2026-09-02',
    },
    {
      slug: 'legal-terms',
      title: 'Terms of service',
      intro:
        'The terms you agree to when you buy from us, including cancellations, returns and refunds.',
      body: '<p>These terms apply when you buy from theparcelconcierge.com. Please read them before you order. Nothing in them affects your statutory rights as a consumer under Irish and EU law.</p><h2>Who we are</h2><p>The Parcel Concierge, No 1, Supple House, Dunshaughlin, Co. Meath, A85 R684, Ireland. You can reach us at hello@theparcelconcierge.com or on (01) 801 9810.</p><h2>Placing an order</h2><p>Your order is an offer to buy. A contract is formed when we email you to confirm the order has been dispatched, not when you complete checkout. If we cannot fulfil an order we will contact you and refund you in full rather than substituting without asking.</p><p>We may refuse an order. The usual reasons are that an item is out of stock, that we cannot deliver to the address, or that we cannot satisfy ourselves about age verification on an order containing alcohol.</p><h2>Prices and payment</h2><p>Prices are in euro and include VAT where it applies. Delivery is charged separately and is shown before you pay. Payment is taken through Shopify’s hosted checkout: we never see or store your card details.</p><p>If a product is listed at the wrong price we will contact you before dispatch and you can confirm the order at the correct price or cancel it for a full refund.</p><h2>Alcohol and age verification</h2><p>You must be 18 or over to buy alcohol from us, and somebody 18 or over has to take the delivery in. We may ask for proof of age on delivery. An Post cannot leave anything containing alcohol with a neighbour or in a safe place, so an undelivered order goes back to the depot.</p><p>If we cannot complete an alcohol delivery for these reasons after reasonable attempts, we will contact you to arrange a redelivery or a refund of the goods.</p><h2>Delivery</h2><p>Free local delivery within the A85 eircode area, delivered by our own team. €8.95 elsewhere in the Republic of Ireland with An Post, free on orders over €100. From €40 to the United Kingdom, where delivery times may vary and additional customs requirements may apply. Full detail is on our delivery page.</p><p>Delivery timescales are estimates. Once an order is with An Post we cannot guarantee the day it arrives. Risk in the goods passes to you on delivery.</p><h2>Cancellations, returns and refunds</h2><p>Our <a href="/legal/returns">refund policy</a> sets out how to return an item, what cannot be returned, and how and when refunds are paid. We give you 30 days to request a return, which is longer than consumer law requires.</p><p>Nothing in that policy affects your statutory rights. If goods are faulty, damaged or not as described, those rights apply whatever the policy says.</p><h2>Gifts sent to somebody else</h2><p>We never put a price or an invoice in the box. Where an order is sent as a gift, our contract is with you as the buyer, so cancellations and refunds are handled with you rather than with the recipient.</p><h2>Products and availability</h2><p>Hamper contents change a little with what is available from our producers. Where we have to substitute an item we substitute something of equal or greater value and of a similar kind. If a substitution would materially change the hamper we contact you first.</p><p>Photographs are of the product as we pack it. Serving suggestions and props in a photograph are not included unless the contents list says so.</p><h2>Our liability</h2><p>We do not exclude or limit our liability for death or personal injury caused by our negligence, for fraud, or for anything else that cannot be excluded under Irish law. Otherwise our liability for any order is limited to the amount you paid for it.</p><h2>Complaints and disputes</h2><p>Contact us first and we will try to sort it out. If we cannot resolve it, you can use the European Commission’s online dispute resolution platform, or contact the Competition and Consumer Protection Commission.</p><h2>Governing law</h2><p>These terms are governed by the laws of Ireland and the courts of Ireland have jurisdiction. As a consumer you keep the protection of the mandatory rules of the country you live in.</p>',
      updatedAt: '2026-09-03',
    },
    {
      slug: 'legal-privacy',
      title: 'Privacy policy',
      intro:
        'What we collect, why we collect it, who we share it with and how long we keep it.',
      body: '<p>This policy explains what we do with your personal data when you shop with us, contact us, or receive a gift through our corporate gifting service.</p><h2>Who is responsible for your data</h2><p>The Parcel Concierge, No 1, Supple House, Dunshaughlin, Co. Meath, A85 R684, Ireland, is the data controller. For anything in this policy, email hello@theparcelconcierge.com or ring (01) 801 9810.</p><h2>What we collect and why</h2><h3>When you place an order</h3><p>Your name, email address, phone number, billing address and delivery address, and what you ordered. We need this to take payment, pack the order and get it to the right door. The legal basis is performance of our contract with you.</p><p>Your card details are handled by Shopify and its payment providers at checkout. We never see or store them.</p><h3>When you send a gift</h3><p>The recipient’s name, address and, where you give it, their phone number. An Post use the phone number on the day of delivery. The legal basis is our legitimate interest in delivering the gift you have bought.</p><h3>Corporate gifting</h3><p>When your employer or a company sends you a gift through one of our campaign links, you give your name, email address and delivery address directly to us. <strong>Those details are used for the delivery only and are not passed back to the company that sent the gift.</strong> They see that you have chosen a gift, not where you live.</p><h3>When you sign up to our newsletter</h3><p>Your email address, on the basis of your consent. Every email has an unsubscribe link and you can withdraw consent at any time.</p><h3>Age confirmation</h3><p>Confirming you are over 18 on an alcohol page sets a cookie in your browser recording that you confirmed. It records the confirmation, not your date of birth, and it stays on your device rather than coming to us.</p><h3>Analytics and advertising</h3><p>Where they are switched on, Google Analytics, Google Ads and the Meta pixel collect information about how the site is used. See our cookie policy for exactly what is set and how to stop it.</p><h2>Who we share it with</h2><ul><li><strong>Shopify</strong>, which runs our store, checkout and payment processing.</li><li><strong>An Post</strong>, for deliveries outside the A85 eircode area. Local deliveries are made by our own team.</li><li><strong>Google and Meta</strong>, where analytics and advertising tags are switched on.</li><li><strong>Our hosting and email providers</strong>, which process data on our instructions.</li></ul><p>We do not sell your personal data, and we do not share it for anyone else’s marketing.</p><h2>Sending data outside the EEA</h2><p>Some of these providers process data outside the European Economic Area. Where they do, the transfer relies on the European Commission’s standard contractual clauses or an adequacy decision.</p><h2>How long we keep it</h2><p>Order records are kept for as long as tax and accounting law requires, currently six years. Newsletter subscriptions are kept until you unsubscribe. Corporate gifting recipient details are kept no longer than fulfilling the campaign needs, and are then deleted.</p><h2>Your rights</h2><p>You can ask us for a copy of your data, to correct it, to delete it, to restrict or object to how we use it, or to have it sent to another provider. Where we rely on consent you can withdraw it at any time. Email hello@theparcelconcierge.com and we will respond within one month.</p><p>If you are not happy with how we have handled it, you can complain to the Data Protection Commission, 6 Pembroke Row, Dublin 2, D02 X963, or at dataprotection.ie.</p>',
      updatedAt: '2026-09-03',
    },
    {
      slug: 'legal-returns',
      title: 'Refund policy',
      intro:
        'How to return an item, what cannot be returned, and how refunds are paid.',
      body: '<p>We have a 30 day return policy, which means you have 30 days after receiving your item to request a return.</p><p>To be eligible for a return, your item must be in the same condition that you received it, unused and in its original packaging. You will also need the receipt or proof of purchase.</p><p>To start a return, contact us at hello@theparcelconcierge.com. Returns need to be sent to No 1, Supple House, Dunshaughlin, Co. Meath, A85 R684.</p><p>If your return is accepted, we will send you a return shipping label, along with instructions on how and where to send your package. Items sent back to us without first requesting a return will not be accepted.</p><p>You can always contact us with any return question at hello@theparcelconcierge.com.</p><h2>Damages and issues</h2><p>Please inspect your order when it arrives and contact us immediately if the item is defective or damaged, or if you receive the wrong item, so that we can evaluate the issue and make it right.</p><h2>Exceptions and non-returnable items</h2><p>Certain types of item cannot be returned, including perishable goods (such as food, flowers or plants), custom products (such as special orders or personalised items) and personal care goods (such as beauty products). We also do not accept returns for hazardous materials, flammable liquids or gases. Get in touch if you have questions or concerns about your specific item.</p><p>We cannot accept returns on sale items or gift cards.</p><h2>Exchanges</h2><p>The fastest way to get what you want is to return the item you have, and once the return is accepted, make a separate purchase for the new item.</p><h2>European Union 14 day cooling off period</h2><p>Notwithstanding the above, if the merchandise is being shipped into the European Union, you have the right to cancel or return your order within 14 days, for any reason and without a justification. As above, your item must be in the same condition that you received it, unused and in its original packaging. You will also need the receipt or proof of purchase.</p><h2>Refunds</h2><p>We will notify you once we have received and inspected your return, and let you know whether the refund was approved. If it is approved, you will be refunded automatically on your original payment method within 10 business days. Please remember that it can take some time for your bank or credit card company to process and post the refund too.</p><p>If more than 15 business days have passed since we approved your return, contact us at hello@theparcelconcierge.com.</p>',
      updatedAt: '2026-09-03',
    },
    {
      slug: 'legal-cookies',
      title: 'Cookies',
      intro:
        'The cookies this site actually sets, what each one does and how to control them.',
      body: '<p>A cookie is a small file a website stores in your browser. Some are needed to make a shop work at all, and some are there to measure how the site is used.</p><h2>Cookies we need to run the site</h2><p>These cannot be switched off without breaking the shop.</p><ul><li><strong>tpc_cart</strong>. Remembers what is in your basket between pages and visits. Expires after 30 days.</li><li><strong>Shopify checkout cookies</strong>. Set by Shopify when you go to checkout, to hold your session and process payment securely.</li></ul><h2>Analytics and advertising cookies</h2><p>Where these are switched on, they are set by Google and Meta rather than by us, and they can be used to build a profile of your browsing across sites.</p><ul><li><strong>Google Analytics</strong> (_ga, _ga_*). How many people visit, which pages they read, and how they found us.</li><li><strong>Google Ads</strong>. Measures whether an advert led to an order.</li><li><strong>Meta pixel</strong> (_fbp). The same, for Facebook and Instagram advertising.</li></ul><h2>How to control them</h2><p>Every browser lets you block or delete cookies in its settings, and you can usually do it per site. Blocking the essential ones will stop the basket working. You can opt out of Google Analytics across every site with Google’s browser add-on, and you can control advertising cookies in your Google and Meta account settings.</p><h2>Changes</h2><p>If we add or remove a cookie we update this page. It lists what the site actually sets rather than a generic list.</p>',
      updatedAt: '2026-09-03',
    },
  ],
}
