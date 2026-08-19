/**
 * Generates data/catalogue/fixtures.json.
 *
 * This is FIXTURE DATA. It exists so the front end is runnable and
 * reviewable before Shopify Admin API access lands (outstanding item 8) and
 * before the new hamper photography arrives (outstanding item 2). It is not
 * the client's catalogue and must never be ingested into a live store.
 *
 * It is generated rather than hand-written so the set stays consistent with
 * the locked tag taxonomy and the price bands, and so regenerating after a
 * taxonomy change is one command.
 *
 * Every description here follows the house style in docs/copy-style-guide.md
 * and is checked against the banned-word list by scripts/copy/check-style.ts,
 * so the fixtures double as a working test of the copy rules.
 *
 * Run: node --experimental-strip-types scripts/fixtures/generate-catalogue.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type {
  Catalogue,
  CatalogueHamperFields,
  CatalogueProduct,
  CatalogueWineFields,
} from '../../src/lib/catalogue/schema.ts'

const OUT = join(process.cwd(), 'data/catalogue/fixtures.json')

const PLACEHOLDER = (kind: string, n: number) => ({
  src: `/placeholder/${kind}-${n}.png`,
  width: 1200,
  height: 1500,
})

function slug(title: string): string {
  return (
    title
      .normalize('NFD')
      // Strip combining accents so "Miño" becomes "mino" rather than
      // "mi-o". A handle is a URL we have to live with for years.
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  )
}

/** Ireland-wide makers used across the fixture hampers. */
const MAKERS = [
  { name: 'Boyne Valley Farmhouse', county: 'Meath' },
  { name: 'Sheridans Cheesemongers', county: 'Meath' },
  { name: 'Kilbeg Dairy', county: 'Meath' },
  { name: 'Wildwood Vinegars', county: 'Sligo' },
  { name: 'Skelligs Chocolate', county: 'Kerry' },
  { name: 'Ballymakenny Farm', county: 'Louth' },
  { name: 'Achill Island Sea Salt', county: 'Mayo' },
  { name: 'Bean and Goose', county: 'Wexford' },
  { name: 'Killowen Farm', county: 'Wexford' },
  { name: 'The Handmade Soap Company', county: 'Meath' },
] as const

const RIBBON_COLOURS = ['Forest green', 'Gold', 'Cream', 'Wine red']

function personalisation(withCard: boolean): CatalogueHamperFields['personalisation'] {
  const options: CatalogueHamperFields['personalisation'] = [
    { kind: 'gift-message', label: 'Gift message', maxLength: 250 },
    { kind: 'ribbon-colour', label: 'Ribbon colour', choices: RIBBON_COLOURS },
  ]
  if (withCard) options.push({ kind: 'branded-card', label: 'Add a branded card' })
  return options
}

type HamperSeed = {
  title: string
  price: number
  productType: string
  occasions: string[]
  recipients: string[]
  badges?: string[]
  alcohol: boolean
  opening: string
  story: string
  packaging: string
  contents: { name: string; producer?: string; size?: string }[]
  allergens: string
  leadTime?: string
}

/**
 * Description assembly follows the hamper template in brief section 7:
 * opening line, the story, then presentation. "What's inside", allergens,
 * personalisation and delivery are rendered from metafields on the page, not
 * repeated in prose.
 */
function hamperDescription(seed: HamperSeed): string {
  return [
    `<p>${seed.opening}</p>`,
    `<p>${seed.story}</p>`,
    `<p>${seed.packaging}</p>`,
  ].join('\n')
}

function hamper(seed: HamperSeed): CatalogueProduct {
  const handle = slug(seed.title)
  const tags = [
    'type:hamper',
    ...seed.occasions,
    ...seed.recipients,
    ...(seed.badges ?? []),
    priceTag(seed.price),
  ]
  const hamperFields: CatalogueHamperFields = {
    contents: seed.contents,
    producers: [...new Set(seed.contents.map((c) => c.producer).filter(Boolean))] as string[],
    allergens: seed.allergens,
    containsAlcohol: seed.alcohol,
    packaging: seed.packaging,
    personalisation: personalisation(seed.occasions.includes('occasion:corporate')),
    dimensionsWeight: '38cm x 28cm x 22cm, 4.5kg',
    ...(seed.leadTime ? { leadTime: seed.leadTime } : {}),
    occasionTags: seed.occasions,
    recipientTags: seed.recipients,
  }

  return {
    handle,
    title: seed.title,
    descriptionHtml: hamperDescription(seed),
    productType: seed.productType,
    vendor: 'The Parcel Concierge',
    tags,
    images: [
      { ...PLACEHOLDER('hamper', 1), alt: `${seed.title} styled on a linen cloth with the lid open` },
      { ...PLACEHOLDER('hamper', 2), alt: `Everything inside ${seed.title} laid out flat` },
      { ...PLACEHOLDER('hamper', 3), alt: `${seed.title} boxed and hand tied with ribbon` },
      { ...PLACEHOLDER('hamper', 4), alt: `${seed.title} held in two hands to show its size` },
    ],
    variants: [
      {
        sku: `TPC-HMP-${handle.toUpperCase().replace(/-/g, '')}`,
        title: 'Default Title',
        price: seed.price.toFixed(2),
        inventoryQuantity: 12,
      },
    ],
    hamper: hamperFields,
  }
}

function priceTag(price: number): string {
  if (price < 50) return 'price:under-50'
  if (price < 100) return 'price:50-100'
  if (price < 150) return 'price:100-150'
  return 'price:150-plus'
}

const CONTENTS = {
  cheese: [
    { name: 'Kilbeg Farmhouse Cheddar', producer: 'Kilbeg Dairy', size: '200g' },
    { name: 'Sheridans Brown Bread Crackers', producer: 'Sheridans Cheesemongers', size: '160g' },
    { name: 'Killowen Farm Apple and Onion Chutney', producer: 'Killowen Farm', size: '190g' },
    { name: 'Achill Island Sea Salt', producer: 'Achill Island Sea Salt', size: '100g' },
  ],
  breakfast: [
    { name: 'Boyne Valley Farmhouse Granola', producer: 'Boyne Valley Farmhouse', size: '400g' },
    { name: 'Killowen Farm Raspberry Preserve', producer: 'Killowen Farm', size: '220g' },
    { name: 'Roasted coffee, whole bean', size: '250g' },
    { name: 'Irish honey', size: '340g' },
  ],
  sweet: [
    { name: 'Skelligs Chocolate sea salt bar', producer: 'Skelligs Chocolate', size: '90g' },
    { name: 'Bean and Goose praline selection', producer: 'Bean and Goose', size: '110g' },
    { name: 'Handmade shortbread', size: '200g' },
  ],
  pamper: [
    { name: 'The Handmade Soap Company bath salts', producer: 'The Handmade Soap Company', size: '400g' },
    { name: 'Lavender and rosemary hand cream', producer: 'The Handmade Soap Company', size: '75ml' },
    { name: 'Soy wax candle, wild gorse', size: '200g' },
    { name: 'Waffle cotton face cloth' },
  ],
  baby: [
    { name: 'Merino wool baby blanket', size: '70cm x 90cm' },
    { name: 'Cotton sleepsuit', size: '0 to 3 months' },
    { name: 'Wooden rattle' },
    { name: 'Card and keepsake box' },
  ],
} as const

