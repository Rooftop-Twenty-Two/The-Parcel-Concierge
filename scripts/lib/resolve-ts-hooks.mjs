/** See register-ts.mjs. */
const HAS_EXTENSION = /\.[a-z0-9]+$/i
const CANDIDATES = ['.ts', '.tsx', '/index.ts']

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !HAS_EXTENSION.test(specifier)) {
    for (const suffix of CANDIDATES) {
      try {
        return await next(specifier + suffix, context)
      } catch (error) {
        if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error
      }
    }
  }
  return next(specifier, context)
}

/**
 * The bundler lets src/ import a .json file bare; Node insists on
 * `with { type: 'json' }`. Supply it, so the fixture catalogue loads.
 */
export async function load(url, context, next) {
  if (url.endsWith('.json') && context.importAttributes?.type !== 'json') {
    return next(url, { ...context, importAttributes: { ...context.importAttributes, type: 'json' } })
  }
  return next(url, context)
}
