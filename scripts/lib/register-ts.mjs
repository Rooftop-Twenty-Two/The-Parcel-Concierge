/**
 * Lets a script under scripts/ import modules under src/ that import each
 * other without file extensions.
 *
 * The Next build resolves `import { money } from '../commerce/money'`
 * itself. Node's type-stripping runtime does not: it wants the `.ts` on
 * every relative import, so a script that reaches into src/ dies at the
 * first module that imports another. This hook tries `.ts`, `.tsx` and
 * `/index.ts` for an extensionless relative import before giving up.
 *
 *   node --import ./scripts/lib/register-ts.mjs --experimental-strip-types scripts/x.ts
 */
import { register } from 'node:module'

register('./resolve-ts-hooks.mjs', import.meta.url)