const HAMPERS: HamperSeed[] = [
  {
    title: 'The Meath Larder',
    price: 65,
    productType: 'Food hamper',
    occasions: ['occasion:thank-you', 'occasion:birthday'],
    recipients: ['recipient:family'],
    badges: ['badge:irish-made', 'badge:guaranteed-irish'],
    alcohol: false,
    opening: 'A food hamper built entirely from producers within an hour of our door in Dunshaughlin.',
    story:
      'Kilbeg Dairy make their cheddar three miles from us. Sheridans have been selling cheese in Meath since 1995. Killowen Farm in Wexford make the chutney in small batches from their own apples. We buy from all of them directly, and we pack the boxes ourselves.',
    packaging:
      'Everything arrives in a deep kraft box, wrapped in tissue and hand tied with ribbon, with your message written on a card inside the lid.',
    contents: [...CONTENTS.cheese],
    allergens: 'Contains milk, gluten (wheat), sulphites. Packed in a kitchen that handles nuts.',
  },
  {
    title: 'The Full Irish',
    price: 72,
    productType: 'Food hamper',
    occasions: ['occasion:thank-you', 'occasion:birthday', 'occasion:christmas'],
    recipients: ['recipient:family', 'recipient:couple'],
    badges: ['badge:irish-made'],
    alcohol: false,
    opening: 'Breakfast for two, for the weekend after the one they have just had.',
    story:
      'Boyne Valley Farmhouse toast their granola in small trays a few miles up the road. The preserve comes from Killowen Farm in Wexford, the honey from hives in the midlands, and the coffee is roasted to order the week it ships.',
    packaging: 'Packed in a shallow kraft box so the whole breakfast is visible the moment the lid comes off.',
    contents: [...CONTENTS.breakfast],
    allergens: 'Contains gluten (oats, wheat), nuts. May contain traces of milk.',
  },
  {
    title: 'Just Add Cheese',
    price: 70,
    productType: 'Food hamper',
    occasions: ['occasion:thank-you', 'occasion:christmas'],
    recipients: ['recipient:couple', 'recipient:family'],
    alcohol: false,
    opening: 'Everything that goes beside a cheeseboard, so all they need to buy is the cheese.',
    story:
      'Crackers from Sheridans, chutney from Killowen Farm, sea salt harvested off Achill Island, and a jar of honey to go with a blue. We put this one together because it is the box people ask us for at Christmas and never find anywhere else.',
    packaging: 'A flat kraft box, tissue lined, tied with ribbon, with a card written by hand.',
    contents: [CONTENTS.cheese[1]!, CONTENTS.cheese[2]!, CONTENTS.cheese[3]!, { name: 'Irish honey', size: '340g' }],
    allergens: 'Contains gluten (wheat), sulphites.',
  },
  {
    title: 'The Cook',
    price: 89,
    productType: 'Food hamper',
    occasions: ['occasion:birthday', 'occasion:thank-you', 'occasion:wedding'],
    recipients: ['recipient:her', 'recipient:him'],
    badges: ['badge:irish-made'],
    alcohol: false,
    opening: 'For the person in the house who actually cooks.',
    story:
      'Wildwood in Sligo make their vinegars from foraged fruit. Achill Island Sea Salt is dried in a shed on the Atlantic coast. The rest is store cupboard work: good oil, good mustard, and a pepper mill that will outlast the hamper.',
    packaging: 'Packed upright in a deep box so the bottles travel safely, wrapped in tissue and hand tied.',
    contents: [
      { name: 'Wildwood blackberry vinegar', producer: 'Wildwood Vinegars', size: '250ml' },
      { name: 'Cold pressed rapeseed oil', size: '500ml' },
      { name: 'Achill Island Sea Salt', producer: 'Achill Island Sea Salt', size: '100g' },
      { name: 'Wholegrain mustard', size: '200g' },
      { name: 'Beech pepper mill' },
    ],
    allergens: 'Contains mustard, sulphites.',
  },
  {
    title: 'The Boyne Valley',
    price: 78,
    productType: 'Food hamper',
    occasions: ['occasion:thank-you', 'occasion:christmas', 'occasion:corporate'],
    recipients: ['recipient:family', 'recipient:client'],
    badges: ['badge:guaranteed-irish', 'badge:hand-delivered'],
    alcohol: false,
    opening: 'A box of the valley we live in, sent to somebody who does not.',
    story:
      'Everything here is made within the Boyne Valley or a short drive from it. Boyne Valley Farmhouse granola, Kilbeg cheddar, Ballymakenny Farm crisps from Louth, and chocolate from Bean and Goose in Wexford because it is worth the detour.',
    packaging: 'A deep kraft box, tissue lined, hand tied with ribbon and finished with a wax seal.',
    contents: [
      CONTENTS.breakfast[0]!,
      CONTENTS.cheese[0]!,
      { name: 'Ballymakenny Farm hand cooked crisps', producer: 'Ballymakenny Farm', size: '125g' },
      CONTENTS.sweet[1]!,
    ],
    allergens: 'Contains milk, gluten (oats), nuts, soya.',
  },
  {
    title: 'The Cocktail Box',
    price: 109,
    productType: 'Wine hamper',
    occasions: ['occasion:birthday', 'occasion:christmas', 'occasion:thank-you'],
    recipients: ['recipient:couple', 'recipient:him', 'recipient:her'],
    alcohol: true,
    opening: 'A gin, the mixers, the glassware and the bits that usually get forgotten.',
    story:
      'The gin is Irish and small batch. The tonic is the one that does not flatten a good gin. We added the peeler and the ice tray because a cocktail kit without them is a bottle in a box.',
    packaging: 'Bottles packed upright in a fitted deep box, everything else nested around them in tissue.',
    contents: [
      { name: 'Small batch Irish gin', size: '70cl' },
      { name: 'Indian tonic water, 4 pack', size: '4 x 200ml' },
      { name: 'Pair of highball glasses' },
      { name: 'Citrus peeler and ice tray' },
    ],
    allergens: 'Contains sulphites. Contains alcohol.',
  },
  {
    title: 'The Pamper Parcel',
    price: 95,
    productType: 'Pamper hamper',
    occasions: ['occasion:birthday', 'occasion:thank-you'],
    recipients: ['recipient:her'],
    badges: ['badge:irish-made'],
    alcohol: false,
    opening: 'A quiet evening in a box, for somebody who has not had one in a while.',
    story:
      'The Handmade Soap Company work out of Slane, ten minutes from us, and make everything in small batches without synthetic fragrance. The candle is poured in Ireland and burns for around forty hours.',
    packaging: 'Packed in a lidded kraft box on a bed of tissue, hand tied, with your message on a card inside.',
    contents: [...CONTENTS.pamper],
    allergens: 'Contains limonene, linalool. Not suitable for sensitive skin without a patch test.',
  },
  {
    title: 'The Quiet Evening',
    price: 78,
    productType: 'Pamper hamper',
    occasions: ['occasion:thank-you', 'occasion:birthday'],
    recipients: ['recipient:her', 'recipient:him'],
    alcohol: false,
    opening: 'A smaller pamper box, built around one very good candle.',
    story:
      'Poured in Ireland in soy wax, scented with wild gorse and sea air. Everything else in the box is there to go with it: tea, chocolate, and a face cloth that feels like a hotel.',
    packaging: 'A shallow lidded box, tissue lined and hand tied with ribbon.',
    contents: [
      CONTENTS.pamper[2]!,
      CONTENTS.pamper[3]!,
      CONTENTS.sweet[0]!,
      { name: 'Loose leaf tea', size: '100g' },
    ],
    allergens: 'Contains milk, soya. May contain nuts.',
  },
  {
    title: 'The Spa At Home',
    price: 120,
    productType: 'Pamper hamper',
    occasions: ['occasion:birthday', 'occasion:anniversary'],
    recipients: ['recipient:her'],
    badges: ['badge:irish-made'],
    alcohol: false,
    opening: 'The full pamper box, for a birthday that deserves more than a card.',
    story:
      'Built around The Handmade Soap Company range from Slane, with a linen robe, a candle and enough in it to last past the first bath.',
    packaging: 'A deep lidded box, tissue lined, hand tied with ribbon and finished with a wax seal.',
    contents: [
      ...CONTENTS.pamper,
      { name: 'Linen robe', size: 'One size' },
      { name: 'Body oil', producer: 'The Handmade Soap Company', size: '100ml' },
    ],
    allergens: 'Contains limonene, linalool.',
  },
  {
    title: 'The Candlelight Box',
    price: 62,
    productType: 'Pamper hamper',
    occasions: ['occasion:thank-you'],
    recipients: ['recipient:her', 'recipient:family'],
    alcohol: false,
    opening: 'Two candles, chocolate and tea. A small box that lands well.',
    story:
      'The candles are poured in Ireland in soy wax and burn cleanly. Skelligs make their chocolate in Kerry, on the Ring of Kerry road, and have done since 1996.',
    packaging: 'A shallow kraft box, tissue lined and hand tied.',
    contents: [
      { name: 'Soy wax candle, wild gorse', size: '200g' },
      { name: 'Soy wax travel candle, sea air', size: '90g' },
      CONTENTS.sweet[0]!,
      { name: 'Loose leaf tea', size: '100g' },
    ],
    allergens: 'Contains milk, soya. May contain nuts.',
  },
  {
    title: 'The Whiskey Collector',
    price: 145,
    productType: 'Whiskey hamper',
    occasions: ['occasion:christmas', 'occasion:birthday', 'occasion:anniversary'],
    recipients: ['recipient:him', 'recipient:client'],
    alcohol: true,
    opening: 'A single pot still whiskey, two glasses, and the things that go with a slow drink.',
    story:
      'The whiskey is Irish, aged in bourbon and sherry casks, and bottled at cask strength by a distillery small enough that the label is signed. Skelligs chocolate from Kerry is in the box because it holds up next to a heavy whiskey.',
    packaging: 'The bottle sits upright in a fitted deep box with the glasses either side, tissue wrapped and hand tied.',
    contents: [
      { name: 'Single pot still Irish whiskey', size: '70cl' },
      { name: 'Pair of cut crystal tumblers' },
      CONTENTS.sweet[0]!,
      { name: 'Whiskey stones, set of six' },
    ],
    allergens: 'Contains milk, soya. Contains alcohol. May contain nuts.',
  },
  {
    title: 'The Dram Duo',
    price: 95,
    productType: 'Whiskey hamper',
    occasions: ['occasion:birthday', 'occasion:thank-you'],
    recipients: ['recipient:him', 'recipient:couple'],
    alcohol: true,
    opening: 'Two Irish whiskies side by side, to taste against each other.',
    story:
      'One aged in bourbon casks, one finished in sherry, both from distilleries working at a scale where the stillman knows the batch. The tasting card in the box explains what to look for without turning it into homework.',
    packaging: 'Both bottles packed upright in a fitted box with the glasses between them, hand tied with ribbon.',
    contents: [
      { name: 'Irish whiskey, bourbon cask', size: '50cl' },
      { name: 'Irish whiskey, sherry finish', size: '50cl' },
      { name: 'Pair of tasting glasses' },
      { name: 'Tasting notes card' },
    ],
    allergens: 'Contains sulphites. Contains alcohol.',
  },
  {
    title: 'Whiskey And Chocolate',
    price: 82,
    productType: 'Whiskey hamper',
    occasions: ['occasion:thank-you', 'occasion:christmas'],
    recipients: ['recipient:him', 'recipient:her'],
    alcohol: true,
    opening: 'One good bottle and enough chocolate to make an evening of it.',
    story:
      'Skelligs make their chocolate in Kerry and Bean and Goose make theirs in Wexford. Both go with a sherry cask whiskey better than anything else we have tried in the shop.',
    packaging: 'A deep box with the bottle upright and the chocolate laid flat beside it, tissue wrapped.',
    contents: [
      { name: 'Irish whiskey, sherry finish', size: '70cl' },
      CONTENTS.sweet[0]!,
      CONTENTS.sweet[1]!,
    ],
    allergens: 'Contains milk, soya, nuts. Contains alcohol.',
  },
  {
    title: 'The Collector Reserve',
    price: 320,
    productType: 'Whiskey hamper',
    occasions: ['occasion:anniversary', 'occasion:corporate', 'occasion:christmas'],
    recipients: ['recipient:him', 'recipient:client'],
    alcohol: true,
    leadTime: 'Three working days, as this one is packed to order.',
    opening: 'A single cask Irish whiskey, bottled from one cask and numbered.',
    story:
      'Single cask means one barrel, one bottling run, and a bottle number on the label. When it is gone we cannot get it again. The glassware is cut crystal and the box is built for it.',
    packaging: 'A fitted presentation box with the bottle bedded in wood wool, glasses either side, sealed with wax.',
    contents: [
      { name: 'Single cask Irish whiskey, numbered bottle', size: '70cl' },
      { name: 'Pair of cut crystal tumblers' },
      { name: 'Crystal decanter' },
      CONTENTS.sweet[0]!,
    ],
    allergens: 'Contains milk, soya. Contains alcohol. May contain nuts.',
  },
  {
    title: 'The New Arrival',
    price: 68,
    productType: 'Food hamper',
    occasions: ['occasion:new-baby'],
    recipients: ['recipient:family'],
    badges: ['badge:irish-made'],
    alcohol: false,
    opening: 'For the new baby, and for the two people who have not slept.',
    story:
      'The blanket is Irish merino and washes well, which matters more than it sounds. We added coffee and something to eat because every other new baby gift forgets the parents entirely.',
    packaging: 'A lidded keepsake box, tissue lined, hand tied with ribbon, the kind that gets kept.',
    contents: [...CONTENTS.baby],
    allergens: 'No food included. Wool blanket, not suitable for unsupervised sleep.',
  },
  {
    title: 'The Little One',
    price: 55,
    productType: 'Food hamper',
    occasions: ['occasion:new-baby'],
    recipients: ['recipient:family'],
    alcohol: false,
    opening: 'A smaller new baby box, for when you are one of several people sending something.',
    story:
      'A cotton sleepsuit, a wooden rattle and a card. Simple, well made, and useful in the first month rather than the first year.',
    packaging: 'A shallow keepsake box, tissue lined and hand tied with ribbon.',
    contents: [CONTENTS.baby[1]!, CONTENTS.baby[2]!, CONTENTS.baby[3]!],
    allergens: 'No food included.',
  },
  {
    title: 'The New Parents Box',
    price: 88,
    productType: 'Food hamper',
    occasions: ['occasion:new-baby', 'occasion:thank-you'],
    recipients: ['recipient:family', 'recipient:couple'],
    alcohol: false,
    opening: 'Aimed squarely at the parents, with one thing in it for the baby.',
    story:
      'Coffee that does not need a machine, food that can be eaten with one hand, and a merino blanket so the box still counts as a baby gift. Boyne Valley Farmhouse granola and Skelligs chocolate do most of the work.',
    packaging: 'A deep kraft box, tissue lined, hand tied with ribbon.',
    contents: [
      CONTENTS.baby[0]!,
      CONTENTS.breakfast[2]!,
      CONTENTS.breakfast[0]!,
      CONTENTS.sweet[0]!,
    ],
    allergens: 'Contains milk, gluten (oats), nuts, soya.',
  },
  {
    title: 'The Nursery Gift',
    price: 72,
    productType: 'Food hamper',
    occasions: ['occasion:new-baby'],
    recipients: ['recipient:family'],
    alcohol: false,
    opening: 'A new baby box built around things that stay in the room afterwards.',
    story:
      'A merino blanket, a wooden rattle, a keepsake box and a candle for the parents. Nothing in it goes out of date or gets outgrown in six weeks.',
    packaging: 'A lidded keepsake box, tissue lined and hand tied with ribbon.',
    contents: [
      CONTENTS.baby[0]!,
      CONTENTS.baby[2]!,
      CONTENTS.baby[3]!,
      { name: 'Soy wax candle, wild gorse', size: '200g' },
    ],
    allergens: 'No food included.',
  },
  {
    title: 'With Sympathy',
    price: 85,
    productType: 'Food hamper',
    occasions: ['occasion:sympathy'],
    recipients: ['recipient:family'],
    alcohol: false,
    opening: 'Something to send when there is nothing useful to say.',
    story:
      'Tea, good bread, soup and something sweet. It is food that does not need cooking, sent to a house where nobody is cooking. We write the card by hand and we do not put our branding on the outside of the box.',
    packaging: 'A plain deep box, tissue lined, tied with cream ribbon. No logo on the outer wrap.',
    contents: [
      { name: 'Loose leaf tea', size: '100g' },
      { name: 'Brown soda bread mix', size: '500g' },
      { name: 'Vegetable soup, two jars', size: '2 x 400ml' },
      CONTENTS.sweet[2]!,
    ],
    allergens: 'Contains gluten (wheat), milk, celery.',
  },
  {
    title: 'Thinking Of You',
    price: 65,
    productType: 'Food hamper',
    occasions: ['occasion:sympathy'],
    recipients: ['recipient:family'],
    alcohol: false,
    opening: 'A small, quiet box for a house that has had a hard week.',
    story:
      'Tea, shortbread and a candle. We keep this one deliberately plain, and we send it in unbranded packaging with a handwritten card.',
    packaging: 'A plain shallow box, tissue lined, tied with cream ribbon. No logo on the outer wrap.',
    contents: [
      { name: 'Loose leaf tea', size: '100g' },
      CONTENTS.sweet[2]!,
      { name: 'Soy wax candle, wild gorse', size: '200g' },
    ],
    allergens: 'Contains gluten (wheat), milk.',
  },
  {
    title: 'The Comfort Box',
    price: 78,
    productType: 'Food hamper',
    occasions: ['occasion:sympathy'],
    recipients: ['recipient:family', 'recipient:couple'],
    alcohol: false,
    opening: 'Food that can be eaten standing up, sent to a house full of people.',
    story:
      'Bread, cheese, chutney and biscuits. It feeds whoever calls in, which is usually the practical problem in the days after a funeral.',
    packaging: 'A plain deep box, tissue lined, tied with cream ribbon. No logo on the outer wrap.',
    contents: [
      CONTENTS.cheese[0]!,
      CONTENTS.cheese[1]!,
      CONTENTS.cheese[2]!,
      { name: 'Brown soda bread mix', size: '500g' },
    ],
    allergens: 'Contains milk, gluten (wheat), sulphites.',
  },
  {
    title: 'The Quiet Comfort',
    price: 92,
    productType: 'Food hamper',
    occasions: ['occasion:sympathy'],
    recipients: ['recipient:family'],
    alcohol: false,
    opening: 'Our larger sympathy box, for when it is going to a whole household.',
    story:
      'Enough food in it that nobody has to think about lunch, plus tea and a candle. Sent plain, with a card written by hand.',
    packaging: 'A plain deep box, tissue lined, tied with cream ribbon. No logo on the outer wrap.',
    contents: [
      CONTENTS.cheese[0]!,
      CONTENTS.cheese[1]!,
      { name: 'Vegetable soup, two jars', size: '2 x 400ml' },
      { name: 'Loose leaf tea', size: '100g' },
      CONTENTS.sweet[2]!,
    ],
    allergens: 'Contains milk, gluten (wheat), celery, sulphites.',
  },
  {
    title: 'The Toast',
    price: 98,
    productType: 'Wine hamper',
    occasions: ['occasion:anniversary', 'occasion:wedding'],
    recipients: ['recipient:couple'],
    alcohol: true,
    opening: 'A bottle of Champagne, two flutes and something to eat with it.',
    story:
      'The Champagne is a grower Champagne rather than a house brand, made by the family who farm the vines. The chocolate is from Bean and Goose in Wexford.',
    packaging: 'The bottle packed upright in a fitted deep box, flutes either side in tissue, hand tied.',
    contents: [
      { name: 'Grower Champagne, brut', size: '75cl' },
      { name: 'Pair of crystal flutes' },
      CONTENTS.sweet[1]!,
    ],
    allergens: 'Contains sulphites, milk, nuts, soya. Contains alcohol.',
  },
  {
    title: 'The Ruby Anniversary',
    price: 140,
    productType: 'Wine hamper',
    occasions: ['occasion:anniversary'],
    recipients: ['recipient:couple'],
    alcohol: true,
    opening: 'Two bottles of red, glassware, and a board to put the cheese on.',
    story:
      'A Rioja Reserva and a Douro red, both from producers we import ourselves. The board is Irish ash, turned in Wicklow, and it will still be in the house long after the wine is gone.',
    packaging: 'Bottles bedded upright in a deep fitted box, board laid flat beneath, hand tied with ribbon.',
    contents: [
      { name: 'Rioja Reserva', size: '75cl' },
      { name: 'Douro red', size: '75cl' },
      { name: 'Pair of crystal wine glasses' },
      { name: 'Irish ash serving board' },
    ],
    allergens: 'Contains sulphites. Contains alcohol.',
  },
  {
    title: 'The Golden Year',
    price: 185,
    productType: 'Wine hamper',
    occasions: ['occasion:anniversary', 'occasion:wedding'],
    recipients: ['recipient:couple'],
    alcohol: true,
    leadTime: 'Two working days, as this one is packed to order.',
    opening: 'A vintage Champagne, crystal, and a box built to be opened slowly.',
    story:
      'Vintage Champagne is only declared in years the house thinks are worth it, so the year on the bottle means something. The crystal is cut in Ireland.',
    packaging: 'A fitted presentation box, bottle bedded in wood wool, glasses either side, sealed with wax.',
    contents: [
      { name: 'Vintage Champagne', size: '75cl' },
      { name: 'Pair of cut crystal flutes' },
      CONTENTS.sweet[1]!,
      { name: 'Handmade shortbread', size: '200g' },
    ],
    allergens: 'Contains sulphites, milk, nuts, gluten (wheat), soya. Contains alcohol.',
  },
  {
    title: 'The Anniversary Magnum',
    price: 210,
    productType: 'Wine hamper',
    occasions: ['occasion:anniversary', 'occasion:wedding', 'occasion:christmas'],
    recipients: ['recipient:couple'],
    badges: ['badge:exclusive'],
    alcohol: true,
    leadTime: 'Two working days, as this one is packed to order.',
    opening: 'A magnum of Rioja Reserva, four glasses, and enough food to make a night of it.',
    story:
      'The magnum is from a bodega we import directly, and no other retailer in Ireland lists it. A magnum ages more slowly than a bottle, so this is a wine that can be put away for a few years if they want to.',
    packaging: 'A deep fitted box built for the magnum, everything else packed around it in wood wool, sealed with wax.',
    contents: [
      { name: 'Rioja Reserva, magnum', size: '150cl' },
      { name: 'Four crystal wine glasses' },
      CONTENTS.cheese[0]!,
      CONTENTS.cheese[1]!,
      CONTENTS.cheese[2]!,
    ],
    allergens: 'Contains sulphites, milk, gluten (wheat). Contains alcohol.',
  },
  {
    title: 'The Wine Lovers Case',
    price: 160,
    productType: 'Wine hamper',
    occasions: ['occasion:christmas', 'occasion:birthday', 'occasion:corporate'],
    recipients: ['recipient:him', 'recipient:her', 'recipient:client'],
    alcohol: true,
    opening: 'Six bottles chosen to be drunk over a season, not opened in a week.',
    story:
      'Two whites, three reds and a dessert wine, all from producers we buy from directly. The card in the case says what each one is for, so nobody has to guess which bottle suits the Tuesday and which suits the Sunday.',
    packaging: 'A wooden six bottle case with a sliding lid, bottles bedded in wood wool.',
    contents: [
      { name: 'Albariño, Rías Baixas', size: '75cl' },
      { name: 'Chablis', size: '75cl' },
      { name: 'Rioja Reserva', size: '75cl' },
      { name: 'Douro red', size: '75cl' },
      { name: 'Malbec, Mendoza', size: '75cl' },
      { name: 'Late bottled vintage port', size: '75cl' },
    ],
    allergens: 'Contains sulphites. Contains alcohol.',
  },
  {
    title: 'The Fine Wine Cellar',
    price: 280,
    productType: 'Wine hamper',
    occasions: ['occasion:christmas', 'occasion:anniversary', 'occasion:corporate'],
    recipients: ['recipient:him', 'recipient:client'],
    badges: ['badge:exclusive'],
    alcohol: true,
    leadTime: 'Three working days, as this one is packed to order.',
    opening: 'Six bottles from the top of what we import, in a case built to keep them.',
    story:
      'Four of the six are wines no other Irish retailer stocks, because we buy them direct from the estate. The case is solid pine and will hold the bottles on their side in a cool room for years.',
    packaging: 'A solid wooden six bottle case with a sliding lid, bottles bedded in wood wool, sealed with wax.',
    contents: [
      { name: 'Chablis Premier Cru', size: '75cl' },
      { name: 'Barolo', size: '75cl' },
      { name: 'Rioja Gran Reserva', size: '75cl' },
      { name: 'Châteauneuf du Pape', size: '75cl' },
      { name: 'Vintage port', size: '75cl' },
      { name: 'Sauternes', size: '37.5cl' },
    ],
    allergens: 'Contains sulphites. Contains alcohol.',
  },
  {
    title: 'The Celebration Crate',
    price: 135,
    productType: 'Wine hamper',
    occasions: ['occasion:birthday', 'occasion:wedding', 'occasion:christmas'],
    recipients: ['recipient:couple', 'recipient:her', 'recipient:him'],
    alcohol: true,
    opening: 'Prosecco, red, white and enough food that nobody needs to cook.',
    story:
      'Built for a house that is about to have people in it. The Prosecco is from a single estate in Valdobbiadene rather than a co-op, and it shows.',
    packaging: 'A wooden crate with the bottles bedded in wood wool and the food laid over the top.',
    contents: [
      { name: 'Prosecco Superiore', size: '75cl' },
      { name: 'Albariño, Rías Baixas', size: '75cl' },
      { name: 'Rioja Reserva', size: '75cl' },
      CONTENTS.cheese[0]!,
      CONTENTS.cheese[1]!,
      CONTENTS.sweet[1]!,
    ],
    allergens: 'Contains sulphites, milk, gluten (wheat), nuts, soya. Contains alcohol.',
  },
  {
    title: 'The Grand Christmas Hamper',
    price: 245,
    productType: 'Food hamper',
    occasions: ['occasion:christmas', 'occasion:corporate'],
    recipients: ['recipient:family', 'recipient:client'],
    badges: ['badge:guaranteed-irish', 'badge:irish-made'],
    alcohol: true,
    leadTime: 'Two working days, as this one is packed to order.',
    opening: 'The full Christmas box, sent to a house that is feeding everybody this year.',
    story:
      'Fourteen things in it, nearly all of them Irish, from producers we buy from directly. The cake is made in Meath in October so it has time to mature before it ships.',
    packaging: 'A large lidded wicker hamper, lined and packed by hand, sealed with wax and hand tied.',
    contents: [
      { name: 'Christmas cake, matured', size: '900g' },
      { name: 'Rioja Reserva', size: '75cl' },
      { name: 'Prosecco Superiore', size: '75cl' },
      CONTENTS.cheese[0]!,
      CONTENTS.cheese[1]!,
      CONTENTS.cheese[2]!,
      CONTENTS.breakfast[1]!,
      CONTENTS.sweet[0]!,
      CONTENTS.sweet[1]!,
      { name: 'Ballymakenny Farm hand cooked crisps', producer: 'Ballymakenny Farm', size: '125g' },
    ],
    allergens: 'Contains milk, gluten (wheat), nuts, sulphites, egg, soya. Contains alcohol.',
  },
  {
    title: 'The Boardroom Hamper',
    price: 175,
    productType: 'Food hamper',
    occasions: ['occasion:corporate', 'occasion:christmas', 'occasion:thank-you'],
    recipients: ['recipient:client'],
    badges: ['badge:guaranteed-irish'],
    alcohol: true,
    leadTime: 'Five working days for orders over ten units.',
    opening: 'A client hamper that says the sender put some thought into it.',
    story:
      'Irish producers throughout, a bottle of red that is good enough to notice, and a branded card we print with your logo. We deliver these in bulk to multiple addresses and we handle the address list.',
    packaging: 'A deep lidded box, tissue lined, hand tied, with a printed card carrying your branding inside the lid.',
    contents: [
      { name: 'Rioja Reserva', size: '75cl' },
      CONTENTS.cheese[0]!,
      CONTENTS.cheese[1]!,
      CONTENTS.cheese[2]!,
      CONTENTS.sweet[1]!,
      { name: 'Ballymakenny Farm hand cooked crisps', producer: 'Ballymakenny Farm', size: '125g' },
    ],
    allergens: 'Contains milk, gluten (wheat), nuts, sulphites, soya. Contains alcohol.',
  },
  {
    title: 'The Client Hamper',
    price: 125,
    productType: 'Food hamper',
    occasions: ['occasion:corporate', 'occasion:thank-you'],
    recipients: ['recipient:client'],
    badges: ['badge:guaranteed-irish'],
    alcohol: false,
    leadTime: 'Five working days for orders over ten units.',
    opening: 'Our standard corporate box, sent by the hundred every December.',
    story:
      'Alcohol free so it can go to every client on the list without checking first. Irish producers throughout, and a branded card printed with your logo.',
    packaging: 'A deep lidded box, tissue lined, hand tied, with a printed card carrying your branding inside the lid.',
    contents: [
      CONTENTS.breakfast[0]!,
      CONTENTS.cheese[0]!,
      CONTENTS.cheese[1]!,
      CONTENTS.sweet[0]!,
      { name: 'Loose leaf tea', size: '100g' },
    ],
    allergens: 'Contains milk, gluten (oats, wheat), nuts, soya.',
  },
  {
    title: 'The Team Treat',
    price: 65,
    productType: 'Food hamper',
    occasions: ['occasion:corporate', 'occasion:thank-you'],
    recipients: ['recipient:client'],
    alcohol: false,
    leadTime: 'Five working days for orders over ten units.',
    opening: 'A smaller corporate box, for sending to a whole team rather than a handful of clients.',
    story:
      'Priced so a company can send fifty without a conversation about budget, and still send something Irish and hand packed.',
    packaging: 'A shallow lidded box, tissue lined and hand tied, with a printed card inside the lid.',
    contents: [CONTENTS.breakfast[0]!, CONTENTS.sweet[0]!, CONTENTS.sweet[2]!, { name: 'Loose leaf tea', size: '100g' }],
    allergens: 'Contains milk, gluten (oats, wheat), nuts, soya.',
  },
  {
    title: 'The Executive Case',
    price: 240,
    productType: 'Wine hamper',
    occasions: ['occasion:corporate', 'occasion:christmas'],
    recipients: ['recipient:client'],
    badges: ['badge:exclusive'],
    alcohol: true,
    leadTime: 'Five working days for orders over ten units.',
    opening: 'The top of our corporate range, for the twenty people on the list who matter most.',
    story:
      'Three bottles from estates we import directly, so the recipient cannot price check it in a supermarket. Crystal glassware and a printed card with your branding.',
    packaging: 'A wooden case with a sliding lid, bottles bedded in wood wool, sealed with wax.',
    contents: [
      { name: 'Chablis Premier Cru', size: '75cl' },
      { name: 'Rioja Gran Reserva', size: '75cl' },
      { name: 'Vintage port', size: '75cl' },
      { name: 'Pair of crystal wine glasses' },
    ],
    allergens: 'Contains sulphites. Contains alcohol.',
  },
  {
    title: 'The Thank You Box',
    price: 58,
    productType: 'Food hamper',
    occasions: ['occasion:thank-you'],
    recipients: ['recipient:her', 'recipient:him', 'recipient:family'],
    alcohol: false,
    opening: 'A small box for a real thank you, rather than a bunch of petrol station flowers.',
    story:
      'Chocolate from Kerry, biscuits, tea and a candle. It costs less than dinner and it lands better than a card.',
    packaging: 'A shallow kraft box, tissue lined and hand tied with ribbon.',
    contents: [CONTENTS.sweet[0]!, CONTENTS.sweet[2]!, { name: 'Loose leaf tea', size: '100g' }, { name: 'Soy wax travel candle, sea air', size: '90g' }],
    allergens: 'Contains milk, gluten (wheat), soya. May contain nuts.',
  },
  {
    title: 'The Big Thank You',
    price: 115,
    productType: 'Food hamper',
    occasions: ['occasion:thank-you', 'occasion:christmas'],
    recipients: ['recipient:family', 'recipient:couple'],
    alcohol: true,
    opening: 'For the neighbour who fed the cat for a fortnight.',
    story:
      'A bottle of red, a full cheeseboard set and chocolate. Enough that the thank you is obvious without anybody being embarrassed by it.',
    packaging: 'A deep kraft box with the bottle upright, everything else packed around it, hand tied.',
    contents: [
      { name: 'Rioja Reserva', size: '75cl' },
      CONTENTS.cheese[0]!,
      CONTENTS.cheese[1]!,
      CONTENTS.cheese[2]!,
      CONTENTS.sweet[1]!,
    ],
    allergens: 'Contains milk, gluten (wheat), nuts, sulphites, soya. Contains alcohol.',
  },
]

