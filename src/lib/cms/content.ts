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
    slots: [
      {
        kind: 'hero',
        headline: 'Hampers, packed by hand in Meath',
        subhead:
          'We build every hamper ourselves from Irish producers we buy from directly. Free hand delivery locally, €7.95 anywhere else in Ireland.',
        ctaLabel: 'Shop all hampers',
        ctaHref: '/hampers',
        imageHandle: 'the-boyne-valley',
      },
      { kind: 'budget-bands' },
      {
        kind: 'featured-hampers',
        title: 'Hampers to start with',
        // Ordered so the hampers we have real photography for lead the row.
        handles: [
          'the-boyne-valley',
          'the-cook',
          'the-pamper-parcel',
          'the-toast',
          'the-ruby-anniversary',
          'the-big-thank-you',
          'the-new-arrival',
          'the-little-one',
        ],
      },
      {
        kind: 'hamper-builder',
        title: 'Build your own hamper',
        body: 'Pick the box, pick what goes in it, write the card. We pack it by hand and send it out the same way we send everything else.',
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
      {
        kind: 'wine-vault',
        title: 'The Wine Vault',
        body: 'Over three hundred wines, chosen by us. Buy a bottle, or let us send you a case as often as you like.',
        // Replaced with real handles from the catalogue. The exclusive
        // import flag is not in the Shopify export yet, so the homepage does
        // not claim the eight exclusives the June review found until
        // somebody marks them: see docs/build-status.md.
        handles: [
          'krug-grand-cuvee',
          'dom-perignon-champagne',
          'taylors-classic-vintage-port-2003',
          'billiecart-salmon-blanc-de-blancs-brut-champagne-grand-cru',
        ],
      },
      { kind: 'trustpilot' },
      {
        kind: 'corporate',
        title: 'Corporate gifting',
        body: 'Client and staff hampers with your branding on the card, sent to one address or two hundred. We handle the address list.',
      },
      {
        kind: 'makers',
        title: 'The people who make what is in the box',
        body: 'We buy directly from small Irish producers, most of them within an hour of us. We are members of Guaranteed Irish.',
        makerSlugs: ['kilbeg-dairy', 'the-handmade-soap-company', 'skelligs-chocolate'],
      },
      { kind: 'newsletter' },
    ],
  },

  listingCopy: [
    {
      path: '/hampers',
      intro:
        'Every hamper on this page is packed by hand in Dunshaughlin, from producers we buy from directly. Most of them are within an hour of us. Pick by budget, by occasion or by what is in the box, and we will write the card by hand before it goes out.',
      seoBlock:
        '<p>We have been building hampers in Co. Meath since we opened, and the range on this page is the part of the business we care most about. Each one starts with a producer rather than a theme. Kilbeg Dairy make cheddar three miles from our door. The Handmade Soap Company work out of Slane. Skelligs make their chocolate in Kerry and have done since 1996. We buy from all of them directly, which is why the boxes cost what they cost and why we can tell you where everything came from.</p><p>Hampers start at €55 and run past €300. If you are buying to a budget, the four bands above will get you there faster than scrolling. If you know the occasion but not the person, the occasion pages are a better starting point. And if nothing here is right, you can build your own box from scratch.</p><p>Free hand delivery in our local area, €7.95 anywhere else in Ireland, and we ship to the UK.</p>',
      metaTitle: 'Irish hampers, hand packed in Co. Meath',
      metaDescription:
        'Hampers built from Irish producers and packed by hand in Dunshaughlin. Shop by budget, occasion or contents. Free local hand delivery, €7.95 nationwide.',
    },
    {
      path: '/hampers/under-75',
      intro:
        'Hampers under €75, which is where most people start. Everything here is still hand packed and still built from Irish producers, and none of it looks like a budget gift when the lid comes off.',
      seoBlock:
        '<p>Under €75 is the band we sell most of, and it is the one we work hardest on. The temptation at this price is to pad a box out with filler. We would rather send four things worth having than eight things nobody wants, so the boxes in this band are smaller and better rather than bigger and thinner.</p><p>The Meath Larder at €65 is the one we send most often. It is cheese from Kilbeg Dairy, crackers from Sheridans and chutney from Killowen Farm in Wexford, and every item in it comes from a producer we buy from directly. The Full Irish at €72 does the same job for a breakfast. The New Arrival at €68 is our smallest new baby box.</p><p>All of them arrive tissue lined and hand tied, with your message written on a card inside the lid. Free hand delivery locally, €7.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/hampers/75-125',
      intro:
        'Hampers from €75 to €125. This is the band for a gift that has to carry a bit of weight: a proper thank you, a milestone birthday, a client you want to keep.',
      seoBlock:
        '<p>Between €75 and €125 a hamper stops being a nice gesture and starts being a real present. There is room in the box for something with a name on it, whether that is a bottle of gin from Meath, a candle poured in Ireland or a cheeseboard set that will still be in the house next year.</p><p>The Cocktail Box at €109 is the one people buy for a fortieth. The Pamper Parcel at €95 is built around The Handmade Soap Company range from Slane. The Boyne Valley at €78 is the box we send when somebody wants the valley we live in sent to somebody who does not live in it.</p><p>Every box in this band is packed by hand, tissue lined and hand tied with ribbon, with a card written by hand. Free hand delivery locally, €7.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/hampers/125-200',
      intro:
        'Hampers from €125 to €200. Bigger boxes, better bottles, and the glassware to go with them. This is the band for an anniversary, a wedding, or a client list where the names matter.',
      seoBlock:
        '<p>At this level the box is built around one or two things worth talking about, with everything else there to support them. The Whiskey Collector is a single pot still Irish whiskey with cut crystal tumblers either side of it. The Wine Lovers Case is six bottles chosen to be drunk across a season rather than opened in a week, in a wooden case with a sliding lid.</p><p>The Boardroom Hamper at €175 is our most ordered corporate box in December, and it goes out with a printed card carrying your branding. If you need more than ten of anything on this page, the corporate gifting pages have volume pricing and lead times.</p><p>Packed by hand, tissue lined, hand tied and sealed with wax. Free hand delivery locally, €7.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/hampers/luxury-200-plus',
      intro:
        'Hampers at €200 and over. Single cask whiskey, vintage Champagne, magnums and wooden cases. These are packed to order, so allow a couple of working days before they ship.',
      seoBlock:
        '<p>Above €200 we stop assembling and start sourcing. The Collector Reserve is a single cask Irish whiskey, which means one barrel, one bottling run and a number written on the label. The Fine Wine Cellar is six bottles, four of which no other Irish retailer stocks because we import them ourselves. The Anniversary Magnum is a magnum of Rioja Reserva from a bodega we buy direct from.</p><p>Boxes at this level are built rather than filled. Bottles are bedded in wood wool in a fitted case, the glassware sits either side, and the whole thing is sealed with wax. Each one carries a lead time on its page because we pack it after you order it, not before.</p><p>Free hand delivery locally, €7.95 anywhere else in Ireland, and we can deliver to a business address if that is easier.</p>',
    },
    {
      path: '/hampers/wine',
      intro:
        'Wine hampers, from a single bottle with glassware up to a six bottle wooden case. Every wine in them is one we list in the Wine Vault, so you can read the tasting note before you buy.',
      seoBlock:
        '<p>A wine hamper is only as good as the wine in it, which is why ours are built out of the same list we sell bottle by bottle rather than from whatever was cheap that month. Several of the bottles are exclusive imports, so the person receiving one cannot price check it against a supermarket shelf.</p><p>The Toast is a grower Champagne with two crystal flutes. The Celebration Crate is Prosecco, white and red with enough food that nobody has to cook. The Wine Lovers Case is six bottles and a card explaining which is for the Tuesday and which is for the Sunday.</p><p>All of these contain alcohol, so we can only deliver them to somebody over 18. Free hand delivery locally, €7.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/hampers/food',
      intro:
        'Food hampers built from Irish producers, most of them within an hour of Dunshaughlin. Cheese, breakfast, store cupboard and the full Christmas box.',
      seoBlock:
        '<p>Our food hampers start from a producer rather than a theme. Kilbeg Dairy make their cheddar three miles from us. Sheridans have been selling cheese in Meath since 1995. Ballymakenny Farm grow and fry their own crisps in Louth. Achill Island Sea Salt is dried in a shed on the Atlantic coast. We buy from all of them directly.</p><p>That means the boxes change a little with what is available, and it means we can tell you exactly where everything came from. Every hamper lists its full contents and its allergens on the product page, because a food gift where the allergens are a mystery is not much of a gift.</p><p>Free hand delivery locally, €7.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/hampers/whiskey',
      intro:
        'Irish whiskey hampers, from a two bottle tasting box up to a single cask reserve with a decanter. Glassware included in all of them.',
      seoBlock:
        '<p>Whiskey is the easiest gift to get slightly wrong. Buy the well known bottle and it looks like you did not think about it. Buy something obscure and it might not get drunk. Our whiskey boxes solve that by putting the glassware and the tasting notes in with the bottle, so whoever opens it knows what they have.</p><p>The Dram Duo puts a bourbon cask and a sherry finish side by side to taste against each other. The Whiskey Collector is a single pot still bottled at cask strength. The Collector Reserve is a single cask, numbered by hand, and when the cask is gone we cannot get it again.</p><p>These contain alcohol, so we can only deliver them to somebody over 18. Free hand delivery locally, €7.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/hampers/pamper',
      intro:
        'Pamper hampers built around The Handmade Soap Company range from Slane, ten minutes up the road from us, with candles poured in Ireland.',
      seoBlock:
        '<p>Most pamper hampers are full of things nobody uses. Ours are built around products we would buy anyway: The Handmade Soap Company make everything in small batches in Slane without synthetic fragrance, and the candles are poured in Ireland in soy wax and burn for about forty hours.</p><p>The Candlelight Box at €62 is the smallest of them. The Pamper Parcel at €95 is the one we send most. The Spa At Home at €120 adds a linen robe and body oil for a birthday that needs more than a card.</p><p>Every box lists its ingredients on the product page. If the person receiving it has sensitive skin, the pages say so. Free hand delivery locally, €7.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/hampers/sympathy',
      intro:
        'Sympathy hampers, sent plain. No branding on the outer wrap, food that does not need cooking, and a card we write by hand.',
      seoBlock:
        '<p>These boxes have one job, which is to be useful in a house where nobody is thinking about food. Everything in them can be eaten without cooking, and there is enough in the larger ones to feed whoever calls in, which is usually the practical problem in the days after a funeral.</p><p>We send them in unbranded packaging. There is no logo on the outer wrap and no marketing insert. The card is written by hand, and if you tell us what to write we will write exactly that.</p><p>If you need one delivered quickly, ring us rather than ordering online and we will tell you honestly what we can do. Free hand delivery locally, €7.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/hampers/new-baby',
      intro:
        'New baby hampers with something in them for the parents as well. Merino blankets, cotton sleepsuits, and coffee that does not need a machine.',
      seoBlock:
        '<p>Every other new baby gift forgets the two people who have not slept. Ours do not. The blankets are Irish merino and wash well, which matters more than it sounds at three in the morning, and there is coffee and something to eat in the larger boxes.</p><p>The Little One at €55 is for when you are one of several people sending something. The New Arrival at €68 is our standard box. The New Parents Box at €88 is aimed squarely at the adults, with one thing in it for the baby so it still counts.</p><p>The keepsake boxes get kept, which is the point of them. Free hand delivery locally, €7.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/hampers/corporate',
      intro:
        'Corporate hampers with your branding on the card inside the lid. Alcohol free options, volume pricing over ten units, and we handle the address list.',
      seoBlock:
        '<p>These are the boxes we send by the hundred every December. They are built from Irish producers, which is usually the point of sending one, and they go out with a printed card carrying your logo inside the lid rather than plastered across the outside.</p><p>The Client Hamper is alcohol free so it can go to everybody on the list without checking first. The Boardroom Hamper adds a bottle of red. The Executive Case is three bottles from estates we import directly, so nobody can price check it in a supermarket.</p><p>For more than ten units, the corporate gifting pages carry volume pricing, branding options and lead times, and there is a bulk order form that takes your address list and deadline in one go.</p>',
    },
    {
      path: '/wine',
      intro:
        'The Wine Vault. Over three hundred bottles, chosen by us, from weeknight reds to Champagne and Irish whiskey. Filter by grape, country, style or budget.',
      seoBlock:
        '<p>We are a gifting business that takes wine seriously, which is an unusual combination and the reason this list looks the way it does. We buy directly from estates where we can. Everything else on the list is here because we drank it and wanted to sell it.</p><p>Grape, region and style are filters on this page rather than separate sections, so you can start from Malbec, or from Spain, or from "something full bodied under €25", and get to the same place. If you would rather start from the money, the three budget pages will do it faster.</p><p>Wine is alcohol, so we can only deliver to somebody over 18 and there are places we cannot ship to. The delivery page sets out exactly where.</p>',
      metaTitle: 'The Wine Vault: fine wine and Irish spirits',
      metaDescription:
        'Over three hundred wines, Champagnes and Irish spirits chosen by us. Filter by grape, country, style or budget.',
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
      path: '/wine/organic-biodynamic',
      intro:
        'Wines made without synthetic chemicals in the vineyard, and in the biodynamic case to a calendar most of us do not pretend to understand. We list them together because people who want one usually want the other.',
      seoBlock:
        '<p>Organic certification covers what goes on the vines. Biodynamic goes further and treats the vineyard as one system, with a planting and picking calendar to match. Both take more work than farming conventionally, which is why these bottles are rarely the cheapest thing on a shelf.</p><p>We do not stock them because they are organic. We stock them because the growers who bother tend to be the growers who care about everything else too, and it shows in the glass. Avondale in South Africa is the clearest example on this page.</p><p>Over 18 only, and we may ask for proof on delivery.</p>',
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
      metaTitle: 'The Wine Vault Club, a wine subscription from Co. Meath',
      metaDescription:
        'A case of wine chosen by us, as often as you want it. Set the size, the budget per bottle and the style. Pause or cancel any time.',
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
      path: '/wine/irish-whiskey',
      intro:
        'Irish whiskey from distilleries small enough that somebody signs the label. Single pot still, single cask, and a coffee liqueur made twenty minutes from us.',
      seoBlock:
        '<p>Irish whiskey has got very good and very crowded at the same time. We list the bottles we would drink, mostly from distilleries working at a scale where the stillman knows the batch, and we say what each one actually tastes like rather than repeating the label.</p><p>Single pot still is the style that is particular to Ireland: malted and unmalted barley in the same mash, which gives you that thick, oily texture. Single cask means one barrel and one bottling run, so the bottle is numbered and cannot be repeated.</p><p>If it is a gift, the whiskey hampers put the glassware and the tasting notes in the box with the bottle. Over 18 only.</p>',
    },
    {
      path: '/gifts-by-budget/under-50',
      intro:
        'Everything we sell under €50, hampers and bottles together. This is the page for a Kris Kringle, a thank you, or a gift where the budget was set by somebody else.',
      seoBlock:
        '<p>Buying to a ceiling is the most common way people shop for a gift and the hardest thing to do on most websites. This page exists so you can start from the number rather than working backwards from a category.</p><p>Under €50 gets you a full hamper, a good bottle of wine, or a candle and chocolate combination that looks like more than it cost. The Little One at €55 is just over the line if you can stretch. The Thank You Box at €58 is not far behind it.</p><p>Sorted from the top of the band down, so the most you can get for the money is first. Free hand delivery locally, €7.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/gifts-by-budget/50-100',
      intro:
        'Gifts from €50 to €100, hampers and bottles together. The widest band we have and the one most people land in.',
      seoBlock:
        '<p>This is the band where a gift stops needing an apology. Around €50 you are into a full food hamper from Irish producers. Around €80 you are into a pamper box or a whiskey and chocolate pairing. Around €100 you are into a cocktail box with the glassware included.</p><p>Because it covers so much, the filters on this page earn their keep. Narrow by occasion if you know what it is for, or by recipient if you know who it is for, and the list gets manageable quickly.</p><p>Everything here is hand packed and hand tied, with a card written by hand. Free hand delivery locally, €7.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/gifts-by-budget/100-150',
      intro:
        'Gifts from €100 to €150. Bigger hampers, better bottles, and the glassware to go with them.',
      seoBlock:
        '<p>At this level you are buying something with a name on it. A single pot still whiskey with cut crystal tumblers. A wooden crate with Prosecco, a white and a red in it. A pamper box with a linen robe. The box is built around one thing worth talking about rather than lots of things worth nothing.</p><p>This is also where our corporate range starts, so if you are buying more than ten of anything on this page it is worth looking at the corporate gifting section first for volume pricing.</p><p>Free hand delivery locally, €7.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/gifts-by-budget/150-plus',
      intro:
        'Gifts at €150 and over. Magnums, vintage Champagne, single cask whiskey and six bottle wooden cases. Most of these are packed to order.',
      seoBlock:
        '<p>Above €150 we source rather than assemble, and several of the boxes carry a lead time because we pack them after you order. That is deliberate. A magnum bedded in wood wool in a fitted case is not something that sits on a shelf waiting.</p><p>Four of the six bottles in The Fine Wine Cellar are exclusive imports. The Collector Reserve is a numbered single cask bottling. The Anniversary Magnum is a magnum of Rioja Reserva that will keep for years if they want to put it away.</p><p>Sorted from the bottom of the band up. Free hand delivery locally, €7.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/gifts-for/her',
      intro:
        'Gifts for her, across hampers, wine and the pamper range. Filter by occasion or budget to narrow it down.',
      seoBlock:
        '<p>This page is a starting point rather than an answer. What is actually on it is the part of our range that people most often buy for a woman: the pamper boxes built around The Handmade Soap Company in Slane, the lighter wines, and the food hampers that lean sweet rather than savoury.</p><p>If you know the occasion, the occasion pages will get you there faster. If you know the budget, the budget pages will. And if you know the person well enough to know what they actually like, build the box yourself and put exactly that in it.</p><p>Free hand delivery locally, €7.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/gifts-for/him',
      intro:
        'Gifts for him, across whiskey, wine and the food hampers. Filter by occasion or budget to narrow it down.',
      seoBlock:
        '<p>Mostly whiskey, mostly red wine, and the food hampers that lean savoury. That is an honest description of what people buy from this page rather than a claim about what men like.</p><p>The whiskey boxes are the strongest thing we do in this part of the range, because they put the glassware and the tasting notes in with the bottle. The Cook is the one to look at for somebody who actually cooks.</p><p>If you know the occasion or the budget, those pages will narrow it faster than this one. Free hand delivery locally, €7.95 anywhere else in Ireland.</p>',
    },
    {
      path: '/gifts-for/clients',
      intro:
        'Client gifts, from a single box to a list of two hundred. Alcohol free options, branding on the card, and volume pricing over ten units.',
      seoBlock:
        '<p>A client gift has to do two things: look like it cost something, and not create a problem. Ours are built from Irish producers, which handles the first, and the alcohol free options handle the second, because sending wine to a list you have not checked is a risk nobody needs.</p><p>Branding goes on a printed card inside the lid rather than across the outside of the box, which is what most people actually want. For more than ten units, the corporate gifting pages carry volume pricing and lead times, and the bulk order form takes your address list and your deadline in one go.</p><p>We can deliver to individual home addresses or to one office. Tell us which on the form.</p>',
    },
    {
      path: '/occasions/christmas',
      intro:
        'Christmas hampers and gifts. Order early: December cut-offs are tighter than people expect, and the larger boxes are packed to order.',
      seoBlock:
        '<p>Christmas is most of our year, and the boxes we build for it are the ones we put the most work into. The Grand Christmas Hamper has fourteen things in it, nearly all Irish, and the cake in it is made in Meath in October so it has time to mature before it ships.</p><p>If you are buying for a list rather than a person, the corporate section has volume pricing and will take your address list in one go. If you are buying one box for one house, the budget bands are the fastest way in.</p><p>Christmas delivery cut-offs are published on the delivery page as soon as An Post and our couriers confirm them. Order ahead of the cut-off rather than on it, because the last week is the week things go wrong.</p>',
    },
    {
      path: '/gifts',
      intro:
        'Small things to add to a hamper. Candles, chocolate, crystal and boards. These are here to finish a gift rather than to be the gift.',
      seoBlock:
        '<p>This is a deliberately small section. It exists because people building a hamper often want one more thing in the box, not because we are trying to be a general gift shop. Everything here is something we already put in our own hampers, sold separately.</p><p>The candles and diffusers are poured in Ireland. The chocolate is from Skelligs in Kerry and Bean and Goose in Wexford. The crystal is the same glassware that goes in our whiskey and wine boxes.</p><p>Add any of it at the cart, or build a hamper from scratch and put it in there.</p>',
    },
  ],

  curated: [
    {
      path: '/wine/value-edit',
      // Only wines we hold a dated, verified price comparison for.
      handles: [
        'bodegas-aldea-rioja-reserva',
        'quinta-do-ribeiro-douro-tinto',
        'graham-estate-late-bottled-vintage-port',
        'maison-vireau-champagne-brut',
        'ca-del-ponte-prosecco-superiore',
      ],
    },
    {
      path: '/occasions/mothers-day',
      handles: [
        'the-pamper-parcel',
        'the-spa-at-home',
        'the-candlelight-box',
        'chateau-lansac-rose',
        'the-quiet-evening',
        'pazo-de-mino-albarino',
      ],
    },
    {
      path: '/occasions/fathers-day',
      handles: [
        'the-whiskey-collector',
        'the-dram-duo',
        'whiskey-and-chocolate',
        'the-cook',
        'slane-bridge-single-pot-still-irish-whiskey',
        'tara-hill-small-batch-gin',
      ],
    },
    {
      path: '/occasions/valentines',
      handles: [
        'the-toast',
        'the-celebration-crate',
        'the-spa-at-home',
        'maison-vireau-champagne-brut',
        'the-candlelight-box',
        'bean-and-goose-praline-selection',
      ],
    },
    {
      path: '/occasions/easter',
      handles: [
        'the-full-irish',
        'the-boyne-valley',
        'skelligs-sea-salt-chocolate-bar',
        'bean-and-goose-praline-selection',
        'the-meath-larder',
        'handmade-shortbread-tin',
      ],
    },
    {
      path: '/occasions/get-well',
      handles: [
        'thinking-of-you',
        'the-comfort-box',
        'the-quiet-evening',
        'the-candlelight-box',
        'handmade-shortbread-tin',
        'wild-gorse-soy-candle',
      ],
    },
  ],

  makers: [
    {
      slug: 'kilbeg-dairy',
      name: 'Kilbeg Dairy',
      county: 'Meath',
      body: '<p>Kilbeg make farmhouse cheddar three miles from our door, from the milk of their own herd. They have been at it since 2015 and they still make it in batches small enough that the wheels are turned by hand.</p><p>Their cheddar is in most of our food hampers. It is the thing people write to us about afterwards.</p>',
      productHandles: ['the-meath-larder', 'the-boyne-valley', 'the-big-thank-you'],
    },
    {
      slug: 'the-handmade-soap-company',
      name: 'The Handmade Soap Company',
      county: 'Meath',
      body: '<p>Based in Slane, ten minutes up the road. They make everything in small batches without synthetic fragrance or parabens, and they were doing it long before it was a selling point.</p><p>Their bath salts, hand cream and body oil are the base of every pamper box we build.</p>',
      productHandles: ['the-pamper-parcel', 'the-spa-at-home'],
    },
    {
      slug: 'skelligs-chocolate',
      name: 'Skelligs Chocolate',
      county: 'Kerry',
      body: '<p>Skelligs have been making chocolate on the Ring of Kerry road since 1996, in a factory you can walk into and watch. It is about as far from Dunshaughlin as you can get and still be in Ireland, and it is worth the drive.</p><p>Their sea salt bar is in most of our boxes because it stands up next to a heavy whiskey, which is not true of most chocolate.</p>',
      productHandles: ['the-whiskey-collector', 'skelligs-sea-salt-chocolate-bar', 'the-quiet-evening'],
    },
    {
      slug: 'bean-and-goose',
      name: 'Bean and Goose',
      county: 'Wexford',
      body: '<p>Two sisters making chocolate in a Wexford forest, which sounds like marketing and is not. They work in small batches with Irish ingredients and they change the range with the season.</p><p>Their praline selection goes into our celebration and anniversary boxes.</p>',
      productHandles: ['bean-and-goose-praline-selection', 'the-boyne-valley', 'the-toast'],
    },
  ],

  guides: [
    {
      slug: 'how-to-choose-a-hamper',
      title: 'How to choose a hamper',
      summary:
        'Start from the budget, not the category. A short guide to picking a hamper that lands, written by the people who pack them.',
      body: '<p>Most people start from a category and work towards a price, which is backwards. Start from what you want to spend, because that decides everything else, and work out from there.</p><h2>Under €75</h2><p>You are buying four or five good things rather than ten average ones. A cheese board set, a breakfast box, a small pamper box. Do not expect a bottle of wine in this band unless it is a small box built around one.</p><h2>€75 to €125</h2><p>Room for a bottle with a name on it, or for glassware. This is the band where a gift stops needing an apology.</p><h2>€125 to €200</h2><p>The box is built around one or two things worth talking about. Cut crystal, a six bottle case, a single pot still whiskey.</p><h2>Over €200</h2><p>Sourced rather than assembled, usually packed to order, usually with a lead time. Magnums, vintage Champagne, single cask whiskey.</p><h2>Then check three things</h2><p>Does it contain alcohol, and can it? Are there allergies in the house? And when does it need to arrive? The last one catches more people than the other two put together, especially in December.</p>',
      publishedAt: '2026-08-01',
      updatedAt: '2026-08-01',
      productHandles: ['the-meath-larder', 'the-cocktail-box', 'the-whiskey-collector', 'the-fine-wine-cellar'],
      relatedPaths: ['/gifts-by-budget/under-50', '/hampers/under-75', '/hampers/125-200'],
    },
    {
      slug: 'what-to-send-after-a-bereavement',
      title: 'What to send after a bereavement',
      summary:
        'Practical notes on sending food to a house in the days after a death, from a business that packs a lot of these boxes.',
      body: '<p>People ask us this more than anything else, and the answer is less about the box than about the timing and the wrapping.</p><h2>Send food that needs no cooking</h2><p>Nobody in that house is cooking. Bread, cheese, soup in a jar, biscuits, tea. Something that feeds whoever calls in without anybody having to think about it.</p><h2>Send it plain</h2><p>We send sympathy boxes in unbranded packaging with no logo on the outer wrap and no marketing insert. A box that arrives looking like a promotion is worse than no box.</p><h2>Write something short</h2><p>We write the card by hand, and if you tell us exactly what to write we will write exactly that. Short is better than clever.</p><h2>The second week matters more</h2><p>The house is full for a few days and then it empties. A box that arrives ten days later often lands better than one that arrives with everybody else.</p>',
      publishedAt: '2026-08-05',
      updatedAt: '2026-08-05',
      productHandles: ['with-sympathy', 'thinking-of-you', 'the-comfort-box', 'the-quiet-comfort'],
      relatedPaths: ['/hampers/sympathy', '/occasions/sympathy'],
    },
    {
      slug: 'corporate-gifting-that-does-not-embarrass-anyone',
      title: 'Corporate gifting that does not embarrass anyone',
      summary:
        'What to send a client list, what to avoid, and the three things that go wrong every December.',
      body: '<p>We send a lot of these boxes and we see the same three problems every year.</p><h2>Alcohol on an unchecked list</h2><p>Sending wine to a list nobody has checked is a risk. Our alcohol free corporate boxes exist for exactly this, and they are not a lesser gift.</p><h2>Branding in the wrong place</h2><p>A logo across the outside of the box makes it look like swag. A printed card inside the lid makes it look like a gift from a person. We do the second.</p><h2>Leaving it until December</h2><p>Volume orders need five working days, and in the first two weeks of December that is a floor rather than a promise. Book the slot in October and confirm the address list in November.</p><h2>One more thing</h2><p>Send the address list as a spreadsheet with a column for each of name, address, eircode and phone. We will do the rest, and the phone number is the difference between a delivery and a redelivery.</p>',
      publishedAt: '2026-08-10',
      updatedAt: '2026-08-10',
      productHandles: ['the-client-hamper', 'the-boardroom-hamper', 'the-team-treat', 'the-executive-case'],
      relatedPaths: ['/corporate-gifting', '/hampers/corporate', '/gifts-for/clients'],
    },
  ],

  pages: [
    {
      slug: 'about',
      title: 'About us',
      intro:
        'We are Karen and Ciaran McBride. We run The Parcel Concierge from Dunshaughlin in Co. Meath, and we pack every hamper ourselves.',
      body: '<p>We started because we could not find a hamper we actually wanted to send. The ones in the shops were full of things nobody eats, wrapped in cellophane, from producers nobody could name. We thought we could do better by buying from small Irish producers directly and packing the boxes by hand.</p><p>That is still how it works. Most of what goes in our boxes comes from within an hour of us. Kilbeg Dairy make their cheddar three miles away. The Handmade Soap Company are in Slane. We drive to a lot of these places ourselves.</p><p>We are members of Guaranteed Irish. We hand deliver locally, which means one of us gets in the van, and we send everything else by courier at €7.95 anywhere in Ireland.</p>',
      updatedAt: '2026-08-01',
    },
    {
      slug: 'guaranteed-irish',
      title: 'Guaranteed Irish',
      body: '<p>We are members of Guaranteed Irish, which means we have been assessed on where we are based, who we employ and where we buy from.</p><p>In practice it means most of what is in our boxes was made in Ireland by a small producer we deal with directly, and the boxes themselves are packed here rather than drop shipped from somewhere else. Where something in a hamper is not Irish, and some of the wine is not, the product page says where it is from.</p>',
      updatedAt: '2026-08-01',
    },
  ],
}
