import { Section, Text } from 'react-email'
import type { Order } from '@/payload-types'
import { formatMoney, toCents } from '@/lib/money'
import { colors, Row } from './Layout'

const ars = (n?: number | null) => formatMoney(toCents(n ?? 0))

export const OrderSummary = ({ order }: { order: Order }) => (
  <Section style={{ marginTop: '16px' }}>
    {(order.items ?? []).map((item) => (
      <Text key={item.id} style={{ margin: '6px 0', fontSize: '14px' }}>
        {item.qty} × {item.title}
        {item.variantTitle && item.variantTitle !== 'Única' ? ` (${item.variantTitle})` : ''}
        <span style={{ float: 'right' }}>{ars(item.lineTotal)}</span>
      </Text>
    ))}
    <Section style={{ borderTop: `1px solid ${colors.border}`, marginTop: '12px', paddingTop: '8px' }}>
      <Row label="Subtotal" value={ars(order.totals?.subtotal)} />
      {order.totals?.couponDiscount ? (
        <Row label={`Cupón ${order.coupon?.code ?? ''}`} value={`−${ars(order.totals.couponDiscount)}`} />
      ) : null}
      {order.totals?.transferDiscount ? (
        <Row label="Descuento por transferencia" value={`−${ars(order.totals.transferDiscount)}`} />
      ) : null}
      <Row
        label={order.shippingMethod?.label ?? 'Envío'}
        value={order.totals?.shipping ? ars(order.totals.shipping) : 'Gratis'}
      />
      <Row label="Total" value={ars(order.totals?.total)} strong />
    </Section>
  </Section>
)
