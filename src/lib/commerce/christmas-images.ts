import type { ListingHeroContent } from '@/components/listing/ListingHero'
import type { ProductCard, ProductImage } from './types'

/**
 * Christmas photography, shown on the Christmas listing only.
 *
 * One hamper, one Shopify product, one stock level. What changes is the
 * photograph: /occasions/christmas shows the hamper dressed for Christmas,
 * and every other page (the homepage, the hampers hub, the price bands,
 * search, the product page) shows the product's own Shopify image. That is
 * the client's ask, September 2026, and it is why this is an override on
 * the card rather than a second product or a swapped Shopify image.
 *
 * Keyed by Shopify product handle. A hamper with no entry keeps its own
 * image on the Christmas listing too, so a missing photograph shows the
 * real product rather than nothing.
 *
 * To retire the whole treatment in January, stop calling
 * withChristmasImages (see ListingPage) — or empty this map. Nothing else
 * reads it.
 *
 * ---------------------------------------------------------------------
 * THESE ARE GENERATED IMAGES, NOT PHOTOGRAPHS OF THE REAL HAMPERS.
 *
 * They were supplied as AI renders of each hamper restyled for Christmas.
 * Three things follow from that, and they are the client's to weigh:
 *
 *   1. Some show contents the hamper does not contain. Flagged per entry
 *      below with CONTENTS DIFFER.
 *   2. Third-party brand packaging is reproduced approximately. Several
 *      carry misspelt brand text at full size ("Luxury Biscuiis" on the
 *      Grand Indulgence; the wine and truffle labels on the Classic
 *      Gentleman's).
 *   3. A product image that misrepresents what is supplied is a misleading
 *      commercial practice under the Consumer Protection Act 2007.
 *
 * The mechanism here is sound whatever the source. Replacing a render with
 * a real photograph is dropping a file in public/photography/christmas/
 * under the same name. See docs/collections-and-tags.md.
 * ---------------------------------------------------------------------
 */
export type ChristmasImage = { src: string; alt: string }

/**
 * The listings that show the Christmas photography. Just the one today.
 * The hampers hub and the homepage are deliberately not in here: the
 * client wants the everyday photograph on those.
 */
export const CHRISTMAS_IMAGE_PATHS: ReadonlySet<string> = new Set(['/occasions/christmas'])

/**
 * The Christmas listing's full-bleed hero.
 *
 * /occasions/christmas is a landing page people arrive on from a
 * newsletter or an ad, not a page they browse into, so it gets the
 * homepage treatment rather than a line of type over cream. The headline
 * and the intro still come from the listing registry and the CMS: only
 * the photograph, the eyebrow and the buttons live here.
 *
 * Keyed by path so adding one to another seasonal listing is a row, and
 * so the January retirement is deleting this object.
 */
export const LISTING_HEROES: Readonly<Record<string, ListingHeroContent>> = {
  '/occasions/christmas': {
    image: {
      src: '/photography/christmas/hero.webp',
      alt: 'An Irish food hamper dressed for Christmas on a wooden table, holding Keogh’s crisps, Blanco Niño tortilla chips, a Ballymaloe relish set, coffee bags and Chocolate Garden chocolates, with pine, holly and gold ribbon around it',
    },
    eyebrow: 'Christmas 2026',
    cta: { label: 'Shop Christmas hampers', href: '#grid' },
    secondary: { label: 'Corporate Christmas gifting', href: '/corporate-gifting' },
  },
}