type WineSeed = {
  title: string
  price: number
  productType: string
  kind: 'wine' | 'spirit'
  wine: CatalogueWineFields
  taste: string
  producerLine: string
  pairing: string
  occasions?: string[]
  recipients?: string[]
}

/**
 * Wine descriptions follow the wine template in brief section 7: taste,
 * producer and region, pairing, then the exclusivity or value line only
 * where we hold evidence.
 */
function wineDescription(seed: WineSeed): string {
  const parts = [`<p>${seed.taste}</p>`, `<p>${seed.producerLine}</p>`, `<p>${seed.pairing}</p>`]
  if (seed.wine.isExclusiveImport) {
    parts.push('<p>We import this one ourselves. No other retailer in Ireland stocks it.</p>')
  }
  return parts.join('\n')
}

function wineProduct(seed: WineSeed): CatalogueProduct {
  const handle = slug(seed.title)
  const tags = [
    seed.kind === 'wine' ? 'type:wine' : 'type:spirit',
    priceTag(seed.price),
    ...(seed.wine.isExclusiveImport ? ['badge:exclusive'] : []),
    ...(seed.occasions ?? []),
    ...(seed.recipients ?? []),
  ]
  return {
    handle,
    title: seed.title,
    descriptionHtml: wineDescription(seed),
    productType: seed.productType,
    vendor: seed.wine.producer ?? 'The Parcel Concierge',
    tags,
    images: [
      { ...PLACEHOLDER('wine', 1), alt: `Bottle of ${seed.title} standing against a plain background` },
      { ...PLACEHOLDER('wine', 2), alt: `${seed.title} label in close up` },
    ],
    variants: [
      {
        sku: `TPC-WIN-${handle.toUpperCase().replace(/-/g, '')}`,
        title: 'Default Title',
        price: seed.price.toFixed(2),
        inventoryQuantity: 24,
      },
    ],
    wine: seed.wine,
  }
}

