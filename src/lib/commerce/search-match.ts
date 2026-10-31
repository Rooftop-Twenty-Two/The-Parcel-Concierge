/**
 * Title matching for site search.
 *
 * Words are matched as words, not as fragments of other words. Matching
 * fragments meant a search for "port" brought back Fathers Day tech
 * su*port*, the Guinness S*port* Metal Bottle, a Large *Port*able BBQ and
 * the Spain and *Port*ugal Puzzle, none of which a shopper looking for port
 * wants (client report, October 2026).
 *
 * Two passes, the stricter first:
 *  1. Every searched word is a whole word of the title (a trailing "s" is
 *     allowed, so "hamper" finds Hampers). "port" finds the Ports only.
 *  2. Only if nothing passes that, the last word may be the start of a
 *     title word, so a half-typed "tokara dir" still finds Tokara Directors
 *     Reserve. The earlier words must still be whole words.
 */

/** Lower case, accents and apostrophes stripped: "dow's" and "Dow’s" both read "dows". */
export function foldForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’‘`]/g, '')
    .toLowerCase()
}

/** The words of a title or a search, folded, split on anything that is not a letter or digit. */
export function searchWords(value: string): string[] {
  return foldForSearch(value).split(/[^a-z0-9]+/).filter(Boolean)
}

function isWholeWord(titleWords: string[], word: string): boolean {
  return titleWords.some((t) => t === word || t === `${word}s`)
}

function startsAWord(titleWords: string[], word: string): boolean {
  return titleWords.some((t) => t.startsWith(word))
}

/** Whether a title matches a search, allowing the last word to be a prefix (pass 2's rule). */
export function titleMatchesLoosely(title: string, term: string): boolean {
  const words = searchWords(term)
  if (!words.length) return false
  const titleWords = searchWords(title)
  const last = words.length - 1
  return words.every((w, i) =>
    i === last ? startsAWord(titleWords, w) : isWholeWord(titleWords, w),
  )
}

/**
 * The items whose title matches the search, by the stricter pass that finds
 * anything. Empty when neither pass matches a title.
 */
export function filterByTitle<T>(items: T[], term: string, title: (item: T) => string): T[] {
  const words = searchWords(term)
  if (!words.length) return []
  const withWords = items.map((item) => ({ item, titleWords: searchWords(title(item)) }))
  const strict = withWords.filter(({ titleWords }) => words.every((w) => isWholeWord(titleWords, w)))
  if (strict.length) return strict.map(({ item }) => item)
  return withWords
    .filter(({ item }) => titleMatchesLoosely(title(item), term))
    .map(({ item }) => item)
}
