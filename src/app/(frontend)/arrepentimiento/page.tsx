import type { Metadata } from 'next'
import { RegretForm } from '@/components/account/RegretForm'
import { formatOrderNumber } from '@/lib/orders/stock'

export const metadata: Metadata = {
  title: 'Botón de arrepentimiento',
  description: 'Revocá tu compra dentro de los 10 días corridos desde que recibiste el producto.',
}

export default function RegretPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Botón de arrepentimiento</h1>
      <p className="mt-4 text-zinc-700">
        Tenés derecho a revocar tu compra dentro de los <strong>10 días corridos</strong> desde que recibiste el producto o desde la
        celebración del contrato, lo último que ocurra, sin costo ni responsabilidad (art. 34, Ley 24.240 y Res. 424/2020). No
        necesitás estar registrado.
      </p>
      <RegretForm exampleOrderNumber={formatOrderNumber(1)} />
    </div>
  )
}