const WINES: WineSeed[] = [
  {
    title: 'Domaine Bellefont Chablis Premier Cru',
    price: 42,
    productType: 'White wine',
    kind: 'wine',
    taste: 'Sharp green apple and lemon, with a chalky edge that makes your mouth water. Dry, and not remotely sweet.',
    producerLine: 'Made by a family domaine in Chablis, northern Burgundy, on the limestone that gives the wine its bite.',
    pairing: 'Drink it with oysters, smoked salmon or a roast chicken.',
    wine: {
      producer: 'Domaine Bellefont',
      region: 'Chablis',
      country: 'France',
      grape: ['Chardonnay'],
      vintage: '2022',
      abv: 12.5,
      volume: '75cl',
      styleBody: 'medium',
      styleSweetness: 'dry',
      tastingNote: 'Green apple, lemon, wet stone.',
      foodPairing: 'Oysters, smoked salmon, roast chicken.',
      isExclusiveImport: true,
    },
    occasions: ['occasion:christmas'],
  },
  {
    title: 'Bodegas Aldea Rioja Reserva',
    price: 28,
    productType: 'Red wine',
    kind: 'wine',
    taste: 'Soft red fruit and vanilla from three years in oak, with enough grip to stand up to a steak.',
    producerLine: 'From a family bodega in Rioja Alta who have been bottling their own since the 1950s.',
    pairing: 'Steak, lamb, or a hard sheep cheese.',
    wine: {
      producer: 'Bodegas Aldea',
      region: 'Rioja Alta',
      country: 'Spain',
      grape: ['Tempranillo', 'Graciano'],
      vintage: '2019',
      abv: 14,
      volume: '75cl',
      styleBody: 'full',
      styleSweetness: 'dry',
      tastingNote: 'Red cherry, vanilla, leather.',
      foodPairing: 'Steak, lamb, hard cheese.',
      isExclusiveImport: true,
    },
    occasions: ['occasion:christmas'],
    recipients: ['recipient:him'],
  },
  {
    title: 'Quinta do Ribeiro Douro Tinto',
    price: 24,
    productType: 'Red wine',
    kind: 'wine',
    taste: 'Dark plum and blackberry with a warm, dry finish. Big, but not heavy going.',
    producerLine: 'Grown on terraces above the Douro in northern Portugal, on the same vines that go into port.',
    pairing: 'Stew, roast beef, or anything off a barbecue.',
    wine: {
      producer: 'Quinta do Ribeiro',
      region: 'Douro',
      country: 'Portugal',
      grape: ['Touriga Nacional', 'Tinta Roriz'],
      vintage: '2021',
      abv: 13.5,
      volume: '75cl',
      styleBody: 'full',
      styleSweetness: 'dry',
      tastingNote: 'Plum, blackberry, black pepper.',
      foodPairing: 'Stew, roast beef, barbecue.',
      isExclusiveImport: true,
    },
  },
  {
    title: 'Finca del Sol Malbec',
    price: 19,
    productType: 'Red wine',
    kind: 'wine',
    taste: 'Ripe blackcurrant and a hint of cocoa, smooth all the way through. An easy bottle to open on a Tuesday.',
    producerLine: 'Grown high in the Uco Valley in Mendoza, where the cold nights keep the fruit fresh.',
    pairing: 'Burgers, hard cheese, or on its own.',
    wine: {
      producer: 'Finca del Sol',
      region: 'Mendoza',
      country: 'Argentina',
      grape: ['Malbec'],
      vintage: '2022',
      abv: 13.5,
      volume: '75cl',
      styleBody: 'medium',
      styleSweetness: 'dry',
      tastingNote: 'Blackcurrant, cocoa, violet.',
      foodPairing: 'Burgers, hard cheese.',
    },
  },
  {
    title: 'Pazo de Miño Albariño',
    price: 22,
    productType: 'White wine',
    kind: 'wine',
    taste: 'Peach and lime with a salty finish, the way white wine tastes near the sea.',
    producerLine: 'From Rías Baixas on the Atlantic coast of Galicia, a few miles inland from the water.',
    pairing: 'Prawns, crab, or a plate of ham.',
    wine: {
      producer: 'Pazo de Miño',
      region: 'Rías Baixas',
      country: 'Spain',
      grape: ['Albariño'],
      vintage: '2023',
      abv: 12.5,
      volume: '75cl',
      styleBody: 'light',
      styleSweetness: 'dry',
      tastingNote: 'Peach, lime, sea salt.',
      foodPairing: 'Prawns, crab, cured ham.',
      isExclusiveImport: true,
    },
    recipients: ['recipient:her'],
  },
  {
    title: 'Maison Vireau Champagne Brut',
    price: 52,
    productType: 'Champagne',
    kind: 'wine',
    taste: 'Fine bubbles, green apple and toast. Dry, but round enough to drink on its own.',
    producerLine: 'A grower Champagne from the Marne valley, made by the family who farm the vines rather than a large house.',
    pairing: 'Drink it before dinner, or with anything fried.',
    wine: {
      producer: 'Maison Vireau',
      region: 'Champagne',
      country: 'France',
      grape: ['Pinot Meunier', 'Chardonnay'],
      abv: 12,
      volume: '75cl',
      styleBody: 'medium',
      styleSweetness: 'dry',
      tastingNote: 'Green apple, brioche, citrus.',
      foodPairing: 'Aperitif, fried food, soft cheese.',
      isExclusiveImport: true,
    },
    occasions: ['occasion:anniversary', 'occasion:wedding'],
    recipients: ['recipient:couple'],
  },
  {
    title: 'Ca del Ponte Prosecco Superiore',
    price: 21,
    productType: 'Sparkling wine',
    kind: 'wine',
    taste: 'Pear and white flowers, soft bubbles, off dry. Easier going than Champagne and meant to be.',
    producerLine: 'From a single estate in Valdobbiadene rather than a co-op, which is why it tastes of something.',
    pairing: 'Aperitif, brunch, or with a slice of cake.',
    wine: {
      producer: 'Ca del Ponte',
      region: 'Valdobbiadene',
      country: 'Italy',
      grape: ['Glera'],
      abv: 11,
      volume: '75cl',
      styleBody: 'light',
      styleSweetness: 'off-dry',
      tastingNote: 'Pear, white flowers, citrus.',
      foodPairing: 'Aperitif, brunch, cake.',
    },
    occasions: ['occasion:birthday'],
  },
  {
    title: 'Château Lansac Rosé',
    price: 18,
    productType: 'Rosé wine',
    kind: 'wine',
    taste: 'Pale, dry, strawberry and pink grapefruit. Cold, in a garden, in July.',
    producerLine: 'Made in Provence, on the same estate that has been growing these grapes since the 1970s.',
    pairing: 'Salad, grilled fish, or nothing at all.',
    wine: {
      producer: 'Château Lansac',
      region: 'Provence',
      country: 'France',
      grape: ['Grenache', 'Cinsault'],
      vintage: '2023',
      abv: 12.5,
      volume: '75cl',
      styleBody: 'light',
      styleSweetness: 'dry',
      tastingNote: 'Strawberry, pink grapefruit, herbs.',
      foodPairing: 'Salad, grilled fish.',
    },
    recipients: ['recipient:her'],
  },
  {
    title: 'Graham Estate Late Bottled Vintage Port',
    price: 26,
    productType: 'Port',
    kind: 'wine',
    taste: 'Sweet, thick and dark, with figs, chocolate and a long finish. A small glass goes a long way.',
    producerLine: 'From the Douro in northern Portugal, aged in cask for four years before bottling.',
    pairing: 'Blue cheese, dark chocolate, or on its own after dinner.',
    wine: {
      producer: 'Graham Estate',
      region: 'Douro',
      country: 'Portugal',
      grape: ['Touriga Nacional'],
      vintage: '2018',
      abv: 20,
      volume: '75cl',
      styleBody: 'full',
      styleSweetness: 'sweet',
      tastingNote: 'Fig, dark chocolate, cinnamon.',
      foodPairing: 'Blue cheese, dark chocolate.',
    },
    occasions: ['occasion:christmas'],
  },
  {
    title: 'Barone Ferri Barolo',
    price: 58,
    productType: 'Red wine',
    kind: 'wine',
    taste: 'Rose, tar and sour cherry, with firm tannin. It needs an hour open, and it is worth the hour.',
    producerLine: 'From Piedmont in north west Italy, from a grower with four hectares and no second label.',
    pairing: 'Braised beef, mushroom risotto, aged cheese.',
    wine: {
      producer: 'Barone Ferri',
      region: 'Piedmont',
      country: 'Italy',
      grape: ['Nebbiolo'],
      vintage: '2019',
      abv: 14,
      volume: '75cl',
      styleBody: 'full',
      styleSweetness: 'dry',
      tastingNote: 'Rose, tar, sour cherry.',
      foodPairing: 'Braised beef, mushroom risotto.',
      isExclusiveImport: true,
    },
  },
  {
    title: 'Clos Saint Aubin Sauternes',
    price: 34,
    productType: 'Dessert wine',
    kind: 'wine',
    taste: 'Honey, apricot and marmalade, sweet but not cloying because the acidity holds it up.',
    producerLine: 'From Sauternes in Bordeaux, where the autumn mist does the work that makes this wine possible.',
    pairing: 'Blue cheese, tart, or foie gras.',
    wine: {
      producer: 'Clos Saint Aubin',
      region: 'Sauternes',
      country: 'France',
      grape: ['Sémillon', 'Sauvignon Blanc'],
      vintage: '2019',
      abv: 13.5,
      volume: '37.5cl',
      styleBody: 'full',
      styleSweetness: 'sweet',
      tastingNote: 'Honey, apricot, marmalade.',
      foodPairing: 'Blue cheese, fruit tart.',
      isExclusiveImport: true,
    },
  },
  {
    title: 'Château Verdier Châteauneuf du Pape',
    price: 46,
    productType: 'Red wine',
    kind: 'wine',
    taste: 'Warm, spicy and full, with dried herbs and dark fruit. Tastes like the south of France in a glass.',
    producerLine: 'Grown on the stony ground north of Avignon, where the pebbles hold the heat overnight.',
    pairing: 'Lamb, game, or a hard mountain cheese.',
    wine: {
      producer: 'Château Verdier',
      region: 'Rhône',
      country: 'France',
      grape: ['Grenache', 'Syrah', 'Mourvèdre'],
      vintage: '2020',
      abv: 14.5,
      volume: '75cl',
      styleBody: 'full',
      styleSweetness: 'dry',
      tastingNote: 'Dried herbs, dark fruit, black pepper.',
      foodPairing: 'Lamb, game, mountain cheese.',
    },
  },
  {
    title: 'Slane Bridge Single Pot Still Irish Whiskey',
    price: 65,
    productType: 'Irish whiskey',
    kind: 'spirit',
    taste: 'Thick and oily, with baked apple, clove and a long warm finish. Water opens it up.',
    producerLine: 'Distilled and bottled in Ireland from malted and unmalted barley, aged in bourbon and sherry casks.',
    pairing: 'Neat, with a drop of water, after dinner.',
    wine: {
      producer: 'Slane Bridge Distillery',
      country: 'Ireland',
      abv: 46,
      volume: '70cl',
      tastingNote: 'Baked apple, clove, honey.',
      foodPairing: 'Dark chocolate, hard cheese.',
      awards: ['Irish Whiskey Awards, gold'],
    },
    occasions: ['occasion:christmas'],
    recipients: ['recipient:him'],
  },
  {
    title: 'Slane Bridge Single Cask Reserve',
    price: 120,
    productType: 'Irish whiskey',
    kind: 'spirit',
    taste: 'Heavier than the standard bottling, with dried fig, orange peel and a lot of sherry cask behind it.',
    producerLine: 'One cask, one bottling run, numbered by hand. When the cask is gone it is gone.',
    pairing: 'Neat. Nothing else needed.',
    wine: {
      producer: 'Slane Bridge Distillery',
      country: 'Ireland',
      abv: 54.2,
      volume: '70cl',
      tastingNote: 'Dried fig, orange peel, oak.',
      isExclusiveImport: true,
    },
    recipients: ['recipient:him'],
  },
  {
    title: 'Tara Hill Small Batch Gin',
    price: 42,
    productType: 'Gin',
    kind: 'spirit',
    taste: 'Juniper first, then gorse, elderflower and a green herbal finish. Works with tonic and works in a martini.',
    producerLine: 'Distilled in Meath in batches of four hundred bottles, using botanicals picked within the county.',
    pairing: 'Tonic and a slice of grapefruit.',
    wine: {
      producer: 'Tara Hill Distillery',
      country: 'Ireland',
      abv: 43,
      volume: '70cl',
      tastingNote: 'Juniper, gorse, elderflower.',
      foodPairing: 'Tonic, grapefruit.',
    },
    recipients: ['recipient:her', 'recipient:him'],
  },
  {
    title: 'Tara Hill Coastal Vodka',
    price: 38,
    productType: 'Vodka',
    kind: 'spirit',
    taste: 'Clean and slightly sweet, with a soft finish. Made from Irish grain and filtered through charcoal.',
    producerLine: 'Distilled in Meath by the same small team who make the gin.',
    pairing: 'Neat and very cold, or with soda and lime.',
    wine: {
      producer: 'Tara Hill Distillery',
      country: 'Ireland',
      abv: 40,
      volume: '70cl',
      tastingNote: 'Cream, soft grain, clean finish.',
    },
  },
  {
    title: 'Boyne Coffee Liqueur',
    price: 32,
    productType: 'Liqueur',
    kind: 'spirit',
    taste: 'Strong coffee, brown sugar and a bitter edge that keeps it from being a dessert.',
    producerLine: 'Made in Meath with coffee roasted twenty minutes from the distillery.',
    pairing: 'Over ice, in an espresso martini, or on ice cream.',
    wine: {
      producer: 'Tara Hill Distillery',
      country: 'Ireland',
      abv: 25,
      volume: '50cl',
      tastingNote: 'Coffee, brown sugar, dark chocolate.',
    },
  },
  {
    title: 'Weingut Fassler Riesling Trocken',
    price: 26,
    productType: 'White wine',
    kind: 'wine',
    taste: 'Lime, green apple and a wet slate edge. Bone dry, despite what people expect of Riesling.',
    producerLine: 'From the Mosel in Germany, grown on slate so steep the fruit is picked by hand.',
    pairing: 'Thai food, pork, or anything with chilli in it.',
    wine: {
      producer: 'Weingut Fassler',
      region: 'Mosel',
      country: 'Germany',
      grape: ['Riesling'],
      vintage: '2022',
      abv: 11.5,
      volume: '75cl',
      styleBody: 'light',
      styleSweetness: 'dry',
      tastingNote: 'Lime, green apple, slate.',
      foodPairing: 'Thai food, pork, chilli.',
      isExclusiveImport: true,
    },
  },
  {
    title: 'Cave de Roussel Picpoul de Pinet',
    price: 17,
    productType: 'White wine',
    kind: 'wine',
    taste: 'Sharp, lemony and light, with a salty finish. The house white that never disappoints.',
    producerLine: 'From the Languedoc coast in southern France, beside the oyster beds it is made for.',
    pairing: 'Shellfish, goat cheese, or a hot afternoon.',
    wine: {
      producer: 'Cave de Roussel',
      region: 'Languedoc',
      country: 'France',
      grape: ['Picpoul'],
      vintage: '2023',
      abv: 12.5,
      volume: '75cl',
      styleBody: 'light',
      styleSweetness: 'dry',
      tastingNote: 'Lemon, green herbs, sea salt.',
      foodPairing: 'Shellfish, goat cheese.',
    },
  },
  {
    title: 'Tenuta Marchesi Pinot Grigio',
    price: 16,
    productType: 'White wine',
    kind: 'wine',
    taste: 'Pear and almond, soft and dry. Easy going without being boring, which is rarer than it sounds.',
    producerLine: 'Grown in Friuli in north east Italy, where Pinot Grigio actually comes from.',
    pairing: 'Pasta, salads, or on its own before dinner.',
    wine: {
      producer: 'Tenuta Marchesi',
      region: 'Friuli',
      country: 'Italy',
      grape: ['Pinot Grigio'],
      vintage: '2023',
      abv: 12,
      volume: '75cl',
      styleBody: 'light',
      styleSweetness: 'dry',
      tastingNote: 'Pear, almond, white peach.',
      foodPairing: 'Pasta, salad.',
    },
  },
  {
    title: 'Mas de la Garrigue Rosé',
    price: 22,
    productType: 'Rosé wine',
    kind: 'wine',
    taste: 'Redcurrant and peach, dry and pale, with more grip than most rosé.',
    producerLine: 'From the Rhône, made from Grenache picked early so it keeps its acidity.',
    pairing: 'Grilled fish, charcuterie, tomatoes.',
    wine: {
      producer: 'Mas de la Garrigue',
      region: 'Rhône',
      country: 'France',
      grape: ['Grenache', 'Syrah'],
      vintage: '2023',
      abv: 13,
      volume: '75cl',
      styleBody: 'light',
      styleSweetness: 'dry',
      tastingNote: 'Redcurrant, peach, white pepper.',
      foodPairing: 'Grilled fish, charcuterie.',
      isExclusiveImport: true,
    },
    recipients: ['recipient:her'],
  },
  {
    title: 'Quinta Rosada Rosé',
    price: 16,
    productType: 'Rosé wine',
    kind: 'wine',
    taste: 'Strawberry and watermelon, off dry and very easy. A crowd rosé rather than a thinking one.',
    producerLine: 'From the Alentejo in southern Portugal, made to be drunk cold and young.',
    pairing: 'Barbecue, salad, or a garden.',
    wine: {
      producer: 'Quinta Rosada',
      region: 'Alentejo',
      country: 'Portugal',
      grape: ['Touriga Nacional'],
      vintage: '2023',
      abv: 12,
      volume: '75cl',
      styleBody: 'light',
      styleSweetness: 'off-dry',
      tastingNote: 'Strawberry, watermelon, rose.',
      foodPairing: 'Barbecue, salad.',
    },
  },
  {
    title: 'Bodega Aldea Rosado',
    price: 19,
    productType: 'Rosé wine',
    kind: 'wine',
    taste: 'Raspberry and orange peel, dry, with a bit of weight to it. Rosé that works in October.',
    producerLine: 'From the same Rioja Alta bodega as our Reserva, made from Garnacha.',
    pairing: 'Roast chicken, paella, hard cheese.',
    wine: {
      producer: 'Bodegas Aldea',
      region: 'Rioja Alta',
      country: 'Spain',
      grape: ['Garnacha'],
      vintage: '2023',
      abv: 13,
      volume: '75cl',
      styleBody: 'medium',
      styleSweetness: 'dry',
      tastingNote: 'Raspberry, orange peel, herbs.',
      foodPairing: 'Roast chicken, paella.',
      isExclusiveImport: true,
    },
  },
  {
    title: 'Maison Vireau Blanc de Blancs',
    price: 68,
    productType: 'Champagne',
    kind: 'wine',
    taste: 'All Chardonnay, so it is finer and sharper than the standard bottling. Lemon, chalk and toast.',
    producerLine: 'From the same grower family in the Marne valley, from their oldest Chardonnay parcel.',
    pairing: 'Oysters, or on its own at the start of an evening.',
    wine: {
      producer: 'Maison Vireau',
      region: 'Champagne',
      country: 'France',
      grape: ['Chardonnay'],
      abv: 12,
      volume: '75cl',
      styleBody: 'light',
      styleSweetness: 'dry',
      tastingNote: 'Lemon, chalk, toast.',
      foodPairing: 'Oysters, aperitif.',
      isExclusiveImport: true,
    },
    occasions: ['occasion:anniversary'],
  },
  {
    title: 'Casa Bruna Cava Brut Nature',
    price: 24,
    productType: 'Sparkling wine',
    kind: 'wine',
    taste: 'Bone dry with no added sugar at all, so it tastes of apple and bread rather than sweetness.',
    producerLine: 'Made near Barcelona by the traditional method, aged on its lees for two years.',
    pairing: 'Aperitif, tapas, fried fish.',
    wine: {
      producer: 'Casa Bruna',
      region: 'Penedès',
      country: 'Spain',
      grape: ['Macabeo', 'Xarel·lo'],
      abv: 11.5,
      volume: '75cl',
      styleBody: 'light',
      styleSweetness: 'dry',
      tastingNote: 'Green apple, bread, citrus peel.',
      foodPairing: 'Tapas, fried fish.',
    },
  },
  {
    title: 'Graham Estate Tawny Port, 10 Year',
    price: 34,
    productType: 'Port',
    kind: 'wine',
    taste: 'Caramel, walnut and dried apricot. Lighter and nuttier than a vintage port, and it keeps once opened.',
    producerLine: 'Aged ten years in cask in the Douro before bottling, which is where the nuttiness comes from.',
    pairing: 'Cheese, nuts, or a cold night.',
    wine: {
      producer: 'Graham Estate',
      region: 'Douro',
      country: 'Portugal',
      abv: 20,
      volume: '75cl',
      styleBody: 'medium',
      styleSweetness: 'sweet',
      tastingNote: 'Caramel, walnut, dried apricot.',
      foodPairing: 'Cheese, nuts.',
    },
    occasions: ['occasion:christmas'],
  },
  {
    title: 'Bodega del Sur Pedro Ximénez',
    price: 29,
    productType: 'Dessert wine',
    kind: 'wine',
    taste: 'Almost black, thick as syrup, all raisin and molasses. Pour it over ice cream and watch what happens.',
    producerLine: 'From Andalusia, made from grapes dried in the sun before pressing.',
    pairing: 'Vanilla ice cream, blue cheese, or a very small glass on its own.',
    wine: {
      producer: 'Bodega del Sur',
      region: 'Montilla-Moriles',
      country: 'Spain',
      grape: ['Pedro Ximénez'],
      abv: 17,
      volume: '50cl',
      styleBody: 'full',
      styleSweetness: 'sweet',
      tastingNote: 'Raisin, molasses, fig.',
      foodPairing: 'Ice cream, blue cheese.',
    },
  },
  {
    title: 'Hill of Tara Single Malt',
    price: 78,
    productType: 'Irish whiskey',
    kind: 'spirit',
    taste: 'Lighter than our pot still, with pear, vanilla and a soft finish. A good first single malt.',
    producerLine: 'Distilled in Ireland from malted barley and aged eight years in bourbon casks.',
    pairing: 'Neat, or with one ice cube.',
    wine: {
      producer: 'Slane Bridge Distillery',
      country: 'Ireland',
      abv: 43,
      volume: '70cl',
      tastingNote: 'Pear, vanilla, toasted oak.',
      awards: ['Irish Whiskey Awards, silver'],
    },
    recipients: ['recipient:him'],
  },
  {
    title: 'Slane Bridge Cask Strength',
    price: 92,
    productType: 'Irish whiskey',
    kind: 'spirit',
    taste: 'Undiluted, so it is hot until you add water, then it opens into honey, orange and clove.',
    producerLine: 'Bottled straight from the cask with nothing added, at whatever strength the cask gave.',
    pairing: 'Neat with a few drops of water.',
    wine: {
      producer: 'Slane Bridge Distillery',
      country: 'Ireland',
      abv: 58.4,
      volume: '70cl',
      tastingNote: 'Honey, orange peel, clove.',
    },
    recipients: ['recipient:him'],
  },
  {
    title: 'Tara Hill Sloe Gin',
    price: 36,
    productType: 'Liqueur',
    kind: 'spirit',
    taste: 'Deep red, tart and sweet at once, with almond behind the fruit. Not a syrup.',
    producerLine: 'Made in Meath from sloes picked in the hedgerows after the first frost.',
    pairing: 'Neat after a walk, or topped with sparkling wine.',
    wine: {
      producer: 'Tara Hill Distillery',
      country: 'Ireland',
      abv: 28,
      volume: '50cl',
      tastingNote: 'Sloe, almond, damson.',
    },
    occasions: ['occasion:christmas'],
  },
]

