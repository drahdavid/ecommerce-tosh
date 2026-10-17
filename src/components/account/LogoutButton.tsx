'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export const LogoutButton = () => {
  const router = useRouter()
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await fetch('/api/customers/logout', { method: 'POST', credentials: 'include' }).catch(() => null)
        router.replace('/')
        router.refresh()
      }}
    >
      Cerrar sesión
    </Button>
  )
}
