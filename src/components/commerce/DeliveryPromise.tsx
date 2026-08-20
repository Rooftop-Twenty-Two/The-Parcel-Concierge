import Link from 'next/link'
import { DELIVERY } from '@/lib/site-config'
import { formatMinor } from '@/lib/commerce/money'

/**
 * The delivery promise.
 *
 * Stated above the fold on home, on every product page and in the cart. The
 * June review found that the delivery offer, which is one of the strongest
 * things about this business, appeared nowhere and the shipping policy page
 * was blank.
 *
 * Only confirmed facts render. The free hand-delivery zone has not been
 * supplied yet (outstanding item 4), so rather than naming counties we have
 * not confirmed, this invites the shopper to check. That is honest, and it
 * turns into a stated zone the day the client confirms one, with no code
 * change beyond site-config.
 */
export function DeliveryPromise({
  leadTime = null,
  compact = false,
}: {
  leadTime?: string | null
  compact?: boolean
}) {
  const zone = DELIVERY.localHandDelivery.counties

  return (
    <div className={compact ? 'text-sm' : 'border-y border-rule py-5 text-sm'}>
      <ul className="space-y-2 text-ink-muted">
        <li className="flex gap-2">
          <span aria-hidden="true" className="text-green">
            ✓
          </span>
          <span>
            <strong className="font-medium text-navy">
              {zone ? `Free hand delivery in ${zone.join(', ')}` : 'Free hand delivery locally'}
            </strong>
            {zone ? null : (
              <>
                {' '}
                <Link href="/delivery" className="underline underline-offset-2">
                  check if we cover your address
                </Link>
              </>
            )}
          </span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden="true" className="text-green">
            ✓
          </span>
          <span>
            {formatMinor(DELIVERY.national.priceMinor)} delivery anywhere else in Ireland
            {DELIVERY.freeDeliveryThresholdMinor === null
              ? ''
              : `, free over ${formatMinor(DELIVERY.freeDeliveryThresholdMinor)}`}
          </span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden="true" className="text-green">
            ✓
          </span>
          <span>
            Republic of Ireland only.{' '}
            <Link href="/delivery" className="underline underline-offset-2">
              Delivery details
            </Link>
          </span>
        </li>
        {leadTime ? (
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-gold">
              !
            </span>
            <span>
              <strong className="font-medium text-navy">Packed to order.</strong> {leadTime}
            </span>
          </li>
        ) : null}
      </ul>
    </div>
  )
}