/**
 * Wine gift sets. Modelled as wine products rather than hampers because
 * they are bought as a bottle-plus-glass unit rather than as a packed box,
 * which is how /wine/gift-sets is meant to read.
 */
const GIFT_SETS: WineSeed[] = [
  {
    title: 'Rioja Reserva and Glasses Set',
    price: 62,
    productType: 'Wine gift set',
    kind: 'wine',
    taste: 'Our Rioja Reserva, soft red fruit and vanilla from three years in oak, with two crystal glasses.',
    producerLine: 'The wine is from a family bodega in Rioja Alta we import directly. The glasses are cut crystal.',
    pairing: 'Steak, lamb, or a hard sheep cheese.',
    wine: {
      producer: 'Bodegas Aldea',
      region: 'Rioja Alta',
      country: 'Spain',
      grape: ['Tempranillo'],
      abv: 14,
      volume: '75cl',
      styleBody: 'full',
      styleSweetness: 'dry',
      tastingNote: 'Red cherry, vanilla, leather.',
      isExclusiveImport: true,
    },
    occasions: ['occasion:christmas', 'occasion:thank-you'],
  },
  {
    title: 'Champagne and Flutes Set',
    price: 85,
    productType: 'Wine gift set',
    kind: 'wine',
    taste: 'Grower Champagne with fine bubbles and a toasty edge, boxed with two crystal flutes.',
    producerLine: 'Made by the family who farm the vines in the Marne valley, not by a large house.',
    pairing: 'Anything that counts as an occasion.',
    wine: {
      producer: 'Maison Vireau',
      region: 'Champagne',
      country: 'France',
      grape: ['Pinot Meunier', 'Chardonnay'],
      abv: 12,
      volume: '75cl',
      styleBody: 'medium',
      styleSweetness: 'dry',
      tastingNote: 'Green apple, brioche, citrus.',
      isExclusiveImport: true,
    },
    occasions: ['occasion:anniversary', 'occasion:wedding'],
    recipients: ['recipient:couple'],
  },
  {
    title: 'Whiskey and Tumblers Set',
    price: 95,
    productType: 'Wine gift set',
    kind: 'spirit',
    taste: 'Single pot still Irish whiskey, thick and oily with baked apple and clove, and two cut crystal tumblers.',
    producerLine: 'Distilled and bottled in Ireland, aged in bourbon and sherry casks.',
    pairing: 'Neat, with a drop of water, after dinner.',
    wine: {
      producer: 'Slane Bridge Distillery',
      country: 'Ireland',
      abv: 46,
      volume: '70cl',
      tastingNote: 'Baked apple, clove, honey.',
    },
    occasions: ['occasion:christmas'],
    recipients: ['recipient:him'],
  },
  {
    title: 'Port and Cheese Knife Set',
    price: 52,
    productType: 'Wine gift set',
    kind: 'wine',
    taste: 'Ten year tawny port, caramel and walnut, with a pair of cheese knives that will outlast the bottle.',
    producerLine: 'The port is aged ten years in cask in the Douro. The knives are stainless with ash handles.',
    pairing: 'A blue cheese and an hour with nothing else to do.',
    wine: {
      producer: 'Graham Estate',
      region: 'Douro',
      country: 'Portugal',
      abv: 20,
      volume: '75cl',
      styleBody: 'medium',
      styleSweetness: 'sweet',
      tastingNote: 'Caramel, walnut, dried apricot.',
    },
    occasions: ['occasion:christmas', 'occasion:thank-you'],
  },
]

