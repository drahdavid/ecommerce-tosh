import { after } from 'next/server'

/**
 * Ejecuta una tarea después de responder (y por lo tanto después del commit de la transacción
 * en curso). Se usa para emails disparados desde hooks: así no ocupan conexiones del pool
 * mientras la transacción tiene locks tomados. Fuera de un request de Next (scripts, tests)
 * se ejecuta en segundo plano.
 */
export const defer = (task: () => Promise<unknown>) => {
  const safe = () => task().catch((err) => console.error('Tarea diferida falló', err))
  try {
    after(safe)
  } catch {
    void safe()
  }
}