export const CHRISTMAS_IMAGES: Readonly<Record<string, ChristmasImage>> = {
  'large-basket': {
    src: '/photography/christmas/large-basket.webp',
    alt: 'The Grand Indulgence wicker hamper dressed for Christmas, Butlers chocolates and Hassetts biscuits on the lid, ringed by red and white wine, Champagne, candles and preserves',
  },
  '2-1': {
    src: '/photography/christmas/2-1.webp',
    alt: 'A Taste of Luxury wicker hamper dressed for Christmas, with red and white wine, Prosecco, biscuits, a Ballymaloe relish set and a La Bougie candle',
  },
  'all-ireland-food-hamper': {
    src: '/photography/christmas/all-ireland-food-hamper.webp',
    alt: 'The All Ireland Food Hamper dressed for Christmas, holding McEntee’s tea, Keogh’s crisps, coffee bags, Butlers chocolates, McDaid’s minerals and Filligan’s preserves',
  },
  'taste-of-ireland-gluten-free-hamper': {
    src: '/photography/christmas/taste-of-ireland-gluten-free-hamper.webp',
    alt: 'The Taste of Ireland Gluten Free Hamper dressed for Christmas, holding Keogh’s crisps, Blanco Niño tortilla chips, sodabread toasts, Hadji Bey jellies, a Ballymaloe relish set and Chocolate Garden chocolates',
  },
  'because-you-re-amazing-hamper': {
    src: '/photography/christmas/because-you-re-amazing-hamper.webp',
    alt: 'The Because You’re Amazing Hamper dressed for Christmas, with a Herb Dublin candle trio, a bottle of Prosecco and a Handmade Soap Company set',
  },
  'for-the-guinness-lover': {
    src: '/photography/christmas/for-the-guinness-lover.webp',
    alt: 'For the Guinness Lover dressed for Christmas, with Guinness chocolates, caramel fudge, an enamel mug, coffee bags and mini pint chocolates',
  },
  'the-classic-gentleman-s-hamper': {
    src: '/photography/christmas/the-classic-gentleman-s-hamper.webp',
    alt: 'The Classic Gentleman’s Hamper dressed for Christmas, a McNutt of Donegal scarf in its tube beside a bottle of Nero d’Avola and Guinness chocolate truffles',
  },
  'the-rose-crystal-celebration-hamper': {
    src: '/photography/christmas/the-rose-crystal-celebration-hamper.webp',
    alt: 'The Rosé and Crystal Celebration Hamper dressed for Christmas, with sparkling rosé, boxed Champagne flutes, Turkish delight and elderflower liqueur',
  },
  'luxury-home-amp-indulgence-hamper': {
    src: '/photography/christmas/luxury-home-amp-indulgence-hamper.webp',
    alt: 'The Luxury Home and Indulgence Hamper dressed for Christmas, a fluted crystal vase flanked by a La Bougie Pomelo candle and diffuser and a box of chocolates',
  },
  'french-wine-port-christmas-trio': {
    src: '/photography/christmas/french-wine-port-christmas-trio.webp',
    alt: 'The French Wine and Port Christmas Trio dressed for Christmas, three bottles in a navy Parcel Concierge gift box',
  },
  'new-baby-celebration': {
    src: '/photography/christmas/new-baby-celebration.webp',
    alt: 'The New Baby Celebration hamper dressed for Christmas, a plush bunny and a rolled blanket beside a congratulations chocolate bar and a bottle of sparkling wine',
  },
  'bubbles-bliss-luxury-hamper': {
    src: '/photography/christmas/bubbles-bliss-luxury-hamper.webp',
    alt: 'The Bubbles and Bliss Luxury Hamper dressed for Christmas, two small bottles of Moët and Chandon Champagne either side of a Jo Browne body oil gift set',
  },
  '5-2': {
    src: '/photography/christmas/5-2.webp',
    alt: 'The Italian Job dressed for Christmas, Doppio Passo red and Messer del Fauno white beside Sheridans crackers, a Filligan’s jar, a Chocolate Garden of Ireland box and a walnut board with slate',
  },
  // Square rather than 4:3, so the card crops the top and bottom of the
  // frame. The box is centred, which is why that is fine here.
  'new-home-luxury-hamper': {
    src: '/photography/christmas/new-home-luxury-hamper.webp',
    alt: 'The New Home Luxury Hamper dressed for Christmas, a bottle of Henriot Champagne beside a Rathbornes candle, a framed ogham print and a boxed pair of Galway Crystal Champagne flutes',
  },

  // CONTENTS DIFFER from the hamper as sold. Kept so the client can see
  // them in place and decide; each needs either a real photograph or the
  // entry removing before it is put in front of shoppers.

  // Shows two Jo Browne bottles. The hamper is two bottles of Prosecco
  // either side of the Jo Browne set.
  'bubbles-bliss-hamper': {
    src: '/photography/christmas/bubbles-bliss-hamper.webp',
    alt: 'The Bubbles and Bliss Hamper dressed for Christmas, a Jo Browne body oil gift set flanked by two bottles',
  },
  // Shows a plush octopus, a rosé called Excellens and a Pestle and Mortar
  // sheet mask. The hamper is a teddy cushion blanket, Moët rosé, Butlers
  // truffles and a Jo Browne set. Which of the two pink hampers this was
  // meant to be is also unconfirmed.
  'new-mum-and-baby-girl-luxury-hamper': {
    src: '/photography/christmas/new-mum-and-baby-girl-luxury-hamper.webp',
    alt: 'The New Mum and Baby Girl Luxury Hamper dressed for Christmas, a pink plush toy beside a bottle of rosé and a box of chocolate truffles',
  },
  // Shows a Bog Buddies bunny, an elephant photo frame and a sparkling
  // Riesling. Hello Baby Boy is a blue bedtime bear, Freixenet Prosecco,
  // Julie Clarke hand wash and lotion and a lambswool blanket.
  '3': {
    src: '/photography/christmas/3.webp',
    alt: 'The Hello Baby Boy hamper dressed for Christmas, a soft toy and a photo frame beside a bottle of sparkling wine',
  },
}

/**
 * The same cards with their Christmas photograph in place of the Shopify
 * one, where we hold a Christmas photograph. Everything else about the
 * card, including its price, stock and link, is untouched.
 */
/**
 * The product gallery with the Christmas photograph leading it.
 *
 * Somebody who clicks a card on the Christmas listing expects to land on
 * the hamper they just looked at, so the product page opens on the same
 * photograph. The everyday shots follow it, none are dropped, and a
 * hamper we hold no Christmas photograph for is untouched.
 *
 * This is the one place the treatment reaches outside the Christmas
 * listing, because a product page is not a "general section": it is
 * wherever the shopper came from.
 */
export function withChristmasGallery(handle: string, images: readonly ProductImage[]): ProductImage[] {
  const festive = CHRISTMAS_IMAGES[handle]
  if (!festive) return [...images]
  return [
    { url: festive.src, alt: festive.alt, width: 1400, height: 1050 },
    ...images.filter((image) => image.url !== festive.src),
  ]
}

export function withChristmasImages(cards: readonly ProductCard[]): ProductCard[] {
  return cards.map((card) => {
    const festive = CHRISTMAS_IMAGES[card.handle]
    if (!festive) return card
    return {
      ...card,
      image: {
        url: festive.src,
        alt: festive.alt,
        // The renders are 4:3; the cards crop to their own aspect anyway.
        width: 1400,
        height: 1050,
      },
    }
  })
}