type AddonSeed = {
  title: string
  price: number
  productType: string
  copy: string
}

const ADDONS: AddonSeed[] = [
  {
    title: 'Wild Gorse Soy Candle',
    price: 24,
    productType: 'Candle',
    copy: 'Poured in Ireland in soy wax, scented with gorse and sea air. Burns for around forty hours. Add it to a hamper and it fills the top of the box.',
  },
  {
    title: 'Sea Air Reed Diffuser',
    price: 28,
    productType: 'Diffuser',
    copy: 'A hundred millilitres of oil and eight reeds, which lasts about three months in a hallway. Made in Ireland. It goes well in a pamper hamper.',
  },
  {
    title: 'Skelligs Sea Salt Chocolate Bar',
    price: 6,
    productType: 'Chocolate',
    copy: 'Dark chocolate with sea salt, made in Kerry on the Ring of Kerry road. Ninety grams. The obvious thing to add to any food hamper.',
  },
  {
    title: 'Bean and Goose Praline Selection',
    price: 14,
    productType: 'Chocolate',
    copy: 'Twelve pralines made in Wexford in small batches. Contains nuts and milk. Add it to a hamper or send it with a card.',
  },
  {
    title: 'Handmade Shortbread Tin',
    price: 12,
    productType: 'Confectionery',
    copy: 'All butter shortbread in a tin that gets reused. Two hundred grams. It goes with the tea in a sympathy box and with the coffee in a breakfast one.',
  },
  {
    title: 'Cut Crystal Tumbler Pair',
    price: 45,
    productType: 'Crystal',
    copy: 'Two hand cut crystal tumblers, weighted at the base. They are the glasses in our whiskey hampers, sold separately for anyone who already has the bottle.',
  },
  {
    title: 'Crystal Wine Glass Pair',
    price: 42,
    productType: 'Glassware',
    copy: 'Two crystal wine glasses with a fine rim. Dishwasher safe, which is unusual at this weight. Add them to any wine hamper.',
  },
  {
    title: 'Irish Ash Serving Board',
    price: 38,
    productType: 'Crystal',
    copy: 'Turned from Irish ash in Wicklow and finished with food safe oil. Thirty five centimetres across. It goes under the cheese in any food hamper.',
  },
  {
    title: 'Cut Crystal Decanter',
    price: 85,
    productType: 'Crystal',
    copy: 'Hand cut in Ireland, with a heavy stopper and a base that sits flat. Holds a full bottle. It is the decanter from our Collector Reserve box, sold on its own.',
  },
  {
    title: 'Crystal Champagne Flute Pair',
    price: 44,
    productType: 'Glassware',
    copy: 'Two crystal flutes with a fine rim and a long stem. They are the glasses in The Toast, sold separately for anyone who already has the Champagne.',
  },
  {
    title: 'Beeswax Dinner Candles, Set of Six',
    price: 22,
    productType: 'Candle',
    copy: 'Rolled from Irish beeswax, twenty five centimetres, and they burn for about six hours each. They smell faintly of honey and they do not drip.',
  },
  {
    title: 'Hedgerow Travel Candle',
    price: 16,
    productType: 'Candle',
    copy: 'Ninety grams of soy wax in a tin, scented with blackberry and hawthorn. Burns for around twenty hours. It fits in the corner of any box.',
  },
  {
    title: 'Skelligs Dark Chocolate Buttons',
    price: 8,
    productType: 'Confectionery',
    copy: 'A bag of dark chocolate buttons from Kerry, meant for baking and eaten straight from the bag instead. One hundred and fifty grams.',
  },
  {
    title: 'Killowen Farm Fudge',
    price: 9,
    productType: 'Confectionery',
    copy: 'Made in Wexford in copper pans, cut by hand, two hundred grams. Contains milk. It goes in nearly every food hamper we build.',
  },
]

function addon(seed: AddonSeed): CatalogueProduct {
  const handle = slug(seed.title)
  return {
    handle,
    title: seed.title,
    descriptionHtml: `<p>${seed.copy}</p>`,
    productType: seed.productType,
    vendor: 'The Parcel Concierge',
    tags: ['type:addon', priceTag(seed.price)],
    images: [{ ...PLACEHOLDER('addon', 1), alt: `${seed.title} photographed on a plain background` }],
    variants: [
      {
        sku: `TPC-ADD-${handle.toUpperCase().replace(/-/g, '')}`,
        title: 'Default Title',
        price: seed.price.toFixed(2),
        inventoryQuantity: 40,
      },
    ],
  }
}

/**
 * The builder's parent product.
 *
 * A custom hamper goes into the cart as this product (one variant per box
 * size, priced at the cost of the box and the packing) plus one line per
 * component. See src/lib/hamper-builder.ts for why it is modelled that way.
 *
 * The handle is fixed: the builder route looks it up by
 * BUILDER_PARENT_HANDLE, so renaming it here breaks the builder.
 */
const BUILDER_PARENT: CatalogueProduct = {
  handle: 'build-your-own-hamper',
  title: 'Build your own hamper',
  descriptionHtml:
    '<p>The box, the tissue, the ribbon and the hand written card. Whatever you choose to go in it is added separately, so you can see exactly what you are paying for.</p>',
  productType: 'Custom hamper',
  vendor: 'The Parcel Concierge',
  tags: ['type:hamper', 'price:under-50'],
  images: [
    {
      src: '/placeholder/hamper-3.png',
      alt: 'An empty kraft gift box, tissue lined and tied with ribbon',
      width: 1200,
      height: 1500,
    },
    {
      src: '/placeholder/hamper-1.png',
      alt: 'A finished custom hamper with the lid open, showing the tissue lining',
      width: 1200,
      height: 1500,
    },
    {
      src: '/placeholder/hamper-4.png',
      alt: 'The four box sizes side by side to show the difference between them',
      width: 1200,
      height: 1500,
    },
  ],
  variants: [
    { sku: 'TPC-BOX-SMALL', title: 'The small box', price: '8.00', inventoryQuantity: null, options: [{ name: 'Box', value: 'The small box' }] },
    { sku: 'TPC-BOX-STANDARD', title: 'The standard box', price: '12.00', inventoryQuantity: null, options: [{ name: 'Box', value: 'The standard box' }] },
    { sku: 'TPC-BOX-LARGE', title: 'The large box', price: '18.00', inventoryQuantity: null, options: [{ name: 'Box', value: 'The large box' }] },
    { sku: 'TPC-BOX-WICKER', title: 'The wicker hamper', price: '35.00', inventoryQuantity: null, options: [{ name: 'Box', value: 'The wicker hamper' }] },
  ],
  hamper: {
    contents: [],
    allergens:
      'Allergens depend on what you put in it. Every item you add lists its own allergens on its product page.',
    containsAlcohol: false,
    packaging:
      'Tissue lined, hand tied with ribbon, with your message written by hand on a card inside the lid.',
    personalisation: [
      { kind: 'gift-message', label: 'Gift message', maxLength: 250 },
      { kind: 'ribbon-colour', label: 'Ribbon colour', choices: RIBBON_COLOURS },
    ],
    dimensionsWeight: 'Depends on the box you choose. Sizes are listed beside each one.',
    occasionTags: [],
    recipientTags: [],
  },
}

const catalogue: Catalogue = {
  source: 'fixtures generated by scripts/fixtures/generate-catalogue.ts. Not client data.',
  currencyCode: 'EUR',
  products: [
    BUILDER_PARENT,
    ...HAMPERS.map(hamper),
    ...WINES.map(wineProduct),
    ...GIFT_SETS.map(wineProduct),
    ...ADDONS.map(addon),
  ],
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, `${JSON.stringify(catalogue, null, 2)}\n`, 'utf8')

const counts = catalogue.products.reduce<Record<string, number>>((acc, p) => {
  const kind = p.tags.find((t) => t.startsWith('type:')) ?? 'unknown'
  acc[kind] = (acc[kind] ?? 0) + 1
  return acc
}, {})

console.log(`Wrote ${catalogue.products.length} fixture products to ${OUT}`)
console.log(counts)
